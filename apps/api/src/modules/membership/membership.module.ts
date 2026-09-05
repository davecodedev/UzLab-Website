import { Module } from '@nestjs/common';
import { MembershipController } from './membership.controller.js';
import { MembershipService } from './membership.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  // For AuthService's key generation and hashing helpers.
  imports: [AuthModule],
  controllers: [MembershipController],
  providers: [MembershipService],
  // StandardsModule asks it what a caller is entitled to before honouring a
  // search.
  exports: [MembershipService],
})
export class MembershipModule {}
