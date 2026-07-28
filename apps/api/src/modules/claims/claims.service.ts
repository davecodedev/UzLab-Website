import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClaimStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { CreateClaimDto, ReviewClaimDto, UpdateProfileDto } from './dto/claims.dto.js';

@Injectable()
export class ClaimsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Member side ---------------------------------------------------------

  async createClaim(userId: string, dto: CreateClaimDto) {
    const lab = await this.prisma.laboratory.findFirst({
      where: { id: dto.laboratoryId, deletedAt: null },
      select: { id: true },
    });
    if (!lab) throw new NotFoundException('Laboratory not found');

    const existing = await this.prisma.laboratoryClaim.findUnique({
      where: { userId_laboratoryId: { userId, laboratoryId: dto.laboratoryId } },
    });

    // An approved claim is not something to silently reset by re-submitting.
    if (existing?.status === ClaimStatus.APPROVED) {
      throw new BadRequestException('You already manage this laboratory.');
    }
    if (existing?.status === ClaimStatus.PENDING) {
      throw new BadRequestException('Your claim for this laboratory is already awaiting review.');
    }

    const data = {
      evidence: dto.evidence,
      contactName: dto.contactName,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      status: ClaimStatus.PENDING,
      reviewedByUserId: null,
      reviewedAt: null,
      reviewNote: null,
    };

    // A rejected claim can be re-submitted with better evidence.
    if (existing) {
      return this.prisma.laboratoryClaim.update({ where: { id: existing.id }, data });
    }
    return this.prisma.laboratoryClaim.create({
      data: { ...data, userId, laboratoryId: dto.laboratoryId },
    });
  }

  listMyClaims(userId: string) {
    return this.prisma.laboratoryClaim.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        laboratory: {
          select: {
            id: true,
            name: true,
            slug: true,
            accreditationNumber: true,
            register: true,
            profile: true,
          },
        },
      },
    });
  }

  /**
   * The authorisation gate for every member write: editing a laboratory
   * requires an *approved* claim on that exact laboratory. Pending and
   * rejected claims grant nothing.
   */
  private async assertApprovedClaim(userId: string, laboratoryId: string) {
    const claim = await this.prisma.laboratoryClaim.findUnique({
      where: { userId_laboratoryId: { userId, laboratoryId } },
      select: { status: true },
    });
    if (claim?.status !== ClaimStatus.APPROVED) {
      throw new ForbiddenException('You do not manage this laboratory.');
    }
  }

  async updateProfile(userId: string, laboratoryId: string, dto: UpdateProfileDto) {
    await this.assertApprovedClaim(userId, laboratoryId);

    const data = { ...dto, updatedByUserId: userId };
    return this.prisma.laboratoryProfile.upsert({
      where: { laboratoryId },
      create: { laboratoryId, ...data },
      update: data,
    });
  }

  async getProfileForEditing(userId: string, laboratoryId: string) {
    await this.assertApprovedClaim(userId, laboratoryId);
    return this.prisma.laboratoryProfile.findUnique({ where: { laboratoryId } });
  }

  // --- Staff side ----------------------------------------------------------

  listClaims(status?: ClaimStatus) {
    return this.prisma.laboratoryClaim.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        laboratory: {
          select: { id: true, name: true, slug: true, accreditationNumber: true, register: true },
        },
      },
    });
  }

  async reviewClaim(reviewerId: string, claimId: string, dto: ReviewClaimDto) {
    const claim = await this.prisma.laboratoryClaim.findUnique({ where: { id: claimId } });
    if (!claim) throw new NotFoundException('Claim not found');
    if (dto.status === ClaimStatus.PENDING) {
      throw new BadRequestException('A review must approve or reject.');
    }

    return this.prisma.laboratoryClaim.update({
      where: { id: claimId },
      data: {
        status: dto.status,
        reviewNote: dto.reviewNote,
        reviewedByUserId: reviewerId,
        reviewedAt: new Date(),
      },
    });
  }
}
