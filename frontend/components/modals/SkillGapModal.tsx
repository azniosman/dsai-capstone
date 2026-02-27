"use client";

import { AppModal } from "@/components/ui/AppModal";
import { useModalStore } from "@/store/modalStore";
import { useQuery } from "@tanstack/react-query";
import { skillGapApi, type RoleGap, type GapItem } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, BarChart3, AlertTriangle, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Normalize role display name across mocked (targetRole) and full (role_title) backend responses */
function getRoleTitle(role: RoleGap): string {
  return role.role_title ?? role.targetRole ?? "Unknown Role";
}

/** Normalize gap severity across mocked (gapSeverity) and full (gap_severity) backend responses */
function isHighPriority(gap: GapItem): boolean {
  const severity = gap.gapSeverity ?? gap.gap_severity;
  return severity === "high" || gap.priority === "high";
}

export default function SkillGapModal() {
  const { isOpen, closeModal } = useModalStore();
  const [profileId, setProfileId] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setIsMounted(true);
      const pid = localStorage.getItem("profileId");
      if (pid) setProfileId(parseInt(pid, 10));
    }, 0);
  }, [isOpen]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["skillGaps", profileId],
    queryFn: () => skillGapApi.get(profileId!),
    enabled: isOpen && !!profileId,
  });

  if (!isMounted) return null;

  // Backend returns `gaps` (not `skill_gaps`)
  const topRoles = data?.gaps?.slice(0, 2) || [];

  return (
    <AppModal
      isOpen={isOpen}
      onClose={closeModal}
      size="lg"
      title="Skill Gap Analysis"
      description="Identify critical skills you need to develop to reach your target roles."
      isLoading={isLoading}
      footer={
        <div className="flex w-full justify-between items-center">
          <Button variant="ghost" onClick={closeModal}>
            Close
          </Button>
          <Button asChild>
            <Link href="/skill-gap" onClick={closeModal}>
              View Detailed Matrix <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      }
    >
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-medium">
          Failed to load skill gap analysis. Please try again.
        </div>
      )}

      {!isLoading && !error && topRoles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="h-16 w-16 rounded-3xl bg-muted/50 flex items-center justify-center mb-4">
            <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-base font-bold text-foreground">
            No matches found
          </p>
          <p className="text-sm font-medium text-muted-foreground mt-1.5 max-w-[250px]">
            Go to the Career Analysis to generate target roles first.
          </p>
        </div>
      )}

      {!isLoading && !error && topRoles.length > 0 && (
        <div className="space-y-6">
          {topRoles.map((role, idx) => {
            const highPriorityGaps = role.gaps.filter(isHighPriority);
            const score = Math.round((role.match_score ?? 0) * 100);

            return (
              <div key={role.role_id ?? idx} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {getRoleTitle(role)}
                  </h4>
                  {score > 0 && (
                    <Badge
                      variant={score >= 70 ? "success" : "secondary"}
                      className="text-[10px]"
                    >
                      {score}% Match
                    </Badge>
                  )}
                </div>

                <Card className="clay-card overflow-hidden">
                  <CardContent className="p-4 space-y-4">
                    {highPriorityGaps.length > 0 ? (
                      <div>
                        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <AlertTriangle className="h-3 w-3" /> Priority Gaps
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {highPriorityGaps.map((gap, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between bg-background p-2.5 rounded-lg border border-border/50"
                            >
                              <span className="font-semibold text-xs">
                                {gap.skill}
                              </span>
                              {gap.required_level && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] border-amber-500/30 text-amber-600 bg-amber-500/5 px-1.5"
                                >
                                  Lvl {gap.required_level} Req
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-emerald-600 font-medium">
                        No critical gaps identified for this role.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}

          <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
            <div className="max-w-[70%]">
              <h4 className="font-bold text-sm mb-1 text-primary">
                Ready to close the gap?
              </h4>
              <p className="text-xs text-muted-foreground leading-snug">
                SkillBridge has generated an intelligent roadmap of SCTP courses
                to help you acquire these skills.
              </p>
            </div>
            <Button size="sm" asChild className="shrink-0 shadow-sm">
              <Link href="/roadmap" onClick={closeModal}>
                <Play className="mr-1.5 h-3 w-3 fill-current" /> Auto-Upskill
              </Link>
            </Button>
          </div>
        </div>
      )}
    </AppModal>
  );
}
