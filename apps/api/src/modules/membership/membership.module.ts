import { Module } from '@nestjs/common';
import { MembershipController } from './membership.controller.js';
import { MembershipService } from './membership.service.js';

@Module({
  controllers: [MembershipController],
  providers: [MembershipService],
  // StandardsModule asks it what a caller is entitled to before honouring a
  // search.
  exports: [MembershipService],
})
export class MembershipModule {}
