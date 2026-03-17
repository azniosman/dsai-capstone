"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Share2,
  Award,
  Target,
  Zap,
  Briefcase,
  Database,
  Cpu,
  TrendingUp,
  Activity,
  Layers,
} from "lucide-react";
import api from "@/lib/api-client";
import { motion, Variants } from "framer-motion";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SkillChip from "@/components/ui/skill-chip";
import { SkillRadar } from "@/components/ui/skill-radar";
import SkeletonCard from "@/components/ui/skeleton-card";
import { Skeleton } from "@/components/ui/skeleton";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

const METRIC_ICONS = [
  { icon: Layers, label: "Total Skills", key: "skills_count" as const },
  { icon: Activity, label: "Career Readiness", key: "career_readiness" as const, isPercent: true },
  { icon: Briefcase, label: "Opportunities", key: "recommendations_count" as const },
  { icon: Database, label: "Skill Gaps", key: "gaps_identified" as const, isNegative: true },
];

export default function Dashboard() {
  const router = useRouter();

  if (typeof window !== "undefined" && !localStorage.getItem("token")) {
    router.push("/login");
  }

  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const res = await api.get("/api/dashboard/summary");
      if (res.data?.profile_id) {
        localStorage.setItem("profileId", String(res.data.profile_id));
      }
      return res.data;
    },
  });

  const { data: recommendationsData, isLoading: isLoadingRecs } = useQuery({
    queryKey: ["dashboard-recommendations", summary?.profile_id],
    enabled: !!summary?.profile_id,
    queryFn: async () => {
      const res = await api.post("/api/recommend", {
        profile_id: summary.profile_id,
      });
      return res.data;
    },
  });

  const topRecs = recommendationsData?.recommendations || [];
  const topRec = topRecs.length > 0 ? topRecs[0] : null;

  if (isLoadingSummary) {
    return (
      <div className="flex flex-1 overflow-hidden h-screen bg-background p-6 pt-16 font-mono">
        <main className="flex-1 flex flex-col space-y-6">
          <Skeleton className="h-12 w-1/3 bg-muted/30" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 bg-card border border-primary/20" />
            ))}
          </div>
          <SkeletonCard count={2} />
        </main>
      </div>
    );
  }

  const userSkills: string[] = summary?.skills || [];
  const name = summary?.name || "User";

  return (
    <div className="flex flex-1 overflow-y-auto h-screen bg-background font-mono -m-12 p-12">
      <main className="flex-1 flex flex-col max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between border-b border-primary/20 pb-6"
        >
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 border border-primary p-2 text-primary shadow-[0_0_8px_rgba(37,157,244,0.4)]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-widest uppercase text-foreground">
                Entity Dashboard
              </h2>
              <p className="text-[10px] text-muted-foreground tracking-wider mt-1">
                Welcome back, {name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="rounded-none border-primary/30 text-primary hover:bg-primary/10 text-[10px] uppercase tracking-widest h-10 px-4"
            >
              <Share2 className="w-3.5 h-3.5" />
              Export
            </Button>
            <Button
              onClick={() => router.push("/recommendations")}
              className="rounded-none bg-primary/10 border border-primary text-primary hover:bg-primary hover:text-background-dark text-[10px] uppercase tracking-widest h-10 px-4 shadow-[0_0_10px_rgba(37,157,244,0.2)]"
            >
              <Target className="w-3.5 h-3.5" />
              View All
            </Button>
          </div>
        </motion.div>

        {/* Metric Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {METRIC_ICONS.map((metric, i) => {
            const Icon = metric.icon;
            const value = summary?.[metric.key] || 0;
            return (
              <motion.div key={i} variants={itemVariants}>
                <div className="bg-card border border-primary/20 p-4 relative overflow-hidden group hover:border-primary/40 transition-all">
                  <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/30"></div>
                  <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/30"></div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">
                      {metric.label}
                    </span>
                    <div className="bg-primary/10 border border-primary/20 p-1.5">
                      <Icon className="w-3.5 h-3.5 text-primary/70" />
                    </div>
                  </div>
                  
                  <div className="text-2xl font-bold font-mono text-foreground drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
                    {metric.isPercent ? (
                      <>
                        <AnimatedCounter value={value} decimals={1} />
                        <span className="text-lg text-primary">%</span>
                      </>
                    ) : metric.isNegative ? (
                      <span className="text-destructive">
                        <AnimatedCounter value={value} />
                      </span>
                    ) : (
                      <AnimatedCounter value={value} />
                    )}
                  </div>
                  
                  <div className="mt-2 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_5px_rgba(37,157,244,0.8)]"></div>
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                      {metric.isNegative ? "Requires attention" : "Live data"}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Main Content Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Left Column - Top Recommendation */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div variants={itemVariants}>
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-primary" />
                <h3 className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">
                  Top Recommendation
                </h3>
              </div>

              {isLoadingRecs ? (
                <SkeletonCard count={1} />
              ) : topRec ? (
                <div className="bg-card border border-primary/20 p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] pointer-events-none"></div>
                  
                  <div className="flex items-start justify-between mb-6 relative z-10">
                    <div>
                      <h4 className="text-lg font-bold text-primary tracking-tight">{topRec.title}</h4>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                        {topRec.category}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold font-mono text-primary drop-shadow-[0_0_8px_rgba(37,157,244,0.4)]">
                        {(topRec.match_score * 100).toFixed(0)}%
                      </div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-widest mt-1">
                        Match Score
                      </div>
                    </div>
                  </div>

                  {topRec.metrics && (
                    <SkillRadar
                      data={topRec.metrics.skill_gaps?.map((gap: { skill: string; profile_level: number; required_level: number; }) => ({
                        subject: gap.skill,
                        current: gap.profile_level * 100,
                        required: gap.required_level * 100,
                        fullMark: 100
                      })) || []}
                      roleName={topRec.title}
                      metrics={topRec.metrics}
                    />
                  )}

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div>
                      <div className="text-[9px] font-bold text-primary/50 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <span className="w-1 h-1 bg-primary/50 rounded-full"></span>
                        Matched Skills
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {topRec.matched_skills?.slice(0, 6).map((skill: string) => (
                          <SkillChip key={skill} skill={skill} severity="none" />
                        ))}
                        {topRec.matched_skills?.length > 6 && (
                          <Badge variant="outline" className="rounded-none border-primary/30 text-primary text-[9px] uppercase tracking-wider">
                            +{topRec.matched_skills.length - 6}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {topRec.missing_skills?.length > 0 && (
                      <div>
                        <div className="text-[9px] font-bold text-accent-coral/50 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <span className="w-1 h-1 bg-accent-coral/50 rounded-full"></span>
                          Skills to Learn
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {topRec.missing_skills.slice(0, 6).map((skill: string) => (
                            <SkillChip key={skill} skill={skill} severity="high" />
                          ))}
                          {topRec.missing_skills.length > 6 && (
                            <Badge variant="outline" className="rounded-none border-accent-coral/30 text-accent-coral text-[9px] uppercase tracking-wider">
                              +{topRec.missing_skills.length - 6}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-card/50 border border-primary/20 p-12 text-center relative">
                  <div className="absolute inset-0 cyber-grid opacity-10"></div>
                  <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h4 className="text-sm font-bold text-foreground uppercase tracking-widest">No Recommendations</h4>
                  <p className="text-[10px] text-muted-foreground mt-2 tracking-wider">
                    Update your profile to see tailored opportunities
                  </p>
                  <Button
                    onClick={() => router.push("/profile")}
                    className="mt-6 rounded-none bg-primary/10 border border-primary text-primary hover:bg-primary hover:text-background-dark text-[10px] uppercase tracking-widest"
                  >
                    Update Profile
                  </Button>
                </div>
              )}
            </motion.div>
          </div>

          {/* Right Column - Profile Summary */}
          <div className="space-y-6">
            {/* Skills */}
            <motion.div variants={itemVariants}>
              <div className="bg-card border border-primary/20 p-4 relative">
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/30"></div>
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="w-4 h-4 text-primary" />
                  <h4 className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">
                    Your Skills
                  </h4>
                </div>
                {userSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {userSkills.map((skill) => (
                      <SkillChip key={skill} skill={skill} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[10px] text-muted-foreground uppercase tracking-wider border border-dashed border-primary/20">
                    No skills added
                  </div>
                )}
              </div>
            </motion.div>

            {/* Profile Details */}
            <motion.div variants={itemVariants}>
              <div className="bg-card border border-primary/20 p-4 relative">
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/30"></div>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h4 className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">
                    Profile Details
                  </h4>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-primary/10">
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Experience</span>
                    <span className="text-sm font-bold text-foreground font-mono">{summary?.years_experience || 0} Years</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-primary/10">
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Education</span>
                    <span className="text-sm font-bold text-foreground font-mono">{summary?.education || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Career Switcher</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${summary?.is_career_switcher ? "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)]" : "bg-muted-foreground"}`}></div>
                      <span className="text-sm font-bold text-foreground font-mono">{summary?.is_career_switcher ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={itemVariants}>
              <div className="bg-card/50 border border-primary/20 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-primary" />
                  <h4 className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">
                    Quick Actions
                  </h4>
                </div>
                <div className="space-y-2">
                  <Button
                    onClick={() => router.push("/skill-gap")}
                    className="w-full rounded-none bg-transparent border border-primary/30 text-primary hover:bg-primary/10 text-[10px] uppercase tracking-widest h-9 justify-start"
                  >
                    <TrendingUp className="w-3.5 h-3.5 mr-2" />
                    Skill Gap Analysis
                  </Button>
                  <Button
                    onClick={() => router.push("/roadmap")}
                    className="w-full rounded-none bg-transparent border border-primary/30 text-primary hover:bg-primary/10 text-[10px] uppercase tracking-widest h-9 justify-start"
                  >
                    <Layers className="w-3.5 h-3.5 mr-2" />
                    Learning Path
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
