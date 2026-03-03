"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Terminal, Home, BarChart3, FolderOpen, Settings } from "lucide-react";
import { HeroSection } from "@/components/sections/landing/hero-section";
import { ValuePropsSection } from "@/components/sections/landing/value-props-section";
import { MarqueeSection } from "@/components/sections/landing/marquee-section";
import { FeaturesSection } from "@/components/sections/landing/features-section";
import { HowItWorksSection } from "@/components/sections/landing/how-it-works-section";
import { CtaSection } from "@/components/sections/landing/cta-section";
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
    <div className="bg-background-dark font-display text-slate-100 min-h-screen selection:bg-primary selection:text-background-dark">
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
        {/* Background Grid Effect */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(37, 157, 244, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(37, 157, 244, 0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 flex items-center bg-background-dark/80 backdrop-blur-md border-b border-primary/20 px-4 md:px-8 h-16 justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="text-primary w-7 h-7" />
            <h2 className="text-slate-100 text-lg font-bold leading-tight tracking-tight uppercase">
              SKLBR CI System
            </h2>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/login"
              className="text-slate-400 hover:text-primary font-mono text-xs font-bold uppercase tracking-widest transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login?tab=register"
              className="bg-primary/10 border border-primary/30 text-primary hover:bg-primary hover:text-background-dark px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest transition-all"
            >
              Create Node
            </Link>
          </nav>
        </header>

        {/* Page Sections */}
        <main className="flex-1 relative z-10">
          <HeroSection />
          <ValuePropsSection />
          <FeaturesSection />
          <MarqueeSection />
          <HowItWorksSection />
          <CtaSection />
        </main>

        <FooterSection />

        {/* Bottom Navigation Bar (Mobile) */}
        <nav className="fixed bottom-0 w-full z-50 md:hidden border-t border-primary/20 bg-background-dark/95 backdrop-blur-lg px-4 pb-6 pt-3 flex justify-around">
          <Link
            href="/"
            className="flex flex-col items-center justify-center gap-1 text-primary"
          >
            <Home className="w-5 h-5" />
            <p className="text-[10px] font-bold uppercase tracking-widest">
              Home
            </p>
          </Link>
          <Link
            href="/skill-gap"
            className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-primary transition-colors"
          >
            <BarChart3 className="w-5 h-5" />
            <p className="text-[10px] font-bold uppercase tracking-widest">
              Analytics
            </p>
          </Link>
          <Link
            href="/profile-builder"
            className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-primary transition-colors"
          >
            <FolderOpen className="w-5 h-5" />
            <p className="text-[10px] font-bold uppercase tracking-widest">
              Dossier
            </p>
          </Link>
          <Link
            href="/account"
            className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-primary transition-colors"
          >
            <Settings className="w-5 h-5" />
            <p className="text-[10px] font-bold uppercase tracking-widest">
              Config
            </p>
          </Link>
        </nav>

        {/* Dynamic Scanline */}
        <div className="fixed top-0 left-0 w-full h-1 bg-primary/20 blur-sm pointer-events-none z-100" />
      </div>
    </div>
  );
}
