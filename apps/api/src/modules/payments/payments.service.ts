import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentGateway, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { MembershipsService } from './memberships.service.js';
import { ClickService } from './click.service.js';

/**
 * Raising an invoice and pointing the payer at a gateway.
 *
 * The order is written here, before anyone is redirected, because it is the
 * only trustworthy record of what was agreed: every callback that follows is
 * checked against this row rather than believed.
 */
@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly memberships: MembershipsService,
    private readonly click: ClickService,
  ) {}

  /**
   * Which ways of paying are actually usable right now, for the checkout page
   * to render. A gateway whose credentials are missing is reported as
   * unavailable rather than shown and then failing at the redirect — and the
   * currency restriction is stated here too, because a tier priced in dollars
   * cannot go through either card gateway.
   */
  gateways() {
    return {
      CLICK: { available: this.click.configured, currencies: ['UZS'] },
      PAYME: {
        available:
          !!this.config.get<string>('PAYME_MERCHANT_ID') &&
          !!this.config.get<string>('PAYME_MERCHANT_KEY'),
        currencies: ['UZS'],
      },
      // Nothing to configure: an invoice can always be raised. Whether the
      // account details are published is a separate question, answered by
      // `bankDetails().configured`.
      BANK_TRANSFER: { available: true, currencies: null },
    };
  }

  async createInvoice(
    userId: string,
    membershipTypeId: string,
    gateway: PaymentGateway,
    payer: { payerName?: string; payerTaxId?: string } = {},
  ) {
    const type = await this.prisma.membershipType.findFirst({
      where: { id: membershipTypeId, isActive: true },
    });
    if (!type) throw new NotFoundException('Membership type not found');

    // The gateways settle in so'm only, and inventing an exchange rate to
    // charge someone is worse than refusing. A bank transfer has no such
    // constraint: the invoice states the amount and a person reconciles it, so
    // it may be raised in whatever currency the membership is priced in.
    if (gateway !== PaymentGateway.BANK_TRANSFER && type.currency !== 'UZS') {
      throw new BadRequestException(
        `${type.name} is priced in ${type.currency}; the payment gateways settle only in UZS. ` +
          `It can be paid by bank transfer instead.`,
      );
    }

    // Refuse before the row is written. An invoice pointing at a gateway we
    // have no credentials for is worse than no invoice: it looks payable, and
    // the payer only discovers otherwise at Click's own error page.
    if (!this.gateways()[gateway].available) {
      throw new BadRequestException(
        `${gateway} is not available yet. Please pay by bank transfer.`,
      );
    }

    // An unfinished invoice for the same membership is reused rather than
    // stacking up rows every time someone reloads the checkout page.
    const existing = await this.prisma.payment.findFirst({
      where: {
        userId,
        membershipTypeId,
        gateway,
        status: PaymentStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });
    const payment =
      existing ??
      (await this.prisma.payment.create({
        data: {
          userId,
          membershipTypeId,
          gateway,
          // Price and duration are copied, not referenced: a later price change
          // must not alter an invoice already shown to someone.
          amountMinor: type.priceCents,
          currency: type.currency,
          durationDays: type.durationDays,
          payerName: payer.payerName,
          payerTaxId: payer.payerTaxId,
        },
      }));

    // A bank transfer has nowhere to send the payer: they get an invoice and
    // the association's account details instead.
    if (gateway === PaymentGateway.BANK_TRANSFER) {
      const withNumber = payment.invoiceNumber
        ? payment
        : await this.prisma.payment.update({
            where: { id: payment.id },
            data: { invoiceNumber: await this.nextInvoiceNumber() },
          });
      return {
        payment: withNumber,
        checkoutUrl: null,
        bankDetails: this.bankDetails(),
      };
    }

    return {
      payment,
      checkoutUrl: this.checkoutUrl(payment.id, payment.amountMinor, gateway),
      bankDetails: null,
    };
  }

  /**
   * "UZL-2026-0007". Sequential within the year so the association's
   * accountant can file them, and derived from the count of invoices already
   * raised this year rather than from a stored counter.
   */
  private async nextInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const soFar = await this.prisma.payment.count({
      where: { invoiceNumber: { startsWith: `UZL-${year}-` } },
    });
    return `UZL-${year}-${String(soFar + 1).padStart(4, '0')}`;
  }

  /**
   * Where the money goes. Configuration rather than code: these are the
   * association's real banking details and they change without a deploy.
   */
  bankDetails() {
    return {
      beneficiary: this.config.get<string>('BANK_BENEFICIARY') ?? '',
      account: this.config.get<string>('BANK_ACCOUNT') ?? '',
      bankName: this.config.get<string>('BANK_NAME') ?? '',
      mfo: this.config.get<string>('BANK_MFO') ?? '',
      taxId: this.config.get<string>('BANK_TAX_ID') ?? '',
      oked: this.config.get<string>('BANK_OKED') ?? '',
      /** Empty until someone fills the environment in; the UI says so. */
      configured: !!this.config.get<string>('BANK_ACCOUNT'),
    };
  }

  /**
   * Staff confirming the money arrived.
   *
   * The grant runs in the same transaction as the status change, exactly as the
   * gateway path does — a crash between them would mean a paid invoice with no
   * membership, or a membership nobody paid for. Confirming an already-paid
   * invoice is refused rather than silently extending the membership twice.
   */
  async confirmBankTransfer(
    paymentId: string,
    staffUserId: string,
    note?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) throw new NotFoundException('Payment not found');
      if (payment.gateway !== PaymentGateway.BANK_TRANSFER) {
        throw new BadRequestException(
          'Only bank transfers are confirmed by hand.',
        );
      }
      if (payment.status === PaymentStatus.PAID) {
        throw new BadRequestException(
          'This invoice is already marked as paid.',
        );
      }

      const paid = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          confirmedByUserId: staffUserId,
          confirmedAt: new Date(),
          staffNote: note,
        },
      });
      await this.memberships.grant(tx, paid);
      return paid;
    });
  }

  /** Staff writing off an invoice nobody paid. Grants nothing. */
  async cancelBankTransfer(
    paymentId: string,
    staffUserId: string,
    note?: string,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException(
        'This invoice is paid. Reversing it is a refund, not a cancellation.',
      );
    }
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.CANCELLED,
        confirmedByUserId: staffUserId,
        confirmedAt: new Date(),
        staffNote: note,
      },
    });
  }

  /**
   * Where to send the payer. Both gateways take everything they need in the
   * URL — nothing secret goes in it, which is why this can be built here and
   * handed to the browser.
   */
  private checkoutUrl(
    paymentId: string,
    amountMinor: number,
    gateway: PaymentGateway,
  ): string {
    // WEB_URL is set in the environment; the fallback is the public site so a
    // misconfiguration sends the payer somewhere real rather than to localhost.
    const returnUrl = `${this.config.get<string>('WEB_URL') ?? 'https://uzlab.org'}/account`;

    if (gateway === PaymentGateway.PAYME) {
      const merchantId = this.config.get<string>('PAYME_MERCHANT_ID') ?? '';
      const accountField =
        this.config.get<string>('PAYME_ACCOUNT_FIELD') ?? 'order_id';
      // Payme takes its parameters as one base64 blob, semicolon-separated.
      const params = [
        `m=${merchantId}`,
        `ac.${accountField}=${paymentId}`,
        `a=${amountMinor}`,
        `c=${returnUrl}`,
      ].join(';');
      return `https://checkout.paycom.uz/${Buffer.from(params).toString('base64')}`;
    }

    // `transaction_param` is what comes back as `merchant_trans_id` on both
    // callbacks, so it has to be the payment id and nothing else.
    const params = new URLSearchParams({
      service_id: this.config.get<string>('CLICK_SERVICE_ID') ?? '',
      merchant_id: this.config.get<string>('CLICK_MERCHANT_ID') ?? '',
      amount: (amountMinor / 100).toFixed(2),
      transaction_param: paymentId,
      return_url: returnUrl,
    });
    return `https://my.click.uz/services/pay?${params.toString()}`;
  }

  /** A member's own payment history. */
  listMine(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        gateway: true,
        status: true,
        amountMinor: true,
        currency: true,
        durationDays: true,
        paidAt: true,
        createdAt: true,
        invoiceNumber: true,
        membershipType: { select: { name: true, slug: true } },
      },
    });
  }

  /** Staff view: everything, newest first. */
  listAll(limit = 100) {
    return this.prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
      select: {
        id: true,
        gateway: true,
        status: true,
        amountMinor: true,
        currency: true,
        durationDays: true,
        paidAt: true,
        createdAt: true,
        invoiceNumber: true,
        payerName: true,
        payerTaxId: true,
        confirmedAt: true,
        staffNote: true,
        gatewayTransactionId: true,
        user: { select: { id: true, email: true, fullName: true } },
        membershipType: { select: { name: true } },
      },
    });
  }
}
