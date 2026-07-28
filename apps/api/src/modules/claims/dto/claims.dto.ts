import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ClaimStatus } from '@prisma/client';

export class CreateClaimDto {
  @IsString()
  laboratoryId!: string;

  /** How the claimant can be verified — role, work email, phone. */
  @IsString()
  @MinLength(20, { message: 'Please describe how your connection to the laboratory can be verified.' })
  @MaxLength(2000)
  evidence!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  contactName!: string;

  @IsEmail()
  contactEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactPhone?: string;
}

export class ReviewClaimDto {
  @IsEnum(ClaimStatus)
  status!: ClaimStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNote?: string;
}

/**
 * Member-editable fields only. Note what is absent: name, registry number,
 * accreditation status, validity dates and certificates. Those are the
 * accreditation body's determinations, not a laboratory's to restate — and
 * they would be overwritten by the next import regardless.
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  publicPhone?: string;

  @IsOptional()
  @IsEmail()
  publicEmail?: string;

  @IsOptional()
  @IsUrl({ require_protocol: false })
  @MaxLength(300)
  publicWebsite?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactPerson?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  servicesText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  workingHours?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  specialisations?: string[];

  @IsOptional()
  @IsUrl({ require_protocol: false })
  @MaxLength(500)
  logoUrl?: string;
}
