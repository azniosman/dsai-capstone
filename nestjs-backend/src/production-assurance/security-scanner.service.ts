import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import {
  AuditFinding,
  FindingSeverity,
  FindingStatus,
  ReadinessCategory,
} from './entities/audit-finding.entity';
import {
  ProductionReadinessReport,
  ReadinessStatus,
} from './entities/production-readiness-report.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SecurityScannerService implements OnModuleInit {
  private readonly logger = new Logger(SecurityScannerService.name);
  private readonly basePath: string = path.join(__dirname, '../../..');
  private securityScore: number = 0;

  constructor(
    @InjectRepository(AuditFinding)
    private readonly findingRepo: EntityRepository<AuditFinding>,
    @InjectRepository(ProductionReadinessReport)
    private readonly reportRepo: EntityRepository<ProductionReadinessReport>,
    private readonly em: EntityManager,
  ) {}

  async onModuleInit() {
    await this.scan();
  }

  async scan(): Promise<SecurityScanResult> {
    this.logger.log('Starting security scan...');

    const results: SecurityScanResult = {
      scannedAt: new Date(),
      findings: [],
      score: 0,
      status: 'CRITICAL_ISSUES',
    };

    // Run all security checks
    await this.checkAuthentication();
    await this.checkAuthorization();
    await this.checkAPISecurity();
    await this.checkInputValidation();
    await this.checkSecretsManagement();
    await this.checkSQLInjection();
    await this.checkCommandInjection();
    await this.checkHardcodedCredentials();
    await this.checkDebugCode();
    await this.checkRateLimiting();

    // Calculate security score
    results.score = await this.calculateSecurityScore();
    results.status =
      results.score >= 80
        ? 'READY'
        : results.score >= 60
          ? 'NEEDS_ATTENTION'
          : 'CRITICAL_ISSUES';

    this.securityScore = results.score;
    this.logger.log(`Security scan complete. Score: ${results.score}/100`);

    return results;
  }

  private async checkAuthentication(): Promise<void> {
    this.logger.log('Checking authentication mechanisms...');

    // Check for JWT configuration
    const envPath = path.join(this.basePath, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');

      if (
        !envContent.includes('JWT_SECRET') ||
        envContent.includes('change-me')
      ) {
        await this.createFinding({
          title: 'Weak or missing JWT_SECRET',
          description:
            'JWT_SECRET is not properly configured or uses default value',
          severity: FindingSeverity.CRITICAL,
          component: 'Authentication',
          remediation:
            'Generate a strong random JWT_SECRET using crypto.randomBytes(32).toString("hex")',
        });
      }

      if (
        !envContent.includes('REFRESH_TOKEN_SECRET') ||
        envContent.includes('change-me')
      ) {
        await this.createFinding({
          title: 'Weak or missing REFRESH_TOKEN_SECRET',
          description: 'REFRESH_TOKEN_SECRET is not properly configured',
          severity: FindingSeverity.CRITICAL,
          component: 'Authentication',
          remediation: 'Generate a strong random REFRESH_TOKEN_SECRET',
        });
      }
    }

    // Check for password policies
    const authFiles = this.findFiles(
      path.join(this.basePath, 'src', 'auth'),
      /\.ts$/,
    );
    for (const file of authFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      if (!content.includes('minlength') && !content.includes('minLength')) {
        await this.createFinding({
          title: 'Missing password length validation',
          description: 'No password minimum length validation found',
          severity: FindingSeverity.HIGH,
          component: 'Authentication',
          file: path.relative(this.basePath, file),
          remediation: 'Add password validation with minimum 8 characters',
        });
      }
    }
  }

  private async checkAuthorization(): Promise<void> {
    this.logger.log('Checking authorization policies...');

    // Check for guard usage
    const controllerFiles = this.findFiles(
      path.join(this.basePath, 'src'),
      /\.controller\.ts$/,
    );
    let unprotectedEndpoints = 0;

    for (const file of controllerFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const fileName = path.basename(file);

      // Skip internal and public controllers
      if (fileName.includes('internal') || fileName.includes('public'))
        continue;

      // Check if controller has auth guard
      if (
        !content.includes('@UseGuards') &&
        !content.includes('JwtAuthGuard')
      ) {
        unprotectedEndpoints++;
      }
    }

    if (unprotectedEndpoints > 0) {
      await this.createFinding({
        title: `${unprotectedEndpoints} controllers without explicit auth guards`,
        description:
          'Some controllers may be missing authentication protection',
        severity: FindingSeverity.MEDIUM,
        component: 'Authorization',
        remediation:
          'Review all controllers and ensure proper auth guards are applied',
      });
    }
  }

  private async checkAPISecurity(): Promise<void> {
    this.logger.log('Checking API security...');

    // Check for CORS configuration
    const mainPath = path.join(this.basePath, 'src', 'main.ts');
    if (fs.existsSync(mainPath)) {
      const content = fs.readFileSync(mainPath, 'utf-8');

      if (!content.includes('cors') && !content.includes('CORS')) {
        await this.createFinding({
          title: 'CORS not explicitly configured',
          description:
            'Cross-Origin Resource Sharing may not be properly configured',
          severity: FindingSeverity.MEDIUM,
          component: 'API Security',
          file: 'src/main.ts',
          remediation: 'Configure CORS with specific allowed origins',
        });
      }

      if (!content.includes('helmet')) {
        await this.createFinding({
          title: 'Helmet security headers not configured',
          description: 'HTTP security headers may not be set',
          severity: FindingSeverity.MEDIUM,
          component: 'API Security',
          file: 'src/main.ts',
          remediation: 'Add app.use(helmet()) for security headers',
        });
      }
    }
  }

  private async checkInputValidation(): Promise<void> {
    this.logger.log('Checking input validation...');

    // Check for ValidationPipe usage
    const mainPath = path.join(this.basePath, 'src', 'main.ts');
    if (fs.existsSync(mainPath)) {
      const content = fs.readFileSync(mainPath, 'utf-8');

      if (!content.includes('ValidationPipe')) {
        await this.createFinding({
          title: 'ValidationPipe not configured globally',
          description: 'Input validation may not be enforced',
          severity: FindingSeverity.HIGH,
          component: 'Input Validation',
          file: 'src/main.ts',
          remediation:
            'Configure ValidationPipe globally with whitelist and forbidNonWhitelisted',
        });
      }
    }

    // Check for DTOs
    const dtoFiles = this.findFiles(
      path.join(this.basePath, 'src'),
      /\.dto\.ts$/,
    );
    if (dtoFiles.length === 0) {
      await this.createFinding({
        title: 'No DTOs found',
        description: 'API endpoints may not have proper input validation',
        severity: FindingSeverity.MEDIUM,
        component: 'Input Validation',
        remediation:
          'Create DTOs for all API endpoints with class-validator decorators',
      });
    }
  }

  private async checkSecretsManagement(): Promise<void> {
    this.logger.log('Checking secrets management...');

    // Check for hardcoded secrets
    const patterns = [
      { pattern: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i, name: 'API Key' },
      { pattern: /secret\s*[:=]\s*['"][^'"]+['"]/i, name: 'Secret' },
      { pattern: /password\s*[:=]\s*['"][^'"]+['"]/i, name: 'Password' },
      { pattern: /token\s*[:=]\s*['"][^'"]+['"]/i, name: 'Token' },
    ];

    const srcPath = path.join(this.basePath, 'src');
    const files = this.findFiles(srcPath, /\.ts$/);

    for (const file of files) {
      // Skip test files and example files
      if (
        file.includes('.spec.ts') ||
        file.includes('.test.ts') ||
        file.includes('example')
      )
        continue;

      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(this.basePath, file);

      for (const { pattern, name } of patterns) {
        const matches = content.match(pattern);
        if (
          matches &&
          !content.includes('process.env') &&
          !content.includes('ConfigService')
        ) {
          await this.createFinding({
            title: `Potential hardcoded ${name} detected`,
            description: `Found potential hardcoded ${name} in source code`,
            severity: FindingSeverity.CRITICAL,
            component: 'Secrets Management',
            file: relativePath,
            remediation:
              'Move secrets to environment variables or secrets manager',
          });
        }
      }
    }
  }

  private async checkSQLInjection(): Promise<void> {
    this.logger.log('Checking for SQL injection vulnerabilities...');

    const patterns = [
      /executeQuery\s*\(\s*`/,
      /query\s*\(\s*`/,
      /raw\s*\(\s*`/,
      /\.query\s*\(\s*['"]/,
    ];

    const files = this.findFiles(path.join(this.basePath, 'src'), /\.ts$/);

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');

      // Skip if using ORM properly
      if (
        content.includes('MikroORM') ||
        content.includes('EntityRepository')
      ) {
        continue;
      }

      for (const pattern of patterns) {
        if (pattern.test(content)) {
          await this.createFinding({
            title: 'Potential raw SQL query detected',
            description: 'Raw SQL queries may be vulnerable to SQL injection',
            severity: FindingSeverity.HIGH,
            component: 'Database Security',
            file: path.relative(this.basePath, file),
            remediation:
              'Use parameterized queries or ORM methods instead of raw SQL',
          });
        }
      }
    }
  }

  private async checkCommandInjection(): Promise<void> {
    this.logger.log('Checking for command injection vulnerabilities...');

    const patterns = [
      /exec\s*\(/,
      /execSync\s*\(/,
      /spawn\s*\(/,
      /spawnSync\s*\(/,
    ];

    const files = this.findFiles(path.join(this.basePath, 'src'), /\.ts$/);

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(this.basePath, file);

      // Skip utility files that legitimately use exec
      if (relativePath.includes('util') || relativePath.includes('helper'))
        continue;

      for (const pattern of patterns) {
        if (pattern.test(content) && !content.includes('// safe:')) {
          await this.createFinding({
            title: 'Potential command injection risk',
            description:
              'Child process execution detected without safety comment',
            severity: FindingSeverity.MEDIUM,
            component: 'Command Security',
            file: relativePath,
            remediation:
              'Ensure all user input is sanitized before command execution, or use safe alternatives',
          });
        }
      }
    }
  }

  private async checkHardcodedCredentials(): Promise<void> {
    this.logger.log('Checking for hardcoded credentials...');

    const patterns = [
      /['"]admin['"]/i,
      /['"]password['"]/i,
      /['"]changeme['"]/i,
      /['"]test123['"]/i,
    ];

    const configFiles = [
      path.join(this.basePath, '.env'),
      path.join(this.basePath, 'docker-compose.yml'),
      path.join(this.basePath, 'nestjs-backend', '.env'),
    ];

    for (const file of configFiles) {
      if (!fs.existsSync(file)) continue;

      const content = fs.readFileSync(file, 'utf-8');

      for (const pattern of patterns) {
        if (pattern.test(content)) {
          await this.createFinding({
            title: 'Default or weak credential detected',
            description: `Found weak/default credential pattern in ${path.basename(file)}`,
            severity: FindingSeverity.CRITICAL,
            component: 'Credentials',
            file: path.relative(this.basePath, file),
            remediation: 'Replace with strong, randomly generated credentials',
          });
        }
      }
    }
  }

  private async checkDebugCode(): Promise<void> {
    this.logger.log('Checking for debug code...');

    const patterns = [
      { pattern: /console\.log\s*\(/, name: 'console.log' },
      { pattern: /debugger\s*;/, name: 'debugger statement' },
      { pattern: /\/\/\s*TODO/i, name: 'TODO comment' },
      { pattern: /\/\/\s*FIXME/i, name: 'FIXME comment' },
    ];

    const srcFiles = this.findFiles(path.join(this.basePath, 'src'), /\.ts$/);
    let debugCount = 0;

    for (const file of srcFiles) {
      // Skip test files
      if (file.includes('.spec.ts') || file.includes('.test.ts')) continue;

      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(this.basePath, file);

      for (const { pattern, name } of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          debugCount += matches.length;
          // Only report first occurrence per file per pattern
          await this.createFinding({
            title: `${name} found in production code`,
            description: `Found ${matches.length} occurrence(s) of ${name} in ${relativePath}`,
            severity:
              name.includes('console.log') || name.includes('debugger')
                ? FindingSeverity.HIGH
                : FindingSeverity.LOW,
            component: 'Code Quality',
            file: relativePath,
            remediation: `Remove ${name} statements before production deployment`,
          });
        }
      }
    }
  }

  private async checkRateLimiting(): Promise<void> {
    this.logger.log('Checking rate limiting configuration...');

    const mainPath = path.join(this.basePath, 'src', 'main.ts');
    if (fs.existsSync(mainPath)) {
      const content = fs.readFileSync(mainPath, 'utf-8');

      if (!content.includes('Throttler') && !content.includes('throttle')) {
        await this.createFinding({
          title: 'Rate limiting not configured',
          description: 'API endpoints may be vulnerable to DoS attacks',
          severity: FindingSeverity.HIGH,
          component: 'Rate Limiting',
          file: 'src/main.ts',
          remediation: 'Configure ThrottlerModule with appropriate limits',
        });
      }
    }
  }

  private async calculateSecurityScore(): Promise<number> {
    const findings = await this.findingRepo.findAll({
      where: {
        category: ReadinessCategory.SECURITY,
        status: FindingStatus.OPEN,
      },
    });

    const severityWeights = {
      [FindingSeverity.CRITICAL]: 25,
      [FindingSeverity.HIGH]: 15,
      [FindingSeverity.MEDIUM]: 8,
      [FindingSeverity.LOW]: 3,
      [FindingSeverity.INFO]: 1,
    };

    let totalDeductions = 0;
    for (const finding of findings) {
      totalDeductions += severityWeights[finding.severity];
    }

    // Start at 100 and deduct based on findings
    const score = Math.max(0, 100 - totalDeductions);
    return score;
  }

  private async createFinding(data: {
    title: string;
    description: string;
    severity: FindingSeverity;
    component: string;
    file?: string;
    remediation?: string;
  }): Promise<void> {
    await this.em.persistAndFlush(
      this.findingRepo.create({
        ...data,
        category: ReadinessCategory.SECURITY,
        status: FindingStatus.OPEN,
      }),
    );
  }

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

  getSecurityScore(): number {
    return this.securityScore;
  }
}

export interface SecurityScanResult {
  scannedAt: Date;
  findings: any[];
  score: number;
  status: 'READY' | 'NEEDS_ATTENTION' | 'CRITICAL_ISSUES';
}
