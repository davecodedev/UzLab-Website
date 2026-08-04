import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CareersService, MAX_CV_BYTES } from './careers.service.js';
import {
  ApplyDto,
  CreateVacancyDto,
  ListCandidatesDto,
  ListVacanciesDto,
  ReviewApplicationDto,
  UpdateVacancyDto,
  UpsertCandidateDto,
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

  // --- Candidates ----------------------------------------------------------

  /**
   * The candidate directory.
   *
   * Whether names and contact details come back is decided here, from the
   * token, and passed to the service as a boolean. It is deliberately not a
   * query parameter: those are set by the caller, and "identified=true" would
   * be the whole of the access control.
   */
  @Throttle({ default: THROTTLE_SEARCH })
  @UseGuards(OptionalJwtAuthGuard)
  @Get('candidates')
  candidates(@Query() query: ListCandidatesDto, @CurrentUser() user?: { id: string }) {
    return this.careers.listCandidates(query, !!user);
  }

  @Get('candidates/facets')
  candidateFacets() {
    return this.careers.candidateFacets();
  }

  /** Declared before `candidates/:id` would be, so "me" is not read as an id. */
  @UseGuards(JwtAuthGuard)
  @Get('candidates/me')
  myCandidateProfile(@CurrentUser() user: { id: string }) {
    return this.careers.getMyCandidateProfile(user.id);
  }

  @Throttle({ default: THROTTLE_BULK })
  @UseGuards(JwtAuthGuard)
  @Put('candidates/me')
  saveCandidateProfile(@CurrentUser() user: { id: string }, @Body() dto: UpsertCandidateDto) {
    return this.careers.upsertCandidateProfile(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('candidates/me')
  deleteCandidateProfile(@CurrentUser() user: { id: string }) {
    return this.careers.deleteCandidateProfile(user.id);
  }

  @Throttle({ default: THROTTLE_BULK })
  @UseGuards(JwtAuthGuard)
  @Post('candidates/me/cv')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_CV_BYTES } }))
  uploadCv(
    @CurrentUser() user: { id: string },
    @UploadedFile()
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    return this.careers.saveCv(user.id, file);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('candidates/me/cv')
  removeCv(@CurrentUser() user: { id: string }) {
    return this.careers.deleteCv(user.id);
  }

  /**
   * Downloading someone's CV requires an account, for the same reason their
   * e-mail does: it is theirs, and the open web is not the audience.
   */
  @UseGuards(JwtAuthGuard)
  @Get('candidates/:id/cv')
  async downloadCv(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Res() res: Response,
  ) {
    const cv = await this.careers.getCv(id, user.id);
    res.setHeader('Content-Type', cv.mimeType);
    res.setHeader('Content-Length', String(cv.data.length));
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${cv.filename.replace(/[^\w.-]/g, '_')}"`,
    );
    res.end(Buffer.from(cv.data));
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
