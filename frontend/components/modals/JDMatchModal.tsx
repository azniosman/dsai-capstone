"use client";

import { useState, useMemo } from "react";
import { Loader2, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { toast } from "sonner";
import { ChartCard } from "@/components/ui/chart-card";
import GapTable from "@/components/skill-gap/gap-table";
import { AppModal } from "@/components/ui/AppModal";
import { useModalStore } from "@/store/modalStore";
import api from "@/lib/api-client";
import { GAP_COLOR, CHART_AXIS, TOOLTIP_STYLE } from "@/lib/chart-colors";

interface Gap {
  skill: string;
  user_level: number;
  gap_severity: string;
  required_level: string;
  user_level_label: string;
  priority: string;
}

interface MatchResult {
  job_title: string;
  match_score: number;
  extracted_skills: string[];
  gaps: Gap[];
}

export default function JDMatchModal() {
  const { isOpen, closeModal } = useModalStore();
  const [jd, setJd] = useState("");
  const [title, setTitle] = useState("");
  const [result, setResult] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMatch = async () => {
    const profileId = localStorage.getItem("profileId");
    if (!profileId) {
      setError("Create a profile first.");
      return;
    }
    if (!jd.trim()) {
      setError("Paste a job description.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/api/jd-match", {
        profile_id: parseInt(profileId),
        job_description: jd,
        job_title: title || null,
      });
      setResult(res.data);
      toast.success(
        `Analysis complete — ${Math.round(res.data.match_score * 100)}% match!`,
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } }).response?.data
          ?.detail || "Failed to analyze JD";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    closeModal();
    setResult(null);
    setJd("");
    setTitle("");
    setError(null);
  };

  const chartData = useMemo(
    () =>
      result?.gaps.map((g) => ({
        skill: g.skill,
        level: g.user_level,
        severity: g.gap_severity,
      })) ?? [],
    [result],
  );

  const score = result ? Math.round(result.match_score * 100) : 0;
  const scoreColor =
    score >= 60
      ? "text-primary"
      : score >= 40
        ? "text-amber-500"
        : "text-destructive";

  return (
    <AppModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Job Description Match"
      description="Paste a JD to score your profile and surface skill gaps."
      size="xl"
    >
      <div className="space-y-5">
        <Card variant="data">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground">
                The match score is computed against your saved profile skills.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-widest">
                Job Title (optional)
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Data Engineer"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-widest">
                Job Description
              </Label>
              <Textarea
                rows={7}
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the full job description here..."
              />
            </div>
            <Button onClick={handleMatch} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Analyze Match
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-5">
            {/* Score card */}
            <Card variant="metric">
              <CardContent className="p-5">
                <p className="section-label mb-2">{result.job_title}</p>
                <div
                  className={`kpi-number-accent ${scoreColor}`}
                  style={{ fontSize: "3rem" }}
                >
                  {score}
                  <span className="text-xl font-normal text-muted-foreground">
                    %
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Match Score
                </p>
                <div className="score-bar-track w-full">
                  <div
                    className="score-bar-fill"
                    style={{
                      width: `${score}%`,
                      background:
                        score >= 60
                          ? "hsl(190 100% 50%)"
                          : score >= 40
                            ? "hsl(38 95% 56%)"
                            : "hsl(5 82% 56%)",
                    }}
                  />
                </div>
                <div className="mt-4 flex gap-1.5 flex-wrap items-center">
                  <p className="section-label mr-1">Extracted Skills</p>
                  {result.extracted_skills.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {chartData.length > 0 && (
              <ChartCard
                title="Your Skill Levels"
                height={300}
                ariaLabel="Bar chart showing your skill levels for this job"
              >
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ left: 100 }}
                >
                  <CartesianGrid {...CHART_AXIS.grid} />
                  <XAxis
                    type="number"
                    domain={[0, 1]}
                    tick={CHART_AXIS.tick}
                  />
                  <YAxis
                    type="category"
                    dataKey="skill"
                    width={100}
                    tick={CHART_AXIS.tickBold}
                  />
                  <Tooltip
                    formatter={(v) => `${Math.round(Number(v) * 100)}%`}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Bar
                    dataKey="level"
                    name="Your Level"
                    radius={[0, 3, 3, 0]}
                    animationDuration={600}
                    animationEasing="ease-out"
                  >
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={GAP_COLOR[entry.severity]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartCard>
            )}

            <GapTable gaps={result.gaps} />
          </div>
        )}
      </div>
    </AppModal>
  );
}
