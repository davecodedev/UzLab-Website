import { IsArray, IsBoolean, IsEmail, IsEnum, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';
import { LaboratoryField, AccreditationStatus } from '@prisma/client';

export class CreateLaboratoryDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(LaboratoryField, { each: true })
  fields?: LaboratoryField[];

  @IsOptional()
  @IsString()
  accreditationNumber?: string;

  @IsOptional()
  @IsString()
  accreditationBody?: string;

  @IsOptional()
  @IsEnum(AccreditationStatus)
  accreditationStatus?: AccreditationStatus;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  website?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
