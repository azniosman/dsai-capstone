import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { JobRole } from '@app/entities/job-role.entity';
import { UserProfile } from '@app/entities/user-profile.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(JobRole)
    private readonly rolesRepository: EntityRepository<JobRole>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: EntityRepository<UserProfile>,
  ) {}

  async findAll(tenantId: number): Promise<JobRole[]> {
    return this.rolesRepository.find({ tenant: tenantId });
  }

  async compareRoles(profileId: number, roleIds: number[], tenantId: number) {
    const profile = await this.profileRepository.findOne({ id: profileId });
    if (!profile) throw new NotFoundException('Profile not found');

    const roles = await this.rolesRepository.find({ id: { $in: roleIds }, tenant: tenantId });
    if (roles.length < 2) throw new BadRequestException('At least 2 valid roles required for comparison');

    const normalize = (arr: string[]) => arr.map((s) => s.toLowerCase().trim());
    const profileSkills = new Set(normalize(profile.skills || []));

    const roleSkillSets = roles.map((r) => ({
      role: r,
      required: normalize(r.requiredSkills),
      preferred: normalize(r.preferredSkills),
      all: [...new Set(normalize([...r.requiredSkills, ...r.preferredSkills]))],
    }));

    // Common skills across ALL selected roles
    const commonSkills = roleSkillSets
      .slice(1)
      .reduce(
        (acc, rs) => acc.filter((s) => rs.all.includes(s)),
        roleSkillSets[0].all,
      );

    // Skills unique to each role (not in any other role's set)
    const uniqueSkillsPerRole: Record<string, string[]> = {};
    roleSkillSets.forEach((rs, i) => {
      const otherSkills = new Set(
        roleSkillSets.flatMap((other, j) => (j !== i ? other.all : [])),
      );
      uniqueSkillsPerRole[rs.role.title] = rs.all.filter((s) => !otherSkills.has(s));
    });

    const comparedRoles = roleSkillSets.map((rs) => {
      const matched = rs.required.filter((s) => profileSkills.has(s));
      const missing = rs.required.filter((s) => !profileSkills.has(s));

      const matchScore =
        rs.required.length > 0
          ? matched.length / rs.required.length
          : rs.preferred.filter((s) => profileSkills.has(s)).length /
            Math.max(rs.preferred.length, 1);

      const transitionDifficulty =
        matchScore >= 0.7 ? 'easy' : matchScore >= 0.4 ? 'moderate' : 'hard';

      return {
        role_id: rs.role.id,
        title: rs.role.title,
        match_score: Math.round(matchScore * 100) / 100,
        transition_difficulty: transitionDifficulty,
        salary_range: rs.role.salaryRange || 'N/A',
        education_level: rs.role.educationLevel,
        min_experience_years: rs.role.minExperienceYears,
        career_switcher_friendly: rs.role.careerSwitcherFriendly,
        matched_skills: matched,
        missing_skills: missing,
      };
    });

    return {
      common_skills: commonSkills,
      roles: comparedRoles,
      unique_skills_per_role: uniqueSkillsPerRole,
    };
  }
}
