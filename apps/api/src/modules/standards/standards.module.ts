import { Module } from '@nestjs/common';
import { StandardsController } from './standards.controller.js';
import { StandardsService } from './standards.service.js';

@Module({
  controllers: [StandardsController],
  providers: [StandardsService],
  exports: [StandardsService],
})
export class StandardsModule {}
