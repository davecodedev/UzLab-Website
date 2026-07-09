import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { MembershipModule } from './modules/membership/membership.module.js';
import { PublicationsModule } from './modules/publications/publications.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { SearchModule } from './modules/search/search.module.js';
import { HealthModule } from './modules/health/health.module.js';

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
  // RolesGuard is a global no-op unless a route is annotated with @Roles(...);
  // per-route auth still requires an explicit @UseGuards(JwtAuthGuard).
  providers: [{ provide: APP_GUARD, useClass: RolesGuard }],
})
export class AppModule {}
