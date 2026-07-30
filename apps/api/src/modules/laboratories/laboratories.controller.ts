import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { LaboratoryDocumentKind } from '@prisma/client';
import {
  LaboratoryDocumentsService,
  MAX_DOCUMENT_BYTES,
  type UploadedFile as UploadedFileType,
} from './documents.service.js';
import { LaboratoriesService } from './laboratories.service.js';
import { ListLaboratoriesDto } from './dto/list-laboratories.dto.js';
import { CreateLaboratoryDto } from './dto/create-laboratory.dto.js';
import { UpdateLaboratoryDto } from './dto/update-laboratory.dto.js';
import { SubmitLaboratoryDto, ReviewSubmissionDto } from './dto/submit-laboratory.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '@prisma/client';

@Controller('laboratories')
export class LaboratoriesController {
  constructor(
    private readonly laboratoriesService: LaboratoriesService,
    private readonly documents: LaboratoryDocumentsService,
  ) {}

  @Get()
  list(@Query() query: ListLaboratoriesDto) {
    return this.laboratoriesService.list(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Get('admin/all')
  listAllForAdmin() {
    return this.laboratoriesService.listAllForAdmin();
  }

  /**
   * Returns the ids matching a keyword search, for the registry's Keywords
   * filter. Ids only: the client already holds every record, so sending the
   * matching set back is enough to intersect with the other filters, and it
   * keeps this response tiny regardless of how many documents matched.
   */
  @Get('search/keywords')
  searchKeywords(@Query('q') q?: string) {
    return this.laboratoriesService.searchKeywords(q ?? '');
  }

  // --- Member submissions ---------------------------------------------------
  // Declared before the ':slug' route: Nest matches in order, so 'submissions'
  // would otherwise be swallowed as a slug.

  @UseGuards(JwtAuthGuard)
  @Post('submissions')
  submit(@CurrentUser() user: { id: string }, @Body() dto: SubmitLaboratoryDto) {
    return this.laboratoriesService.submit(user.id, dto);
  }

  /**
   * Reads an uploaded certificate or scope PDF and returns the field values
   * found in it, saving nothing. The submitter reviews and corrects them before
   * the record is created — extraction guesses, it does not decide.
   */
  @UseGuards(JwtAuthGuard)
  @Post('submissions/analyze')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_DOCUMENT_BYTES } }))
  analyzeDocument(@UploadedFile() file: UploadedFileType) {
    return this.documents.analyze(file);
  }

  /** Attaches a document to a laboratory the member has already submitted. */
  @UseGuards(JwtAuthGuard)
  @Post('submissions/:id/documents/:kind')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_DOCUMENT_BYTES } }))
  async attachDocument(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('kind') kind: LaboratoryDocumentKind,
    @UploadedFile() file: UploadedFileType,
  ) {
    await this.laboratoriesService.assertSubmitter(user.id, id);
    return this.documents.attach(id, kind, file, user.id);
  }

  @Get(':id/documents/:kind')
  async downloadDocument(
    @Param('id') id: string,
    @Param('kind') kind: LaboratoryDocumentKind,
    @Res() res: Response,
  ) {
    const doc = await this.documents.download(id, kind);
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Length', String(doc.sizeBytes));
    // `inline` so the browser previews it rather than forcing a download.
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${doc.filename.replace(/[^\w.\-]/g, '_')}"`,
    );
    res.end(Buffer.from(doc.data));
  }

  @UseGuards(JwtAuthGuard)
  @Get('submissions/mine')
  listMySubmissions(@CurrentUser() user: { id: string }) {
    return this.laboratoriesService.listMySubmissions(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Get('submissions/pending')
  listPendingSubmissions() {
    return this.laboratoriesService.listPendingSubmissions();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Patch('submissions/:id/review')
  reviewSubmission(@Param('id') id: string, @Body() dto: ReviewSubmissionDto) {
    return this.laboratoriesService.reviewSubmission(id, dto);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.laboratoriesService.getBySlug(slug);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Post()
  create(@Body() dto: CreateLaboratoryDto) {
    return this.laboratoriesService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLaboratoryDto) {
    return this.laboratoriesService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.laboratoriesService.softDelete(id);
  }
}
