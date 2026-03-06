import json
import time
import logging
import uuid
import traceback
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Tuple
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone

# ─── LOGGING SETUP ────────────────────────────────────────────────────────
logger = logging.getLogger("rag_pipeline")
logger.setLevel(logging.INFO)
# In production, attach a JSON handler. For now, a simple stream handler
if not logger.handlers:
    sh = logging.StreamHandler()
    logger.addHandler(sh)


# ─── ENUMS AND DATA CLASSES ──────────────────────────────────────────────
class PipelineStep(str, Enum):
    USER_QUERY = "User Query"
    EMBEDDING = "Embedding"
    VECTOR_DB_SEARCH = "Vector DB Search"
    DOCUMENT_RETRIEVAL = "Document Retrieval"
    CONTEXT_BUILDER = "Context Builder"
    LLM_ENGINE = "LLM Engine"
    RESPONSE = "Response"


class StepStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


@dataclass
class StepLog:
    step: PipelineStep
    status: StepStatus
    start_time: str
    end_time: Optional[str] = None
    duration_ms: Optional[float] = None
    attempts: int = 1
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self):
        return asdict(self)


@dataclass
class RAGContext:
    trace_id: str
    query: str
    session_id: str
    status: str = "IN_PROGRESS"
    current_step: PipelineStep = PipelineStep.USER_QUERY
    # State payload built up across the pipeline
    payload: Dict[str, Any] = field(default_factory=dict)
    # The history of executed steps
    logs: List[StepLog] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ─── EXCEPTIONS ───────────────────────────────────────────────────────────
class RAGPipelineError(Exception):
    """Base exception for pipeline failures."""
    pass


class MaxRetriesExceededError(RAGPipelineError):
    """Raised when a pipeline step exhausts its retry allowance."""
    pass


# ─── INTERFACES (To be implemented by system integrations) ─────────────
class StatePersistenceBackend:
    """Abstract interface for storing and retrieving failed pipelines for resuming."""
    
    def save_state(self, context: RAGContext) -> None:
        """Persists the serialized context to a queue (e.g. SQS) or DB (e.g. DynamoDB/Redis)."""
        logger.info(f"Persisting state for Trace {context.trace_id} | Status: {context.status}")
        pass
        
    def load_state(self, trace_id: str) -> Optional[RAGContext]:
        """Loads a failed context to resume execution."""
        return None


class MetricsBackend:
    """Abstract interface for integrating with monitoring dashboards (e.g. CloudWatch, Frontend Dashboard)."""
    
    def emit_log(self, trace_id: str, log: StepLog) -> None:
        """Emit real-time JSON log optimized for the frontend Interceptor Stream."""
        pass


# ─── CORE ORCHESTRATOR ──────────────────────────────────────────────────
class RAGPipelineManager:
    """
    Fault-tolerant, observable RAG Pipeline Orchestrator.
    Handles exact-step logging, infinite state-machine resume capabilities, 
    automatic localized retries, and dependent-step skipping.
    """
    
    # Ordered progression mapping.
    PIPELINE_FLOW = [
        PipelineStep.USER_QUERY,
        PipelineStep.EMBEDDING,
        PipelineStep.VECTOR_DB_SEARCH,
        PipelineStep.DOCUMENT_RETRIEVAL,
        PipelineStep.CONTEXT_BUILDER,
        PipelineStep.LLM_ENGINE,
        PipelineStep.RESPONSE
    ]
    
    def __init__(
        self, 
        persistence: StatePersistenceBackend, 
        metrics: MetricsBackend,
        default_retries: int = 3,
        backoff_factor: float = 1.5
    ):
        self.persistence = persistence
        self.metrics = metrics
        self.default_retries = default_retries
        self.backoff_factor = backoff_factor
        
        # Step execution implementations registry
        self._step_handlers: Dict[PipelineStep, Callable[[RAGContext], Dict[str, Any]]] = {}
        
    def register_step(self, step: PipelineStep, handler: Callable[[RAGContext], Dict[str, Any]]):
        """Register the actual business logic function for a given pipeline step."""
        self._step_handlers[step] = handler

    def initialize_query(self, query: str, session_id: str = None) -> RAGContext:
        """Start a new pipeline execution."""
        trace_id = f"rag_{uuid.uuid4().hex[:12]}"
        return RAGContext(
            trace_id=trace_id,
            query=query,
            session_id=session_id or str(uuid.uuid4())
        )

    def _execute_with_retry(
        self, 
        step: PipelineStep, 
        context: RAGContext, 
        handler: Callable[[RAGContext], Dict[str, Any]],
        max_retries: int
    ) -> StepLog:
        """Executes a single step with exponential backoff and localized retries."""
        
        step_log = StepLog(
            step=step,
            status=StepStatus.RUNNING,
            start_time=datetime.now(timezone.utc).isoformat(),
            attempts=0
        )
        
        for attempt in range(1, max_retries + 1):
            step_log.attempts = attempt
            start_t = time.perf_counter()
            
            try:
                # ── EXECUTION ──
                result_metadata = handler(context)
                
                # Update context payload globally and log success
                if result_metadata:
                    context.payload.update(result_metadata)
                    step_log.metadata = result_metadata
                    
                step_log.status = StepStatus.COMPLETED
                break
                
            except Exception as e:
                err_msg = f"{type(e).__name__}: {str(e)}"
                logger.warning(f"Trace {context.trace_id} | {step} attempt {attempt} failed: {err_msg}")
                step_log.error = err_msg
                step_log.metadata["traceback"] = traceback.format_exc()
                
                if attempt == max_retries:
                    step_log.status = StepStatus.FAILED
                else:
                    # Exponential Backoff
                    time.sleep((self.backoff_factor ** attempt))
                    
        # Finalize metrics
        end_t = time.perf_counter()
        step_log.end_time = datetime.now(timezone.utc).isoformat()
        step_log.duration_ms = round((end_t - start_t) * 1000, 2)
        
        return step_log

    def run(self, context: RAGContext) -> RAGContext:
        """
        Executes the RAG pipeline starting from its current_step.
        Safely resumes previously failed contexts.
        """
        
        start_index = self.PIPELINE_FLOW.index(context.current_step)
        
        for step in self.PIPELINE_FLOW[start_index:]:
            context.current_step = step
            context.updated_at = datetime.now(timezone.utc).isoformat()
            
            # If the pipeline is marked as failed, safely cascade SKIP state across downstream
            if context.status == "FAILED":
                skip_log = StepLog(
                    step=step,
                    status=StepStatus.SKIPPED,
                    start_time=datetime.now(timezone.utc).isoformat()
                )
                context.logs.append(skip_log)
                self.metrics.emit_log(context.trace_id, skip_log)
                continue
                
            handler = self._step_handlers.get(step)
            if not handler:
                raise NotImplementedError(f"No handler registered for {step.value}")
                
            logger.info(f"Trace {context.trace_id} | Executing {step.value}")
            step_log = self._execute_with_retry(
                step=step, 
                context=context, 
                handler=handler, 
                max_retries=self.default_retries
            )
            
            context.logs.append(step_log)
            self.metrics.emit_log(context.trace_id, step_log)
            
            if step_log.status == StepStatus.FAILED:
                # Halt active execution, flag for persistence & future retry cycle
                context.status = "FAILED"
                logger.error(f"Trace {context.trace_id} | Critical Failure at {step.value}. Halting and Persisting state.")
                
        # Persist final state (either COMPLETED or FAILED for later queue processing)
        if context.status != "FAILED":
            context.status = "COMPLETED"
        self.persistence.save_state(context)
        
        return context


# ─── DASHBOARD QUERY METRICS ─────────────────────────────────────────────
class RAGMonitoringDashboard:
    """Helper module to extract visualization insights requested by logs frontend."""
    
    @staticmethod
    def extract_pipeline_metrics(context: RAGContext) -> Dict[str, Any]:
        """Provides an API-friendly payload showing sequence layout, durations, and bottlenecks."""
        total_duration = sum(log.duration_ms or 0 for log in context.logs)
        
        steps = []
        for log in context.logs:
            steps.append({
                "stage": log.step.value,
                "status": log.status.value,
                "duration_ms": log.duration_ms,
                "retries": log.attempts - 1,
                "error": log.error if log.status == StepStatus.FAILED else None,
                "io_tokens": log.metadata.get("tokens"),
                "top_k": log.metadata.get("top_k"),
                "doc_count": log.metadata.get("doc_count")
            })
            
        return {
            "trace_id": context.trace_id,
            "session_id": context.session_id,
            "overall_status": context.status,
            "total_duration_ms": round(total_duration, 2),
            "created_at": context.created_at,
            "steps": steps
        }


# ─── EXAMPLE INTEGRATION / USAGE ─────────────────────────────────────────
if __name__ == "__main__":
    # 1. Initialize dependencies
    class DummyPersistence(StatePersistenceBackend):
        def save_state(self, ctx):
            with open(f"/tmp/{ctx.trace_id}.json", "w") as f:
                json.dump(asdict(ctx), f, indent=2)

    class DummyMetrics(MetricsBackend):
        def emit_log(self, trace_id, log):
            print(f"[{trace_id}] STREAM -> {log.step.value}: {log.status.value} ({log.duration_ms}ms)")

    manager = RAGPipelineManager(
        persistence=DummyPersistence(), 
        metrics=DummyMetrics(),
        default_retries=2
    )
    
    # 2. Register mock handlers for each exact requested step
    def handle_user_query(ctx: RAGContext):
        return {"query_length": len(ctx.query), "raw_input": ctx.query}
        
    def handle_embedding(ctx: RAGContext):
        # Simulated failure for demonstration
        if not ctx.query:
            raise ValueError("Query cannot be empty for embedding")
        # Returns metadata like token counts
        return {"tokens": 12, "model": "text-embedding-3-small"}
        
    def handle_vector_db_search(ctx: RAGContext):
        return {"top_k": 5, "vector_engine": "pgvector", "similarity_threshold": 0.75}

    def handle_doc_retrieval(ctx: RAGContext):
        return {"doc_count": 3, "doc_ids": ["doc_001", "doc_042", "doc_099"]}
        
    def handle_context_builder(ctx: RAGContext):
        return {"context_length": 1540, "chunks_merged": 3}
        
    def handle_llm_engine(ctx: RAGContext):
        # Fake crash on first attempt logic can be implemented inside the execution 
        return {"tokens": {"input": 1552, "output": 250}, "model": "claude-3-haiku"}
        
    def handle_response(ctx: RAGContext):
        return {"status_code": 200, "final_response": "Here is your synthesized RAG response."}

    # Bind handlers
    manager.register_step(PipelineStep.USER_QUERY, handle_user_query)
    manager.register_step(PipelineStep.EMBEDDING, handle_embedding)
    manager.register_step(PipelineStep.VECTOR_DB_SEARCH, handle_vector_db_search)
    manager.register_step(PipelineStep.DOCUMENT_RETRIEVAL, handle_doc_retrieval)
    manager.register_step(PipelineStep.CONTEXT_BUILDER, handle_context_builder)
    manager.register_step(PipelineStep.LLM_ENGINE, handle_llm_engine)
    manager.register_step(PipelineStep.RESPONSE, handle_response)
    
    # 3. Execute
    print("\n--- Starting Normal Execution ---")
    query_context = manager.initialize_query("What are the core skills for a cloud engineer?")
    completed_context = manager.run(query_context)
    
    # 4. Extract Dashboard Metrics
    dashboard_data = RAGMonitoringDashboard.extract_pipeline_metrics(completed_context)
    print("\n--- Dashboard Artifact ---")
    print(json.dumps(dashboard_data, indent=2))
