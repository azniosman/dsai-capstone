"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from "recharts";
import SkeletonCard from "@/components/skeleton-card";
import api from "@/lib/api-client";

const DEMAND_COLORS: Record<string, string> = { high: "#4caf50", medium: "#ff9800", low: "#f44336" };

interface Insight {
  role_category: string;
  demand_level: string;
  avg_salary_sgd: number;
  yoy_growth_pct: number;
  hiring_volume: number;
  trending_skills: string[];
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

  useEffect(() => {
    api.get("/api/market-insights")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Failed to load market data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonCard count={4} />;
  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;
  if (!data) return null;

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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Singapore Tech Market Insights</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <CardContent className="p-0">
            <h2 className="text-lg font-bold mb-3">Top In-Demand Skills</h2>
            <div className="flex flex-wrap gap-1.5">
              {data.top_skills_overall.map((skill, i) => (
                <Badge key={skill} variant={i < 3 ? "default" : "outline"}>
                  {i < 3 && <TrendingUp className="h-3 w-3 mr-1" />}
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardContent className="p-0">
            <h2 className="text-lg font-bold mb-3">Fastest Growing Sectors</h2>
            {data.highest_demand_sectors.map((sector, i) => (
              <p key={sector} className="text-base">{i + 1}. {sector}</p>
            ))}
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardContent className="p-0">
            <h2 className="text-lg font-bold mb-3">Average Monthly Salary (SGD)</h2>
            <div className="h-[300px]" role="img" aria-label="Bar chart of average monthly salaries by tech category">
              <ResponsiveContainer>
                <BarChart data={salaryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip formatter={(v) => `SGD ${Number(v).toLocaleString()}`} />
                  <Bar dataKey="salary" fill="#1565c0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardContent className="p-0">
            <h2 className="text-lg font-bold mb-3">YoY Growth (%)</h2>
            <div className="h-[300px]" role="img" aria-label="Bar chart of year-over-year growth percentages by category">
              <ResponsiveContainer>
                <BarChart data={salaryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="growth" fill="#00897b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2 p-6">
          <CardContent className="p-0">
            <h2 className="text-lg font-bold mb-3">Market Overview Radar</h2>
            <div className="h-[350px]" role="img" aria-label="Radar chart showing market demand and growth across tech categories">
              <ResponsiveContainer>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis />
                  <Radar name="Demand" dataKey="demand" stroke="#1565c0" fill="#1565c0" fillOpacity={0.2} />
                  <Radar name="Growth %" dataKey="growth" stroke="#00897b" fill="#00897b" fillOpacity={0.2} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {data.insights.map((ins) => (
          <Card key={ins.role_category} className="p-6">
            <CardContent className="p-0">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold">{ins.role_category}</h3>
                <Badge style={{ backgroundColor: DEMAND_COLORS[ins.demand_level], color: "white" }}>
                  {ins.demand_level}
                </Badge>
              </div>
              <p className="text-lg font-bold">SGD {ins.avg_salary_sgd.toLocaleString()}/mo</p>
              <p className="text-sm text-muted-foreground">
                {ins.hiring_volume} openings &middot; {ins.yoy_growth_pct}% YoY growth
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {ins.trending_skills.slice(0, 4).map((s) => (
                  <Badge key={s} variant="outline">{s}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
