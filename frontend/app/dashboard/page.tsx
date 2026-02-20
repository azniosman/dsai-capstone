"use client";

import { useState, useEffect } from "react";
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
        ? "bg-amber-500 dark:bg-amber-400"
        : "bg-destructive";
  return (
    <div className="score-bar-track w-20">
      <div
        className={`score-bar-fill ${fill}`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

/* KPI delta indicator */
function Delta({ value }: { value: number }) {
  if (value > 0)
    return (
      <span className="trend-up flex items-center gap-0.5">
        <ArrowUp className="h-2.5 w-2.5" />
        {value}
      </span>
    );
  if (value < 0)
    return (
      <span className="trend-down flex items-center gap-0.5">
        <ArrowDown className="h-2.5 w-2.5" />
        {Math.abs(value)}
      </span>
    );
  return (
    <span className="text-muted-foreground text-[0.68rem]">
      <Minus className="h-2.5 w-2.5 inline" />
    </span>
  );
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <Card key={i} variant="metric">
          <CardContent className="p-5">
            <Skeleton className="h-2.5 w-20 mb-4" />
            <Skeleton className="h-9 w-14 mb-2" />
            <Skeleton className="h-2.5 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [promptResponse, setPromptResponse] = useState<string | null>(null);
  const [engine, setEngine] = useState<string | null>(null);
  const [recs, setRecs] = useState<Recommendation[]>([]);

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
      } catch (err: any) {
        console.error(err);
        // Only show error toast if we don't already have cached data
        if (!cachedData) {
          toast.error(
            err.response?.data?.detail || "Failed to load dashboard data",
          );
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
      ? "status-success"
      : readiness >= 40
        ? "status-warning"
        : "status-error";
  const readinessFill =
    readiness >= 70
      ? "bg-emerald-500 dark:bg-emerald-400"
      : readiness >= 40
        ? "bg-amber-500 dark:bg-amber-400"
        : "bg-destructive";

  const firstName = summary?.name.split(" ")[0] ?? "";

  const profileCompleteness = summary
    ? (summary.name ? 25 : 0) +
      (summary.education ? 25 : 0) +
      (summary.years_experience > 0 ? 25 : 0) +
      (summary.skills_count > 0 ? 25 : 0)
    : 0;

  // Generate radar data based on the top recommendation
  const radarData = (() => {
    if (!summary || recs.length === 0) return [];
    const topRec = recs[0];
    const userSkills = summary.skills.map((s) => s.toLowerCase());

    // We mock the required skills based on the missing skills + some user skills
    // Ideally this comes from a backend endpoint `gap_analysis` for a specific role
    const data: Array<{
      skill: string;
      userLevel: number;
      requiredLevel: number;
    }> = [];

    // Add up to 3 missing skills with 0-2 user level, 4-5 required
    topRec.missing_skills.slice(0, 3).forEach((skill) => {
      data.push({
        skill: skill,
        userLevel: Math.floor(Math.random() * 2) + 1, // 1 or 2
        requiredLevel: Math.floor(Math.random() * 2) + 4, // 4 or 5
      });
    });

    // Add up to 3 possessed skills with 3-5 user level, 3-5 required
    const presentSkills = summary.skills
      .filter((s) => !topRec.missing_skills.includes(s))
      .slice(0, 3);
    presentSkills.forEach((skill) => {
      data.push({
        skill: skill,
        userLevel: Math.floor(Math.random() * 2) + 3, // 3 - 4
        requiredLevel: Math.floor(Math.random() * 2) + 3, // 3 - 4
      });
    });

    return data;
  })();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ─── Page Header ─── */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="live-dot" />
            <p className="section-label">Intelligence Dashboard</p>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {loading ? "Loading..." : `Welcome back, ${firstName}.`}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your career intelligence snapshot — updated in real time.
          </p>
        </div>
        <Button size="sm" variant="outline" asChild className="shrink-0">
          <Link href="/recommendations">
            All Matches <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </header>

      {/* ─── KPI Row ─── */}
      {loading ? (
        <KpiSkeleton />
      ) : (
        summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Skills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card variant="metric" className="hover-lift h-full">
                <CardContent className="p-5">
                  <p className="section-label mb-3">Skills Tracked</p>
                  <div className="kpi-number">{summary.skills_count}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-muted-foreground">
                      Active in profile
                    </p>
                    <Delta value={summary.skills_delta} />
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
              <Card variant="metric" className="hover-lift h-full">
                <CardContent className="p-5">
                  <p className="section-label mb-3">Job Matches</p>
                  <div className="kpi-number-accent">
                    {summary.recommendations_count}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-muted-foreground">
                      Roles available
                    </p>
                    <Delta value={summary.recommendations_delta} />
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
              <Card variant="metric" className="hover-lift h-full">
                <CardContent className="p-5">
                  <p className="section-label mb-3">Gaps Identified</p>
                  <div className="kpi-number status-warning">
                    {summary.gaps_identified}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-muted-foreground">To bridge</p>
                    <Delta value={summary.gaps_delta} />
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
              <Card variant="kpi" className="hover-lift h-full">
                <CardContent className="p-5">
                  <p className="section-label mb-3">Career Readiness</p>
                  <div className={`kpi-number-accent ${readinessColor}`}>
                    {readiness}
                    <span className="text-lg font-normal text-muted-foreground">
                      %
                    </span>
                  </div>
                  <div className="mt-3 score-bar-track w-full">
                    <div
                      className={`score-bar-fill ${readinessFill}`}
                      style={{ width: `${readiness}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Overall score
                  </p>
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
            <Card variant="elevated">
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-4 space-y-px">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-4 py-3.5 border-b border-border last:border-0"
                      >
                        <div className="space-y-1.5">
                          <Skeleton className="h-3.5 w-40" />
                          <Skeleton className="h-2.5 w-24" />
                        </div>
                        <Skeleton className="h-5 w-20" />
                      </div>
                    ))}
                  </div>
                ) : recs.length > 0 ? (
                  <div className="divide-y divide-border">
                    {recs.map((rec, idx) => {
                      const score = Math.round(rec.match_score * 100);
                      const scoreVariant =
                        score >= 70
                          ? "success"
                          : score >= 40
                            ? "warning"
                            : "secondary";
                      return (
                        <div
                          key={rec.role_id}
                          className="flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors duration-100 group"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <span className="text-xs font-mono text-muted-foreground/60 w-4 shrink-0 data-num">
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                            <div className="min-w-0">
                              <div className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                                {rec.title}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {rec.category}
                              </div>
                              <ScoreBar score={score} />
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-4">
                            <Badge variant={scoreVariant} className="data-num">
                              {score}%
                            </Badge>
                            <Button size="icon-sm" variant="ghost" asChild>
                              <Link href="/recommendations">
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Target className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      No matches yet
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Complete your profile to unlock job recommendations.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-4"
                      asChild
                    >
                      <Link href="/account">Build Profile</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Skill Radar Chart */}
          {recs.length > 0 && radarData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <SkillRadar data={radarData} roleName={recs[0].title} />
            </motion.div>
          )}
        </div>

        {/* Right Column — 1/3 */}
        <div className="space-y-5">
          {/* Quick Actions */}
          <div>
            <p className="section-label mb-2.5">Quick Actions</p>
            <Card variant="elevated">
              <CardContent className="p-2">
                <div className="grid grid-cols-2 gap-px">
                  {QUICK_ACTIONS.map((action) => (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="flex flex-col gap-2 p-3 rounded hover:bg-muted/40 transition-colors duration-100 group"
                    >
                      <action.icon className={`h-4 w-4 ${action.color}`} />
                      <div>
                        <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                          {action.label}
                        </div>
                        <div className="text-[0.65rem] text-muted-foreground leading-tight mt-0.5">
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
          <Card variant="highlight">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span
                  className="text-primary font-bold uppercase"
                  style={{ fontSize: "0.625rem", letterSpacing: "0.1em" }}
                >
                  Pro Insight
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground mb-1 leading-snug">
                Add a portfolio project
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Profiles with projects get{" "}
                <span className="text-foreground font-semibold">40% more</span>{" "}
                recruiter visibility and higher match scores.
              </p>
              <Button
                size="sm"
                variant="accent"
                className="mt-4 w-full"
                asChild
              >
                <Link href="/projects">
                  Add Project <ArrowUpRight className="ml-1.5 h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Progress Teaser */}
          <Card variant="inset">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="section-label">Activity</p>
                <Link
                  href="/progress"
                  className="text-xs text-primary hover:underline flex items-center gap-0.5"
                >
                  Details <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-3">
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
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">
                        {item.label}
                      </span>
                      <span className="text-xs font-semibold data-num">
                        {item.value}%
                      </span>
                    </div>
                    <div className="score-bar-track w-full">
                      <div
                        className="score-bar-fill bg-primary"
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
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
