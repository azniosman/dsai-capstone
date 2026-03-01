"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Lock,
  CheckCircle2,
  Circle,
  ChevronRight,
  Zap,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/empty-state";
import api from "@/lib/api-client";
import { extractApiError, cn } from "@/lib/utils";
import Link from "next/link";
import { useProfileBuilderStore } from "@/store/profileBuilderStore";
import type { RoleGap, GapItem } from "@/types/api";

/* ─── Hexagonal SVG radar ─── */
function HexRadar({
  axes,
  current,
  target,
}: {
  axes: string[];
  current: number[];
  target: number[];
}) {
  const cx = 150;
  const cy = 150;
  const maxR = 110;
  const n = axes.length;

  const angleAt = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const point = (r: number, i: number) => ({
    x: cx + r * Math.cos(angleAt(i)),
    y: cy + r * Math.sin(angleAt(i)),
  });

  const toPath = (vals: number[]) => {
    const pts = vals.map((v, i) => {
      const p = point(v * maxR, i);
      return `${p.x},${p.y}`;
    });
    return `M ${pts.join(" L ")} Z`;
  };

  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <svg viewBox="0 0 300 300" className="w-full max-w-[280px] mx-auto">
      {/* Grid rings */}
      {gridLevels.map((lvl) => (
        <polygon
          key={lvl}
          points={Array.from({ length: n }, (_, i) => {
            const p = point(lvl * maxR, i);
            return `${p.x},${p.y}`;
          }).join(" ")}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="1"
        />
      ))}

      {/* Axes */}
      {axes.map((_, i) => {
        const p = point(maxR, i);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        );
      })}

      {/* Target polygon */}
      <path
        d={toPath(target)}
        fill="rgba(99,102,241,0.1)"
        stroke="rgba(99,102,241,0.4)"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />

      {/* Current polygon */}
      <motion.path
        d={toPath(current)}
        fill="rgba(99,102,241,0.22)"
        stroke="#6366f1"
        strokeWidth="2"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />

      {/* Axis labels */}
      {axes.map((label, i) => {
        const p = point(maxR + 18, i);
        const anchor =
          p.x < cx - 5 ? "end" : p.x > cx + 5 ? "start" : "middle";
        return (
          <text
            key={i}
            x={p.x}
            y={p.y + 4}
            textAnchor={anchor}
            fontSize="9"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="600"
            fill="#64748b"
            style={{ textTransform: "uppercase" }}
          >
            {label.length > 12 ? label.slice(0, 11) + "…" : label}
          </text>
        );
      })}

      {/* Current data points */}
      {current.map((v, i) => {
        const p = point(v * maxR, i);
        return (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="#6366f1"
            stroke="white"
            strokeWidth="2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 + i * 0.05 }}
          />
        );
      })}
    </svg>
  );
}

/* ─── Phase timeline node ─── */
function PhaseNode({
  step,
  title,
  skills,
  status,
  delay,
  courseHref,
}: {
  step: string;
  title: string;
  skills: string[];
  status: "complete" | "active" | "locked";
  delay: number;
  courseHref?: string;
}) {
  const StatusIcon =
    status === "complete"
      ? CheckCircle2
      : status === "active"
        ? Circle
        : Lock;

  const statusColor =
    status === "complete"
      ? "text-green-600"
      : status === "active"
        ? "text-primary"
        : "text-muted-foreground/40";

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay }}
      className={cn(
        "relative pl-6 pb-5 border-l-2 last:pb-0 last:border-transparent",
        status === "active"
          ? "border-primary"
          : status === "complete"
            ? "border-green-400"
            : "border-border/40",
      )}
    >
      {/* Node dot */}
      <div
        className={cn(
          "absolute -left-[9px] top-0 h-4 w-4 rounded-full flex items-center justify-center",
          status === "complete"
            ? "bg-green-50 border-2 border-green-400"
            : status === "active"
              ? "bg-primary/10 border-2 border-primary"
              : "bg-muted border-2 border-border/40",
        )}
      >
        <StatusIcon
          className={cn("h-2.5 w-2.5 shrink-0", statusColor)}
          strokeWidth={2.5}
        />
      </div>

      <div className="glass-card p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="micro-type text-[9px] opacity-40 font-mono block mb-0.5">
              PHASE {step}
            </span>
            <p className="text-xs font-bold">{title}</p>
          </div>
          {status === "active" && (
            <Badge className="micro-type text-[8px] bg-primary/10 text-primary border-primary/20 shrink-0">
              Active
            </Badge>
          )}
          {status === "locked" && (
            <Lock className="h-3 w-3 text-muted-foreground/30 shrink-0 mt-0.5" />
          )}
        </div>

        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {skills.slice(0, 4).map((s) => (
              <span
                key={s}
                className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground font-medium"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {status !== "locked" && courseHref && (
          <Link
            href={courseHref}
            className="flex items-center gap-1.5 text-[10px] font-semibold text-primary hover:underline"
          >
            {status === "complete" ? (
              <>
                <CheckCircle2 className="h-3 w-3" /> Completed
              </>
            ) : (
              <>
                <Zap className="h-3 w-3" /> Initialize Step
                <ArrowRight className="h-2.5 w-2.5" />
              </>
            )}
          </Link>
        )}
      </div>
    </motion.div>
  );
}

export default function SkillGap() {
  const [selectedRole, setSelectedRole] = useState(0);

  const profileId =
    typeof window !== "undefined" ? localStorage.getItem("profileId") : null;

  const openProfileBuilder = useProfileBuilderStore((s) => s.open);

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

  // Build radar axes from gap items
  const radarData = useMemo(() => {
    if (!activeGap) return { axes: [], current: [], target: [] };

    const items = (activeGap.gaps || []).slice(0, 6);
    if (items.length === 0) {
      return { axes: [], current: [], target: [] };
    }

    const axes = items.map((g) =>
      g.skill.length > 14 ? g.skill.slice(0, 13) + "…" : g.skill,
    );

    const current = items.map((g) => {
      const ul = g.user_level ?? 0;
      return Math.min(Math.max(ul, 0.05), 1);
    });

    const target = items.map((g) => {
      const rl = g.required_level;
      const parsed = typeof rl === "number" ? rl : parseFloat(String(rl));
      return isNaN(parsed) ? 0.9 : Math.min(parsed, 1);
    });

    return { axes, current, target };
  }, [activeGap]);

  // Build timeline phases from gap items (top 5 gaps to bridge)
  const timelinePhases = useMemo(() => {
    if (!activeGap) return [];
    const topGaps = (activeGap.gaps || [])
      .filter((g) => {
        const sev = g.gap_severity ?? "low";
        return sev !== "none";
      })
      .slice(0, 5);

    return topGaps.map((g, i) => ({
      step: String(i + 1),
      title: `Bridge: ${g.skill}`,
      skills: [g.skill],
      status: i === 0 ? ("active" as const) : ("locked" as const),
      courseHref: `/courses`,
    }));
  }, [activeGap]);

  const matchScore = activeGap
    ? Math.round((activeGap.match_score ?? 0) * 100)
    : 0;

  const primaryGap = activeGap?.gaps?.find((g) => {
    const sev = g.gap_severity ?? "low";
    return sev === "high";
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!profileId || gaps.length === 0) {
    return (
      <div className="space-y-4">
        <header>
          <div className="flex items-center gap-2 mb-1">
            <span className="live-dot" />
            <p className="micro-type text-primary">Skill Matrix</p>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Skill Gap Analysis
          </h1>
        </header>
        <EmptyState
          icon={<BarChart3 />}
          title="No skill data yet"
          description="Build your profile to see how your skills compare to target roles."
        />
        {!profileId && (
          <div className="flex justify-center">
            <Button className="clay-btn" onClick={openProfileBuilder}>
              Build Profile
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="live-dot" />
            <p className="micro-type text-primary">Skill Matrix</p>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Skill Gap Analysis
          </h1>
        </div>

        {/* Role selector */}
        {gaps.length > 1 && (
          <div className="flex gap-1.5 flex-wrap">
            {gaps.map((g, i) => (
              <button
                key={g.role_title || i}
                onClick={() => setSelectedRole(i)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-150",
                  selectedRole === i
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {g.role_title}
              </button>
            ))}
          </div>
        )}
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedRole}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-1 xl:grid-cols-2 gap-5"
        >
          {/* Left: Radar + summary cards */}
          <div className="space-y-4">
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="micro-type mb-1">Skill Competency Matrix</p>
                  <p className="text-sm font-semibold">
                    {activeGap?.role_title}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-4 rounded-full bg-primary opacity-40 border border-primary border-dashed" />
                    <span className="micro-type text-[9px] opacity-60">
                      Target
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-4 rounded-full bg-primary" />
                    <span className="micro-type text-[9px] opacity-60">
                      Current
                    </span>
                  </span>
                </div>
              </div>

              {radarData.axes.length >= 3 ? (
                <HexRadar
                  axes={radarData.axes}
                  current={radarData.current}
                  target={radarData.target}
                />
              ) : (
                <div className="flex items-center justify-center h-48 text-center">
                  <p className="text-xs text-muted-foreground">
                    Not enough skill data for radar visualization
                  </p>
                </div>
              )}
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card p-4">
                <p className="micro-type mb-2 opacity-60">Primary Gap</p>
                {primaryGap ? (
                  <>
                    <p className="text-sm font-bold truncate">
                      {primaryGap.skill}
                    </p>
                    <Badge
                      variant="destructive"
                      className="micro-type text-[9px] mt-1"
                    >
                      High Priority
                    </Badge>
                  </>
                ) : (
                  <p className="text-sm font-bold text-green-600">
                    No critical gaps
                  </p>
                )}
              </div>
              <div className="glass-card p-4">
                <p className="micro-type mb-2 opacity-60">Market Match</p>
                <p
                  className="text-2xl font-black tabular-nums"
                  style={{
                    color:
                      matchScore >= 70
                        ? "#6366f1"
                        : matchScore >= 40
                          ? "#f59e0b"
                          : "#94a3b8",
                  }}
                >
                  {matchScore}%
                </p>
                <p className="micro-type text-[9px] opacity-50 mt-0.5">
                  {matchScore >= 70
                    ? "Strong"
                    : matchScore >= 40
                      ? "Developing"
                      : "Starting"}
                </p>
              </div>
            </div>

            {/* Gap list */}
            {(activeGap?.gaps?.length || 0) > 0 && (
              <div className="glass-card p-4">
                <p className="micro-type mb-3">All Gaps</p>
                <div className="space-y-2">
                  {(activeGap?.gaps || []).slice(0, 6).map((g) => {
                    const ul = g.user_level ?? 0;
                    const sev = g.gap_severity ?? "low";
                    return (
                      <div key={g.skill} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium truncate max-w-[160px]">
                            {g.skill}
                          </span>
                          <Badge
                            variant={
                              sev === "high"
                                ? "destructive"
                                : sev === "medium"
                                  ? "warning"
                                  : "secondary"
                            }
                            className="micro-type text-[8px] shrink-0"
                          >
                            {sev}
                          </Badge>
                        </div>
                        <div className="score-bar-track">
                          <div
                            className="score-bar-fill bg-primary"
                            style={{ width: `${Math.round(ul * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: Implementation Timeline */}
          <div className="space-y-4">
            <div className="glass-card p-5 flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="micro-type mb-1">Implementation Timeline</p>
                  <p className="text-sm font-semibold">Skill Bridge Roadmap</p>
                </div>
                <Link href="/courses">
                  <Button size="sm" variant="outline" className="text-xs gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" /> Browse Courses
                  </Button>
                </Link>
              </div>

              {timelinePhases.length > 0 ? (
                <div className="flex-1">
                  {timelinePhases.map((phase, i) => (
                    <PhaseNode
                      key={phase.step}
                      step={phase.step}
                      title={phase.title}
                      skills={phase.skills}
                      status={phase.status}
                      delay={i * 0.07}
                      courseHref={phase.courseHref}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center flex-1 py-8 text-center">
                  <div>
                    <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
                    <p className="text-sm font-semibold">No critical gaps!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your skills align well with this role.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Roadmap CTA */}
            <div className="glass-card p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold">Full Learning Roadmap</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  AI-generated upskilling pathway for your target role
                </p>
              </div>
              <Button
                size="sm"
                className="clay-btn shrink-0"
                asChild
              >
                <Link href="/roadmap">
                  View <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
