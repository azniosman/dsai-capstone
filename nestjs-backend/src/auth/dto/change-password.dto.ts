import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Data Transfer Object for updating a user's password.
 */
export class ChangePasswordDto {
  /** The user's current password for verification */
  @IsString()
  @IsNotEmpty()
  current_password!: string;

  /** The new password to set */
  @IsString()
  @IsNotEmpty()
  new_password!: string;
}
