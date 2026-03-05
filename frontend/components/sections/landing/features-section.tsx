"use client";

import {
  Bot,
  Target,
  FileSearch,
  Gauge,
  GitBranch,
  BarChart2,
  MessageSquare,
} from "lucide-react";
import { motion } from "framer-motion";

const FEATURES = [
  {
    icon: Bot,
    code: "MODULE_01",
    title: "AI_CAREER_COPILOT",
    label: "AI Career Copilot",
    desc: "Upload your resume and receive personalized career advice — strengths, weaknesses, and a suggested path forward.",
    color: "#00f2f2",
    glow: "rgba(0,242,242,0.15)",
  },
  {
    icon: Target,
    code: "MODULE_02",
    title: "SKILL_GAP_ANALYZER",
    label: "Skill Gap Analyzer",
    desc: "Highlights missing skills for any target role and delivers actionable upskilling recommendations.",
    color: "#259df4",
    glow: "rgba(37,157,244,0.15)",
  },
  {
    icon: FileSearch,
    code: "MODULE_03",
    title: "RESUME_OPTIMIZER",
    label: "Resume Optimizer",
    desc: "Real-time AI feedback, targeted rewrites, and structural improvements for your resume.",
    color: "#9333ea",
    glow: "rgba(147,51,234,0.15)",
  },
  {
    icon: Gauge,
    code: "MODULE_04",
    title: "JOB_MATCH_SCORING",
    label: "Job Match Scoring",
    desc: "Scores resume-to-job compatibility, highlights your strongest matches, and maps remaining gaps.",
    color: "#00f2f2",
    glow: "rgba(0,242,242,0.15)",
  },
  {
    icon: GitBranch,
    code: "MODULE_05",
    title: "CAREER_PATH_TIMELINE",
    label: "Career Path Timeline",
    desc: "A visual roadmap of recommended learning milestones — plan your next move with strategic clarity.",
    color: "#259df4",
    glow: "rgba(37,157,244,0.15)",
  },
  {
    icon: BarChart2,
    code: "MODULE_06",
    title: "LIVE_INFOCOMM_MATRIX",
    label: "Live Infocomm Job Matrix",
    desc: "Real-time IMDA dataset showing employed vs vacancies across the Singapore Infocomm sector.",
    color: "#9333ea",
    glow: "rgba(147,51,234,0.15)",
  },
  {
    icon: MessageSquare,
    code: "MODULE_07",
    title: "INTERVIEW_SIMULATOR",
    label: "Interview Simulator",
    desc: "AI-generated interview questions based on your experience — practice, receive feedback, and improve.",
    color: "#00f2f2",
    glow: "rgba(0,242,242,0.15)",
  },
] as const;

export function FeaturesSection() {
  return (
    <section className="py-24 bg-background-dark relative overflow-hidden">
      {/* Corner badge */}
      <div className="absolute top-0 right-0 p-4 border-b border-l border-[#00f2f2]/20 bg-[#00f2f2]/5 hidden md:block">
        <span className="text-[8px] font-mono text-[#00f2f2] tracking-widest uppercase font-bold">
          SYS.FEATURES_V7
        </span>
      </div>

      {/* Ambient glow blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#00f2f2]/4 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#9333ea]/4 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="mb-16 space-y-4">
          <div className="tactical-label text-[#00f2f2]">
            INTELLIGENCE_MODULES
          </div>
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-slate-100">
            SKLBR_COMPONENTS
          </h2>
          <div className="h-0.5 w-24 bg-[#00f2f2]" />
          <p className="text-slate-400 font-mono text-sm max-w-xl">
            Seven active intelligence modules powering your career transition —
            each grounded in real Singapore market data.
          </p>
        </div>

        {/* Feature grid — 4 cols + 3 cols stacked */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/5 border border-white/5">
          {FEATURES.slice(0, 4).map((f, i) => (
            <FeatureCard key={f.code} feature={f} index={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/5 border-x border-b border-white/5">
          {FEATURES.slice(4).map((f, i) => (
            <FeatureCard key={f.code} feature={f} index={i + 4} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Sub-component ────────────────────────────────────────────────────────────

interface Feature {
  readonly icon: React.ElementType;
  readonly code: string;
  readonly title: string;
  readonly label: string;
  readonly desc: string;
  readonly color: string;
  readonly glow: string;
}

const FeatureCard = ({
  feature,
  index,
}: {
  readonly feature: Feature;
  readonly index: number;
}) => {
  const Icon = feature.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.07, duration: 0.45 }}
      className="flex flex-col gap-5 p-8 bg-background hover:bg-white/3 transition-all group relative overflow-hidden cursor-default"
    >
      {/* Hover glow sweep */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top left, ${feature.glow} 0%, transparent 65%)`,
        }}
      />

      {/* Icon */}
      <div
        className="w-12 h-12 shrink-0 flex items-center justify-center border transition-all duration-300"
        style={{
          borderColor: `${feature.color}30`,
          color: feature.color,
        }}
      >
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="space-y-2 z-10">
        <div className="tactical-label" style={{ color: feature.color }}>
          {feature.code}
        </div>
        <h3
          className="text-sm font-black text-slate-200 uppercase tracking-widest transition-colors duration-200 group-hover:text-white"
          style={{ letterSpacing: "0.12em" }}
        >
          {feature.label}
        </h3>
        <p className="text-[12px] font-sans text-slate-500 leading-relaxed">
          {feature.desc}
        </p>
      </div>

      {/* Animated bottom accent */}
      <div
        className="absolute bottom-0 left-0 h-px w-0 group-hover:w-full transition-all duration-500"
        style={{ background: feature.color }}
      />

      {/* Index watermark */}
      <div className="absolute top-4 right-4 tactical-label text-white/8">
        {feature.code}
      </div>
    </motion.div>
  );
};
