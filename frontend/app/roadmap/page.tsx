"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Download,
  Cpu,
  TrendingUp,
  Users,
  Award,
  ShieldCheck,
  Info,
  Zap,
} from "lucide-react";
import api from "@/lib/api-client";
import type { RoadmapData, DashboardSummary } from "@/types/api";

export default function Roadmap() {
  const profileId =
    typeof window !== "undefined" ? localStorage.getItem("profileId") : null;

  const { data: roadmapData, isLoading: loadingRoadmap } = useQuery({
    queryKey: ["roadmap", profileId],
    queryFn: async () => {
      const res = await api.get(`/api/upskilling/${profileId}`);
      return res.data as RoadmapData;
    },
    enabled: !!profileId,
  });

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const res = await api.get("/api/dashboard/summary");
      return res.data as DashboardSummary;
    },
  });

  const loading = loadingRoadmap || loadingSummary;
  const score = summary ? Math.round(summary.career_readiness) : 0;

  const downloadPdf = () => {
    const base = api.defaults.baseURL || window.location.origin;
    window.open(`${base}/api/export/roadmap/${profileId}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh] bg-background-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <div className="text-primary font-mono font-bold uppercase tracking-widest drop-shadow-[0_0_8px_rgba(37,157,244,0.8)] text-xs animate-pulse">
            Generating Intelligence Dossier...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden h-screen -m-12 font-mono text-slate-100 bg-background-dark">
      <main className="flex-1 bg-background-dark flex flex-col overflow-hidden relative">
        <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none"></div>
        <div className="h-20 bg-background-dark border-b border-primary/20 flex items-center justify-between px-8 shrink-0 relative z-10">
          <div className="absolute top-0 bottom-0 left-0 w-1 bg-primary/40"></div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono text-primary/60 uppercase tracking-widest">
                Projected_Career_Path_v4
              </span>
              <span className="px-2 py-0.5 rounded-none bg-primary/10 border border-primary/30 text-primary text-[9px] font-bold uppercase tracking-widest shadow-[0_0_8px_rgba(37,157,244,0.2)]">
                Optimized
              </span>
            </div>
            <h1 className="text-lg font-bold text-white tracking-widest uppercase drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
              {summary?.name ? `${summary.name} - ` : ""} Strategic Upskilling
              Roadmap
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">
                Confidence Score
              </span>
              <span className="text-lg font-mono font-bold text-primary drop-shadow-[0_0_5px_rgba(37,157,244,0.5)]">
                {score}%
              </span>
            </div>
            <div className="h-10 w-px bg-primary/20 mx-2"></div>
            <button
              onClick={downloadPdf}
              className="flex items-center justify-center h-10 px-4 bg-background-dark border border-primary/50 text-primary text-xs font-bold uppercase tracking-widest rounded-none hover:bg-primary/10 hover:shadow-[0_0_10px_rgba(37,157,244,0.3)] transition-all"
            >
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </button>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden flex flex-col data-grid border-l border-primary/20 bg-background-dark/50 z-10">
          {/* Timeline Rulers */}
          <div className="h-10 border-b border-primary/20 bg-background-dark/90 backdrop-blur flex shrink-0 sticky top-0 z-20">
            <div className="w-48 shrink-0 border-r border-primary/20 bg-background-dark/50 flex items-center justify-center text-[10px] font-bold text-primary/60 uppercase tracking-widest">
              Track Layer
            </div>
            <div className="flex-1 flex timeline-line overflow-x-auto">
              <div className="min-w-[50px] shrink-0 flex items-center justify-center text-[9px] font-mono text-slate-500 border-r border-primary/10">
                Q3 24
              </div>
              <div className="min-w-[150px] shrink-0 flex items-center justify-center text-[9px] font-mono text-slate-500 border-r border-primary/10">
                AUG
              </div>
              <div className="min-w-[150px] shrink-0 flex items-center justify-center text-[9px] font-mono text-slate-500 border-r border-primary/10">
                SEP
              </div>
              <div className="min-w-[150px] shrink-0 flex items-center justify-center text-[9px] font-mono text-primary border-r border-primary/20 font-bold bg-primary/5 shadow-[inset_0_0_10px_rgba(37,157,244,0.1)]">
                OCT
              </div>
              <div className="min-w-[150px] shrink-0 flex items-center justify-center text-[9px] font-mono text-slate-500 border-r border-primary/10">
                NOV
              </div>
              <div className="min-w-[150px] shrink-0 flex items-center justify-center text-[9px] font-mono text-slate-500 border-r border-primary/10">
                DEC
              </div>
              <div className="min-w-[50px] shrink-0 flex items-center justify-center text-[9px] font-mono text-slate-500 border-r border-primary/10">
                Q1 25
              </div>
              <div className="min-w-[150px] shrink-0 flex items-center justify-center text-[9px] font-mono text-slate-500 border-r border-primary/10">
                JAN
              </div>
              <div className="min-w-[150px] shrink-0 flex items-center justify-center text-[9px] font-mono text-slate-500 border-r border-primary/10">
                FEB
              </div>
              <div className="min-w-[150px] shrink-0 flex items-center justify-center text-[9px] font-mono text-slate-500 border-r border-primary/10">
                MAR
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto z-10">
            {/* Core Technical Layer */}
            <div className="flex border-b border-primary/10 min-h-[120px] group transition-colors hover:bg-primary/5 relative">
              <div className="w-48 shrink-0 border-r border-primary/20 bg-background-dark/30 p-4 relative">
                <div className="absolute top-0 right-0 w-px h-full bg-linear-to-b from-transparent via-primary/20 to-transparent"></div>
                <h4 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-primary" />
                  Core Technical
                </h4>
                <p className="text-[9px] text-slate-500 font-mono mt-2 tracking-widest">
                  High Density Knowledge
                </p>
              </div>
              <div className="flex-1 relative timeline-line flex items-center px-[50px]">
                {roadmapData?.roadmap?.map((item, i) => (
                  <div
                    key={i}
                    className="absolute w-64 h-14 bg-background-dark border border-primary/50 rounded-none shadow-[0_0_10px_rgba(37,157,244,0.1)] flex items-center px-3 z-10 cursor-pointer hover:scale-105 hover:shadow-[0_0_15px_rgba(37,157,244,0.3)] hover:border-primary transition-all group/item"
                    style={{ left: `${120 + i * 320}px` }}
                  >
                    <div className="w-1.5 h-full bg-primary absolute left-0 top-0 opacity-80 group-hover/item:opacity-100"></div>
                    <div className="flex-1 overflow-hidden pl-2 pr-2">
                      <p className="text-[10px] font-bold text-white uppercase tracking-wider truncate drop-shadow-[0_0_2px_rgba(255,255,255,0.3)]">
                        {item.course_title}
                      </p>
                      <p className="text-[9px] text-primary/70 font-mono mt-1 tracking-widest">
                        {item.duration_weeks} Weeks
                      </p>
                    </div>
                    {i === 0 && (
                      <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0 animate-pulse" />
                    )}
                  </div>
                ))}
                {(!roadmapData?.roadmap ||
                  roadmapData.roadmap.length === 0) && (
                  <p className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
                    No courses in roadmap.
                  </p>
                )}
              </div>
            </div>

            {/* Soft Skills Layer */}
            <div className="flex border-b border-primary/10 min-h-[100px] group transition-colors hover:bg-primary/5 relative">
              <div className="w-48 shrink-0 border-r border-primary/20 bg-background-dark/30 p-4 relative">
                <div className="absolute top-0 right-0 w-px h-full bg-linear-to-b from-transparent via-primary/20 to-transparent"></div>
                <h4 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  Soft Skills / Lead
                </h4>
                <p className="text-[9px] text-slate-500 font-mono mt-2 tracking-widest">
                  Professional Development
                </p>
              </div>
              <div className="flex-1 relative timeline-line flex items-center">
                <div className="absolute left-[400px] w-48 h-10 bg-background-dark border border-indigo-500/30 rounded-none shadow-[0_0_10px_rgba(99,102,241,0.1)] flex items-center px-3 z-10 cursor-pointer hover:border-indigo-400 transition-colors group/skill">
                  <div className="w-1 h-full bg-indigo-500 absolute left-0 top-0 opacity-80 group-hover/skill:opacity-100 shadow-[0_0_5px_rgba(99,102,241,0.5)]"></div>
                  <div className="flex-1 pl-1">
                    <p className="text-[10px] font-bold text-white uppercase tracking-wider truncate">
                      Stakeholder Mgmt for AI
                    </p>
                    <p className="text-[9px] text-indigo-400/80 font-mono mt-0.5 tracking-widest">
                      NOV 10 - DEC 05
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Certifications Layer */}
            <div className="flex border-b border-primary/10 min-h-[100px] group transition-colors hover:bg-primary/5 relative">
              <div className="w-48 shrink-0 border-r border-primary/20 bg-background-dark/30 p-4 relative">
                <div className="absolute top-0 right-0 w-px h-full bg-linear-to-b from-transparent via-primary/20 to-transparent"></div>
                <h4 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  Certifications
                </h4>
                <p className="text-[9px] text-slate-500 font-mono mt-2 tracking-widest">
                  CITREP+ / IBF Subsidy
                </p>
              </div>
              <div className="flex-1 relative timeline-line flex items-center">
                <div className="absolute left-[800px] w-64 h-14 bg-background-dark border border-amber-500/30 rounded-none shadow-[0_0_15px_rgba(245,158,11,0.1)] flex items-center px-3 z-10 cursor-pointer hover:border-amber-400 transition-colors">
                  <div className="absolute -top-px -left-px w-2 h-2 border-t border-l border-amber-500"></div>
                  <div className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-amber-500"></div>
                  <div className="h-8 w-8 bg-amber-500/10 border border-amber-500/30 rounded-none flex items-center justify-center shrink-0 mr-3">
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-white uppercase tracking-wider truncate">
                      CITREP+ Professional
                    </p>
                    <p className="text-[9px] text-amber-500/80 font-mono tracking-widest mt-0.5">
                      MARCH 2025 COMPLETION
                    </p>
                    <div className="mt-1.5 h-px w-full bg-amber-500/20 overflow-hidden relative">
                      <div className="absolute top-0 left-0 h-full bg-amber-500 w-[15%] shadow-[0_0_5px_rgba(245,158,11,0.8)]"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <aside className="w-80 border-l border-primary/20 bg-background-dark/80 backdrop-blur-md flex flex-col shrink-0 relative z-10">
        <div className="absolute top-0 right-0 w-full h-1 bg-primary/20"></div>
        <div className="p-6 border-b border-primary/20 bg-background-dark/50">
          <span className="text-[9px] font-bold text-primary/60 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1 h-1 bg-primary/60 rounded-full"></span>
            Selected Component
          </span>
          <h3 className="text-sm font-bold text-white mt-2 uppercase tracking-wide">
            {roadmapData?.roadmap?.[0]?.course_title ||
              "Advanced Architectures"}
          </h3>
          <p className="text-[10px] text-slate-400 font-mono tracking-wider mt-3 leading-relaxed">
            Optimization of models and frameworks for enterprise deployment.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4 border-b border-primary/10 pb-2">
              <h5 className="text-[10px] font-bold text-primary uppercase tracking-widest">
                ROI Analysis
              </h5>
              <Info className="w-3.5 h-3.5 text-primary/50" />
            </div>
            <div className="border border-primary/20 bg-primary/5 p-4 text-white relative">
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/50"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary/50"></div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-400 font-mono uppercase tracking-widest">
                  Est. Salary Lift
                </span>
                <span className="text-[10px] font-mono font-bold text-[#259df4] drop-shadow-[0_0_3px_rgba(37,157,244,0.5)]">
                  +SGD 2,400 / mo
                </span>
              </div>
              <div className="mt-3 text-2xl font-bold font-mono leading-none tracking-widest">
                S$ 114,000{" "}
                <span className="text-[9px] text-slate-500 tracking-wider">
                  Base Ann.
                </span>
              </div>
              <div className="mt-4 h-px w-full bg-primary/20 relative">
                <div className="absolute top-0 left-0 h-full bg-primary w-[75%] shadow-[0_0_5px_rgba(37,157,244,0.8)]"></div>
              </div>
              <p className="text-[9px] text-slate-500 font-mono tracking-widest mt-3">
                &gt; Based on SG tech market data Q2 2024
              </p>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4 border-b border-primary/10 pb-2">
              <h5 className="text-[10px] font-bold text-primary uppercase tracking-widest">
                Subsidy Utilization
              </h5>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col gap-1 border-l-2 border-primary pl-3 py-1">
                <span className="text-[9px] text-slate-400 font-mono uppercase tracking-widest">
                  SkillsFuture Credit
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-[13px] font-bold font-mono text-white tracking-widest">
                    S$ 450.00
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">
                    / 500.00 Credit
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1 border-l-2 border-amber-500 pl-3 py-1">
                <span className="text-[9px] text-slate-400 font-mono uppercase tracking-widest">
                  IBF Subsidy
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-[13px] font-bold font-mono text-white tracking-widest">
                    S$ 3,200.00
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-500 font-bold uppercase tracking-widest shadow-[0_0_5px_rgba(245,158,11,0.2)]">
                    Eligible
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-primary/20 bg-background-dark">
          <button className="w-full bg-primary/10 border border-primary text-primary text-[10px] font-bold uppercase tracking-widest py-3 hover:bg-primary/20 hover:shadow-[0_0_15px_rgba(37,157,244,0.3)] transition-all flex items-center justify-center gap-2 group">
            Generate Execution Plan
            <Zap className="w-3.5 h-3.5 group-hover:drop-shadow-[0_0_5px_rgba(37,157,244,0.8)]" />
          </button>
        </div>
      </aside>
    </div>
  );
}
