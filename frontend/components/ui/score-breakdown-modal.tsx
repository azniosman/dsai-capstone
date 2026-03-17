"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, XCircle, TrendingUp, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ScoreBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendation: {
    title: string;
    match_score: number;
    content_score: number;
    rule_score: number;
    career_switcher_bonus: number;
    skill_match_quality: string;
    matched_skills: string[];
    missing_skills: string[];
  };
}

interface ScoreBarProps {
  label: string;
  value: number;
  weight: number;
  color: string;
  delay: number;
}

function ScoreBar({ label, value, weight, color, delay }: ScoreBarProps) {
  const rawPct = Math.round(value * 100);
  const contribPct = Math.round(value * weight * 100);

  return (
    <motion.div
      className="space-y-2"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5 }}
    >
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: color }}
          />
          <span className="font-semibold text-foreground">{label}</span>
          <span className="text-muted-foreground text-[10px]">×{weight.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-muted-foreground">{rawPct}%</span>
          <span className="text-muted-foreground/40">→</span>
          <span className="font-bold" style={{ color }}>
            +{contribPct}%
          </span>
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-muted/40 relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${rawPct}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </motion.div>
  );
}

export function ScoreBreakdownModal({
  isOpen,
  onClose,
  recommendation,
}: ScoreBreakdownModalProps) {
  const {
    title,
    match_score,
    content_score,
    rule_score,
    career_switcher_bonus,
    skill_match_quality,
    matched_skills,
    missing_skills,
  } = recommendation;

  const overallPct = Math.round(match_score * 100);
  const overallColor =
    overallPct >= 70
      ? "hsl(145 60% 36%)"
      : overallPct >= 40
      ? "hsl(40 90% 45%)"
      : "hsl(5 78% 50%)";

  const SCORE_WEIGHTS = [
    {
      key: "content_score",
      label: "Skill Similarity",
      weight: 0.55,
      color: "hsl(217 91% 60%)",
      value: content_score,
    },
    {
      key: "rule_score",
      label: "Profile Fit",
      weight: 0.25,
      color: "hsl(40 90% 45%)",
      value: rule_score,
    },
    {
      key: "career_switcher_bonus",
      label: "Career Switcher Bonus",
      weight: 0.2,
      color: "hsl(145 60% 36%)",
      value: career_switcher_bonus,
    },
  ];

  const qualityVariant = (q: string) => {
    if (q === "strong") return "success";
    if (q === "moderate") return "warning";
    return "muted";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-primary/20 rounded-2xl shadow-2xl">
              {/* Header */}
              <div className="sticky top-0 bg-card/95 backdrop-blur-md border-b border-primary/20 p-6 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground mb-1">
                    Match Score Breakdown
                  </h2>
                  <p className="text-sm text-muted-foreground">{title}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 hover:bg-primary/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Overall Score Display */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-center py-6"
                >
                  <div className="relative">
                    <motion.div
                      className="text-6xl font-black tabular-nums"
                      style={{ color: overallColor }}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                    >
                      {overallPct}%
                    </motion.div>
                    <div className="text-center text-xs text-muted-foreground mt-2 uppercase tracking-wider">
                      Overall Match
                    </div>
                  </div>
                </motion.div>

                {/* Formula Visual */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-muted/30 rounded-xl p-4 border border-border/50"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Calculator className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Hybrid Scoring Formula
                    </span>
                  </div>
                  <code className="block text-sm font-mono text-foreground bg-background/50 rounded-lg p-3 overflow-x-auto">
                    <span style={{ color: SCORE_WEIGHTS[0].color }}>
                      0.55 × {Math.round(content_score * 100)}%
                    </span>{" "}
                    +{" "}
                    <span style={{ color: SCORE_WEIGHTS[1].color }}>
                      0.25 × {Math.round(rule_score * 100)}%
                    </span>{" "}
                    +{" "}
                    <span style={{ color: SCORE_WEIGHTS[2].color }}>
                      0.20 × {Math.round(career_switcher_bonus * 100)}%
                    </span>{" "}
                    ={" "}
                    <span style={{ color: overallColor }} className="font-bold">
                      {overallPct}%
                    </span>
                  </code>
                </motion.div>

                {/* Score Breakdown Bars */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Score Components
                    </span>
                  </div>
                  {SCORE_WEIGHTS.map((weight, i) => (
                    <ScoreBar
                      key={weight.key}
                      label={weight.label}
                      value={weight.value}
                      weight={weight.weight}
                      color={weight.color}
                      delay={0.4 + i * 0.15}
                    />
                  ))}
                </div>

                {/* Skills Breakdown */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/30">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2
                        className="w-4 h-4"
                        style={{ color: "hsl(145 60% 36%)" }}
                      />
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Matched ({matched_skills.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {matched_skills.slice(0, 6).map((skill) => (
                        <Badge
                          key={skill}
                          variant="success"
                          className="text-[9px] px-1.5 py-0 h-5"
                        >
                          {skill}
                        </Badge>
                      ))}
                      {matched_skills.length > 6 && (
                        <Badge variant="muted" className="text-[9px] px-1.5 py-0 h-5">
                          +{matched_skills.length - 6}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <XCircle
                        className="w-4 h-4"
                        style={{ color: "hsl(5 78% 50%)" }}
                      />
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        To Learn ({missing_skills.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {missing_skills.slice(0, 6).map((skill) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 h-5 border-destructive/50 text-destructive"
                        >
                          {skill}
                        </Badge>
                      ))}
                      {missing_skills.length > 6 && (
                        <Badge variant="muted" className="text-[9px] px-1.5 py-0 h-5">
                          +{missing_skills.length - 6}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Match Quality Badge */}
                <div className="flex items-center justify-center pt-2">
                  <Badge
                    variant={qualityVariant(skill_match_quality)}
                    className="text-xs px-3 py-1 h-6"
                  >
                    {skill_match_quality === "strong"
                      ? "Strong Match"
                      : skill_match_quality === "moderate"
                      ? "Moderate Match"
                      : "Developing"}
                  </Badge>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
