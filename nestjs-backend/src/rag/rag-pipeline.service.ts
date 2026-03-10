import { Injectable, Logger } from '@nestjs/common';
import { LogBusService } from '@app/common/log-bus.service';

export type PipelineStep =
  | 'User Query'
  | 'Embedding'
  | 'Vector DB Search'
  | 'Document Retrieval'
  | 'Context Builder'
  | 'LLM Engine'
  | 'Response';

export type StepStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED';

export interface RagContext {
  traceId: string;
  hasCriticalFailure: boolean;
}

@Injectable()
export class RagPipelineService {
  private readonly logger = new Logger(RagPipelineService.name);

  constructor(private readonly logBus: LogBusService) {}

  createContext(traceId?: string): RagContext {
    return {
      traceId: traceId || `rag_${Math.random().toString(36).substring(2, 10)}`,
      hasCriticalFailure: false,
    };
  }

  /**
   * Orchestrates a specific pipeline step. Emits detailed structured JSON telemetry
   * logs containing duration, retries, status, and custom metadata for exact
   * frontend dashboard reconstruction.
   */
  async runStep<T>(
    context: RagContext,
    step: PipelineStep,
    fn: () => Promise<T>,
    options?: { maxRetries?: number; isCritical?: boolean; metadata?: any },
  ): Promise<T | null> {
    const { maxRetries = 1, isCritical = true, metadata = {} } = options || {};

    if (context.hasCriticalFailure) {
      this.emitLog(context.traceId, step, 'SKIPPED', 0, 0, metadata);
      return null as any;
    }

    this.emitLog(context.traceId, step, 'RUNNING', 0, 0, metadata);
    let attempts = 0;
    const startTime = Date.now();

    while (attempts < maxRetries) {
      try {
        attempts++;
        const result = await fn();
        const duration = Date.now() - startTime;

        // Append result sizes if arrays
        const resolvedMeta = { ...metadata };
        if (Array.isArray(result)) {
          resolvedMeta.count = result.length;
        } else if (result && typeof result === 'object' && 'length' in result) {
          resolvedMeta.length = (result as any).length;
        }

        this.emitLog(
          context.traceId,
          step,
          'COMPLETED',
          duration,
          attempts,
          resolvedMeta,
        );
        return result;
      } catch (error: any) {
        const duration = Date.now() - startTime;
        this.logger.warn(
          `Step [${step}] attempt ${attempts} failed: ${error?.message || error}`,
        );

        if (attempts >= maxRetries) {
          this.emitLog(context.traceId, step, 'FAILED', duration, attempts, {
            ...metadata,
            error: error?.message || String(error),
          });
          if (isCritical) {
            context.hasCriticalFailure = true;
          }
          throw error;
        }

        // Exponential backoff
        await new Promise((res) => setTimeout(res, 500 * attempts));
      }
    }
    return null;
  }

  private emitLog(
    traceId: string,
    step: PipelineStep,
    status: StepStatus,
    durationMs: number,
    attempts: number,
    metadata: any,
  ) {
    this.logBus.emit({
      type: 'RAG',
      component: 'rag_pipeline',
      message: `${step} executed with status ${status}`,
      traceId,
      meta: {
        step,
        status,
        durationMs,
        attempts,
        ...metadata,
      },
    });
  }
}
