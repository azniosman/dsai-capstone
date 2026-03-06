"use client";

import { motion } from "framer-motion";
import { Cpu } from "lucide-react";

export default function ApplicationIdentity() {
  const profileItems = [
    { label: "Name", value: "SkillBridge AI" },
    { label: "System Type", value: "Career Intelligence Platform" },
    { label: "Architecture", value: "AI + RAG + Cloud Infrastructure" },
    { label: "Mission Status", value: "Operational" },
    { label: "Deployment Environment", value: "Cloud Native" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="clay-panel border-t-2 border-t-cyan-500/50 p-6 relative overflow-hidden group hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all"
    >
      <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
        <Cpu className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg font-bold tracking-widest text-cyan-50 uppercase">
          Application Profile
        </h2>
      </div>

      <div className="space-y-4">
        {profileItems.map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + idx * 0.1 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-1 md:gap-4 text-sm font-mono"
          >
            <span className="text-slate-500 uppercase tracking-wider text-xs">
              {item.label}
            </span>
            <span className="text-cyan-100 tracking-wide text-right">
              {item.value}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Decorative scanning line on hover */}
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-cyan-500/30 animate-[scan_2s_linear_infinite]" />
      </div>
    </motion.div>
  );
}
