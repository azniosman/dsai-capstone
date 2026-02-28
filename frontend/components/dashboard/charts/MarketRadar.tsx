"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import { ChartCard } from "@/components/ui/chart-card";
import { CHART_STATUS, CHART_AXIS } from "@/lib/chart-colors";

/** Normalised data point for the market overview radar. */
export interface MarketRadarDatum {
  category: string;
  demand: number;
  growth: number;
  salary: number;
}

interface MarketRadarProps {
  /** Normalized radar data produced from market insights. */
  data: MarketRadarDatum[];
}

/**
 * Multi-axis radar chart giving a macro view of market demand, growth,
 * and relative salary across tech categories.
 *
 * Keeps Recharts (Tremor v4 does not export a RadarChart).
 * Extracted from the inline JSX in `market/page.tsx`.
 */
export function MarketRadar({ data }: MarketRadarProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
        No market data available.
      </div>
    );
  }

  return (
    <ChartCard
      title="Market Overview Radar"
      height={350}
      ariaLabel="Radar chart showing market demand and growth across tech categories"
    >
      <RadarChart data={data}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis dataKey="category" tick={CHART_AXIS.tickBold} />
        <PolarRadiusAxis tick={{ ...CHART_AXIS.tick, fontSize: 10 }} />
        <Radar
          name="Demand"
          dataKey="demand"
          stroke={CHART_STATUS.info}
          fill={CHART_STATUS.info}
          fillOpacity={0.2}
        />
        <Radar
          name="Growth %"
          dataKey="growth"
          stroke={CHART_STATUS.success}
          fill={CHART_STATUS.success}
          fillOpacity={0.2}
        />
        <Legend
          wrapperStyle={{
            color: "hsl(var(--foreground))",
            fontSize: "12px",
          }}
        />
      </RadarChart>
    </ChartCard>
  );
}
