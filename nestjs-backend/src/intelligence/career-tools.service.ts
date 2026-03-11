import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { IntelligenceService } from './intelligence.service';
import { DomainService } from '../domain/domain.service';
import { LlmTool } from './llm-tool.interface';

/** Context passed to tool execution. */
interface ToolContext {
  tenantId: number;
  profileId?: number;
}

/** Arguments for recommendation and gap tools. */
interface ProfileArgs {
  profile_id: number;
}

/** Arguments for course subsidy tool. */
interface SubsidyArgs {
  course_id: number;
  is_career_switcher: boolean;
}

@Injectable()
export class CareerToolsService {
  constructor(
    @Inject(forwardRef(() => IntelligenceService))
    private readonly intelligenceService: IntelligenceService,
    private readonly domainService: DomainService,
  ) {}

  getTools(): LlmTool[] {
    return [
      {
        name: 'get_recommendations',
        description:
          'Get personalised job role recommendations based on the user profile.',
        parameters: {
          type: 'object',
          properties: {
            profile_id: {
              type: 'number',
              description: 'The ID of the user profile.',
            },
          },
          required: ['profile_id'],
        },
        execute: async (args: ProfileArgs, context: ToolContext) => {
          const result = await this.intelligenceService.getRecommendations(
            { profile_id: args.profile_id },
            context.tenantId,
          );
          return JSON.stringify(result);
        },
      },
      {
        name: 'analyze_skill_gap',
        description:
          'Analyze skill gaps for the user profile against top matched roles.',
        parameters: {
          type: 'object',
          properties: {
            profile_id: {
              type: 'number',
              description: 'The ID of the user profile.',
            },
          },
          required: ['profile_id'],
        },
        execute: async (args: ProfileArgs, context: ToolContext) => {
          const result = await this.intelligenceService.getSkillGap(
            args.profile_id,
            context.tenantId,
          );
          return JSON.stringify(result);
        },
      },
      {
        name: 'get_market_insights',
        description:
          'Get current Singapore labor market insights and trending skills.',
        parameters: {
          type: 'object',
          properties: {},
        },
        execute: async (_args: unknown, context: ToolContext) => {
          const result = await this.domainService.getMarketInsights(
            context.tenantId,
          );
          return JSON.stringify(result);
        },
      },
      {
        name: 'calculate_course_subsidy',
        description:
          'Calculate SkillsFuture and MCES subsidies for a specific course.',
        parameters: {
          type: 'object',
          properties: {
            course_id: { type: 'number', description: 'The ID of the course.' },
            is_career_switcher: {
              type: 'boolean',
              description: 'Whether the user is a career switcher.',
            },
          },
          required: ['course_id', 'is_career_switcher'],
        },
        execute: async (args: SubsidyArgs, context: ToolContext) => {
          const result = await this.domainService.calculateCourseSubsidy(
            {
              course_id: args.course_id,
              is_career_switcher: args.is_career_switcher,
            },
            context.tenantId,
          );
          return JSON.stringify(result);
        },
      },
    ];
  }
}
