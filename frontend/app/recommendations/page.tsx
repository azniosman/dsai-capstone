"use client";

import { useEffect, useState } from "react";
import {
  Briefcase,
  ChevronDown,
  Brain,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AIResponse } from "@/components/ui/ai-response";
import MatchScoreBar from "@/components/ui/match-score-bar";
import SkillChip from "@/components/ui/skill-chip";
import WorkflowStepper from "@/components/ui/workflow-stepper";
import EmptyState from "@/components/ui/empty-state";
import SkeletonCard from "@/components/ui/skeleton-card";
import api from "@/lib/api-client";
import { cn, extractApiError } from "@/lib/utils";

/* ──────────────────── Types ──────────────────── */
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

interface GapItem {
  skill: string;
  user_level: number;
  required_level: string;
  user_level_label: string;
  gap_severity: string;
  priority: number | string;
}

interface RoleGap {
  role_title: string;
  match_score: number;
  gaps: GapItem[];
}

interface MarketInsight {
  role_category: string;
  demand_level: string;
  avg_salary_sgd: number;
  yoy_growth_pct: number;
  hiring_volume: number;
  trending_skills: string[];
}

interface AnalysisState {
  loading: boolean;
  text: string | null;
  error: string | null;
}

interface ParsedSection {
  title: string;
  body: string;
}

/* ──────────────────── Helpers ──────────────────── */
const SEV_SCORE: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

/** Try to split LLM output into numbered sections. Falls back to null. */
function parseSections(text: string): ParsedSection[] | null {
  const pattern = /\d+\.\s+([^\n]+)\n([\s\S]*?)(?=\n\d+\.\s+|$)/g;
  const out: ParsedSection[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    const body = m[2].trim();
    if (body) out.push({ title: m[1].trim(), body });
  }
  return out.length >= 3 ? out : null;
}

function qualityVariant(q: string): "success" | "warning" | "muted" {
  if (q === "strong") return "success";
  if (q === "moderate") return "warning";
  return "muted";
}
function qualityLabel(q: string): string {
  if (q === "strong") return "Strong Match";
  if (q === "moderate") return "Moderate Match";
  return "Developing";
}

/** Build the structured career analysis prompt from real data */
function buildAnalysisPrompt(
  rec: Recommendation,
  roleGap: RoleGap | undefined,
  marketInsight: MarketInsight | undefined,
): string {
  const matchPct = Math.round(rec.match_score * 100);

  // ── Skill gap breakdown ──────────────────────────────
  let skillGapLines = "";
  const significantGaps =
    roleGap?.gaps?.filter((g) => g.gap_severity !== "none")?.slice(0, 6) ?? [];

  if (significantGaps.length > 0) {
    significantGaps.forEach((g) => {
      const gapScore = Math.round((1 - g.user_level) * 100);
      const weight =
        typeof g.priority === "number" ? g.priority : Number(g.priority) || 1;
      const impactScore = SEV_SCORE[g.gap_severity] ?? 1;
      const reqPct = g.required_level === "required" ? "100%" : "70%";
      const currPct = Math.round(g.user_level * 100) + "%";
      skillGapLines += `\n- Skill: ${g.skill}
  Required Level: ${reqPct}
  Current Level: ${currPct}
  Gap Score: ${gapScore}%
  Weight: ${weight}
  Impact Score: ${impactScore}`;
    });
  } else {
    // Fallback: derive from missing_skills
    (rec.missing_skills || []).slice(0, 5).forEach((skill, i) => {
      skillGapLines += `\n- Skill: ${skill}
  Required Level: 100%
  Current Level: 0%
  Gap Score: 100%
  Weight: ${5 - i}
  Impact Score: 3`;
    });
  }

  // ── Market demand index ──────────────────────────────
  let marketLines = "";
  if (marketInsight) {
    const skills = [
      ...new Set([
        ...(marketInsight.trending_skills || []),
        ...(rec.missing_skills || []),
      ]),
    ].slice(0, 5);
    skills.forEach((s) => {
      marketLines += `\n- ${s}: ${marketInsight.yoy_growth_pct}% YoY growth (${marketInsight.demand_level} demand, ${marketInsight.hiring_volume} open roles)`;
    });
  } else {
    (rec.missing_skills || []).slice(0, 4).forEach((s) => {
      marketLines += `\n- ${s}: N/A`;
    });
  }

  // ── Recommended skill (highest gap impact) ───────────
  const topGap =
    significantGaps.length > 0
      ? [...significantGaps].sort(
          (a, b) =>
            (SEV_SCORE[b.gap_severity] ?? 0) - (SEV_SCORE[a.gap_severity] ?? 0),
        )[0]
      : null;

  const recommendedSkill = topGap?.skill ?? rec.missing_skills?.[0] ?? "N/A";
  const recGapScore = topGap ? Math.round((1 - topGap.user_level) * 100) : 100;
  const recWeight = topGap
    ? typeof topGap.priority === "number"
      ? topGap.priority
      : Number(topGap.priority) || 1
    : 5;
  const selectionReason = topGap
    ? `Highest impact gap with ${topGap.gap_severity} severity (impact score: ${SEV_SCORE[topGap.gap_severity]}), weight: ${recWeight}, gap score: ${recGapScore}%.`
    : `Critical missing skill required for the ${rec.title} role with current proficiency at 0%.`;

  const confidenceScore = Math.round(rec.content_score * 100);

  return `You are an AI career coaching assistant.

Your role is to EXPLAIN the recommendation using the provided structured analysis.
You must NOT invent new numbers, skills, or metrics.
You must ONLY use the data given below.

If any required information is missing, respond:
"Insufficient data to generate analysis."

---

CAREER ANALYSIS DATA

Target Career: ${rec.title}

Match Score: ${matchPct}%

Skill Gap Breakdown:
${skillGapLines.trim() || "No significant skill gaps identified."}

Market Demand Index:
${marketLines.trim() || "No market data available."}

Recommended Skill:
${recommendedSkill}

Reason for Selection:
${selectionReason}

Confidence Score:
${confidenceScore}%

---

YOUR TASK

Generate a structured explanation with the following sections:

1. Summary of Match
   - Briefly interpret the match score.
   - Do NOT modify the score.

2. Key Skill Gaps
   - Explain the largest weighted gaps.
   - Reference impact scores explicitly.

3. Why ${recommendedSkill} Was Selected
   - Explain using:
     - Gap score
     - Weight
     - Demand index
   - Connect it to employability impact.

4. Improvement Projection
   - Explain how improving this skill could increase the match score.
   - Do NOT invent specific percentage increases unless provided.

5. Confidence in Analysis
   - Interpret the confidence score.

---

RULES

- Do NOT generate new skills.
- Do NOT change numeric values.
- Do NOT estimate missing metrics.
- Do NOT add unrelated advice.
- Keep response under 250 words.
- Use professional, clear tone.
- No markdown tables.
- Output clean readable paragraphs.

If data is inconsistent, state that clearly.`;
}

/* ──────────────────── Analysis display ──────────────────── */
function AnalysisPanel({
  state,
  onGenerate,
  onRegenerate,
}: {
  state: AnalysisState | undefined;
  onGenerate: () => void;
  onRegenerate: () => void;
}) {
  if (!state) {
    return (
      <div className="mt-4 pt-4 border-t border-border/30">
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-2 rounded-xl h-9 border-dashed hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all"
          onClick={(e) => {
            e.stopPropagation();
            onGenerate();
          }}
        >
          <Brain className="h-3.5 w-3.5" />
          Generate AI Career Analysis
        </Button>
      </div>
    );
  }

  if (state.loading) {
    return (
      <div className="mt-4 pt-4 border-t border-border/30">
        <div className="flex items-center gap-3 py-3 px-4 bg-muted/30 rounded-xl">
          <Sparkles className="h-4 w-4 text-primary animate-pulse shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <span
                  key={i}
                  className="animate-typing-dot inline-block w-1.5 h-1.5 rounded-full bg-primary"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Analysing your career fit…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="mt-4 pt-4 border-t border-border/30">
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-xs">{state.error}</AlertDescription>
        </Alert>
        <Button
          size="sm"
          variant="ghost"
          className="mt-2 text-xs gap-1.5"
          onClick={(e) => {
            e.stopPropagation();
            onRegenerate();
          }}
        >
          <RefreshCw className="h-3 w-3" /> Retry
        </Button>
      </div>
    );
  }

  if (state.text) {
    const sections = parseSections(state.text);

    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-4 pt-4 border-t border-border/30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg text-primary ring-1 ring-primary/20">
              <Brain className="h-3 w-3" />
            </div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-primary">
              AI Career Analysis
            </p>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground hover:text-primary"
            title="Regenerate"
            onClick={(e) => {
              e.stopPropagation();
              onRegenerate();
            }}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>

        {sections ? (
          /* Parsed sections — styled individually */
          <div className="space-y-3">
            {sections.map((s, i) => (
              <div
                key={i}
                className="bg-muted/20 rounded-xl p-3 border border-border/20"
              >
                <p className="text-[9px] uppercase tracking-widest font-bold text-primary mb-1.5">
                  {i + 1}. {s.title}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        ) : (
          /* Fallback: render with AIResponse */
          <AIResponse
            content={state.text}
            streaming={false}
            model="SkillBridge AI Coach"
          />
        )}
      </motion.div>
    );
  }

  return null;
}

/* ──────────────────── Page ──────────────────── */
export default function Recommendations() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Contextual data for prompt building
  const [gapsByRole, setGapsByRole] = useState<Record<string, RoleGap>>({});
  const [marketInsights, setMarketInsights] = useState<MarketInsight[]>([]);

  // Per-role AI analysis cache
  const [analysis, setAnalysis] = useState<Record<number, AnalysisState>>({});

  useEffect(() => {
    const profileId = localStorage.getItem("profileId");
    const token = localStorage.getItem("token");

    setTimeout(() => {
      setIsLoggedIn(!!token);
      if (!profileId) {
        setLoading(false);
        return;
      }
      setHasProfile(true);
    }, 0);

    if (!profileId) return;

    // Parallel fetch: recommendations + gap data + market insights
    Promise.allSettled([
      api.post("/api/recommend", { profile_id: parseInt(profileId) }),
      api.get(`/api/skill-gap/${profileId}`),
      api.get("/api/market-insights"),
    ])
      .then(([recsResult, gapResult, marketResult]) => {
        if (recsResult.status === "fulfilled") {
          const data: Recommendation[] =
            recsResult.value.data.recommendations || [];
          setRecs(data);
          if (data.length > 0) setExpandedId(data[0].role_id);
        } else {
          setError(
            extractApiError(recsResult.reason, "Failed to get recommendations"),
          );
        }

        if (gapResult.status === "fulfilled") {
          const gaps: RoleGap[] = gapResult.value.data.gaps ?? [];
          const byTitle: Record<string, RoleGap> = {};
          gaps.forEach((g) => {
            byTitle[g.role_title] = g;
          });
          setGapsByRole(byTitle);
        }

        if (marketResult.status === "fulfilled") {
          setMarketInsights(marketResult.value.data.insights ?? []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const getGapForRec = (rec: Recommendation): RoleGap | undefined => {
    const title = rec.title || "";
    const exact = gapsByRole[title];
    if (exact) return exact;
    // Partial match fallback
    const key = Object.keys(gapsByRole).find(
      (k) =>
        k.toLowerCase().includes(title.toLowerCase()) ||
        title.toLowerCase().includes(k.toLowerCase()),
    );
    return key ? gapsByRole[key] : undefined;
  };

  /** Find market insight for a recommendation's category */
  const getMarketForRec = (rec: Recommendation): MarketInsight | undefined => {
    const category = rec.category || "";
    return marketInsights.find(
      (i) =>
        (i.role_category || "")
          .toLowerCase()
          .includes(category.toLowerCase()) ||
        category.toLowerCase().includes((i.role_category || "").toLowerCase()),
    );
  };

  /** Call chat API with the structured prompt and cache result */
  const generateAnalysis = async (rec: Recommendation) => {
    const profileId = localStorage.getItem("profileId");
    const prompt = buildAnalysisPrompt(
      rec,
      getGapForRec(rec),
      getMarketForRec(rec),
    );

    setAnalysis((prev) => ({
      ...prev,
      [rec.role_id]: { loading: true, text: null, error: null },
    }));

    try {
      const res = await api.post("/api/chat", {
        profile_id: profileId ? parseInt(profileId) : null,
        messages: [{ role: "user", content: prompt }],
      });

      // Parse SSE format: strip [ENGINE:…] header line
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

      setAnalysis((prev) => ({
        ...prev,
        [rec.role_id]: {
          loading: false,
          text: text || "Insufficient data to generate analysis.",
          error: null,
        },
      }));
    } catch (err) {
      setAnalysis((prev) => ({
        ...prev,
        [rec.role_id]: {
          loading: false,
          text: null,
          error: extractApiError(
            err,
            "AI analysis unavailable. Please try again.",
          ),
        },
      }));
    }
  };

  return (
    <div className="space-y-5">
      <WorkflowStepper />

      <header>
        <p className="section-label mb-1">Intelligence</p>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Recommended Roles
        </h1>
      </header>

      {loading && <SkeletonCard count={3} />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && !error && !isLoggedIn && hasProfile && (
        <Card variant="highlight">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-bold mb-0.5">Save your results</p>
                <p className="text-xs text-muted-foreground">
                  Create an account to save your profile and get updated
                  recommendations.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  const pid = localStorage.getItem("profileId");
                  window.location.href = `/login?tab=register&profileId=${pid}`;
                }}
              >
                Sign Up to Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && !hasProfile && (
        <EmptyState
          icon={<Briefcase />}
          title="No profile yet"
          description="Create a profile to get personalised job recommendations based on your skills and experience."
        />
      )}

      {!loading && !error && recs.length > 0 && (
        <div className="flex flex-col gap-3">
          {recs.map((rec, idx) => {
            const isOpen = expandedId === rec.role_id;
            const recAnalysis = analysis[rec.role_id];

            return (
              <Card
                key={rec.role_id}
                variant="elevated"
                className={cn(
                  "hover-lift cursor-pointer transition-all duration-300",
                  isOpen && "ring-1 ring-primary/30",
                )}
                onClick={() => setExpandedId(isOpen ? null : rec.role_id)}
              >
                <CardContent className="p-5">
                  {/* ─── Always-visible header ─── */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground/60 data-num">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <h2 className="text-base font-bold">{rec.title}</h2>
                        <Badge
                          variant={qualityVariant(rec.skill_match_quality)}
                        >
                          {qualityLabel(rec.skill_match_quality)}
                        </Badge>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        <Badge variant="secondary">{rec.category}</Badge>
                        {rec.salary_range && (
                          <Badge variant="outline" className="data-num">
                            {rec.salary_range}
                          </Badge>
                        )}
                        {rec.career_switcher_bonus > 0 && (
                          <Badge variant="success">Career Switcher +</Badge>
                        )}
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground shrink-0 mt-1 transition-transform duration-300",
                        isOpen && "rotate-180",
                      )}
                    />
                  </div>

                  {/* Score bars */}
                  <div className="space-y-1.5 mb-3">
                    <MatchScoreBar score={rec.match_score} label="Overall" />
                    <MatchScoreBar score={rec.content_score} label="Skills" />
                    <MatchScoreBar score={rec.rule_score} label="Profile Fit" />
                  </div>

                  {/* Compact skill count preview (collapsed only) */}
                  {!isOpen && (
                    <div className="flex gap-3 text-xs mt-2">
                      <span
                        className="font-semibold"
                        style={{ color: "hsl(145 60% 36%)" }}
                      >
                        ✓ {rec.matched_skills?.length || 0} matched
                      </span>
                      <span
                        className="font-semibold"
                        style={{ color: "hsl(5 78% 50%)" }}
                      >
                        ✗ {rec.missing_skills?.length || 0} missing
                      </span>
                    </div>
                  )}

                  {/* ─── Expandable detail section ─── */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        {/* Rationale */}
                        <p className="text-sm text-muted-foreground mt-3 mb-4 leading-relaxed border-t border-border/40 pt-3">
                          {rec.rationale}
                        </p>

                        {/* Skill chips */}
                        {(rec.matched_skills?.length || 0) > 0 && (
                          <div className="mb-3">
                            <p className="section-label mb-1.5">
                              Matched Skills
                            </p>
                            <div className="flex gap-1 flex-wrap">
                              {(rec.matched_skills || []).map((s) => (
                                <SkillChip key={s} skill={s} severity="none" />
                              ))}
                            </div>
                          </div>
                        )}

                        {(rec.missing_skills?.length || 0) > 0 && (
                          <div className="mb-1">
                            <p className="section-label mb-1.5">
                              Missing Skills
                            </p>
                            <div className="flex gap-1 flex-wrap">
                              {(rec.missing_skills || []).map((s) => (
                                <SkillChip key={s} skill={s} severity="high" />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ─── AI Career Analysis ─── */}
                        <AnalysisPanel
                          state={recAnalysis}
                          onGenerate={() => generateAnalysis(rec)}
                          onRegenerate={() => generateAnalysis(rec)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
