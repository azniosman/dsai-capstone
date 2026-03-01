"use client";

import { useModalStore } from "@/store/modalStore";
import { AppModal } from "@/components/ui/AppModal";
import {
  Brain,
  TrendingUp,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Zap,
  BarChart3,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Recommendation } from "@/lib/api";

/* ─── Skill overlap bar ─── */
function OverlapBar({
  category,
  matched,
  total,
  delay,
}: {
  category: string;
  matched: number;
  total: number;
  delay: number;
}) {
  const pct = total > 0 ? Math.round((matched / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium truncate max-w-[140px]">{category}</span>
        <span className="tabular-nums text-primary font-bold">{pct}%</span>
      </div>
      <div className="score-bar-track">
        <motion.div
          className="score-bar-fill bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, delay, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-between">
        <span className="micro-type text-[8px] opacity-40">
          {matched}/{total} skills
        </span>
      </div>
    </div>
  );
}

/* ─── Career trajectory SVG ─── */
function CareerTrajectory({ score }: { score: number }) {
  // 3-point curve: current → 1yr → 3yr
  const base = score;
  const y1 = Math.min(base + 15, 95);
  const y3 = Math.min(base + 30, 98);

  // SVG coords (0,0 = top-left, y increases downward)
  const toSvgY = (v: number) => 100 - v; // flip: higher = higher on screen

  const x0 = 20, y0 = toSvgY(base);
  const x1 = 100, y1s = toSvgY(y1);
  const x2 = 180, y2 = toSvgY(y3);

  const pathD = `M ${x0} ${y0} C ${x0 + 40} ${y0}, ${x1 - 30} ${y1s}, ${x1} ${y1s} C ${x1 + 30} ${y1s}, ${x2 - 40} ${y2}, ${x2} ${y2}`;

  return (
    <div className="space-y-2">
      <p className="micro-type mb-2 opacity-60">3-Year Trajectory</p>
      <svg viewBox="0 0 200 110" className="w-full h-24">
        {/* Grid */}
        {[25, 50, 75].map((v) => (
          <line
            key={v}
            x1="15"
            y1={toSvgY(v)}
            x2="185"
            y2={toSvgY(v)}
            stroke="#e2e8f0"
            strokeWidth="0.5"
          />
        ))}

        {/* Curve fill */}
        <path
          d={`${pathD} L ${x2} 100 L ${x0} 100 Z`}
          fill="rgba(99,102,241,0.08)"
        />

        {/* Curve line */}
        <motion.path
          d={pathD}
          fill="none"
          stroke="#6366f1"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />

        {/* Points */}
        {[
          { x: x0, y: y0, label: "Now", val: base },
          { x: x1, y: y1s, label: "Y1", val: y1 },
          { x: x2, y: y2, label: "Y3", val: y3 },
        ].map(({ x, y, label, val }, i) => (
          <g key={i}>
            <motion.circle
              cx={x}
              cy={y}
              r={4}
              fill="#6366f1"
              stroke="white"
              strokeWidth="2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 + i * 0.2 }}
            />
            <text
              x={x}
              y={y - 8}
              textAnchor="middle"
              fontSize="7"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="600"
              fill="#6366f1"
            >
              {val}%
            </text>
            <text
              x={x}
              y={105}
              textAnchor="middle"
              fontSize="7"
              fontFamily="JetBrains Mono, monospace"
              fill="#94a3b8"
            >
              {label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function MatchIntelligenceModal() {
  const { isOpen, closeModal, data } = useModalStore();
  const rec = data as Recommendation | null;

  if (!rec) return null;

  const score = Math.round(rec.match_score * 100);
  const matchedCount = rec.matched_skills?.length || 0;
  const missingCount = rec.missing_skills?.length || 0;
  const totalSkills = matchedCount + missingCount;

  // Group skills into rough categories for overlap bars
  const overlapBars = [
    {
      category: "Core Technical",
      matched: Math.round(matchedCount * 0.5),
      total: Math.round(totalSkills * 0.5),
    },
    {
      category: "Domain Knowledge",
      matched: Math.round(matchedCount * 0.3),
      total: Math.round(totalSkills * 0.3),
    },
    {
      category: "Tools & Platforms",
      matched: Math.round(matchedCount * 0.2),
      total: Math.round(totalSkills * 0.2),
    },
  ].filter((b) => b.total > 0);

  // Reasoning paths derived from rec data
  const reasoningPaths = [
    {
      icon: BarChart3,
      title: "Skills Alignment",
      body: `${matchedCount} of ${totalSkills} required skills matched. Content similarity score: ${Math.round((rec.content_score ?? 0) * 100)}%.`,
      positive: matchedCount >= totalSkills * 0.6,
    },
    {
      icon: Target,
      title: "Profile Fit",
      body: `Profile fit score: ${Math.round((rec.rule_score ?? 0) * 100)}%. ${(rec.career_switcher_bonus ?? 0) > 0 ? "Career switcher bonus applied." : "Standard profile match."}`,
      positive: (rec.rule_score ?? 0) >= 0.5,
    },
    {
      icon: TrendingUp,
      title: "Market Relevance",
      body: `Overall match quality: ${rec.skill_match_quality}. ${rec.salary_range ? `Salary band: ${rec.salary_range}.` : ""}`,
      positive: rec.skill_match_quality === "strong" || rec.skill_match_quality === "moderate",
    },
  ];

  return (
    <AppModal
      isOpen={isOpen}
      onClose={closeModal}
      title="Match Intelligence Brief"
      description={rec.title}
      size="xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
        {/* Col 1: Skill Overlap */}
        <div className="space-y-4">
          <div>
            <p className="micro-type mb-3">Skill Overlap Analysis</p>
            <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-primary/5 border border-primary/15">
              <div>
                <div className="text-3xl font-black tabular-nums text-primary">
                  {score}%
                </div>
                <p className="micro-type text-[9px] opacity-60">Overall Match</p>
              </div>
              <div className="text-right space-y-1">
                <div className="flex items-center gap-1 justify-end text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  <span className="text-xs font-bold">{matchedCount}</span>
                </div>
                <div className="flex items-center gap-1 justify-end text-red-500">
                  <XCircle className="h-3 w-3" />
                  <span className="text-xs font-bold">{missingCount}</span>
                </div>
              </div>
            </div>

            {overlapBars.length > 0 && (
              <div className="space-y-3">
                {overlapBars.map((bar, i) => (
                  <OverlapBar key={bar.category} {...bar} delay={i * 0.15} />
                ))}
              </div>
            )}
          </div>

          {/* Cultural alignment */}
          <div>
            <p className="micro-type mb-2 opacity-60">Cultural Alignment</p>
            <div className="space-y-1.5">
              {[
                { label: "Remote-Ready", val: 82 },
                { label: "Agile Fit", val: 75 },
                { label: "SG Market", val: 91 },
              ].map(({ label, val }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-xs font-bold text-primary tabular-nums">
                    {val}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Col 2: AI Reasoning */}
        <div className="space-y-4">
          <p className="micro-type">AI Reasoning Paths</p>

          <div className="space-y-3">
            {reasoningPaths.map((path, i) => (
              <motion.div
                key={path.title}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-3 rounded-lg border border-border/50 bg-background/60 space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-6 w-6 rounded-md flex items-center justify-center shrink-0",
                      path.positive
                        ? "bg-green-50 text-green-600"
                        : "bg-amber-50 text-amber-600",
                    )}
                  >
                    <path.icon className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-xs font-bold">{path.title}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {path.body}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Recommendation box */}
          {rec.rationale && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-1.5 mb-2">
                <Brain className="h-3.5 w-3.5 text-primary" />
                <p className="micro-type text-primary text-[9px]">
                  AI Recommendation
                </p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {rec.rationale}
              </p>
            </div>
          )}
        </div>

        {/* Col 3: Career Trajectory + Actions */}
        <div className="space-y-4">
          <div className="glass-card p-4">
            <CareerTrajectory score={score} />
          </div>

          {/* Top missing skills */}
          {(rec.missing_skills?.length || 0) > 0 && (
            <div>
              <p className="micro-type mb-2 opacity-60">Priority Gaps</p>
              <div className="flex flex-wrap gap-1.5">
                {(rec.missing_skills || []).slice(0, 5).map((s) => (
                  <span
                    key={s}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200 font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            <Button className="clay-btn w-full gap-2">
              <Zap className="h-4 w-4" /> Execute Application Sequence
            </Button>
            <Button variant="outline" className="w-full gap-2 text-sm" asChild>
              <a href="/courses">
                <ArrowRight className="h-4 w-4" /> Bridge Skill Gaps
              </a>
            </Button>
            <Button
              variant="ghost"
              className="w-full text-xs text-muted-foreground"
              onClick={closeModal}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </AppModal>
  );
}
