import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard'; // I need to create this!

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('admin/test')
  smokeTest() {
    return { status: 'Profile Controller OK' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyProfile(@Request() req: any) {
    return this.profileService.getMyProfile(req.user.id, req.user.tenant.id);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post()
  createProfile(
    @Request() req: any,
    @Body() createProfileDto: CreateProfileDto,
  ) {
    const userId = req.user ? req.user.id : null;
    const tenantId = req.user ? req.user.tenant.id : 1; // Default global tenant ID is 1
    return this.profileService.createProfile(
      userId,
      tenantId,
      createProfileDto,
    );
  }

  @Post('parse-resume')
  parseResume(@Body() payload: { resume_text?: string }) {
    if (!payload.resume_text) {
      throw new BadRequestException('Resume text is required');
    }
    return this.profileService.parseResume(payload.resume_text);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getProfile(@Request() req: any, @Param('id') id: string) {
    return this.profileService.getProfileById(
      +id,
      req.user.id,
      req.user.tenant.id,
    );
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Patch(':id')
  updateProfile(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    if (!req.user) {
      throw new UnauthorizedException(
        'Authentication required to update profile',
      );
    }
    return this.profileService.updateProfile(
      +id,
      req.user.id,
      req.user.tenant.id,
      updateProfileDto,
    );
  }
}
