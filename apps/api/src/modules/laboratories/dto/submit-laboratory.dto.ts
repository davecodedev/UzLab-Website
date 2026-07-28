import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AccreditationStatus, ConformityBodyType, LaboratoryField } from '@prisma/client';

/**
 * A laboratory submitted by a member because it appears in neither national
 * register.
 *
 * The field list deliberately mirrors what the registry filters read, so a
 * self-submitted entry is findable exactly like a scraped one — filtering by
 * region, body type, status, tax ID, standard or sector must not silently skip
 * member entries. Anything omitted here becomes a hole in the registry.
 *
 * Unlike a claim on an existing register record, the member owns all of this
 * data: it is their own laboratory and there is no register to contradict.
 * `source` marks it as self-declared so the distinction stays visible.
 */
export class SubmitLaboratoryDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  name!: string;

  // --- Classification (drives the body-type and labs-only filters) ---------

  @IsEnum(ConformityBodyType)
  bodyType!: ConformityBodyType;

  @IsOptional()
  @IsArray()
  @IsEnum(LaboratoryField, { each: true })
  fields?: LaboratoryField[];

  // --- Accreditation (drives the status, number and standard filters) ------

  @IsEnum(AccreditationStatus)
  accreditationStatus!: AccreditationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  accreditationNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  accreditationBody?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  standard?: string;

  @IsOptional()
  @IsDateString()
  accreditationDate?: string;

  @IsOptional()
  @IsDateString()
  accreditedUntil?: string;

  // --- Organisation (drives region, tax-ID and stakeholder filters) --------

  @IsOptional()
  @IsString()
  @MaxLength(200)
  region?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  legalEntityName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  legalEntityAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  supervisorName?: string;

  // --- Contact -------------------------------------------------------------

  @IsOptional()
  @IsString()
  @MaxLength(100)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  website?: string;

  // --- Scope (drives the sector filter) ------------------------------------

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(30)
  @MaxLength(200, { each: true })
  directions?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isUzLabMember?: boolean;
}

export class ReviewSubmissionDto {
  @IsBoolean()
  approve!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNote?: string;
}
