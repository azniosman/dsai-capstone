"use client";

import { useProfileBuilderStore } from "@/store/profileBuilderStore";
import StepUploadResume from "@/components/profile-builder/StepUploadResume";
import StepPersonalInfo from "@/components/profile-builder/StepPersonalInfo";
import StepSkills from "@/components/profile-builder/StepSkills";
import StepReview from "@/components/profile-builder/StepReview";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  FileText,
  User,
  Brain,
  Target,
  TerminalSquare,
  Server,
  Check,
} from "lucide-react";

/* ─── Step metadata ─── */
const STEPS = [
  {
    id: 1,
    label: "Step 1",
    title: "Upload Resume",
    icon: FileText,
  },
  {
    id: 2,
    label: "Step 2",
    title: "Personal Details",
    icon: User,
  },
  {
    id: 3,
    label: "Step 3",
    title: "Skills & Expertise",
    icon: Brain,
  },
  {
    id: 4,
    label: "Step 4",
    title: "Review & Finish",
    icon: Target,
  },
];

/* ─── Progress Ring ─── */
function ProgressRing({ score }: { score: number }) {
  return (
    <div className="absolute top-6 right-6 flex flex-col items-center z-10 hidden sm:flex">
      <div
        className="relative w-16 h-16 rounded-full p-1"
        style={{
          background: `conic-gradient(from 0deg, var(--primary) 0% ${score}%, var(--border) ${score}% 100%)`,
        }}
      >
        <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
          <span className="text-sm font-bold text-primary">{score}%</span>
        </div>
      </div>
      <p className="text-[10px] font-mono text-muted-foreground mt-2 uppercase tracking-wider">
        Complete
      </p>
    </div>
  );
}

export default function ProfileBuilderPage() {
  const store = useProfileBuilderStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    store.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mounted) return null;

  const hasResume = !!store.resumeFile || !!store.parsedResume;
  const hasIdentity = !!(store.personalInfo.name && store.personalInfo.email);
  const hasSkills = store.skills.length > 0;
  const integrityScore =
    (hasResume ? 25 : 0) +
    (hasIdentity ? 25 : 0) +
    (hasSkills ? Math.min(store.skills.length * 2.5, 25) : 0) +
    (store.step === 4 ? 25 : 0);

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col overflow-x-hidden selection:bg-primary/30">
      {/* Header Section */}
      <header className="flex items-center justify-between p-6 border-b border-border relative z-20 bg-card/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border border-primary bg-primary/10 flex items-center justify-center text-primary rounded-lg">
            <TerminalSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              Set Up Your Profile
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Step {store.step} of {STEPS.length} —{" "}
              {STEPS[store.step - 1].title}
            </p>
          </div>
        </div>
        <button
          onClick={() => (window.location.href = "/dashboard")}
          className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
        >
          <Server className="w-4 h-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </button>
      </header>

      {/* Main Content Area: Split Layout */}
      <main className="flex-1 flex flex-col md:flex-row relative z-10">
        {/* Left: Progress Timeline */}
        <aside className="w-full md:w-56 border-r border-border bg-card/30 backdrop-blur-md p-6 sticky top-0 md:h-[calc(100vh-80px)] overflow-y-auto">
          <div className="flex flex-col gap-0">
            {STEPS.map((step, idx) => {
              const isActive = store.step === step.id;
              const isCompleted = store.step > step.id;
              const isLast = idx === STEPS.length - 1;
              const StepIcon = step.icon;

              return (
                <div
                  key={step.id}
                  className="flex gap-4 cursor-pointer"
                  onClick={() => store.setStep(step.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Go to ${step.title}`}
                  onKeyDown={(e) => e.key === "Enter" && store.setStep(step.id)}
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                        isCompleted
                          ? "border-primary bg-primary text-primary-foreground"
                          : isActive
                            ? "border-primary bg-primary/20 text-primary glow-primary-sm"
                            : "border-border bg-card text-muted-foreground",
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <StepIcon className="w-4 h-4" />
                      )}
                    </div>
                    {!isLast && (
                      <div
                        className={cn(
                          "w-0.5 h-10 transition-colors",
                          isCompleted ? "bg-primary" : "bg-border",
                        )}
                      />
                    )}
                  </div>
                  <div className="pt-1 pb-4">
                    <p
                      className={cn(
                        "text-xs font-bold tracking-wider leading-none",
                        isActive || isCompleted
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {step.title}
                    </p>
                    <p
                      className={cn(
                        "text-[10px] font-mono mt-1 uppercase",
                        isActive
                          ? "text-primary"
                          : isCompleted
                            ? "text-emerald-400"
                            : "text-muted-foreground/50",
                      )}
                    >
                      {isActive
                        ? "In Progress"
                        : isCompleted
                          ? "Done"
                          : "Pending"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Right: Workspace */}
        <section className="flex-1 p-6 flex flex-col gap-6 relative min-h-[500px]">
          {/* Integrity Gauge (Circular Graphic) */}
          <ProgressRing score={Math.round(integrityScore)} />

          {/* Header Info */}
          <div className="mt-4 max-w-[calc(100%-100px)]">
            <span className="inline-block px-2 py-1 rounded-lg bg-primary/10 text-[10px] font-mono text-primary border border-primary/20 mb-2">
              {STEPS[store.step - 1].label} — {STEPS[store.step - 1].title}
            </span>
            <h2 className="text-xl font-bold tracking-tight mb-1">
              {STEPS[store.step - 1].title}
            </h2>
            <p className="text-muted-foreground text-sm max-w-md">
              Complete this step to continue building your career profile.
            </p>
          </div>

          {/* Dynamic Step Content Area */}
          <div className="flex-1 flex flex-col justify-center relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={store.step}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="w-full flex-1"
              >
                {store.step === 1 && <StepUploadResume />}
                {store.step === 2 && <StepPersonalInfo />}
                {store.step === 3 && <StepSkills />}
                {store.step === 4 && <StepReview />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center border-t border-border pt-4 mt-auto shrink-0 relative z-20">
            <p className="text-[10px] font-mono text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {store.step === 4
                ? "Ready to submit"
                : `Step ${store.step} of ${STEPS.length}`}
            </p>
            <div className="flex gap-2">
              {store.step > 1 && (
                <button
                  onClick={() => store.setStep(store.step - 1)}
                  className="text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-widest transition-colors"
                >
                  Back
                </button>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
