import { IsString, IsNotEmpty, Matches } from 'class-validator';

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
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/, {
    message:
      'Password must contain uppercase, lowercase, digit, and special character',
  })
  new_password!: string;
}
