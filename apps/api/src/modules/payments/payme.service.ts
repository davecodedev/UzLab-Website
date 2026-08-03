import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentGateway, PaymentStatus, type Payment } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { MembershipsService } from './memberships.service.js';
import { PaymeError, PaymeErrorCode } from './payme.errors.js';

/**
 * Payme's merchant protocol.
 *
 * The shape is theirs, not ours: Payme calls these methods over JSON-RPC and
 * expects specific state values and error codes back. Two rules run through all
 * of it —
 *
 *   * the amount in a request is never trusted. It is compared against the
 *     Payment row we created before the payer was sent to the gateway, because
 *     that request is the one thing an attacker controls;
 *   * every method is idempotent. Payme retries on timeout, and a repeated
 *     PerformTransaction must not extend a membership twice.
 */

/** Payme's transaction states. Negative values are cancellations. */
const TransactionState = {
  CREATED: 1,
  COMPLETED: 2,
  CANCELLED_BEFORE_COMPLETION: -1,
  CANCELLED_AFTER_COMPLETION: -2,
} as const;

/**
 * How long a created-but-unpaid transaction stays valid. Payme's own limit is
 * 12 hours; past it we must refuse to complete rather than take late money.
 */
const TRANSACTION_TIMEOUT_MS = 12 * 60 * 60 * 1000;

interface PaymeParams {
  id?: string;
  time?: number;
  amount?: number;
  account?: Record<string, string>;
  reason?: number;
  from?: number;
  to?: number;
}

@Injectable()
export class PaymeService {
  private readonly logger = new Logger(PaymeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly memberships: MembershipsService,
  ) {}

  /**
   * Payme authenticates with HTTP Basic, username `Paycom`, password the
   * merchant key. Compared in full rather than by prefix, and a missing key in
   * the environment fails closed — an unconfigured gateway must reject
   * everything, not accept everything.
   */
  checkAuth(header: string | undefined): void {
    const key = this.config.get<string>('PAYME_MERCHANT_KEY');
    if (!key) {
      this.logger.error('PAYME_MERCHANT_KEY is not set; rejecting callback');
      throw new PaymeError(PaymeErrorCode.UNAUTHORIZED);
    }
    if (!header?.startsWith('Basic ')) {
      throw new PaymeError(PaymeErrorCode.UNAUTHORIZED);
    }
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    const password = separator >= 0 ? decoded.slice(separator + 1) : '';
    if (password !== key) {
      throw new PaymeError(PaymeErrorCode.UNAUTHORIZED);
    }
  }

  async handle(method: string, params: PaymeParams): Promise<unknown> {
    switch (method) {
      case 'CheckPerformTransaction':
        return this.checkPerform(params);
      case 'CreateTransaction':
        return this.createTransaction(params);
      case 'PerformTransaction':
        return this.performTransaction(params);
      case 'CancelTransaction':
        return this.cancelTransaction(params);
      case 'CheckTransaction':
        return this.checkTransaction(params);
      case 'GetStatement':
        return this.getStatement(params);
      default:
        throw new PaymeError(PaymeErrorCode.METHOD_NOT_FOUND);
    }
  }

  /**
   * The order id travels in `account`, under the field name configured in the
   * Payme merchant cabinet. Anything missing or unrecognised is
   * ORDER_NOT_FOUND with the offending field named, which is what their
   * conformance suite checks for.
   */
  private async findPayment(
    account: Record<string, string> | undefined,
  ): Promise<Payment> {
    const field = this.config.get<string>('PAYME_ACCOUNT_FIELD') ?? 'order_id';
    const id = account?.[field];
    if (!id) throw new PaymeError(PaymeErrorCode.ORDER_NOT_FOUND, field);

    const payment = await this.prisma.payment.findFirst({
      where: { id, gateway: PaymentGateway.PAYME },
    });
    if (!payment) throw new PaymeError(PaymeErrorCode.ORDER_NOT_FOUND, field);
    return payment;
  }

  /** The amount check, in one place because every method needs it. */
  private assertAmount(payment: Payment, amount: number | undefined): void {
    if (amount !== payment.amountMinor) {
      throw new PaymeError(PaymeErrorCode.WRONG_AMOUNT);
    }
  }

  private async checkPerform(params: PaymeParams) {
    const payment = await this.findPayment(params.account);
    if (payment.status !== PaymentStatus.PENDING) {
      throw new PaymeError(PaymeErrorCode.ORDER_UNAVAILABLE);
    }
    this.assertAmount(payment, params.amount);
    return { allow: true };
  }

  private async createTransaction(params: PaymeParams) {
    if (!params.id) throw new PaymeError(PaymeErrorCode.INVALID_REQUEST);

    const existing = await this.prisma.payment.findUnique({
      where: { gatewayTransactionId: params.id },
    });

    // A repeat of a call we already answered: return the same result rather
    // than creating a second transaction.
    if (existing) {
      if (existing.status === PaymentStatus.HELD) {
        return {
          create_time: Number(existing.gatewayCreatedAt ?? 0),
          transaction: existing.id,
          state: TransactionState.CREATED,
        };
      }
      throw new PaymeError(PaymeErrorCode.CANNOT_PERFORM);
    }

    const payment = await this.findPayment(params.account);
    if (payment.status !== PaymentStatus.PENDING) {
      throw new PaymeError(PaymeErrorCode.ORDER_UNAVAILABLE);
    }
    this.assertAmount(payment, params.amount);

    const createTime = params.time ?? Date.now();
    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.HELD,
        gatewayTransactionId: params.id,
        gatewayCreatedAt: BigInt(createTime),
        lastCallback: { ...params },
      },
    });

    return {
      create_time: Number(updated.gatewayCreatedAt ?? createTime),
      transaction: updated.id,
      state: TransactionState.CREATED,
    };
  }

  private async performTransaction(params: PaymeParams) {
    const payment = await this.byTransactionId(params.id);

    // Already completed — answer identically rather than granting more time.
    if (payment.status === PaymentStatus.PAID) {
      return {
        transaction: payment.id,
        perform_time: Number(payment.gatewayPerformedAt ?? 0),
        state: TransactionState.COMPLETED,
      };
    }

    if (payment.status !== PaymentStatus.HELD) {
      throw new PaymeError(PaymeErrorCode.CANNOT_PERFORM);
    }

    const createdAt = Number(payment.gatewayCreatedAt ?? 0);
    if (createdAt && Date.now() - createdAt > TRANSACTION_TIMEOUT_MS) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.CANCELLED,
          gatewayCancelledAt: BigInt(Date.now()),
          cancelReason: 4,
        },
      });
      throw new PaymeError(PaymeErrorCode.CANNOT_PERFORM);
    }

    const performedAt = Date.now();
    // The membership extension and the payment record move together: a crash
    // between them would leave money taken and nothing granted.
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(performedAt),
          gatewayPerformedAt: BigInt(performedAt),
          lastCallback: { ...params },
        },
      });
      await this.memberships.grant(tx, row);
      return row;
    });

    this.logger.log(`payment ${updated.id} completed via Payme`);
    return {
      transaction: updated.id,
      perform_time: performedAt,
      state: TransactionState.COMPLETED,
    };
  }

  private async cancelTransaction(params: PaymeParams) {
    const payment = await this.byTransactionId(params.id);
    const alreadyPaid = payment.status === PaymentStatus.PAID;

    if (
      payment.status === PaymentStatus.CANCELLED ||
      payment.status === PaymentStatus.REFUNDED
    ) {
      return {
        transaction: payment.id,
        cancel_time: Number(payment.gatewayCancelledAt ?? 0),
        state: alreadyPaid
          ? TransactionState.CANCELLED_AFTER_COMPLETION
          : TransactionState.CANCELLED_BEFORE_COMPLETION,
      };
    }

    const cancelledAt = Date.now();
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: alreadyPaid
            ? PaymentStatus.REFUNDED
            : PaymentStatus.CANCELLED,
          gatewayCancelledAt: BigInt(cancelledAt),
          cancelReason: params.reason ?? null,
          lastCallback: { ...params },
        },
      });
      // Money returned means the time it bought goes back too.
      if (alreadyPaid) await this.memberships.revoke(tx, row);
      return row;
    });

    return {
      transaction: updated.id,
      cancel_time: cancelledAt,
      state: alreadyPaid
        ? TransactionState.CANCELLED_AFTER_COMPLETION
        : TransactionState.CANCELLED_BEFORE_COMPLETION,
    };
  }

  private async checkTransaction(params: PaymeParams) {
    const payment = await this.byTransactionId(params.id);
    return {
      create_time: Number(payment.gatewayCreatedAt ?? 0),
      perform_time: Number(payment.gatewayPerformedAt ?? 0),
      cancel_time: Number(payment.gatewayCancelledAt ?? 0),
      transaction: payment.id,
      state: this.stateOf(payment),
      reason: payment.cancelReason ?? null,
    };
  }

  /** Payme reconciles against this: every transaction in a time window. */
  private async getStatement(params: PaymeParams) {
    const from = new Date(params.from ?? 0);
    const to = new Date(params.to ?? Date.now());

    const payments = await this.prisma.payment.findMany({
      where: {
        gateway: PaymentGateway.PAYME,
        gatewayTransactionId: { not: null },
        createdAt: { gte: from, lte: to },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      transactions: payments.map((p) => ({
        id: p.gatewayTransactionId,
        time: Number(p.gatewayCreatedAt ?? 0),
        amount: p.amountMinor,
        account: {
          [this.config.get<string>('PAYME_ACCOUNT_FIELD') ?? 'order_id']: p.id,
        },
        create_time: Number(p.gatewayCreatedAt ?? 0),
        perform_time: Number(p.gatewayPerformedAt ?? 0),
        cancel_time: Number(p.gatewayCancelledAt ?? 0),
        transaction: p.id,
        state: this.stateOf(p),
        reason: p.cancelReason ?? null,
      })),
    };
  }

  private stateOf(payment: Payment): number {
    switch (payment.status) {
      case PaymentStatus.PAID:
        return TransactionState.COMPLETED;
      case PaymentStatus.HELD:
        return TransactionState.CREATED;
      case PaymentStatus.REFUNDED:
        return TransactionState.CANCELLED_AFTER_COMPLETION;
      case PaymentStatus.CANCELLED:
        return TransactionState.CANCELLED_BEFORE_COMPLETION;
      default:
        return TransactionState.CREATED;
    }
  }

  private async byTransactionId(id: string | undefined): Promise<Payment> {
    if (!id) throw new PaymeError(PaymeErrorCode.TRANSACTION_NOT_FOUND);
    const payment = await this.prisma.payment.findUnique({
      where: { gatewayTransactionId: id },
    });
    if (!payment) throw new PaymeError(PaymeErrorCode.TRANSACTION_NOT_FOUND);
    return payment;
  }
}
