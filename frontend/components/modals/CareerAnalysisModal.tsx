"use client";

import { AppModal } from "@/components/ui/AppModal";
import { useModalStore } from "@/store/modalStore";
import { useQuery } from "@tanstack/react-query";
import { recommendApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function CareerAnalysisModal() {
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
    queryKey: ["recommendations", profileId],
    queryFn: () => recommendApi.get(profileId!),
    enabled: isOpen && !!profileId,
  });

  if (!isMounted) return null;

  const recs = data?.recommendations?.slice(0, 3) || [];

  return (
    <AppModal
      isOpen={isOpen}
      onClose={closeModal}
      size="lg"
      title="Career Analysis"
      description="Based on your profile, here are the top roles that match your skills."
      isLoading={isLoading}
      footer={
        <div className="flex w-full justify-between items-center">
          <Button variant="ghost" onClick={closeModal}>
            Close
          </Button>
          <Button asChild>
            <Link href="/recommendations" onClick={closeModal}>
              View Full Analysis <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      }
    >
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-medium">
          Failed to load career analysis. Please try again.
        </div>
      )}

      {!isLoading && !error && recs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="h-16 w-16 rounded-3xl bg-muted/50 flex items-center justify-center mb-4">
            <Target className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-base font-bold text-foreground">No matches yet</p>
          <p className="text-sm font-medium text-muted-foreground mt-1.5 max-w-[250px]">
            We need more information in your profile to generate
            recommendations.
          </p>
        </div>
      )}

      {!isLoading && !error && recs.length > 0 && (
        <div className="space-y-4">
          {recs.map((rec, idx) => {
            const score = Math.round(rec.match_score * 100);
            // Derive a readable subtitle: prefer category, fall back to skill_match_quality label
            const subtitle =
              rec.category ??
              (rec.skill_match_quality
                ? `${rec.skill_match_quality.charAt(0).toUpperCase()}${rec.skill_match_quality.slice(1)} match`
                : null);
            return (
              <Card
                key={rec.role_id ?? idx}
                className="clay-card overflow-hidden group"
              >
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">
                        {rec.title}
                      </h4>
                      {subtitle && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                        Match Score
                      </span>
                      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${score >= 70 ? "bg-primary" : score >= 40 ? "bg-amber-500" : "bg-destructive"}`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                    <Badge
                      variant={score >= 70 ? "success" : "secondary"}
                      className="px-2 py-0.5"
                    >
                      {score}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppModal>
  );
}
