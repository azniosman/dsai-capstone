"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Command,
  FileText,
  Target,
  BarChart3,
  CheckCircle2,
  Compass,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfileBuilderStore } from "@/store/profileBuilderStore";

const GlobeCanvas = dynamic(
  () => import("@/components/landing/globe-canvas"),
  { ssr: false },
);

// ── Data ───────────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: <FileText className="h-5 w-5" />,
    title: "Instant Skills Parsing",
    desc: "Drop your PDF/DOCX and watch our AI extract your technical skills in under 5 seconds.",
  },
  {
    icon: <Target className="h-5 w-5" />,
    title: "Smart Role Matching",
    desc: "We analyze your extracted profile against 50+ localized tech roles to find your optimal fit.",
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Actionable Roadmaps",
    desc: "Receive curated SCTP pathways and exact skill gap bridging tailored to Singapore's ecosystem.",
  },
];

const STEPS = [
  {
    num: "01",
    icon: <FileText className="h-5 w-5" />,
    title: "Build Your Profile",
    desc: "Upload your resume so our AI can extract your professional baseline instantly.",
  },
  {
    num: "02",
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Discover Your Gaps",
    desc: "Compare your skills against your target role requirements using live market data.",
  },
  {
    num: "03",
    icon: <Compass className="h-5 w-5" />,
    title: "Get Your Roadmap",
    desc: "Follow a personalized learning path with curated, subsidized SCTP courses.",
  },
];

// ── Shared Motion Variants ─────────────────────────────────────────────────────
import { Variants } from "framer-motion";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

export default function CompactLandingPage() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const openProfileBuilder = useProfileBuilderStore((state) => state.open);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // If securely logged in, redirect them directly to their personalized dashboard
    const token = localStorage.getItem("token");
    const profileId = localStorage.getItem("profileId");

    // Minimal validity check: token should be a string of reasonable length
    if (token && token.length > 50 && profileId) {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <>
      <div className="relative z-10 text-foreground min-h-screen flex flex-col pt-[60px]">
        {/* ── NAVBAR ──────────────────────────────────────────────────────────── */}
        <header
          className={`fixed top-0 left-0 right-0 z-50 h-[60px] border-b transition-all duration-200 ${
            scrolled
              ? "border-border bg-background/90 backdrop-blur-xl"
              : "border-transparent bg-transparent"
          }`}
        >
          <div className="container mx-auto px-6 max-w-6xl h-full flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 border border-primary/30 bg-background/80 flex items-center justify-center text-primary shrink-0">
                <Command className="h-4 w-4" />
              </div>
              <div className="font-black text-sm tracking-tight">
                SkillBridge
              </div>
              <div className="hidden sm:flex items-center gap-1.5 ml-2 border border-border rounded-full px-2 py-0.5 bg-background/50">
                <span className="live-dot" />
                <span className="text-[0.6rem] font-medium text-muted-foreground uppercase tracking-widest leading-none">
                  SG Market Live
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex text-xs uppercase font-bold text-muted-foreground hover:text-foreground"
                asChild
              >
                <a href="/login">Sign In</a>
              </Button>
              <Button
                size="sm"
                className="text-xs uppercase font-bold tracking-widest px-5 h-8"
                onClick={openProfileBuilder}
              >
                Get Started
              </Button>
            </div>
          </div>
        </header>

        {/* ── HERO ────────────────────────────────────────────────────────────── */}
        <section className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* Text column */}
          <motion.div
            className="w-full lg:w-1/2 flex flex-col justify-center items-center lg:items-start py-20 lg:py-0 px-8 lg:px-12 xl:px-20 relative z-10 text-center lg:text-left"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 border border-border bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full mb-8"
            >
              <Target className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                AI Career Intelligence
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="font-black tracking-[-0.04em] leading-[1.0] text-foreground mb-8 text-4xl sm:text-5xl md:text-6xl lg:text-6xl xl:text-7xl"
            >
              Discover Your Next <br />
              <span className="text-primary">Tech Career</span> Target.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-muted-foreground text-base sm:text-lg md:text-xl leading-relaxed mb-10 max-w-xl"
            >
              AI-powered job matching, skill gap analysis, and tailored
              upskilling roadmaps—built exclusively for Singapore&apos;s tech
              ecosystem.
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
            >
              <Button
                size="lg"
                className="w-full sm:w-auto h-14 px-8 text-sm font-bold uppercase tracking-widest shadow-xl shadow-primary/20"
                onClick={openProfileBuilder}
              >
                Build Your Career Profile{" "}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>

          {/* Globe column */}
          <div className="w-full lg:w-1/2 h-[460px] lg:h-auto relative self-stretch">
            <GlobeCanvas />
          </div>
        </section>

        {/* ── 3-CARD FEATURES ─────────────────────────────────────────────────── */}
        <section className="border-y border-border bg-background/60 backdrop-blur-xl relative z-10">
          <div className="container mx-auto px-6 max-w-6xl py-12 md:py-20">
            <div className="grid md:grid-cols-3 gap-6 md:gap-10">
              {FEATURES.map((feature, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center text-center p-6 border border-border/50 bg-background/50 rounded-2xl hover:border-primary/50 transition-colors"
                >
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-5">
                    {feature.icon}
                  </div>
                  <h3 className="font-bold text-base mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3-STEP PROCESS ──────────────────────────────────────────────────── */}
        <section className="bg-muted/10 relative z-10 py-16 md:py-24 border-b border-border">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-2xl md:text-4xl font-black tracking-tight mb-4">
                How It Works
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
                Three simple steps to unlock your personalized tech roadmap.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-10 md:gap-6 relative">
              {/* Connecting Line for MD viewports */}
              <div className="hidden md:block absolute top-[45px] left-[15%] right-[15%] h-px bg-border/80 -z-10" />

              {STEPS.map((step, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center text-center relative bg-background/0"
                >
                  <div className="h-20 w-20 rounded-full bg-background border-2 border-primary/20 flex flex-col items-center justify-center mb-6 shadow-xl shadow-primary/5">
                    <div className="text-xs font-black text-muted-foreground opacity-50 mb-0.5">
                      {step.num}
                    </div>
                    <div className="text-primary">{step.icon}</div>
                  </div>
                  <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-[260px]">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA & FOOTER ──────────────────────────────────────────────── */}
        <section className="bg-background relative z-10">
          {/* CTA */}
          <div className="border-b border-border py-20 px-6 text-center">
            <div className="max-w-xl mx-auto space-y-8">
              <h2 className="text-3xl md:text-4xl font-black tracking-tight">
                Ready to pivot your career?
              </h2>
              <p className="text-muted-foreground text-base">
                It takes 3 minutes and it&apos;s completely free. Get matched
                instantly.
              </p>
              <Button
                size="lg"
                className="h-12 px-8 font-bold uppercase tracking-widest"
                onClick={openProfileBuilder}
              >
                Launch Profile Builder
              </Button>

              <div className="flex items-center justify-center gap-6 text-xs font-semibold text-muted-foreground mt-8">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> 100%
                  Free
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> No
                  Credit Card
                </span>
              </div>
            </div>
          </div>

          {/* Minimal Links / Copyright */}
          <footer className="container mx-auto px-6 max-w-6xl h-16 flex items-center justify-between text-xs text-muted-foreground">
            <div>
              &copy; {new Date().getFullYear()} SkillBridge. All rights
              reserved.
            </div>
            <div className="flex items-center gap-4">
              <span>Built for SG SCTP.</span>
              <div className="flex items-center gap-1.5">
                <span className="live-dot" /> Online
              </div>
            </div>
          </footer>
        </section>
      </div>
    </>
  );
}
