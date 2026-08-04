import { Module } from '@nestjs/common';
import { CareersController } from './careers.controller.js';
import { CareersService } from './careers.service.js';

@Module({
  controllers: [CareersController],
  providers: [CareersService],
})
export class CareersModule {}
