"use client";

import { Progress } from "@/components/ui/progress";

interface MatchScoreBarProps {
  score: number;
  label?: string;
}

export default function MatchScoreBar({ score, label }: MatchScoreBarProps) {
  const pct = Math.round(score * 100);
  const colorClass = pct >= 70 ? "[&>div]:bg-green-500" : pct >= 40 ? "[&>div]:bg-orange-500" : "[&>div]:bg-red-500";

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm min-w-[80px]">{label}</span>}
      <Progress
        value={pct}
        className={`flex-1 h-2 ${colorClass}`}
        aria-label={`${label || "Score"}: ${pct}%`}
      />
      <span className="text-sm font-bold min-w-[40px] text-right">{pct}%</span>
    </div>
  );
}
