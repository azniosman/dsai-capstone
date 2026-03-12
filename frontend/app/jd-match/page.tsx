"use client";

import { useEffect, useState } from "react";
import {
  Brain,
  Target,
  Crosshair,
  ShieldCheck,
  ArrowRight,
  Zap,
  Cpu,
  ScanLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModalStore } from "@/store/modalStore";

const FEATURES = [
  {
    icon: Brain,
    title: "Vector Alignment",
    description:
      "Analyzing job description semantics against your core profile nodes.",
  },
  {
    icon: Target,
    title: "Gap Extraction",
    description:
      "Automated identification of missing certifications or technical proficiencies.",
  },
  {
    icon: Crosshair,
    title: "Precision Scoring",
    description:
      "Deep match algorithm providing a high-fidelity alignment forecast.",
  },
  {
    icon: ShieldCheck,
    title: "SCTP Bridge",
    description:
      "Direct mapping to SkillsFuture-subsidized upskilling pathways.",
  },
];

export default function JDMatchPage() {
  const { openModal } = useModalStore();
  const [hasProfile, setHasProfile] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only run on client
    const checkProfile = () => {
      setMounted(true);
      setHasProfile(!!localStorage.getItem("profileId"));
    };
    checkProfile();
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden h-[calc(100vh-theme(spacing.16))] -m-12 font-mono text-foreground bg-background">
      <header className="flex h-16 items-center justify-between border-b border-primary/20 bg-card px-6 shrink-0 relative">
        <div className="absolute top-0 bottom-0 left-0 w-1 bg-primary/40"></div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 border border-primary p-1.5 text-primary flex items-center justify-center shadow-[0_0_8px_rgba(37,157,244,0.4)]">
              <Cpu className="w-4 h-4" />
            </div>
            <h2 className="text-white text-lg font-bold tracking-widest uppercase">
              Neural Talent{" "}
              <span className="text-primary drop-shadow-[0_0_5px_rgba(37,157,244,0.5)]">
                Matching
              </span>
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {hasProfile ? (
            <Button
              onClick={() => openModal("jdMatch")}
              className="bg-primary/10 border border-primary text-primary text-[10px] font-bold px-4 py-2 flex items-center gap-2 hover:bg-primary/20 hover:shadow-[0_0_10px_rgba(37,157,244,0.4)] transition-all rounded-none uppercase tracking-widest"
            >
              <Zap className="w-3.5 h-3.5" />
              New Scan
            </Button>
          ) : (
            <Button
              onClick={() => openModal("profile")}
              className="bg-transparent border border-primary/50 text-primary text-[10px] font-bold px-4 py-2 hover:bg-primary/10 rounded-none uppercase tracking-widest transition-all"
            >
              Configure Dossier First
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar equivalent */}
        <aside className="w-[320px] border-r border-primary/20 bg-card/50 flex flex-col p-6 shrink-0 overflow-y-auto relative">
          <div className="absolute top-0 right-0 w-px h-full bg-linear-to-b from-transparent via-primary/20 to-transparent"></div>
          <div className="mb-8 space-y-4">
            <div>
              <p className="text-[10px] font-bold text-primary/50 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-1 h-1 bg-primary/50 rounded-full"></span>
                System Overview
              </p>
              <h1 className="text-lg font-bold uppercase tracking-widest leading-tight text-foreground mb-2">
                Ad-Hoc Match Engine
              </h1>
            </div>
            <p className="text-[10px] text-muted-foreground tracking-wider leading-relaxed font-mono">
              Inject custom job descriptions into the matching engine for
              real-time gap analysis and alignment forecasting.
            </p>

            {!hasProfile ? (
              <div className="p-4 border border-accent-coral/30 bg-accent-coral/5 rounded-none space-y-3 mt-4 relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-accent-coral/50"></div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-accent-coral animate-pulse" />
                  <span className="text-[10px] font-bold text-accent-coral uppercase tracking-widest drop-shadow-[0_0_3px_rgba(239,68,68,0.8)]">
                    Dossier Required
                  </span>
                </div>
                <p className="text-[10px] text-accent-coral/70 font-mono tracking-wider">
                  A baseline profile must be configured to calculate
                  intersection vectors.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-none space-y-3 mt-4 relative">
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/50"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/50"></div>

                <span className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_5px_rgba(37,157,244,0.8)]"></span>
                  Engine Ready
                </span>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-card border border-primary/20 p-2">
                    <span className="block text-xl font-bold font-mono text-foreground drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                      94.2%
                    </span>
                    <span className="text-[9px] uppercase tracking-widest font-bold text-primary/60">
                      Avg Precision
                    </span>
                  </div>
                  <div className="bg-card border border-primary/20 p-2">
                    <span className="block text-xl font-bold font-mono text-foreground drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                      &lt;1.2s
                    </span>
                    <span className="text-[9px] uppercase tracking-widest font-bold text-primary/60">
                      Latency
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-auto space-y-2">
            <p className="text-[10px] font-bold text-primary/50 uppercase tracking-widest ml-2 mb-3">
              Capabilities
            </p>
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="flex gap-3 p-3 hover:bg-primary/5 transition-colors border-l-2 border-transparent hover:border-primary group"
              >
                <div className="h-8 w-8 shrink-0 bg-card flex items-center justify-center border border-primary/20 group-hover:border-primary/50 transition-colors">
                  <feature.icon className="w-4 h-4 text-primary/60 group-hover:text-primary" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold tracking-widest uppercase text-foreground group-hover:text-foreground transition-colors">
                    {feature.title}
                  </h4>
                  <p className="text-[9px] font-mono tracking-wider text-muted-foreground mt-1">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Interface Area */}
        <section className="flex-1 flex flex-col items-center justify-center p-8 bg-background relative overflow-hidden">
          <div className="absolute inset-0 cyber-grid opacity-20"></div>
          {/* Center Call to action visual */}
          <div className="max-w-md w-full text-center space-y-8 relative z-10 p-12 border border-primary/20 bg-card/80 backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary"></div>

            <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
              <div className="absolute inset-0 bg-primary/10 rounded-full blur-[30px] shadow-[0_0_50px_rgba(37,157,244,0.2)]"></div>
              <div className="w-20 h-20 bg-card flex items-center justify-center border border-primary/30 relative z-10 shadow-[0_0_15px_rgba(37,157,244,0.15)]">
                <ScanLine className="w-8 h-8 text-primary drop-shadow-[0_0_8px_rgba(37,157,244,0.8)]" />
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full border border-primary/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11/12 h-11/12 border border-dashed border-primary/30 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold tracking-widest uppercase text-foreground drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                Input Job Description
              </h3>
              <p className="text-[11px] font-mono tracking-wider text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Paste a target JD to analyze your alignment and generate an
                immediate gap-bridging roadmap.
              </p>
            </div>

            {hasProfile ? (
              <Button
                onClick={() => openModal("jdMatch")}
                className="h-12 w-full max-w-[240px] bg-primary text-white font-bold uppercase tracking-widest text-xs hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2 group mx-auto"
              >
                Start Match Protocol
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            ) : (
              <Button
                onClick={() => openModal("profile")}
                className="h-12 w-full max-w-[240px] bg-slate-custom-800 text-white font-bold uppercase tracking-widest text-xs hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2 mx-auto"
              >
                Configure Dossier
              </Button>
            )}
          </div>

          {/* Background decoration */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.02]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #000 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          ></div>
        </section>
      </main>
    </div>
  );
}
