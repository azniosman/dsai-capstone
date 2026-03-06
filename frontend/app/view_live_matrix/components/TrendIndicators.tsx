"use client";

import { TrendingUp, TrendingDown, Zap } from "lucide-react";
import { TrendSignal } from "../types";

const Section = ({
  title,
  icon: Icon,
  items,
  colorClass,
}: {
  title: string;
  icon: React.ElementType;
  items: TrendSignal[];
  colorClass: string;
}) => {
  if (items.length === 0) return null;
  return (
    <div
      className={`glass-panel p-4 flex flex-col gap-3 relative overflow-hidden group`}
    >
      <div
        className={`absolute top-0 left-0 w-1 h-full ${colorClass.split(" ")[0]}`}
      ></div>
      <h3
        className={`text-xs font-mono uppercase tracking-widest flex items-center gap-2 ${colorClass.split(" ")[1]}`}
      >
        <Icon className="w-4 h-4" /> {title}
      </h3>
      <div className="flex flex-col gap-2">
        {items.map((item: TrendSignal) => (
          <div
            key={item.id}
            className="flex justify-between items-center text-sm"
          >
            <span
              className="text-neutral-300 font-medium truncate pr-2"
              title={item.jobRole}
            >
              {item.jobRole}
            </span>
            <span className="font-mono bg-black/40 px-2 py-0.5 rounded text-xs whitespace-nowrap">
              {item.trendType === "EMERGING_SKILL"
                ? `Gap: ${item.trendScore.toFixed(2)}`
                : `${item.trendScore > 0 ? "+" : ""}${item.trendScore.toFixed(1)}%`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function TrendIndicators({
  trends,
  isLoading,
}: {
  trends: TrendSignal[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="glass-panel p-4 h-24 animate-pulse bg-cyan-950/20"
          ></div>
        ))}
      </div>
    );
  }

  if (trends.length === 0) return null;

  const topGrowth = trends
    .filter((t) => t.trendType === "HIGH_GROWTH")
    .slice(0, 3);
  const emerging = trends
    .filter((t) => t.trendType === "EMERGING_SKILL")
    .slice(0, 3);
  const declining = trends
    .filter((t) => t.trendType === "DECLINING_DEMAND")
    .slice(0, 3);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Section
        title="High Velocity Roles"
        icon={TrendingUp}
        items={topGrowth}
        colorClass="bg-green-500 text-green-400"
      />
      <Section
        title="Emerging Skills (Gap)"
        icon={Zap}
        items={emerging}
        colorClass="bg-amber-500 text-amber-400"
      />
      <Section
        title="Declining Demand"
        icon={TrendingDown}
        items={declining}
        colorClass="bg-red-500 text-red-400"
      />
    </div>
  );
}
