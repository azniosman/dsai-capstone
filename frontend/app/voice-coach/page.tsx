"use client";

import { useEffect, useState } from "react";
import { Mic, Volume2, Brain, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useModalStore } from "@/store/modalStore";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Mic,
    title: "Speak naturally",
    description: "Just press Start and talk. No typing required.",
  },
  {
    icon: Brain,
    title: "AI-powered coaching",
    description: "Get personalised feedback tailored to your target role.",
  },
  {
    icon: Volume2,
    title: "Hear the response",
    description: "Responses are read aloud so you can practise listening too.",
  },
  {
    icon: Zap,
    title: "Real-time analysis",
    description: "Transcription and coaching happen in seconds.",
  },
];

export default function VoiceCoachPage() {
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
        <p className="section-label mb-1">Tools</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Voice Coach</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Practise speaking about your career with a real-time AI coach. Get
          instant verbal feedback on your answers and delivery.
        </p>
      </header>

      {/* Profile required notice */}
      {mounted && !hasProfile && (
        <Alert>
          <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
            <span>
              Create a profile first so the coach can personalise its feedback
              to your goals.
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
            {/* Animated mic orb */}
            <div className="relative flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
              <span className="absolute inset-2 rounded-full bg-primary/8" />
              <div className="relative z-10 w-20 h-20 rounded-full bg-background border border-border/60 shadow-lg flex items-center justify-center">
                <Mic className="h-9 w-9 text-primary" />
              </div>
            </div>

            <div className="text-center">
              <p className="font-bold text-base">Ready when you are</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Opens a focused session so you can concentrate on speaking.
              </p>
            </div>

            <Button
              size="xl"
              className="gap-2.5 px-8"
              disabled={mounted && !hasProfile}
              onClick={() => openModal("voiceCoach")}
            >
              <Mic className="h-5 w-5" />
              Start Voice Session
            </Button>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border/30">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className={cn(
                  "flex items-start gap-3 p-5 bg-card",
                )}
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

      {/* Tips */}
      <div className="text-xs text-muted-foreground space-y-1 pb-4">
        <p className="font-semibold text-foreground/70 mb-2">Tips for best results</p>
        <p>• Use a quiet environment and allow microphone access when prompted.</p>
        <p>• Speak clearly and at a natural pace — no need to rush.</p>
        <p>• Answer as if in a real interview; the coach responds in character.</p>
        <p>• Sessions are not recorded; close the modal when you are done.</p>
      </div>
    </div>
  );
}
