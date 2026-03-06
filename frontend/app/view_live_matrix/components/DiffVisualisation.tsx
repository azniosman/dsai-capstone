"use client";

import {
  AlertTriangle,
  PlusCircle,
  MinusCircle,
  RefreshCw,
} from "lucide-react";
import { DatasetDiff } from "../types";

export default function DiffVisualisation({
  diffs,
  isLoading,
}: {
  diffs: DatasetDiff[];
  isLoading: boolean;
}) {
  if (isLoading) return null;
  if (!diffs || diffs.length === 0) return null;

  // Group diffs
  const newRecords = diffs.filter((d) => d.changeType === "NEW_RECORD");
  const removedRecords = diffs.filter((d) => d.changeType === "REMOVED_RECORD");
  const valueChanges = diffs.filter((d) => d.changeType === "VALUE_CHANGE");

  const parseRecord = (jsonStr: string | null | undefined) => {
    if (!jsonStr) return { sector: "Unknown", jobRole: "Unknown" };
    try {
      return JSON.parse(jsonStr);
    } catch {
      return { sector: "Unknown", jobRole: "Unknown" };
    }
  };

  return (
    <div className="glass-panel p-5 border-l-4 border-l-amber-500/50">
      <h3 className="text-sm font-mono text-amber-400 flex items-center gap-2 mb-4 uppercase tracking-widest">
        <AlertTriangle className="w-4 h-4" /> Snapshot Differentials Detected
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* NEW RECORDS */}
        <div className="flex flex-col gap-2">
          <div className="text-xs text-neutral-400 uppercase tracking-widest flex items-center gap-1 border-b border-white/5 pb-1">
            <PlusCircle className="w-3 h-3 text-emerald-400" /> New Roles (
            {newRecords.length})
          </div>
          <div className="max-h-32 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-1">
            {newRecords.length === 0 && (
              <span className="text-xs text-neutral-600 font-mono">
                No new roles detected.
              </span>
            )}
            {newRecords.map((r) => {
              const rec = parseRecord(r.newValue);
              return (
                <div
                  key={r.id}
                  className="text-xs bg-emerald-950/20 text-emerald-200/80 p-1.5 rounded truncate"
                >
                  + {rec.jobRole}
                </div>
              );
            })}
          </div>
        </div>

        {/* REMOVED RECORDS */}
        <div className="flex flex-col gap-2">
          <div className="text-xs text-neutral-400 uppercase tracking-widest flex items-center gap-1 border-b border-white/5 pb-1">
            <MinusCircle className="w-3 h-3 text-red-400" /> Deprecated Roles (
            {removedRecords.length})
          </div>
          <div className="max-h-32 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-1">
            {removedRecords.length === 0 && (
              <span className="text-xs text-neutral-600 font-mono">
                No deprecations detected.
              </span>
            )}
            {removedRecords.map((r) => {
              const rec = parseRecord(r.oldValue);
              return (
                <div
                  key={r.id}
                  className="text-xs bg-red-950/20 text-red-200/80 p-1.5 rounded truncate"
                >
                  - {rec.jobRole}
                </div>
              );
            })}
          </div>
        </div>

        {/* VALUE CHANGES */}
        <div className="flex flex-col gap-2">
          <div className="text-xs text-neutral-400 uppercase tracking-widest flex items-center gap-1 border-b border-white/5 pb-1">
            <RefreshCw className="w-3 h-3 text-cyan-400" /> High Volatility
            Specs
          </div>
          <div className="max-h-32 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-1">
            {valueChanges.length === 0 && (
              <span className="text-xs text-neutral-600 font-mono">
                Market parameters stable.
              </span>
            )}
            {valueChanges.slice(0, 10).map((r) => (
              <div
                key={r.id}
                className="text-[11px] bg-cyan-950/20 text-cyan-200/80 p-1.5 rounded flex justify-between"
              >
                <span className="font-mono">{r.fieldName}</span>
                <span className="font-mono text-neutral-400">
                  {Number(r.oldValue).toFixed(1)} &rarr;{" "}
                  <span className="text-cyan-400">
                    {Number(r.newValue).toFixed(1)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
