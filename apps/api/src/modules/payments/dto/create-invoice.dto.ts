import { IsEnum, IsUUID } from 'class-validator';
import { PaymentGateway } from '@prisma/client';

export class CreateInvoiceDto {
  @IsUUID()
  membershipTypeId!: string;

  @IsEnum(PaymentGateway)
  gateway!: PaymentGateway;
}
