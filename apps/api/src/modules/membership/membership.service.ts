import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipApplicationStatus, UserRole } from '@prisma/client';
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

  listDirectory() {
    return this.prisma.member.findMany({
      where: { isDirectoryListed: true },
      include: {
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
}
