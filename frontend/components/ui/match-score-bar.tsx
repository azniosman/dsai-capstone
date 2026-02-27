"use client";

import { CHART_STATUS } from "@/lib/chart-colors";

interface MatchScoreBarProps {
  score: number;
  label?: string;
}

export default function MatchScoreBar({ score, label }: MatchScoreBarProps) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 70
      ? CHART_STATUS.success
      : pct >= 40
        ? CHART_STATUS.warning
        : CHART_STATUS.error;

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm min-w-[80px]">{label}</span>}
      <div
        className="score-bar-track flex-1"
        role="progressbar"
        aria-label={`${label || "Score"}: ${pct}%`}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="score-bar-fill"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-bold min-w-[40px] text-right">{pct}%</span>
    </div>
  );
}
