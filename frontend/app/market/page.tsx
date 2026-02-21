"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Cell,
} from "recharts";
import SkeletonCard from "@/components/skeleton-card";
import api from "@/lib/api-client";
import { cn } from "@/lib/utils";

const CHART_STYLE = {
  contentStyle: {
    backgroundColor: "#ffffff",
    border: "1px solid #d9d4cc",
    borderRadius: "6px",
    fontSize: "12px",
    color: "#1a1a1a",
  },
};

function demandVariant(level: string): "success" | "warning" | "destructive" {
  if (level === "high") return "success";
  if (level === "medium") return "warning";
  return "destructive";
}

interface Insight {
  role_category: string;
  demand_level: string;
  avg_salary_sgd: number;
  yoy_growth_pct: number;
  hiring_volume: number;
  trending_skills: string[];
  forecast_2026?: string;
  outlook?: string;
}

interface MarketData {
  top_skills_overall: string[];
  highest_demand_sectors: string[];
  insights: Insight[];
}

export default function MarketInsights() {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    api.get("/api/market-insights")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Failed to load market data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonCard count={4} />;
  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;
  if (!data) return <Alert variant="destructive"><AlertDescription>No market data available.</AlertDescription></Alert>;

  const salaryData = data.insights.map((i) => ({
    category: i.role_category,
    salary: i.avg_salary_sgd,
    growth: i.yoy_growth_pct,
  }));

  const radarData = data.insights.map((i) => ({
    category: i.role_category.replace("&", "\n&"),
    demand: i.hiring_volume / 40,
    growth: i.yoy_growth_pct,
    salary: i.avg_salary_sgd / 200,
  }));

  const activeIdx = activeCategory
    ? salaryData.findIndex((d) => d.category === activeCategory)
    : -1;

  const activeInsight = activeCategory
    ? data.insights.find((i) => i.role_category === activeCategory)
    : null;

  return (
    <div className="space-y-5">
      <header>
        <div className="flex items-center gap-2 mb-1">
          <span className="live-dot" />
          <p className="section-label">Live Data</p>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">Singapore Tech Market</h1>
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
                    activeCategory === sector ? "bg-primary/10" : "hover:bg-muted/40",
                  )}
                  onMouseEnter={() => setActiveCategory(sector)}
                  onMouseLeave={() => setActiveCategory(null)}
                >
                  <span className="text-xs font-bold data-num text-primary w-4">{i + 1}</span>
                  <span className={cn("text-sm font-medium transition-colors", activeCategory === sector && "text-primary font-bold")}>
                    {sector}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Salary chart — highlights active sector */}
        <Card variant="elevated">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="section-label">Avg Monthly Salary (SGD)</p>
              {activeInsight && (
                <span className="text-xs text-primary font-bold animate-pulse">
                  ↑ {activeInsight.role_category}
                </span>
              )}
            </div>
            <div className="h-[280px]" role="img" aria-label="Bar chart of average monthly salaries by tech category">
              <ResponsiveContainer>
                <BarChart data={salaryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d9d4cc" />
                  <XAxis dataKey="category" tick={{ fill: "#6b7280", fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
                  <Tooltip
                    formatter={(v) => `SGD ${Number(v).toLocaleString()}`}
                    contentStyle={CHART_STYLE.contentStyle}
                  />
                  <Bar dataKey="salary" radius={[3, 3, 0, 0]}>
                    {salaryData.map((entry, i) => (
                      <Cell
                        key={entry.category}
                        fill="#00BFFF"
                        opacity={activeIdx === -1 || i === activeIdx ? 1 : 0.3}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* YoY growth chart — highlights active sector */}
        <Card variant="elevated">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="section-label">YoY Growth (%)</p>
              {activeInsight && (
                <span className="text-xs font-bold" style={{ color: "hsl(145 60% 36%)" }}>
                  {activeInsight.yoy_growth_pct}% growth
                </span>
              )}
            </div>
            <div className="h-[280px]" role="img" aria-label="Bar chart of year-over-year growth by category">
              <ResponsiveContainer>
                <BarChart data={salaryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d9d4cc" />
                  <XAxis dataKey="category" tick={{ fill: "#6b7280", fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
                  <Tooltip
                    formatter={(v) => `${v}%`}
                    contentStyle={CHART_STYLE.contentStyle}
                  />
                  <Bar dataKey="growth" radius={[3, 3, 0, 0]}>
                    {salaryData.map((entry, i) => (
                      <Cell
                        key={entry.category}
                        fill="#28c76f"
                        opacity={activeIdx === -1 || i === activeIdx ? 1 : 0.3}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Radar overview */}
        <Card variant="data" className="col-span-1 md:col-span-2">
          <CardContent className="p-5">
            <p className="section-label mb-4">Market Overview Radar</p>
            <div className="h-[350px]" role="img" aria-label="Radar chart showing market demand and growth across tech categories">
              <ResponsiveContainer>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#d9d4cc" />
                  <PolarAngleAxis dataKey="category" tick={{ fill: "#374151", fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fill: "#6b7280", fontSize: 10 }} />
                  <Radar name="Demand" dataKey="demand" stroke="#00BFFF" fill="#00BFFF" fillOpacity={0.2} />
                  <Radar name="Growth %" dataKey="growth" stroke="#28c76f" fill="#28c76f" fillOpacity={0.2} />
                  <Legend wrapperStyle={{ color: "#374151", fontSize: "12px" }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

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
                  <h3 className={cn("font-bold text-sm transition-colors", isActive && "text-primary")}>{ins.role_category}</h3>
                  <div className="flex items-center gap-1.5">
                    {isActive && (
                      <span className="live-dot" />
                    )}
                    <Badge variant={demandVariant(ins.demand_level)}>{ins.demand_level}</Badge>
                  </div>
                </div>
                <p className="text-xl font-extrabold data-num text-primary mb-0.5">
                  SGD {ins.avg_salary_sgd.toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/mo</span>
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  <span className="data-num">{ins.hiring_volume}</span> openings &middot;{" "}
                  <span className="data-num trend-up">{ins.yoy_growth_pct}%</span> YoY growth
                </p>

                {ins.forecast_2026 && (
                  <div className="mb-3 p-3 bg-primary/8 border border-primary/20 rounded">
                    <p className="section-label text-primary mb-1">
                      2026 Outlook: {ins.forecast_2026}
                    </p>
                    <p className="text-xs leading-relaxed">
                      {ins.outlook}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-1">
                  {ins.trending_skills.slice(0, 4).map((s) => (
                    <Badge key={s} variant="accent" className="text-xs">{s}</Badge>
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
