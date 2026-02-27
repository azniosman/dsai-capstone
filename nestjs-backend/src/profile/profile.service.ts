import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { UserProfile } from '@app/entities/user-profile.entity';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ResumeParser } from '../common/utils/resume-parser.util';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepository: EntityRepository<UserProfile>,
  ) {}

  async getMyProfile(userId: number, tenantId: number): Promise<UserProfile> {
    const profile = await this.profileRepository.findOne({
      user: userId,
      tenant: tenantId,
    });
    if (!profile) {
      throw new NotFoundException('No profile linked to this account');
    }
    return profile;
  }

  async createProfile(
    userId: number | null,
    tenantId: number,
    payload: CreateProfileDto,
  ): Promise<UserProfile> {
    // Map snake_case to camelCase for the entity
    const normalizedPayload = {
      ...payload,
      yearsExperience: payload.years_experience ?? payload.yearsExperience ?? 0,
      isCareerSwitcher: payload.is_career_switcher ?? payload.isCareerSwitcher ?? false,
    };

    // Remove the snake_case keys after mapping
    delete (normalizedPayload as any).years_experience;
    delete (normalizedPayload as any).is_career_switcher;

    // If authenticated user already has a profile, update it instead of creating a duplicate
    if (userId) {
      const existing = await this.profileRepository.findOne({
        user: userId,
        tenant: tenantId,
      });

      if (existing) {
        Object.assign(existing, normalizedPayload);
        await this.profileRepository.getEntityManager().flush();
        return existing;
      }
    }

    const profile = this.profileRepository.create({
      ...normalizedPayload,
      user: userId,
      tenant: tenantId,
    });

    await this.profileRepository.getEntityManager().persistAndFlush(profile);
    return profile;
  }

  async getProfileById(
    profileId: number,
    userId: number,
    tenantId: number,
  ): Promise<UserProfile> {
    const profile = await this.profileRepository.findOne({
      id: profileId,
      user: userId,
      tenant: tenantId,
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    return profile;
  }

  async updateProfile(
    profileId: number,
    userId: number,
    tenantId: number,
    payload: UpdateProfileDto,
  ): Promise<UserProfile> {
    const profile = await this.getProfileById(profileId, userId, tenantId);

    // Normalise snake_case aliases → camelCase entity fields
    const normalized: Record<string, unknown> = { ...payload };
    if (payload.years_experience !== undefined) {
      normalized.yearsExperience = payload.years_experience;
    }
    if (payload.is_career_switcher !== undefined) {
      normalized.isCareerSwitcher = payload.is_career_switcher;
    }
    if (payload.resume_text !== undefined) {
      normalized.resumeText = payload.resume_text;
    }
    delete normalized.years_experience;
    delete normalized.is_career_switcher;
    delete normalized.resume_text;

    Object.assign(profile, normalized);
    await this.profileRepository.getEntityManager().flush();

    return profile;
  }

  parseResume(resumeText: string): any {
    const skills = ResumeParser.extractSkills(resumeText);
    return { skills };
  }
}
