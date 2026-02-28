import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { SkillProgress } from '@app/entities/skill-progress.entity';
import { UserProfile } from '@app/entities/user-profile.entity';
import { CreateProgressDto, UpdateProgressLevelDto } from './dto/progress.dto';

@Injectable()
export class SkillsService {
  constructor(
    @InjectRepository(SkillProgress)
    private readonly progressRepository: EntityRepository<SkillProgress>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: EntityRepository<UserProfile>,
  ) {}

  async recordProgress(
    payload: CreateProgressDto,
    tenantId: number,
    userId: number,
  ): Promise<SkillProgress> {
    const pid = payload.profileId || payload.profile_id;
    const profile = await this.profileRepository.findOne({
      id: pid,
      tenant: tenantId,
      user: userId,
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const entry = this.progressRepository.create({
      profile,
      skill: payload.skill,
      level: payload.level,
      tenant: tenantId,
    });

    const currentSkills = [...(profile.skills || [])];
    if (payload.level >= 0.5 && !currentSkills.includes(payload.skill)) {
      currentSkills.push(payload.skill);
      profile.skills = currentSkills;
    }

    await this.progressRepository.getEntityManager().persistAndFlush(entry);
    return entry;
  }

  async getProgress(profileId: number, tenantId: number, userId: number) {
    const profile = await this.profileRepository.findOne({
      id: profileId,
      tenant: tenantId,
      user: userId,
    });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const entries = await this.progressRepository.find(
      { profile, tenant: tenantId },
      { orderBy: { recordedAt: 'DESC' } },
    );

    const latest = new Map<string, SkillProgress>();
    for (const e of entries) {
      if (!latest.has(e.skill)) {
        latest.set(e.skill, e);
      }
    }

    let acquired = 0;
    let inProgress = 0;
    for (const val of latest.values()) {
      if (val.level >= 1.0) acquired++;
      else if (val.level > 0.0) inProgress++;
    }

    return {
      profileId,
      entries,
      skillsAcquired: acquired,
      skillsInProgress: inProgress,
      skillsTotal: latest.size,
    };
  }

  async updateProgress(
    entryId: number,
    payload: UpdateProgressLevelDto,
    tenantId: number,
    userId: number,
  ): Promise<SkillProgress> {
    const entry = await this.progressRepository.findOne(
      {
        id: entryId,
        tenant: tenantId,
      },
      { populate: ['profile'] },
    );

    if (!entry) {
      throw new NotFoundException('Progress entry not found');
    }

    if (entry.profile.user?.id !== userId) {
      throw new UnauthorizedException('Not authorized');
    }

    entry.level = payload.level;

    const currentSkills = [...(entry.profile.skills || [])];

    if (payload.level >= 0.5 && !currentSkills.includes(entry.skill)) {
      currentSkills.push(entry.skill);
      entry.profile.skills = currentSkills;
    } else if (payload.level < 0.5 && currentSkills.includes(entry.skill)) {
      // Check if another high level entry exists
      const otherHigh = await this.progressRepository.findOne({
        profile: entry.profile,
        skill: entry.skill,
        id: { $ne: entryId },
        level: { $gte: 0.5 },
        tenant: tenantId,
      });
      if (!otherHigh) {
        entry.profile.skills = currentSkills.filter((s) => s !== entry.skill);
      }
    }

    await this.progressRepository.getEntityManager().flush();
    return entry;
  }

  async deleteProgress(
    entryId: number,
    tenantId: number,
    userId: number,
  ): Promise<void> {
    const entry = await this.progressRepository.findOne(
      {
        id: entryId,
        tenant: tenantId,
      },
      { populate: ['profile'] },
    );

    if (!entry) {
      throw new NotFoundException('Progress entry not found');
    }

    if (entry.profile.user?.id !== userId) {
      throw new UnauthorizedException('Not authorized');
    }

    await this.progressRepository.getEntityManager().removeAndFlush(entry);
  }
  async getProgressTimeline(
    profileId: number,
    tenantId: number,
    userId: number,
  ) {
    const profile = await this.profileRepository.findOne({
      id: profileId,
      tenant: tenantId,
      user: userId,
    });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const entries = await this.progressRepository.find(
      { profile, tenant: tenantId },
      { orderBy: { recordedAt: 'ASC' } },
    );

    const timeline = entries.map((e) => ({
      date: e.recordedAt.toISOString().split('T')[0],
      skill: e.skill,
      level: e.level,
    }));

    return { timeline };
  }

  async getPeerComparison(profileId: number, tenantId: number) {
    const profile = await this.profileRepository.findOne({
      id: profileId,
      tenant: tenantId,
    });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const others = await this.profileRepository.find({
      tenant: tenantId,
      id: { $ne: profileId },
    });

    const userSkillsCount = profile.skills?.length || 0;
    const avgSkillsCount =
      others.length > 0
        ? others.reduce((acc, p) => acc + (p.skills?.length || 0), 0) /
          others.length
        : userSkillsCount;

    // Real percentile: percentage of peers with fewer skills than the user
    const percentile =
      others.length > 0
        ? parseFloat(
            (
              (others.filter((p) => (p.skills?.length ?? 0) < userSkillsCount)
                .length /
                others.length) *
              100
            ).toFixed(1),
          )
        : 50;

    // Top skills: collect all skills from all other profiles → tally → return top 3
    const skillFreq = new Map<string, number>();
    for (const p of others) {
      for (const skill of p.skills ?? []) {
        skillFreq.set(skill, (skillFreq.get(skill) ?? 0) + 1);
      }
    }
    const topSkills = Array.from(skillFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([s]) => s);

    return {
      user_skills_count: userSkillsCount,
      avg_skills_count: parseFloat(avgSkillsCount.toFixed(1)),
      percentile,
      top_skills:
        topSkills.length > 0 ? topSkills : ['Python', 'SQL', 'Communication'],
    };
  }
}
