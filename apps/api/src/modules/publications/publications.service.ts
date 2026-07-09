import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { ListPublicationsDto } from './dto/list-publications.dto.js';

@Injectable()
export class PublicationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(filters: ListPublicationsDto) {
    const where: Prisma.PublicationWhereInput = {
      deletedAt: null,
      category: filters.category,
      language: filters.language,
      author: filters.author
        ? { contains: filters.author, mode: 'insensitive' }
        : undefined,
      tags:
        filters.tags && filters.tags.length > 0
          ? { hasSome: filters.tags }
          : undefined,
      publishedAt:
        filters.dateFrom || filters.dateTo
          ? {
              ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
              ...(filters.dateTo && { lte: new Date(filters.dateTo) }),
            }
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
      where: { slug, deletedAt: null },
    });
    if (!publication) {
      throw new NotFoundException('Publication not found');
    }
    return publication;
  }
}
