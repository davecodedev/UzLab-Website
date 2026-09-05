import { Module } from '@nestjs/common';
import { StandardsController } from './standards.controller.js';
import { StandardsService } from './standards.service.js';
import { MembershipModule } from '../membership/membership.module.js';

@Module({
  imports: [MembershipModule],
  controllers: [StandardsController],
  providers: [StandardsService],
  exports: [StandardsService],
})
export class StandardsModule {}
