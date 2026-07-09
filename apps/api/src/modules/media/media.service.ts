import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { slugify } from '../../common/utils/slugify.js';
import { CreateContactSubmissionDto } from './dto/create-contact-submission.dto.js';
import { CreateNewsArticleDto } from './dto/create-news-article.dto.js';
import { UpdateNewsArticleDto } from './dto/update-news-article.dto.js';
import { UpdateContactSubmissionStatusDto } from './dto/update-contact-submission-status.dto.js';

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  listNews() {
    return this.prisma.newsArticle.findMany({
      where: { deletedAt: null, publishedAt: { not: null } },
      orderBy: { publishedAt: 'desc' },
    });
  }

  // Staff-only: includes drafts (publishedAt: null), unlike the public listNews().
  listAllNewsForAdmin() {
    return this.prisma.newsArticle.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getNewsBySlug(slug: string) {
    const article = await this.prisma.newsArticle.findFirst({
      where: { slug, deletedAt: null, publishedAt: { not: null } },
    });
    if (!article) {
      throw new NotFoundException('Article not found');
    }
    return article;
  }

  async createNews(dto: CreateNewsArticleDto) {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.title);
    await this.ensureNewsSlugAvailable(slug);

    return this.prisma.newsArticle.create({
      data: {
        title: dto.title,
        slug,
        summary: dto.summary,
        bodyText: dto.bodyText,
        coverImageUrl: dto.coverImageUrl,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
      },
    });
  }

  async updateNews(id: string, dto: UpdateNewsArticleDto) {
    await this.getNewsById(id);

    let slug: string | undefined;
    if (dto.slug) {
      slug = slugify(dto.slug);
      await this.ensureNewsSlugAvailable(slug, id);
    }

    return this.prisma.newsArticle.update({
      where: { id },
      data: {
        title: dto.title,
        slug,
        summary: dto.summary,
        bodyText: dto.bodyText,
        coverImageUrl: dto.coverImageUrl,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
      },
    });
  }

  async softDeleteNews(id: string) {
    await this.getNewsById(id);
    return this.prisma.newsArticle.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  createContactSubmission(dto: CreateContactSubmissionDto, userId?: string) {
    return this.prisma.contactSubmission.create({
      data: { ...dto, userId },
    });
  }

  listContactSubmissions() {
    return this.prisma.contactSubmission.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateContactSubmissionStatus(
    id: string,
    dto: UpdateContactSubmissionStatusDto,
  ) {
    const submission = await this.prisma.contactSubmission.findUnique({
      where: { id },
    });
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }
    return this.prisma.contactSubmission.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  private async getNewsById(id: string) {
    const article = await this.prisma.newsArticle.findFirst({
      where: { id, deletedAt: null },
    });
    if (!article) {
      throw new NotFoundException('Article not found');
    }
    return article;
  }

  private async ensureNewsSlugAvailable(slug: string, excludeId?: string) {
    const existing = await this.prisma.newsArticle.findUnique({
      where: { slug },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Slug "${slug}" is already in use`);
    }
  }
}
