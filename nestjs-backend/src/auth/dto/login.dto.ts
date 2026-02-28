import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  username!: string; // Used username instead of email to map OAuth2PasswordRequestForm style natively

  @IsString()
  @MinLength(8)
  password!: string;
}
