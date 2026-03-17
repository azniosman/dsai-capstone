import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ArchitectureAnalyzerService } from './architecture-analyzer.service';
import { CodebaseAuditorService } from './codebase-auditor.service';
import { SecurityScannerService } from './security-scanner.service';
import { DataIntegrityValidatorService } from './data-integrity-validator.service';
import { RagPipelineVerifierService } from './rag-pipeline-verifier.service';
import { ExecutionTraceService } from './execution-trace.service';
import { SelfHealingOrchestratorService } from './self-healing-orchestrator.service';
import { LoadTestingService } from './load-testing.service';
import { ObservabilityEngineService } from './observability-engine.service';
import { DeploymentSafetyGateService } from './deployment-safety-gate.service';
import { ContinuousAuditService } from './continuous-audit.service';
import {
  RecoveryAction,
  RecoveryActionType,
} from './entities/recovery-action.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('production-assurance')
@UseGuards(JwtAuthGuard)
export class ProductionAssuranceController {
  constructor(
    private readonly architectureAnalyzer: ArchitectureAnalyzerService,
    private readonly codebaseAuditor: CodebaseAuditorService,
    private readonly securityScanner: SecurityScannerService,
    private readonly dataIntegrityValidator: DataIntegrityValidatorService,
    private readonly ragPipelineVerifier: RagPipelineVerifierService,
    private readonly executionTrace: ExecutionTraceService,
    private readonly selfHealing: SelfHealingOrchestratorService,
    private readonly loadTesting: LoadTestingService,
    private readonly observability: ObservabilityEngineService,
    private readonly deploymentGate: DeploymentSafetyGateService,
    private readonly continuousAudit: ContinuousAuditService,
  ) {}

  /**
   * Architecture Analysis
   */
  @Get('architecture')
  async getArchitecture() {
    return this.architectureAnalyzer.getArchitectureMap();
  }

  @Post('architecture/analyze')
  async runArchitectureAnalysis() {
    return await this.architectureAnalyzer.analyze();
  }

  /**
   * Codebase Audit
   */
  @Get('codebase/audit')
  async getCodebaseAudit() {
    return this.codebaseAuditor.getLastAuditResult();
  }

  @Post('codebase/audit')
  async runCodebaseAudit() {
    return await this.codebaseAuditor.audit();
  }

  /**
   * Security Scanning
   */
  @Get('security/scan')
  async getSecurityScan() {
    return { score: this.securityScanner.getSecurityScore() };
  }

  @Post('security/scan')
  async runSecurityScan() {
    return await this.securityScanner.scan();
  }

  /**
   * Data Integrity
   */
  @Get('data/integrity')
  async getDataIntegrity() {
    return { score: this.dataIntegrityValidator.getIntegrityScore() };
  }

  @Post('data/integrity/validate')
  async runDataIntegrityValidation() {
    return await this.dataIntegrityValidator.validate();
  }

  /**
   * RAG Pipeline Verification
   */
  @Get('rag/health')
  async getRagHealth() {
    return this.ragPipelineVerifier.getHealthStatus();
  }

  @Post('rag/verify')
  async runRagVerification() {
    return await this.ragPipelineVerifier.verify();
  }

  @Post('rag/verify/embedding')
  async verifyEmbedding(@Query('query') query: string) {
    return await this.ragPipelineVerifier.verifyEmbeddingGeneration(
      query || 'test',
    );
  }

  @Post('rag/verify/vector-search')
  async verifyVectorSearch() {
    return await this.ragPipelineVerifier.verifyVectorSearch(
      new Array(384).fill(0),
    );
  }

  /**
   * Execution Tracing
   */
  @Get('traces')
  async getTraces(@Query('limit') limit: number = 50) {
    return await this.executionTrace.getRecentFailures(limit);
  }

  @Get('traces/stats')
  async getTraceStats(@Query('hours') hours: number = 24) {
    return await this.executionTrace.getTraceStats(hours);
  }

  @Get('traces/:traceId')
  async getTrace(@Param('traceId') traceId: string) {
    return await this.executionTrace.getTrace(traceId);
  }

  /**
   * Self-Healing
   */
  @Get('recovery/history')
  async getRecoveryHistory(@Query('limit') limit: number = 50) {
    return await this.selfHealing.getRecoveryHistory(limit);
  }

  @Get('recovery/stats')
  async getRecoveryStats(@Query('hours') hours: number = 24) {
    return await this.selfHealing.getRecoveryStats(hours);
  }

  @Post('recovery/trigger')
  async triggerRecovery(
    @Query('type') type: RecoveryActionType,
    @Query('description') description: string,
    @Query('service') service?: string,
    @Query('component') component?: string,
  ) {
    const actionId = await this.selfHealing.triggerRecovery(
      type,
      description,
      service,
      component,
    );
    return { actionId };
  }

  /**
   * Load Testing
   */
  @Get('load-test/default-config')
  async getDefaultLoadTestConfig() {
    return this.loadTesting.getDefaultConfig();
  }

  @Post('load-test/run')
  async runLoadTest(
    @Query('users') users?: number,
    @Query('duration') duration?: number,
  ) {
    const config = this.loadTesting.getDefaultConfig();
    if (users) config.concurrentUsers = parseInt(String(users));
    if (duration) config.durationSeconds = parseInt(String(duration));
    return await this.loadTesting.runLoadTest(config);
  }

  @Get('load-test/quick-check')
  async runQuickPerformanceCheck() {
    return await this.loadTesting.quickPerformanceCheck();
  }

  /**
   * Observability
   */
  @Get('health')
  async getSystemHealth() {
    return this.observability.getHealthStatus();
  }

  @Get('health/services')
  async getServiceHealth() {
    return this.observability.getAllServices();
  }

  @Get('health/alerts')
  async getActiveAlerts() {
    return this.observability.getActiveAlerts();
  }

  @Post('health/alerts/:alertId/acknowledge')
  async acknowledgeAlert(@Param('alertId') alertId: string) {
    await this.observability.acknowledgeAlert(alertId);
    return { acknowledged: true };
  }

  @Get('metrics/:name/history')
  async getMetricHistory(
    @Param('name') name: string,
    @Query('limit') limit: number = 50,
  ) {
    return this.observability.getMetricsHistory(name, limit);
  }

  /**
   * Deployment Safety Gate
   */
  @Get('deployment/status')
  async getDeploymentStatus() {
    return this.deploymentGate.getLastValidation();
  }

  @Post('deployment/validate')
  async runDeploymentValidation() {
    return await this.deploymentGate.validateForDeployment();
  }

  @Get('deployment/quick-check')
  async runQuickHealthCheck() {
    return await this.deploymentGate.quickHealthCheck();
  }

  /**
   * Continuous Audit
   */
  @Get('audit/last')
  async getLastAudit() {
    return this.continuousAudit.getLastAuditResult();
  }

  @Post('audit/run')
  async runAudit() {
    return await this.continuousAudit.runAudit();
  }

  @Get('audit/history')
  async getAuditHistory(@Query('limit') limit: number = 10) {
    return await this.continuousAudit.getAuditHistory(limit);
  }

  @Get('audit/readiness')
  async getReadinessSummary() {
    return await this.continuousAudit.getReadinessSummary();
  }

  /**
   * Full Production Readiness Report
   */
  @Post('report/generate')
  async generateFullReport() {
    // Run all checks
    const architecture = await this.architectureAnalyzer.analyze();
    const security = await this.securityScanner.scan();
    const dataIntegrity = await this.dataIntegrityValidator.validate();
    const ragHealth = await this.ragPipelineVerifier.verify();
    const audit = await this.continuousAudit.runAudit();

    return {
      generatedAt: new Date(),
      architecture,
      security,
      dataIntegrity,
      ragPipeline: ragHealth,
      audit,
      overallReadiness: audit.scores.overall,
      canDeployToProduction: audit.status === 'READY',
    };
  }
}
