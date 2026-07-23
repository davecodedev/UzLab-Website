import { Module } from '@nestjs/common';
import { LaboratoriesController } from './laboratories.controller.js';
import { LaboratoriesService } from './laboratories.service.js';

@Module({
  controllers: [LaboratoriesController],
  providers: [LaboratoriesService],
  exports: [LaboratoriesService],
})
export class LaboratoriesModule {}
