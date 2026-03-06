import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Delete,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedRequest } from '../types/auth-request.interface';

@Throttle({ default: { ttl: 60_000, limit: 10 } })
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Register a new user and assign a tenant and role.
   * Internally hashes the provided password.
   *
   * @param registerDto Contains registration payload (email, pw, etc.)
   * @returns User payload with stripped secrets.
   */
  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<any> {
    if (registerDto.password !== registerDto.passwordConfirm) {
      throw new BadRequestException('Passwords do not match');
    }

    const hashedPassword = await this.authService.hashPassword(
      registerDto.password,
    );
    const user = await this.usersService.createUser({
      email: registerDto.email,
      hashedPassword,
      name: registerDto.name,
      tenantName: registerDto.tenantName,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hashedPassword: _, ...result } = user;
    return result;
  }

  /**
   * Login using a local strategy utilizing passport strategies.
   * Emits a JWT upon successful cred checking.
   *
   * @param req The authenticated request bearing the resolved user.
   * @returns A signed JWT token for session maintenance.
   */
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Request() req: AuthenticatedRequest) {
    return this.authService.login(req.user);
  }

  /**
   * Fetch the active and authenticated user metadata.
   *
   * @param req Request injected with JWT auth strategy resolved User context.
   * @returns Current user entity representation sans passwords.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req: AuthenticatedRequest) {
    return req.user;
  }

  /**
   * Allow users to mutate self-managed metadata (e.g., Name, Email).
   *
   * @param req Resolves identity executing the mutation.
   * @param body Payload comprising `name` or `email` deltas.
   * @returns Validated user entity.
   */
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(
    @Request() req: AuthenticatedRequest,
    @Body() body: UpdateMeDto,
  ) {
    const user = await this.usersService.updateUser(req.user.id, body);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hashedPassword: _, ...result } = user as any;
    return result;
  }

  /**
   * Safely rotate or change a user's password utilizing current verification.
   *
   * @param req Verified authenticated request triggering mutation.
   * @param body Payload defining the old vs new password structures.
   * @returns Success message structure.
   */
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req: AuthenticatedRequest,
    @Body() body: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(
      req.user.id,
      body.current_password,
      body.new_password,
    );
    return { message: 'Password changed successfully' };
  }

  /**
   * Suspends and deactivates the user identity requesting the action.
   *
   * @param req Requisition initiating self-destruction.
   * @returns Verification of deactivation message.
   */
  @UseGuards(JwtAuthGuard)
  @Delete('me')
  @HttpCode(HttpStatus.OK)
  async deleteMe(@Request() req: AuthenticatedRequest) {
    await this.usersService.deactivateUser(req.user.id);
    return { message: 'Account deactivated' };
  }

  /**
   * Ends an active identity session implicitly handling cache or invalidation.
   * Currently mocked to always succeed on request.
   *
   * @returns Safe disconnect statement.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout() {
    // In a full implementation, we would blacklist the refresh token
    return { message: 'Logged out successfully' };
  }

  /**
   * Takes a refresh JWT token and exchanges it for an entirely new active signed JWT.
   * Verifies with REFRESH_TOKEN_SECRET and asserts token type is 'refresh'.
   *
   * @param body Requires a raw `refresh_token` string body.
   * @returns New functional JWT payload dictionary.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: RefreshTokenDto) {
    const token = body?.refresh_token;
    if (!token) {
      throw new UnauthorizedException('refresh_token is required');
    }

    let payload: Record<string, string>;
    try {
      const secret = this.configService.get<string>('REFRESH_TOKEN_SECRET');
      if (!secret)
        throw new Error('REFRESH_TOKEN_SECRET environment variable is required');
      payload = this.jwtService.verify(token, { secret });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const userId = parseInt(payload.sub, 10);
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or deactivated');
    }

    return this.authService.login(user);
  }
}
