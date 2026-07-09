import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { ContactSubmissionType } from '@prisma/client';

export class CreateContactSubmissionDto {
  @IsEnum(ContactSubmissionType)
  type!: ContactSubmissionType;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(5)
  message!: string;
}
