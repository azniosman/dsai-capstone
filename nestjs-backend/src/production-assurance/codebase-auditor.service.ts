import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import {
  AuditFinding,
  FindingSeverity,
  FindingStatus,
  ReadinessCategory,
} from './entities/audit-finding.entity';
import * as fs from 'fs';
import * as path from 'path';

export interface CodebaseAuditResult {
  auditedAt: Date;
  filesScanned: number;
  totalLines: number;
  findings: {
    unusedCode: number;
    deprecatedDependencies: number;
    deadEndpoints: number;
    debugCode: number;
    hardcodedCredentials: number;
    duplicateFunctions: number;
    largeFiles: number;
  };
  refactoringRoadmap: RefactoringRecommendation[];
}

export interface RefactoringRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  description: string;
  affectedFiles: string[];
  estimatedEffort: 'small' | 'medium' | 'large';
}

@Injectable()
export class CodebaseAuditorService {
  private readonly logger = new Logger(CodebaseAuditorService.name);
  private readonly basePath: string = path.join(__dirname, '../../..');
  private lastAuditResult: CodebaseAuditResult | null = null;

  constructor(
    @InjectRepository(AuditFinding)
    private readonly findingRepo: EntityRepository<AuditFinding>,
    private readonly em: EntityManager,
  ) {}

  /**
   * Perform comprehensive codebase audit
   */
  async audit(): Promise<CodebaseAuditResult> {
    this.logger.log('Starting codebase audit...');

    const result: CodebaseAuditResult = {
      auditedAt: new Date(),
      filesScanned: 0,
      totalLines: 0,
      findings: {
        unusedCode: 0,
        deprecatedDependencies: 0,
        deadEndpoints: 0,
        debugCode: 0,
        hardcodedCredentials: 0,
        duplicateFunctions: 0,
        largeFiles: 0,
      },
      refactoringRoadmap: [],
    };

    const srcPath = path.join(this.basePath, 'nestjs-backend', 'src');
    const files = this.findFiles(srcPath, /\.ts$/);

    result.filesScanned = files.length;

    // Analyze each file
    const fileAnalysis: FileAnalysis[] = [];
    for (const file of files) {
      // Skip test files and generated files
      if (
        file.includes('.spec.ts') ||
        file.includes('.test.ts') ||
        file.includes('node_modules')
      ) {
        continue;
      }

      const analysis = await this.analyzeFile(file);
      fileAnalysis.push(analysis);
      result.totalLines += analysis.lines;
    }

    // Aggregate findings
    for (const analysis of fileAnalysis) {
      result.findings.debugCode += analysis.issues.debugCode;
      result.findings.hardcodedCredentials +=
        analysis.issues.hardcodedCredentials;
      result.findings.largeFiles += analysis.issues.largeFile ? 1 : 0;
      result.findings.unusedCode += analysis.issues.unusedImports;
    }

    // Generate refactoring roadmap
    result.refactoringRoadmap =
      await this.generateRefactoringRoadmap(fileAnalysis);

    // Create findings in database
    await this.createFindings(result, fileAnalysis);

    this.lastAuditResult = result;
    this.logger.log(
      `Codebase audit complete. Scanned ${result.filesScanned} files, ${result.totalLines} lines`,
    );

    return result;
  }

  private async analyzeFile(filePath: string): Promise<FileAnalysis> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const relativePath = path.relative(this.basePath, filePath);

    const analysis: FileAnalysis = {
      path: relativePath,
      lines: lines.length,
      size: fs.statSync(filePath).size,
      issues: {
        debugCode: 0,
        hardcodedCredentials: 0,
        unusedImports: 0,
        largeFile: false,
        todos: 0,
        fixmes: 0,
      },
      details: [],
    };

    // Check for debug code
    const debugPatterns = [
      { pattern: /console\.log\s*\(/i, name: 'console.log' },
      { pattern: /debugger\s*;/i, name: 'debugger' },
      { pattern: /\.env\.example/i, name: 'env example reference' },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const { pattern, name } of debugPatterns) {
        if (pattern.test(line) && !line.trim().startsWith('//')) {
          analysis.issues.debugCode++;
          analysis.details.push({
            line: i + 1,
            type: 'debug_code',
            message: `Found ${name}`,
          });
        }
      }

      // Check for TODOs and FIXMEs
      if (/\/\/\s*TODO/i.test(line)) {
        analysis.issues.todos++;
      }
      if (/\/\/\s*FIXME/i.test(line)) {
        analysis.issues.fixmes++;
      }

      // Check for hardcoded credentials
      const credentialPatterns = [
        /['"]password['"]\s*[:=]\s*['"][^'"]+['"]/i,
        /['"]secret['"]\s*[:=]\s*['"][^'"]+['"]/i,
        /['"]api[_-]?key['"]\s*[:=]\s*['"][^'"]+['"]/i,
        /['"]changeme['"]/i,
        /['"]admin123['"]/i,
        /['"]test123['"]/i,
      ];

      for (const pattern of credentialPatterns) {
        if (pattern.test(line) && !line.includes('process.env')) {
          analysis.issues.hardcodedCredentials++;
          analysis.details.push({
            line: i + 1,
            type: 'hardcoded_credential',
            message: 'Potential hardcoded credential',
          });
        }
      }
    }

    // Check file size
    if (analysis.size > 100000) {
      // > 100KB
      analysis.issues.largeFile = true;
      analysis.details.push({
        line: 0,
        type: 'large_file',
        message: `File is ${(analysis.size / 1024).toFixed(1)}KB`,
      });
    }

    // Check for unused imports (simple heuristic)
    const importLines = lines.filter((l) => l.match(/^import\s+/));
    for (const importLine of importLines) {
      const match = importLine.match(
        /import\s+.*?\s+from\s+['"].*?\/(.+?)['"]/,
      );
      if (match) {
        const importedName = match[1].replace('.ts', '');
        // Check if the imported name is used in the file
        const usagePattern = new RegExp(`\\b${importedName}\\b`);
        let usageCount = 0;
        for (const line of lines) {
          const matches = line.match(usagePattern);
          if (matches) usageCount += matches.length;
        }

        // If only appears in import line, likely unused
        if (usageCount <= 1) {
          analysis.issues.unusedImports++;
        }
      }
    }

    return analysis;
  }

  private async generateRefactoringRoadmap(
    analyses: FileAnalysis[],
  ): Promise<RefactoringRecommendation[]> {
    const roadmap: RefactoringRecommendation[] = [];

    // Large files
    const largeFiles = analyses.filter((a) => a.issues.largeFile);
    if (largeFiles.length > 0) {
      roadmap.push({
        priority: 'high',
        category: 'Code Organization',
        description: 'Split large files into smaller, focused modules',
        affectedFiles: largeFiles.map((a) => a.path),
        estimatedEffort: largeFiles.length > 5 ? 'large' : 'medium',
      });
    }

    // Files with hardcoded credentials
    const credentialFiles = analyses.filter(
      (a) => a.issues.hardcodedCredentials > 0,
    );
    if (credentialFiles.length > 0) {
      roadmap.push({
        priority: 'critical',
        category: 'Security',
        description:
          'Remove hardcoded credentials and use environment variables',
        affectedFiles: credentialFiles.map((a) => a.path),
        estimatedEffort: 'small',
      });
    }

    // Files with debug code
    const debugFiles = analyses.filter((a) => a.issues.debugCode > 0);
    if (debugFiles.length > 0) {
      roadmap.push({
        priority: 'high',
        category: 'Code Quality',
        description: 'Remove debug statements before production',
        affectedFiles: debugFiles.map((a) => a.path),
        estimatedEffort: 'small',
      });
    }

    // High TODO count
    const todoFiles = analyses.filter((a) => a.issues.todos > 3);
    if (todoFiles.length > 0) {
      roadmap.push({
        priority: 'medium',
        category: 'Technical Debt',
        description: 'Address accumulated TODO comments',
        affectedFiles: todoFiles.map((a) => a.path),
        estimatedEffort: 'medium',
      });
    }

    // Files with unused imports
    const unusedImportFiles = analyses.filter(
      (a) => a.issues.unusedImports > 2,
    );
    if (unusedImportFiles.length > 0) {
      roadmap.push({
        priority: 'low',
        category: 'Code Quality',
        description: 'Remove unused imports to improve build times',
        affectedFiles: unusedImportFiles.map((a) => a.path),
        estimatedEffort: 'small',
      });
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    roadmap.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
    );

    return roadmap;
  }

  private async createFindings(
    result: CodebaseAuditResult,
    analyses: FileAnalysis[],
  ): Promise<void> {
    // Create findings for critical issues
    for (const analysis of analyses) {
      if (analysis.issues.hardcodedCredentials > 0) {
        await this.em.persistAndFlush(
          this.findingRepo.create({
            title: `Hardcoded credentials in ${path.basename(analysis.path)}`,
            description: `Found ${analysis.issues.hardcodedCredentials} potential hardcoded credential(s)`,
            severity: FindingSeverity.CRITICAL,
            status: FindingStatus.OPEN,
            category: ReadinessCategory.SECURITY,
            component: 'Codebase',
            file: analysis.path,
            remediation:
              'Move credentials to environment variables or secrets manager',
            occurrences: analysis.issues.hardcodedCredentials,
          }),
        );
      }

      if (analysis.issues.largeFile) {
        await this.em.persistAndFlush(
          this.findingRepo.create({
            title: `Large file: ${path.basename(analysis.path)}`,
            description: `File is ${(analysis.size / 1024).toFixed(1)}KB, consider splitting`,
            severity: FindingSeverity.MEDIUM,
            status: FindingStatus.OPEN,
            category: ReadinessCategory.ARCHITECTURE,
            component: 'Codebase',
            file: analysis.path,
            remediation:
              'Split into smaller, focused modules following single responsibility principle',
          }),
        );
      }

      if (analysis.issues.debugCode > 2) {
        await this.em.persistAndFlush(
          this.findingRepo.create({
            title: `Debug code in ${path.basename(analysis.path)}`,
            description: `Found ${analysis.issues.debugCode} debug statement(s)`,
            severity: FindingSeverity.HIGH,
            status: FindingStatus.OPEN,
            category: ReadinessCategory.ARCHITECTURE,
            component: 'Codebase',
            file: analysis.path,
            remediation: 'Remove debug statements before production deployment',
            occurrences: analysis.issues.debugCode,
          }),
        );
      }
    }
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

  getLastAuditResult(): CodebaseAuditResult | null {
    return this.lastAuditResult;
  }
}

interface FileAnalysis {
  path: string;
  lines: number;
  size: number;
  issues: {
    debugCode: number;
    hardcodedCredentials: number;
    unusedImports: number;
    largeFile: boolean;
    todos: number;
    fixmes: number;
  };
  details: Array<{ line: number; type: string; message: string }>;
}
