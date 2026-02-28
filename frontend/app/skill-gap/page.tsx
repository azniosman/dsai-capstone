"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import GapTable from "@/components/skill-gap/gap-table";
import WorkflowStepper from "@/components/ui/workflow-stepper";
import EmptyState from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api-client";
import { extractApiError } from "@/lib/utils";

const SkillGapChart = dynamic(
  () =>
    import("@/components/dashboard/charts/SkillGapChart").then(
      (mod) => mod.SkillGapChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[350px] w-full bg-card/40 animate-pulse rounded-xl" />
    ),
  },
);

import type { RoleGap } from "@/types/api";

function SkillGapView({ gap }: { gap: RoleGap }) {
  const score = Math.round(gap.match_score * 100);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Score header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">{gap.role_title}</span>
        <Badge
          variant={
            score >= 70 ? "success" : score >= 40 ? "warning" : "destructive"
          }
          className="data-num"
        >
          {score}% Match
        </Badge>
      </div>

      {/* Chart — Radar/Bar toggle handled inside SkillGapChart */}
      <SkillGapChart gaps={gap.gaps} />

      <GapTable gaps={gap.gaps} hoveredSkill={null} onHoverSkill={() => {}} />
    </div>
  );
}

export default function SkillGap() {
  const [tab, setTab] = useState("0");

  const profileId =
    typeof window !== "undefined" ? localStorage.getItem("profileId") : null;

  const {
    data: gaps = [],
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ["skill-gap", profileId],
    queryFn: async () => {
      const res = await api.get(`/api/skill-gap/${profileId}`);
      return res.data.gaps as RoleGap[];
    },
    enabled: !!profileId,
  });

  const error = queryError
    ? extractApiError(queryError, "Failed to load skill gaps")
    : null;
  const hasProfile = !!profileId;

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  if (error)
    return (
      <div>
        <WorkflowStepper />
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );

  if (!hasProfile || gaps.length === 0) {
    return (
      <div>
        <WorkflowStepper />
        <EmptyState
          icon={<BarChart3 />}
          title="No skill gaps to show"
          description="Create a profile first to see how your skills compare to target roles."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <WorkflowStepper />

      <header>
        <p className="section-label mb-1">Analysis</p>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Skill Gap Analysis
        </h1>
      </header>

      {/* Role selector (Custom Tabs implementation) */}
      <div className="flex flex-col space-y-6">
        <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-fit">
          {gaps.map((g, i) => (
            <button
              key={g.role_title}
              onClick={() => setTab(String(i))}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                tab === String(i)
                  ? "bg-background text-foreground shadow-sm"
                  : "hover:bg-background/50 hover:text-foreground"
              }`}
            >
              {g.role_title}
            </button>
          ))}
        </div>

        {/* Content Area — AnimatePresence re-mounts active tab so charts re-animate */}
        <AnimatePresence mode="wait">
          {gaps.map((gap, i) =>
            tab === String(i) ? (
              <motion.div
                key={gap.role_title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{
                  duration: 0.22,
                  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
                }}
              >
                <SkillGapView gap={gap} />
              </motion.div>
            ) : null,
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
