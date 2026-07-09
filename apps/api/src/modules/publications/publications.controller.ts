import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PublicationsService } from './publications.service.js';
import { ListPublicationsDto } from './dto/list-publications.dto.js';
import { CreatePublicationDto } from './dto/create-publication.dto.js';
import { UpdatePublicationDto } from './dto/update-publication.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '@prisma/client';

@Controller('publications')
export class PublicationsController {
  constructor(private readonly publicationsService: PublicationsService) {}

  @Get()
  list(@Query() query: ListPublicationsDto) {
    return this.publicationsService.list(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Get('admin/all')
  listAllForAdmin() {
    return this.publicationsService.listAllForAdmin();
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.publicationsService.getBySlug(slug);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Post()
  create(@Body() dto: CreatePublicationDto) {
    return this.publicationsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePublicationDto) {
    return this.publicationsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.publicationsService.softDelete(id);
  }
}
