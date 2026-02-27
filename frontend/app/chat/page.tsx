"use client";

import { useEffect, useState } from "react";
import { Bot, MessageSquare, Sparkles, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useModalStore } from "@/store/modalStore";

const FEATURES = [
  {
    icon: Bot,
    title: "Senior career advisor",
    description:
      "Backed by Google Gemini — trained on Singapore's tech job market and SCTP programme.",
  },
  {
    icon: MessageSquare,
    title: "Conversational flow",
    description:
      "Ask follow-up questions naturally. The coach remembers the full conversation context.",
  },
  {
    icon: GraduationCap,
    title: "SkillsFuture guidance",
    description:
      "Get advice on SCTP courses, subsidy eligibility, and SkillsFuture Credit usage.",
  },
  {
    icon: Sparkles,
    title: "Personalised to you",
    description:
      "Build a profile so the coach can tailor advice to your skills, goals, and experience.",
  },
];

const SAMPLE_PROMPTS = [
  "What high-growth roles match my skills?",
  "Which SCTP courses should I take first?",
  "What salary can I expect as a career switcher?",
  "How do I use my SkillsFuture Credits?",
];

export default function CareerChatPage() {
  const { openModal } = useModalStore();
  const [hasProfile, setHasProfile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setMounted(true);
      setHasProfile(!!localStorage.getItem("profileId"));
    }, 0);
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <header>
        <p className="section-label mb-1">AI Advisor</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Career Coach</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Chat with an AI career advisor specialising in Singapore&apos;s tech
          market. Get personalised guidance on roles, skills, and SCTP courses.
        </p>
      </header>

      {/* Profile notice */}
      {mounted && !hasProfile && (
        <Alert>
          <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
            <span>
              Build a profile so the coach can tailor its advice to your goals
              and experience.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openModal("profile")}
            >
              Build Profile
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* CTA card */}
      <Card variant="elevated" className="overflow-hidden">
        <CardContent className="p-0">
          {/* Visual header strip */}
          <div className="relative bg-primary/5 border-b border-border/40 px-8 py-10 flex flex-col items-center gap-5">
            {/* Animated bot orb */}
            <div className="relative flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
              <span className="absolute inset-2 rounded-full bg-primary/8" />
              <div className="relative z-10 w-20 h-20 rounded-full bg-background border border-border/60 shadow-lg flex items-center justify-center">
                <Bot className="h-9 w-9 text-primary" />
              </div>
            </div>

            <div className="text-center">
              <p className="font-bold text-base">Ask me anything</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Opens a focused chat window — no page navigation needed.
              </p>
            </div>

            <Button
              size="xl"
              className="gap-2.5 px-8"
              onClick={() => openModal("aiChat")}
            >
              <MessageSquare className="h-5 w-5" />
              Start Chat Session
            </Button>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border/30">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex items-start gap-3 p-5 bg-card"
              >
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

      {/* Sample prompts */}
      <div className="space-y-2.5 pb-4">
        <p className="text-xs font-semibold text-foreground/70">
          Try asking about
        </p>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_PROMPTS.map((prompt) => (
            <Badge
              key={prompt}
              variant="accent"
              className="cursor-pointer text-xs"
              onClick={() => openModal("aiChat")}
            >
              {prompt}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
