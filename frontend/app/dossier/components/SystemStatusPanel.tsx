"use client";

import { motion } from "framer-motion";
import { Activity } from "lucide-react";

export default function SystemStatusPanel() {
  const metrics = [
    { label: "LLM Engine", status: "ONLINE", color: "emerald" },
    { label: "RAG Engine", status: "ACTIVE", color: "emerald" },
    { label: "Vector Database", status: "SYNCHRONIZED", color: "emerald" },
    { label: "Data Feeds", status: "ACTIVE", color: "emerald" },
    { label: "Infrastructure", status: "STABLE", color: "emerald" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="clay-panel border-y border-y-emerald-500/30 p-6 bg-emerald-950/10"
    >
      <div className="flex items-center gap-3 mb-6">
        <Activity className="w-5 h-5 text-emerald-400" />
        <h2 className="text-lg font-bold tracking-widest text-emerald-50 uppercase">
          System Status
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {metrics.map((metric, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0"
          >
            <span className="text-sm font-mono text-slate-400 tracking-wider">
              {metric.label}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-emerald-400 tracking-widest">
                {metric.status}
              </span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
