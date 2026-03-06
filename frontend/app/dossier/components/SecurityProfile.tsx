"use client";

import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

export default function SecurityProfile() {
  const protocols = [
    "IAM Controlled Access",
    "Encrypted Data Channels",
    "Secure Cloud Infrastructure",
    "Audit Logging Enabled",
    "AI Governance Framework",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="clay-panel border-y border-y-slate-500/30 p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck className="w-5 h-5 text-slate-400" />
        <h2 className="text-lg font-bold tracking-widest text-slate-100 uppercase">
          Security & Governance
        </h2>
      </div>

      <div className="space-y-4">
        {protocols.map((protocol, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: idx * 0.1 }}
            className="flex items-center gap-3 px-4 py-2 bg-black/40 border border-white/5 rounded backdrop-blur-sm"
          >
            <div className="w-1.5 h-1.5 bg-slate-500 rotate-45" />
            <span className="text-xs md:text-sm font-mono text-slate-300 tracking-widest uppercase">
              {protocol}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
