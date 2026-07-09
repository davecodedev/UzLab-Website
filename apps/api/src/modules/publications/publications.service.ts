import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { slugify } from '../../common/utils/slugify.js';
import { ListPublicationsDto } from './dto/list-publications.dto.js';
import { CreatePublicationDto } from './dto/create-publication.dto.js';
import { UpdatePublicationDto } from './dto/update-publication.dto.js';

@Injectable()
export class PublicationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(filters: ListPublicationsDto) {
    const where: Prisma.PublicationWhereInput = {
      deletedAt: null,
      publishedAt: {
        not: null,
        ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
        ...(filters.dateTo && { lte: new Date(filters.dateTo) }),
      },
      category: filters.category,
      language: filters.language,
      author: filters.author
        ? { contains: filters.author, mode: 'insensitive' }
        : undefined,
      tags:
        filters.tags && filters.tags.length > 0
          ? { hasSome: filters.tags }
          : undefined,
      ...(filters.q && {
        OR: [
          { title: { contains: filters.q, mode: 'insensitive' } },
          { summary: { contains: filters.q, mode: 'insensitive' } },
          { bodyText: { contains: filters.q, mode: 'insensitive' } },
          { tags: { has: filters.q } },
        ],
      }),
    };

    return this.prisma.publication.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
    });
  }

  async getBySlug(slug: string) {
    const publication = await this.prisma.publication.findFirst({
      where: { slug, deletedAt: null, publishedAt: { not: null } },
    });
    if (!publication) {
      throw new NotFoundException('Publication not found');
    }
    return publication;
  }

  // Staff-only: includes drafts (publishedAt: null), unlike the public list().
  listAllForAdmin() {
    return this.prisma.publication.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreatePublicationDto) {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.title);
    await this.ensureSlugAvailable(slug);

    return this.prisma.publication.create({
      data: {
        title: dto.title,
        slug,
        category: dto.category,
        summary: dto.summary,
        bodyText: dto.bodyText,
        fileUrl: dto.fileUrl,
        language: dto.language ?? 'uz',
        tags: dto.tags ?? [],
        author: dto.author,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
      },
    });
  }

  async update(id: string, dto: UpdatePublicationDto) {
    await this.getById(id);

    let slug: string | undefined;
    if (dto.slug) {
      slug = slugify(dto.slug);
      await this.ensureSlugAvailable(slug, id);
    }

    return this.prisma.publication.update({
      where: { id },
      data: {
        title: dto.title,
        slug,
        category: dto.category,
        summary: dto.summary,
        bodyText: dto.bodyText,
        fileUrl: dto.fileUrl,
        language: dto.language,
        tags: dto.tags,
        author: dto.author,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
      },
    });
  }

  async softDelete(id: string) {
    await this.getById(id);
    return this.prisma.publication.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async getById(id: string) {
    const publication = await this.prisma.publication.findFirst({
      where: { id, deletedAt: null },
    });
    if (!publication) {
      throw new NotFoundException('Publication not found');
    }
    return publication;
  }

  private async ensureSlugAvailable(slug: string, excludeId?: string) {
    const existing = await this.prisma.publication.findUnique({
      where: { slug },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Slug "${slug}" is already in use`);
    }
  }
}
