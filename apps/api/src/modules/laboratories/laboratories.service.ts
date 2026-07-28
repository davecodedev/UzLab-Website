import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConformityBodyType, Prisma } from '@prisma/client';

/** Body types that count as laboratories — mirrors the importers. */
const LABORATORY_BODY_TYPES = new Set<ConformityBodyType>([
  ConformityBodyType.TESTING_LAB,
  ConformityBodyType.METROLOGY_SERVICE,
  ConformityBodyType.CALIBRATION_LAB,
  ConformityBodyType.NDT_LAB,
  ConformityBodyType.MEDICAL_LAB,
]);
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { slugify } from '../../common/utils/slugify.js';
import { ListLaboratoriesDto } from './dto/list-laboratories.dto.js';
import { SubmitLaboratoryDto, ReviewSubmissionDto } from './dto/submit-laboratory.dto.js';
import { CreateLaboratoryDto } from './dto/create-laboratory.dto.js';
import { UpdateLaboratoryDto } from './dto/update-laboratory.dto.js';

@Injectable()
export class LaboratoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list(filters: ListLaboratoriesDto) {
    const where: Prisma.LaboratoryWhereInput = {
      deletedAt: null,
      isPublished: true,
      region: filters.region ? { equals: filters.region, mode: 'insensitive' } : undefined,
      accreditationStatus: filters.status,
      fields: filters.field ? { has: filters.field } : undefined,
      ...(filters.q && {
        OR: [
          { name: { contains: filters.q, mode: 'insensitive' } },
          { accreditationNumber: { contains: filters.q, mode: 'insensitive' } },
        ],
      }),
    };

    // scopeText holds each body's full scope-of-accreditation table — ~10.5 MB
    // across the register, with single records over 300 KB. It's only ever
    // rendered on a detail page, so it stays out of list responses.
    return this.prisma.laboratory.findMany({
      where,
      orderBy: { name: 'asc' },
      omit: { scopeText: true },
    });
  }

  // Staff-only: includes unpublished entries, unlike the public list().
  listAllForAdmin() {
    return this.prisma.laboratory.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBySlug(slug: string) {
    const lab = await this.prisma.laboratory.findFirst({
      where: { slug, deletedAt: null, isPublished: true },
      // Member-supplied detail travels with the record; the page shows it
      // alongside the register's own data rather than replacing it.
      include: { profile: true },
    });
    if (!lab) {
      throw new NotFoundException('Laboratory not found');
    }
    return lab;
  }

  async create(dto: CreateLaboratoryDto) {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    await this.ensureSlugAvailable(slug);
    if (dto.accreditationNumber) {
      await this.ensureAccreditationNumberAvailable(dto.accreditationNumber);
    }

    return this.prisma.laboratory.create({
      data: {
        name: dto.name,
        slug,
        fields: dto.fields ?? [],
        accreditationNumber: dto.accreditationNumber,
        accreditationBody: dto.accreditationBody,
        accreditationStatus: dto.accreditationStatus,
        taxId: dto.taxId,
        region: dto.region,
        city: dto.city,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        description: dto.description,
        isPublished: dto.isPublished ?? true,
        source: 'MANUAL_ENTRY',
      },
    });
  }

  async update(id: string, dto: UpdateLaboratoryDto) {
    await this.getById(id);

    let slug: string | undefined;
    if (dto.slug) {
      slug = slugify(dto.slug);
      await this.ensureSlugAvailable(slug, id);
    }
    if (dto.accreditationNumber) {
      await this.ensureAccreditationNumberAvailable(dto.accreditationNumber, id);
    }

    return this.prisma.laboratory.update({
      where: { id },
      data: {
        name: dto.name,
        slug,
        fields: dto.fields,
        accreditationNumber: dto.accreditationNumber,
        accreditationBody: dto.accreditationBody,
        accreditationStatus: dto.accreditationStatus,
        taxId: dto.taxId,
        region: dto.region,
        city: dto.city,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        description: dto.description,
        isPublished: dto.isPublished,
      },
    });
  }

  // --- Member submissions ---------------------------------------------------

  /**
   * Creates a laboratory supplied by a member. It is held back from the public
   * registry until staff approve it — an unmoderated public register of
   * accreditation data is too easy to pollute.
   */
  async submit(userId: string, dto: SubmitLaboratoryDto) {
    if (dto.accreditationNumber) {
      const clash = await this.prisma.laboratory.findUnique({
        where: { accreditationNumber: dto.accreditationNumber },
        select: { id: true },
      });
      if (clash) {
        throw new ConflictException(
          `Registry number "${dto.accreditationNumber}" already exists. If this is your laboratory, claim the existing entry instead of adding a new one.`,
        );
      }
    }

    const slug = await this.uniqueSlug(slugify(dto.name));
    const { accreditationDate, accreditedUntil, ...rest } = dto;

    return this.prisma.laboratory.create({
      data: {
        ...rest,
        slug,
        accreditationDate: accreditationDate ? new Date(accreditationDate) : undefined,
        accreditedUntil: accreditedUntil ? new Date(accreditedUntil) : undefined,
        fields: dto.fields ?? [],
        directions: dto.directions ?? [],
        isLaboratory: LABORATORY_BODY_TYPES.has(dto.bodyType),
        source: 'SELF_REGISTERED',
        // No register: these are not in akkred.uz or approval.depstan.uz, which
        // is also what keeps the scheduled imports from ever touching them.
        register: null,
        isPublished: false,
        submittedByUserId: userId,
        submittedAt: new Date(),
      },
    });
  }

  /** Member-submitted entries awaiting a staff decision. */
  listPendingSubmissions() {
    return this.prisma.laboratory.findMany({
      where: { source: 'SELF_REGISTERED', isPublished: false, deletedAt: null },
      orderBy: { submittedAt: 'asc' },
      include: { submittedBy: { select: { id: true, email: true, fullName: true } } },
    });
  }

  /**
   * A member's own submissions, including rejected ones. Rejection soft-deletes
   * the row to keep it out of every public listing, so filtering on
   * `deletedAt: null` here would hide the rejection — and the reviewer's note
   * with it — from the one person who needs to read it.
   */
  listMySubmissions(userId: string) {
    return this.prisma.laboratory.findMany({
      where: { submittedByUserId: userId },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async reviewSubmission(id: string, dto: ReviewSubmissionDto) {
    const lab = await this.prisma.laboratory.findFirst({
      where: { id, source: 'SELF_REGISTERED', deletedAt: null },
    });
    if (!lab) throw new NotFoundException('Submission not found');

    // Rejection keeps the row (so the submitter can see the note and it is not
    // silently lost) but soft-deletes it out of every listing.
    return this.prisma.laboratory.update({
      where: { id },
      data: {
        isPublished: dto.approve,
        reviewNote: dto.reviewNote,
        reviewedAt: new Date(),
        deletedAt: dto.approve ? null : new Date(),
      },
    });
  }

  /** Appends a counter until the slug is free — member names collide far more than registry numbers do. */
  private async uniqueSlug(base: string): Promise<string> {
    let candidate = base;
    for (let i = 2; i < 100; i++) {
      const taken = await this.prisma.laboratory.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!taken) return candidate;
      candidate = `${base}-${i}`;
    }
    throw new ConflictException('Could not generate a unique address for this name.');
  }

  async softDelete(id: string) {
    await this.getById(id);
    return this.prisma.laboratory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async getById(id: string) {
    const lab = await this.prisma.laboratory.findFirst({ where: { id, deletedAt: null } });
    if (!lab) {
      throw new NotFoundException('Laboratory not found');
    }
    return lab;
  }

  private async ensureSlugAvailable(slug: string, excludeId?: string) {
    const existing = await this.prisma.laboratory.findUnique({ where: { slug } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Slug "${slug}" is already in use`);
    }
  }

  private async ensureAccreditationNumberAvailable(accreditationNumber: string, excludeId?: string) {
    const existing = await this.prisma.laboratory.findUnique({ where: { accreditationNumber } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Accreditation number "${accreditationNumber}" is already in use`);
    }
  }
}
