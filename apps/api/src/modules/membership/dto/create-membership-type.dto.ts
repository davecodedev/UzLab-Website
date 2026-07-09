import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateMembershipTypeDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsString()
  description!: string;

  @IsInt()
  @Min(0)
  priceCents!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsInt()
  @Min(1)
  durationDays!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
