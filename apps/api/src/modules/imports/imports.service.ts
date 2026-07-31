import { Injectable } from '@nestjs/common';
import { NationalRegister, StandardRegister } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';

/**
 * The standards catalogues, described the same way the registers are. Refresh
 * cadence is stated here because it is a fact about how we operate, not
 * something either catalogue publishes.
 */
const STANDARD_SOURCES = [
  {
    register: StandardRegister.UZSTI,
    name: "O'zbekiston Standartlar Instituti (UZSTI)",
    url: 'https://uzsti.uz/shop?group=milliy',
    refresh: 'daily',
  },
  {
    register: StandardRegister.MGS,
    name: 'Межгосударственный совет по стандартизации, метрологии и сертификации (МГС)',
    url: 'https://mgscatalog.by/',
    refresh: 'weekly',
  },
] as const;

@Injectable()
export class ImportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Most recent runs across both registers, newest first. */
  listRuns(limit = 50) {
    return this.prisma.importRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: Math.min(limit, 200),
    });
  }

  /**
   * Health snapshot per register: how fresh the data is, whether the last run
   * actually wrote anything, and how many records the source has stopped
   * listing. This is the view that answers "is the register still being kept
   * up to date, and did anything break?".
   */
  async summary() {
    const registers = Object.values(NationalRegister);

    const laboratories = await Promise.all(
      registers.map(async (register) => {
        const [lastRun, lastSuccess, lastVerified, active, disappeared] = await Promise.all([
          this.prisma.importRun.findFirst({
            where: { register },
            orderBy: { startedAt: 'desc' },
          }),
          this.prisma.importRun.findFirst({
            where: { register, status: 'SUCCESS' },
            orderBy: { startedAt: 'desc' },
          }),
          // Freshness must count a skipped run too. Depstan's change detection
          // returns NO_CHANGES when the source is untouched — the data was
          // checked and is current. Measuring staleness against SUCCESS alone
          // reported a healthy register as "never updated", which is precisely
          // the false alarm that teaches people to ignore this page.
          this.prisma.importRun.findFirst({
            where: { register, status: { in: ['SUCCESS', 'NO_CHANGES'] } },
            orderBy: { startedAt: 'desc' },
          }),
          this.prisma.laboratory.count({ where: { register, disappearedAt: null } }),
          this.prisma.laboratory.count({ where: { register, disappearedAt: { not: null } } }),
        ]);

        return {
          kind: 'laboratories' as const,
          register,
          lastRun,
          lastSuccess,
          lastVerified,
          active,
          disappeared,
        };
      }),
    );

    // Same shape for the standards catalogues so one table can show every
    // source: an operator wants "is anything stale?" answered once, not per
    // kind of thing we import.
    const standards = await Promise.all(
      Object.values(StandardRegister).map(async (register) => {
        const [lastRun, lastSuccess, lastVerified, active, disappeared] = await Promise.all([
          this.prisma.importRun.findFirst({
            where: { standardRegister: register },
            orderBy: { startedAt: 'desc' },
          }),
          this.prisma.importRun.findFirst({
            where: { standardRegister: register, status: 'SUCCESS' },
            orderBy: { startedAt: 'desc' },
          }),
          this.prisma.importRun.findFirst({
            where: { standardRegister: register, status: { in: ['SUCCESS', 'NO_CHANGES'] } },
            orderBy: { startedAt: 'desc' },
          }),
          this.prisma.standard.count({ where: { register, disappearedAt: null } }),
          this.prisma.standard.count({ where: { register, disappearedAt: { not: null } } }),
        ]);

        return {
          kind: 'standards' as const,
          register,
          lastRun,
          lastSuccess,
          lastVerified,
          active,
          disappeared,
        };
      }),
    );

    return [...laboratories, ...standards];
  }

  /**
   * Public provenance: which official register each part of the data comes
   * from, when we last confirmed it against that source, and where to read the
   * authoritative version.
   *
   * Deliberately open to everyone. A registry that republishes government data
   * owes its readers a way to tell how current it is and to check it at source
   * — otherwise a stale copy looks exactly like a fresh one.
   */
  async publicProvenance() {
    const sources = [
      {
        register: NationalRegister.AKKRED,
        name: "O'zbekiston akkreditatsiya markazi (O'zAkk)",
        url: 'https://akkred.uz/uz/reestr',
        refresh: 'hourly',
      },
      {
        register: NationalRegister.DEPSTAN,
        name: "O'zbekiston texnik jihatdan tartibga solish agentligi (Depstan)",
        url: 'https://approval.depstan.uz/',
        refresh: 'daily',
      },
    ];

    const laboratories = await Promise.all(
      sources.map(async (s) => {
        // A run that found nothing to change still confirms the data is
        // current, so both outcomes count as a verification.
        const [verified, records] = await Promise.all([
          this.prisma.importRun.findFirst({
            where: { register: s.register, status: { in: ['SUCCESS', 'NO_CHANGES'] } },
            orderBy: { startedAt: 'desc' },
            select: { startedAt: true },
          }),
          this.prisma.laboratory.count({
            where: { register: s.register, disappearedAt: null, deletedAt: null, isPublished: true },
          }),
        ]);
        return { ...s, records, lastVerifiedAt: verified?.startedAt ?? null };
      }),
    );

    // The standards catalogues answer the same question about a different
    // table, so they are reported in the same shape rather than a parallel one
    // the UI would have to special-case.
    const standards = await Promise.all(
      STANDARD_SOURCES.map(async (s) => {
        const [verified, records] = await Promise.all([
          this.prisma.importRun.findFirst({
            where: { standardRegister: s.register, status: { in: ['SUCCESS', 'NO_CHANGES'] } },
            orderBy: { startedAt: 'desc' },
            select: { startedAt: true },
          }),
          this.prisma.standard.count({
            where: { register: s.register, disappearedAt: null, deletedAt: null },
          }),
        ]);
        return { ...s, records, lastVerifiedAt: verified?.startedAt ?? null };
      }),
    );

    return [...laboratories, ...standards];
  }

  /** Records the source has stopped listing — kept, not deleted. */
  listDisappeared(limit = 100) {
    return this.prisma.laboratory.findMany({
      where: { disappearedAt: { not: null } },
      orderBy: { disappearedAt: 'desc' },
      take: Math.min(limit, 500),
      select: {
        id: true,
        name: true,
        slug: true,
        accreditationNumber: true,
        register: true,
        disappearedAt: true,
        lastSeenAt: true,
      },
    });
  }
}
