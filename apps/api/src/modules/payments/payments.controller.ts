import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PaymentsService } from './payments.service.js';
import { PaymeService } from './payme.service.js';
import { PaymeError, PaymeErrorCode } from './payme.errors.js';
import { ClickService, type ClickCallback } from './click.service.js';
import { ConfirmPaymentDto, CreateInvoiceDto } from './dto/create-invoice.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly payme: PaymeService,
    private readonly click: ClickService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('invoice')
  createInvoice(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.payments.createInvoice(
      user.id,
      dto.membershipTypeId,
      dto.gateway,
      { payerName: dto.payerName, payerTaxId: dto.payerTaxId },
    );
  }

  /** The association's account details, for the bank-transfer instructions. */
  @Get('bank-details')
  bankDetails() {
    return this.payments.bankDetails();
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  listMine(@CurrentUser() user: { id: string }) {
    return this.payments.listMine(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Get()
  listAll(@Query('limit') limit?: string) {
    return this.payments.listAll(limit ? Number(limit) : undefined);
  }

  /**
   * Staff confirming a bank transfer landed. This grants membership, so it is
   * staff-only and the person who confirmed it is recorded on the row.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Post(':id/confirm')
  confirm(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.payments.confirmBankTransfer(id, user.id, dto.note);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Post(':id/cancel')
  cancel(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.payments.cancelBankTransfer(id, user.id, dto.note);
  }

  /**
   * Payme's merchant endpoint.
   *
   * Always answers 200 with a JSON-RPC body — Payme reads the `error` member,
   * and treats any non-200 as the endpoint being down rather than as a refusal.
   * That is why the errors are caught here instead of being left to Nest's
   * exception filter.
   */
  @HttpCode(200)
  @SkipThrottle()
  @Post('payme')
  async paymeCallback(
    @Headers('authorization') auth: string | undefined,
    @Body()
    body: { method?: string; params?: Record<string, never>; id?: number },
  ) {
    const id = body?.id ?? 0;
    try {
      this.payme.checkAuth(auth);
      const result = await this.payme.handle(
        body?.method ?? '',
        body?.params ?? {},
      );
      return { jsonrpc: '2.0', id, result };
    } catch (err) {
      const error =
        err instanceof PaymeError
          ? err
          : new PaymeError(PaymeErrorCode.INVALID_REQUEST);
      return { jsonrpc: '2.0', id, error: error.toJson() };
    }
  }

  // Click posts form-encoded bodies to two separate paths.
  @HttpCode(200)
  @SkipThrottle()
  @Post('click/prepare')
  clickPrepare(@Body() body: ClickCallback) {
    return this.click.prepare(body);
  }

  @HttpCode(200)
  @SkipThrottle()
  @Post('click/complete')
  clickComplete(@Body() body: ClickCallback) {
    return this.click.complete(body);
  }
}
