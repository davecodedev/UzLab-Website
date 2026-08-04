import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CareersService } from './careers.service.js';
import {
  ApplyDto,
  CreateVacancyDto,
  ListVacanciesDto,
  ReviewApplicationDto,
  UpdateVacancyDto,
} from './dto/careers.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Throttle } from '@nestjs/throttler';
import { THROTTLE_BULK, THROTTLE_SEARCH } from '../../common/throttling.js';

@Controller('careers')
export class CareersController {
  constructor(private readonly careers: CareersService) {}

  // --- Job seekers ---------------------------------------------------------

  @Throttle({ default: THROTTLE_SEARCH })
  @Get('vacancies')
  list(@Query() query: ListVacanciesDto) {
    return this.careers.listOpen(query);
  }

  @Get('vacancies/facets')
  facets() {
    return this.careers.facets();
  }

  /**
   * Must be declared before `vacancies/:slug`, or Nest matches "mine" as a slug.
   */
  @UseGuards(JwtAuthGuard)
  @Get('applications/mine')
  myApplications(@CurrentUser() user: { id: string }) {
    return this.careers.listMyApplications(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('vacancies/mine')
  myVacancies(@CurrentUser() user: { id: string }) {
    return this.careers.listMyVacancies(user.id);
  }

  @Get('vacancies/:slug')
  detail(@Param('slug') slug: string) {
    return this.careers.getBySlug(slug);
  }

  /**
   * Applying works without an account — requiring registration to answer a job
   * advert would lose most applicants. Signing in only adds the ability to see
   * and correct what was sent.
   */
  @Throttle({ default: THROTTLE_BULK })
  @UseGuards(OptionalJwtAuthGuard)
  @Post('vacancies/:slug/apply')
  apply(
    @Param('slug') slug: string,
    @Body() dto: ApplyDto,
    @CurrentUser() user?: { id: string },
  ) {
    return this.careers.apply(slug, dto, user?.id ?? null);
  }

  // --- Employers -----------------------------------------------------------

  @Throttle({ default: THROTTLE_BULK })
  @UseGuards(JwtAuthGuard)
  @Post('vacancies')
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateVacancyDto) {
    return this.careers.createVacancy(user.id, dto);
  }

  // Ownership is checked in the service: being signed in is not enough.
  @UseGuards(JwtAuthGuard)
  @Patch('vacancies/:id')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateVacancyDto,
  ) {
    return this.careers.updateVacancy(user.id, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('vacancies/:id/applications')
  applications(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.careers.listApplications(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('applications/:id')
  review(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: ReviewApplicationDto,
  ) {
    return this.careers.reviewApplication(user.id, id, dto);
  }
}
