import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { MembershipService } from './membership.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('membership')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get('types')
  listTypes() {
    return this.membershipService.listTypes();
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
}
