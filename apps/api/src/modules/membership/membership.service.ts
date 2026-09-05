import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MembershipApplicationStatus,
  MemberStatus,
  UserRole,
} from '@prisma/client';
import { AccessTier, viewerFor } from '../../common/access/viewer.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { slugify } from '../../common/utils/slugify.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { CreateMembershipTypeDto } from './dto/create-membership-type.dto.js';
import { UpdateMembershipTypeDto } from './dto/update-membership-type.dto.js';
import { ReviewApplicationDto } from './dto/review-application.dto.js';

@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService) {}

  listTypes() {
    return this.prisma.membershipType.findMany({
      where: { isActive: true },
      orderBy: { priceCents: 'asc' },
    });
  }

  // Staff-only: includes inactive types, unlike the public listTypes().
  listAllTypesForAdmin() {
    return this.prisma.membershipType.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createType(dto: CreateMembershipTypeDto) {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    await this.ensureTypeSlugAvailable(slug);

    return this.prisma.membershipType.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        priceCents: dto.priceCents,
        currency: dto.currency ?? 'UZS',
        durationDays: dto.durationDays,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateType(id: string, dto: UpdateMembershipTypeDto) {
    await this.getTypeById(id);

    let slug: string | undefined;
    if (dto.slug) {
      slug = slugify(dto.slug);
      await this.ensureTypeSlugAvailable(slug, id);
    }

    return this.prisma.membershipType.update({
      where: { id },
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        priceCents: dto.priceCents,
        currency: dto.currency,
        durationDays: dto.durationDays,
        isActive: dto.isActive,
      },
    });
  }

  /**
   * The public directory.
   *
   * Only members who chose to be listed, and only what a member would expect
   * to be public about themselves: who they are, when they joined, and whether
   * the membership is current. Deliberately not the application outcome —
   * publishing that an organisation applied and was refused is not the
   * association's to disclose. Staff see that in the admin queue instead.
   */
  listDirectory() {
    return this.prisma.member.findMany({
      // Frozen and not-yet-approved memberships stay out of the public
      // directory: it is a list of current members, not of everyone who ever
      // paid.
      where: { isDirectoryListed: true, status: MemberStatus.ACTIVE },
      select: {
        id: true,
        organization: true,
        memberSince: true,
        expiresAt: true,
        user: { select: { fullName: true } },
        membershipType: { select: { name: true } },
      },
      orderBy: { memberSince: 'desc' },
    });
  }

  createApplication(applicantUserId: string, dto: CreateApplicationDto) {
    return this.prisma.membershipApplication.create({
      data: {
        applicantUserId,
        membershipTypeId: dto.membershipTypeId,
        phone: dto.phone,
        organization: dto.organization,
        notes: dto.notes,
      },
    });
  }

  listMyApplications(applicantUserId: string) {
    return this.prisma.membershipApplication.findMany({
      where: { applicantUserId },
      include: { membershipType: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Staff-only: every application regardless of status.
  listApplicationsForAdmin() {
    return this.prisma.membershipApplication.findMany({
      include: {
        applicant: { select: { email: true, fullName: true } },
        membershipType: { select: { name: true, durationDays: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewApplication(
    id: string,
    reviewerId: string,
    dto: ReviewApplicationDto,
  ) {
    const application = await this.prisma.membershipApplication.findUnique({
      where: { id },
      include: { membershipType: true },
    });
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    if (application.status !== MembershipApplicationStatus.PENDING) {
      throw new ConflictException('Application has already been reviewed');
    }

    if (dto.status === 'REJECTED') {
      return this.prisma.membershipApplication.update({
        where: { id },
        data: {
          status: MembershipApplicationStatus.REJECTED,
          reviewedByUserId: reviewerId,
          reviewedAt: new Date(),
        },
      });
    }

    const existingMember = await this.prisma.member.findUnique({
      where: { userId: application.applicantUserId },
    });
    if (existingMember) {
      throw new ConflictException('Applicant is already a member');
    }

    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + application.membershipType.durationDays,
    );

    const [updatedApplication] = await this.prisma.$transaction([
      this.prisma.membershipApplication.update({
        where: { id },
        data: {
          status: MembershipApplicationStatus.APPROVED,
          reviewedByUserId: reviewerId,
          reviewedAt: new Date(),
        },
      }),
      this.prisma.member.create({
        data: {
          userId: application.applicantUserId,
          membershipTypeId: application.membershipTypeId,
          organization: application.organization,
          expiresAt,
        },
      }),
      this.prisma.user.update({
        where: { id: application.applicantUserId },
        data: { role: UserRole.MEMBER },
      }),
    ]);

    return updatedApplication;
  }

  private async getTypeById(id: string) {
    const type = await this.prisma.membershipType.findUnique({ where: { id } });
    if (!type) {
      throw new NotFoundException('Membership type not found');
    }
    return type;
  }

  private async ensureTypeSlugAvailable(slug: string, excludeId?: string) {
    const existing = await this.prisma.membershipType.findUnique({
      where: { slug },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Slug "${slug}" is already in use`);
    }
  }

  // --- Members, for the admin panel ---------------------------------------

  /**
   * Every membership, newest first, with enough on each row for an
   * administrator to decide: who, which package, what it costs, when it runs
   * out, and whether the last payment actually arrived.
   */
  listMembers() {
    return this.prisma.member.findMany({
      orderBy: [{ status: 'asc' }, { memberSince: 'desc' }],
      select: {
        id: true,
        status: true,
        organization: true,
        memberSince: true,
        expiresAt: true,
        statusNote: true,
        reviewedAt: true,
        isDirectoryListed: true,
        user: {
          select: { id: true, email: true, fullName: true, role: true },
        },
        membershipType: { select: { name: true, durationDays: true } },
      },
    });
  }

  /**
   * Approve, freeze or unfreeze.
   *
   * None of the three touches `expiresAt`. Freezing someone who has paid to
   * March must leave March intact, or unfreezing them would silently cost them
   * the time they bought — the suspension is of access, not of the money.
   */
  async setMemberStatus(
    memberId: string,
    staffUserId: string,
    action: 'approve' | 'freeze' | 'unfreeze',
    note?: string,
  ) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });
    if (!member) throw new NotFoundException('Member not found');

    if (action === 'freeze' && member.status === MemberStatus.FROZEN) {
      throw new ConflictException('This membership is already frozen.');
    }
    if (action !== 'freeze' && member.status === MemberStatus.ACTIVE) {
      throw new ConflictException('This membership is already active.');
    }

    return this.prisma.member.update({
      where: { id: memberId },
      data: {
        status:
          action === 'freeze' ? MemberStatus.FROZEN : MemberStatus.ACTIVE,
        reviewedByUserId: staffUserId,
        reviewedAt: new Date(),
        statusNote: note ?? null,
      },
    });
  }

  /**
   * Removing a member who is no longer with the association.
   *
   * The membership row goes; the user account is soft-deleted rather than
   * erased, because payments, applications and laboratory claims point at it
   * and a hard delete would either fail on those references or take real
   * financial history with it. `deletedAt` is what the rest of the API already
   * filters on.
   */
  async removeMember(memberId: string, staffUserId: string, note?: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, userId: true },
    });
    if (!member) throw new NotFoundException('Member not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.member.delete({ where: { id: member.id } });
      await tx.user.update({
        where: { id: member.userId },
        data: { deletedAt: new Date(), role: UserRole.APPLICANT },
      });
      // Their refresh tokens go too, so an open session cannot keep working
      // after the account has been removed.
      await tx.refreshToken.deleteMany({ where: { userId: member.userId } });
      return { removed: true, userId: member.userId, note: note ?? null };
    });
  }

  /**
   * What the caller is entitled to, for the browser to render with.
   *
   * The tier is decided here and only mirrored in the UI — every endpoint that
   * returns restricted data re-derives it server-side, so a client that lies
   * about its tier gains nothing but a differently-drawn button.
   */
  async access(user?: { id: string; role: UserRole }) {
    if (!user) return { tier: AccessTier.PUBLIC, status: null, expiresAt: null };
    const member = await this.prisma.member.findUnique({
      where: { userId: user.id },
      select: { expiresAt: true, status: true },
    });
    const viewer = viewerFor(user as never, member);
    return {
      tier: viewer.tier,
      status: member?.status ?? null,
      expiresAt: member?.expiresAt ?? null,
    };
  }

}
