import {
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

export class CreateNewsArticleDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsString()
  summary!: string;

  @IsString()
  bodyText!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  coverImageUrl?: string;

  @IsOptional()
  @IsISO8601()
  publishedAt?: string;
}
