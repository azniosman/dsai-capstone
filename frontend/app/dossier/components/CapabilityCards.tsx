"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";

export default function CapabilityCards() {
  const capabilities = [
    {
      title: "Career Intelligence Engine",
      desc: "Maps discrete skills against broader tech market datasets.",
    },
    {
      title: "Skill Gap Detection",
      desc: "Flags missing proficiencies within localized workforce contexts.",
    },
    {
      title: "Market Signal Analysis",
      desc: "Synthesizes real-time tech industry shifts.",
    },
    {
      title: "AI Career Assistant",
      desc: "Delivers responsive conversational coaching logic.",
    },
    {
      title: "Data Intelligence Dashboard",
      desc: "Visualizes deep-telemetry execution trace streams.",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="clay-panel border-t-2 border-t-yellow-500/50 p-6"
    >
      <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
        <Zap className="w-5 h-5 text-yellow-400" />
        <h2 className="text-lg font-bold tracking-widest text-yellow-50 uppercase">
          System Capabilities
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {capabilities.map((cap, idx) => (
          <motion.div
            key={cap.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
            transition={{ delay: idx * 0.1 }}
            className="flex flex-col gap-2 p-4 bg-black/40 border border-white/5 rounded backdrop-blur-sm group hover:border-yellow-500/30 hover:shadow-[0_0_15px_rgba(234,179,8,0.1)] transition-all cursor-crosshair"
          >
            <div className="text-xs font-bold text-yellow-100 uppercase tracking-widest mb-2 border-b border-white/10 pb-2">
              {cap.title}
            </div>
            <div className="text-[11px] text-slate-400 font-mono leading-relaxed group-hover:text-slate-300">
              {cap.desc}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
