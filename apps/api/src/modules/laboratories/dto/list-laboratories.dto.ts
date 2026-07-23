import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LaboratoryField, AccreditationStatus } from '@prisma/client';

export class ListLaboratoriesDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(LaboratoryField)
  field?: LaboratoryField;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsEnum(AccreditationStatus)
  status?: AccreditationStatus;
}
