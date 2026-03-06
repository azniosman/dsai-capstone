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
import { ParseResumeDto } from './dto/parse-resume.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import {
  AuthenticatedRequest,
  OptionalAuthenticatedRequest,
} from '../types/auth-request.interface';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * Fetch the complete connected profile of the locally authenticated user.
   * Resolves utilizing the ID tied to the active JWT.
   *
   * @param req The authenticated execution constraint.
   * @returns Full populated hierarchical profile object structure.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyProfile(@Request() req: AuthenticatedRequest) {
    return this.profileService.getMyProfile(req.user.id, req.user.tenant.id);
  }

  /**
   * Creates or resolves a profile. Can attach explicitly to a globally
   * identified logged-in user, or run generically as an anonymous builder.
   *
   * @param req The optional user context containing identity metadata.
   * @param createProfileDto Request DTO specifying the contents to embed.
   * @returns The newly executed user profile entity model.
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Post()
  createProfile(
    @Request() req: OptionalAuthenticatedRequest,
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

  /**
   * Uses internal intelligence (LLM logic) to parse raw stringified resume
   * texts into structured semantic domain knowledge.
   *
   * @param payload Request body containing `resume_text`.
   * @returns Syntactically structured candidate metadata blocks array.
   */
  @Post('parse-resume')
  parseResume(@Body() payload: ParseResumeDto) {
    if (!payload.resume_text) {
      throw new BadRequestException('Resume text is required');
    }
    return this.profileService.parseResume(payload.resume_text);
  }

  /**
   * Retrieve an explicitly defined profile by strict identity metadata parameters.
   * Protects query constraints utilizing Tenant authorization logic.
   *
   * @param req Valid authenticated user identity bounds.
   * @param id Profile relational integer reference target string.
   * @returns Authorized fully-populated profile data payload.
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getProfile(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.profileService.getProfileById(
      +id,
      req.user.id,
      req.user.tenant.id,
    );
  }

  /**
   * Explicitly patch fields of a known managed profile.
   *
   * @param req Secured optional verification parameter set checking permissions.
   * @param id Identifiable parameter constraint for targeting patches.
   * @param updateProfileDto Granular property modifications allowed schema definitions.
   * @returns Overwritten object delta schema post-DB update transaction.
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Patch(':id')
  updateProfile(
    @Request() req: OptionalAuthenticatedRequest,
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
