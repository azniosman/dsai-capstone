"use client";

import { useState, useMemo } from "react";
import { FileText, Loader2, Terminal } from "lucide-react";
import { CardContent } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl bg-editorial-black border border-muted-cyan/30 p-0 overflow-hidden shadow-[0_0_30px_rgba(37,157,244,0.15)] rounded-none gap-0">
        <DialogHeader className="p-6 border-b border-muted-cyan/20 bg-muted-cyan/5">
          <DialogTitle className="font-mono text-lg uppercase tracking-widest text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-muted-cyan" />
            Alignment Scanner
          </DialogTitle>
          <DialogDescription className="font-mono text-xs text-white/50 tracking-wider">
            Inject a JD sequence to score your profile and surface skill gaps.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-5">
            <div className="border border-muted-cyan/30 bg-muted-cyan/5 relative overflow-hidden shadow-[0_0_15px_rgba(37,157,244,0.05)]">
              <div className="absolute top-0 right-0 p-1 border-b border-l border-muted-cyan/20 bg-muted-cyan/10">
                <span className="text-[8px] font-mono text-muted-cyan uppercase tracking-widest">
                  INPUT_STREAM
                </span>
              </div>
              <CardContent className="p-6 space-y-6 pt-8">
                <div className="flex items-start gap-3 border-b border-muted-cyan/20 pb-4">
                  <FileText className="h-5 w-5 text-muted-cyan shrink-0 mt-0.5" />
                  <p className="font-mono text-[10px] text-[#18181b]/60 leading-relaxed uppercase tracking-widest">
                    &gt; Match score is computed against your saved profile
                    tensors.
                    <br />
                    &gt; Ensure dossier is up-to-date for maximum fidelity.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#18181b]/70">
                    Job Title (optional)
                  </Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Senior Data Engineer"
                    className="font-mono text-xs rounded-none border-b border-muted-cyan/50 bg-muted-cyan/5 focus-visible:border-muted-cyan focus-visible:bg-muted-cyan/10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#18181b]/70">
                    Job Description{" "}
                    <span className="text-soft-coral ml-1">*</span>
                  </Label>
                  <Textarea
                    rows={7}
                    value={jd}
                    onChange={(e) => setJd(e.target.value)}
                    placeholder="&gt; Paste unstructured JD sequence here..."
                    className="font-mono text-xs rounded-none border-b border-muted-cyan/50 bg-muted-cyan/5 focus-visible:border-muted-cyan focus-visible:bg-muted-cyan/10"
                  />
                </div>
                <Button
                  onClick={handleMatch}
                  disabled={loading}
                  className="w-full bg-soft-coral/10 border border-soft-coral text-soft-coral hover:bg-soft-coral hover:text-white rounded-none font-mono font-bold uppercase text-[10px] tracking-widest transition-all shadow-[0_0_15px_rgba(244,63,94,0.15)] mt-4"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {loading ? "PROCESSING..." : "INITIALIZE SCAN"}
                </Button>
              </CardContent>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <div className="space-y-5">
                {/* Score card */}
                <div className="border border-muted-cyan/30 bg-[#18181b] relative overflow-hidden shadow-[0_0_20px_rgba(37,157,244,0.1)]">
                  {/* HUD borders */}
                  <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-soft-coral" />
                  <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-soft-coral" />

                  <CardContent className="p-8">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-white/50 mb-4">
                      {result.job_title || "Target Node"}
                    </p>
                    <div
                      className={`font-mono font-black tracking-tighter ${scoreColor} drop-shadow-[0_0_10px_currentColor]`}
                      style={{ fontSize: "4rem", lineHeight: "1" }}
                    >
                      {score}
                      <span className="text-2xl font-normal text-white/40 ml-1">
                        %
                      </span>
                    </div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-white/60 mt-2 mb-6 border-l-2 border-current pl-2">
                      Alignment Vector
                    </p>

                    <div className="w-full h-1.5 bg-white/10 relative overflow-hidden">
                      <div
                        className="absolute top-0 left-0 bottom-0 shadow-[0_0_10px_currentColor]"
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

                    <div className="mt-8">
                      <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-white/50 mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-muted-cyan" /> Extracted
                        Node Parameters
                      </p>
                      <div className="flex gap-2 flex-wrap items-center">
                        {result.extracted_skills.map((s) => (
                          <Badge
                            key={s}
                            className="bg-muted-cyan/10 border border-muted-cyan/40 text-muted-cyan hover:bg-muted-cyan hover:text-[#09090b] rounded-none font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 transition-colors"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </div>

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
        </div>
      </DialogContent>
    </Dialog>
  );
}
