"use client";

import { Mic2, Brain, Target, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useModalStore } from "@/store/modalStore";

const FEATURES = [
  {
    icon: Brain,
    title: "AI interviewer",
    description:
      "Powered by Google Gemini — asks real-world questions for your chosen role and difficulty.",
  },
  {
    icon: Target,
    title: "Gap-targeted questions",
    description:
      "If you have a profile, the interviewer focuses on the skills you're missing most.",
  },
  {
    icon: Mic2,
    title: "5-question format",
    description:
      "Short, focused sessions you can complete in under 15 minutes at any time.",
  },
  {
    icon: Award,
    title: "Session feedback",
    description:
      "After the final question the AI summarises your performance with improvement tips.",
  },
];

const ROLES = [
  "Software Engineer",
  "Data Scientist",
  "ML Engineer",
  "Data Engineer",
  "Cloud Architect",
];

export default function InterviewPage() {
  const { openModal } = useModalStore();

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <header>
        <p className="section-label mb-1">Practice</p>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Mock Interview
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Sharpen your interview skills with an AI-powered practice session
          tailored to your target role. Get real-time feedback after every
          5-question round.
        </p>
      </header>

      {/* CTA card */}
      <Card variant="elevated" className="overflow-hidden">
        <CardContent className="p-0">
          {/* Visual header strip */}
          <div className="relative bg-primary/5 border-b border-border/40 px-8 py-10 flex flex-col items-center gap-5">
            {/* Animated orb */}
            <div className="relative flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
              <span className="absolute inset-2 rounded-full bg-primary/8" />
              <div className="relative z-10 w-20 h-20 rounded-full bg-background border border-border/60 shadow-lg flex items-center justify-center">
                <Mic2 className="h-9 w-9 text-primary" />
              </div>
            </div>

            <div className="text-center">
              <p className="font-bold text-base">Choose your role and go</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Select difficulty, pick a role, and the interviewer will start
                straight away.
              </p>
            </div>

            <Button
              size="xl"
              className="gap-2.5 px-8"
              onClick={() => openModal("interview")}
            >
              <Mic2 className="h-5 w-5" />
              Start Practice Session
            </Button>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border/30">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-3 p-5 bg-card">
                <div className="mt-0.5 p-2 rounded-lg bg-primary/8 text-primary shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sample roles */}
      <div className="space-y-2.5 pb-4">
        <p className="text-xs font-semibold text-foreground/70">
          Available for roles including
        </p>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {ROLES.map((r) => (
            <span
              key={r}
              className="px-2.5 py-1 rounded-md bg-muted/60 border border-border/40"
            >
              {r}
            </span>
          ))}
          <span className="px-2.5 py-1 rounded-md bg-muted/60 border border-border/40">
            + more
          </span>
        </div>
      </div>
    </div>
  );
}
