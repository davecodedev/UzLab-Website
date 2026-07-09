import { Module } from '@nestjs/common';
import { MembershipController } from './membership.controller.js';
import { MembershipService } from './membership.service.js';

@Module({
  controllers: [MembershipController],
  providers: [MembershipService],
})
export class MembershipModule {}
