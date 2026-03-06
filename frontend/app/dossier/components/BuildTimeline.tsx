"use client";

import { motion } from "framer-motion";
import { History } from "lucide-react";

export default function BuildTimeline() {
  const versions = [
    {
      v: "v0.9",
      label: "Retrieval Augmented Generation Engine",
      date: "Present",
    },
    { v: "v0.8", label: "AI Career Assistant", date: "T-2 Days" },
    { v: "v0.7", label: "Intelligence Dashboard", date: "T-10 Days" },
    { v: "v0.6", label: "Cloud Infrastructure Deployment", date: "T-15 Days" },
    { v: "v0.5", label: "Initial Platform Prototype", date: "T-30 Days" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="clay-panel border-t-2 border-t-pink-500/50 p-6"
    >
      <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
        <History className="w-5 h-5 text-pink-400" />
        <h2 className="text-lg font-bold tracking-widest text-pink-50 uppercase">
          System Build History
        </h2>
      </div>

      <div className="relative border-l-2 border-pink-500/20 ml-3 pl-6 space-y-8 mt-4">
        {versions.map((ver, idx) => (
          <motion.div
            key={ver.v}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: idx * 0.15 }}
            className="relative"
          >
            {/* Timeline structural dot */}
            <div className="absolute -left-[31px] top-1.5 w-3 h-3 bg-pink-500/20 border-2 border-pink-400 rounded-full" />

            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
              <span className="text-pink-400 font-bold font-mono text-sm tracking-widest">
                {ver.v}
              </span>
              <span className="text-slate-200 text-sm tracking-widest uppercase">
                {ver.label}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-1 uppercase">
              {ver.date}
            </div>
          </motion.div>
        ))}

        {/* Animated scanning line overlaid on the timeline */}
        <motion.div
          className="absolute left-[-2px] top-0 w-[2px] bg-pink-400/80 shadow-[0_0_8px_rgba(244,114,182,0.8)]"
          initial={{ height: "0%", top: "0%" }}
          animate={{ height: "20%", top: "80%" }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      </div>
    </motion.div>
  );
}
