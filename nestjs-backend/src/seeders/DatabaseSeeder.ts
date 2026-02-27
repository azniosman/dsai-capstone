import { Seeder } from '@mikro-orm/seeder';
import { EntityManager } from '@mikro-orm/core';
import { Tenant } from '../entities/tenant.entity';
import { Skill } from '../entities/skill.entity';
import { JobRole } from '../entities/job-role.entity';
import { SCTPCourse } from '../entities/sctp-course.entity';
import { MarketInsight } from '../entities/market-insight.entity';
import * as fs from 'fs';
import * as path from 'path';

// Inline market insight data — used both as fallback in DomainService and seeded here
export const MARKET_INSIGHTS_DATA = [
  {
    roleCategory: 'FinTech',
    demandLevel: 'high',
    avgSalarySgd: 8500,
    yoyGrowthPct: 12,
    hiringVolume: 450,
    trendingSkills: ['React', 'NestJS', 'TypeScript', 'SQL', 'AWS'],
    forecast2026: 'Bullish',
    outlook:
      'Continued demand for full-stack engineers with focus on security and scalability.',
  },
  {
    roleCategory: 'HealthTech',
    demandLevel: 'high',
    avgSalarySgd: 9500,
    yoyGrowthPct: 18,
    hiringVolume: 320,
    trendingSkills: ['Python', 'PyTorch', 'SQL', 'Docker', 'AWS'],
    forecast2026: 'Strong',
    outlook:
      'Surge in AI-driven diagnostics and personalized medicine requirements.',
  },
  {
    roleCategory: 'E-commerce',
    demandLevel: 'medium',
    avgSalarySgd: 7200,
    yoyGrowthPct: 8,
    hiringVolume: 380,
    trendingSkills: ['Python', 'SQL', 'Machine Learning', 'React', 'Node.js'],
    forecast2026: 'Stable',
    outlook:
      'Steady growth driven by personalisation and recommendation engine investments.',
  },
  {
    roleCategory: 'Cybersecurity',
    demandLevel: 'high',
    avgSalarySgd: 10500,
    yoyGrowthPct: 22,
    hiringVolume: 280,
    trendingSkills: [
      'SIEM',
      'Network Security',
      'Python',
      'Incident Response',
      'Cloud Security',
    ],
    forecast2026: 'Strong',
    outlook:
      'Critical talent shortage; MAS regulations driving compliance hiring across all sectors.',
  },
  {
    roleCategory: 'Cloud Computing',
    demandLevel: 'high',
    avgSalarySgd: 9800,
    yoyGrowthPct: 20,
    hiringVolume: 410,
    trendingSkills: ['AWS', 'Kubernetes', 'Terraform', 'Docker', 'Python'],
    forecast2026: 'Bullish',
    outlook:
      'Digital transformation mandates across government and enterprise driving cloud adoption.',
  },
  {
    roleCategory: 'Data & Analytics',
    demandLevel: 'high',
    avgSalarySgd: 8200,
    yoyGrowthPct: 15,
    hiringVolume: 520,
    trendingSkills: ['Python', 'SQL', 'Spark', 'dbt', 'Snowflake'],
    forecast2026: 'Bullish',
    outlook:
      'Data-driven decision making becoming standard; GenAI integration accelerating demand.',
  },
  {
    roleCategory: 'Software Engineering',
    demandLevel: 'high',
    avgSalarySgd: 7800,
    yoyGrowthPct: 10,
    hiringVolume: 680,
    trendingSkills: ['TypeScript', 'React', 'Node.js', 'Docker', 'AWS'],
    forecast2026: 'Stable',
    outlook:
      'Consistent baseline demand; AI tooling raising productivity expectations for individuals.',
  },
];

export class DatabaseSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    // 1. Ensure Global Tenant exists
    let globalTenant = await em.findOne(Tenant, { name: 'Global' });
    if (!globalTenant) {
      globalTenant = em.create(Tenant, { name: 'Global' });
      await em.flush();
    }

    // 2. Load Seed Data — resolve relative to repo root from compiled dist
    // Source: nestjs-backend/src/seeders/ → dist/seeders/
    // Data:   dsai-capstone/data/seed/
    const seedPath = path.resolve(__dirname, '../../../data/seed');

    // 2.1 Seed Skills
    const skillsPath = path.join(seedPath, 'skills_taxonomy.json');
    if (fs.existsSync(skillsPath)) {
      const skillsData = JSON.parse(fs.readFileSync(skillsPath, 'utf8'));
      const activeCat = skillsData.categories || [];
      for (const cat of activeCat) {
        for (const skillName of cat.skills) {
          const exists = await em.findOne(Skill, { name: skillName });
          if (!exists) {
            em.create(Skill, {
              name: skillName,
              category: cat.name,
              tenant: globalTenant,
            });
          }
        }
      }
      await em.flush();
    }

    // 2.2 Seed Job Roles
    const rolesPath = path.join(seedPath, 'job_roles.json');
    if (fs.existsSync(rolesPath)) {
      const rolesData = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
      const activeRoles = rolesData.roles || [];
      for (const role of activeRoles) {
        const exists = await em.findOne(JobRole, { title: role.title });
        if (!exists) {
          em.create(JobRole, {
            title: role.title,
            category: role.category,
            description: role.description,
            requiredSkills: role.required_skills,
            preferredSkills: role.preferred_skills,
            minExperienceYears: role.min_experience_years,
            educationLevel: role.education_level,
            careerSwitcherFriendly: role.career_switcher_friendly,
            salaryRange: role.salary_range,
            tenant: globalTenant,
          });
        }
      }
      await em.flush();
    }

    // 2.3 Seed SCTP Courses
    const coursesPath = path.join(seedPath, 'sctp_courses.json');
    if (fs.existsSync(coursesPath)) {
      const coursesData = JSON.parse(fs.readFileSync(coursesPath, 'utf8'));
      const activeCourses = coursesData.courses || [];
      for (const course of activeCourses) {
        const exists = await em.findOne(SCTPCourse, { title: course.title });
        if (!exists) {
          const fee = course.course_fee || 0;
          const subsidyPct = course.subsidy_percent || 70;
          const nettFee = fee * (1 - subsidyPct / 100);
          em.create(SCTPCourse, {
            title: course.title,
            provider: course.provider,
            skillsTaught: course.skills_taught || [],
            durationWeeks: course.duration_weeks,
            level: course.level || 'intermediate',
            url: course.url,
            certification: course.certification,
            courseFee: fee,
            subsidyPercent: subsidyPct,
            mcesEligible: course.mces_eligible || false,
            skillsfutureEligible: true,
            skillsfutureCreditAmount: 500,
            nettFeeAfterSubsidy: Math.max(0, nettFee),
            tenant: globalTenant,
          });
        }
      }
      await em.flush();
    }

    // 2.4 Seed Market Insights
    for (const insight of MARKET_INSIGHTS_DATA) {
      const exists = await em.findOne(MarketInsight, {
        roleCategory: insight.roleCategory,
        tenant: globalTenant,
      });
      if (!exists) {
        em.create(MarketInsight, {
          ...insight,
          updatedAt: new Date(),
          tenant: globalTenant,
        });
      }
    }
    await em.flush();
  }
}
