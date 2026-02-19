"use client";

import { useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  FileText,
  Briefcase,
  GraduationCap,
  TrendingUp,
  Command,
  ArrowDown,
  BarChart3,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ProfileWizard from "@/components/profile/profile-wizard";

const FEATURES = [
  {
    icon: <FileText className="h-5 w-5" />,
    label: "Resume Parsing",
    desc: "Automated extraction of skills and experience",
    stat: "< 5s",
  },
  {
    icon: <Briefcase className="h-5 w-5" />,
    label: "50+ Tech Roles",
    desc: "Deep coverage of Singapore's tech landscape",
    stat: "50+",
  },
  {
    icon: <GraduationCap className="h-5 w-5" />,
    label: "SCTP Courses",
    desc: "SkillsFuture-eligible upskilling paths",
    stat: "100%",
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    label: "Market Intelligence",
    desc: "Real-time salary and demand data",
    stat: "Live",
  },
];

const STATS = [
  { value: "500+", label: "Tech Roles", sub: "Singapore market" },
  { value: "50+", label: "SCTP Courses", sub: "Subsidised" },
  { value: "10k+", label: "Professionals", sub: "Career-switching" },
];

export default function LandingPage() {
  const formRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const profileId = localStorage.getItem("profileId");
    if (token && profileId) {
      router.replace("/dashboard");
    }
  }, [router]);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="bg-background min-h-screen">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded bg-primary flex items-center justify-center text-primary-foreground shrink-0">
              <Command className="h-4 w-4" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight">
                SkillBridge
              </span>
              <div className="flex items-center gap-1.5">
                <span className="live-dot" />
                <span
                  className="section-label text-primary"
                  style={{ fontSize: "0.5rem" }}
                >
                  Live
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={scrollToForm}>
              Get Started
            </Button>
            <Button size="sm" asChild>
              <a href="/login">
                Sign In <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section
        className="py-24 md:py-32 border-b border-border relative overflow-hidden"
        style={{
          backgroundImage: `radial-gradient(hsl(0 0% 78% / 0.6) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      >
        {/* Subtle cyan glow behind hero text */}
        <div
          className="absolute inset-x-0 top-0 h-64 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 0%, hsl(190 100% 50% / 0.06), transparent)",
          }}
        />

        <div className="container mx-auto px-6 max-w-5xl relative">
          <div className="text-center max-w-3xl mx-auto mb-16">
            {/* System status pill */}
            <div className="inline-flex items-center gap-2 border border-border bg-card rounded px-3 py-1.5 mb-6">
              <span className="live-dot" />
              <span className="text-xs font-semibold text-muted-foreground tracking-wide">
                SG Labor Market — Data Updated
              </span>
              <span className="text-xs font-bold text-primary">LIVE</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6 leading-[1.1]">
              Discover Your Next
              <br />
              <span className="text-primary">Tech Career</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto">
              AI-powered job matching, skill gap analysis, and personalised
              upskilling roadmaps — built for Singapore&apos;s tech
              professionals.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Button size="xl" onClick={scrollToForm}>
                Start Free Assessment <ArrowDown className="ml-2 h-4 w-4" />
              </Button>
              <Button size="xl" variant="outline" asChild>
                <a href="/login">Sign In</a>
              </Button>
            </div>
          </div>

          {/* Stats Row — terminal-style data blocks */}
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto border-t border-border pt-12">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="text-center border border-border rounded bg-card p-4"
              >
                <div className="kpi-number-accent text-3xl mb-1">{s.value}</div>
                <div className="text-xs font-semibold text-foreground">
                  {s.label}
                </div>
                <div className="text-[0.65rem] text-muted-foreground mt-0.5">
                  {s.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 border-b border-border">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center mb-12">
            <p className="section-label mb-3">Platform Capabilities</p>
            <h2 className="text-3xl font-extrabold tracking-tight">
              Everything you need to level up
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.label}
                className="group p-6 rounded border border-border bg-card hover:border-primary/50 transition-all duration-150 relative overflow-hidden"
              >
                {/* Top accent strip on hover */}
                <div className="absolute inset-x-0 top-0 h-[2px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />

                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                    {f.icon}
                  </div>
                  <Badge variant="data" className="text-[0.6rem]">
                    {f.stat}
                  </Badge>
                </div>
                <h3 className="font-bold text-sm mb-1.5">{f.label}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why SkillBridge — data panel row ── */}
      <section className="py-16 border-b border-border bg-card/30">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-border rounded p-6 bg-card">
              <BarChart3 className="h-6 w-6 text-primary mb-4" />
              <div className="text-2xl font-extrabold data-num mb-1">87%</div>
              <p className="text-sm font-semibold mb-1">Accuracy Rate</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Our hybrid AI scores skills with 87% alignment to actual
                recruiter shortlists.
              </p>
            </div>

            <div className="border-l-[3px] border-l-primary border border-border rounded p-6 bg-card">
              <Zap className="h-6 w-6 text-primary mb-4" />
              <div className="text-2xl font-extrabold data-num mb-1">3 min</div>
              <p className="text-sm font-semibold mb-1">Profile to Results</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Complete a short profile and get your personalised roadmap in
                under 3 minutes.
              </p>
            </div>

            <div className="border border-border rounded p-6 bg-card">
              <GraduationCap className="h-6 w-6 text-primary mb-4" />
              <div className="text-2xl font-extrabold data-num mb-1">$0</div>
              <p className="text-sm font-semibold mb-1">
                SkillsFuture Eligible
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All recommended SCTP courses qualify for full SkillsFuture
                subsidies.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Profile Wizard ── */}
      <section id="form-section" ref={formRef} className="py-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="text-center mb-12">
            <p className="section-label mb-3">Get Started</p>
            <h2 className="text-3xl font-extrabold tracking-tight">
              Build your career profile
            </h2>
            <p className="text-muted-foreground mt-3 text-sm">
              Answer a few questions to unlock your personalised roadmap.
            </p>
          </div>
          <ProfileWizard />
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center text-primary-foreground">
              <Command className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-bold tracking-tight">
              SkillBridge
            </span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Built for Singapore&apos;s SCTP learners and career-switchers.
          </p>
          <div className="flex items-center gap-1.5">
            <span className="live-dot" />
            <span className="text-xs text-muted-foreground">
              Systems operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
