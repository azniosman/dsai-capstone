"use client";

import { motion } from "framer-motion";
import { Crosshair } from "lucide-react";

export default function MissionBriefing() {
  const objectives = [
    "analyze labour market signals",
    "detect skill demand trends",
    "assist career intelligence",
    "generate AI insights",
    "bridge skills to opportunities",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="clay-panel border-t-2 border-t-purple-500/50 p-6 relative overflow-hidden group hover:shadow-[0_0_20px_rgba(147,51,234,0.15)] transition-all"
    >
      <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
        <Crosshair className="w-5 h-5 text-purple-400" />
        <h2 className="text-lg font-bold tracking-widest text-purple-50 uppercase">
          Mission Objective
        </h2>
      </div>

      <p className="text-sm font-mono text-slate-400 mb-6 leading-relaxed">
        SkillBridge functions as a central intelligence matrix to autonomously
        process Singaporean career trajectories, programmed to:
      </p>

      <ul className="space-y-3">
        {objectives.map((obj, idx) => (
          <motion.li
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 + idx * 0.15 }}
            className="flex items-center gap-3 text-sm font-mono text-purple-100"
          >
            <span className="w-1.5 h-1.5 bg-purple-500 rounded-sm shadow-[0_0_5px_rgba(147,51,234,0.8)] animate-pulse" />
            <span className="uppercase tracking-widest">{obj}</span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
