"use client";

import { useEffect, useState } from "react";
import { Briefcase, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import MatchScoreBar from "@/components/match-score-bar";
import SkillChip from "@/components/skill-chip";
import WorkflowStepper from "@/components/workflow-stepper";
import EmptyState from "@/components/empty-state";
import SkeletonCard from "@/components/skeleton-card";
import api from "@/lib/api-client";
import { cn, extractApiError } from "@/lib/utils";

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

export default function Recommendations() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

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
    api
      .post("/api/recommend", { profile_id: parseInt(profileId) })
      .then((res) => {
        const data: Recommendation[] = res.data.recommendations;
        setRecs(data);
        if (data.length > 0) setExpandedId(data[0].role_id); // auto-expand first
      })
      .catch((err: unknown) =>
        setError(extractApiError(err, "Failed to get recommendations")),
      )
      .finally(() => setLoading(false));
  }, []);

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
                  {/* ─── Always visible header ─── */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground/60 data-num">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <h2 className="text-base font-bold">{rec.title}</h2>
                        <Badge variant={qualityVariant(rec.skill_match_quality)}>
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

                  <div className="space-y-1.5 mb-3">
                    <MatchScoreBar score={rec.match_score} label="Overall" />
                    <MatchScoreBar score={rec.content_score} label="Skills" />
                    <MatchScoreBar score={rec.rule_score} label="Profile Fit" />
                  </div>

                  {/* Compact preview: skill counts when collapsed */}
                  {!isOpen && (
                    <div className="flex gap-3 text-xs mt-2">
                      <span className="font-semibold" style={{ color: "hsl(145 60% 36%)" }}>
                        ✓ {rec.matched_skills.length} matched
                      </span>
                      <span className="font-semibold" style={{ color: "hsl(5 78% 50%)" }}>
                        ✗ {rec.missing_skills.length} missing
                      </span>
                    </div>
                  )}

                  {/* ─── Expandable details ─── */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <p className="text-sm text-muted-foreground mt-3 mb-4 leading-relaxed border-t border-border/40 pt-3">
                          {rec.rationale}
                        </p>

                        {rec.matched_skills.length > 0 && (
                          <div className="mb-3">
                            <p className="section-label mb-1.5">Matched Skills</p>
                            <div className="flex gap-1 flex-wrap">
                              {rec.matched_skills.map((s) => (
                                <SkillChip key={s} skill={s} severity="none" />
                              ))}
                            </div>
                          </div>
                        )}

                        {rec.missing_skills.length > 0 && (
                          <div>
                            <p className="section-label mb-1.5">Missing Skills</p>
                            <div className="flex gap-1 flex-wrap">
                              {rec.missing_skills.map((s) => (
                                <SkillChip key={s} skill={s} severity="high" />
                              ))}
                            </div>
                          </div>
                        )}
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
