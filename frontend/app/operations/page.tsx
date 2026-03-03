"use client";

import React from "react";
import { Terminal, Activity, Cloud } from "lucide-react";
import Link from "next/link";
import { OperationsDiagram } from "@/components/sections/operations/operations-diagram";

export default function OperationsPage() {
  return (
    <div className="min-h-screen bg-background font-display text-slate-100 selection:bg-[#00f2f2] selection:text-black overflow-hidden relative">
      <div className="absolute inset-0 z-0">
        <OperationsDiagram />
      </div>

      {/* Header - Interactive layer on top */}
      <header className="fixed top-0 z-50 w-full bg-background/50 backdrop-blur-xl border-b border-white/5 px-8 h-20 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-[#00f2f2] flex items-center justify-center rounded-sm group-hover:bg-white transition-colors">
              <Terminal className="text-black w-6 h-6" />
            </div>
            <h2 className="text-white text-xl font-black leading-tight tracking-[0.1em] uppercase">
              SKLBR_INTEL // OPS
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

      {/* Floating Info Overlay (Top Left) */}
      <div className="absolute top-32 left-8 z-10 pointer-events-none">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.85] text-white">
            DEEP_SPACE
            <br />
            <span className="text-[#00f2f2]">ARCHITECTURE</span>
          </h1>
          <p className="max-w-md text-neutral-500 uppercase tracking-widest text-[10px] leading-relaxed">
            Interactive mapping of the SkillBridge cloud infrastructure. Pan,
            zoom, and select nodes to analyze system telemetry and operations.
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

      {/* Dynamic Scanline Overlay */}
      <div className="fixed inset-0 pointer-events-none z-100 opacity-[0.01] scanline" />

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
