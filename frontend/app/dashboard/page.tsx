"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Briefcase,
  BarChart3,
  MessageSquare,
  GraduationCap,
  Zap,
  Target,
  ArrowUpRight,
  Brain,
  ChevronRight,
  Activity,
  TrendingUp,
  Users,
  Layers,
} from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import api from "@/lib/api-client";
import { useModalStore } from "@/store/modalStore";
import { useProfileBuilderStore } from "@/store/profileBuilderStore";
import { toast } from "sonner";
import type { DashboardSummary, Recommendation } from "@/types/api";

/* ─── Career Health Gauge ─── */
function HealthGauge({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75; // 270° arc
  const progress = arc * (score / 100);
  const dashOffset = arc - progress;

  const color =
    score >= 70 ? "#6366f1" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="120" viewBox="0 0 140 120">
        {/* Track */}
        <circle
          cx="70"
          cy="80"
          r={r}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="10"
          strokeDasharray={`${arc} ${circ}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform="rotate(-225 70 80)"
        />
        {/* Fill */}
        <circle
          cx="70"
          cy="80"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${progress} ${circ}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform="rotate(-225 70 80)"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center mt-6">
        <span
          className="text-3xl font-black tabular-nums"
          style={{ color }}
        >
          {score}
        </span>
        <span className="micro-type opacity-60 text-[9px]">/ 100</span>
      </div>
    </div>
  );
}

/* ─── KPI Tile ─── */
function KpiTile({
  icon: Icon,
  label,
  value,
  delta,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  delta?: number;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass-card p-4 space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        {delta !== undefined && delta !== 0 && (
          <span
            className={cn(
              "text-[10px] font-bold micro-type",
              delta > 0 ? "status-success" : "status-error",
            )}
          >
            {delta > 0 ? "+" : ""}
            {delta}
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl font-black tabular-nums text-foreground">
          {value}
        </div>
        <div className="micro-type mt-0.5">{label}</div>
      </div>
    </motion.div>
  );
}

/* ─── Opportunity Card ─── */
function OpportunityCard({
  rec,
  index,
  onClick,
}: {
  rec: Recommendation;
  index: number;
  onClick: () => void;
}) {
  const score = Math.round(rec.match_score * 100);
  const scoreColor =
    score >= 70
      ? "text-green-600"
      : score >= 40
        ? "text-amber-500"
        : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
      onClick={onClick}
      className="flex items-center justify-between p-3 rounded-lg hover:bg-primary/5 cursor-pointer transition-colors duration-150 group border border-transparent hover:border-primary/15"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="micro-type text-primary text-[9px]">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
            {rec.title}
          </div>
          <div className="micro-type text-[9px] truncate opacity-60">
            {rec.category || "Technology"}
            {rec.salary_range && ` · ${rec.salary_range}`}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn("text-sm font-bold tabular-nums", scoreColor)}>
          {score}%
        </span>
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
      </div>
    </motion.div>
  );
}

/* ─── Growth Vector Bar ─── */
function GrowthBar({
  skill,
  level,
  index,
}: {
  skill: string;
  level: number;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.06 + 0.3 }}
      className="space-y-1"
    >
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium truncate max-w-[140px]">{skill}</span>
        <span className="micro-type text-[9px]">{Math.round(level * 100)}%</span>
      </div>
      <div className="score-bar-track">
        <div
          className="score-bar-fill bg-primary"
          style={{ width: `${Math.round(level * 100)}%` }}
        />
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { openModal } = useModalStore();
  const openProfileBuilder = useProfileBuilderStore((state) => state.open);
  const [aiThinking, setAiThinking] = useState(false);
  const [quickPrompt, setQuickPrompt] = useState("");

  // Auth guard
  if (typeof window !== "undefined" && !localStorage.getItem("token")) {
    router.push("/login");
  }

  // Dashboard summary
  const {
    data: summary,
    isLoading: isSummaryLoading,
    error: summaryError,
  } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const res = await api.get("/api/dashboard/summary");
      if (res.data?.profile_id) {
        localStorage.setItem("profileId", String(res.data.profile_id));
      }
      return res.data as DashboardSummary;
    },
  });

  const profileId =
    summary?.profile_id ||
    (typeof window !== "undefined" ? localStorage.getItem("profileId") : null);

  // Recommendations
  const { data: recs = [], isLoading: isRecsLoading } = useQuery({
    queryKey: ["recommendations", profileId],
    queryFn: async () => {
      const res = await api.post("/api/recommend", {
        profile_id: Number(profileId),
      });
      return (res.data.recommendations?.slice(0, 5) || []) as Recommendation[];
    },
    enabled: !!profileId,
  });

  const loading = isSummaryLoading || isRecsLoading;

  if (summaryError && !toast.custom) {
    toast.error("Failed to load dashboard data");
  }

  const readiness = summary ? Math.round(summary.career_readiness) : 0;
  const firstName = summary?.name.split(" ")[0] ?? "";

  // Skill growth vectors from profile skills
  const skillVectors = (summary?.skills || []).slice(0, 5).map((s, i) => ({
    skill: s,
    // Deterministic level 0.4–0.95 based on skill string
    level: 0.4 + ((s.charCodeAt(0) % 12) / 20),
  }));

  const handleQuickChat = async () => {
    if (!quickPrompt.trim()) return;
    setAiThinking(true);
    try {
      const pid = localStorage.getItem("profileId");
      await api.post("/api/chat", {
        profile_id: pid ? parseInt(pid) : null,
        messages: [{ role: "user", content: quickPrompt }],
      });
      openModal("aiChat");
    } catch {
      toast.error("Failed to start chat. Opening coach...");
      openModal("aiChat");
    } finally {
      setAiThinking(false);
      setQuickPrompt("");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ── Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="live-dot" />
            <p className="micro-type text-primary">
              Career Intelligence Dashboard
            </p>
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-1">
            {loading ? "Loading…" : `Welcome back, ${firstName}.`}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="micro-type opacity-50">
              ID-{summary?.profile_id || "—"}
            </span>
            <span className="micro-type opacity-30">·</span>
            <span className="micro-type opacity-50">SG Region</span>
            <span className="micro-type opacity-30">·</span>
            <span className="micro-type text-primary">
              {readiness}% Aligned
            </span>
          </div>
        </div>
        <Button
          size="sm"
          className="clay-btn px-5 h-9 group shrink-0"
          asChild
        >
          <Link href="/recommendations">
            View Opportunities{" "}
            <ArrowUpRight className="ml-1.5 h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </Button>
      </header>

      {/* ── Main Layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* ── Left: Health + KPIs ── */}
        <div className="space-y-5">
          {/* Career Health Index */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="micro-type">Career Health Index</p>
              <Badge
                variant={readiness >= 70 ? "default" : "secondary"}
                className="micro-type text-[9px] px-2 py-0.5"
              >
                {readiness >= 70
                  ? "Strong"
                  : readiness >= 40
                    ? "Developing"
                    : "Starting"}
              </Badge>
            </div>
            {loading ? (
              <div className="flex justify-center">
                <Skeleton className="h-[120px] w-[140px] rounded-full" />
              </div>
            ) : (
              <HealthGauge score={readiness} />
            )}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-lg font-bold tabular-nums text-foreground">
                  {loading ? "—" : summary?.skills_count || 0}
                </div>
                <div className="micro-type text-[9px] opacity-60">
                  Skills Active
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold tabular-nums text-foreground">
                  {loading ? "—" : summary?.gaps_identified || 0}
                </div>
                <div className="micro-type text-[9px] opacity-60">
                  Gaps to Bridge
                </div>
              </div>
            </div>
          </div>

          {/* KPI tiles */}
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (
            summary && (
              <div className="grid grid-cols-2 gap-3">
                <KpiTile
                  icon={Briefcase}
                  label="Job Matches"
                  value={summary.recommendations_count}
                  delta={summary.recommendations_delta}
                  delay={0.1}
                />
                <KpiTile
                  icon={BarChart3}
                  label="Skill Gaps"
                  value={summary.gaps_identified}
                  delta={summary.gaps_delta}
                  delay={0.15}
                />
                <KpiTile
                  icon={Activity}
                  label="Profile Score"
                  value={`${readiness}%`}
                  delay={0.2}
                />
                <KpiTile
                  icon={TrendingUp}
                  label="Skills Tracked"
                  value={summary.skills_count}
                  delay={0.25}
                />
              </div>
            )
          )}

          {/* Quick Actions */}
          <div className="glass-card p-4">
            <p className="micro-type mb-3">Quick Actions</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "JD Match", icon: Layers, action: () => openModal("jdMatch") },
                { label: "Skill Gap", icon: BarChart3, action: () => openModal("skillGap") },
                {
                  label: "AI Coach",
                  icon: MessageSquare,
                  action: () => openModal("aiChat"),
                },
                {
                  label: "Courses",
                  icon: GraduationCap,
                  action: () => router.push("/courses"),
                },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 hover:bg-primary/8 hover:text-primary transition-colors duration-150 group text-left"
                >
                  <item.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Center: Target Opportunities ── */}
        <div className="xl:col-span-1 space-y-5">
          <div className="glass-card overflow-hidden h-full flex flex-col">
            <div className="flex items-center justify-between p-5 pb-3 border-b border-border/50">
              <div>
                <p className="micro-type">Target Opportunities</p>
                <p className="text-sm font-semibold mt-0.5">
                  Active Feed
                </p>
              </div>
              <Link
                href="/recommendations"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                All <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="flex-1 p-3 overflow-y-auto">
              {loading ? (
                <div className="space-y-2 p-2">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-12 rounded-lg" />
                  ))}
                </div>
              ) : recs.length > 0 ? (
                <div className="space-y-1">
                  {recs.map((rec, idx) => (
                    <OpportunityCard
                      key={rec.role_id || idx}
                      rec={rec}
                      index={idx}
                      onClick={() => openModal("roleMatch", rec)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center px-4">
                  <Target className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-semibold text-foreground">
                    No matches yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-[180px]">
                    Build your profile to unlock AI-matched opportunities.
                  </p>
                  <Button
                    size="sm"
                    className="clay-btn"
                    onClick={openProfileBuilder}
                  >
                    Build Profile
                  </Button>
                </div>
              )}
            </div>

            {recs.length > 0 && (
              <div className="p-3 border-t border-border/50">
                <Button
                  size="sm"
                  className="w-full clay-btn"
                  asChild
                >
                  <Link href="/recommendations">
                    Explore All Matches{" "}
                    <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Recommended Sequence + Growth Vectors ── */}
        <div className="space-y-5">
          {/* Recommended Sequence */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="micro-type">Recommended Sequence</p>
              <Brain className="h-4 w-4 text-primary opacity-60" />
            </div>
            <div className="space-y-3">
              {[
                {
                  step: "01",
                  action: "Complete Skill Assessment",
                  time: "15 min",
                  impact: "High",
                  href: "/skill-gap",
                },
                {
                  step: "02",
                  action: "Review Top Job Matches",
                  time: "10 min",
                  impact: "High",
                  href: "/recommendations",
                },
                {
                  step: "03",
                  action: "Enroll in Priority Course",
                  time: "3–6 wks",
                  impact: "Med",
                  href: "/courses",
                },
              ].map((item) => (
                <Link
                  key={item.step}
                  href={item.href}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-primary/5 transition-colors group border border-transparent hover:border-primary/15"
                >
                  <span className="font-mono text-[10px] font-bold text-primary/60 mt-0.5 shrink-0">
                    {item.step}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold group-hover:text-primary transition-colors">
                      {item.action}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="micro-type text-[9px] opacity-50">
                        {item.time}
                      </span>
                      <span className="micro-type text-[9px] text-primary opacity-70">
                        {item.impact} Impact
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary transition-colors mt-0.5 shrink-0" />
                </Link>
              ))}
            </div>
          </div>

          {/* Growth Vectors */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="micro-type">Growth Vectors</p>
              <Link
                href="/skill-gap"
                className="text-xs text-primary hover:underline flex items-center gap-0.5"
              >
                Full Matrix <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-6 rounded" />
                ))}
              </div>
            ) : skillVectors.length > 0 ? (
              <div className="space-y-3">
                {skillVectors.map((sv, i) => (
                  <GrowthBar key={sv.skill} skill={sv.skill} level={sv.level} index={i} />
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground">
                  Add skills to see growth vectors
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 text-xs"
                  onClick={openProfileBuilder}
                >
                  Add Skills
                </Button>
              </div>
            )}
          </div>

          {/* Market Status */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-3.5 w-3.5 text-secondary" />
              <p className="micro-type">SG Market Pulse</p>
            </div>
            <div className="space-y-2">
              {[
                { label: "Tech Hiring Volume", value: "↑ 12%" },
                { label: "AI/ML Demand", value: "Very High" },
                { label: "Avg Salary Growth", value: "+8.5%" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="text-xs font-bold text-primary">{item.value}</span>
                </div>
              ))}
            </div>
            <Link
              href="/market"
              className="flex items-center gap-1 mt-3 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              View market data <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
