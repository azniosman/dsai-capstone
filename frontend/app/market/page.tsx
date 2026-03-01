"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Building2, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SkeletonCard from "@/components/ui/skeleton-card";
import api from "@/lib/api-client";
import { cn, extractApiError } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const MarketSalaryBar = dynamic(
  () =>
    import("@/components/dashboard/charts/MarketCharts").then(
      (mod) => mod.MarketSalaryBar,
    ),
  { ssr: false, loading: () => <Skeleton className="h-[350px] w-full" /> },
);
const MarketGrowthBar = dynamic(
  () =>
    import("@/components/dashboard/charts/MarketCharts").then(
      (mod) => mod.MarketGrowthBar,
    ),
  { ssr: false, loading: () => <Skeleton className="h-[350px] w-full" /> },
);
const MarketRadar = dynamic(
  () =>
    import("@/components/dashboard/charts/MarketRadar").then(
      (mod) => mod.MarketRadar,
    ),
  { ssr: false, loading: () => <Skeleton className="h-[350px] w-full" /> },
);

function demandVariant(level: string): "success" | "warning" | "destructive" {
  if (level === "high") return "success";
  if (level === "medium") return "warning";
  return "destructive";
}

import type { MarketData } from "@/types/api";

export default function MarketInsights() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const {
    data,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ["market-insights"],
    queryFn: async () => {
      const res = await api.get("/api/market-insights");
      return res.data as MarketData;
    },
  });

  const error = queryError
    ? extractApiError(queryError, "Failed to load market data")
    : null;

  const salaryData = useMemo(
    () =>
      (data?.insights ?? []).map((i) => ({
        category: i.role_category,
        salary: i.avg_salary_sgd,
        growth: i.yoy_growth_pct,
      })),
    [data],
  );

  const radarData = useMemo(
    () =>
      (data?.insights ?? []).map((i) => ({
        category: (i.role_category ?? "").replace("&", "\n&"),
        demand: i.hiring_volume / 40,
        growth: i.yoy_growth_pct,
        salary: i.avg_salary_sgd / 200,
      })),
    [data],
  );

  const activeIdx = useMemo(
    () =>
      activeCategory
        ? salaryData.findIndex((d) => d.category === activeCategory)
        : -1,
    [activeCategory, salaryData],
  );

  const activeInsight = useMemo(
    () =>
      activeCategory
        ? (data?.insights.find((i) => i.role_category === activeCategory) ??
          null)
        : null,
    [activeCategory, data],
  );

  if (loading) return <SkeletonCard count={4} />;
  if (error)
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  if (!data)
    return (
      <Alert variant="destructive">
        <AlertDescription>No market data available.</AlertDescription>
      </Alert>
    );

  return (
    <div className="space-y-5">
      <header>
        <p className="section-label mb-1">
          {data.last_updated
            ? `Data as of ${data.last_updated}`
            : "Market Data"}
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Singapore Tech Market
        </h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top skills */}
        <Card variant="data">
          <CardContent className="p-5">
            <p className="section-label mb-3">Top In-Demand Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {data.top_skills_overall.map((skill, i) => (
                <Badge key={skill} variant={i < 3 ? "default" : "outline"}>
                  {i < 3 && <TrendingUp className="h-2.5 w-2.5 mr-1" />}
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Fastest growing sectors */}
        <Card variant="metric">
          <CardContent className="p-5">
            <p className="section-label mb-3">Fastest Growing Sectors</p>
            <div className="space-y-1.5">
              {data.highest_demand_sectors.map((sector, i) => (
                <div
                  key={sector}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1 rounded-md transition-colors",
                    activeCategory === sector
                      ? "bg-primary/10"
                      : "hover:bg-muted/40",
                  )}
                  onMouseEnter={() => setActiveCategory(sector)}
                  onMouseLeave={() => setActiveCategory(null)}
                >
                  <span className="text-xs font-bold data-num text-primary w-4">
                    {i + 1}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-medium transition-colors",
                      activeCategory === sector && "text-primary font-bold",
                    )}
                  >
                    {sector}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Salary chart — highlights active sector */}
        <Card className="overflow-hidden p-5">
          <p className="section-label mb-4">Avg Monthly Salary (SGD)</p>
          {activeInsight && (
            <span className="text-xs text-primary font-bold float-right -mt-8 animate-pulse">
              ↑ {activeInsight.role_category}
            </span>
          )}
          <MarketSalaryBar data={salaryData} activeIdx={activeIdx} />
        </Card>

        {/* YoY growth chart -- highlights active sector */}
        <Card className="overflow-hidden p-5">
          <p className="section-label mb-4">YoY Growth (%)</p>
          {activeInsight && (
            <span className="text-xs font-bold text-emerald-600 float-right -mt-8">
              {activeInsight.yoy_growth_pct}% growth
            </span>
          )}
          <MarketGrowthBar data={salaryData} activeIdx={activeIdx} />
        </Card>

        {/* Radar overview */}
        <div className="col-span-1 md:col-span-2">
          <MarketRadar data={radarData} />
        </div>

        {/* Sector detail cards — hover spotlights the charts above */}
        {data.insights.map((ins) => {
          const isActive = activeCategory === ins.role_category;
          return (
            <Card
              key={ins.role_category}
              variant="elevated"
              className={cn(
                "hover-lift cursor-default transition-all duration-300",
                isActive && "ring-2 ring-primary/40 shadow-primary/10",
              )}
              onMouseEnter={() => setActiveCategory(ins.role_category)}
              onMouseLeave={() => setActiveCategory(null)}
            >
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3
                    className={cn(
                      "font-bold text-sm transition-colors",
                      isActive && "text-primary",
                    )}
                  >
                    {ins.role_category}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    {isActive && <span className="live-dot" />}
                    <Badge variant={demandVariant(ins.demand_level)}>
                      {ins.demand_level}
                    </Badge>
                  </div>
                </div>
                <p className="text-xl font-extrabold data-num text-primary mb-0.5">
                  SGD {ins.avg_salary_sgd.toLocaleString()}
                  <span className="text-xs font-normal text-muted-foreground">
                    /mo
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  <span className="data-num">{ins.hiring_volume}</span> openings
                  &middot;{" "}
                  <span className="data-num trend-up">
                    {ins.yoy_growth_pct}%
                  </span>{" "}
                  YoY growth
                </p>

                {ins.forecast_2026 && (
                  <div className="mb-3 p-3 bg-primary/8 border border-primary/20 rounded">
                    <p className="section-label text-primary mb-1">
                      2026 Outlook: {ins.forecast_2026}
                    </p>
                    <p className="text-xs leading-relaxed">{ins.outlook}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-1">
                  {ins.trending_skills.slice(0, 4).map((s) => (
                    <Badge key={s} variant="accent" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
