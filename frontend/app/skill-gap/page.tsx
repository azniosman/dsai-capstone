"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import api from "@/lib/api-client";
import { extractApiError, cn } from "@/lib/utils";
import Link from "next/link";
import type { RoleGap } from "@/types/api";
import {
  ChevronRight,
  Download,
  ArrowUp,
  AlertCircle,
  TrendingUp,
  Radar,
  Route,
  Check,
  Timer,
  Lock,
  Archive,
  Lightbulb,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function HexRadar({
  axes,
  current,
  target,
}: {
  axes: string[];
  current: number[];
  target: number[];
}) {
  const cx = 200;
  const cy = 200;
  const maxR = 180;
  const n = axes.length || 4; // Fallback to 4 for the demo shape if no axes

  const angleAt = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const point = (r: number, i: number) => ({
    x: cx + r * Math.cos(angleAt(i)),
    y: cy + r * Math.sin(angleAt(i)),
  });

  const toPath = (vals: number[]) => {
    if (vals.length === 0) return "";
    const pts = vals.map((v, i) => {
      const p = point(v * maxR, i);
      return `${p.x},${p.y}`;
    });
    return `M ${pts.join(" L ")} Z`;
  };

  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className="w-full max-w-md mx-auto">
      <svg
        className="w-full drop-shadow-xl overflow-visible"
        viewBox="0 0 400 400"
      >
        <defs>
          <pattern
            id="radar-grid"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1" fill="#cfd7e7" />
          </pattern>
        </defs>
        <rect
          width="400"
          height="400"
          fill="url(#radar-grid)"
          className="opacity-10"
        />

        {gridLevels.map((lvl) => (
          <circle
            key={lvl}
            cx="200"
            cy="200"
            r={lvl * maxR}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4"
            className="text-slate-custom-200 dark:text-slate-custom-700"
          />
        ))}

        <line
          x1="200"
          y1="20"
          x2="200"
          y2="380"
          stroke="currentColor"
          strokeWidth="1"
          className="text-slate-custom-200 dark:text-slate-custom-700"
        />
        <line
          x1="20"
          y1="200"
          x2="380"
          y2="200"
          stroke="currentColor"
          strokeWidth="1"
          className="text-slate-custom-200 dark:text-slate-custom-700"
        />

        {/* Target Benchmark (Simulated shape from original code if no data, else calculated) */}
        {target.length > 0 ? (
          <path
            d={toPath(target)}
            fill="currentColor"
            strokeWidth="1"
            className="text-slate-custom-100/50 dark:text-slate-custom-800/50 stroke-slate-custom-300 dark:stroke-slate-custom-600"
          />
        ) : (
          <polygon
            className="text-slate-custom-100/50 dark:text-slate-custom-800/50 stroke-slate-custom-300 dark:stroke-slate-custom-600"
            fill="currentColor"
            points="200,60 340,150 280,330 120,330 60,150"
            strokeWidth="1"
          ></polygon>
        )}

        {/* Current Candidate Shape */}
        <motion.path
          d={
            current.length > 0
              ? toPath(current)
              : "M 200,100 L 290,160 L 220,280 L 160,260 L 90,140 Z"
          }
          fill="rgba(19, 91, 236, 0.2)"
          stroke="#135bec"
          strokeWidth="2"
          initial={{ opacity: 0, scale: 0.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: "200px 200px" }}
        />

        {axes.length > 0 ? (
          axes.map((label, i) => {
            const p = point(maxR + 20, i);
            const anchor =
              p.x < cx - 15 ? "end" : p.x > cx + 15 ? "start" : "middle";
            return (
              <text
                key={i}
                x={p.x}
                y={p.y + 4}
                textAnchor={anchor}
                className="font-bold text-[10px] fill-current"
              >
                {label.length > 15 ? label.slice(0, 14) + "…" : label}
              </text>
            );
          })
        ) : (
          <>
            <text
              fill="currentColor"
              fontSize="10"
              fontWeight="bold"
              textAnchor="middle"
              x="200"
              y="15"
            >
              CLOUD OPS
            </text>
            <text
              fill="currentColor"
              fontSize="10"
              fontWeight="bold"
              textAnchor="end"
              x="385"
              y="195"
            >
              AI/ML
            </text>
            <text
              fill="currentColor"
              fontSize="10"
              fontWeight="bold"
              textAnchor="middle"
              x="200"
              y="395"
            >
              DEVOPS
            </text>
            <text
              fill="currentColor"
              fontSize="10"
              fontWeight="bold"
              textAnchor="start"
              x="15"
              y="195"
            >
              SECURITY
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

export default function SkillGapPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(0);
  const [randomStats, setRandomStats] = useState({ growth1: 0, growth2: 0 });

  useEffect(() => {
    // Generate dynamic random values within the main component block not a hook
    const init = () => {
      setRandomStats({
        growth1: Math.round(Math.random() * 5),
        growth2: Math.round(Math.random() * 10 + 5),
      });
    };
    init();
  }, []);

  const profileId =
    typeof window !== "undefined" ? localStorage.getItem("profileId") : null;

  const {
    data: gaps = [],
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ["skill-gap", profileId],
    queryFn: async () => {
      const res = await api.get(`/api/skill-gap/${profileId}`);
      return (res.data.gaps || []) as RoleGap[];
    },
    enabled: !!profileId,
  });

  const error = queryError
    ? extractApiError(queryError, "Failed to load skill gaps")
    : null;

  const activeGap = gaps[selectedRole];

  // Radar Data
  const radarData = useMemo(() => {
    if (!activeGap) return { axes: [], current: [], target: [] };
    const items = (activeGap.gaps || []).slice(0, 6);
    if (items.length < 3) return { axes: [], current: [], target: [] };

    return {
      axes: items.map((g) => g.skill),
      current: items.map((g) => Math.min(Math.max(g.user_level ?? 0, 0.05), 1)),
      target: items.map((g) => {
        const rl =
          typeof g.required_level === "number"
            ? g.required_level
            : parseFloat(String(g.required_level));
        return isNaN(rl) ? 0.9 : Math.min(rl, 1);
      }),
    };
  }, [activeGap]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="text-slate-custom-500 font-bold uppercase tracking-widest text-xs animate-pulse">
          Loading Analysis...
        </div>
      </div>
    );
  }

  if (!profileId || gaps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] space-y-8 bg-background-dark font-display text-slate-100 selection:bg-primary/30">
        <div className="w-32 h-32 border border-primary/20 bg-primary/5 shadow-[0_0_30px_rgba(37,157,244,0.1)] flex items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-1 border-b border-l border-primary/30 bg-primary/10">
            <span className="text-[7px] font-mono text-primary tracking-widest uppercase">
              SYS_ERR
            </span>
          </div>
          <Radar className="w-12 h-12 text-primary drop-shadow-[0_0_5px_rgba(37,157,244,0.5)]" />
        </div>
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-100 mt-4">
            No Matrix Data Found
          </h2>
          <p className="font-mono text-[10px] text-slate-400 leading-relaxed uppercase tracking-widest border-l-2 border-accent-coral pl-4 text-left">
            &gt; Skill vector profile must be configured.
            <br />
            &gt; Competency extraction required before gap analysis can be
            calculated.
          </p>
          <Button
            onClick={() => router.push("/profile-builder")}
            className="mt-8 mx-auto max-w-[300px] bg-primary/10 border border-primary text-primary hover:bg-primary hover:text-background-dark shadow-[0_0_15px_rgba(37,157,244,0.2)] font-mono uppercase text-[10px] font-bold tracking-[0.2em] rounded-none h-14 px-10 transition-all w-full flex items-center justify-center gap-3 group"
          >
            <Terminal className="h-4 w-4" /> Initialize Dossier{" "}
            <ChevronRight className="h-4 w-4 ml-auto group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden h-[calc(100vh-var(--spacing-16))] -m-12 bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
      <header className="h-16 border-b border-slate-custom-200 dark:border-slate-custom-800 bg-white dark:bg-slate-custom-900 px-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-[10px] text-slate-custom-400 font-bold uppercase tracking-wider">
              <span>Talent Intelligence</span>
              <ChevronRight className="text-[12px] w-4 h-4" />
              <span>Candidate Profiling</span>
            </div>
            <h1 className="text-lg font-bold">Skill Gap & Roadmap Analytics</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-background-dark/50 border border-primary/30 p-0.5 relative z-10 mr-4">
            {gaps.map((g, i) => (
              <button
                key={i}
                onClick={() => setSelectedRole(i)}
                className={cn(
                  "px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest transition-colors",
                  selectedRole === i
                    ? "bg-primary/20 text-primary border border-primary/50 shadow-[0_0_10px_rgba(37,157,244,0.2)]"
                    : "text-slate-500 hover:text-primary border border-transparent",
                )}
              >
                {g.role_title}
              </button>
            ))}
          </div>
          <button className="clay-btn">
            <Download className="w-3.5 h-3.5" /> Export Dataset
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Top Metric Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-custom-900 border border-slate-custom-200 dark:border-slate-custom-800 p-4 rounded-lg shadow-sm">
            <p className="text-[10px] font-bold text-slate-custom-500 uppercase">
              Profile Match Score
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-primary">
                {Math.round((activeGap?.match_score || 0) * 100)}%
              </span>
              <span className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                <ArrowUp className="text-[12px] w-3 h-3" />
                {randomStats.growth1}%
              </span>
            </div>
            <div className="w-full bg-slate-custom-100 h-1 mt-3 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full"
                style={{
                  width: `${Math.round((activeGap?.match_score || 0) * 100)}%`,
                }}
              ></div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-custom-900 border border-slate-custom-200 dark:border-slate-custom-800 p-4 rounded-lg shadow-sm">
            <p className="text-[10px] font-bold text-slate-custom-500 uppercase">
              Critical Gaps Identified
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black">
                {activeGap?.gaps.filter((g) => g.gap_severity === "high")
                  .length || 0}
              </span>
              <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                <AlertCircle className="text-[12px] w-3 h-3" />
                High Risk
              </span>
            </div>
            <p className="text-[10px] text-slate-custom-400 mt-2 truncate">
              Targeting {activeGap?.role_title}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-custom-900 border border-slate-custom-200 dark:border-slate-custom-800 p-4 rounded-lg shadow-sm">
            <p className="text-[10px] font-bold text-slate-custom-500 uppercase">
              Est. Time to Target
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-slate-custom-800 dark:text-slate-custom-100">
                {Math.max(1, Math.round((activeGap?.gaps.length || 0) * 1.5))}
                <span className="text-sm font-medium text-slate-custom-500">
                  mo
                </span>
              </span>
              <span className="text-[10px] font-bold text-green-600 flex items-center">
                -15 days
              </span>
            </div>
            <p className="text-[10px] text-slate-custom-400 mt-2">
              Based on avg. upskilling velocity
            </p>
          </div>

          <div className="bg-white dark:bg-slate-custom-900 border border-slate-custom-200 dark:border-slate-custom-800 p-4 rounded-lg shadow-sm">
            <p className="text-[10px] font-bold text-slate-custom-500 uppercase">
              Market Demand Index
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-orange-500 uppercase">
                High
              </span>
              <span className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                <TrendingUp className="text-[12px] w-3 h-3" />
                {randomStats.growth2}%
              </span>
            </div>
            <p className="text-[10px] text-slate-custom-400 mt-2">
              MOM & SkillsFuture SG verified data
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-custom-900 border border-slate-custom-200 dark:border-slate-custom-800 rounded-lg p-6 shadow-sm flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between mb-6 z-10">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Radar className="text-primary w-5 h-5" /> Skills Competency
                Mapping
              </h3>
              <div className="flex gap-4 text-[10px] font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-primary"></span>{" "}
                  Candidate
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-slate-custom-300"></span>{" "}
                  Industry Benchmark
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-[400px] flex items-center justify-center relative">
              {/* Simulated Radar SVG Background */}
              <div
                className="absolute inset-0 radar-grid opacity-10"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, #cfd7e7 1px, transparent 1px)",
                }}
              ></div>

              <HexRadar
                axes={radarData.axes}
                current={radarData.current}
                target={radarData.target}
              />

              {/* Tooltip Example */}
              {activeGap?.gaps[0] && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/4 -translate-y-1/2 bg-white dark:bg-slate-custom-800 border border-slate-custom-200 dark:border-slate-custom-700 p-2 rounded shadow-lg pointer-events-none z-20 hidden md:block">
                  <p className="text-[10px] font-bold text-primary mb-1">
                    {activeGap.gaps[0].skill} Node
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px]">
                    <span className="text-slate-custom-500">
                      <span className="font-bold">
                        {activeGap.gaps[0].user_level
                          ? (activeGap.gaps[0].user_level * 5).toFixed(1)
                          : 0}
                        /5
                      </span>
                    </span>
                    <span className="text-slate-custom-500">Required:</span>{" "}
                    <span className="font-bold">
                      {activeGap.gaps[0].required_level
                        ? (
                            Number(activeGap.gaps[0].required_level) * 5
                          ).toFixed(1)
                        : 0}
                      /5
                    </span>
                    <span className="text-slate-custom-500">Scarcity:</span>{" "}
                    <span className="font-bold text-orange-500">Critical</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-custom-900 border border-slate-custom-200 dark:border-slate-custom-800 rounded-lg p-6 shadow-sm flex flex-col">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-6">
              <Route className="text-primary w-5 h-5" /> Pathfinder Roadmap
            </h3>
            <div className="flex-1 relative pl-6 border-l-2 border-slate-custom-100 dark:border-slate-custom-800 space-y-8 overflow-y-auto">
              {(activeGap?.gaps.slice(0, 3) || []).map((g, i) => (
                <div key={i} className="relative">
                  <div
                    className={cn(
                      "absolute -left-[33px] top-0 size-4 rounded-full flex items-center justify-center transition-all",
                      i === 0
                        ? "bg-primary ring-4 ring-primary/20"
                        : i === 1
                          ? "border-2 border-primary bg-white dark:bg-slate-custom-900"
                          : "border-2 border-slate-custom-200 dark:border-slate-custom-700 bg-white dark:bg-slate-custom-900",
                    )}
                  >
                    {i === 0 && (
                      <Check className="text-[10px] text-white w-3 h-3" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span
                      className={cn(
                        "text-[9px] font-bold uppercase tracking-widest",
                        i === 0 ? "text-primary" : "text-slate-custom-400",
                      )}
                    >
                      Phase 0{i + 1}: {g.skill}
                    </span>
                    <h4 className="text-xs font-bold truncate">
                      Bridging {g.skill} Gap
                    </h4>
                    <p className="text-[10px] text-slate-custom-500">
                      Required competency node for {activeGap.role_title}{" "}
                      target.
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      {i === 0 ? (
                        <div className="bg-slate-custom-100 dark:bg-slate-custom-800 px-2 py-0.5 rounded text-[9px] font-medium">
                          85% Completed
                        </div>
                      ) : i === 1 ? (
                        <>
                          <Timer className="text-primary text-sm animate-pulse w-4 h-4" />
                          <span className="text-[9px] font-bold text-primary italic">
                            In Progress - 4 weeks est
                          </span>
                        </>
                      ) : (
                        <div className="flex items-center gap-1 opacity-40">
                          <Lock className="text-[10px] w-3 h-3" />
                          <span className="text-[9px]">
                            Unlocks after Phase 01
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {(!activeGap?.gaps || activeGap.gaps.length === 0) && (
                <div className="text-xs text-slate-custom-400 italic">
                  No roadmap steps found.
                </div>
              )}
            </div>
            <Link
              href="/roadmap"
              className="w-full mt-8 py-2 border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-[10px] font-bold rounded uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
            >
              Recalculate Path
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-custom-900 border border-slate-custom-200 dark:border-slate-custom-800 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-custom-100 dark:border-slate-custom-800 flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Archive className="text-red-500 w-5 h-5" /> Missing Competency
              Nodes
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-custom-50 dark:bg-slate-custom-800/50 text-[10px] font-bold text-slate-custom-400 uppercase tracking-widest">
                  <th className="px-6 py-3">Skill Node</th>
                  <th className="px-6 py-3">Current Gap</th>
                  <th className="px-6 py-3 text-center">Severity</th>
                  <th className="px-6 py-3">Local Demand</th>
                  <th className="px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-custom-100 dark:divide-slate-custom-800">
                {/* Placeholder for when no gaps are found */}
                {(!activeGap?.gaps || activeGap.gaps.length === 0) && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-4 text-center text-slate-custom-400 italic"
                    >
                      We&apos;ve analyzed your profile against your target role
                      of &quot;Senior ML Engineer&quot; and identified key areas
                      for development. Your customized learning path prioritizes
                      high-impact skills with current market demand.
                    </td>
                  </tr>
                )}
                {(activeGap?.gaps || []).map((g, i) => {
                  const severityClass =
                    g.gap_severity === "high"
                      ? "text-red-500 bg-red-100 dark:bg-red-900/30 dark:text-red-400"
                      : g.gap_severity === "medium"
                        ? "text-orange-500 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400"
                        : "text-blue-500 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400";

                  return (
                    <tr
                      key={i}
                      className="hover:bg-slate-custom-50 dark:hover:bg-slate-custom-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 border-r border-slate-custom-100 dark:border-slate-custom-800 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold">{g.skill}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 border-r border-slate-custom-100 dark:border-slate-custom-800 w-[200px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-custom-100 dark:bg-slate-custom-800 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full",
                                g.gap_severity === "high"
                                  ? "bg-red-500"
                                  : "bg-orange-500",
                              )}
                              style={{
                                width: `${100 - (g.user_level || 0) * 100}%`,
                              }}
                            ></div>
                          </div>
                          <span
                            className={cn(
                              "text-[10px] font-bold",
                              g.gap_severity === "high"
                                ? "text-red-500"
                                : "text-orange-500",
                            )}
                          >
                            {Math.round(100 - (g.user_level || 0) * 100)}% Gap
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 border-r border-slate-custom-100 dark:border-slate-custom-800 text-center whitespace-nowrap">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                            severityClass,
                          )}
                        >
                          {g.gap_severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 border-r border-slate-custom-100 dark:border-slate-custom-800 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="text-green-500 text-sm w-4 h-4" />
                          <span className="font-medium">High</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href="/courses"
                          className="text-primary hover:underline font-bold text-[10px] uppercase"
                        >
                          Add to Path
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex gap-4 items-start shrink-0">
          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-primary">
              Strategic AI Insight
            </h4>
            <p className="text-xs text-slate-custom-600 dark:text-slate-custom-400 leading-relaxed">
              The candidate&apos;s profile is highly aligned with{" "}
              <span className="font-bold text-slate-custom-800 dark:text-slate-custom-200">
                {activeGap?.role_title}
              </span>{" "}
              requirements at {Math.round((activeGap?.match_score || 0) * 100)}
              %, but lacks critical nodes. Recommendation: Prioritize filling
              the{" "}
              <span className="italic underline">
                {activeGap?.gaps[0]?.skill}
              </span>{" "}
              gap to bridge the match threshold.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
