import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/postgresql';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private em: EntityManager,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is temporarily locked');
    }

    const isPasswordValid = await bcrypt.compare(pass, user.hashedPassword);
    if (isPasswordValid) {
      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }
      // Reset lockout on successful login
      user.failedLoginAttempts = 0;
      user.lockedUntil = undefined;
      await this.em.flush();

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { hashedPassword: _, ...result } = user as any;
      return result;
    }

    // Increment failed attempts on bad password
    user.failedLoginAttempts = (user.failedLoginAttempts ?? 0) + 1;
    if (user.failedLoginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 15 * 60_000);
    }
    await this.em.flush();
    return null;
  }

  login(user: any) {
    const payload = {
      username: user.email,
      sub: user.id.toString(),
      typ: 'access',
    };
    const refreshSecret = this.configService.get<string>('REFRESH_TOKEN_SECRET');
    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(
        { ...payload, typ: 'refresh' },
        { secret: refreshSecret, expiresIn: '7d' },
      ),
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
