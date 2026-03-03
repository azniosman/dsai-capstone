"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Terminal } from "lucide-react";
import { HeroSection } from "@/components/sections/landing/hero-section";
import { FeaturesSection } from "@/components/sections/landing/features-section";
import { MarqueeSection } from "@/components/sections/landing/marquee-section";
import { FooterSection } from "@/components/sections/landing/footer-section";

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const profileId = localStorage.getItem("profileId");
    if (token && token.length > 50 && profileId) {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <div className="bg-background font-display text-slate-100 min-h-screen selection:bg-[#00f2f2] selection:text-black">
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
        {/* Tactical Header */}
        <header className="fixed top-0 z-50 w-full bg-background/50 backdrop-blur-xl border-b border-white/5 px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div
              className="flex items-center gap-3 group cursor-pointer"
              onClick={() => router.push("/")}
            >
              <div className="w-10 h-10 bg-[#00f2f2] flex items-center justify-center rounded-sm">
                <Terminal className="text-black w-6 h-6" />
              </div>
              <h2 className="text-white text-xl font-black leading-tight tracking-[0.1em] uppercase">
                SKLBR - Career Intelligence
              </h2>
            </div>

            <nav className="hidden lg:flex items-center gap-8">
              <Link
                href="/operations"
                className="tactical-label text-neutral-400 hover:text-[#00f2f2] transition-colors tracking-[0.2em] font-black underline decoration-[#00f2f2]/20 underline-offset-4"
              >
                OPERATIONS
              </Link>
              {["NODES", "DOSSIER", "LOGS"].map((item) => (
                <Link
                  key={item}
                  href="#"
                  className="tactical-label text-neutral-400 hover:text-[#00f2f2] transition-colors tracking-[0.2em] font-black"
                >
                  {item}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="bg-[#00f2f2] text-black px-6 h-12 flex items-center font-black uppercase text-xs tracking-widest hover:bg-white transition-all shadow-[0_0_15px_rgba(0,242,242,0.2)]"
            >
              SKLBR_LOGIN
            </Link>
          </div>
        </header>

        {/* Page Sections */}
        <main className="flex-1">
          <HeroSection />

          {/* Subdued Features Sections */}
          <div className="relative z-10 opacity-40 hover:opacity-100 transition-opacity duration-700 contrast-125 grayscale hover:grayscale-0">
            <MarqueeSection />
            <FeaturesSection />
          </div>
        </main>

        <FooterSection />

        {/* Bottom System Log Ticker */}
        <div className="fixed bottom-0 w-full z-50 bg-black/90 border-t border-white/5 h-10 px-8 flex items-center justify-between backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="tactical-label text-neutral-500 whitespace-nowrap">
              SYSTEM_LOG_TICKER:
            </div>
            <div className="w-24 h-1 bg-white/5 relative overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-[#00f2f2]/50 w-1/3 animate-scan"
                style={{ animationDuration: "3s" }}
              />
            </div>
          </div>

          <div className="flex items-center gap-8 hidden sm:flex">
            <div className="tactical-label text-neutral-600">
              REGION: SG-CENTRAL
            </div>
            <div className="tactical-label text-neutral-600">
              SERVER: AP-SOUTHEAST-1
            </div>
          </div>
        </div>

        {/* Dynamic Scanline Overlay */}
        <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.015] scanline" />
      </div>
    </div>
  );
}
