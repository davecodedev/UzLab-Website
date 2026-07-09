import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateApplicationDto {
  @IsUUID()
  membershipTypeId!: string;

  @IsString()
  @MinLength(5)
  phone!: string;

  @IsOptional()
  @IsString()
  organization?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
