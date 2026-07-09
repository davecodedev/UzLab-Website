import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { MembershipModule } from './modules/membership/membership.module.js';
import { PublicationsModule } from './modules/publications/publications.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { SearchModule } from './modules/search/search.module.js';
import { HealthModule } from './modules/health/health.module.js';

// RolesGuard is intentionally NOT global here: Nest runs global guards
// (APP_GUARD) before any route-level @UseGuards(), so a global RolesGuard
// would check request.user before JwtAuthGuard has populated it — every
// role-gated route would 403 unconditionally. Apply both together per
// route instead: @UseGuards(JwtAuthGuard, RolesGuard).
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    MembershipModule,
    PublicationsModule,
    MediaModule,
    SearchModule,
    HealthModule,
  ],
})
export class AppModule {}
