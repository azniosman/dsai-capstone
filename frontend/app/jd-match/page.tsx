"use client";

import { useState } from "react";
import { Loader2, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { toast } from "sonner";
import GapTable from "@/components/gap-table";
import api from "@/lib/api-client";

const GAP_COLORS: Record<string, string> = {
  none: "#28c76f",
  low: "#00BFFF",
  medium: "#f9a825",
  high: "#e84848",
};

const CHART_STYLE = {
  contentStyle: { backgroundColor: "#ffffff", border: "1px solid #d9d4cc", borderRadius: "6px", fontSize: "12px", color: "#1a1a1a" },
  labelStyle: { color: "#374151" },
};

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

export default function JDMatch() {
  const [jd, setJd] = useState("");
  const [title, setTitle] = useState("");
  const [result, setResult] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMatch = async () => {
    const profileId = localStorage.getItem("profileId");
    if (!profileId) { setError("Create a profile first."); return; }
    if (!jd.trim()) { setError("Paste a job description."); return; }

    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/api/jd-match", {
        profile_id: parseInt(profileId),
        job_description: jd,
        job_title: title || null,
      });
      setResult(res.data);
      toast.success(`Analysis complete — ${Math.round(res.data.match_score * 100)}% match!`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Failed to analyze JD";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const chartData = result?.gaps.map((g) => ({
    skill: g.skill, level: g.user_level, severity: g.gap_severity,
  })) || [];

  const score = result ? Math.round(result.match_score * 100) : 0;
  const scoreColor = score >= 60 ? "text-primary" : score >= 40 ? "text-amber-500" : "text-destructive";

  return (
    <div className="space-y-5">
      <header>
        <p className="section-label mb-1">Analysis Tool</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Job Description Match</h1>
      </header>

      <Card variant="data">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-primary" />
            <p className="section-label">Paste a JD to score your profile against it</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-semibold uppercase tracking-widest" style={{ letterSpacing: "0.08em" }}>
              Job Title (optional)
            </Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="jd" className="text-xs font-semibold uppercase tracking-widest" style={{ letterSpacing: "0.08em" }}>
              Job Description
            </Label>
            <Textarea
              id="jd"
              rows={8}
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

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {result && (
        <div className="space-y-5">
          {/* Score card */}
          <Card variant="metric">
            <CardContent className="p-5">
              <p className="section-label mb-2">{result.job_title}</p>
              <div className={`kpi-number-accent ${scoreColor}`} style={{ fontSize: "3rem" }}>
                {score}<span className="text-xl font-normal text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Match Score</p>
              <div className="score-bar-track w-full">
                <div
                  className="score-bar-fill"
                  style={{ width: `${score}%`, background: score >= 60 ? "hsl(190 100% 50%)" : score >= 40 ? "hsl(38 95% 56%)" : "hsl(5 82% 56%)" }}
                />
              </div>
              <div className="mt-4 flex gap-1.5 flex-wrap items-center">
                <p className="section-label mr-1">Extracted Skills</p>
                {result.extracted_skills.map((s) => (
                  <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {chartData.length > 0 && (
            <Card variant="elevated">
              <CardContent className="p-5">
                <p className="section-label mb-4">Your Skill Levels</p>
                <div className="h-[300px]" role="img" aria-label="Bar chart showing your skill levels for this job">
                  <ResponsiveContainer>
                    <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#d9d4cc" />
                      <XAxis type="number" domain={[0, 1]} tick={{ fill: "#6b7280", fontSize: 11 }} />
                      <YAxis type="category" dataKey="skill" width={100} tick={{ fill: "#374151", fontSize: 11 }} />
                      <Tooltip
                        formatter={(v) => `${Math.round(Number(v) * 100)}%`}
                        contentStyle={CHART_STYLE.contentStyle}
                      />
                      <Bar dataKey="level" name="Your Level" radius={[0, 3, 3, 0]}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={GAP_COLORS[entry.severity]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <GapTable gaps={result.gaps} />
        </div>
      )}
    </div>
  );
}
