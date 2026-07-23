import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { slugify } from '../../common/utils/slugify.js';
import { ListLaboratoriesDto } from './dto/list-laboratories.dto.js';
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

    return this.prisma.laboratory.findMany({ where, orderBy: { name: 'asc' } });
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
