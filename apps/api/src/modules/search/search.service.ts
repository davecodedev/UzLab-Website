import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { SearchQueryDto, SearchResultType } from './dto/search-query.dto.js';

export interface SearchResultItem {
  type: 'publication' | 'news' | 'member' | 'laboratory';
  id: string;
  title: string;
  summary: string;
  url: string;
  category?: string;
  language?: string;
  tags?: string[];
  author?: string | null;
  publishedAt?: string | null;
  region?: string | null;
}

const RESULTS_PER_TYPE = 20;

// v1 global search: queries each content type directly against Postgres,
// fanned out in parallel and merged. When result volume grows, swap the
// query layer below for a dedicated search engine (Typesense/Meilisearch)
// behind this same search(query) method signature — callers (the
// controller, and the web app) don't need to change.
@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: SearchQueryDto): Promise<SearchResultItem[]> {
    const q = query.q?.trim();
    const hasKeyword = !!q && q.length >= 2;
    const hasAnyFilter =
      hasKeyword ||
      !!query.category ||
      !!query.language ||
      !!query.author ||
      (query.tags && query.tags.length > 0) ||
      !!query.region ||
      !!query.labField ||
      !!query.dateFrom ||
      !!query.dateTo;

    if (!hasAnyFilter) {
      return [];
    }

    const wantsType = (type: SearchResultType) =>
      !query.type || query.type === type;
    // category/language/tags/author only apply to Publications, region/
    // labField only to Laboratories — if one of those is the *only* filter
    // set, other types have nothing to match against and must return empty
    // rather than "everything".
    const hasNewsApplicableFilter =
      hasKeyword || !!query.dateFrom || !!query.dateTo;
    const hasLabApplicableFilter =
      hasKeyword || !!query.region || !!query.labField || !!query.dateFrom || !!query.dateTo;

    const [publications, news, members, laboratories] = await Promise.all([
      wantsType(SearchResultType.PUBLICATION)
        ? this.searchPublications(q, query)
        : Promise.resolve([]),
      wantsType(SearchResultType.NEWS) && hasNewsApplicableFilter
        ? this.searchNews(q, query)
        : Promise.resolve([]),
      wantsType(SearchResultType.MEMBER) && hasKeyword
        ? this.searchMembers(q)
        : Promise.resolve([]),
      wantsType(SearchResultType.LABORATORY) && hasLabApplicableFilter
        ? this.searchLaboratories(q, query)
        : Promise.resolve([]),
    ]);

    return [...publications, ...news, ...members, ...laboratories];
  }

  private async searchPublications(
    q: string | undefined,
    filters: SearchQueryDto,
  ): Promise<SearchResultItem[]> {
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
      publishedAt: {
        not: null,
        ...this.dateRange(filters.dateFrom, filters.dateTo),
      },
      ...(q && {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { summary: { contains: q, mode: 'insensitive' } },
          { bodyText: { contains: q, mode: 'insensitive' } },
          { tags: { has: q } },
        ],
      }),
    };

    const results = await this.prisma.publication.findMany({
      where,
      take: RESULTS_PER_TYPE,
    });

    return results.map((p) => ({
      type: 'publication',
      id: p.id,
      title: p.title,
      summary: p.summary,
      url: `/publications/${p.slug}`,
      category: p.category,
      language: p.language,
      tags: p.tags,
      author: p.author,
      publishedAt: p.publishedAt?.toISOString() ?? null,
    }));
  }

  private async searchNews(
    q: string | undefined,
    filters: SearchQueryDto,
  ): Promise<SearchResultItem[]> {
    const where: Prisma.NewsArticleWhereInput = {
      deletedAt: null,
      publishedAt: {
        not: null,
        ...this.dateRange(filters.dateFrom, filters.dateTo),
      },
      ...(q && {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { summary: { contains: q, mode: 'insensitive' } },
        ],
      }),
    };

    const results = await this.prisma.newsArticle.findMany({
      where,
      take: RESULTS_PER_TYPE,
    });

    return results.map((n) => ({
      type: 'news',
      id: n.id,
      title: n.title,
      summary: n.summary,
      url: `/news/${n.slug}`,
      publishedAt: n.publishedAt?.toISOString() ?? null,
    }));
  }

  private async searchMembers(q: string): Promise<SearchResultItem[]> {
    const results = await this.prisma.member.findMany({
      where: {
        isDirectoryListed: true,
        user: { fullName: { contains: q, mode: 'insensitive' } },
      },
      include: { user: { select: { fullName: true } } },
      take: RESULTS_PER_TYPE,
    });

    return results.map((m) => ({
      type: 'member',
      id: m.id,
      title: m.user.fullName,
      summary: m.organization ?? '',
      url: `/membership/directory/${m.id}`,
    }));
  }

  private async searchLaboratories(
    q: string | undefined,
    filters: SearchQueryDto,
  ): Promise<SearchResultItem[]> {
    const where: Prisma.LaboratoryWhereInput = {
      deletedAt: null,
      isPublished: true,
      region: filters.region ? { equals: filters.region, mode: 'insensitive' } : undefined,
      fields: filters.labField ? { has: filters.labField } : undefined,
      ...(q && {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { accreditationNumber: { contains: q, mode: 'insensitive' } },
        ],
      }),
    };

    const results = await this.prisma.laboratory.findMany({ where, take: RESULTS_PER_TYPE });

    return results.map((lab) => ({
      type: 'laboratory',
      id: lab.id,
      title: lab.name,
      summary: lab.accreditationNumber ?? '',
      url: `/laboratories/${lab.slug}`,
      category: lab.fields[0],
      region: lab.region,
    }));
  }

  private dateRange(
    from?: string,
    to?: string,
  ): Prisma.DateTimeNullableFilter | undefined {
    if (!from && !to) return undefined;
    return {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }
}
