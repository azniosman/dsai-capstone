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
import { Radar as RadarIcon, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface SkillData {
  skill: string;
  userLevel: number;
  requiredLevel: number;
}

interface SkillRadarProps {
  data: SkillData[];
  roleName: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/90 backdrop-blur-xl border border-border/50 shadow-2xl rounded-2xl p-4 text-sm min-w-[180px]">
        <p className="font-bold text-foreground mb-3 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          {label}
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4 bg-primary/10 px-2 py-1.5 rounded-md">
            <span className="text-primary font-medium text-xs">Your Level</span>
            <span className="font-bold text-primary">{payload[0].value}/5</span>
          </div>
          <div className="flex items-center justify-between gap-4 bg-muted/50 px-2 py-1.5 rounded-md">
            <span className="text-muted-foreground font-medium text-xs">
              Required
            </span>
            <span className="font-bold text-foreground">
              {payload[1].value}/5
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function SkillRadar({ data, roleName }: SkillRadarProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="h-full w-full flex items-center justify-center min-h-[350px] bg-card/40 border-border/40 backdrop-blur-md rounded-[2rem]">
        <div className="text-center">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
            <RadarIcon className="w-6 h-6 text-muted-foreground opacity-50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Analyzing skill matches...
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full w-full bg-card/40 backdrop-blur-2xl border-border/40 shadow-2xl rounded-[2rem] overflow-hidden relative group transition-all duration-500 hover:border-primary/20 hover:shadow-primary/5">
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-primary/5 opacity-50 pointer-events-none -z-10 transition-opacity duration-700 group-hover:opacity-100" />

      <CardHeader className="pb-4 border-b border-border/30 bg-background/30 relative z-10 backdrop-blur-md">
        <CardTitle className="text-lg flex items-center gap-2 tracking-tight">
          <div className="p-2 bg-primary/10 rounded-xl text-primary ring-1 ring-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.1)]">
            <RadarIcon className="w-4 h-4" />
          </div>
          Skill Match Analysis
        </CardTitle>
        <CardDescription className="text-xs font-medium mt-1.5 flex items-center gap-1">
          Your profile vs{" "}
          <AnimatePresence mode="wait">
            <motion.span
              key={roleName}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="text-foreground font-bold ml-0.5"
            >
              {roleName}
            </motion.span>
          </AnimatePresence>
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0 relative z-10 h-[340px] w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            cx="50%"
            cy="50%"
            outerRadius="70%"
            data={data}
            className="mt-4 filter drop-shadow-md"
          >
            <defs>
              <linearGradient
                id="userLevelGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0.6}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient
                id="requiredLevelGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="hsl(var(--muted-foreground))"
                  stopOpacity={0.2}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--muted-foreground))"
                  stopOpacity={0.0}
                />
              </linearGradient>
            </defs>

            <PolarGrid
              stroke="hsl(var(--border))"
              strokeDasharray="4 4"
              opacity={0.5}
            />
            <PolarAngleAxis
              dataKey="skill"
              tick={{
                fill: "hsl(var(--foreground))",
                fontSize: 10,
                fontWeight: 600,
                opacity: 0.8,
              }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 5]}
              tick={{
                fill: "hsl(var(--muted-foreground))",
                fontSize: 9,
                fontWeight: 500,
              }}
              tickCount={6}
              axisLine={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "transparent" }}
            />

            {/* Required Level - Outline & subtle fill */}
            <Radar
              name="Required"
              dataKey="requiredLevel"
              stroke="hsl(var(--muted-foreground))"
              strokeOpacity={0.4}
              fill="url(#requiredLevelGradient)"
              strokeWidth={2}
              strokeDasharray="4 4"
            />

            {/* User Level - Holographic Fill */}
            <Radar
              name="You"
              dataKey="userLevel"
              stroke="hsl(var(--primary))"
              fill="url(#userLevelGradient)"
              strokeWidth={3}
              className="drop-shadow-[0_0_8px_rgba(var(--primary),0.5)] transition-all duration-500"
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
