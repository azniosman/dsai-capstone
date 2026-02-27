"use client";

import { useEffect, useState } from "react";
import { Download, Route, GraduationCap, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import RoadmapTimeline from "@/components/roadmap/roadmap-timeline";
import WorkflowStepper from "@/components/ui/workflow-stepper";
import EmptyState from "@/components/ui/empty-state";
import SkeletonCard from "@/components/ui/skeleton-card";
import api from "@/lib/api-client";

interface RoadmapData {
  total_weeks: number;
  total_cost: number;
  total_after_subsidy: number;
  total_skillsfuture_applicable: number;
  narrative?: string;
  roadmap: Array<{
    week_start: number;
    week_end: number;
    course_title: string;
    provider: string;
    duration_weeks: number;
    level: string;
    skill: string;
    certification?: string;
    skillsfuture_eligible?: boolean;
    skillsfuture_credit_amount?: number;
    course_fee: number;
    nett_fee_after_subsidy: number;
    url?: string;
  }>;
}

export default function Roadmap() {
  const [data, setData] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const profileId =
    typeof window !== "undefined" ? localStorage.getItem("profileId") : null;

  useEffect(() => {
    if (!profileId) {
      setTimeout(() => setLoading(false), 0);
      return;
    }
    api
      .get(`/api/upskilling/${profileId}`)
      .then((res) => setData(res.data))
      .catch((err) =>
        setError(err.response?.data?.detail || "Failed to load roadmap"),
      )
      .finally(() => setLoading(false));
  }, [profileId]);

  const downloadPdf = () => {
    const base = api.defaults.baseURL || window.location.origin;
    window.open(`${base}/api/export/roadmap/${profileId}`, "_blank");
  };

  if (loading)
    return (
      <div>
        <WorkflowStepper />
        <SkeletonCard count={2} />
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

  if (!profileId || !data?.roadmap?.length) {
    return (
      <div>
        <WorkflowStepper />
        <EmptyState
          icon={<Route />}
          title="No roadmap available"
          description="Create a profile and get recommendations first to see your personalised upskilling roadmap."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <WorkflowStepper />

      <div className="flex items-start justify-between gap-4">
        <header>
          <p className="section-label mb-1">Upskilling Plan</p>
          <h1 className="text-2xl font-extrabold tracking-tight">Roadmap</h1>
        </header>
        <Button variant="outline" onClick={downloadPdf} className="shrink-0">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* AI Narrative */}
      {data.narrative && (
        <Card variant="highlight">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-primary mb-1">
                  Your Personalised Roadmap
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {data.narrative}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card variant="metric">
          <CardContent className="p-4 text-center">
            <div className="kpi-number-accent" style={{ fontSize: "2rem" }}>
              {data.total_weeks}
            </div>
            <p className="section-label mt-1">Weeks</p>
            <p className="text-xs text-muted-foreground data-num">
              {Math.ceil(data.total_weeks / 4)} months
            </p>
          </CardContent>
        </Card>
        <Card variant="metric">
          <CardContent className="p-4 text-center">
            <div className="kpi-number" style={{ fontSize: "2rem" }}>
              {data.roadmap.length}
            </div>
            <p className="section-label mt-1">Courses</p>
          </CardContent>
        </Card>
        <Card variant="metric">
          <CardContent className="p-4 text-center">
            <div
              className="kpi-number text-destructive"
              style={{ fontSize: "2rem" }}
            >
              ${data.total_cost.toLocaleString()}
            </div>
            <p className="section-label mt-1">Total Fees</p>
          </CardContent>
        </Card>
        <Card variant="kpi">
          <CardContent className="p-4 text-center">
            <div
              className="kpi-number-accent text-emerald-500 dark:text-emerald-400"
              style={{ fontSize: "2rem" }}
            >
              ${data.total_after_subsidy.toLocaleString()}
            </div>
            <p className="section-label mt-1">After Subsidy</p>
          </CardContent>
        </Card>
      </div>

      {/* SkillsFuture credit alert */}
      {data.total_skillsfuture_applicable > 0 && (
        <Card variant="highlight">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <GraduationCap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-primary mb-1">
                  SkillsFuture Credit: SGD{" "}
                  {data.total_skillsfuture_applicable.toLocaleString()}{" "}
                  applicable
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Use your SkillsFuture Credits to offset course fees. Most SCTP
                  courses are eligible for up to SGD 500. Visit{" "}
                  <a
                    href="https://www.myskillsfuture.gov.sg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2"
                  >
                    MySkillsFuture
                  </a>{" "}
                  to check your balance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <RoadmapTimeline items={data.roadmap} />
    </div>
  );
}
