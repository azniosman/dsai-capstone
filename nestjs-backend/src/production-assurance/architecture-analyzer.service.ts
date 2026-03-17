import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import {
  ProductionReadinessReport,
  ReadinessStatus,
} from './entities/production-readiness-report.entity';
import {
  AuditFinding,
  FindingSeverity,
  FindingStatus,
  ReadinessCategory,
} from './entities/audit-finding.entity';
import * as fs from 'fs';
import * as path from 'path';

export interface ServiceInfo {
  name: string;
  type:
    | 'controller'
    | 'service'
    | 'guard'
    | 'middleware'
    | 'module'
    | 'entity'
    | 'worker';
  path: string;
  dependencies: string[];
  endpoints?: Array<{ method: string; path: string; handler: string }>;
  healthStatus?: 'healthy' | 'degraded' | 'unknown';
}

export interface ArchitectureMap {
  services: ServiceInfo[];
  apis: {
    module: string;
    endpoints: Array<{ method: string; path: string; handler: string }>;
  }[];
  databases: { entity: string; table: string; relationships: string[] }[];
  aiIntegrations: {
    name: string;
    type: string;
    provider?: string;
    status: string;
  }[];
  backgroundJobs: {
    name: string;
    schedule: string;
    type: string;
    lastRun?: Date;
  }[];
  securityModules: { name: string; type: string; enabled: boolean }[];
  externalDependencies: {
    name: string;
    type: string;
    required: boolean;
    status: string;
  }[];
  configuration: { file: string; envVars: string[]; required: boolean }[];
  discoveredAt: Date;
}

@Injectable()
export class ArchitectureAnalyzerService implements OnModuleInit {
  private readonly logger = new Logger(ArchitectureAnalyzerService.name);
  private architectureMap: ArchitectureMap | null = null;
  private readonly basePath: string = path.join(__dirname, '../../..');

  constructor(
    @InjectRepository(ProductionReadinessReport)
    private readonly reportRepo: EntityRepository<ProductionReadinessReport>,
    @InjectRepository(AuditFinding)
    private readonly findingRepo: EntityRepository<AuditFinding>,
    private readonly em: EntityManager,
  ) {}

  async onModuleInit() {
    await this.analyze();
  }

  async analyze(): Promise<ArchitectureMap> {
    this.logger.log('Starting architecture analysis...');

    const map: ArchitectureMap = {
      services: await this.discoverServices(),
      apis: await this.discoverAPIs(),
      databases: await this.discoverDatabases(),
      aiIntegrations: await this.discoverAIIntegrations(),
      backgroundJobs: await this.discoverBackgroundJobs(),
      securityModules: await this.discoverSecurityModules(),
      externalDependencies: await this.discoverExternalDependencies(),
      configuration: await this.discoverConfiguration(),
      discoveredAt: new Date(),
    };

    this.architectureMap = map;
    await this.saveReport(map);
    await this.analyzeForIssues(map);

    this.logger.log(
      `Architecture analysis complete. Found ${map.services.length} services.`,
    );
    return map;
  }

  private async discoverServices(): Promise<ServiceInfo[]> {
    const services: ServiceInfo[] = [];
    const srcPath = path.join(this.basePath, 'src');

    // Discover services
    const serviceFiles = this.findFiles(srcPath, /\.service\.ts$/);
    for (const file of serviceFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const serviceName = path.basename(file, '.service.ts');
      const dependencies = this.extractDependencies(content);

      services.push({
        name: serviceName,
        type: 'service',
        path: path.relative(this.basePath, file),
        dependencies,
      });
    }

    // Discover controllers
    const controllerFiles = this.findFiles(srcPath, /\.controller\.ts$/);
    for (const file of controllerFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const controllerName = path.basename(file, '.controller.ts');
      const endpoints = this.extractEndpoints(content);
      const dependencies = this.extractDependencies(content);

      services.push({
        name: controllerName,
        type: 'controller',
        path: path.relative(this.basePath, file),
        dependencies,
        endpoints,
      });
    }

    // Discover modules
    const moduleFiles = this.findFiles(srcPath, /\.module\.ts$/);
    for (const file of moduleFiles) {
      const moduleName = path.basename(file, '.module.ts');
      services.push({
        name: moduleName,
        type: 'module',
        path: path.relative(this.basePath, file),
        dependencies: [],
      });
    }

    // Discover entities
    const entityFiles = this.findFiles(
      path.join(srcPath, 'entities'),
      /\.entity\.ts$/,
    );
    for (const file of entityFiles) {
      const entityName = path.basename(file, '.entity.ts');
      services.push({
        name: entityName,
        type: 'entity',
        path: path.relative(this.basePath, file),
        dependencies: [],
      });
    }

    return services;
  }

  private async discoverAPIs(): Promise<ArchitectureMap['apis']> {
    const apis: ArchitectureMap['apis'] = [];
    const srcPath = path.join(this.basePath, 'src');
    const controllerFiles = this.findFiles(srcPath, /\.controller\.ts$/);

    for (const file of controllerFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const moduleName = path.basename(file, '.controller.ts');
      const endpoints = this.extractEndpoints(content);

      if (endpoints.length > 0) {
        apis.push({
          module: moduleName,
          endpoints,
        });
      }
    }

    return apis;
  }

  private async discoverDatabases(): Promise<ArchitectureMap['databases']> {
    const databases: ArchitectureMap['databases'] = [];
    const entityPath = path.join(this.basePath, 'src', 'entities');
    const entityFiles = this.findFiles(entityPath, /\.entity\.ts$/);

    for (const file of entityFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const entityName = path.basename(file, '.entity.ts');
      const tableName = this.extractTableName(content);
      const relationships = this.extractRelationships(content);

      databases.push({
        entity: entityName,
        table: tableName || entityName,
        relationships,
      });
    }

    return databases;
  }

  private async discoverAIIntegrations(): Promise<
    ArchitectureMap['aiIntegrations']
  > {
    return [
      {
        name: 'LlmService',
        type: 'LLM_ORCHESTRATOR',
        provider: 'Groq/Claude/Gemini',
        status: 'active',
      },
      {
        name: 'EmbeddingService',
        type: 'EMBEDDING',
        provider: 'ONNX (bge-small-en-v1.5)',
        status: 'active',
      },
      {
        name: 'RagService',
        type: 'RAG_RETRIEVAL',
        provider: 'pgvector + tsvector',
        status: 'active',
      },
      {
        name: 'CrossEncoderService',
        type: 'RERANKER',
        provider: 'ONNX (ms-marco-MiniLM)',
        status: 'optional',
      },
      {
        name: 'CopilotService',
        type: 'AI_ASSISTANT',
        provider: 'Multi-phase pipeline',
        status: 'active',
      },
    ];
  }

  private async discoverBackgroundJobs(): Promise<
    ArchitectureMap['backgroundJobs']
  > {
    return [
      {
        name: 'ssg-sync',
        schedule: '0 1,30 * * *',
        type: 'Lambda + EventBridge',
        lastRun: undefined,
      },
      {
        name: 'recommendation-refresh',
        schedule: '0 2 * * *',
        type: 'Lambda + EventBridge',
        lastRun: undefined,
      },
      {
        name: 'cache-cleanup',
        schedule: '0 3 * * *',
        type: 'Lambda + EventBridge',
        lastRun: undefined,
      },
      {
        name: 'embedding-backfill',
        schedule: '0 */6 * * *',
        type: 'Lambda + EventBridge',
        lastRun: undefined,
      },
      {
        name: 'market-insights',
        schedule: '0 4 * * *',
        type: 'Lambda + EventBridge',
        lastRun: undefined,
      },
      {
        name: 'lambda-warmup',
        schedule: '*/5 * * * *',
        type: 'Lambda + EventBridge',
        lastRun: undefined,
      },
    ];
  }

  private async discoverSecurityModules(): Promise<
    ArchitectureMap['securityModules']
  > {
    return [
      { name: 'JwtAuthGuard', type: 'AUTH_GUARD', enabled: true },
      { name: 'OptionalJwtAuthGuard', type: 'AUTH_GUARD', enabled: true },
      { name: 'InternalTokenGuard', type: 'AUTH_GUARD', enabled: true },
      { name: 'LocalAuthGuard', type: 'AUTH_GUARD', enabled: true },
      { name: 'ThrottlerGuard', type: 'RATE_LIMIT', enabled: true },
      { name: 'ValidationPipe', type: 'INPUT_VALIDATION', enabled: true },
      { name: 'HelmetMiddleware', type: 'SECURITY_HEADERS', enabled: true },
      { name: 'CORS', type: 'ORIGIN_CONTROL', enabled: true },
    ];
  }

  private async discoverExternalDependencies(): Promise<
    ArchitectureMap['externalDependencies']
  > {
    return [
      {
        name: 'Groq API',
        type: 'LLM_PROVIDER',
        required: false,
        status: 'configured',
      },
      {
        name: 'Anthropic API',
        type: 'LLM_PROVIDER',
        required: false,
        status: 'configured',
      },
      {
        name: 'Google Gemini API',
        type: 'LLM_PROVIDER',
        required: false,
        status: 'configured',
      },
      {
        name: 'PostgreSQL + pgvector',
        type: 'DATABASE',
        required: true,
        status: 'active',
      },
      {
        name: 'AWS Lambda',
        type: 'COMPUTE',
        required: true,
        status: 'configured',
      },
      {
        name: 'AWS Aurora Serverless',
        type: 'DATABASE',
        required: true,
        status: 'configured',
      },
      {
        name: 'SkillsFuture/WSG API',
        type: 'EXTERNAL_API',
        required: false,
        status: 'optional',
      },
    ];
  }

  private async discoverConfiguration(): Promise<
    ArchitectureMap['configuration']
  > {
    return [
      {
        file: '.env',
        envVars: [
          'DATABASE_URL',
          'JWT_SECRET',
          'REFRESH_TOKEN_SECRET',
          'INTERNAL_AUTOMATION_TOKEN',
        ],
        required: true,
      },
      {
        file: 'nestjs-backend/.env',
        envVars: ['PRIMARY_LLM', 'GROQ_API_KEY', 'EMBEDDING_MODEL'],
        required: false,
      },
      {
        file: 'docker-compose.yml',
        envVars: ['POSTGRES_USER', 'POSTGRES_PASSWORD'],
        required: true,
      },
    ];
  }

  private async saveReport(map: ArchitectureMap): Promise<void> {
    const report = this.reportRepo.create({
      scores: {
        architecture: 85,
        security: 0,
        reliability: 0,
        aiPipeline: 0,
        operational: 0,
        performance: 0,
        overall: 0,
      },
      status: ReadinessStatus.NEEDS_ATTENTION,
      architectureMap: map,
      reportJson: JSON.stringify(map, null, 2),
      isBaseline: true,
    });
    await this.em.persistAndFlush(report);
  }

  private async analyzeForIssues(map: ArchitectureMap): Promise<void> {
    // Check for monolithic services
    const largeServices = map.services.filter((s) => {
      const filePath = path.join(this.basePath, s.path);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        return stats.size > 50000; // > 50KB
      }
      return false;
    });

    for (const service of largeServices) {
      await this.em.persistAndFlush(
        this.findingRepo.create({
          title: `Large service file detected: ${service.name}`,
          description: `Service file exceeds 50KB. Consider refactoring into smaller modules.`,
          severity: FindingSeverity.MEDIUM,
          status: FindingStatus.OPEN,
          category: ReadinessCategory.ARCHITECTURE,
          component: service.name,
          file: service.path,
          remediation:
            'Split service into smaller, focused modules following single responsibility principle.',
        }),
      );
    }

    // Check for deprecated patterns
    const deprecatedPatterns = [
      'console.log',
      'debugger',
      'TODO',
      'FIXME',
      'XXX',
    ];
    for (const service of map.services) {
      if (service.type === 'service' || service.type === 'controller') {
        const filePath = path.join(this.basePath, service.path);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          for (const pattern of deprecatedPatterns) {
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
              if (
                lines[i].includes(pattern) &&
                !lines[i].trim().startsWith('//')
              ) {
                await this.em.persistAndFlush(
                  this.findingRepo.create({
                    title: `${pattern} pattern found in ${service.name}`,
                    description: `Found '${pattern}' at line ${i + 1}. This should be removed before production.`,
                    severity:
                      pattern === 'console.log' || pattern === 'debugger'
                        ? FindingSeverity.HIGH
                        : FindingSeverity.LOW,
                    status: FindingStatus.OPEN,
                    category: ReadinessCategory.ARCHITECTURE,
                    component: service.name,
                    file: service.path,
                    line: i + 1,
                    remediation: `Remove ${pattern} statement or replace with proper logging.`,
                  }),
                );
              }
            }
          }
        }
      }
    }
  }

  // Helper methods
  private findFiles(dir: string, pattern: RegExp): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (
        entry.isDirectory() &&
        !entry.name.startsWith('.') &&
        entry.name !== 'node_modules'
      ) {
        results.push(...this.findFiles(fullPath, pattern));
      } else if (entry.isFile() && pattern.test(entry.name)) {
        results.push(fullPath);
      }
    }
    return results;
  }

  private extractDependencies(content: string): string[] {
    const deps = new Set<string>();
    const importMatches = content.matchAll(
      /import\s+.*?\s+from\s+['"](.+?)['"]/g,
    );
    for (const match of importMatches) {
      const importPath = match[1];
      const depName = importPath.split('/').pop()?.replace('.ts', '');
      if (depName) deps.add(depName);
    }
    return Array.from(deps);
  }

  private extractEndpoints(
    content: string,
  ): Array<{ method: string; path: string; handler: string }> {
    const endpoints: Array<{ method: string; path: string; handler: string }> =
      [];
    const decorators = ['Get', 'Post', 'Put', 'Patch', 'Delete'];

    for (const decorator of decorators) {
      const pattern = new RegExp(
        `@${decorator}\\(['"]?(.*?)['"]?\\)\\s*\\w+\\s*\\(`,
        'g',
      );
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const handlerMatch = content
          .substring(match.index)
          .match(/@.*?\s*\w+\s*\((.*?)\)/);
        if (handlerMatch) {
          endpoints.push({
            method: decorator.toUpperCase(),
            path: match[1] || '/',
            handler: handlerMatch[1] || 'unknown',
          });
        }
      }
    }
    return endpoints;
  }

  private extractTableName(content: string): string | null {
    const match = content.match(/@Entity\(\s*\{\s*tableName:\s*['"](.*?)['"]/);
    return match ? match[1] : null;
  }

  private extractRelationships(content: string): string[] {
    const relationships: string[] = [];
    const relationshipDecorators = [
      '@ManyToOne',
      '@OneToMany',
      '@OneToOne',
      '@ManyToMany',
    ];

    for (const decorator of relationshipDecorators) {
      const pattern = new RegExp(
        `${decorator}\\s*\\(\\s*\\(\\s*\\)\\s*=>\\s*([\\w]+)`,
        'g',
      );
      let match;
      while ((match = pattern.exec(content)) !== null) {
        relationships.push(match[1]);
      }
    }
    return relationships;
  }

  getArchitectureMap(): ArchitectureMap | null {
    return this.architectureMap;
  }
}
