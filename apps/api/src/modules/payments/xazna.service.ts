import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { PaymentGateway, PaymentStatus, type Payment } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { MembershipsService } from './memberships.service.js';
import { XaznaError, XaznaErrorCode } from './xazna.errors.js';

/**
 * Xazna's e-commerce protocol.
 *
 * Shaped unlike the other two. Click pushes Prepare then Complete at us and
 * signs each with MD5; Payme runs its own six-method JSON-RPC. Xazna asks us
 * to *host* a JSON-RPC endpoint it calls, authenticated with HTTP Basic, and
 * it reads the invoice back off us before taking any money:
 *
 *   getinfo — what is this invoice, and what does it cost?
 *   pay     — the money moved; here is our transaction id
 *   check   — did transaction X succeed?
 *
 * Every reply is HTTP 200 with a JSON-RPC envelope. A non-200 reads to Xazna
 * as the merchant being down, not as a refusal, which is why the controller
 * catches instead of letting Nest's exception filter answer.
 */

/** The methods the guide defines. Anything else is an unknown method. */
export type XaznaMethod = 'getinfo' | 'pay' | 'check';

export interface XaznaParams {
  invoice?: string;
  amount?: number | string;
  xaznaTransactionId?: string;
}

@Injectable()
export class XaznaService {
  private readonly logger = new Logger(XaznaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly memberships: MembershipsService,
  ) {}

  /**
   * Whether Xazna can be offered. The merchant id builds the redirect; the
   * Basic credentials are what its callbacks authenticate with. Without all
   * three the button would lead nowhere and every callback would be refused,
   * so the checkout hides it instead.
   */
  get configured(): boolean {
    return (
      !!this.config.get<string>('XAZNA_MERCHANT_ID') &&
      !!this.config.get<string>('XAZNA_BASIC_USER') &&
      !!this.config.get<string>('XAZNA_BASIC_PASSWORD')
    );
  }

  /**
   * HTTP Basic, compared in constant time.
   *
   * Throws MERCHANT_UNAVAILABLE rather than a 401: the guide gives no code for
   * "your credentials are wrong", and of the four it does give, that is the
   * one that means "do not treat this as the payer's problem".
   */
  checkAuth(header: string | undefined): void {
    const user = this.config.get<string>('XAZNA_BASIC_USER');
    const password = this.config.get<string>('XAZNA_BASIC_PASSWORD');
    if (!user || !password) {
      this.logger.error('Xazna Basic credentials are not set; refusing call');
      throw new XaznaError(XaznaErrorCode.MERCHANT_UNAVAILABLE);
    }

    const expected = 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64');
    const given = header ?? '';
    // Length first: timingSafeEqual throws on a mismatch, and the length of a
    // Basic header is not a secret.
    if (
      given.length !== expected.length ||
      !timingSafeEqual(Buffer.from(given), Buffer.from(expected))
    ) {
      this.logger.warn('Xazna call rejected: bad Basic credentials');
      throw new XaznaError(XaznaErrorCode.MERCHANT_UNAVAILABLE);
    }
  }

  async handle(method: string, params: XaznaParams) {
    switch (method) {
      case 'getinfo':
        return this.getInfo(params);
      case 'pay':
        return this.pay(params);
      case 'check':
        return this.check(params);
      default:
        this.logger.warn(`Xazna called unknown method "${method}"`);
        throw new XaznaError(
          XaznaErrorCode.UNKNOWN,
          `noma'lum metod: ${method}`,
        );
    }
  }

  /**
   * What the payer is about to pay for.
   *
   * `amount` goes back in tiyin, as the guide specifies for this method, and
   * the extra fields are the ones it invites us to add — they are shown in
   * Xazna's app before the payer confirms, so they should say what the money
   * is for in a language the payer reads.
   */
  private async getInfo(params: XaznaParams) {
    const payment = await this.find(params.invoice);
    if (!payment) throw new XaznaError(XaznaErrorCode.INVOICE_NOT_FOUND);
    if (payment.status === PaymentStatus.PAID) {
      throw new XaznaError(XaznaErrorCode.INVOICE_ALREADY_PAID);
    }
    if (
      payment.status === PaymentStatus.CANCELLED ||
      payment.status === PaymentStatus.REFUNDED
    ) {
      throw new XaznaError(XaznaErrorCode.INVOICE_NOT_FOUND);
    }

    const full = await this.prisma.payment.findUnique({
      where: { id: payment.id },
      select: {
        membershipType: { select: { name: true } },
        user: { select: { fullName: true } },
        payerName: true,
      },
    });

    return {
      invoice: payment.id,
      amount: payment.amountMinor,
      details: {
        service: full?.membershipType.name ?? 'UzLab',
        payer: full?.payerName ?? full?.user.fullName ?? '',
        days: payment.durationDays,
      },
    };
  }

  /**
   * The money moved.
   *
   * Idempotent: Xazna may repeat this, and the second call must not buy a
   * second membership. A repeat for an already-paid invoice answers success
   * with the transaction id we recorded, which is what a retry is asking for.
   */
  private async pay(params: XaznaParams) {
    const payment = await this.find(params.invoice);
    if (!payment) throw new XaznaError(XaznaErrorCode.INVOICE_NOT_FOUND);

    const transactionId = String(params.xaznaTransactionId ?? '');
    if (!transactionId) {
      throw new XaznaError(
        XaznaErrorCode.UNKNOWN,
        'xaznaTransactionId majburiy',
      );
    }

    if (payment.status === PaymentStatus.PAID) {
      // A different transaction paying an invoice that is already settled is
      // not a retry — it is a second payment, and saying "success" to it would
      // be agreeing to something we cannot honour.
      if (payment.gatewayTransactionId === transactionId) {
        return { message: 'success', code: 0 };
      }
      throw new XaznaError(XaznaErrorCode.INVOICE_ALREADY_PAID);
    }
    if (
      payment.status === PaymentStatus.CANCELLED ||
      payment.status === PaymentStatus.REFUNDED
    ) {
      throw new XaznaError(XaznaErrorCode.INVOICE_NOT_FOUND);
    }

    if (!this.amountMatches(payment, params.amount)) {
      this.logger.warn(
        `Xazna pay for ${payment.id} carried amount ${String(params.amount)}, expected ${payment.amountMinor} tiyin`,
      );
      throw new XaznaError(
        XaznaErrorCode.UNKNOWN,
        "to'lov summasi hisob-fakturaga to'g'ri kelmaydi",
      );
    }

    const performedAt = Date.now();
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(performedAt),
          gatewayTransactionId: transactionId,
          gatewayPerformedAt: BigInt(performedAt),
          lastCallback: { method: 'pay', ...params },
        },
      });
      await this.memberships.grant(tx, row);
    });

    this.logger.log(`payment ${payment.id} completed via Xazna`);
    return { message: 'success', code: 0 };
  }

  /** Did this transaction succeed? Looked up by Xazna's own id, not ours. */
  private async check(params: XaznaParams) {
    const transactionId = String(params.xaznaTransactionId ?? '');
    if (!transactionId) {
      throw new XaznaError(
        XaznaErrorCode.UNKNOWN,
        'xaznaTransactionId majburiy',
      );
    }

    const payment = await this.prisma.payment.findFirst({
      where: { gateway: PaymentGateway.XAZNA, gatewayTransactionId: transactionId },
      select: { status: true },
    });
    if (!payment) throw new XaznaError(XaznaErrorCode.INVOICE_NOT_FOUND);

    return {
      xaznaTransactionId: transactionId,
      success: payment.status === PaymentStatus.PAID,
    };
  }

  /**
   * The amount the guide asks us to check, in whichever unit it arrives in.
   *
   * The guide is not consistent about this: the redirect takes `amount` in
   * so'm, `getinfo` is specified to answer in tiyin, and the `pay` example
   * shows `"amount": 100000, // 100000 so'm`. Rejecting a real payment over
   * an ambiguity in someone else's document would be the worse mistake, so
   * both representations of *this invoice* are accepted and nothing else is.
   *
   * That is not a loophole. Both values are derived from the same invoice, so
   * there is no amount an underpayer could send that satisfies either — a
   * 500 000 so'm invoice accepts 500000 or 50000000 and no other number.
   *
   * Worth pinning down with Xazna and then narrowing to one.
   */
  private amountMatches(payment: Payment, amount: unknown): boolean {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return false;
    const tiyin = payment.amountMinor;
    const som = Math.round(tiyin / 100);
    if (value === tiyin) return true;
    if (value === som) {
      this.logger.warn(
        `Xazna sent amount in so'm (${value}) for ${payment.id}; the guide specifies tiyin for getinfo`,
      );
      return true;
    }
    return false;
  }

  private find(invoice: string | undefined) {
    if (!invoice) return Promise.resolve(null);
    return this.prisma.payment.findFirst({
      where: { id: invoice, gateway: PaymentGateway.XAZNA },
    });
  }
}
