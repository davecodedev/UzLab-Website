import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ClaimStatus, UserRole } from '@prisma/client';
import { ClaimsService } from './claims.service.js';
import { CreateClaimDto, ReviewClaimDto, UpdateProfileDto } from './dto/claims.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('claims')
export class ClaimsController {
  constructor(private readonly claims: ClaimsService) {}

  // --- Member --------------------------------------------------------------

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateClaimDto) {
    return this.claims.createClaim(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  mine(@CurrentUser() user: { id: string }) {
    return this.claims.listMyClaims(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile/:laboratoryId')
  getProfile(@CurrentUser() user: { id: string }, @Param('laboratoryId') laboratoryId: string) {
    return this.claims.getProfileForEditing(user.id, laboratoryId);
  }

  // Ownership is enforced in the service, which requires an APPROVED claim on
  // this exact laboratory — a logged-in user alone is not sufficient.
  @UseGuards(JwtAuthGuard)
  @Patch('profile/:laboratoryId')
  updateProfile(
    @CurrentUser() user: { id: string },
    @Param('laboratoryId') laboratoryId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.claims.updateProfile(user.id, laboratoryId, dto);
  }

  // --- Staff ---------------------------------------------------------------

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Get()
  list(@Query('status') status?: ClaimStatus) {
    return this.claims.listClaims(status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Patch(':id/review')
  review(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: ReviewClaimDto,
  ) {
    return this.claims.reviewClaim(user.id, id, dto);
  }
}
