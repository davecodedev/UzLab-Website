import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { PaymentGateway, PaymentStatus, type Payment } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { MembershipsService } from './memberships.service.js';

/**
 * Click's merchant protocol.
 *
 * Two callbacks rather than Payme's six: Prepare asks whether an order can be
 * paid, Complete says the money moved. Both carry an MD5 signature over a fixed
 * field order plus the secret key, and both answer with an `error` number where
 * 0 means success — an HTTP error status is not how failure is reported.
 */

/** Click's own error vocabulary. 0 is success; the rest are theirs, not ours. */
const ClickError = {
  SUCCESS: 0,
  SIGN_CHECK_FAILED: -1,
  INCORRECT_AMOUNT: -2,
  ACTION_NOT_FOUND: -3,
  ALREADY_PAID: -4,
  ORDER_NOT_FOUND: -5,
  TRANSACTION_NOT_FOUND: -6,
  TRANSACTION_CANCELLED: -9,
} as const;

const Action = { PREPARE: 0, COMPLETE: 1 } as const;

export interface ClickCallback {
  click_trans_id: string;
  service_id: string;
  merchant_trans_id: string;
  merchant_prepare_id?: string;
  amount: string;
  action: string;
  sign_time: string;
  sign_string: string;
  error?: string;
}

@Injectable()
export class ClickService {
  private readonly logger = new Logger(ClickService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly memberships: MembershipsService,
  ) {}

  /**
   * MD5 over the fields in the order Click specifies. `merchant_prepare_id` is
   * part of the string on Complete and absent on Prepare, so the two cases are
   * built separately rather than by concatenating a possibly-undefined value.
   */
  private signatureMatches(body: ClickCallback): boolean {
    const secret = this.config.get<string>('CLICK_SECRET_KEY');
    if (!secret) {
      this.logger.error('CLICK_SECRET_KEY is not set; rejecting callback');
      return false;
    }

    const isComplete = Number(body.action) === Action.COMPLETE;
    const parts = [
      body.click_trans_id,
      body.service_id,
      secret,
      body.merchant_trans_id,
      ...(isComplete ? [body.merchant_prepare_id ?? ''] : []),
      body.amount,
      body.action,
      body.sign_time,
    ];

    const expected = createHash('md5').update(parts.join('')).digest('hex');
    return expected === body.sign_string;
  }

  /** Click sends amounts in so'm with decimals; ours are stored in tiyin. */
  private amountMatches(payment: Payment, amount: string): boolean {
    const minor = Math.round(Number(amount) * 100);
    return Number.isFinite(minor) && minor === payment.amountMinor;
  }

  private reply(
    body: ClickCallback,
    error: number,
    extra: Record<string, unknown> = {},
  ) {
    return {
      click_trans_id: body.click_trans_id,
      merchant_trans_id: body.merchant_trans_id,
      error,
      error_note: error === ClickError.SUCCESS ? 'Success' : `Error ${error}`,
      ...extra,
    };
  }

  async prepare(body: ClickCallback) {
    if (!this.signatureMatches(body)) {
      return this.reply(body, ClickError.SIGN_CHECK_FAILED);
    }

    const payment = await this.find(body.merchant_trans_id);
    if (!payment) return this.reply(body, ClickError.ORDER_NOT_FOUND);
    if (payment.status === PaymentStatus.PAID)
      return this.reply(body, ClickError.ALREADY_PAID);
    if (payment.status !== PaymentStatus.PENDING) {
      return this.reply(body, ClickError.TRANSACTION_CANCELLED);
    }
    if (!this.amountMatches(payment, body.amount)) {
      return this.reply(body, ClickError.INCORRECT_AMOUNT);
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.HELD,
        gatewayTransactionId: body.click_trans_id,
        gatewayCreatedAt: BigInt(Date.now()),
        lastCallback: { ...body },
      },
    });

    // Click echoes merchant_prepare_id back on Complete; our payment id is a
    // stable value to key on.
    return this.reply(body, ClickError.SUCCESS, {
      merchant_prepare_id: payment.id,
    });
  }

  async complete(body: ClickCallback) {
    if (!this.signatureMatches(body)) {
      return this.reply(body, ClickError.SIGN_CHECK_FAILED);
    }

    const payment = await this.find(body.merchant_trans_id);
    if (!payment) return this.reply(body, ClickError.ORDER_NOT_FOUND);

    // Click retries; a second Complete for a payment already settled is
    // answered as success rather than granting more membership.
    if (payment.status === PaymentStatus.PAID) {
      return this.reply(body, ClickError.ALREADY_PAID, {
        merchant_confirm_id: payment.id,
      });
    }
    if (payment.status !== PaymentStatus.HELD) {
      return this.reply(body, ClickError.TRANSACTION_NOT_FOUND);
    }
    if (!this.amountMatches(payment, body.amount)) {
      return this.reply(body, ClickError.INCORRECT_AMOUNT);
    }

    // A negative `error` on Complete means the payer cancelled at Click's end.
    if (body.error && Number(body.error) < 0) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.CANCELLED,
          gatewayCancelledAt: BigInt(Date.now()),
          cancelReason: Number(body.error),
          lastCallback: { ...body },
        },
      });
      return this.reply(body, ClickError.TRANSACTION_CANCELLED);
    }

    const performedAt = Date.now();
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(performedAt),
          gatewayPerformedAt: BigInt(performedAt),
          lastCallback: { ...body },
        },
      });
      await this.memberships.grant(tx, row);
    });

    this.logger.log(`payment ${payment.id} completed via Click`);
    return this.reply(body, ClickError.SUCCESS, {
      merchant_confirm_id: payment.id,
    });
  }

  private find(id: string | undefined) {
    if (!id) return Promise.resolve(null);
    return this.prisma.payment.findFirst({
      where: { id, gateway: PaymentGateway.CLICK },
    });
  }
}
