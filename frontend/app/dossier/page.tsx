"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// Import existing components
import ApplicationIdentity from "./components/ApplicationIdentity";
import MissionBriefing from "./components/MissionBriefing";
import AIEngineDiagram from "./components/AIEngineDiagram";
import ArchitectureMap from "./components/ArchitectureMap";
import IntelligenceSources from "./components/IntelligenceSources";
import CapabilityCards from "./components/CapabilityCards";
import SystemStatusPanel from "./components/SystemStatusPanel";
import SecurityProfile from "./components/SecurityProfile";
import SkillBridgeTerminal from "./components/SkillBridgeTerminal";
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
    <div className="relative flex h-screen w-full flex-col font-sans bg-[#05080b] text-text-main overflow-hidden bg-[linear-gradient(rgba(56,189,248,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.03)_1px,transparent_1px)] bg-size-[32px_32px]">
      {/* 1. Terminal Header */}
      <header className="flex items-center justify-between border-b border-brand-border px-6 py-3 glass-panel z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-brand-accent">
            <span className="material-symbols-outlined text-2xl font-light">
              insights
            </span>
            <h1 className="text-sm font-semibold tracking-[0.2em] uppercase">
              Intelligence Terminal
            </h1>
          </div>
          <div className="h-4 w-px bg-brand-border"></div>
          <div className="text-[10px] text-text-dim tracking-widest uppercase font-medium">
            Core v8.4.2 // Node_012
          </div>
        </div>
        <div className="flex items-center gap-8">
          <nav className="hidden lg:flex items-center gap-8">
            <Link
              href="/dashboard"
              className="text-text-dim hover:text-brand-accent text-[11px] font-medium tracking-widest transition-colors"
            >
              ANALYTICS
            </Link>
            <Link
              href="/logs"
              className="text-text-dim hover:text-brand-accent text-[11px] font-medium tracking-widest transition-colors"
            >
              SURVEILLANCE
            </Link>
            <Link
              href="/operations"
              className="text-text-dim hover:text-brand-accent text-[11px] font-medium tracking-widest transition-colors"
            >
              OPERATIONS
            </Link>
            <button
              type="button"
              className="text-text-dim hover:text-brand-accent text-[11px] font-medium tracking-widest transition-colors"
            >
              ENCRYPTION
            </button>
          </nav>
          <div className="flex gap-6 items-center border-l border-brand-border pl-8">
            <div className="flex gap-4 text-text-dim">
              <button
                type="button"
                className="material-symbols-outlined text-xl font-light hover:text-brand-accent transition-colors"
              >
                language
              </button>
              <button
                type="button"
                className="material-symbols-outlined text-xl font-light hover:text-brand-accent transition-colors"
              >
                notifications_none
              </button>
              <button
                type="button"
                className="material-symbols-outlined text-xl font-light hover:text-brand-accent transition-colors"
              >
                settings
              </button>
            </div>
            <div className="text-xs font-mono tracking-tighter tabular-nums bg-brand-slate px-3 py-1 rounded border border-brand-border">
              {new Date().toLocaleTimeString("en-US", {
                timeZone: "UTC",
                hour12: false,
              })}{" "}
              UTC
            </div>
            <div className="w-8 h-8 rounded-full border border-brand-accent/30 bg-brand-accent/10 flex items-center justify-center overflow-hidden">
              <span className="material-symbols-outlined text-brand-accent text-lg">
                account_circle
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Body */}
      <main className="flex flex-1 overflow-hidden p-6 gap-6">
        {/* Left Pane: Terminal Console */}
        <section className="flex-3 flex flex-col bg-terminal-bg border border-brand-border active-window-shadow rounded-sm relative transition-all">
          <div className="flex items-center justify-between px-4 py-2 bg-brand-slate/40 border-b border-brand-border">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-brand-border/60"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-brand-border/60"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-brand-border/60"></div>
              </div>
              <span className="text-[10px] text-text-dim uppercase tracking-[0.15em] font-medium ml-2">
                Terminal Console — root@intelligence: /opt/skillbridge/core
              </span>
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                className="material-symbols-outlined text-sm text-text-dim hover:text-text-main transition-colors"
              >
                remove
              </button>
              <button
                type="button"
                className="material-symbols-outlined text-sm text-text-dim hover:text-text-main transition-colors"
              >
                fullscreen
              </button>
              <Link
                href="/dashboard"
                className="material-symbols-outlined text-sm text-text-dim hover:text-brand-accent transition-colors"
              >
                close
              </Link>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar font-mono text-[13px] leading-relaxed relative">
            <AnimatePresence mode="wait">
              {isInitializing ? (
                <motion.div
                  key="initializer"
                  className="flex flex-col gap-2"
                  exit={{ opacity: 0, filter: "blur(10px)" }}
                  transition={{ duration: 0.8 }}
                >
                  <div className="text-text-dim/60 mb-4">
                    Establishing secure tunnel via proxy-v4.intel.internal...
                    [CONNECTED]
                  </div>
                  <div className="text-text-dim">
                    root@intelligence:~${" "}
                    <span className="text-text-main">./init_platform.sh</span>
                  </div>
                  <div className="text-brand-accent mt-2 flex flex-col gap-1">
                    {initPhrases.slice(0, initStep).map((phrase, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-cyan-400 font-mono tracking-widest text-sm uppercase"
                      >
                        [ <span className="font-bold">OK</span> ] {phrase}
                      </motion.div>
                    ))}
                  </div>
                  <div className="mt-2 text-text-main">
                    Loading core logic pathways...{" "}
                    <span className="cursor-blink"></span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="main-intel-stream"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1 }}
                  className="w-full h-full flex"
                >
                  <SkillBridgeTerminal />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Right Pane: Surveillance Sidebar */}
        <aside className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar max-w-sm">
          {/* Tactical UI Load Block */}
          <div className="bg-terminal-bg border border-brand-border p-5 rounded-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-text-dim">
                SYSTEM_LOAD
              </h3>
              <span className="text-xs font-mono text-brand-accent">
                STATUS: NOMINAL
              </span>
            </div>
            <div className="flex h-12 items-end gap-1.5 px-1">
              {[40, 60, 35, 80, 20, 42, 55, 30, 70, 45].map((h, i) => (
                <div
                  key={i}
                  className={`w-full transition-colors ${i === 3 ? "bg-brand-accent/40" : i === 5 ? "bg-brand-accent/60" : "bg-brand-accent/20"}`}
                  style={{ height: `${h}%` }}
                ></div>
              ))}
            </div>
            <div className="flex justify-between text-[9px] text-text-dim/50 mt-3 font-mono">
              <span>-15 MIN</span>
              <span>LIVE</span>
            </div>
          </div>

          <SystemStatusPanel />
          <SecurityProfile />

          <div className="bg-terminal-bg border border-brand-border p-5 rounded-sm">
            <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-text-dim mb-4">
              MIGRATION_TIMELINE
            </h3>
            <BuildTimeline />
          </div>
        </aside>
      </main>

      {/* 3. Terminal Footer */}
      <footer className="h-10 border-t border-brand-border bg-brand-navy flex items-center px-6 text-[10px] text-text-dim gap-8 justify-between relative z-10">
        <div className="flex items-center gap-10">
          <button
            type="button"
            className="flex items-center gap-2 hover:text-brand-accent transition-colors text-left group"
          >
            <span className="material-symbols-outlined text-base font-light group-hover:scale-110 transition-transform">
              database
            </span>
            <span className="font-medium tracking-tight">
              STORAGE_ENCRYPTED: 100%
            </span>
          </button>
          <button
            type="button"
            className="flex items-center gap-2 hover:text-brand-accent transition-colors text-left group"
          >
            <span className="material-symbols-outlined text-base font-light group-hover:scale-110 transition-transform">
              vpn_lock
            </span>
            <span className="font-medium tracking-tight">
              QUANTUM_SECURE_V7
            </span>
          </button>
          <button
            type="button"
            className="flex items-center gap-2 hover:text-brand-accent transition-colors text-left group"
          >
            <span className="material-symbols-outlined text-base font-light group-hover:scale-110 transition-transform">
              memory
            </span>
            <span className="font-medium tracking-tight">LATENCY: 4ms AVG</span>
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-brand-accent/5 px-3 py-1 rounded-full border border-brand-accent/20">
            <div className="size-1.5 bg-brand-accent rounded-full shadow-[0_0_8px_#38bdf8] animate-pulse"></div>
            <span className="uppercase tracking-[0.2em] font-bold text-brand-accent text-[9px]">
              Uplink Active
            </span>
          </div>
          <div className="h-4 w-px bg-brand-border"></div>
          <span className="italic text-text-dim/60 font-medium">
            CLASSIFIED_ACCESS_ONLY
          </span>
        </div>
      </footer>
    </div>
  );
}
