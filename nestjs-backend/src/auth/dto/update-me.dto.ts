import { IsString, IsOptional, IsEmail } from 'class-validator';

/**
 * Data Transfer Object for updating user profile fields.
 */
export class UpdateMeDto {
  /** Optional user full name */
  @IsOptional()
  @IsString()
  name?: string;

  /** Optional user email address */
  @IsOptional()
  @IsEmail()
  email?: string;
}
