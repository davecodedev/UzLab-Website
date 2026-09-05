import { Injectable, Logger } from '@nestjs/common';
import { MemberStatus } from '@prisma/client';
import type { Payment, Prisma } from '@prisma/client';

/**
 * Turning a completed payment into membership time, and taking it back when a
 * payment is reversed.
 *
 * Kept apart from the gateway services because both gateways end in the same
 * place, and because this is the only code that should ever move `expiresAt` —
 * a membership's end date is the thing the whole access tier hangs on.
 *
 * Every method takes the surrounding transaction so the grant and the payment
 * row commit together. A crash between them would mean money taken and nothing
 * given, or the reverse.
 */
@Injectable()
export class MembershipsService {
  private readonly logger = new Logger(MembershipsService.name);

  /**
   * Extends membership by the days the payment bought.
   *
   * Extends from the current expiry when the membership is still running, and
   * from today when it has lapsed — renewing early should not cost the payer
   * the time they had left, and renewing late should not silently backdate.
   *
   * A first payment creates the membership as PENDING_APPROVAL: money buys the
   * time, an administrator admits the member. A renewal by someone already
   * admitted keeps whatever status they have, so paying again does not send an
   * existing member back into the queue — and paying while frozen does not
   * quietly unfreeze them either. Both of those are decisions for a person.
   */
  async grant(tx: Prisma.TransactionClient, payment: Payment): Promise<void> {
    const now = new Date();
    const existing = await tx.member.findUnique({
      where: { userId: payment.userId },
    });

    const from =
      existing?.expiresAt && existing.expiresAt.getTime() > now.getTime()
        ? existing.expiresAt
        : now;
    const expiresAt = new Date(
      from.getTime() + payment.durationDays * 24 * 60 * 60 * 1000,
    );

    if (existing) {
      await tx.member.update({
        where: { userId: payment.userId },
        data: { membershipTypeId: payment.membershipTypeId, expiresAt },
      });
    } else {
      await tx.member.create({
        data: {
          userId: payment.userId,
          membershipTypeId: payment.membershipTypeId,
          expiresAt,
          status: MemberStatus.PENDING_APPROVAL,
        },
      });
    }

    // A paying member is a member: without this their role would still say
    // APPLICANT and parts of the site keyed on role would not open up. The
    // role is not what grants access — `membershipIsActive` decides that — so
    // setting it before approval is safe and keeps the account area coherent.
    await tx.user.updateMany({
      where: { id: payment.userId, role: 'APPLICANT' },
      data: { role: 'MEMBER' },
    });

    this.logger.log(
      existing
        ? `membership for ${payment.userId} extended to ${expiresAt.toISOString()}`
        : `membership for ${payment.userId} created pending approval, paid to ${expiresAt.toISOString()}`,
    );
  }

  /**
   * Removes the time a reversed payment had granted.
   *
   * Subtracts the same number of days rather than deleting the membership: the
   * member may have paid for other periods too, and a refund of one of them is
   * not grounds for erasing the rest.
   */
  async revoke(tx: Prisma.TransactionClient, payment: Payment): Promise<void> {
    const existing = await tx.member.findUnique({
      where: { userId: payment.userId },
    });
    if (!existing?.expiresAt) return;

    const expiresAt = new Date(
      existing.expiresAt.getTime() - payment.durationDays * 24 * 60 * 60 * 1000,
    );
    await tx.member.update({
      where: { userId: payment.userId },
      data: { expiresAt },
    });

    this.logger.warn(
      `payment ${payment.id} reversed; membership for ${payment.userId} now ends ${expiresAt.toISOString()}`,
    );
  }
}
