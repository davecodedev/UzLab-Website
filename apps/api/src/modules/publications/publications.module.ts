import { Module } from '@nestjs/common';
import { PublicationsController } from './publications.controller.js';
import { PublicationsService } from './publications.service.js';

@Module({
  controllers: [PublicationsController],
  providers: [PublicationsService],
  exports: [PublicationsService],
})
export class PublicationsModule {}
