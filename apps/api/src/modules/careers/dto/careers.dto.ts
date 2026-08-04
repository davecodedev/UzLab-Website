import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ApplicationStatus,
  CandidateVisibility,
  EmploymentType,
  LaboratoryField,
  VacancyStatus,
} from '@prisma/client';

export class CreateVacancyDto {
  @IsString()
  @MinLength(4)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  organisationName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  /** Free text: "from 8 million", "by agreement", or left out entirely. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  salary?: string;

  @IsString()
  @MinLength(40, {
    message: 'Please describe the role in at least a couple of sentences.',
  })
  @MaxLength(8000)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  requirements?: string;

  @IsEmail()
  contactEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactPhone?: string;

  @IsOptional()
  @IsBoolean()
  urgent?: boolean;

  /** Optional link to the poster's own laboratory, when they have a claim on one. */
  @IsOptional()
  @IsString()
  laboratoryId?: string;

  /**
   * Days until the posting stops appearing. Bounded so a forgotten vacancy
   * cannot sit open indefinitely, which is what makes a job board stale.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  @Max(180)
  openForDays?: number;
}

export class UpdateVacancyDto {
  @IsOptional()
  @IsEnum(VacancyStatus)
  status?: VacancyStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  salary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  requirements?: string;

  @IsOptional()
  @IsBoolean()
  urgent?: boolean;
}

export class ApplyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsString()
  @MinLength(20, { message: 'Please tell the employer something about yourself.' })
  @MaxLength(5000)
  message!: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  cvUrl?: string;
}

export class ReviewApplicationDto {
  @IsEnum(ApplicationStatus)
  status!: ApplicationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  employerNote?: string;
}

export class ListVacanciesDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

export class UpsertCandidateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  fullName!: string;

  /** The one line an employer scans in a list. */
  @IsString()
  @MinLength(4)
  @MaxLength(200)
  headline!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(LaboratoryField, { each: true })
  @ArrayMaxSize(9)
  fields?: LaboratoryField[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  yearsExperience?: number;

  @IsString()
  @MinLength(40, { message: 'Please describe your experience in a couple of sentences.' })
  @MaxLength(5000)
  summary!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(30)
  skills?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  education?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  certifications?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  cvUrl?: string;

  @IsEmail()
  contactEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactPhone?: string;

  @IsOptional()
  @IsEnum(CandidateVisibility)
  visibility?: CandidateVisibility;

  @IsOptional()
  @IsBoolean()
  openToWork?: boolean;
}

export class ListCandidatesDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @IsOptional()
  @IsEnum(LaboratoryField)
  field?: LaboratoryField;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}
