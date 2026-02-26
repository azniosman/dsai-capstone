"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useInView } from "framer-motion";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  Command,
  FileText,
  Briefcase,
  GraduationCap,
  TrendingUp,
  BarChart3,
  Zap,
  Target,
  Compass,
  CheckCircle2,
  MoveRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfileWizard from "@/components/profile/profile-wizard";

// Dynamic imports — both are canvas-based and must be client-only
const BgCanvas = dynamic(
  () => import("@/components/landing/bg-canvas"),
  { ssr: false }
);
const NeuronCanvas = dynamic(
  () => import("@/components/landing/neuron-canvas"),
  { ssr: false }
);

// ── Motion variants ────────────────────────────────────────────────────────────
const reveal = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.02 } },
};
const up = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};
const fade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
};

function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      variants={reveal}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Data ───────────────────────────────────────────────────────────────────────
const QUICK_STATS = [
  { value: "500+", label: "Tech Roles", sub: "Singapore market" },
  { value: "87%", label: "Match Accuracy", sub: "vs recruiter shortlists" },
  { value: "50+", label: "SCTP Courses", sub: "SkillsFuture eligible" },
  { value: "3 min", label: "Profile to Results", sub: "Average time" },
];

const PLATFORM_FEATURES = [
  {
    icon: <FileText className="h-4 w-4" />,
    title: "Resume Parsing",
    desc: "Automated skill extraction from PDF/DOCX in under 5 seconds.",
  },
  {
    icon: <Target className="h-4 w-4" />,
    title: "AI Job Matching",
    desc: "Hybrid semantic scoring across 50+ Singapore tech roles.",
  },
  {
    icon: <BarChart3 className="h-4 w-4" />,
    title: "Skill Gap Analysis",
    desc: "Pinpoint exactly what stands between you and your target role.",
  },
  {
    icon: <GraduationCap className="h-4 w-4" />,
    title: "Upskilling Roadmap",
    desc: "Curated SCTP paths with SkillsFuture subsidy calculations.",
  },
];

const CAPABILITIES = [
  {
    icon: <FileText className="h-5 w-5" />,
    label: "Resume Parsing",
    stat: "< 5s",
    desc: "PDF and DOCX resume upload with automated skill and experience extraction.",
  },
  {
    icon: <Briefcase className="h-5 w-5" />,
    label: "Role Matching",
    stat: "50+",
    desc: "Coverage across Singapore's tech landscape with live salary benchmarks.",
  },
  {
    icon: <GraduationCap className="h-5 w-5" />,
    label: "SCTP Courses",
    stat: "100%",
    desc: "All recommendations include SkillsFuture-subsidised course pathways.",
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    label: "Market Intelligence",
    stat: "Live",
    desc: "Real-time demand signals and salary data from Singapore's job market.",
  },
];

const PROCESS = [
  {
    num: "01",
    icon: <FileText className="h-5 w-5" />,
    title: "Build Your Profile",
    desc: "Upload your resume or answer targeted questions about your experience, current skills, and career goals.",
  },
  {
    num: "02",
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Analyse Your Gaps",
    desc: "AI maps your current skill set against your target role using live Singapore market data and semantic matching.",
  },
  {
    num: "03",
    icon: <Compass className="h-5 w-5" />,
    title: "Get Your Roadmap",
    desc: "Receive a personalised learning path with curated SCTP courses, subsidy calculations, and clear next steps.",
  },
];

// ── Page ───────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const formRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const profileId = localStorage.getItem("profileId");
    if (token && profileId) router.replace("/dashboard");
  }, [router]);

  const scrollToForm = () =>
    formRef.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <>
      {/*
       * BgCanvas — fixed, z-index:0. Renders the flow-field directly onto a
       * canvas that sits BEHIND all page content. Every section with a
       * transparent or glass background will show the animation through it.
       */}
      <BgCanvas />

      {/*
       * Main content wrapper — position:relative, z-index:1 puts ALL content
       * above the fixed background canvas.
       */}
      <div className="relative text-foreground min-h-screen" style={{ zIndex: 1 }}>

        {/* ───────────────────────────────────────────────── NAVBAR */}
        <header
          className={`fixed top-0 left-0 right-0 z-50 h-[60px] border-b transition-all duration-200 ${
            scrolled
              ? "border-border bg-background/90 backdrop-blur-xl"
              : "border-transparent bg-transparent"
          }`}
        >
          <div className="container mx-auto px-6 lg:px-10 max-w-[1400px] h-full flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 border border-primary/30 bg-background/80 flex items-center justify-center text-primary shrink-0">
                <Command className="h-3.5 w-3.5" />
              </div>
              <div className="leading-none">
                <div className="font-black text-sm tracking-tight">
                  SkillBridge
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="live-dot" />
                  <span
                    className="section-label text-primary"
                    style={{ fontSize: "0.48rem" }}
                  >
                    Live
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex text-xs uppercase tracking-widest font-semibold text-muted-foreground hover:text-foreground"
                onClick={scrollToForm}
              >
                Platform
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex text-xs uppercase tracking-widest font-semibold text-muted-foreground hover:text-foreground"
                asChild
              >
                <a href="/login">Sign In</a>
              </Button>
              <Button
                size="sm"
                className="ml-2 text-xs uppercase tracking-widest font-bold"
                onClick={scrollToForm}
              >
                Get Started <MoveRight className="ml-1.5 h-3 w-3" />
              </Button>
            </div>
          </div>
        </header>

        {/* ───────────────────────────────────── 01 HERO */}
        <section className="min-h-screen flex flex-col justify-center border-b border-border pt-[60px] relative overflow-hidden">
          {/* Very subtle grid on top of the flow field */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
              backgroundSize: "80px 80px",
              opacity: 0.18,
            }}
          />
          {/* Radial vignette — focuses the eye on content */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 85% 70% at 50% 50%, transparent 20%, var(--background) 100%)",
              opacity: 0.55,
            }}
          />

          <div className="relative container mx-auto px-6 lg:px-10 max-w-[1400px] py-20 md:py-28">
            <motion.p
              variants={up}
              initial="hidden"
              animate="visible"
              className="section-label mb-10 md:mb-14"
            >
              01 — Career Intelligence Platform
            </motion.p>

            <div className="grid lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px] gap-14 lg:gap-20 items-end">
              {/* Left */}
              <div>
                <motion.h1
                  initial={{ opacity: 0, y: 32 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.1,
                    duration: 0.82,
                    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
                  }}
                  className="font-black tracking-[-0.04em] leading-[0.88] mb-10 text-foreground"
                  style={{ fontSize: "clamp(3rem, 7.5vw, 7rem)" }}
                >
                  Discover
                  <br />
                  Your Next
                  <br />
                  <span className="text-primary">Tech Career</span>
                  <br />
                  in Singapore.
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.28,
                    duration: 0.65,
                    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
                  }}
                  className="text-muted-foreground text-base md:text-lg leading-relaxed mb-10 max-w-md"
                >
                  AI-powered job matching, skill gap analysis, and personalised
                  upskilling roadmaps — built for Singapore&apos;s tech
                  professionals.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.42,
                    duration: 0.6,
                    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
                  }}
                  className="flex flex-wrap gap-3"
                >
                  <Button
                    size="lg"
                    onClick={scrollToForm}
                    className="font-bold uppercase tracking-wider text-xs px-7"
                  >
                    Start Free Assessment
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    asChild
                    className="font-bold uppercase tracking-wider text-xs px-7 bg-background/60 backdrop-blur-sm"
                  >
                    <a href="/login">Sign In</a>
                  </Button>
                </motion.div>
              </div>

              {/* Right — status panel */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="border-l border-border pl-8 lg:pl-10 self-center space-y-8 hidden lg:block"
              >
                {[
                  {
                    label: "Platform Status",
                    value: (
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <span className="live-dot" />
                        SG Market — Live
                      </span>
                    ),
                  },
                  { label: "Tech Roles Indexed", value: "500+" },
                  { label: "SCTP Courses", value: "50+" },
                  { label: "Time to Results", value: "3 min" },
                  { label: "SkillsFuture Eligible", value: "$0 cost" },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="section-label mb-1.5">{item.label}</p>
                    {typeof item.value === "string" ? (
                      <p className="text-sm font-black tracking-tight">
                        {item.value}
                      </p>
                    ) : (
                      item.value
                    )}
                  </div>
                ))}
              </motion.div>
            </div>
          </div>

          {/* Watermark section number */}
          <div
            className="absolute bottom-6 right-8 font-black leading-none select-none pointer-events-none text-border"
            style={{ fontSize: "clamp(5rem, 12vw, 10rem)", opacity: 0.35 }}
          >
            01
          </div>
        </section>

        {/* ─────────────────────────────────── 02 QUICK GLANCE */}
        <section className="border-b border-border bg-background/70 backdrop-blur-sm">
          <Reveal className="container mx-auto px-6 lg:px-10 max-w-[1400px]">
            <div className="py-5 border-b border-border">
              <motion.p variants={up} className="section-label">
                02 — Quick Glance
              </motion.p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
              {QUICK_STATS.map((stat) => (
                <motion.div
                  key={stat.label}
                  variants={up}
                  className="px-6 lg:px-10 py-10 md:py-14"
                >
                  <div
                    className="font-black tracking-[-0.04em] leading-none text-primary mb-3"
                    style={{ fontSize: "clamp(2.5rem, 4.5vw, 4rem)" }}
                  >
                    {stat.value}
                  </div>
                  <div className="font-bold text-sm text-foreground mb-1">
                    {stat.label}
                  </div>
                  <div className="text-xs text-muted-foreground">{stat.sub}</div>
                </motion.div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ─────────────────────────────────── 03 THE PLATFORM */}
        <section className="border-b border-border">
          <div className="container mx-auto px-6 lg:px-10 max-w-[1400px]">
            <Reveal className="py-5 border-b border-border">
              <motion.p variants={up} className="section-label">
                03 — The Platform
              </motion.p>
            </Reveal>

            <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
              {/* Left — editorial text + feature list */}
              <Reveal className="py-16 md:py-20 lg:pr-14">
                <motion.h2
                  variants={up}
                  className="font-black tracking-[-0.035em] leading-[1.02] text-foreground mb-8"
                  style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
                >
                  AI-powered career intelligence for Singapore&apos;s tech
                  ecosystem.
                </motion.h2>
                <motion.p
                  variants={up}
                  className="text-muted-foreground text-base leading-relaxed mb-10 max-w-lg"
                >
                  SkillBridge combines ML-powered job matching with live Singapore
                  market data to give SCTP learners and career-switchers the most
                  accurate, actionable recommendations available — free.
                </motion.p>
                <motion.div variants={up} className="space-y-3">
                  {PLATFORM_FEATURES.map((f) => (
                    <div
                      key={f.title}
                      className="group flex gap-4 items-start border border-border p-4 bg-background/50 backdrop-blur-sm hover:border-primary/50 hover:bg-primary/5 transition-colors duration-200"
                    >
                      <div className="h-8 w-8 border border-border flex items-center justify-center text-primary shrink-0 mt-0.5 group-hover:border-primary/50 group-hover:bg-primary/10 transition-colors">
                        {f.icon}
                      </div>
                      <div>
                        <div className="font-bold text-xs uppercase tracking-wider text-foreground mb-1">
                          {f.title}
                        </div>
                        <div className="text-xs text-muted-foreground leading-relaxed">
                          {f.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </Reveal>

              {/* Right — neuron canvas in LIGHT panel */}
              <Reveal className="py-16 md:py-20 lg:pl-14 flex flex-col justify-center">
                <motion.div
                  variants={fade}
                  className="relative overflow-hidden border border-border"
                  style={{
                    height: "460px",
                    // Soft lavender tint — light enough to read content but
                    // dark enough to contrast with the purple nodes
                    backgroundColor: "oklch(0.920 0.022 298)",
                  }}
                >
                  {/* Three.js neuron canvas in light mode */}
                  <NeuronCanvas mode="light" />

                  {/* Subtle bottom fade blending into the panel bg */}
                  <div
                    className="absolute bottom-0 inset-x-0 h-24 pointer-events-none z-[2]"
                    style={{
                      background:
                        "linear-gradient(to top, oklch(0.920 0.022 298) 0%, transparent 100%)",
                    }}
                  />

                  {/* Stats row — dark text for light panel */}
                  <div className="absolute bottom-0 inset-x-0 p-5 z-[3]">
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { v: "87%", l: "Accuracy" },
                        { v: "3 min", l: "To Results" },
                        { v: "$0", l: "SkillsFuture" },
                      ].map((s) => (
                        <div
                          key={s.l}
                          className="border border-border bg-background/55 backdrop-blur-sm px-3 py-2.5 text-center"
                        >
                          <div className="font-black text-base text-primary leading-none mb-0.5">
                            {s.v}
                          </div>
                          <div className="text-[0.58rem] text-muted-foreground uppercase tracking-widest">
                            {s.l}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top label */}
                  <div className="absolute top-4 left-4 z-[3]">
                    <span className="section-label text-primary/60">
                      Neural Match Engine
                    </span>
                  </div>
                </motion.div>

                <motion.p
                  variants={up}
                  className="text-xs text-muted-foreground leading-relaxed mt-5"
                >
                  Hybrid scoring: 0.55 × content similarity + 0.25 × rule match
                  + 0.20 × career-switch bonus — calibrated on Singapore&apos;s
                  SCTP ecosystem.
                </motion.p>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────── 04 CAPABILITIES */}
        <section className="border-b border-border bg-background/70 backdrop-blur-sm">
          <div className="container mx-auto px-6 lg:px-10 max-w-[1400px]">
            <Reveal className="py-5 border-b border-border flex items-center justify-between gap-4">
              <motion.p variants={up} className="section-label">
                04 — Capabilities
              </motion.p>
              <motion.p
                variants={up}
                className="text-xs text-muted-foreground hidden sm:block"
              >
                Everything you need to switch careers.
              </motion.p>
            </Reveal>

            <Reveal className="grid sm:grid-cols-2 lg:grid-cols-4">
              {CAPABILITIES.map((cap, i) => (
                <motion.div
                  key={cap.label}
                  variants={up}
                  className={`p-8 md:p-10 group hover:bg-primary/5 transition-colors duration-200 ${
                    i > 0 ? "sm:border-l border-border" : ""
                  }`}
                >
                  <div className="h-10 w-10 border border-border flex items-center justify-center text-primary mb-6 group-hover:border-primary/50 group-hover:bg-primary/5 transition-colors">
                    {cap.icon}
                  </div>
                  <div
                    className="font-black tracking-[-0.03em] text-primary mb-2 leading-none"
                    style={{ fontSize: "clamp(2rem, 3vw, 2.5rem)" }}
                  >
                    {cap.stat}
                  </div>
                  <div className="font-bold text-xs uppercase tracking-wider text-foreground mb-3">
                    {cap.label}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {cap.desc}
                  </p>
                </motion.div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ─────────────────────────────────── 05 HOW IT WORKS */}
        <section className="border-b border-border">
          <div className="container mx-auto px-6 lg:px-10 max-w-[1400px]">
            <Reveal className="py-5 border-b border-border">
              <motion.p variants={up} className="section-label">
                05 — How It Works
              </motion.p>
            </Reveal>

            <Reveal className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
              {PROCESS.map((step) => (
                <motion.div
                  key={step.num}
                  variants={up}
                  className="p-8 md:p-12 lg:p-14"
                >
                  <div
                    className="font-black leading-none select-none mb-6 text-border"
                    style={{
                      fontSize: "clamp(4rem, 7vw, 6rem)",
                      opacity: 0.45,
                    }}
                  >
                    {step.num}
                  </div>
                  <div className="h-10 w-10 border border-border flex items-center justify-center text-primary mb-6">
                    {step.icon}
                  </div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-foreground mb-4">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </motion.div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ─────────────────────────────────── 06 GET STARTED */}
        <section
          id="form-section"
          ref={formRef}
          className="border-b border-border bg-background/70 backdrop-blur-sm"
        >
          <div className="container mx-auto px-6 lg:px-10 max-w-[1400px]">
            <Reveal className="py-5 border-b border-border">
              <motion.p variants={up} className="section-label">
                06 — Get Started
              </motion.p>
            </Reveal>

            <div className="grid lg:grid-cols-[360px_1fr] xl:grid-cols-[420px_1fr] divide-y lg:divide-y-0 lg:divide-x divide-border">
              {/* Left — CTA */}
              <Reveal className="py-14 lg:py-20 lg:pr-14">
                <motion.h2
                  variants={up}
                  className="font-black tracking-[-0.035em] leading-[1.0] text-foreground mb-6"
                  style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)" }}
                >
                  Build your career profile.
                </motion.h2>
                <motion.p
                  variants={up}
                  className="text-sm text-muted-foreground leading-relaxed mb-8"
                >
                  Answer a few targeted questions and unlock your personalised
                  Singapore tech career roadmap — completely free, no
                  commitment.
                </motion.p>
                <motion.div variants={up} className="space-y-3">
                  {[
                    {
                      icon: <CheckCircle2 className="h-4 w-4" />,
                      text: "Resume parsed in under 5 seconds",
                    },
                    {
                      icon: <CheckCircle2 className="h-4 w-4" />,
                      text: "50+ tech roles matched instantly",
                    },
                    {
                      icon: <CheckCircle2 className="h-4 w-4" />,
                      text: "SCTP courses with subsidy breakdown",
                    },
                    {
                      icon: <Zap className="h-4 w-4" />,
                      text: "Full roadmap in under 3 minutes",
                    },
                  ].map((item) => (
                    <div
                      key={item.text}
                      className="flex items-center gap-3 text-sm text-muted-foreground"
                    >
                      <span className="text-primary shrink-0">{item.icon}</span>
                      {item.text}
                    </div>
                  ))}
                </motion.div>
              </Reveal>

              {/* Right — Profile Wizard */}
              <Reveal className="py-14 lg:py-20 lg:pl-14">
                <motion.div variants={fade}>
                  <ProfileWizard />
                </motion.div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────── FOOTER */}
        <footer className="border-t border-border bg-background/80 backdrop-blur-md">
          <div className="container mx-auto px-6 lg:px-10 max-w-[1400px] py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 border border-primary/30 bg-background flex items-center justify-center text-primary">
                <Command className="h-3 w-3" />
              </div>
              <span className="text-sm font-black tracking-tight">
                SkillBridge
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Built for Singapore&apos;s SCTP learners and career-switchers.
            </p>
            <div className="flex items-center gap-2">
              <span className="live-dot" />
              <span className="text-xs text-muted-foreground">
                Systems operational
              </span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
