import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { StandardRegister, StandardStatus } from '@prisma/client';

/**
 * Unlike the laboratory registry — which ships every row to the browser and
 * filters there — the catalogue is far too large for that, so all filtering,
 * sorting and paging happens here.
 */
export class ListStandardsDto {
  /** Free text over designation, title, abstract and classification. */
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(StandardRegister)
  register?: StandardRegister;

  @IsOptional()
  @IsEnum(StandardStatus)
  status?: StandardStatus;

  /** Two-digit ICS class, e.g. "75". */
  @IsOptional()
  @IsString()
  ics?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1920)
  @Max(2100)
  yearFrom?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1920)
  @Max(2100)
  yearTo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  /** "relevance" is only meaningful with `q`; the service falls back without it. */
  @IsOptional()
  @IsEnum(['newest', 'oldest', 'designation'] as const)
  sort?: 'newest' | 'oldest' | 'designation';
}
