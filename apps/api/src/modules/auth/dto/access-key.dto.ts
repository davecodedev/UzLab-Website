import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class AccessKeyLoginDto {
  /**
   * Accepts the key as it is read out or pasted — the service upper-cases and
   * trims before hashing, so a lower-case paste still works. The pattern is
   * deliberately loose on separators and strict on length, because the common
   * mistake is a stray space, not a wrong shape.
   */
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9\- ]+$/, {
    message: 'An access key contains only letters, digits and dashes.',
  })
  accessKey!: string;
}
