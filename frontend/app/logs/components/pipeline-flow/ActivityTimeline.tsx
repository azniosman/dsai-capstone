"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, PlayCircle, XCircle } from "lucide-react";
import type { LogEntry } from "../../page";

interface ActivityTimelineProps {
  entries: LogEntry[];
}

export default function ActivityTimeline({ entries }: ActivityTimelineProps) {
  // Extract the latest Trace ID that has a RAG or LLM event
  const latestTraceId = useMemo(() => {
    for (let i = entries.length - 1; i >= 0; i--) {
      const e = entries[i];
      if (
        e.traceId &&
        (e.component === "rag_service" ||
          e.component === "llm_service" ||
          e.component === "log_controller")
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
        e.component === "rag_service" &&
        e.message.toLowerCase().includes("retrieved"),
    );
    const hasLlm = traceEntries.some(
      (e) =>
        e.component === "llm_service" &&
        e.message.toLowerCase().includes("bedrock"),
    );
    const hasError = traceEntries.some((e) => e.type === "ERROR");

    // Always include a "Request Received" step if we have a trace
    result.push({ id: "req", label: "Request Received", status: "completed" });

    if (hasEmbed)
      result.push({
        id: "emb",
        label: "Generating Embeddings",
        status: "completed",
      });
    else if (hasQuery)
      result.push({
        id: "emb",
        label: "Generating Embeddings",
        status: "running",
      });

    if (hasRetrieval)
      result.push({ id: "ret", label: "Vector Search", status: "completed" });
    else if (hasEmbed)
      result.push({ id: "ret", label: "Vector Search", status: "running" });

    if (hasLlm)
      result.push({
        id: "llm",
        label: "LLM Bedrock Stream",
        status: "completed",
      });
    else if (hasRetrieval)
      result.push({
        id: "llm",
        label: "LLM Bedrock Stream",
        status: "running",
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
                      : "bg-red-500/20 text-red-500"
                }`}
              >
                {step.status === "completed" && (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {step.status === "running" && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {step.status === "failed" && <XCircle className="w-4 h-4" />}
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
                <p className="text-xs text-slate-500 capitalize">
                  {step.status}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
