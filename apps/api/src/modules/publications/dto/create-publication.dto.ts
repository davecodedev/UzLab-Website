import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';
import { PublicationCategory } from '@prisma/client';

export class CreatePublicationDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsEnum(PublicationCategory)
  category!: PublicationCategory;

  @IsString()
  summary!: string;

  @IsString()
  bodyText!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  fileUrl?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsISO8601()
  publishedAt?: string;
}
