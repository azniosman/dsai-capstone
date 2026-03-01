"use client";

import { useMemo } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { AppModal } from "@/components/ui/AppModal";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useModalStore } from "@/store/modalStore";
import {
  SkillRadar,
  type SkillRadarMetrics,
} from "@/components/ui/skill-radar";

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

const deterministicOffset = (skill: string) =>
  skill.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 2;

export default function RoleMatchModal() {
  const { isOpen, closeModal, data } = useModalStore();
  const rec = data as Recommendation | null;

  const radarData = useMemo(() => {
    if (!rec) return [];
    const shorten = (s: string) =>
      s && s.length > 14 ? s.slice(0, 14) + "…" : s || "";

    const missingPoints = (rec.missing_skills || [])
      .slice(0, 3)
      .map((skill) => ({
        skill: shorten(skill),
        userLevel: 1 + deterministicOffset(skill),
        requiredLevel: 4 + deterministicOffset(skill),
      }));

    const matchedPoints = (rec.matched_skills || [])
      .slice(0, 3)
      .map((skill) => ({
        skill: shorten(skill),
        userLevel: 3 + deterministicOffset(skill),
        requiredLevel: 3 + deterministicOffset(skill),
      }));

    return [...missingPoints, ...matchedPoints];
  }, [rec]);

  if (!rec) return null;

  const metrics: SkillRadarMetrics = {
    match_score: rec.match_score,
    content_score: rec.content_score ?? 0,
    rule_score: rec.rule_score ?? 0,
    career_switcher_bonus: rec.career_switcher_bonus ?? 0,
    skill_match_quality: rec.skill_match_quality ?? "developing",
    matched_count: rec.matched_skills?.length || 0,
    missing_count: rec.missing_skills?.length || 0,
    rationale: rec.rationale ?? "",
    salary_range: rec.salary_range,
  };

  return (
    <AppModal isOpen={isOpen} onClose={closeModal} size="lg" noPadding>
      <DialogTitle className="sr-only">{rec.title} — Role Match</DialogTitle>
      <DialogDescription className="sr-only">Skill match breakdown for {rec.title}</DialogDescription>
      {/* SkillRadar handles: KPI row, radar chart, score breakdown, rationale */}
      <SkillRadar data={radarData} roleName={rec.title} metrics={metrics} />

      {/* Full skill lists — not shown inside SkillRadar */}
      <div className="px-5 pb-5 pt-1 space-y-4">
        {rec.matched_skills?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <CheckCircle2
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: "hsl(145 60% 36%)" }}
              />
              <p className="text-xs font-bold text-foreground/70">
                Matched Skills
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {rec.matched_skills.map((s) => (
                <Badge
                  key={s}
                  className="text-xs bg-green-100 text-green-800 hover:bg-green-100 border-0"
                >
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {rec.missing_skills?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <XCircle
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: "hsl(5 78% 50%)" }}
              />
              <p className="text-xs font-bold text-foreground/70">
                Skills to Learn
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {rec.missing_skills.map((s) => (
                <Badge
                  key={s}
                  className="text-xs bg-red-100 text-red-800 hover:bg-red-100 border-0"
                >
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppModal>
  );
}
