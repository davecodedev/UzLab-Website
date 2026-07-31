import { Controller, Get, Param, Query } from '@nestjs/common';
import { StandardsService } from './standards.service.js';
import { ListStandardsDto } from './dto/list-standards.dto.js';

// Public throughout: the catalogue republishes documents both source
// catalogues publish openly, and the point of holding a copy is that it can be
// searched across scripts and languages in one place.
@Controller('standards')
export class StandardsController {
  constructor(private readonly standards: StandardsService) {}

  @Get()
  list(@Query() query: ListStandardsDto) {
    return this.standards.list(query);
  }

  /** Declared before :slug so "facets" is not read as one. */
  @Get('facets')
  facets() {
    return this.standards.facets();
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.standards.getBySlug(slug);
  }
}
