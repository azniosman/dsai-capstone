import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  Tooltip,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Radar as RadarIcon,
  Sparkles,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { ChartCard } from "./chart-card";

interface SkillData {
  skill: string;
  userLevel: number;
  requiredLevel: number;
}

export interface SkillRadarMetrics {
  match_score: number; // 0–1 overall
  content_score: number; // 0–1 skill similarity (weight 0.55)
  rule_score: number; // 0–1 profile fit      (weight 0.25)
  career_switcher_bonus: number; // 0–1 career bonus     (weight 0.20)
  skill_match_quality: string; // "strong" | "moderate" | "developing"
  matched_count: number;
  missing_count: number;
  rationale: string;
  salary_range?: string;
}

interface SkillRadarProps {
  data: SkillData[];
  roleName: string;
  metrics?: SkillRadarMetrics;
}

// Scoring weights — must match backend hybrid scoring formula
const SCORE_WEIGHTS = [
  {
    key: "content_score",
    label: "Skill Similarity",
    weight: 0.55,
    color: "hsl(var(--primary))",
  },
  {
    key: "rule_score",
    label: "Profile Fit",
    weight: 0.25,
    color: "hsl(40 90% 45%)",
  },
  {
    key: "career_switcher_bonus",
    label: "Career Bonus",
    weight: 0.2,
    color: "hsl(145 60% 36%)",
  },
] as const;

function qualityVariant(q: string): "success" | "warning" | "muted" {
  if (q === "strong") return "success";
  if (q === "moderate") return "warning";
  return "muted";
}
function qualityLabel(q: string) {
  if (q === "strong") return "Strong Match";
  if (q === "moderate") return "Moderate Match";
  return "Developing";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/90 backdrop-blur-xl border border-border/50 shadow-2xl rounded-2xl p-4 text-sm min-w-[180px]">
        <p className="font-bold text-foreground mb-3 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          {label}
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4 bg-primary/10 px-2 py-1.5 rounded-md">
            <span className="text-primary font-medium text-xs">Your Level</span>
            <span className="font-bold text-primary">{payload[0].value}/5</span>
          </div>
          <div className="flex items-center justify-between gap-4 bg-muted/50 px-2 py-1.5 rounded-md">
            <span className="text-muted-foreground font-medium text-xs">
              Required
            </span>
            <span className="font-bold text-foreground">
              {payload[1].value}/5
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

/** Animated weighted score bar */
function ScoreWeightBar({
  label,
  weight,
  rawScore,
  color,
  delay,
}: {
  label: string;
  weight: number;
  rawScore: number;
  color: string;
  delay: number;
}) {
  const rawPct = Math.round(rawScore * 100);
  const contribPct = Math.round(rawScore * weight * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: color }}
          />
          <span className="font-semibold text-foreground">{label}</span>
          <span className="text-muted-foreground/50">×{weight.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1 font-mono">
          <span className="text-muted-foreground">{rawPct}%</span>
          <span className="text-muted-foreground/40">→</span>
          <span className="font-bold tabular-nums" style={{ color }}>
            +{contribPct}%
          </span>
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden bg-muted/40 relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${rawPct}%` }}
          transition={{ duration: 0.7, ease: "easeOut", delay }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

export function SkillRadar({ data, roleName, metrics }: SkillRadarProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="h-full w-full flex items-center justify-center min-h-[350px] bg-card/40 border-border/40 backdrop-blur-md rounded-[2rem]">
        <div className="text-center">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
            <RadarIcon className="w-6 h-6 text-muted-foreground opacity-50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Analyzing skill matches...
          </p>
        </div>
      </Card>
    );
  }

  const overallPct = metrics ? Math.round(metrics.match_score * 100) : null;
  const overallColor =
    overallPct === null
      ? undefined
      : overallPct >= 70
        ? "hsl(145 60% 36%)"
        : overallPct >= 40
          ? "hsl(40 90% 45%)"
          : "hsl(5 78% 50%)";

  const totalSkills = metrics
    ? metrics.matched_count + metrics.missing_count
    : 0;

  return (
    <Card className="h-full w-full bg-card/40 backdrop-blur-2xl border-border/40 shadow-2xl rounded-[2rem] overflow-hidden relative group transition-all duration-500 hover:border-primary/20 hover:shadow-primary/5">
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-primary/5 opacity-50 pointer-events-none -z-10 transition-opacity duration-700 group-hover:opacity-100" />

      {/* ─── Header ─── */}
      <CardHeader className="pb-3 border-b border-border/30 bg-background/30 relative z-10 backdrop-blur-md">
        <CardTitle className="text-lg flex items-center gap-2 tracking-tight">
          <div className="p-2 bg-primary/10 rounded-xl text-primary ring-1 ring-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.1)]">
            <RadarIcon className="w-4 h-4" />
          </div>
          Skill Match Analysis
        </CardTitle>
        <CardDescription className="text-xs font-medium mt-1.5 flex items-center gap-1">
          Your profile vs{" "}
          <AnimatePresence mode="wait">
            <motion.span
              key={roleName}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="text-foreground font-bold ml-0.5"
            >
              {roleName}
            </motion.span>
          </AnimatePresence>
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0 relative z-10">
        {/* ─── KPI Summary Row ─── */}
        {metrics && (
          <AnimatePresence mode="wait">
            <motion.div
              key={`kpi-${roleName}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-3 divide-x divide-border/20 border-b border-border/20"
            >
              {/* Overall score */}
              <div className="px-4 py-3 text-center">
                <div
                  className="text-2xl font-black tracking-tighter tabular-nums"
                  style={{ color: overallColor }}
                >
                  {overallPct}%
                </div>
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">
                  Overall Match
                </div>
              </div>
              {/* Skill coverage */}
              <div className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-1 text-sm font-black">
                  <span style={{ color: "hsl(145 60% 36%)" }}>
                    {metrics.matched_count}
                  </span>
                  <span className="text-muted-foreground/30 font-light">/</span>
                  <span className="text-muted-foreground">{totalSkills}</span>
                </div>
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">
                  Skills Matched
                </div>
              </div>
              {/* Match quality */}
              <div className="px-4 py-3 text-center flex flex-col items-center justify-center gap-1">
                <Badge
                  variant={qualityVariant(metrics.skill_match_quality)}
                  className="text-[9px] px-1.5 py-0 h-4"
                >
                  {qualityLabel(metrics.skill_match_quality)}
                </Badge>
                {metrics.salary_range && (
                  <span className="text-[9px] text-muted-foreground font-mono data-num">
                    {metrics.salary_range}
                  </span>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* ─── Radar Chart ─── */}
        <div
          className="h-[250px] min-h-[250px] w-full flex items-center justify-center overflow-hidden"
          role="img"
          aria-label={`Skill radar chart comparing your profile against ${roleName}`}
        >
          <ChartCard
            title=""
            height={250}
            ariaLabel={`Radar chart for ${roleName}`}
            className="border-0 shadow-none bg-transparent w-full"
          >
            <RadarChart
              cx="50%"
              cy="50%"
              outerRadius="65%"
              data={data}
              className="mt-2 filter drop-shadow-md"
            >
              <defs>
                <linearGradient
                  id="userLevelGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.6}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient
                  id="requiredLevelGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--muted-foreground))"
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--muted-foreground))"
                    stopOpacity={0.0}
                  />
                </linearGradient>
              </defs>
              <PolarGrid
                stroke="hsl(var(--border))"
                strokeDasharray="4 4"
                opacity={0.5}
              />
              <PolarAngleAxis
                dataKey="skill"
                tick={{
                  fill: "hsl(var(--foreground))",
                  fontSize: 10,
                  fontWeight: 600,
                  opacity: 0.8,
                }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 5]}
                tick={{
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 9,
                  fontWeight: 500,
                }}
                tickCount={6}
                axisLine={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "transparent" }}
              />
              <Radar
                name="Required"
                dataKey="requiredLevel"
                stroke="hsl(var(--muted-foreground))"
                strokeOpacity={0.4}
                fill="url(#requiredLevelGradient)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
              <Radar
                name="You"
                dataKey="userLevel"
                stroke="hsl(var(--primary))"
                fill="url(#userLevelGradient)"
                strokeWidth={3}
                className="drop-shadow-[0_0_8px_rgba(var(--primary),0.5)] transition-all duration-500"
                dot={false}
              />
            </RadarChart>
          </ChartCard>
        </div>

        {/* ─── Score Breakdown ─── */}
        {metrics && (
          <AnimatePresence mode="wait">
            <motion.div
              key={`breakdown-${roleName}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="px-5 pt-3 pb-5 border-t border-border/20 space-y-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
                  Score Breakdown
                </p>
                <p className="text-[9px] text-muted-foreground font-mono opacity-60 tracking-tight">
                  0.55×skill + 0.25×fit + 0.20×bonus
                </p>
              </div>

              <div className="space-y-2.5">
                {SCORE_WEIGHTS.map((w, i) => {
                  const raw =
                    w.key === "content_score"
                      ? metrics.content_score
                      : w.key === "rule_score"
                        ? metrics.rule_score
                        : metrics.career_switcher_bonus;
                  return (
                    <ScoreWeightBar
                      key={w.key}
                      label={w.label}
                      weight={w.weight}
                      rawScore={raw}
                      color={w.color}
                      delay={0.1 + i * 0.12}
                    />
                  );
                })}
              </div>

              <div className="flex items-center gap-4 pt-0.5">
                <div className="flex items-center gap-1.5 text-xs">
                  <CheckCircle2
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: "hsl(145 60% 36%)" }}
                  />
                  <span
                    className="font-semibold"
                    style={{ color: "hsl(145 60% 36%)" }}
                  >
                    {metrics.matched_count} matched
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <XCircle
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: "hsl(5 78% 50%)" }}
                  />
                  <span
                    className="font-semibold"
                    style={{ color: "hsl(5 78% 50%)" }}
                  >
                    {metrics.missing_count} to learn
                  </span>
                </div>
                {metrics.career_switcher_bonus > 0 && (
                  <div className="flex items-center gap-1 text-[10px] ml-auto text-primary font-semibold">
                    <TrendingUp className="h-3 w-3" />
                    Career Switcher Bonus
                  </div>
                )}
              </div>

              {metrics.rationale && (
                <div className="bg-muted/30 rounded-xl p-3 border border-border/30">
                  <p className="text-[9px] uppercase tracking-widest text-primary font-bold mb-1.5">
                    AI Rationale
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                    {metrics.rationale}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
}
