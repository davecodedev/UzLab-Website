import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { MediaService } from './media.service.js';
import { CreateContactSubmissionDto } from './dto/create-contact-submission.dto.js';

@Controller()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('news')
  listNews() {
    return this.mediaService.listNews();
  }

  @Get('news/:slug')
  getNewsBySlug(@Param('slug') slug: string) {
    return this.mediaService.getNewsBySlug(slug);
  }

  @Post('contact')
  createContactSubmission(@Body() dto: CreateContactSubmissionDto) {
    return this.mediaService.createContactSubmission(dto);
  }
}
