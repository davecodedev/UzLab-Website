import { Controller, Get, Param, Query } from '@nestjs/common';
import { PublicationsService } from './publications.service.js';
import { ListPublicationsDto } from './dto/list-publications.dto.js';

@Controller('publications')
export class PublicationsController {
  constructor(private readonly publicationsService: PublicationsService) {}

  @Get()
  list(@Query() query: ListPublicationsDto) {
    return this.publicationsService.list(query);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.publicationsService.getBySlug(slug);
  }
}
