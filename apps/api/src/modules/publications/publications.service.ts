import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { ListPublicationsDto } from './dto/list-publications.dto.js';

@Injectable()
export class PublicationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(filters: ListPublicationsDto) {
    return this.prisma.publication.findMany({
      where: {
        deletedAt: null,
        category: filters.category,
        language: filters.language,
        ...(filters.q && {
          OR: [
            { title: { contains: filters.q, mode: 'insensitive' } },
            { summary: { contains: filters.q, mode: 'insensitive' } },
            { bodyText: { contains: filters.q, mode: 'insensitive' } },
            { tags: { has: filters.q } },
          ],
        }),
      },
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
