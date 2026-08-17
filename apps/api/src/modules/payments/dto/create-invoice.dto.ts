import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { PaymentGateway } from '@prisma/client';

export class CreateInvoiceDto {
  @IsUUID()
  membershipTypeId!: string;

  @IsEnum(PaymentGateway)
  gateway!: PaymentGateway;

  /**
   * Who the invoice is made out to. A laboratory's accounts department needs
   * its own legal name and tax id on the document, which are not necessarily
   * the account holder's.
   */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  payerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  payerTaxId?: string;
}

export class ConfirmPaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
