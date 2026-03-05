import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }
    const isPasswordValid = await bcrypt.compare(pass, user.hashedPassword);
    if (user && isPasswordValid) {
      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { hashedPassword: _, ...result } = user as any;
      return result;
    }
    return null;
  }

  login(user: any) {
    const payload = {
      username: user.email,
      sub: user.id.toString(),
    };
    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }), // Simplified for now
      token_type: 'bearer',
    };
  }

  /**
   * Logout is intentionally a no-op: this app uses stateless JWTs with no
   * server-side token store. The client clears its token.
   *
   * TODO: for production hardening, implement a token blocklist (e.g. Redis SET
   * with TTL = token remaining lifetime) so revoked JWTs are rejected before
   * they expire. See: https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html#token-explicit-revocation-by-the-user
   */
  logout(): void {
    // no-op — stateless JWT; client is responsible for clearing its token
  }

  async hashPassword(password: string): Promise<string> {
    const saltOrRounds = 10;
    return bcrypt.hash(password, saltOrRounds);
  }
}
