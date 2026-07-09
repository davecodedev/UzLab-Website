import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { CreateContactSubmissionDto } from './dto/create-contact-submission.dto.js';

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  listNews() {
    return this.prisma.newsArticle.findMany({
      where: { deletedAt: null, publishedAt: { not: null } },
      orderBy: { publishedAt: 'desc' },
    });
  }

  async getNewsBySlug(slug: string) {
    const article = await this.prisma.newsArticle.findFirst({
      where: { slug, deletedAt: null },
    });
    if (!article) {
      throw new NotFoundException('Article not found');
    }
    return article;
  }

  createContactSubmission(dto: CreateContactSubmissionDto, userId?: string) {
    return this.prisma.contactSubmission.create({
      data: { ...dto, userId },
    });
  }
}
