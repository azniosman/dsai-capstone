import { Controller, Post, Body, UseGuards, Request, Get, HttpCode, HttpStatus, Patch, Delete, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  @Get('admin/test')
  smokeTest() {
    return { status: 'Auth Controller OK' };
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<any> {
    const hashedPassword = await this.authService.hashPassword(registerDto.password);
    const user = await this.usersService.createUser({
      email: registerDto.email,
      hashedPassword,
      name: registerDto.name,
      tenantName: registerDto.tenantName,
      role: registerDto.role,
    });
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hashedPassword: _, ...result } = user;
    return result;
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Request() req: any) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(@Request() req: any, @Body() body: { name?: string; email?: string }) {
    const user = await this.usersService.updateUser(req.user.id, body);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hashedPassword: _, ...result } = user as any;
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req: any,
    @Body() body: { current_password: string; new_password: string },
  ) {
    await this.usersService.changePassword(req.user.id, body.current_password, body.new_password);
    return { message: 'Password changed successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  @HttpCode(HttpStatus.OK)
  async deleteMe(@Request() req: any) {
    await this.usersService.deactivateUser(req.user.id);
    return { message: 'Account deactivated' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() body: any) {
    // In a full implementation, we would blacklist the refresh token
    return { message: 'Logged out successfully' };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: { refresh_token: string }) {
    const token = body?.refresh_token;
    if (!token) {
      throw new UnauthorizedException('refresh_token is required');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET') ?? 'default_secret',
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const userId = parseInt(payload.sub, 10);
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or deactivated');
    }

    return this.authService.login(user);
  }
}
