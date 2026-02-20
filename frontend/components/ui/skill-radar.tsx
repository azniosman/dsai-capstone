"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Radar as RadarIcon } from "lucide-react";

interface SkillData {
  skill: string;
  userLevel: number;
  requiredLevel: number;
}

interface SkillRadarProps {
  data: SkillData[];
  roleName: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover/95 backdrop-blur-md border border-border shadow-md rounded-lg p-3 text-sm">
        <p className="font-semibold text-foreground mb-2">{label}</p>
        <p className="text-primary flex items-center justify-between gap-4 mb-1">
          <span>Your Level:</span>
          <span className="font-bold">{payload[0].value}/5</span>
        </p>
        <p className="text-muted-foreground flex items-center justify-between gap-4">
          <span>Required:</span>
          <span className="font-bold">{payload[1].value}/5</span>
        </p>
      </div>
    );
  }
  return null;
};

export function SkillRadar({ data, roleName }: SkillRadarProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="h-full w-full flex items-center justify-center min-h-[350px] bg-muted/20 border-border/40">
        <p className="text-sm text-muted-foreground">
          Not enough data for skill radar.
        </p>
      </Card>
    );
  }

  return (
    <Card className="h-full w-full bg-card/60 backdrop-blur-md border-border/50 shadow-xl rounded-3xl overflow-hidden relative group">
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent pointer-events-none opacity-50 transition-opacity group-hover:opacity-100" />
      <CardHeader className="pb-2 border-b border-border/50 bg-background/50 relative z-10">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-full text-primary">
            <RadarIcon className="w-5 h-5" />
          </div>
          Skill Match Analysis
        </CardTitle>
        <CardDescription className="text-xs">
          Your profile compared against{" "}
          <span className="font-semibold text-foreground">{roleName}</span>{" "}
          requirements
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 relative z-10 h-[320px] w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <PolarGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="skill"
              tick={{
                fill: "hsl(var(--foreground))",
                fontSize: 11,
                fontWeight: 500,
              }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 5]}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              tickCount={6}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* User Level - Area Fill */}
            <Radar
              name="You"
              dataKey="userLevel"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.4}
              strokeWidth={2}
            />

            {/* Required Level - Outline Only */}
            <Radar
              name="Required"
              dataKey="requiredLevel"
              stroke="hsl(var(--muted-foreground))"
              fill="none"
              strokeWidth={2}
              strokeDasharray="4 4"
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
