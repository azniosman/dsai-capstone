"use client";

import { Upload, Cpu, Map, MoveRight } from "lucide-react";
import { motion } from "framer-motion";

const STEPS = [
  {
    step: "01",
    icon: Upload,
    title: "Upload & Sync",
    desc: "Connect your resume or Singpass profile. The AI Copilot ingests your baseline credentials and career history.",
  },
  {
    step: "02",
    icon: Cpu,
    title: "Analyse & Score",
    desc: "Seven intelligence modules run in parallel — skill gap detection, job match scoring, and market benchmarking against live IMDA data.",
  },
  {
    step: "03",
    icon: Map,
    title: "Act on Your Roadmap",
    desc: "Receive a personalized Career Path Timeline, optimized resume, interview prep, and curated SSG-subsidized courses.",
  },
] as const;

export function HowItWorksSection() {
  return (
    <section className="py-24 bg-background-dark/95 border-y border-white/5 relative overflow-hidden">
      {/* Radial highlight */}
      <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/5 via-background-dark/5 to-transparent pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-16 space-y-4">
          <div className="tactical-label text-[#00f2f2]">PIPELINE_SEQUENCE</div>
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-slate-100">
            How It Works
          </h2>
          <div className="h-1 w-16 bg-[#ff3b3b] mx-auto shadow-[0_0_10px_rgba(255,59,59,0.5)]" />
          <p className="text-slate-400 font-mono text-sm uppercase tracking-widest max-w-xl mx-auto">
            Three steps from resume upload to an actionable career plan
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 relative">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-[40px] left-0 w-full h-px bg-primary/20 pointer-events-none" />

          {STEPS.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="relative flex flex-col items-center text-center space-y-6 group"
              >
                <div className="w-20 h-20 rounded-none bg-background-dark border border-primary/30 flex items-center justify-center relative z-10 shadow-[0_0_15px_rgba(37,157,244,0.1)] group-hover:bg-primary/5 group-hover:border-primary/60 transition-all duration-300">
                  <span className="font-mono text-xl font-bold text-primary">
                    {item.step}
                  </span>
                  {i < STEPS.length - 1 && (
                    <MoveRight className="hidden md:block absolute -right-8 w-6 h-6 text-primary/40 bg-background-dark z-20" />
                  )}
                </div>

                {/* Icon badge */}
                <div className="flex items-center justify-center gap-2 text-[#00f2f2]">
                  <Icon className="w-4 h-4" />
                  <span className="tactical-label text-[#00f2f2]">
                    {item.title}
                  </span>
                </div>

                <p className="text-sm font-mono text-slate-400 leading-relaxed px-4">
                  {item.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
