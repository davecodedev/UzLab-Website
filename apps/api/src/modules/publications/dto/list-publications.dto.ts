import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PublicationCategory } from '@prisma/client';

export class ListPublicationsDto {
  @IsOptional()
  @IsEnum(PublicationCategory)
  category?: PublicationCategory;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  language?: string;
}
