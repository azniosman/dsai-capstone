"use client";

import { useEffect, useState } from "react";
import { Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import MatchScoreBar from "@/components/match-score-bar";
import SkillChip from "@/components/skill-chip";
import WorkflowStepper from "@/components/workflow-stepper";
import EmptyState from "@/components/empty-state";
import SkeletonCard from "@/components/skeleton-card";
import api from "@/lib/api-client";

const QUALITY_BADGE: Record<string, { className: string; label: string }> = {
  strong: { className: "bg-green-100 text-green-800 hover:bg-green-100", label: "Strong Match" },
  moderate: { className: "bg-orange-100 text-orange-800 hover:bg-orange-100", label: "Moderate Match" },
  developing: { className: "bg-gray-100 text-gray-800 hover:bg-gray-100", label: "Developing" },
};

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

  useEffect(() => {
    const profileId = localStorage.getItem("profileId");
    if (!profileId) { setLoading(false); return; }
    api
      .post("/api/recommend", { profile_id: parseInt(profileId) })
      .then((res) => setRecs(res.data.recommendations))
      .catch((err) => setError(err.response?.data?.detail || "Failed to get recommendations"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <WorkflowStepper />
      <h1 className="text-2xl font-bold mb-4">Recommended Job Roles</h1>

      {loading && <SkeletonCard count={3} />}
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {!loading && !error && !localStorage.getItem("profileId") && (
        <EmptyState
          icon={<Briefcase />}
          title="No profile yet"
          description="Create a profile to get personalized job recommendations based on your skills and experience."
        />
      )}

      {!loading && !error && recs.length > 0 && (
        <div className="flex flex-col gap-4">
          {recs.map((rec) => {
            const quality = QUALITY_BADGE[rec.skill_match_quality] || QUALITY_BADGE.developing;
            return (
              <Card key={rec.role_id} className="p-6">
                <CardContent className="p-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-lg font-bold">{rec.title}</h2>
                        <Badge className={quality.className}>{quality.label}</Badge>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        <Badge variant="secondary">{rec.category}</Badge>
                        {rec.salary_range && <Badge variant="outline">{rec.salary_range}</Badge>}
                        {rec.career_switcher_bonus > 0 && (
                          <Badge className="bg-[#00897b] hover:bg-[#00897b] text-white">Career Switcher +</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    <MatchScoreBar score={rec.match_score} label="Overall" />
                    <MatchScoreBar score={rec.content_score} label="Skills" />
                    <MatchScoreBar score={rec.rule_score} label="Profile Fit" />
                  </div>

                  <p className="text-sm text-muted-foreground mt-3">{rec.rationale}</p>

                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-1">Matched Skills:</p>
                    <div className="flex gap-1 flex-wrap">
                      {rec.matched_skills.map((s) => (
                        <SkillChip key={s} skill={s} severity="none" />
                      ))}
                    </div>
                  </div>

                  {rec.missing_skills.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">Missing Skills:</p>
                      <div className="flex gap-1 flex-wrap">
                        {rec.missing_skills.map((s) => (
                          <SkillChip key={s} skill={s} severity="high" />
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
