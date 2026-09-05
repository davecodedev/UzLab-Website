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
import { MembershipService } from './membership.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { CreateMembershipTypeDto } from './dto/create-membership-type.dto.js';
import { UpdateMembershipTypeDto } from './dto/update-membership-type.dto.js';
import { ReviewApplicationDto } from './dto/review-application.dto.js';
import {
  RemoveMemberDto,
  UpdateMemberStatusDto,
} from './dto/member-status.dto.js';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-request.js';
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

  /**
   * What the caller may do, for the browser to draw with. Answers for
   * anonymous callers too, which is why the guard is the optional one.
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Get('access')
  access(@CurrentUser() user?: AuthenticatedUser) {
    return this.membershipService.access(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Get('members')
  listMembers() {
    return this.membershipService.listMembers();
  }

  /** Approve a paid membership, or freeze / unfreeze an existing one. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Patch('members/:id/status')
  setMemberStatus(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateMemberStatusDto,
  ) {
    return this.membershipService.setMemberStatus(
      id,
      user.id,
      dto.action,
      dto.note,
    );
  }

  /** A replacement key. Invalidates the old one and ends the member's session. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Post('members/:id/access-key')
  reissueAccessKey(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.membershipService.reissueAccessKey(id, user.id);
  }

  /**
   * Remove a member. Admins only — freezing is reversible and staff may do it,
   * removal is not and they may not.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('members/:id')
  removeMember(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: RemoveMemberDto,
  ) {
    return this.membershipService.removeMember(id, user.id, dto.note);
  }
}
