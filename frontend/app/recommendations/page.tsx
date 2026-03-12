"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  ChevronRight,
  Target,
  Terminal,
  Cpu,
  Bell,
  SlidersHorizontal,
  AlertCircle,
  BadgeCheck,
  Banknote,
  Search,
  CheckCircle2,
  XCircle,
  Sparkles,
  Zap,
  ArrowUpRight,
  TerminalSquare,
  Database,
  Network,
  Rocket,
  Activity,
  Percent,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, extractApiError } from "@/lib/utils";
import api from "@/lib/api-client";
import { useModalStore } from "@/store/modalStore";
import Link from "next/link";
import { ScoreBreakdownModal } from "@/components/ui/score-breakdown-modal";

/* ─── Types ─── */
interface Recommendation {
  role_id: number;
  title: string;
  category: string;
  salary_range?: string;
  match_score: number;
  content_score: number;
  rule_score: number;
  skill_match_quality: string;
  career_switcher_bonus: number;
  matched_skills: string[];
  missing_skills: string[];
  rationale: string;
}

export default function Recommendations() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [selected, setSelected] = useState<Recommendation | null>(null);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);

  const router = useRouter();
  const { openModal } = useModalStore();

  const [profileId, setProfileId] = useState<number | null>(null);

  useEffect(() => {
    const pidStr = localStorage.getItem("profileId");
    setTimeout(() => {
      if (pidStr) {
        setHasProfile(true);
        setProfileId(parseInt(pidStr));
      } else {
        setLoading(false);
      }
    }, 0);
  }, []);

  useEffect(() => {
    if (!profileId) return;

    api
      .post("/api/recommend", { profile_id: profileId })
      .then((res) => {
        const data: Recommendation[] = res.data.recommendations || [];
        setRecs(data);
        if (data.length > 0) setSelected(data[0]);
      })
      .catch((err) => {
        console.error(extractApiError(err, "Failed to load recommendations"));
      })
      .finally(() => setLoading(false));
  }, [profileId]);

  if (!hasProfile && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] space-y-8 bg-background font-mono text-foreground selection:bg-primary/30">
        <div className="w-32 h-32 border border-primary/20 bg-primary/5 shadow-[0_0_30px_rgba(37,157,244,0.1)] flex items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-1 border-b border-l border-primary/30 bg-primary/10">
            <span className="text-[7px] font-mono text-primary tracking-widest uppercase">
              SYS_ERR
            </span>
          </div>
          <Target className="w-12 h-12 text-primary drop-shadow-[0_0_5px_rgba(37,157,244,0.5)]" />
        </div>
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-3xl font-bold uppercase tracking-widest text-foreground mt-4">
            Insufficient Entity Data
          </h2>
          <p className="font-mono text-[10px] text-muted-foreground leading-relaxed uppercase tracking-wider border-l-2 border-accent-coral pl-4 text-left">
            &gt; Entity Dossier must be configured.
            <br />
            &gt; Initial vector extraction required before target alignment can
            be calculated.
          </p>
          <Button
            onClick={() => router.push("/profile-builder")}
            className="mt-8 mx-auto max-w-[300px] bg-primary/10 border border-primary text-primary hover:bg-primary hover:text-background-dark shadow-[0_0_15px_rgba(37,157,244,0.2)] font-mono uppercase text-[10px] font-bold tracking-widest rounded-none h-14 px-10 transition-all w-full flex items-center justify-center gap-3 group"
          >
            <Terminal className="h-4 w-4" /> Initialize Dossier{" "}
            <ChevronRight className="h-4 w-4 ml-auto group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background font-mono text-foreground overflow-x-hidden relative selection:bg-primary/30">
      {/* Header Section */}
      <header className="relative border-b border-primary/20 bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="grid-pattern absolute inset-0 opacity-20 pointer-events-none"></div>
        <div className="p-4 pt-6 max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 border border-primary p-1.5 text-primary shadow-[0_0_8px_rgba(37,157,244,0.4)]">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-widest uppercase text-foreground">
                SKLBR Intelligence Feed
              </h1>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                Aggregating live metadata from{" "}
                <span className="text-primary">WSG</span> &{" "}
                <span className="text-primary">LinkedIn</span>
              </p>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex gap-4 w-full md:w-auto">
            {/* Toggle Switch */}
            <div className="flex h-10 w-full md:w-auto items-center justify-center rounded-none bg-muted/30 p-0.5 border border-primary/20">
              <label className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-none px-4 has-checked:bg-primary has-checked:text-background-dark text-muted-foreground text-[10px] font-bold transition-all uppercase tracking-wider">
                <span className="truncate">Target Roles</span>
                <input
                  defaultChecked
                  className="invisible w-0"
                  name="feed-type"
                  type="radio"
                  value="Target Roles"
                />
              </label>
              <label className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-none px-4 has-checked:bg-primary has-checked:text-background-dark text-muted-foreground text-[10px] font-bold transition-all uppercase tracking-wider">
                <span className="truncate">Upskilling Pathways</span>
                <input
                  className="invisible w-0"
                  name="feed-type"
                  type="radio"
                  value="Upskilling Pathways"
                />
              </label>
            </div>
            <button className="relative p-2 h-10 w-10 shrink-0 flex items-center justify-center rounded-none bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 size-2 bg-accent-coral rounded-full shadow-[0_0_5px_rgba(239,68,68,0.8)]"></span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 max-w-[1600px] mx-auto w-full relative">
        {/* Left Side: Job List */}
        <aside className="w-full md:w-[400px] lg:w-[450px] border-r border-primary/20 bg-card/50 flex flex-col shrink-0 relative">
          <div className="p-4 bg-card/80 backdrop-blur-md sticky top-0 z-20">
            {/* Neural Filters Hint */}
            <div className="flex items-center justify-between bg-muted/30 border border-primary/20 rounded-none p-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="text-primary w-4 h-4" />
                <span className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">
                  Filters Active
                </span>
              </div>
              <div className="flex gap-4">
                <div className="text-[10px] font-mono">
                  <span className="text-muted-foreground">MATCH:</span>{" "}
                  <span className="text-primary">&gt;70%</span>
                </div>
                <div className="text-[10px] font-mono">
                  <span className="text-muted-foreground">DIST:</span>{" "}
                  <span className="text-primary">5KM</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-hide pb-24 md:pb-4">
            {loading ? (
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-32 w-full bg-muted/30 border border-primary/20 rounded-none"
                  />
                ))}
              </div>
            ) : recs.length === 0 ? (
              <div className="h-[200px] flex flex-col items-center justify-center text-center text-muted-foreground">
                <Briefcase className="w-8 h-8 mb-4 opacity-50" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
                  [ No Matches Found ]
                </p>
              </div>
            ) : (
              recs.map((rec) => {
                const score = Math.round(rec.match_score * 100);
                const isSelected = selected?.role_id === rec.role_id;

                return (
                  <button
                    key={rec.role_id}
                    onClick={() => {
                      setSelected(rec);
                    }}
                    className={cn(
                      "relative bg-card border-l-4 text-left border border-border/30 rounded-none overflow-hidden group transition-all",
                      isSelected
                        ? "border-l-primary shadow-[inset_0_0_10px_rgba(37,157,244,0.1)]"
                        : "border-l-primary/40 hover:border-l-primary/80",
                    )}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3 border-b border-transparent">
                        <div>
                          <h3 className="text-[15px] font-bold text-foreground leading-tight border-none outline-none uppercase tracking-wider">
                            {rec.title}
                          </h3>
                          <p className="text-[10px] text-muted-foreground font-mono mt-1 w-[180px] wrap-break-word truncate">
                            SkillBridge Singapore • Mapletree{" "}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <div
                            className={cn(
                              "font-mono text-[9px] font-bold tracking-wider",
                              isSelected ? "text-primary" : "text-primary/60",
                            )}
                          >
                            MATCH_STRENGTH
                          </div>
                          <button
                            onClick={() => setShowScoreBreakdown(true)}
                            className={cn(
                              "font-mono text-lg font-bold transition-all hover:scale-110 cursor-pointer",
                              isSelected
                                ? "text-primary drop-shadow-[0_0_8px_rgba(37,157,244,0.4)]"
                                : "text-primary/60 hover:text-primary",
                            )}
                          >
                            {score}%
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {rec.matched_skills.slice(0, 3).map((skill, i) => (
                          <span
                            key={i}
                            className={cn(
                              "px-2 py-0.5 text-[9px] font-mono rounded-none uppercase line-clamp-1 break-all whitespace-nowrap",
                              isSelected
                                ? "bg-primary/10 border border-primary/20 text-primary"
                                : "bg-muted/30 border border-border/30 text-muted-foreground",
                            )}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between border-t border-border/30 pt-3">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-mono text-muted-foreground uppercase">
                            Est. Salary
                          </span>
                          <span className="text-accent-coral font-mono font-bold text-[10px]">
                            {rec.salary_range || "S$1,200/mo+"}
                          </span>
                        </div>
                        {isSelected ? (
                          <span className="bg-primary text-background-dark px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
                            Execute
                          </span>
                        ) : (
                          <span className="border border-primary/50 text-primary/80 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest whitespace-nowrap group-hover:bg-primary/10 group-hover:border-primary group-hover:text-primary transition-all">
                            Inspect
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}

            {/* Course Recommendation Card */}
            {!loading && (
              <div className="relative bg-card border border-accent-coral/30 rounded-xl overflow-hidden mt-2">
                <div className="absolute top-0 right-0 p-2">
                  <AlertCircle className="text-accent-coral animate-pulse w-5 h-5" />
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-mono bg-accent-coral/20 text-accent-coral px-2 py-0.5 rounded uppercase">
                      Critical Gap Detected
                    </span>
                  </div>
                  <h3 className="text-[15px] font-bold text-foreground leading-tight mb-1">
                    Architecting AI Workflows on AWS
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-mono mb-4">
                    National University of Singapore (NUS)
                  </p>

                  <div className="flex gap-2 mb-4">
                    <div className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded border border-border/30">
                      <BadgeCheck className="text-primary text-[12px] w-3 h-3" />
                      <span className="text-[8px] font-mono text-foreground uppercase">
                        SCTP Subsidy
                      </span>
                    </div>
                    <div className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded border border-border/30">
                      <Banknote className="text-primary text-[12px] w-3 h-3" />
                      <span className="text-[8px] font-mono text-foreground uppercase">
                        WSS Eligible
                      </span>
                    </div>
                  </div>

                  <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                    <div className="flex justify-between items-center text-[9px] font-mono text-primary uppercase mb-1">
                      <span>Pathway Relevance</span>
                      <span>98%</span>
                    </div>
                    <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                      <div className="bg-primary h-full w-[98%] shadow-[0_0_8px_#259df4]"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right Side: Detail View Desktop Only */}
        <main className="hidden md:flex flex-1 overflow-y-auto p-8 lg:p-12 relative shadow-[inset_0_0_50px_rgba(0,0,0,0.2)] scrollbar-hide">
          <AnimatePresence mode="wait">
            {!selected ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-center opacity-40">
                <Search className="w-16 h-16 mb-4 text-muted-foreground" />
                <p className="font-mono text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground">
                  [ Select Target Node For Full Intel ]
                </p>
              </div>
            ) : (
              <motion.div
                key={selected.role_id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-4xl mx-auto space-y-8"
              >
                {/* Detail Header */}
                <div className="bg-card border border-border/30 p-8 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-1 border-b border-l border-primary/20 bg-primary/5">
                    <span className="text-[8px] font-mono text-primary tracking-widest uppercase font-bold">
                      NODE_DETAIL
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    <Badge className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-none font-mono text-[9px] px-2 py-0.5 uppercase tracking-widest">
                      {selected.category || "Engineering"}
                    </Badge>
                    <span className="font-mono text-[10px] uppercase font-bold text-muted-foreground">
                      Ref No. {selected.role_id * 739}
                    </span>
                  </div>

                  <h2 className="text-3xl lg:text-4xl font-bold uppercase tracking-tight text-foreground mb-6 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                    {selected.title}
                  </h2>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 border border-border/30 rounded-lg">
                    <div className="space-y-1">
                      <span className="font-mono text-[8px] uppercase font-bold text-muted-foreground tracking-widest">
                        Employer
                      </span>
                      <span className="font-bold text-xs uppercase block truncate text-foreground">
                        Global Tech
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="font-mono text-[8px] uppercase font-bold text-muted-foreground tracking-widest">
                        Location
                      </span>
                      <span className="font-bold text-xs uppercase block truncate text-foreground">
                        Remote
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="font-mono text-[8px] uppercase font-bold text-muted-foreground tracking-widest">
                        Est. Salary
                      </span>
                      <span className="font-bold text-[11px] font-mono text-primary tracking-wider block truncate text-primary">
                        {selected.salary_range || "S$ 120k - 180k"}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="font-mono text-[8px] uppercase font-bold text-muted-foreground tracking-widest">
                        Focus
                      </span>
                      <span className="font-bold text-[11px] font-mono text-foreground block truncate uppercase">
                        AI Eng
                      </span>
                    </div>
                  </div>
                </div>

                {/* Analytical Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  {/* Insights Column */}
                  <div className="xl:col-span-2 space-y-8">
                    {/* Match Analysis */}
                    <section className="bg-card border border-border/30 p-6 rounded-xl">
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/30">
                        <Cpu className="text-primary w-4 h-4" />
                        <h3 className="font-mono font-bold uppercase tracking-widest text-[11px] text-foreground">
                          AI Match Analysis
                        </h3>
                      </div>

                      <div className="p-3 bg-muted/30 border-l-2 border-primary/50 mb-6 rounded-r-lg">
                        <p className="font-mono text-[11px] leading-relaxed text-foreground uppercase tracking-wide">
                          &gt; {selected.rationale}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                        <div className="space-y-4">
                          <h4 className="font-mono text-[8px] uppercase font-bold text-muted-foreground tracking-widest mb-2">
                            Alignment Telemetry
                          </h4>

                          <div className="space-y-1 w-full">
                            <div className="flex justify-between font-mono text-[9px] font-bold text-foreground uppercase">
                              <span>Core Vector</span>{" "}
                              <span>
                                {Math.round(selected.content_score * 100)}%
                              </span>
                            </div>
                            <div className="h-1 bg-muted rounded-full overflow-hidden absolute w-full max-w-[150px]">
                              <div
                                className="h-full bg-primary"
                                style={{
                                  width: `${selected.content_score * 100}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                          <br />
                          <div className="space-y-1 w-full mt-2">
                            <div className="flex justify-between font-mono text-[9px] font-bold text-foreground uppercase">
                              <span>Experience Baseline</span>{" "}
                              <span>
                                {Math.round(selected.rule_score * 100)}%
                              </span>
                            </div>
                            <div className="h-1 bg-muted rounded-full overflow-hidden absolute w-full max-w-[150px]">
                              <div
                                className="h-full bg-accent-coral"
                                style={{
                                  width: `${selected.rule_score * 100}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                          <br />
                          <div className="space-y-1 w-full mt-2">
                            <div className="flex justify-between font-mono text-[9px] font-bold text-foreground uppercase">
                              <span>Market Impact</span> <span>85%</span>
                            </div>
                            <div className="h-1 bg-muted rounded-full overflow-hidden absolute w-full max-w-[150px]">
                              <div
                                className="h-full bg-slate-400"
                                style={{ width: `85%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-center justify-center opacity-50 p-4 border border-dashed border-border/30 rounded-lg">
                          <Activity className="text-primary w-8 h-8 mb-2" />
                          <p className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground text-center font-bold">
                            Radar Vector Graph
                            <br />
                            Processing...
                          </p>
                        </div>
                      </div>
                    </section>

                    {/* Competency Overlap */}
                    <section className="bg-card border border-border/30 p-6 rounded-xl">
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/30">
                        <Target className="text-accent-coral w-4 h-4" />
                        <h3 className="font-mono font-bold uppercase tracking-widest text-[11px] text-foreground">
                          Competency Overlap
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-muted/30 p-4 border border-primary/20 rounded-lg">
                          <p className="font-mono text-[9px] uppercase font-bold text-primary mb-3 tracking-widest flex items-center gap-2 pb-2 border-b border-primary/10">
                            <CheckCircle2 className="w-4 h-4" /> Verified
                            Tensors
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {selected.matched_skills.map((skill) => (
                              <span
                                key={skill}
                                className="px-2 py-0.5 bg-primary/10 text-primary font-mono text-[9px] uppercase font-bold border border-primary/20 rounded wrap-break-word whitespace-nowrap line-clamp-1 truncate max-w-[140px] block"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="bg-muted/30 p-4 border border-accent-coral/20 rounded-lg">
                          <p className="font-mono text-[9px] uppercase font-bold text-accent-coral mb-3 tracking-widest flex items-center gap-2 pb-2 border-b border-accent-coral/10">
                            <XCircle className="w-4 h-4" /> Required Upgrades
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {selected.missing_skills.map((skill) => (
                              <span
                                key={skill}
                                className="px-2 py-0.5 bg-accent-coral/10 text-accent-coral font-mono text-[9px] uppercase font-bold border border-accent-coral/20 rounded wrap-break-word whitespace-nowrap line-clamp-1 truncate max-w-[140px] block"
                              >
                                {skill}
                              </span>
                            ))}
                            {selected.missing_skills.length === 0 && (
                              <span className="text-[9px] font-mono tracking-widest uppercase text-muted-foreground">
                                [ No Upgrades Needed ]
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* Action Column */}
                  <aside className="space-y-6">
                    <div className="p-6 bg-card border border-primary/30 rounded-xl relative overflow-hidden shadow-[0_0_15px_rgba(37,157,244,0.1)]">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[30px] pointer-events-none" />
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-primary/10">
                        <Sparkles className="text-primary w-4 h-4 shadow-[0_0_8px_rgba(37,157,244,0.8)]" />
                        <h3 className="font-mono font-bold uppercase tracking-widest text-[10px] text-primary">
                          AI Executive Brief
                        </h3>
                      </div>

                      <div className="relative z-10">
                        <p className="font-mono text-[9px] uppercase tracking-widest leading-relaxed text-muted-foreground mb-6 border-l border-border/50 pl-3">
                          &gt; Request focused AI debrief.
                          <br />
                          &gt; Synthesize match parameters.
                        </p>
                        <Button
                          onClick={() =>
                            openModal("aiExecutiveBrief", selected)
                          }
                          className="w-full bg-primary/10 border border-primary text-primary hover:bg-primary hover:text-background-dark rounded-none font-mono font-bold uppercase text-[9px] tracking-widest h-10 transition-all shadow-[0_0_10px_rgba(37,157,244,0.1)]"
                        >
                          Synthesize Intel
                        </Button>
                      </div>
                    </div>

                    <div className="p-6 bg-card border border-border/30 rounded-xl">
                      <h4 className="font-mono font-bold uppercase text-[10px] tracking-widest text-foreground mb-3 pb-2 border-b border-border/30">
                        Deployment Operations
                      </h4>
                      <div className="space-y-3">
                        <Button
                          onClick={() =>
                            openModal("matchIntelligence", selected)
                          }
                          className="w-full bg-primary text-background-dark hover:bg-primary/80 rounded-lg font-display font-bold uppercase text-[10px] tracking-widest h-10 transition-all flex items-center justify-center gap-2"
                        >
                          <Zap className="w-4 h-4" /> ANALYZE MATCH
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => openModal("jdMatch")}
                          className="w-full border-border/50 text-foreground hover:border-border hover:bg-muted/30 hover:text-foreground rounded-lg font-display font-bold uppercase text-[10px] tracking-widest h-10 transition-all flex items-center justify-center gap-2 bg-transparent"
                        >
                          JOB MATCH <ArrowUpRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </aside>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Navigation Bar */}
      <nav className="md:hidden sticky bottom-0 bg-card/95 backdrop-blur-xl border-t border-primary/20 px-4 pb-6 pt-2 z-50">
        <div className="flex justify-around items-end max-w-md mx-auto">
          <Link
            href="/"
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
          >
            <TerminalSquare className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Feed
            </span>
          </Link>
          <Link
            href="/skill-gap"
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
          >
            <Database className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Assets
            </span>
          </Link>
          <Link
            href="/jd-match"
            className="flex flex-col items-center gap-1 text-primary group"
          >
            <Network className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Network
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
          >
            <Rocket className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Deploy
            </span>
          </Link>
        </div>
      </nav>

      {/* Score Breakdown Modal */}
      {selected && (
        <ScoreBreakdownModal
          isOpen={showScoreBreakdown}
          onClose={() => setShowScoreBreakdown(false)}
          recommendation={selected}
        />
      )}
    </div>
  );
}
