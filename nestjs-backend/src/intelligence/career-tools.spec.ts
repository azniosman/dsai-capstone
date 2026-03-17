import { Test, TestingModule } from '@nestjs/testing';
import { CareerToolsService } from './career-tools.service';
import { IntelligenceService } from './intelligence.service';
import { DomainService } from '../domain/domain.service';

describe('CareerToolsService', () => {
  let service: CareerToolsService;
  let intelligenceService: IntelligenceService;
  let domainService: DomainService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CareerToolsService,
        {
          provide: IntelligenceService,
          useValue: {
            getRecommendations: jest
              .fn()
              .mockResolvedValue({ recommendations: [] }),
            getSkillGap: jest.fn().mockResolvedValue({ gaps: [] }),
          },
        },
        {
          provide: DomainService,
          useValue: {
            getMarketInsights: jest.fn().mockResolvedValue({ insights: [] }),
            calculateCourseSubsidy: jest
              .fn()
              .mockResolvedValue({ subsidy: 100 }),
          },
        },
      ],
    }).compile();

    service = module.get<CareerToolsService>(CareerToolsService);
    intelligenceService = module.get<IntelligenceService>(IntelligenceService);
    domainService = module.get<DomainService>(DomainService);
  });

  it('should return 4 tool definitions', () => {
    const tools = service.getTools();
    expect(tools.length).toBe(4);
    expect(tools.map((t) => t.name)).toContain('get_recommendations');
    expect(tools.map((t) => t.name)).toContain('analyze_skill_gap');
    expect(tools.map((t) => t.name)).toContain('get_market_insights');
    expect(tools.map((t) => t.name)).toContain('calculate_course_subsidy');
  });

  it('should execute get_recommendations tool', async () => {
    const tools = service.getTools();
    const tool = tools.find((t) => t.name === 'get_recommendations');
    const result = await tool!.execute({ profile_id: 1 }, { tenantId: 1 });
    expect(intelligenceService.getRecommendations).toHaveBeenCalled();
    expect(result).toBe(JSON.stringify({ recommendations: [] }));
  });
});
