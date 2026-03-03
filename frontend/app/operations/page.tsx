"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  Shield,
  Activity,
  Database,
  Cloud,
  Info,
  Cpu,
  X,
} from "lucide-react";
import { ArchitectureScene } from "@/components/sections/operations/architecture-scene";
import { ArchitectureNode } from "@/components/sections/operations/architecture-data";
import Link from "next/link";

export default function OperationsPage() {
  const [selectedNode, setSelectedNode] = useState<ArchitectureNode | null>(
    null,
  );

  return (
    <div className="min-h-screen bg-background font-display text-slate-100 selection:bg-[#00f2f2] selection:text-black overflow-hidden">
      {/* Tactical Shell */}
      <div className="relative flex h-screen w-full flex-col overflow-hidden">
        {/* Header - Reusing Landing Style but adjusted for Ops */}
        <header className="fixed top-0 z-50 w-full bg-background/50 backdrop-blur-xl border-b border-white/5 px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-[#00f2f2] flex items-center justify-center rounded-sm group-hover:bg-white transition-colors">
                <Terminal className="text-black w-6 h-6" />
              </div>
              <h2 className="text-white text-xl font-black leading-tight tracking-[0.1em] uppercase">
                SKLBR_INTEL // OPS_3D
              </h2>
            </Link>
          </div>

          <div className="flex items-center gap-8">
            <div className="hidden lg:flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-[#00f2f2]" />
                <span className="tactical-label text-[10px] text-[#00f2f2]">
                  LATENCY: 12MS
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Cloud className="w-3.5 h-3.5 text-orange-500" />
                <span className="tactical-label text-[10px] text-orange-500">
                  US-EAST-1: ACTIVE
                </span>
              </div>
            </div>
            <Link
              href="/"
              className="px-6 h-12 flex items-center border border-white/10 hover:border-[#00f2f2] tactical-label text-[10px] transition-all"
            >
              TERMINATE_VIEW
            </Link>
          </div>
        </header>

        <main className="flex-1 relative w-full h-full">
          {/* 3D Scene Layer */}
          <div className="absolute inset-0 z-0 pt-20">
            <ArchitectureScene onNodeSelect={setSelectedNode} />
          </div>

          {/* Floating Info Overlay (Top Left) */}
          <div className="absolute top-32 left-8 z-10 pointer-events-none">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#00f2f2]" />
                <span className="tactical-label text-[10px] text-[#00f2f2]">
                  SYSTEM_3D_ONTOLOGY_V1.1
                </span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.85] text-white">
                DEEP_SPACE
                <br />
                <span className="text-[#00f2f2]">ARCHITECTURE</span>
              </h1>
              <p className="max-w-md text-neutral-500 uppercase tracking-widest text-[10px] leading-relaxed">
                Interactive 3D grid visualization of the SkillBridge cloud
                infrastructure. Rotate, zoom, and select nodes to analyze system
                telemetry and hierarchical mapping.
              </p>
            </div>
          </div>

          {/* Bottom Bar Metrics */}
          <div className="absolute bottom-12 left-8 z-10 flex gap-4 pointer-events-none">
            <div className="bg-black/60 border border-white/10 p-6 min-w-[180px] backdrop-blur-md">
              <div className="tactical-label text-neutral-600 mb-1 leading-none">
                RESOURCES
              </div>
              <div className="text-3xl font-black font-mono">24_UNITS</div>
            </div>
            <div className="bg-black/60 border border-white/10 p-6 min-w-[180px] backdrop-blur-md">
              <div className="tactical-label text-neutral-600 mb-1 leading-none">
                UPTIME
              </div>
              <div className="text-3xl font-black font-mono text-[#00f2f2]">
                99.99%
              </div>
            </div>
          </div>

          {/* Selected Node Sidebar */}
          <AnimatePresence>
            {selectedNode && (
              <motion.div
                initial={{ x: 400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 400, opacity: 0 }}
                className="absolute right-0 top-0 bottom-0 w-[400px] bg-black/80 border-l border-[#00f2f2]/20 p-10 z-50 backdrop-blur-2xl"
              >
                <div className="absolute top-0 left-0 w-1 h-24 bg-[#00f2f2]" />

                <button
                  onClick={() => setSelectedNode(null)}
                  className="absolute top-6 right-6 text-neutral-500 hover:text-[#00f2f2] transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="space-y-10">
                  <div className="space-y-4">
                    <div className="tactical-label text-[#00f2f2]">
                      {selectedNode.layer}
                    </div>
                    <h3 className="text-4xl font-black uppercase tracking-widest text-white leading-none">
                      {selectedNode.name}
                    </h3>
                    <div className="h-1 w-24 bg-[#00f2f2]" />
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[#00f2f2]">
                        <Info className="w-4 h-4" />
                        <span className="tactical-label text-[11px]">
                          TELEMETRY_DATA
                        </span>
                      </div>
                      <div className="bg-white/5 border border-white/5 p-6 rounded-sm space-y-4">
                        {selectedNode.metadata.specs && (
                          <div className="flex flex-col gap-1">
                            <span className="tactical-label text-[9px] text-neutral-600">
                              Configuration
                            </span>
                            <span className="text-sm font-mono text-white">
                              {selectedNode.metadata.specs}
                            </span>
                          </div>
                        )}
                        {selectedNode.metadata.runtime && (
                          <div className="flex flex-col gap-1">
                            <span className="tactical-label text-[9px] text-neutral-600">
                              Platform_Runtime
                            </span>
                            <span className="text-sm font-mono text-white">
                              {selectedNode.metadata.runtime}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-white/5">
                          <span className="tactical-label text-[9px] text-neutral-600">
                            Connection_Integrity
                          </span>
                          <span className="text-[#00f2f2] font-mono text-xs animate-pulse font-bold tracking-widest">
                            STABLE_98.2%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[#00f2f2]">
                        <Cpu className="w-4 h-4" />
                        <span className="tactical-label text-[11px]">
                          SYSTEM_ROLE
                        </span>
                      </div>
                      <p className="text-sm font-sans text-neutral-400 leading-relaxed uppercase tracking-wider font-medium">
                        {selectedNode.metadata.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-10 border-t border-white/5">
                    <div className="flex items-center gap-2 text-neutral-600">
                      <Terminal className="w-5 h-5" />
                      <span className="tactical-label text-[10px]">
                        US_EAST_1_NODE_CLUSTER_Z
                      </span>
                    </div>
                  </div>

                  <Link
                    href="/dashboard"
                    className="block w-full py-4 bg-[#00f2f2] text-black text-center font-black uppercase tracking-[0.2em] text-xs hover:bg-white transition-all shadow-[0_0_20px_rgba(0,242,242,0.3)] mt-8"
                  >
                    ACCESS_LOG_CONTROLLER
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Dynamic Scanline Overlay */}
        <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.01] scanline" />
      </div>

      <style jsx global>{`
        .scanline {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            to bottom,
            transparent 50%,
            rgba(37, 157, 244, 0.05) 50%
          );
          background-size: 100% 4px;
          animation: scan 10s linear infinite;
        }
        @keyframes scan {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
