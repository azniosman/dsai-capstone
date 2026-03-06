"use client";

import { motion } from "framer-motion";
import { Database, SignalHigh } from "lucide-react";

export default function IntelligenceSources() {
  const sources = [
    {
      name: "IMDA ICT Job Role Matrix",
      status: "SYNCING",
      updated: "Just now",
      signal: 98,
    },
    {
      name: "Labour Market Data",
      status: "ACTIVE",
      updated: "2 hrs ago",
      signal: 100,
    },
    {
      name: "Skills Intelligence Dataset",
      status: "ACTIVE",
      updated: "12 hrs ago",
      signal: 85,
    },
    {
      name: "Internal Knowledge Base",
      status: "ACTIVE",
      updated: "1 day ago",
      signal: 90,
    },
    {
      name: "User Query Signals",
      status: "SYNCING",
      updated: "Real-time",
      signal: 100,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="clay-panel border-t-2 border-t-blue-500/50 p-6 relative overflow-hidden group hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all"
    >
      <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
        <Database className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-bold tracking-widest text-blue-50 uppercase">
          Intelligence Sources
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sources.map((src, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className="p-4 bg-black/40 border border-white/5 rounded backdrop-blur-sm relative overflow-hidden hover:border-blue-500/30 transition-colors"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs uppercase font-mono tracking-widest text-slate-300">
                {src.name}
              </span>
              <SignalHigh
                className={`w-4 h-4 ${src.signal > 90 ? "text-blue-400" : "text-slate-500"}`}
              />
            </div>

            <div className="flex items-center justify-between mt-auto">
              <div className="flex items-center gap-2">
                <span
                  className={`relative flex h-2 w-2 ${src.status === "SYNCING" ? "opacity-75" : ""}`}
                >
                  {src.status === "SYNCING" && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${src.status === "SYNCING" ? "bg-blue-400" : "bg-emerald-500"}`}
                  ></span>
                </span>
                <span
                  className={`text-[10px] font-mono tracking-widest ${src.status === "SYNCING" ? "text-blue-400" : "text-emerald-500"}`}
                >
                  {src.status}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {src.updated}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
