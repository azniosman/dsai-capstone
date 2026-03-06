"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Import upcoming components
import DossierHeader from "./components/DossierHeader";
import ApplicationIdentity from "./components/ApplicationIdentity";
import MissionBriefing from "./components/MissionBriefing";
import AIEngineDiagram from "./components/AIEngineDiagram";
import ArchitectureMap from "./components/ArchitectureMap";
import IntelligenceSources from "./components/IntelligenceSources";
import CapabilityCards from "./components/CapabilityCards";
import SystemStatusPanel from "./components/SystemStatusPanel";
import SecurityProfile from "./components/SecurityProfile";
import BuildTimeline from "./components/BuildTimeline";

const initPhrases = [
  "INITIALIZING DOSSIER FILE...",
  "AUTHENTICATING SYSTEM ACCESS",
  "LOADING INTELLIGENCE MODULES",
  "ACCESS GRANTED",
];

export default function DossierPage() {
  const [initStep, setInitStep] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (initStep < initPhrases.length) {
      const timer = setTimeout(() => {
        setInitStep((prev) => prev + 1);
      }, 700);
      return () => clearTimeout(timer);
    } else {
      const finishTimer = setTimeout(() => {
        setIsInitializing(false);
      }, 500);
      return () => clearTimeout(finishTimer);
    }
  }, [initStep]);

  return (
    <div className="min-h-screen relative w-full overflow-hidden bg-background-dark font-mono text-slate-300">
      {/* Universal scanline background effects */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <motion.div
          className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-size-[100%_4px] opacity-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          transition={{ duration: 2 }}
        />
        <motion.div
          className="absolute left-0 right-0 h-[2px] bg-cyan-500/30 shadow-[0_0_15px_3px_rgba(6,182,212,0.4)]"
          initial={{ top: "-10%" }}
          animate={{ top: "110%" }}
          transition={{
            duration: 8,
            ease: "linear",
            repeat: Infinity,
          }}
        />
        <div className="absolute right-0 bottom-0 w-[800px] h-[800px] rounded-full border border-white/5 opacity-10 bg-[radial-gradient(circle,transparent_40%,rgba(6,182,212,0.1)_100%)] blur-3xl pointer-events-none" />
      </div>

      <AnimatePresence mode="wait">
        {isInitializing ? (
          <motion.div
            key="initializer"
            className="fixed inset-0 z-50 flex items-center justify-center bg-background-dark"
            exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            <div className="flex flex-col items-center justify-center gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                className="w-16 h-16 border-t-2 border-r-2 border-cyan-500 rounded-full mb-8 shadow-[0_0_15px_rgba(6,182,212,0.5)]"
              />
              {initPhrases.slice(0, initStep).map((phrase, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-cyan-400 font-mono tracking-widest text-sm uppercase shadow-cyan-500/50 drop-shadow-md"
                >
                  &gt; {phrase}
                </motion.div>
              ))}
              <div className="h-4 w-2 bg-cyan-400 animate-pulse mt-2" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dossier-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative z-10 max-w-6xl mx-auto px-6 py-12 flex flex-col gap-12"
          >
            <DossierHeader />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <ApplicationIdentity />
              <MissionBriefing />
            </div>

            <AIEngineDiagram />

            <ArchitectureMap />

            <div className="grid grid-cols-1 gap-8">
              <IntelligenceSources />
            </div>

            <CapabilityCards />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <SystemStatusPanel />
              <SecurityProfile />
            </div>

            <BuildTimeline />

            <footer className="text-center text-xs text-slate-600 mt-12 mb-8 border-t border-white/5 pt-8">
              SKILLBRIDGE AI // CLASSIFIED INTEL DASHBOARD // ALL RIGHTS
              RESERVED
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
