import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { MembershipService } from './membership.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { CreateMembershipTypeDto } from './dto/create-membership-type.dto.js';
import { UpdateMembershipTypeDto } from './dto/update-membership-type.dto.js';
import { ReviewApplicationDto } from './dto/review-application.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '@prisma/client';

@Controller('membership')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get('types')
  listTypes() {
    return this.membershipService.listTypes();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Get('types/admin/all')
  listAllTypesForAdmin() {
    return this.membershipService.listAllTypesForAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Post('types')
  createType(@Body() dto: CreateMembershipTypeDto) {
    return this.membershipService.createType(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Patch('types/:id')
  updateType(@Param('id') id: string, @Body() dto: UpdateMembershipTypeDto) {
    return this.membershipService.updateType(id, dto);
  }

  @Get('directory')
  listDirectory() {
    return this.membershipService.listDirectory();
  }

  @UseGuards(JwtAuthGuard)
  @Post('applications')
  createApplication(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateApplicationDto,
  ) {
    return this.membershipService.createApplication(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('applications/mine')
  listMyApplications(@CurrentUser() user: { id: string }) {
    return this.membershipService.listMyApplications(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Get('applications')
  listApplicationsForAdmin() {
    return this.membershipService.listApplicationsForAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Patch('applications/:id/review')
  reviewApplication(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: ReviewApplicationDto,
  ) {
    return this.membershipService.reviewApplication(id, user.id, dto);
  }
}
