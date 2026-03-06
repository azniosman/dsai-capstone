"use client";

import { Activity, Clock, FileDigit, Server } from "lucide-react";
import { Dataset } from "../types";

export default function DatasetPanel({
  dataset,
  isLoading,
}: {
  dataset: Dataset | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="glass-panel p-4 flex gap-8 animate-pulse border-cyan-500/30">
        <div className="h-12 w-48 bg-cyan-900/20 rounded"></div>
        <div className="h-12 w-32 bg-cyan-900/20 rounded"></div>
      </div>
    );
  }

  if (!dataset) return null;

  return (
    <div className="glass-panel p-4 grid grid-cols-2 md:grid-cols-4 gap-4 border-l-4 border-l-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-widest text-cyan-500/70 font-mono flex items-center gap-1">
          <Server className="w-3 h-3" /> ACTIVE DATASET
        </span>
        <span className="font-semibold text-cyan-50">
          {dataset.datasetName}{" "}
          <span className="text-cyan-400 font-mono text-xs">
            {dataset.datasetVersion}
          </span>
        </span>
      </div>

      <div className="flex flex-col gap-1 border-l border-cyan-500/20 pl-4">
        <span className="text-[10px] uppercase tracking-widest text-cyan-500/70 font-mono flex items-center gap-1">
          <Activity className="w-3 h-3" /> STATUS
        </span>
        <span className="font-mono text-green-400 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
          {dataset.status}
        </span>
      </div>

      <div className="flex flex-col gap-1 border-l border-cyan-500/20 pl-4">
        <span className="text-[10px] uppercase tracking-widest text-cyan-500/70 font-mono flex items-center gap-1">
          <FileDigit className="w-3 h-3" /> RECORDS INDEXED
        </span>
        <span className="font-mono text-cyan-100">
          {dataset.recordCount.toLocaleString()}
        </span>
      </div>

      <div className="flex flex-col gap-1 border-l border-cyan-500/20 pl-4">
        <span className="text-[10px] uppercase tracking-widest text-cyan-500/70 font-mono flex items-center gap-1">
          <Clock className="w-3 h-3" /> LAST SYNC
        </span>
        <span className="font-mono text-cyan-100 text-sm">
          {new Date(
            dataset.processedAt || dataset.downloadedAt,
          ).toLocaleString()}
        </span>
      </div>
    </div>
  );
}
