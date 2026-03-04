"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  BrainCircuit,
  Database,
  Briefcase,
  ChevronRight,
  Share2,
  Waves,
  ArrowUp,
  ArrowDown,
  Users,
  GraduationCap,
  Plus,
  Minus,
  Layers,
  FlaskConical,
  Trophy,
  Scale,
} from "lucide-react";
import api from "@/lib/api-client";

const satelliteCoords = [
  { cx: "40%", cy: "30%" },
  { cx: "60%", cy: "40%" },
  { cx: "35%", cy: "65%" },
  { cx: "65%", cy: "70%" },
];

export default function Dashboard() {
  const router = useRouter();

  if (typeof window !== "undefined" && !localStorage.getItem("token")) {
    router.push("/login");
  }

  const { data: summary } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const res = await api.get("/api/dashboard/summary");
      if (res.data?.profile_id) {
        localStorage.setItem("profileId", String(res.data.profile_id));
      }
      return res.data;
    },
  });

  const { data: topRec } = useQuery({
    queryKey: ["dashboard-recommendations", summary?.profile_id],
    enabled: !!summary?.profile_id,
    queryFn: async () => {
      const res = await api.post("/api/recommend", {
        profile_id: summary.profile_id,
      });
      const recs = res.data?.recommendations || [];
      return recs.length > 0 ? recs[0] : null;
    },
  });

  const skillsToShow: string[] = topRec?.matched_skills?.slice(0, 4) || [
    "Python",
    "PyTorch",
    "MLOps",
    "SQL",
  ];
  const topRoleTitle: string = topRec?.title || "Senior Data Scientist";

  return (
    <div className="flex flex-1 overflow-hidden h-screen -m-12 bg-background-dark font-display text-slate-100 p-6 pt-16">
      <main className="flex-1 flex flex-col overflow-hidden text-slate-100">
        <div className="bg-background-dark border-b border-primary/20 p-4 flex items-center justify-between pb-6">
          <div>
            <div className="flex items-center gap-2 text-[10px] text-primary/60 mb-1 font-mono uppercase tracking-widest">
              <span>Projects</span> <ChevronRight className="w-3.5 h-3.5" />
              <span>Singapore</span> <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-primary">Executive Summary</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white drop-shadow-[0_0_8px_rgba(37,157,244,0.6)]">
              Singapore Tech Ecosystem Insight
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-background-dark/50 border border-primary/30 p-0.5 relative z-10">
              <button className="px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest bg-primary/20 text-primary border border-primary/50 shadow-[0_0_10px_rgba(37,157,244,0.2)]">
                Grid View
              </button>
              <button className="px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">
                Flow View
              </button>
            </div>
            <button className="px-4 py-1.5 border border-primary/30 text-[10px] font-mono font-bold uppercase tracking-widest bg-background-dark text-primary flex items-center gap-2 hover:bg-primary/10 transition-colors">
              <Share2 className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto pt-6 space-y-4 data-grid cyber-grid pr-4"
          style={
            { "--grid-color": "rgba(37,157,244,0.05)" } as React.CSSProperties
          }
        >
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-background-dark/60 border border-primary/30 p-4 hover:border-primary hover:shadow-[0_0_15px_rgba(37,157,244,0.3)] transition-all relative group backdrop-blur-sm">
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/50 group-hover:border-primary transition-colors"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/50 group-hover:border-primary transition-colors"></div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono font-bold text-primary/70 uppercase tracking-widest">
                  Market Liquidity
                </span>
                <Waves className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-mono font-bold text-white drop-shadow-[0_0_8px_rgba(37,157,244,0.6)]">
                  84.2
                </span>
                <span className="text-[10px] text-primary font-bold bg-primary/10 px-1 border border-primary/20 flex items-center gap-1 font-mono">
                  <ArrowUp className="w-3 h-3" />
                  2.4%
                </span>
              </div>
              <div className="w-full bg-background-dark/80 h-1 mt-4 overflow-hidden border border-primary/20">
                <div className="bg-primary h-full w-[84%] shadow-[0_0_8px_rgba(37,157,244,0.8)]"></div>
              </div>
            </div>

            <div className="bg-background-dark/60 border border-primary/30 p-4 hover:border-primary hover:shadow-[0_0_15px_rgba(37,157,244,0.3)] transition-all relative group backdrop-blur-sm">
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/50 group-hover:border-primary transition-colors"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/50 group-hover:border-primary transition-colors"></div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono font-bold text-primary/70 uppercase tracking-widest">
                  Skill Demand Index
                </span>
                <TrendingUp className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-mono font-bold text-white drop-shadow-[0_0_8px_rgba(37,157,244,0.6)]">
                  128.5
                </span>
                <span className="text-[10px] text-accent-coral font-bold bg-accent-coral/10 px-1 border border-accent-coral/20 flex items-center gap-1 font-mono animate-pulse">
                  <ArrowDown className="w-3 h-3" />
                  1.2%
                </span>
              </div>
              <div className="w-full bg-background-dark/80 h-1 mt-4 overflow-hidden border border-primary/20">
                <div className="bg-accent-coral h-full w-[65%] shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
              </div>
            </div>

            <div className="bg-background-dark/60 border border-primary/30 p-4 hover:border-primary hover:shadow-[0_0_15px_rgba(37,157,244,0.3)] transition-all relative group backdrop-blur-sm">
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/50 group-hover:border-primary transition-colors"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/50 group-hover:border-primary transition-colors"></div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono font-bold text-primary/70 uppercase tracking-widest">
                  Total Talent Pool
                </span>
                <Users className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-mono font-bold text-white drop-shadow-[0_0_8px_rgba(37,157,244,0.6)]">
                  42,400
                </span>
                <span className="text-[10px] text-primary font-bold bg-primary/10 px-1 border border-primary/20 flex items-center gap-1 font-mono">
                  <ArrowUp className="w-3 h-3" />
                  5.8%
                </span>
              </div>
              <div className="flex gap-1 mt-4">
                <div className="w-1/4 h-1 bg-primary shadow-[0_0_8px_rgba(37,157,244,0.8)]"></div>
                <div className="w-1/4 h-1 bg-primary shadow-[0_0_8px_rgba(37,157,244,0.8)]"></div>
                <div className="w-1/4 h-1 bg-primary/20"></div>
                <div className="w-1/4 h-1 bg-primary/10"></div>
              </div>
            </div>

            <div className="bg-background-dark/60 border border-primary/30 p-4 hover:border-primary hover:shadow-[0_0_15px_rgba(37,157,244,0.3)] transition-all relative group backdrop-blur-sm">
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/50 group-hover:border-primary transition-colors"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/50 group-hover:border-primary transition-colors"></div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono font-bold text-primary/70 uppercase tracking-widest">
                  Avg. Upskilling Rate
                </span>
                <GraduationCap className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-mono font-bold text-white drop-shadow-[0_0_8px_rgba(37,157,244,0.6)]">
                  14.7%
                </span>
                <span className="text-[10px] text-slate-400 font-bold bg-slate-800/50 px-1 border border-slate-700 flex items-center font-mono">
                  STABLE
                </span>
              </div>
              <div className="w-full bg-background-dark/80 h-1 mt-4 overflow-hidden border border-primary/20">
                <div className="bg-slate-400 h-full w-[14%]"></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 h-[400px]">
            <div className="col-span-2 bg-background-dark/60 backdrop-blur-sm border border-primary/30 flex flex-col overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/50 group-hover:border-primary transition-colors z-10"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/50 group-hover:border-primary transition-colors z-10"></div>
              <div className="p-4 border-b border-primary/20 flex items-center justify-between">
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
                  Talent Graph: Role-to-Skill Connectivity
                </h3>
              </div>
              <div className="flex-1 relative bg-background-dark overflow-hidden flex items-center justify-center">
                <svg className="w-full h-full opacity-60">
                  <pattern
                    height="40"
                    id="grid-pattern-graph"
                    patternUnits="userSpaceOnUse"
                    width="40"
                    x="0"
                    y="0"
                  >
                    <path
                      d="M 40 0 L 0 0 0 40"
                      fill="none"
                      stroke="rgba(37,157,244,0.05)"
                      strokeWidth="1"
                    />
                  </pattern>
                  <rect
                    fill="url(#grid-pattern-graph)"
                    height="100%"
                    width="100%"
                  ></rect>
                  <circle
                    cx="50%"
                    cy="50%"
                    fill="none"
                    r="80"
                    stroke="#259df4"
                    strokeDasharray="4"
                    strokeWidth="1"
                    opacity="0.5"
                  ></circle>
                  <circle
                    cx="50%"
                    cy="50%"
                    fill="none"
                    r="140"
                    stroke="#259df4"
                    strokeDasharray="8"
                    strokeWidth="0.5"
                    opacity="0.3"
                  ></circle>
                  <g className="nodes">
                    <circle
                      cx="50%"
                      cy="50%"
                      fill="#259df4"
                      r="6"
                      style={{
                        filter: "drop-shadow(0 0 8px rgba(37,157,244,0.8))",
                      }}
                    ></circle>
                    {skillsToShow.map((skill, index) => {
                      const coord =
                        satelliteCoords[index % satelliteCoords.length];
                      return (
                        <g key={`node-${index}`}>
                          <circle
                            cx={coord.cx}
                            cy={coord.cy}
                            fill="#259df4"
                            r="4"
                            opacity="0.8"
                          ></circle>
                          <line
                            stroke="#259df4"
                            strokeWidth="1"
                            x1="50%"
                            x2={coord.cx}
                            y1="50%"
                            y2={coord.cy}
                            opacity="0.6"
                          ></line>
                          <text
                            x={coord.cx}
                            y={coord.cy}
                            dy="-10"
                            dx={index % 2 === 0 ? "-20" : "10"}
                            fill="#259df4"
                            fontSize="8"
                            fontFamily="monospace"
                            className="uppercase tracking-widest opacity-80"
                          >
                            {skill}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                </svg>
                <div className="absolute inset-0 flex flex-col p-4 pointer-events-none">
                  <div className="mt-auto bg-background-dark/90 backdrop-blur-md border border-primary/40 p-3 w-max self-end pointer-events-auto relative max-w-[200px]">
                    <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-primary"></div>
                    <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-primary"></div>
                    <div className="text-[9px] font-mono font-bold text-primary/60 uppercase tracking-widest mb-2 border-b border-primary/20 pb-1">
                      SELECTED NODE
                    </div>
                    <div className="text-sm font-bold text-white drop-shadow-[0_0_8px_rgba(37,157,244,0.6)] truncate">
                      {topRoleTitle}
                    </div>
                    <div className="flex gap-2 mt-2 font-mono flex-wrap">
                      {skillsToShow.map((skill) => (
                        <span
                          key={skill}
                          className="text-[9px] px-1 bg-primary/20 text-primary border border-primary/30 uppercase tracking-widest whitespace-nowrap overflow-hidden text-ellipsis max-w-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="absolute top-4 left-4 flex flex-col gap-1 pointer-events-auto">
                  <div className="bg-background-dark/80 border border-primary/30 p-1 flex flex-col gap-1 backdrop-blur-sm">
                    <button className="w-6 h-6 flex items-center justify-center hover:bg-primary/20 text-primary transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                    <button className="w-6 h-6 flex items-center justify-center hover:bg-primary/20 text-primary transition-colors">
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                  <button className="bg-background-dark/80 backdrop-blur-sm border border-primary/30 w-8 h-8 mt-2 flex items-center justify-center hover:bg-primary/20 text-primary transition-colors">
                    <Layers className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-background-dark/60 backdrop-blur-sm border border-primary/30 flex flex-col overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/50 group-hover:border-primary transition-colors z-10"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/50 group-hover:border-primary transition-colors z-10"></div>
              <div className="p-4 border-b border-primary/20 flex items-center justify-between">
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
                  High-Demand Skills
                </h3>
                <span className="text-[10px] font-mono text-slate-custom-400">
                  N=2,482
                </span>
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-xs text-left text-slate-300 border-white/5">
                  <thead className="bg-background-dark/80 backdrop-blur-md sticky top-0 border-b border-primary/20 text-slate-400">
                    <tr>
                      <th className="px-3 py-2 font-bold uppercase text-[9px] tracking-widest">
                        Skill
                      </th>
                      <th className="px-3 py-2 font-bold uppercase text-[9px] text-right tracking-widest">
                        Trend
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <tr className="hover:bg-primary/5 cursor-pointer transition-colors">
                      <td className="px-3 py-2 font-medium">Generative AI</td>
                      <td className="px-3 py-2 text-right text-primary font-mono drop-shadow-[0_0_5px_rgba(37,157,244,0.5)]">
                        +142%
                      </td>
                    </tr>
                    <tr className="hover:bg-primary/5 cursor-pointer transition-colors">
                      <td className="px-3 py-2 font-medium">Cloud Security</td>
                      <td className="px-3 py-2 text-right text-primary font-mono drop-shadow-[0_0_5px_rgba(37,157,244,0.5)]">
                        +45%
                      </td>
                    </tr>
                    <tr className="hover:bg-primary/5 cursor-pointer transition-colors">
                      <td className="px-3 py-2 font-medium">
                        Rust Engineering
                      </td>
                      <td className="px-3 py-2 text-right text-primary font-mono drop-shadow-[0_0_5px_rgba(37,157,244,0.5)]">
                        +28%
                      </td>
                    </tr>
                    <tr className="hover:bg-primary/5 cursor-pointer transition-colors">
                      <td className="px-3 py-2 font-medium">
                        FinOps Analytics
                      </td>
                      <td className="px-3 py-2 text-right text-slate-400 font-mono">
                        +4%
                      </td>
                    </tr>
                    <tr className="hover:bg-primary/5 cursor-pointer transition-colors">
                      <td className="px-3 py-2 font-medium">Blockchain Hubs</td>
                      <td className="px-3 py-2 text-right text-accent-coral font-mono drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">
                        -12%
                      </td>
                    </tr>
                    <tr className="hover:bg-primary/5 cursor-pointer transition-colors">
                      <td className="px-3 py-2 font-medium">React Native</td>
                      <td className="px-3 py-2 text-right text-slate-400 font-mono">
                        --
                      </td>
                    </tr>
                    <tr className="hover:bg-primary/5 cursor-pointer transition-colors">
                      <td className="px-3 py-2 font-medium">MLOps Lifecycle</td>
                      <td className="px-3 py-2 text-right text-primary font-mono drop-shadow-[0_0_5px_rgba(37,157,244,0.5)]">
                        +62%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-primary/20 mt-4">
            <div className="bg-background-dark/60 backdrop-blur-sm border border-primary/30 flex flex-col min-h-[300px] relative group h-full">
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/50 group-hover:border-primary transition-colors z-10"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/50 group-hover:border-primary transition-colors z-10"></div>
              <div className="p-4 border-b border-primary/20 flex items-center justify-between">
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
                  Tech Density: Singapore Central
                </h3>
                <div className="flex gap-2">
                  <span className="text-[9px] font-mono bg-primary/10 border border-primary/30 px-2 py-1 uppercase tracking-widest text-primary">
                    Level: Planning Area
                  </span>
                </div>
              </div>
              <div className="flex-1 bg-background-dark flex items-center justify-center overflow-hidden relative group-hover:shadow-[inset_0_0_20px_rgba(37,157,244,0.1)] transition-all">
                <div
                  className="w-full h-full opacity-60 mix-blend-screen bg-cover bg-center"
                  style={{
                    backgroundImage:
                      "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBgfMMCj4mkpic7ODI3B7XK9lkBkX3bm7s1ZMn45z_0Wmww96cM1B2wA-EkNdKwmCrejq7T4V02MzHUkhy2CSuboRLVjguS5P-4naWUmXVxKzMh-vYJNENg3tf7fkdXC8etglTPhTDv3REcl8hluAfIGQVQuyVT90dBJZjrH8lvriEQaxGr-STlAU9WmFUmcgHpsmZHlYmXpEI9ms_rxdRMVIDLKse6V9__MNwEtZDsQjQ8vqrY_ibt8H9QO7Dn7MrZUQREQMhIIu4')",
                  }}
                />
                <div className="absolute inset-0 bg-primary/5 pointer-events-none mix-blend-overlay"></div>
                <div
                  className="absolute inset-0 pointer-events-none data-grid cyber-grid"
                  style={
                    {
                      "--grid-color": "rgba(37,157,244,0.1)",
                    } as React.CSSProperties
                  }
                ></div>
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-12 -translate-y-4 w-12 h-12 bg-primary/20 rounded-full border border-primary shadow-[0_0_15px_rgba(37,157,244,0.5)] animate-ping opacity-75"></div>
                  <div className="absolute top-1/3 left-1/4 w-8 h-8 bg-primary/30 rounded-full border border-primary shadow-[0_0_10px_rgba(37,157,244,0.8)]"></div>
                </div>
              </div>
            </div>

            <div className="bg-background-dark/80 backdrop-blur-md border border-primary/30 flex flex-col min-h-[300px] relative group h-full">
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/50 group-hover:border-primary transition-colors z-10"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/50 group-hover:border-primary transition-colors z-10"></div>
              <div className="p-4 border-b border-primary/20 flex items-center justify-between">
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
                  Live Ecosystem Signals
                </h3>
                <button className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary/70 hover:text-primary transition-colors">
                  [ View Logs ]
                </button>
              </div>
              <div className="flex-1 p-4 space-y-4 font-mono text-[10px] overflow-y-auto cyber-panel">
                <div className="flex gap-4 border-l border-primary/20 pl-3 relative">
                  <div className="absolute -left-[3px] top-1.5 w-1.5 h-1.5 bg-primary/50"></div>
                  <span className="text-primary/50 shrink-0 w-16">
                    14:22:01
                  </span>
                  <span className="text-slate-300 leading-relaxed uppercase tracking-wider">
                    <p className="text-secondary-foreground text-xs font-semibold leading-relaxed">
                      &quot;Design is not just what it looks like and feels
                      like. Design is how it works.&quot;
                    </p>
                  </span>
                </div>
                <div className="flex gap-4 border-l border-primary/20 pl-3 relative">
                  <div className="absolute -left-[3px] top-1.5 w-1.5 h-1.5 bg-primary/50"></div>
                  <span className="text-primary/50 shrink-0 w-16">
                    14:21:45
                  </span>
                  <span className="text-slate-300 leading-relaxed uppercase tracking-wider">
                    <span className="text-green-400 font-bold mr-2">
                      [Skillup]
                    </span>{" "}
                    +42 users in <span className="text-white">Jurong East</span>{" "}
                    certified in Kubernetes
                  </span>
                </div>
                <div className="flex gap-4 border-l border-accent-coral/20 pl-3 relative">
                  <div className="absolute -left-[3px] top-1.5 w-1.5 h-1.5 bg-accent-coral animate-pulse"></div>
                  <span className="text-accent-coral/50 shrink-0 w-16">
                    14:18:22
                  </span>
                  <span className="text-slate-300 leading-relaxed uppercase tracking-wider">
                    <span className="text-accent-coral font-bold mr-2">
                      [Alert]
                    </span>{" "}
                    AI/ML role liquidity decreased by 0.5% in Changi Hub
                  </span>
                </div>
                <div className="flex gap-4 border-l border-primary/20 pl-3 relative">
                  <div className="absolute -left-[3px] top-1.5 w-1.5 h-1.5 bg-primary/50"></div>
                  <span className="text-primary/50 shrink-0 w-16">
                    14:15:09
                  </span>
                  <span className="text-slate-300 leading-relaxed uppercase tracking-wider">
                    <span className="text-primary font-bold mr-2">
                      [Ontology]
                    </span>{" "}
                    New node relationship established:{" "}
                    <span className="text-white">DataEng -&gt; Snowflake</span>
                  </span>
                </div>
                <div className="flex gap-4 border-l border-primary/20 pl-3 relative mix-blend-luminosity opacity-70">
                  <div className="absolute -left-[3px] top-1.5 w-1.5 h-1.5 bg-slate-500"></div>
                  <span className="text-slate-500 shrink-0 w-16">14:12:44</span>
                  <span className="text-slate-400 leading-relaxed uppercase tracking-wider">
                    <span className="text-slate-500 font-bold mr-2">
                      [System]
                    </span>{" "}
                    Crawling local job portals (MyCareersFuture, LinkedIn)...
                  </span>
                </div>
                <div className="flex gap-4 border-l border-primary/20 pl-3 relative">
                  <div className="absolute -left-[3px] top-1.5 w-1.5 h-1.5 bg-primary/50"></div>
                  <span className="text-primary/50 shrink-0 w-16">
                    14:10:01
                  </span>
                  <span className="text-slate-300 leading-relaxed uppercase tracking-wider">
                    <span className="text-primary font-bold mr-2">
                      [Hiring]
                    </span>{" "}
                    Skillbridge SG opened fresh associate track (200 slots)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <aside className="w-80 border-l border-primary/20 bg-background-dark flex flex-col shrink-0 text-slate-100 overflow-y-auto h-full relative">
        <div className="absolute left-0 top-0 bottom-0 w-px bg-linear-to-b from-primary/0 via-primary/30 to-primary/0"></div>
        <div className="p-6 border-b border-primary/20">
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary/60 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-primary/40"></span> Object Details
          </h3>
          <div className="flex items-center gap-4 mb-8 p-3 bg-primary/5 border border-primary/20">
            <div className="w-12 h-12 bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0 text-primary drop-shadow-[0_0_8px_rgba(37,157,244,0.6)]">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Generative AI
              </h4>
              <p className="text-[9px] font-mono text-primary/60 uppercase tracking-widest mt-1">
                ID // SK-90210
              </p>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <label className="text-[9px] font-mono font-bold text-primary/60 uppercase tracking-widest block border-b border-primary/10 pb-1">
                Growth Velocity
              </label>
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm font-mono font-bold text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
                  9.2 / 10.0
                </span>
                <span className="text-[9px] font-mono font-bold text-primary bg-primary/10 border border-primary/30 px-2 py-0.5 uppercase tracking-widest">
                  Exponential
                </span>
              </div>
            </div>
            <div>
              <label className="text-[9px] font-mono font-bold text-primary/60 uppercase tracking-widest block border-b border-primary/10 pb-1">
                Core Ecosystems
              </label>
              <div className="flex flex-col gap-2 mt-3 font-mono">
                <span className="text-[9px] px-2 py-1.5 bg-background-dark border border-primary/20 uppercase tracking-widest text-slate-300 hover:border-primary/50 transition-colors w-full border-l-[3px] border-l-primary/60">
                  Financial Services
                </span>
                <span className="text-[9px] px-2 py-1.5 bg-background-dark border border-primary/20 uppercase tracking-widest text-slate-300 hover:border-primary/50 transition-colors w-full border-l-[3px] border-l-primary/60">
                  Public Sector
                </span>
                <span className="text-[9px] px-2 py-1.5 bg-background-dark border border-primary/20 uppercase tracking-widest text-slate-300 hover:border-primary/50 transition-colors w-full border-l-[3px] border-l-primary/60">
                  e-Commerce
                </span>
              </div>
            </div>
            <div className="pt-2">
              <label className="text-[9px] font-mono font-bold text-primary/60 uppercase tracking-widest block border-b border-primary/10 pb-1">
                Description
              </label>
              <p className="text-[10px] font-mono text-slate-400 leading-relaxed mt-3 uppercase tracking-wider">
                Primary transformative skill group for 2024. Heavily linked to
                Python and Transformer architectures. High scarcity in
                mid-senior levels within Singapore.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 flex-1">
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary/60 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-primary/40"></span> Related Entities
          </h3>
          <div className="space-y-2 font-mono">
            <div className="p-3 border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 cursor-pointer flex items-center justify-between transition-all group">
              <span className="text-[10px] uppercase tracking-wider text-slate-300 group-hover:text-white transition-colors">
                Large Language Models
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-primary/50 group-hover:text-primary transition-colors" />
            </div>
            <div className="p-3 border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 cursor-pointer flex items-center justify-between transition-all group">
              <span className="text-[10px] uppercase tracking-wider text-slate-300 group-hover:text-white transition-colors">
                Vector Databases
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-primary/50 group-hover:text-primary transition-colors" />
            </div>
            <div className="p-3 border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 cursor-pointer flex items-center justify-between transition-all group">
              <span className="text-[10px] uppercase tracking-wider text-slate-300 group-hover:text-white transition-colors">
                Prompt Engineering
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-primary/50 group-hover:text-primary transition-colors" />
            </div>
            <div className="p-3 border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 cursor-pointer flex items-center justify-between transition-all group">
              <span className="text-[10px] uppercase tracking-wider text-slate-300 group-hover:text-white transition-colors">
                GPU Orchestration
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-primary/50 group-hover:text-primary transition-colors" />
            </div>
          </div>
        </div>
        <div className="p-6 bg-background-dark/95 border-t border-primary/20 shrink-0">
          <button className="w-full py-3 border border-primary/50 bg-primary/10 text-primary text-[10px] font-mono font-bold rounded-none hover:bg-primary hover:text-background-dark transition-all uppercase tracking-widest shadow-[0_0_10px_rgba(37,157,244,0.2)]">
            Open in Ontology Graph
          </button>
        </div>
      </aside>
    </div>
  );
}
