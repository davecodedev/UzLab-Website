import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';

export interface SearchResultItem {
  type: 'publication' | 'news' | 'member';
  id: string;
  title: string;
  summary: string;
  url: string;
}

// v1 global search: queries each content type directly with ILIKE.
// When result volume grows, swap the query layer below for a dedicated
// search engine (Typesense/Meilisearch) behind this same method signature —
// callers (the controller, and eventually the web app) don't need to change.
@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string): Promise<SearchResultItem[]> {
    if (!q || q.trim().length < 2) {
      return [];
    }

    const [publications, news, members] = await Promise.all([
      this.prisma.publication.findMany({
        where: {
          deletedAt: null,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { summary: { contains: q, mode: 'insensitive' } },
            { tags: { has: q } },
          ],
        },
        take: 20,
      }),
      this.prisma.newsArticle.findMany({
        where: {
          deletedAt: null,
          publishedAt: { not: null },
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { summary: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 20,
      }),
      this.prisma.member.findMany({
        where: {
          isDirectoryListed: true,
          user: { fullName: { contains: q, mode: 'insensitive' } },
        },
        include: { user: { select: { fullName: true } } },
        take: 20,
      }),
    ]);

    return [
      ...publications.map((p): SearchResultItem => ({
        type: 'publication',
        id: p.id,
        title: p.title,
        summary: p.summary,
        url: `/publications/${p.slug}`,
      })),
      ...news.map((n): SearchResultItem => ({
        type: 'news',
        id: n.id,
        title: n.title,
        summary: n.summary,
        url: `/news/${n.slug}`,
      })),
      ...members.map((m): SearchResultItem => ({
        type: 'member',
        id: m.id,
        title: m.user.fullName,
        summary: m.organization ?? '',
        url: `/membership/directory/${m.id}`,
      })),
    ];
  }
}
