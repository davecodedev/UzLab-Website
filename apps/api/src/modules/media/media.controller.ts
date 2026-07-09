import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { MediaService } from './media.service.js';
import { CreateContactSubmissionDto } from './dto/create-contact-submission.dto.js';
import { CreateNewsArticleDto } from './dto/create-news-article.dto.js';
import { UpdateNewsArticleDto } from './dto/update-news-article.dto.js';
import { UpdateContactSubmissionStatusDto } from './dto/update-contact-submission-status.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '@prisma/client';

@Controller()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('news')
  listNews() {
    return this.mediaService.listNews();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Get('news/admin/all')
  listAllNewsForAdmin() {
    return this.mediaService.listAllNewsForAdmin();
  }

  @Get('news/:slug')
  getNewsBySlug(@Param('slug') slug: string) {
    return this.mediaService.getNewsBySlug(slug);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Post('news')
  createNews(@Body() dto: CreateNewsArticleDto) {
    return this.mediaService.createNews(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Patch('news/:id')
  updateNews(@Param('id') id: string, @Body() dto: UpdateNewsArticleDto) {
    return this.mediaService.updateNews(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Delete('news/:id')
  removeNews(@Param('id') id: string) {
    return this.mediaService.softDeleteNews(id);
  }

  @Post('contact')
  createContactSubmission(@Body() dto: CreateContactSubmissionDto) {
    return this.mediaService.createContactSubmission(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Get('contact')
  listContactSubmissions() {
    return this.mediaService.listContactSubmissions();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Patch('contact/:id')
  updateContactSubmissionStatus(
    @Param('id') id: string,
    @Body() dto: UpdateContactSubmissionStatusDto,
  ) {
    return this.mediaService.updateContactSubmissionStatus(id, dto);
  }
}
