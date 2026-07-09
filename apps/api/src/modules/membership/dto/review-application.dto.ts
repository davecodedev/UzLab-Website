import { IsIn } from 'class-validator';

export class ReviewApplicationDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';
}
