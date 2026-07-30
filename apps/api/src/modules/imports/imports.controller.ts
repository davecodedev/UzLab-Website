import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ImportsService } from './imports.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

// Staff-only throughout: import health exposes how and when the register is
// refreshed, which is operational detail, not public information.
@Controller('imports')
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  /** Public — see publicProvenance(). Declared before the staff-only guards. */
  @Get('provenance')
  provenance() {
    return this.imports.publicProvenance();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Get('summary')
  summary() {
    return this.imports.summary();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Get('runs')
  runs(@Query('limit') limit?: string) {
    return this.imports.listRuns(limit ? Number(limit) : undefined);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Get('disappeared')
  disappeared(@Query('limit') limit?: string) {
    return this.imports.listDisappeared(limit ? Number(limit) : undefined);
  }
}
