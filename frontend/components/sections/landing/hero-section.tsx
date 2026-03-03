"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Map as MapIcon,
  Layers,
  MousePointer2,
  Plus,
  Minus,
  Navigation,
  X,
} from "lucide-react";
import ProfileBuilderPage from "@/app/profile-builder/page";

export function HeroSection() {
  const [showProfileModal, setShowProfileModal] = useState(false);

  return (
    <section className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background">
      {/* Background Pre-rendered Map */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 opacity-60 pointer-events-none">
          {/* Tactical pre-rendered background */}
          <div className="w-full h-full bg-[url('/tactical-map-sg.png')] bg-cover bg-center" />
        </div>
        <div className="absolute inset-0 map-vignette z-1" />
        <div className="absolute inset-0 grid-pattern opacity-20 z-1" />
      </div>

      <div className="relative z-10 w-full max-w-[1400px] px-8 h-full flex flex-col justify-center pt-20">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-2 mb-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm border border-[#00f2f2]/20 bg-[#00f2f2]/5">
            <div className="w-2 h-2 rounded-full bg-[#00f2f2] animate-pulse shadow-[0_0_8px_#00f2f2]" />
            <span className="tactical-label text-[#00f2f2]">
              SYSTEM_LIVE: NODE_SG_ACTIVE
            </span>
          </div>
        </motion.div>

        <motion.h1
          className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9] uppercase max-w-4xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          CAREER_INTELLIGENCE:
          <br />
          <span className="text-[#00f2f2] drop-shadow-[0_0_15px_rgba(0,242,242,0.3)]">
            SINGAPORE
          </span>
          _SKLBR
        </motion.h1>

        <motion.p
          className="mt-8 text-neutral-400 max-w-md font-sans text-lg leading-relaxed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Empowering your career with seamless SkillsFuture integration and
          real-time market insights. Bridging the gap between individual talent
          and national digital demand.
        </motion.p>

        <motion.div
          className="mt-12 flex flex-wrap gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <button
            onClick={() => setShowProfileModal(true)}
            className="group relative h-16 px-8 bg-[#00f2f2] text-black font-black uppercase tracking-widest flex items-center gap-3 hover:bg-white transition-all shadow-[0_0_20px_rgba(0,242,242,0.4)] overflow-hidden"
          >
            {/* Scanline Effect Animation Layer */}
            <div className="absolute inset-0 z-0">
              <div className="w-10 h-full bg-white/40 blur-sm skew-x-[-20deg] animate-[scan_2.5s_ease-in-out_infinite]" />
            </div>

            <MousePointer2 className="relative z-10 w-5 h-5 fill-current" />
            <span className="relative z-10">INITIALIZE_DOSSIER_VIA_SKLBR</span>

            {/* Inline keyframes for scan effect */}
            <style jsx>{`
              @keyframes scan {
                0% {
                  transform: translateX(-150%);
                }
                100% {
                  transform: translateX(350%);
                }
              }
            `}</style>
          </button>

          <button className="h-16 px-8 border border-[#00f2f2]/30 text-[#00f2f2] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-[#00f2f2]/10 transition-all backdrop-blur-md">
            VIEW_LIVE_MATRIX
          </button>
        </motion.div>

        {/* Stats Grid */}
        <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-16 max-w-6xl">
          <div className="space-y-1">
            <div className="tactical-label text-neutral-500">LAT_COORD</div>
            <div className="text-2xl font-mono tracking-tighter text-white">
              1.3521° N
            </div>
          </div>
          <div className="space-y-1">
            <div className="tactical-label text-neutral-500">LONG_COORD</div>
            <div className="text-2xl font-mono tracking-tighter text-white">
              103.8198° E
            </div>
          </div>
          <div className="space-y-1">
            <div className="tactical-label text-neutral-500">ACTIVE_NODES</div>
            <div className="text-2xl font-mono tracking-tighter text-[#00f2f2]">
              14,282
            </div>
          </div>
          <div className="space-y-1">
            <div className="tactical-label text-neutral-500">SYSTEM_UPTIME</div>
            <div className="text-2xl font-mono tracking-tighter text-[#00f2f2]">
              99.99%
            </div>
          </div>
        </div>
      </div>

      {/* Floating Map Controls */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
        {[Layers, Navigation, Plus, Minus].map((Icon, idx) => (
          <button
            key={idx}
            className="w-12 h-12 flex items-center justify-center bg-black/60 border border-white/10 hover:border-[#00f2f2]/50 transition-all group backdrop-blur-md"
          >
            <Icon className="w-5 h-5 text-white group-hover:text-[#00f2f2] transition-colors" />
          </button>
        ))}
      </div>

      {/* Map Tooltip Mockup */}
      <div className="absolute bottom-[50%] right-[25%] z-10 pointer-events-none">
        <div className="relative">
          <div className="absolute top-0 left-0 w-4 h-4 rounded-full bg-[#ff3b3b] shadow-[0_0_12px_#ff3b3b] animate-ping" />
          <div className="absolute top-0 left-0 w-2.5 h-2.5 rounded-full bg-[#ff3b3b] m-0.75" />

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-48 bg-black/90 border border-white/20 p-2 backdrop-blur-md">
            <div className="tactical-label text-white text-[8px]">
              CHANGI_TECH_HUB
            </div>
            <div className="text-[#ff3b3b] text-[9px] font-mono mt-1 font-bold">
              HIGH_DEMAND: CYBER_SEC
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-black border-r border-b border-white/20 rotate-45" />
          </div>
        </div>
      </div>

      {/* Background scanline effect overlay */}
      <div className="absolute inset-0 pointer-events-none z-30 opacity-[0.03] scanline" />

      {/* Profile Builder Profile Modal Overlay */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="relative w-full max-w-[1200px] h-[90vh] bg-background border border-[#00f2f2]/30 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,242,242,0.15)] flex flex-col"
            >
              <button
                onClick={() => setShowProfileModal(false)}
                className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-[#00f2f2]/20 text-muted-foreground hover:text-[#00f2f2] border border-white/10 hover:border-[#00f2f2]/50 rounded-full backdrop-blur-md transition-all group"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex-1 w-full h-full overflow-y-auto">
                <ProfileBuilderPage />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
