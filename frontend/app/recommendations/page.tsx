"use client";

import { useEffect, useState } from "react";
import {
  Briefcase,
  Brain,
  RefreshCw,
  ChevronRight,
  Target,
  Zap,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, extractApiError } from "@/lib/utils";
import api from "@/lib/api-client";
import { useModalStore } from "@/store/modalStore";
import { useProfileBuilderStore } from "@/store/profileBuilderStore";

/* ─── Types ─── */
interface Recommendation {
  role_id: number;
  title: string;
  category: string;
  salary_range?: string;
  match_score: number;
  content_score: number;
  rule_score: number;
  skill_match_quality: string;
  career_switcher_bonus: number;
  matched_skills: string[];
  missing_skills: string[];
  rationale: string;
}

/* ─── Circular alignment gauge ─── */
function AlignmentGauge({ score }: { score: number }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const progress = arc * (score / 100);
  const color =
    score >= 70 ? "#6366f1" : score >= 40 ? "#f59e0b" : "#94a3b8";

  return (
    <div className="relative flex items-center justify-center">
      <svg width="110" height="95" viewBox="0 0 110 95">
        <circle
          cx="55"
          cy="62"
          r={r}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="8"
          strokeDasharray={`${arc} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-225 55 62)"
        />
        <circle
          cx="55"
          cy="62"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${progress} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-225 55 62)"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center mt-4">
        <span className="text-2xl font-black tabular-nums" style={{ color }}>
          {score}
        </span>
        <span className="micro-type text-[9px] opacity-50">match</span>
      </div>
    </div>
  );
}

/* ─── Score bar ─── */
function ScoreRow({
  label,
  score,
  color = "bg-primary",
}: {
  label: string;
  score: number;
  color?: string;
}) {
  const pct = Math.round(score * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="micro-type text-[9px]">{label}</span>
        <span className="micro-type text-[9px] text-primary">{pct}%</span>
      </div>
      <div className="score-bar-track">
        <motion.div
          className={cn("score-bar-fill", color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export default function Recommendations() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [selected, setSelected] = useState<Recommendation | null>(null);
  const [generating, setGenerating] = useState(false);
  const [aiText, setAiText] = useState<string | null>(null);

  const { openModal } = useModalStore();
  const openProfileBuilder = useProfileBuilderStore((s) => s.open);

  useEffect(() => {
    const profileId = localStorage.getItem("profileId");
    if (!profileId) {
      setLoading(false);
      return;
    }
    setHasProfile(true);

    api
      .post("/api/recommend", { profile_id: parseInt(profileId) })
      .then((res) => {
        const data: Recommendation[] = res.data.recommendations || [];
        setRecs(data);
        if (data.length > 0) setSelected(data[0]);
      })
      .catch((err) => setError(extractApiError(err, "Failed to load recommendations")))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerateInsight = async () => {
    if (!selected) return;
    setGenerating(true);
    setAiText(null);
    try {
      const pid = localStorage.getItem("profileId");
      const prompt = `Give a 3-sentence career insight for the role "${selected.title}" with match score ${Math.round(selected.match_score * 100)}%. Key skills I'm missing: ${(selected.missing_skills || []).slice(0, 3).join(", ") || "none"}. Keep it concise and actionable.`;
      const res = await api.post("/api/chat", {
        profile_id: pid ? parseInt(pid) : null,
        messages: [{ role: "user", content: prompt }],
      });
      let text = "";
      if (typeof res.data === "string") {
        text = res.data
          .split("\n")
          .filter((l: string) => !l.startsWith("[ENGINE:"))
          .join("\n")
          .trim();
      } else {
        text = res.data.reply ?? "";
      }
      setAiText(text || "Analysis complete.");
    } catch {
      setAiText("Unable to generate insight at this time.");
    } finally {
      setGenerating(false);
    }
  };

  const selectedScore = selected ? Math.round(selected.match_score * 100) : 0;

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col gap-4 min-h-0">
      {/* Header */}
      <header className="shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="live-dot" />
          <p className="micro-type text-primary">Target Search</p>
        </div>
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-2xl font-black tracking-tight">
            Active Opportunities
          </h1>
          {recs.length > 0 && (
            <span className="micro-type opacity-50">
              {recs.length} roles matched
            </span>
          )}
        </div>
      </header>

      {/* Error */}
      {error && (
        <Alert variant="destructive" className="shrink-0">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* No profile */}
      {!loading && !error && !hasProfile && (
        <div className="flex-1 flex items-center justify-center">
          <div className="glass-card p-8 text-center max-w-sm">
            <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-lg font-bold mb-2">No profile yet</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Build your profile to unlock AI-matched opportunities
            </p>
            <Button className="clay-btn" onClick={openProfileBuilder}>
              Build Profile
            </Button>
          </div>
        </div>
      )}

      {/* Two-panel layout */}
      {!loading && !error && hasProfile && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-0">
          {/* Left panel — job list */}
          <div className="lg:col-span-2 glass-card flex flex-col min-h-0">
            <div className="p-4 border-b border-border/50 shrink-0">
              <div className="flex items-center justify-between">
                <p className="micro-type">Matched Roles</p>
                <Badge variant="outline" className="micro-type text-[9px]">
                  {recs.length} total
                </Badge>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {recs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <Briefcase className="h-8 w-8 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-semibold">No matches found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Update your profile to get recommendations
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {recs.map((rec, idx) => {
                    const score = Math.round(rec.match_score * 100);
                    const isSelected = selected?.role_id === rec.role_id;
                    return (
                      <button
                        key={rec.role_id}
                        onClick={() => {
                          setSelected(rec);
                          setAiText(null);
                        }}
                        className={cn(
                          "w-full text-left p-4 transition-all duration-150 hover:bg-primary/5 group border-l-[2px]",
                          isSelected
                            ? "bg-primary/8 border-primary"
                            : "border-transparent",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="micro-type text-[9px] opacity-40 font-mono">
                                {String(idx + 1).padStart(2, "0")}
                              </span>
                              <span
                                className={cn(
                                  "text-sm font-semibold truncate",
                                  isSelected ? "text-primary" : "",
                                )}
                              >
                                {rec.title}
                              </span>
                            </div>
                            <div className="micro-type text-[9px] opacity-50 truncate">
                              {rec.category || "Technology"}
                              {rec.salary_range && ` · ${rec.salary_range}`}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span
                              className={cn(
                                "text-sm font-bold tabular-nums",
                                score >= 70
                                  ? "text-primary"
                                  : score >= 40
                                    ? "text-amber-500"
                                    : "text-muted-foreground",
                              )}
                            >
                              {score}%
                            </span>
                            {rec.career_switcher_bonus > 0 && (
                              <span className="micro-type text-[8px] text-green-600">
                                Switcher+
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Mini score bar */}
                        <div className="mt-2 score-bar-track">
                          <div
                            className="score-bar-fill bg-primary"
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right panel — job detail */}
          <div className="lg:col-span-3 glass-card flex flex-col min-h-0 overflow-hidden">
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key={selected.role_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col h-full min-h-0"
                >
                  {/* Detail header */}
                  <div className="p-5 border-b border-border/50 shrink-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="micro-type mb-1 opacity-50">Selected Target</p>
                        <h2 className="text-xl font-bold tracking-tight">
                          {selected.title}
                        </h2>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge variant="secondary" className="micro-type text-[9px]">
                            {selected.category || "Technology"}
                          </Badge>
                          {selected.salary_range && (
                            <Badge variant="outline" className="micro-type text-[9px] tabular-nums">
                              {selected.salary_range}
                            </Badge>
                          )}
                          {selected.career_switcher_bonus > 0 && (
                            <Badge variant="default" className="micro-type text-[9px] bg-green-600">
                              Career Switcher Bonus
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <AlignmentGauge score={selectedScore} />
                      </div>
                    </div>
                  </div>

                  {/* Detail body */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
                    {/* Score breakdown */}
                    <div>
                      <p className="micro-type mb-3">Alignment Matrix</p>
                      <div className="space-y-2.5">
                        <ScoreRow label="Overall Match" score={selected.match_score} />
                        <ScoreRow
                          label="Skill Content"
                          score={selected.content_score}
                          color="bg-secondary"
                        />
                        <ScoreRow
                          label="Profile Fit"
                          score={selected.rule_score}
                          color="bg-indigo-400"
                        />
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Matched */}
                      {(selected.matched_skills?.length || 0) > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                            <p className="micro-type text-green-700">
                              Matched ({selected.matched_skills.length})
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {selected.matched_skills.slice(0, 8).map((s) => (
                              <span
                                key={s}
                                className="text-xs px-2 py-0.5 rounded-md bg-green-50 text-green-700 border border-green-200 font-medium"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Missing */}
                      {(selected.missing_skills?.length || 0) > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                            <p className="micro-type text-red-600">
                              Gap Skills ({selected.missing_skills.length})
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {selected.missing_skills.slice(0, 8).map((s) => (
                              <span
                                key={s}
                                className="text-xs px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200 font-medium"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Rationale */}
                    {selected.rationale && (
                      <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                        <p className="micro-type mb-1.5 opacity-60">AI Rationale</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {selected.rationale}
                        </p>
                      </div>
                    )}

                    {/* AI Insight */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Brain className="h-3.5 w-3.5 text-primary" />
                          <p className="micro-type">Career Insight</p>
                        </div>
                        {aiText && (
                          <button
                            onClick={handleGenerateInsight}
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      {!aiText && !generating && (
                        <button
                          onClick={handleGenerateInsight}
                          className="w-full flex items-center gap-2 p-3 rounded-lg border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
                        >
                          <Sparkles className="h-4 w-4 text-primary/60 shrink-0" />
                          <span className="text-xs text-muted-foreground">
                            Generate AI career insight for this role…
                          </span>
                        </button>
                      )}

                      {generating && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                          <Sparkles className="h-4 w-4 text-primary animate-pulse shrink-0" />
                          <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                              <span
                                key={i}
                                className="animate-typing-dot inline-block w-1.5 h-1.5 rounded-full bg-primary"
                                style={{ animationDelay: `${i * 0.2}s` }}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {aiText && !generating && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 rounded-lg bg-primary/5 border border-primary/15 text-xs text-foreground leading-relaxed"
                        >
                          {aiText}
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* CTA footer */}
                  <div className="p-4 border-t border-border/50 shrink-0 flex gap-2">
                    <Button
                      className="flex-1 clay-btn"
                      onClick={() => openModal("matchIntelligence", selected)}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Match Intelligence Brief
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openModal("jdMatch")}
                      title="JD Match"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8 text-center">
                  <div>
                    <ChevronRight className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-muted-foreground">
                      Select a role to view details
                    </p>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 glass-card p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
          <div className="lg:col-span-3 glass-card p-5 space-y-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}
