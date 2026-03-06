"use client";

import { useState, useEffect } from "react";
import { Network, Database } from "lucide-react";
import api from "@/lib/api-client";
import { Dataset, LiveMatrixData, DatasetDiff, TrendSignal } from "./types";
import DatasetPanel from "./components/DatasetPanel";
import TrendIndicators from "./components/TrendIndicators";
import DiffVisualisation from "./components/DiffVisualisation";
import MatrixTable from "./components/MatrixTable";

export default function ViewLiveMatrixPage() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [matrixData, setMatrixData] = useState<LiveMatrixData[]>([]);
  const [diffs, setDiffs] = useState<DatasetDiff[]>([]);
  const [trends, setTrends] = useState<TrendSignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchIntelligence() {
      setIsLoading(true);
      setError(null);
      try {
        const [matrixRes, diffRes, trendRes] = await Promise.all([
          api.get("/api/live-matrix?limit=5000"), // Extract large dataset for local sorting
          api.get("/api/dataset-diff"),
          api.get("/api/trends"),
        ]);

        if (isMounted) {
          setMatrixData(matrixRes.data.data);
          setDataset(matrixRes.data.dataset);
          setDiffs(diffRes.data);
          setTrends(trendRes.data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const axiosError = err as {
            response?: { data?: { message?: string } };
          };
          setError(
            axiosError.response?.data?.message ||
              (err instanceof Error
                ? err.message
                : "Failed to establish connection to Intelligence Engine."),
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchIntelligence();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-cyan-50 font-sans tracking-wide selection:bg-cyan-900 selection:text-cyan-50 pb-20">
      {/* Background Grid */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#083344_1px,transparent_1px),linear-gradient(to_bottom,#083344_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 pt-24 pb-12 flex flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3 text-cyan-400">
            <Network className="w-8 h-8 opacity-80" />
            <h1 className="text-3xl font-bold font-mono tracking-tight uppercase shadow-cyan-500/50 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
              Data Intelligence Console
            </h1>
          </div>
          <p className="text-sm text-cyan-100 max-w-2xl border-l-[3px] border-cyan-500/50 pl-4 py-1.5 ml-1 mt-2 bg-linear-to-r from-cyan-950/40 to-transparent">
            Live multi-dimensional analysis of Singapore&apos;s Skills Demand
            ecosystem. Synthesizing historical variance across growth vectors to
            determine career trajectories.
          </p>
        </header>

        {error ? (
          <div className="glass-panel p-6 border-red-500/50 text-red-400 font-mono text-sm max-w-2xl flex items-start gap-4">
            <Database className="w-5 h-5 shrink-0" />
            <div className="flex flex-col gap-1">
              <span className="uppercase tracking-widest text-xs opacity-70">
                SYSTEM_ERROR
              </span>
              {error}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Meta Stats Panel */}
            <DatasetPanel dataset={dataset} isLoading={isLoading} />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3 flex flex-col gap-6">
                {/* Trend Analysis Horizontal Banner */}
                <TrendIndicators trends={trends} isLoading={isLoading} />

                {/* Core Matrix Datatable */}
                <MatrixTable data={matrixData} isLoading={isLoading} />
              </div>

              <div className="lg:col-span-1 flex flex-col gap-6">
                {/* Differential Snapshots */}
                <DiffVisualisation diffs={diffs} isLoading={isLoading} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
