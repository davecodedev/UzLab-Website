import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentGateway, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';

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
  ) {}

  async createInvoice(
    userId: string,
    membershipTypeId: string,
    gateway: PaymentGateway,
  ) {
    const type = await this.prisma.membershipType.findFirst({
      where: { id: membershipTypeId, isActive: true },
    });
    if (!type) throw new NotFoundException('Membership type not found');

    if (type.currency !== 'UZS') {
      // Payme and Click settle in so'm only. Better to refuse than to invent
      // an exchange rate and charge something nobody agreed to.
      throw new BadRequestException(
        `${type.name} is priced in ${type.currency}; the payment gateways settle only in UZS.`,
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
        },
      }));

    return {
      payment,
      checkoutUrl: this.checkoutUrl(payment.id, payment.amountMinor, gateway),
    };
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
    const returnUrl = `${this.config.get<string>('WEB_URL') ?? 'https://uzlabuz.vercel.app'}/account`;

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

    const serviceId = this.config.get<string>('CLICK_SERVICE_ID') ?? '';
    const merchantId = this.config.get<string>('CLICK_MERCHANT_ID') ?? '';
    const amountSom = (amountMinor / 100).toFixed(2);
    return (
      `https://my.click.uz/services/pay?service_id=${serviceId}` +
      `&merchant_id=${merchantId}` +
      `&amount=${amountSom}` +
      `&transaction_param=${paymentId}` +
      `&return_url=${encodeURIComponent(returnUrl)}`
    );
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
        gatewayTransactionId: true,
        user: { select: { id: true, email: true, fullName: true } },
        membershipType: { select: { name: true } },
      },
    });
  }
}
