"use client";

import { useEffect, useState } from "react";
import { FileText, BarChart2, Crosshair, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useModalStore } from "@/store/modalStore";

const FEATURES = [
  {
    icon: FileText,
    title: "Skill extraction",
    description:
      "Automatically pulls required skills from any job description — no manual tagging needed.",
  },
  {
    icon: BarChart2,
    title: "Match score",
    description:
      "Scores your profile against the JD using the same hybrid algorithm as Recommendations.",
  },
  {
    icon: Crosshair,
    title: "Gap analysis",
    description:
      "Shows exactly which required skills you're missing and how critical each gap is.",
  },
  {
    icon: BookOpen,
    title: "SCTP-ready",
    description:
      "Gaps are labelled so you can cross-reference SkillsFuture courses to close them fast.",
  },
];

export default function JDMatchPage() {
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
        <p className="section-label mb-1">Analysis Tool</p>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Job Description Match
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Paste any job posting to get an instant match score, extracted skill
          list, and a prioritised gap breakdown against your profile.
        </p>
      </header>

      {/* Profile required notice */}
      {mounted && !hasProfile && (
        <Alert>
          <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
            <span>
              A saved profile is required to compute your match score.
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
            {/* Animated icon orb */}
            <div className="relative flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
              <span className="absolute inset-2 rounded-full bg-primary/8" />
              <div className="relative z-10 w-20 h-20 rounded-full bg-background border border-border/60 shadow-lg flex items-center justify-center">
                <FileText className="h-9 w-9 text-primary" />
              </div>
            </div>

            <div className="text-center">
              <p className="font-bold text-base">Ready to analyze</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Paste a job description and get results in seconds.
              </p>
            </div>

            <Button
              size="xl"
              className="gap-2.5 px-8"
              disabled={mounted && !hasProfile}
              onClick={() => openModal("jdMatch")}
            >
              <FileText className="h-5 w-5" />
              Analyze a Job Description
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

      {/* Tips */}
      <div className="text-xs text-muted-foreground space-y-1 pb-4">
        <p className="font-semibold text-foreground/70 mb-2">Tips</p>
        <p>• Paste the full JD including responsibilities and requirements.</p>
        <p>• The optional job title field helps label your results clearly.</p>
        <p>• Use the gap table to shortlist SCTP courses to close critical gaps.</p>
      </div>
    </div>
  );
}
