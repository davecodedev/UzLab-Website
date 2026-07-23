import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PublicationCategory, LaboratoryField } from '@prisma/client';

export enum SearchResultType {
  PUBLICATION = 'publication',
  NEWS = 'news',
  MEMBER = 'member',
  LABORATORY = 'laboratory',
}

// Category/language/author/tags only apply to Publications; region/labField
// only apply to Laboratories. One filter named in the original spec —
// Membership Type — is deliberately not implemented here: it describes a
// Member, not a searchable content item. Add new optional fields here (never
// rename/remove existing ones) when new modules need their own facets — see
// CLAUDE.md, "how to add a new module".
export class SearchQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(SearchResultType)
  type?: SearchResultType;

  @IsOptional()
  @IsEnum(PublicationCategory)
  category?: PublicationCategory;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsEnum(LaboratoryField)
  labField?: LaboratoryField;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : value,
  )
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;
}
