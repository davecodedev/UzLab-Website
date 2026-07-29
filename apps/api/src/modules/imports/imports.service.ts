import { Injectable } from '@nestjs/common';
import { NationalRegister } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';

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

    return Promise.all(
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

        return { register, lastRun, lastSuccess, lastVerified, active, disappeared };
      }),
    );
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
