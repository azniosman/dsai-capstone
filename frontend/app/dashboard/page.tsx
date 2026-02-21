"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Briefcase,
  BarChart3,
  MessageSquare,
  HelpCircle,
  GraduationCap,
  TrendingUp,
  Zap,
  Target,
  ArrowUpRight,
  Brain,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PromptInput } from "@/components/ui/prompt-input";
import { AIResponse } from "@/components/ui/ai-response";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, extractApiError } from "@/lib/utils";
import api from "@/lib/api-client";
import { SkillRadar } from "@/components/ui/skill-radar";

import { toast } from "sonner";

/* ───────── Types ───────── */
interface DashboardSummary {
  profile_id: number;
  name: string;
  education: string | null;
  years_experience: number;
  is_career_switcher: boolean;
  skills: string[];
  skills_count: number;
  recommendations_count: number;
  gaps_identified: number;
  progress_entries: number;
  career_readiness: number;
  skills_delta: number;
  recommendations_delta: number;
  gaps_delta: number;
}
interface Recommendation {
  role_id: number;
  title: string;
  category: string;
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
}

const QUICK_ACTIONS = [
  {
    label: "Job Matches",
    desc: "Matched roles",
    icon: Briefcase,
    href: "/recommendations",
    color: "text-primary",
  },
  {
    label: "Skill Gaps",
    desc: "Gap analysis",
    icon: BarChart3,
    href: "/skill-gap",
    color: "text-primary/70",
  },
  {
    label: "Career Coach",
    desc: "AI guidance",
    icon: MessageSquare,
    href: "/chat",
    color: "text-primary",
  },
  {
    label: "Interview Prep",
    desc: "Mock questions",
    icon: HelpCircle,
    href: "/interview",
    color: "text-primary/80",
  },
  {
    label: "Courses",
    desc: "SCTP pathways",
    icon: GraduationCap,
    href: "/courses",
    color: "text-accent-foreground",
  },
  {
    label: "Market Trends",
    desc: "Live market data",
    icon: TrendingUp,
    href: "/market",
    color: "text-primary/60",
  },
];

/* Score bar with semantic coloring */
function ScoreBar({ score }: { score: number }) {
  const fill =
    score >= 70
      ? "bg-primary"
      : score >= 40
        ? "bg-amber-500"
        : "bg-destructive";
  return (
    <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        className={`h-full ${fill} shadow-[0_0_10px_rgba(inherit,0.5)]`}
      />
    </div>
  );
}

/* KPI delta indicator */
function Delta({ value }: { value: number }) {
  if (value > 0)
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
        <ArrowUp className="h-3 w-3" />
        {value}
      </span>
    );
  if (value < 0)
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-md">
        <ArrowDown className="h-3 w-3" />
        {Math.abs(value)}
      </span>
    );
  return (
    <span className="text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md">
      <Minus className="h-3 w-3 inline" />
    </span>
  );
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card
          key={i}
          className="rounded-[1.5rem] bg-card/40 border-border/40 overflow-hidden shadow-sm"
        >
          <CardContent className="p-5">
            <Skeleton className="h-3 w-24 mb-4" />
            <Skeleton className="h-10 w-16 mb-2" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Animated Number Counter */
function CountingNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1500; // ms
    const increment = value / (duration / 16);

    const animate = () => {
      start += increment;
      if (start < value) {
        setDisplayValue(Math.ceil(start));
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };
    requestAnimationFrame(animate);
  }, [value]);

  return <span>{displayValue}</span>;
}

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [promptResponse, setPromptResponse] = useState<string | null>(null);
  const [engine, setEngine] = useState<string | null>(null);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [hoveredRecIdx, setHoveredRecIdx] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      const profileId = localStorage.getItem("profileId");

      // OPTIMISTIC UI: Try to load from cache first for instant rendering
      const cachedData = sessionStorage.getItem("dashboard_cache");
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          if (parsed.summary) setSummary(parsed.summary);
          if (parsed.recs) setRecs(parsed.recs);
          setLoading(false); // Instantly turn off skeleton loaders
        } catch (e) {
          console.error("Failed to parse dashboard cache", e);
        }
      }

      try {
        const summaryRes = await api.get("/api/dashboard/summary");
        let newSummary = null;
        let newRecs: Recommendation[] = [];

        if (summaryRes) {
          newSummary = summaryRes.data;
          setSummary(newSummary);
          if (newSummary?.profile_id) {
            localStorage.setItem("profileId", String(newSummary.profile_id));
          }
        }

        const pid =
          profileId || (newSummary ? String(newSummary.profile_id) : null);
        if (pid) {
          const recsRes = await api.post("/api/recommend", {
            profile_id: Number(pid),
          });
          if (recsRes) {
            newRecs = recsRes.data.recommendations?.slice(0, 5) || [];
            setRecs(newRecs);
          }
        }

        // Save fresh data to cache for next navigation
        if (newSummary) {
          sessionStorage.setItem(
            "dashboard_cache",
            JSON.stringify({
              summary: newSummary,
              recs: newRecs,
            }),
          );
        }
      } catch (err: unknown) {
        console.error(err);
        // Only show error toast if we don't already have cached data
        if (!cachedData) {
          toast.error(extractApiError(err, "Failed to load dashboard data"));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  const handlePromptSubmit = async (value: string) => {
    setAiThinking(true);
    setPromptResponse(null);
    setEngine(null);
    try {
      const profileId = localStorage.getItem("profileId");
      const res = await api.post("/api/chat", {
        profile_id: profileId ? parseInt(profileId) : null,
        messages: [{ role: "user", content: value }],
      });
      setPromptResponse(res.data.reply);
      if (res.data.engine) {
        setEngine(res.data.engine);
      }
    } catch (err) {
      console.error(err);
      setPromptResponse("Sorry, I encountered an error. Please try again.");
      toast.error("Failed to get AI response");
    } finally {
      setAiThinking(false);
    }
  };

  const readiness = summary ? Math.round(summary.career_readiness) : 0;
  // Readiness uses semantic status utilities (defined in globals.css)
  const readinessColor =
    readiness >= 70
      ? "text-primary shadow-primary/20"
      : readiness >= 40
        ? "text-amber-500 shadow-amber-500/20"
        : "text-destructive shadow-destructive/20";

  const firstName = summary?.name.split(" ")[0] ?? "";

  const profileCompleteness = summary
    ? (summary.name ? 25 : 0) +
      (summary.education ? 25 : 0) +
      (summary.years_experience > 0 ? 25 : 0) +
      (summary.skills_count > 0 ? 25 : 0)
    : 0;

  // Deterministic level offset from skill string (avoids Math.random re-renders)
  const deterministicOffset = (skill: string) =>
    skill.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 2;

  // Radar data for whichever role is currently hovered — deterministic, no Math.random
  const radarData = useMemo(() => {
    if (!summary || recs.length === 0) return [];
    const rec = recs[hoveredRecIdx] ?? recs[0];
    const shorten = (s: string) => (s.length > 14 ? s.slice(0, 14) + "…" : s);

    const missingPoints = rec.missing_skills.slice(0, 3).map((skill) => ({
      skill: shorten(skill),
      userLevel: 1 + deterministicOffset(skill),   // 1 or 2
      requiredLevel: 4 + deterministicOffset(skill), // 4 or 5
    }));

    const matchedSource = rec.matched_skills?.length
      ? rec.matched_skills
      : summary.skills.filter((s) => !rec.missing_skills.includes(s));

    const matchedPoints = matchedSource.slice(0, 3).map((skill) => ({
      skill: shorten(skill),
      userLevel: 3 + deterministicOffset(skill),    // 3 or 4
      requiredLevel: 3 + deterministicOffset(skill), // 3 or 4
    }));

    return [...missingPoints, ...matchedPoints];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, recs, hoveredRecIdx]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ─── Page Header ─── */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="live-dot" />
            <p className="section-label text-primary font-bold tracking-widest text-[10px]">
              INTELLIGENCE DASHBOARD
            </p>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
            {loading ? "Welcome." : `Welcome back, ${firstName}.`}
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            Your career intelligence snapshot — updated in real time.
          </p>
        </div>
        <Button
          size="sm"
          className="shrink-0 rounded-full shadow-md bg-foreground text-background hover:bg-foreground/90 font-semibold px-5 h-10 group"
          asChild
        >
          <Link href="/recommendations">
            All Matches{" "}
            <ArrowUpRight className="ml-1.5 h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </Button>
      </header>

      {/* ─── KPI Row (Bento Grid Style) ─── */}
      {loading ? (
        <KpiSkeleton />
      ) : (
        summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Skills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="h-full rounded-[1.5rem] bg-card/40 backdrop-blur-xl border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:bg-primary/10 transition-colors" />
                <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
                  <div>
                    <div className="p-2 bg-primary/10 w-fit rounded-xl mb-4 text-primary ring-1 ring-primary/20">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
                      Skills Tracked
                    </p>
                  </div>
                  <div>
                    <div className="text-4xl font-black tracking-tighter text-foreground mb-2 flex items-baseline">
                      <CountingNumber value={summary.skills_count} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Delta value={summary.skills_delta} />
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                        Active in profile
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Job Matches */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="h-full rounded-[1.5rem] bg-card/40 backdrop-blur-xl border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:bg-primary/10 transition-colors" />
                <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
                  <div>
                    <div className="p-2 bg-primary/10 w-fit rounded-xl mb-4 text-primary ring-1 ring-primary/20">
                      <Target className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
                      Job Matches
                    </p>
                  </div>
                  <div>
                    <div className="text-4xl font-black tracking-tighter text-primary mb-2 flex items-baseline">
                      <CountingNumber value={summary.recommendations_count} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Delta value={summary.recommendations_delta} />
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                        Roles available
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Gaps */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="h-full rounded-[1.5rem] bg-card/40 backdrop-blur-xl border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:bg-amber-500/10 transition-colors" />
                <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
                  <div>
                    <div className="p-2 bg-amber-500/10 w-fit rounded-xl mb-4 text-amber-500 ring-1 ring-amber-500/20">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
                      Gaps Identified
                    </p>
                  </div>
                  <div>
                    <div className="text-4xl font-black tracking-tighter text-amber-500 mb-2 flex items-baseline">
                      <CountingNumber value={summary.gaps_identified} />
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Negative delta is conceptually good here (less gaps), but UI logic remains standard for now */}
                      <Delta value={summary.gaps_delta} />
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                        To bridge
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Career Readiness */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="h-full rounded-[1.5rem] bg-card/40 backdrop-blur-xl border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden group">
                <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent pointer-events-none -z-10 opacity-50" />
                <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
                  <div>
                    <div className="p-2 bg-background w-fit rounded-xl mb-4 text-foreground ring-1 ring-border shadow-sm">
                      <Zap className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
                      Career Readiness
                    </p>
                  </div>
                  <div>
                    <div
                      className={cn(
                        "text-4xl font-black tracking-tighter mb-3 flex items-baseline drop-shadow-md",
                        readinessColor,
                      )}
                    >
                      <CountingNumber value={readiness} />
                      <span className="text-xl font-bold ml-1">%</span>
                    </div>
                    <ScoreBar score={readiness} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )
      )}

      {/* ─── AI Assistant ─── */}
      <section>
        <div className="flex justify-between items-end mb-2.5">
          <p className="section-label">AI Assistant</p>
          {engine && (
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-1.5 opacity-70">
              <span className="live-dot w-1.5! h-1.5!" />
              Bedrock Engine
              <span className="text-xs text-muted-foreground ml-1">
                v2 Streaming
              </span>
            </div>
          )}
        </div>
        <Card variant="data">
          <CardContent className="p-4">
            <PromptInput
              placeholder="Ask about your career path, skill gaps, or market trends..."
              onPromptSubmit={handlePromptSubmit}
              loading={aiThinking}
              className="border-0 shadow-none p-0 bg-transparent"
            />
            {(aiThinking || promptResponse) && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="h-4 w-4 text-primary" />
                  <span
                    className="text-xs font-bold text-primary tracking-wide uppercase"
                    style={{ letterSpacing: "0.08em", fontSize: "0.625rem" }}
                  >
                    AI Analysis
                  </span>
                </div>
                <AIResponse
                  streaming={aiThinking}
                  content={promptResponse || "Analyzing your profile..."}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ─── Main Grid ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Recommended Roles — 2/3 */}
        <div className="xl:col-span-2 flex flex-col gap-5">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <p className="section-label">Recommended Roles</p>
              <Link
                href="/recommendations"
                className="text-xs text-primary hover:underline flex items-center gap-0.5"
              >
                See all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <Card className="rounded-[1.5rem] bg-card/40 backdrop-blur-xl border-border/40 overflow-hidden shadow-xl">
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-4 space-y-px">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-5 py-4 border-b border-border/50 last:border-0"
                      >
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-6 w-16 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : recs.length > 0 ? (
                  <div className="divide-y divide-border/30">
                    {recs.map((rec, idx) => {
                      const score = Math.round(rec.match_score * 100);
                      const scoreVariant =
                        score >= 70
                          ? "success"
                          : score >= 40
                            ? "warning"
                            : "secondary";
                      const isActive = hoveredRecIdx === idx;
                      return (
                        <div
                          key={rec.role_id}
                          onMouseEnter={() => setHoveredRecIdx(idx)}
                          className={cn(
                            "flex items-center justify-between px-6 py-4.5 transition-all duration-200 group cursor-pointer border-l-[3px]",
                            isActive
                              ? "bg-primary/5 border-primary"
                              : "border-transparent hover:bg-muted/30",
                          )}
                        >
                          <div className="flex items-center gap-5 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0 border border-border/50 text-xs font-bold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 transition-colors">
                              {idx + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-sm truncate group-hover:text-primary transition-colors tracking-tight">
                                {rec.title}
                              </div>
                              <div className="text-xs font-medium text-muted-foreground mt-0.5 mb-2 truncate">
                                {rec.category}
                              </div>
                              <div className="max-w-[150px]">
                                <ScoreBar score={score} />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-4">
                            <Badge
                              variant={scoreVariant}
                              className="px-2 py-0.5 rounded-md font-bold text-[10px] tracking-wider uppercase drop-shadow-sm"
                            >
                              {score}% Match
                            </Badge>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0"
                              asChild
                            >
                              <Link href="/recommendations">
                                <ArrowUpRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                    <div className="h-16 w-16 rounded-3xl bg-muted/50 flex items-center justify-center mb-4 ring-1 ring-border shadow-inner">
                      <Target className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <p className="text-base font-bold text-foreground">
                      No matches yet
                    </p>
                    <p className="text-sm font-medium text-muted-foreground mt-1.5 max-w-[250px]">
                      Complete your profile to unlock precision job
                      recommendations.
                    </p>
                    <Button
                      size="sm"
                      className="mt-6 rounded-full px-6 shadow-md shadow-primary/20"
                      asChild
                    >
                      <Link href="/account">Build Profile</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Skill Radar Chart — updates on role hover */}
          {recs.length > 0 && radarData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <SkillRadar
                data={radarData}
                roleName={(recs[hoveredRecIdx] ?? recs[0]).title}
              />
            </motion.div>
          )}
        </div>

        {/* Right Column — 1/3 */}
        <div className="space-y-5">
          {/* Quick Actions */}
          <div>
            <p className="section-label mb-2.5">Quick Actions</p>
            <Card className="rounded-[1.5rem] bg-card/40 backdrop-blur-xl border-border/40 overflow-hidden shadow-xl">
              <CardContent className="p-2">
                <div className="grid grid-cols-2 gap-px bg-border/20">
                  {QUICK_ACTIONS.map((action) => (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="flex flex-col gap-2 p-4 bg-background/50 hover:bg-muted/40 transition-colors duration-200 group"
                    >
                      <action.icon
                        className={cn(
                          "h-4 w-4 transition-transform group-hover:scale-110",
                          action.color,
                        )}
                      />
                      <div>
                        <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                          {action.label}
                        </div>
                        <div className="text-[10px] font-medium text-muted-foreground leading-tight mt-1">
                          {action.desc}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pro Insight */}
          <Card className="rounded-[1.5rem] bg-card/40 backdrop-blur-xl border-border/40 overflow-hidden shadow-xl relative group">
            <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-transparent pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-4 w-4 text-primary animate-pulse" />
                <span
                  className="text-primary font-bold uppercase"
                  style={{ fontSize: "0.65rem", letterSpacing: "0.15em" }}
                >
                  Pro Insight
                </span>
              </div>
              <p className="text-sm font-bold text-foreground mb-1.5 leading-snug">
                Add a portfolio project
              </p>
              <p className="text-xs font-medium text-muted-foreground leading-relaxed mb-5">
                Profiles with projects get{" "}
                <span className="text-foreground font-bold">40% more</span>{" "}
                recruiter visibility.
              </p>
              <Button
                size="sm"
                className="w-full rounded-full shadow-md shadow-primary/20 bg-primary/10 text-primary hover:bg-primary/20 border-0"
                asChild
              >
                <Link href="/projects">
                  Add Project <ArrowUpRight className="ml-1.5 h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Progress Teaser */}
          <Card className="rounded-[1.5rem] bg-card/40 backdrop-blur-xl border-border/40 overflow-hidden shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-5">
                <p className="section-label">Activity</p>
                <Link
                  href="/progress"
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
                >
                  Details <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-4">
                {[
                  { label: "Profile completeness", value: profileCompleteness },
                  {
                    label: "Skills assessed",
                    value: summary
                      ? Math.min(100, summary.skills_count * 5)
                      : 40,
                  },
                  { label: "Readiness score", value: readiness },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        {item.label}
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {item.value}%
                      </span>
                    </div>
                    <ScoreBar score={item.value} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
