"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
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

const GAP_COLORS: Record<string, string> = { none: "#4caf50", low: "#2196f3", medium: "#ff9800", high: "#f44336" };

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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Job Description Match</h1>

      <Card className="p-6 mb-6">
        <CardContent className="p-0 space-y-4">
          <div>
            <Label htmlFor="title">Job Title (optional)</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="jd">Paste Job Description</Label>
            <Textarea
              id="jd"
              rows={8}
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the full job description here..."
            />
          </div>
          <Button onClick={handleMatch} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Analyze Match
          </Button>
        </CardContent>
      </Card>

      {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}

      {result && (
        <>
          <Card className="p-6 mb-6">
            <CardContent className="p-0">
              <h2 className="text-lg font-bold">{result.job_title}</h2>
              <p className={`text-3xl font-bold ${result.match_score >= 0.6 ? "text-green-600" : "text-orange-500"}`}>
                {Math.round(result.match_score * 100)}% Match
              </p>
              <div className="mt-4 flex gap-1.5 flex-wrap items-center">
                <span className="text-sm font-semibold">Extracted Skills:</span>
                {result.extracted_skills.map((s) => (
                  <Badge key={s} variant="outline">{s}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {chartData.length > 0 && (
            <div className="h-[300px] mb-6" role="img" aria-label="Bar chart showing your skill levels for this job">
              <ResponsiveContainer>
                <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 1]} />
                  <YAxis type="category" dataKey="skill" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => `${Math.round(Number(v) * 100)}%`} />
                  <Bar dataKey="level" name="Your Level">
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={GAP_COLORS[entry.severity]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <GapTable gaps={result.gaps} />
        </>
      )}
    </div>
  );
}
