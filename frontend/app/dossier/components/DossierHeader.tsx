"use client";

import { motion } from "framer-motion";
import { ShieldAlert, Fingerprint } from "lucide-react";

export default function DossierHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="clay-panel border-l-4 border-l-red-500/80 !rounded-none p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-black/40"
    >
      <div className="flex items-center gap-4">
        <ShieldAlert className="w-10 h-10 text-red-500 opacity-80" />
        <div>
          <h1 className="text-2xl font-black tracking-widest text-white/90 uppercase">
            SKILLBRIDGE AI
          </h1>
          <p className="text-sm text-red-400 font-mono uppercase tracking-widest mt-1">
            Operational Intelligence Dossier
          </p>
        </div>
      </div>

      <div className="flex flex-col items-end text-xs text-slate-400 font-mono tracking-wider">
        <div className="flex items-center gap-2 mb-1 text-red-400/80">
          <Fingerprint className="w-4 h-4" />
          Classification: INTERNAL / LEVEL 4
        </div>
        <div>
          <span className="text-slate-500">System Status:</span>{" "}
          <span className="text-emerald-400 animate-pulse">
            ACTIVE &gt;&gt;
          </span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-right">
          <span className="text-slate-500">Build Version:</span>
          <span>v1.2.0-secure</span>
          <span className="text-slate-500">Environment:</span>
          <span>PRODUCTION</span>
          <span className="text-slate-500">Region:</span>
          <span>ap-southeast-1</span>
          <span className="text-slate-500">Timestamp:</span>
          <span>{new Date().toISOString()}</span>
        </div>
      </div>
    </motion.div>
  );
}
