import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { LaboratoriesService } from './laboratories.service.js';
import { ListLaboratoriesDto } from './dto/list-laboratories.dto.js';
import { CreateLaboratoryDto } from './dto/create-laboratory.dto.js';
import { UpdateLaboratoryDto } from './dto/update-laboratory.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '@prisma/client';

@Controller('laboratories')
export class LaboratoriesController {
  constructor(private readonly laboratoriesService: LaboratoriesService) {}

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
