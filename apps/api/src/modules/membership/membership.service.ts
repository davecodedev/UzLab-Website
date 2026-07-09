import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';

@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService) {}

  listTypes() {
    return this.prisma.membershipType.findMany({
      where: { isActive: true },
      orderBy: { priceCents: 'asc' },
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
}
