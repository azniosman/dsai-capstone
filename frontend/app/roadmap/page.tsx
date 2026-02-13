"use client";

import { useEffect, useState } from "react";
import { Download, Route, GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import RoadmapTimeline from "@/components/roadmap-timeline";
import WorkflowStepper from "@/components/workflow-stepper";
import EmptyState from "@/components/empty-state";
import SkeletonCard from "@/components/skeleton-card";
import api from "@/lib/api-client";

interface RoadmapData {
  total_weeks: number;
  total_cost: number;
  total_after_subsidy: number;
  total_skillsfuture_applicable: number;
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

  const profileId = typeof window !== "undefined" ? localStorage.getItem("profileId") : null;

  useEffect(() => {
    if (!profileId) { setLoading(false); return; }
    api
      .get(`/api/upskilling/${profileId}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Failed to load roadmap"))
      .finally(() => setLoading(false));
  }, [profileId]);

  const downloadPdf = () => {
    const base = api.defaults.baseURL || window.location.origin;
    window.open(`${base}/api/export/roadmap/${profileId}`, "_blank");
  };

  if (loading) return <div><WorkflowStepper /><SkeletonCard count={2} /></div>;
  if (error) return <div><WorkflowStepper /><Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert></div>;

  if (!profileId || !data?.roadmap?.length) {
    return (
      <div>
        <WorkflowStepper />
        <EmptyState
          icon={<Route />}
          title="No roadmap available"
          description="Create a profile and get recommendations first to see your personalized upskilling roadmap."
        />
      </div>
    );
  }

  return (
    <div>
      <WorkflowStepper />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Upskilling Roadmap</h1>
        <Button variant="outline" onClick={downloadPdf}>
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 text-center">
          <CardContent className="p-0">
            <p className="text-3xl font-bold text-primary">{data.total_weeks}</p>
            <p className="text-sm text-muted-foreground">Weeks ({Math.ceil(data.total_weeks / 4)} months)</p>
          </CardContent>
        </Card>
        <Card className="p-4 text-center">
          <CardContent className="p-0">
            <p className="text-3xl font-bold">{data.roadmap.length}</p>
            <p className="text-sm text-muted-foreground">Courses</p>
          </CardContent>
        </Card>
        <Card className="p-4 text-center">
          <CardContent className="p-0">
            <p className="text-3xl font-bold text-red-500">SGD {data.total_cost.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Course Fees</p>
          </CardContent>
        </Card>
        <Card className="p-4 text-center">
          <CardContent className="p-0">
            <p className="text-3xl font-bold text-green-600">SGD {data.total_after_subsidy.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">After Subsidy</p>
          </CardContent>
        </Card>
      </div>

      {data.total_skillsfuture_applicable > 0 && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <GraduationCap className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <p className="font-semibold text-green-800">
              SkillsFuture Credit Applicable: SGD {data.total_skillsfuture_applicable.toLocaleString()}
            </p>
            <p className="text-sm text-green-700">
              You can use your SkillsFuture Credits to offset course fees. Most SCTP courses are eligible
              for up to SGD 500 in SkillsFuture Credits. Visit{" "}
              <a href="https://www.myskillsfuture.gov.sg" target="_blank" rel="noopener noreferrer" className="underline">
                MySkillsFuture
              </a>{" "}
              to check your balance.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <RoadmapTimeline items={data.roadmap} />
    </div>
  );
}
