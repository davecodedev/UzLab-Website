import { IsEnum } from 'class-validator';
import { ContactSubmissionStatus } from '@prisma/client';

export class UpdateContactSubmissionStatusDto {
  @IsEnum(ContactSubmissionStatus)
  status!: ContactSubmissionStatus;
}
