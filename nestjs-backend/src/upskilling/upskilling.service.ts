import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { SCTPCourse } from '../entities/sctp-course.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { JobRole } from '../entities/job-role.entity';
import { RoadmapDataDto, RoadmapItem } from './dto/upskilling.dto';

const LEVEL_ORDER: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };

@Injectable()
export class UpskillingService {
  constructor(
    @InjectRepository(SCTPCourse)
    private readonly courseRepository: EntityRepository<SCTPCourse>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: EntityRepository<UserProfile>,
    @InjectRepository(JobRole)
    private readonly roleRepository: EntityRepository<JobRole>,
  ) {}

  // Same scoring formula as IntelligenceService
  private scoreRole(profile: UserProfile, role: JobRole): number {
    const profileSkills = new Set((profile.skills ?? []).map((s) => s.toLowerCase()));
    let matched = 0;
    for (const req of role.requiredSkills) {
      if (profileSkills.has(req.toLowerCase())) matched++;
    }
    const contentScore = matched / Math.max(role.requiredSkills.length, 1);
    const ruleScore = (profile.yearsExperience ?? 0) >= role.minExperienceYears ? 1.0 : 0.5;
    const careerBonus = profile.isCareerSwitcher && role.careerSwitcherFriendly ? 1.0 : 0.0;
    return 0.55 * contentScore + 0.25 * ruleScore + 0.2 * careerBonus;
  }

  async getUpskilling(profileId: number, tenantId: number, userId: number): Promise<RoadmapDataDto> {
    const profile = await this.profileRepository.findOne({
      id: profileId,
      tenant: tenantId,
      user: userId,
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Find top matched role and its missing skills (gap)
    const roles = await this.roleRepository.find({ tenant: tenantId });
    const topRole = roles
      .map((role) => ({ role, score: this.scoreRole(profile, role) }))
      .sort((a, b) => b.score - a.score)[0];

    const missingSkills: Set<string> = new Set();
    if (topRole) {
      const profileSkillsLower = new Set((profile.skills ?? []).map((s) => s.toLowerCase()));
      for (const req of topRole.role.requiredSkills) {
        if (!profileSkillsLower.has(req.toLowerCase())) {
          missingSkills.add(req.toLowerCase());
        }
      }
    }

    // Fetch all courses and score/sort them
    const allCourses = await this.courseRepository.find({ tenant: tenantId });

    // Separate gap-targeted courses (teach ≥1 missing skill) from others
    const targeted: SCTPCourse[] = [];
    const filler: SCTPCourse[] = [];

    for (const course of allCourses) {
      const teaches = (course.skillsTaught ?? []).map((s) => s.toLowerCase());
      const coversGap = teaches.some((s) => missingSkills.has(s));
      if (coversGap) {
        targeted.push(course);
      } else {
        filler.push(course);
      }
    }

    // Sort both groups by level (beginner → intermediate → advanced)
    const sortByLevel = (a: SCTPCourse, b: SCTPCourse) =>
      (LEVEL_ORDER[a.level] ?? 1) - (LEVEL_ORDER[b.level] ?? 1);

    targeted.sort(sortByLevel);
    filler.sort(sortByLevel);

    // Pick up to 5 courses: targeted first, then filler to fill remaining spots
    const selected = [...targeted, ...filler].slice(0, 5);

    let currentWeek = 1;
    let totalWeeks = 0;
    let totalCost = 0;
    let totalAfterSubsidy = 0;
    let sfApplicable = 0;

    const roadmap: RoadmapItem[] = selected.map((course) => {
      const duration = course.durationWeeks || 4;
      const item: RoadmapItem = {
        week_start: currentWeek,
        week_end: currentWeek + duration - 1,
        course_title: course.title,
        provider: course.provider,
        duration_weeks: duration,
        level: course.level,
        skill: course.skillsTaught[0] || 'General Tech',
        certification: course.certification,
        skillsfuture_eligible: course.skillsfutureEligible,
        skillsfuture_credit_amount: course.skillsfutureCreditAmount,
        course_fee: course.courseFee,
        nett_fee_after_subsidy: course.nettFeeAfterSubsidy,
        url: course.url,
      };

      currentWeek += duration;
      totalWeeks += duration;
      totalCost += course.courseFee;
      totalAfterSubsidy += course.nettFeeAfterSubsidy;
      if (course.skillsfutureEligible) {
        sfApplicable += Math.min(course.skillsfutureCreditAmount, course.nettFeeAfterSubsidy);
      }

      return item;
    });

    const targetRoleTitle = topRole?.role.title ?? 'your target role';
    const gapCount = missingSkills.size;
    const narrative =
      `Based on your profile, the best-matched role is ${targetRoleTitle}. ` +
      `You have ${gapCount} skill gap${gapCount !== 1 ? 's' : ''} to bridge. ` +
      `This roadmap prioritises courses that directly address those gaps, ` +
      `then adds complementary skills to round out your readiness.`;

    return {
      total_weeks: totalWeeks,
      total_cost: totalCost,
      total_after_subsidy: totalAfterSubsidy,
      total_skillsfuture_applicable: sfApplicable,
      narrative,
      roadmap,
    };
  }
}
