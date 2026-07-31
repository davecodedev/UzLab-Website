import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StandardRegister } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { foldQueryTerms } from '../../common/utils/translit.js';
import type { ListStandardsDto } from './dto/list-standards.dto.js';

const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class StandardsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Rows the public may see. A document the catalogue has stopped listing stays
   * in the table — a withdrawn standard is still the one an old accreditation
   * cites — but it is not offered as a current result.
   */
  private get visible(): Prisma.StandardWhereInput {
    return { deletedAt: null, disappearedAt: null };
  }

  private where(query: ListStandardsDto): Prisma.StandardWhereInput {
    const where: Prisma.StandardWhereInput = { ...this.visible };

    if (query.register) where.register = query.register;
    if (query.status) where.status = query.status;
    if (query.ics) where.icsCode = query.ics;
    if (query.language) where.language = query.language;

    if (query.yearFrom || query.yearTo) {
      where.year = {
        ...(query.yearFrom ? { gte: query.yearFrom } : {}),
        ...(query.yearTo ? { lte: query.yearTo } : {}),
      };
    }

    return where;
  }

  /**
   * Free-text ids, folded so a query typed in either script matches a document
   * written in the other — the same trigram key the registry search uses.
   *
   * Returned as an id list rather than joined into the main query because the
   * fold has to happen in SQL against `searchText`, and mixing that into
   * Prisma's builder would mean hand-writing the whole filter.
   */
  private async searchIds(q: string, limit = 5000): Promise<string[] | null> {
    const terms = foldQueryTerms(q);
    if (terms.length === 0) return null;

    // Parameterised throughout — these strings come straight from a URL.
    const conditions = Prisma.join(
      terms.map((t) => Prisma.sql`"searchText" LIKE ${'%' + t + '%'}`),
      ' AND ',
    );

    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Standard"
      WHERE "deletedAt" IS NULL
        AND "disappearedAt" IS NULL
        AND "searchText" IS NOT NULL
        AND (${conditions})
      LIMIT ${Math.min(limit, 20000)}
    `;
    return rows.map((r) => r.id);
  }

  /**
   * One page of results plus the total, which the UI needs to say how many
   * documents a filter actually matched rather than "20+".
   */
  async list(query: ListStandardsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where = this.where(query);

    if (query.q?.trim()) {
      const ids = await this.searchIds(query.q);
      // A query that folds to nothing usable (one letter, punctuation) must
      // return nothing rather than silently ignoring what was typed.
      where.id = { in: ids ?? [] };
    }

    const orderBy = this.orderBy(query.sort);

    const [items, total] = await Promise.all([
      this.prisma.standard.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        // The abstract runs to several thousand characters and the search key
        // to more; neither belongs in a list of twenty.
        omit: { searchText: true, abstract: true },
      }),
      this.prisma.standard.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  private orderBy(sort: ListStandardsDto['sort']): Prisma.StandardOrderByWithRelationInput[] {
    switch (sort) {
      case 'oldest':
        return [{ year: 'asc' }, { designation: 'asc' }];
      case 'designation':
        return [{ designation: 'asc' }];
      case 'newest':
      default:
        // Nulls last: a document with no year is not the oldest, it is unknown.
        return [{ year: { sort: 'desc', nulls: 'last' } }, { designation: 'asc' }];
    }
  }

  /**
   * The filter values that actually exist, with counts. Computed rather than
   * hard-coded so a class the catalogues stop using disappears from the UI on
   * its own.
   */
  async facets() {
    const [registers, statuses, ics, languages, years] = await Promise.all([
      this.prisma.standard.groupBy({
        by: ['register'],
        where: this.visible,
        _count: { _all: true },
      }),
      this.prisma.standard.groupBy({
        by: ['status'],
        where: this.visible,
        _count: { _all: true },
      }),
      this.prisma.standard.groupBy({
        by: ['icsCode', 'icsLabel'],
        where: { ...this.visible, icsCode: { not: null } },
        _count: { _all: true },
        orderBy: { icsCode: 'asc' },
      }),
      this.prisma.standard.groupBy({
        by: ['language'],
        where: { ...this.visible, language: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.standard.aggregate({
        where: this.visible,
        _min: { year: true },
        _max: { year: true },
      }),
    ]);

    return {
      registers: registers.map((r) => ({ value: r.register, count: r._count._all })),
      statuses: statuses.map((s) => ({ value: s.status, count: s._count._all })),
      ics: ics.map((i) => ({ code: i.icsCode, label: i.icsLabel, count: i._count._all })),
      languages: languages.map((l) => ({ value: l.language, count: l._count._all })),
      yearRange: { min: years._min.year, max: years._max.year },
    };
  }

  async getBySlug(slug: string) {
    const standard = await this.prisma.standard.findFirst({
      where: { slug, deletedAt: null },
      omit: { searchText: true },
    });
    if (!standard) throw new NotFoundException('Standard not found');
    return standard;
  }

  /** Totals per catalogue, for the provenance block. */
  countByRegister(register: StandardRegister) {
    return this.prisma.standard.count({ where: { ...this.visible, register } });
  }
}
