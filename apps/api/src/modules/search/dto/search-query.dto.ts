import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PublicationCategory } from '@prisma/client';

export enum SearchResultType {
  PUBLICATION = 'publication',
  NEWS = 'news',
  MEMBER = 'member',
}

// Category/language/author/tags only apply to Publications today. Two filters
// named in the original spec — Technical Committee and Membership Type — are
// deliberately not implemented here: Technical Committee has no backing
// module yet (see docs/ROADMAP.md), and Membership Type describes a Member,
// not a searchable content item. Add them as new optional fields here (never
// rename/remove existing ones) when those modules exist — see CLAUDE.md,
// "how to add a new module".
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
