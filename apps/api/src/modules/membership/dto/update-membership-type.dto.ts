import { PartialType } from '@nestjs/mapped-types';
import { CreateMembershipTypeDto } from './create-membership-type.dto.js';

export class UpdateMembershipTypeDto extends PartialType(
  CreateMembershipTypeDto,
) {}
