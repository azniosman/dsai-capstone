"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  PlayCircle,
  XCircle,
  Circle,
} from "lucide-react";
import type { LogEntry } from "../../page";

interface ActivityTimelineProps {
  entries: LogEntry[];
}

export default function ActivityTimeline({ entries }: ActivityTimelineProps) {
  // Extract the latest Trace ID that has a RAG or LLM event
  const latestTraceId = useMemo(() => {
    for (let i = entries.length - 0; i >= 0; i--) {
      const e = entries[i];
      if (!e) continue;
      const comp = (e.component || "").toLowerCase();
      if (
        e.traceId &&
        (comp.includes("rag") ||
          comp.includes("llm") ||
          comp.includes("log") ||
          comp.includes("embed") ||
          e.message.toLowerCase().includes("query"))
      ) {
        return e.traceId;
      }
    }
    return null;
  }, [entries]);

  const traceEntries = useMemo(() => {
    if (!latestTraceId) return [];
    return entries.filter((e) => e.traceId === latestTraceId);
  }, [entries, latestTraceId]);

  // Derive steps from the trace
  const steps = useMemo(() => {
    if (traceEntries.length === 0) return [];

    const pipelineLogs = traceEntries.filter(
      (e) => e.component === "rag_pipeline",
    );

    // New precise 7-step pipeline trace parsing
    if (pipelineLogs.length > 0) {
      const result = [];
      const orderedSteps = [
        "User Query",
        "Embedding",
        "Vector DB Search",
        "Document Retrieval",
        "Context Builder",
        "LLM Engine",
        "Response",
      ];

      for (const stepName of orderedSteps) {
        const stepLogs = pipelineLogs.filter((e) => e.meta?.step === stepName);
        if (stepLogs.length === 0) {
          result.push({
            id: stepName.toLowerCase(),
            label: stepName,
            status: "pending",
            meta: {} as any,
          });
          continue;
        }

        const latestMeta = stepLogs[stepLogs.length - 1].meta || {};
        const latestStatus = latestMeta.status;

        let status = "pending";
        if (latestStatus === "RUNNING") status = "running";
        if (latestStatus === "COMPLETED") status = "completed";
        if (latestStatus === "FAILED") status = "failed";
        if (latestStatus === "SKIPPED") status = "skipped";

        result.push({
          id: stepName.toLowerCase(),
          label: stepName,
          status,
          meta: latestMeta,
        });
      }
      return result;
    }

    // Fallback parsing for legacy un-tracked traces
    const result = [];
    const hasQuery = traceEntries.some((e) =>
      e.message.toLowerCase().includes("query"),
    );
    const hasEmbed = traceEntries.some(
      (e) =>
        e.component === "embedding_service" ||
        e.message.toLowerCase().includes("embedding"),
    );
    const hasRetrieval = traceEntries.some(
      (e) =>
        (e.component || "").toLowerCase().includes("rag") &&
        e.message.toLowerCase().includes("retrieved"),
    );
    const hasLlm = traceEntries.some(
      (e) =>
        (e.component || "").toLowerCase().includes("llm") &&
        (e.message.toLowerCase().includes("bedrock") ||
          e.message.toLowerCase().includes("groq") ||
          e.message.toLowerCase().includes("claude") ||
          e.message.toLowerCase().includes("llm") ||
          e.message.toLowerCase().includes("invoking")),
    );
    const hasError = traceEntries.some((e) => e.type === "ERROR");

    // Always include a "Request Received" step if we have a trace
    result.push({
      id: "req",
      label: "Request Received",
      status: "completed",
      meta: {} as any,
    });

    if (hasEmbed)
      result.push({
        id: "emb",
        label: "Generating Embeddings",
        status: "completed",
        meta: {} as any,
      });
    else if (hasQuery)
      result.push({
        id: "emb",
        label: "Generating Embeddings",
        status: "running",
        meta: {} as any,
      });

    if (hasRetrieval)
      result.push({
        id: "ret",
        label: "Vector Search",
        status: "completed",
        meta: {} as any,
      });
    else if (hasEmbed)
      result.push({
        id: "ret",
        label: "Vector Search",
        status: "running",
        meta: {} as any,
      });

    if (hasLlm)
      result.push({
        id: "llm",
        label: "LLM Generation",
        status: "completed",
        meta: {} as any,
      });
    else if (hasRetrieval)
      result.push({
        id: "llm",
        label: "LLM Generation",
        status: "running",
        meta: {} as any,
      });

    if (hasError) {
      result[result.length - 1].status = "failed";
    }

    return result;
  }, [traceEntries]);

  if (!latestTraceId) {
    return (
      <div className="w-full h-full min-h-[250px] bg-slate-950/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-2xl flex flex-col items-center justify-center text-slate-500">
        <PlayCircle className="w-10 h-10 mb-4 opacity-50" />
        <p>Waiting for system activity...</p>
        <p className="text-xs mt-1">Submit a query to see trace timeline.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[250px] bg-slate-950/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-2xl flex flex-col relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold tracking-tight text-white/90">
          Backend Trace
        </h3>
        <span className="text-xs font-mono bg-blue-900/30 text-blue-400 px-2 py-1 rounded border border-blue-500/20">
          {latestTraceId.slice(0, 8)}
        </span>
      </div>

      <div className="flex-1 flex flex-col gap-6 relative">
        <div className="absolute left-3 top-2 bottom-6 w-0.5 bg-slate-800 z-0" />

        <AnimatePresence>
          {steps.map((step, idx) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4 z-10"
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  step.status === "completed"
                    ? "bg-emerald-500/20 text-emerald-500"
                    : step.status === "running"
                      ? "bg-blue-500/20 text-blue-400"
                      : step.status === "failed"
                        ? "bg-red-500/20 text-red-500"
                        : "bg-slate-500/20 text-slate-500"
                }`}
              >
                {step.status === "completed" && (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {step.status === "running" && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {step.status === "failed" && <XCircle className="w-4 h-4" />}
                {(step.status === "pending" || step.status === "skipped") && (
                  <Circle className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    step.status === "completed"
                      ? "text-slate-300"
                      : step.status === "running"
                        ? "text-blue-300"
                        : "text-red-400"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span className="capitalize">{step.status}</span>
                  {step.meta?.durationMs !== undefined && (
                    <span className="text-[10px] bg-slate-800/50 px-1.5 rounded text-slate-400">
                      {step.meta.durationMs}ms
                    </span>
                  )}
                  {step.meta?.attempts > 1 && (
                    <span className="text-[10px] bg-[#fb923c]/20 border border-[#fb923c]/30 px-1.5 rounded text-[#fb923c]">
                      {step.meta.attempts} retries
                    </span>
                  )}
                  {step.status === "skipped" && (
                    <span className="text-[10px] bg-red-500/10 border border-red-500/30 px-1.5 rounded text-red-400">
                      halted via upstream dependency
                    </span>
                  )}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
