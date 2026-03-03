import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Data Transfer Object for requesting a new JWT access token.
 */
export class RefreshTokenDto {
  /** The refresh token issued during login */
  @IsString()
  @IsNotEmpty()
  refresh_token!: string;
}
