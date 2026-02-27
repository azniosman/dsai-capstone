import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { SCTPCourse } from '@app/entities/sctp-course.entity';
import { MarketInsight } from '@app/entities/market-insight.entity';
import { UserProfile } from '@app/entities/user-profile.entity';
import { JobRole } from '@app/entities/job-role.entity';
import { SkillProgress } from '@app/entities/skill-progress.entity';
import { CourseQueryDto, SubsidyRequestDto } from './dto/domain.dto';
import { MARKET_INSIGHTS_DATA } from '../seeders/DatabaseSeeder';

@Injectable()
export class DomainService {
  constructor(
    @InjectRepository(SCTPCourse)
    private readonly courseRepository: EntityRepository<SCTPCourse>,
    @InjectRepository(MarketInsight)
    private readonly marketRepository: EntityRepository<MarketInsight>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: EntityRepository<UserProfile>,
    @InjectRepository(JobRole)
    private readonly roleRepository: EntityRepository<JobRole>,
    @InjectRepository(SkillProgress)
    private readonly progressRepository: EntityRepository<SkillProgress>,
  ) {}

  // Same 0.55/0.25/0.20 hybrid scoring as IntelligenceService
  private scoreRole(
    profile: UserProfile,
    role: JobRole,
  ): { score: number; missing: string[] } {
    const profileSkills = new Set(
      (profile.skills ?? []).map((s) => s.toLowerCase()),
    );
    let matched = 0;
    const missing: string[] = [];

    for (const req of role.requiredSkills) {
      if (profileSkills.has(req.toLowerCase())) {
        matched++;
      } else {
        missing.push(req);
      }
    }

    const contentScore = matched / Math.max(role.requiredSkills.length, 1);
    const ruleScore =
      (profile.yearsExperience ?? 0) >= role.minExperienceYears ? 1.0 : 0.5;
    const careerBonus =
      profile.isCareerSwitcher && role.careerSwitcherFriendly ? 1.0 : 0.0;
    const score = 0.55 * contentScore + 0.25 * ruleScore + 0.2 * careerBonus;

    return { score, missing };
  }

  private calculateSubsidies(course: SCTPCourse, isCareerSwitcher = false) {
    const fee = course.courseFee || 0;
    let subsidyPct = course.subsidyPercent || 70;
    let mcesApplied = false;
    let sfcApplicable = 500.0;

    if (course.mcesEligible && isCareerSwitcher) {
      subsidyPct = 90;
      mcesApplied = true;
      sfcApplicable += 4000.0;
    }

    const subsidyAmount = fee * (subsidyPct / 100.0);
    const nettPayable = Math.max(0, fee - subsidyAmount);

    return {
      course_fee: fee,
      subsidy_percent: subsidyPct,
      subsidy_amount: subsidyAmount,
      mces_applied: mcesApplied,
      sfc_applicable: sfcApplicable,
      nett_payable: nettPayable,
    };
  }

  async getCourses(query: CourseQueryDto, tenantId: number) {
    const where: any = { tenant: tenantId };
    if (query.provider) where.provider = query.provider;
    if (query.level) where.level = query.level;
    if (query.mcesEligible !== undefined)
      where.mcesEligible = query.mcesEligible;

    const courses = await this.courseRepository.find(where);
    let filtered = courses;

    if (query.skill) {
      const s = query.skill.toLowerCase();
      filtered = courses.filter((c) =>
        (c.skillsTaught || []).some((taught) =>
          taught.toLowerCase().includes(s),
        ),
      );
    }

    const items = filtered.map((c) => {
      const sub = this.calculateSubsidies(c);
      return {
        id: c.id,
        title: c.title,
        provider: c.provider,
        skills_taught: c.skillsTaught || [],
        duration_weeks: c.durationWeeks,
        level: c.level || 'intermediate',
        url: c.url,
        certification: c.certification,
        course_fee: c.courseFee || 0,
        subsidy_percent: c.subsidyPercent || 70,
        mces_eligible: c.mcesEligible || false,
        subsidy_amount: sub.subsidy_amount,
        nett_payable: sub.nett_payable,
        sfc_applicable: sub.sfc_applicable,
      };
    });

    return { courses: items, total_courses: items.length };
  }

  async calculateCourseSubsidy(payload: SubsidyRequestDto, tenantId: number) {
    const course = await this.courseRepository.findOne({
      id: payload.course_id,
      tenant: tenantId,
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return this.calculateSubsidies(course, payload.is_career_switcher);
  }

  async getMarketInsights(tenantId: number) {
    const insights = await this.marketRepository.find({ tenant: tenantId });

    if (!insights.length) {
      // Rich inline fallback when DB not yet seeded
      const topSkills = new Map<string, number>();
      for (const ins of MARKET_INSIGHTS_DATA) {
        for (const s of ins.trendingSkills) {
          topSkills.set(s, (topSkills.get(s) ?? 0) + 1);
        }
      }
      const topSkillsList = Array.from(topSkills.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([s]) => s);

      const sortedSectors = [...MARKET_INSIGHTS_DATA]
        .sort((a, b) => b.yoyGrowthPct - a.yoyGrowthPct)
        .slice(0, 3)
        .map((s) => s.roleCategory);

      return {
        insights: MARKET_INSIGHTS_DATA.map((ins) => ({
          id: 0,
          role_category: ins.roleCategory,
          demand_level: ins.demandLevel,
          avg_salary_sgd: ins.avgSalarySgd,
          yoy_growth_pct: ins.yoyGrowthPct,
          hiring_volume: ins.hiringVolume,
          trending_skills: ins.trendingSkills,
          forecast_2026: ins.forecast2026,
          outlook: ins.outlook,
        })),
        top_skills_overall: topSkillsList,
        highest_demand_sectors: sortedSectors,
        last_updated: 'Feb 2026',
      };
    }

    const allSkills = new Map<string, number>();
    for (const ins of insights) {
      for (const s of ins.trendingSkills || []) {
        allSkills.set(s, (allSkills.get(s) || 0) + 1);
      }
    }

    const topSkills = Array.from(allSkills.entries())
      .sort((a, b) => b[1] - a[1])
      .map((e) => e[0])
      .slice(0, 10);

    const sortedSectors = [...insights].sort(
      (a, b) => (b.yoyGrowthPct || 0) - (a.yoyGrowthPct || 0),
    );
    const highestDemand = sortedSectors.slice(0, 3).map((s) => s.roleCategory);

    return {
      insights,
      top_skills_overall: topSkills,
      highest_demand_sectors: highestDemand,
      last_updated: 'Feb 2026',
    };
  }

  async getDashboardSummary(userId: number, tenantId: number) {
    const profile = await this.profileRepository.findOne({
      user: userId,
      tenant: tenantId,
    });

    if (!profile) {
      throw new NotFoundException('No profile linked to this account');
    }

    const progressCount = await this.progressRepository.count({ profile });

    // Compute real metrics using hybrid scoring
    const roles = await this.roleRepository.find({ tenant: tenantId });

    const scored = roles
      .map((role) => ({ role, ...this.scoreRole(profile, role) }))
      .sort((a, b) => b.score - a.score);

    const recommendationsCount = scored.filter((r) => r.score >= 0.5).length;

    // Distinct missing skills across top 3 roles
    const top3 = scored.slice(0, 3);
    const allGaps = new Set<string>();
    for (const { missing } of top3) {
      for (const skill of missing) {
        allGaps.add(skill.toLowerCase());
      }
    }
    const gapsIdentified = allGaps.size;

    // Career readiness = top role score × 100
    const topScore = scored[0]?.score ?? 0;
    const careerReadiness = parseFloat((topScore * 100).toFixed(1));

    return {
      profile_id: profile.id,
      name: profile.name,
      education: profile.education,
      years_experience: profile.yearsExperience,
      skills: profile.skills || [],
      is_career_switcher: profile.isCareerSwitcher,
      skills_count: (profile.skills || []).length,
      recommendations_count: recommendationsCount,
      gaps_identified: gapsIdentified,
      progress_entries: progressCount,
      skills_delta: 0,
      recommendations_delta: 0,
      gaps_delta: 0,
      career_readiness: careerReadiness,
    };
  }
}
