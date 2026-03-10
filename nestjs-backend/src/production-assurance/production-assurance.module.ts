import { Module, Global, OnModuleInit } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ScheduleModule } from '@nestjs/schedule';
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
import { ProductionAssuranceController } from './production-assurance.controller';
import { ProductionReadinessReport } from './entities/production-readiness-report.entity';
import { AuditFinding } from './entities/audit-finding.entity';
import { SystemHealthMetric } from './entities/system-health-metric.entity';
import { ExecutionTrace as ExecutionTraceEntity } from './entities/execution-trace.entity';
import { RecoveryAction } from './entities/recovery-action.entity';

@Global()
@Module({
  imports: [
    ScheduleModule.forRoot(),
    MikroOrmModule.forFeature([
      ProductionReadinessReport,
      AuditFinding,
      SystemHealthMetric,
      ExecutionTraceEntity,
      RecoveryAction,
    ]),
  ],
  controllers: [ProductionAssuranceController],
  providers: [
    ArchitectureAnalyzerService,
    CodebaseAuditorService,
    SecurityScannerService,
    DataIntegrityValidatorService,
    RagPipelineVerifierService,
    ExecutionTraceService,
    SelfHealingOrchestratorService,
    LoadTestingService,
    ObservabilityEngineService,
    DeploymentSafetyGateService,
    ContinuousAuditService,
  ],
  exports: [
    ArchitectureAnalyzerService,
    CodebaseAuditorService,
    SecurityScannerService,
    DataIntegrityValidatorService,
    RagPipelineVerifierService,
    ExecutionTraceService,
    SelfHealingOrchestratorService,
    LoadTestingService,
    ObservabilityEngineService,
    DeploymentSafetyGateService,
    ContinuousAuditService,
  ],
})
export class ProductionAssuranceModule implements OnModuleInit {
  constructor(
    private readonly architectureAnalyzer: ArchitectureAnalyzerService,
    private readonly observabilityEngine: ObservabilityEngineService,
    private readonly continuousAudit: ContinuousAuditService,
  ) {}

  async onModuleInit() {
    // Initialize observability engine
    await this.observabilityEngine.initialize();

    // Run initial architecture analysis
    await this.architectureAnalyzer.analyze();

    // Start continuous audit loop
    await this.continuousAudit.start();
  }
}
