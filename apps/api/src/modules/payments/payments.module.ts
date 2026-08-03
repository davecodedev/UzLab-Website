import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { PaymeService } from './payme.service.js';
import { ClickService } from './click.service.js';
import { MembershipsService } from './memberships.service.js';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymeService, ClickService, MembershipsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
