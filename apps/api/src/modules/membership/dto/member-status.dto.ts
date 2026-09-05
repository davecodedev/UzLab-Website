import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * The three transitions an administrator can make on a membership.
 *
 * `delete` is not here: removing a member is a different verb with a different
 * consequence and gets its own endpoint, so it cannot be reached by an
 * unexpected value arriving in this field.
 */
export class UpdateMemberStatusDto {
  @IsIn(['approve', 'freeze', 'unfreeze'])
  action!: 'approve' | 'freeze' | 'unfreeze';

  /** Why — shown in the members list so the next administrator can see it. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class RemoveMemberDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
