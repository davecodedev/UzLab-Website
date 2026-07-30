import { Module } from '@nestjs/common';
import { LaboratoriesController } from './laboratories.controller.js';
import { LaboratoriesService } from './laboratories.service.js';
import { LaboratoryDocumentsService } from './documents.service.js';

@Module({
  controllers: [LaboratoriesController],
  providers: [LaboratoriesService, LaboratoryDocumentsService],
  exports: [LaboratoriesService],
})
export class LaboratoriesModule {}
