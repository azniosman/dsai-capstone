"use client";

import { useProfileBuilderStore } from "@/store/profileBuilderStore";
import StepUploadResume from "@/components/profile-builder/StepUploadResume";
import StepFinalizeProfile from "@/components/profile-builder/StepFinalizeProfile";
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
  { id: 1, label: "Step 1", title: "Upload Resume", icon: FileText },
  { id: 2, label: "Step 2", title: "Verify & Finalize", icon: Target },
] as const;

/* ─── Progress Ring ─── */
function ProgressRing({ score }: { score: number }) {
  return (
    <div className="absolute top-4 right-4 hidden sm:flex flex-col items-center z-10">
      <div
        className="relative w-12 h-12 rounded-full p-1 border border-border/50 bg-card/30 backdrop-blur-sm"
        style={{
          background: `conic-gradient(from 0deg, var(--primary) 0% ${score}%, transparent ${score}% 100%)`,
        }}
      >
        <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
          <span className="text-[10px] font-bold text-primary">{score}%</span>
        </div>
      </div>
      <p className="text-[8px] font-mono text-muted-foreground mt-1 uppercase tracking-widest">
        Score
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
    (hasResume ? 40 : 0) +
    (hasIdentity ? 30 : 0) +
    (hasSkills ? Math.min(store.skills.length * 5, 30) : 0);

  return (
    <div className="bg-background text-foreground h-full flex flex-col overflow-hidden selection:bg-primary/30">
      {/* Header Section */}
      <header className="flex items-center justify-between p-3 px-4 border-b border-border relative z-20 bg-card/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 border border-primary bg-primary/10 flex items-center justify-center text-primary rounded-md">
            <TerminalSquare className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight leading-none mb-1">
              Profile Setup
            </h1>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground leading-none">
              Step {store.step} of {STEPS.length} —{" "}
              {STEPS[store.step - 1].title}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Area: Split Layout */}
      <main className="flex-1 flex flex-col md:flex-row relative z-10 overflow-hidden">
        {/* Left: Progress Timeline */}
        <aside className="w-full md:w-48 border-r border-border bg-card/30 backdrop-blur-md p-4 overflow-y-auto shrink-0">
          <div className="flex flex-col">
            {STEPS.map((step, idx) => {
              const isActive = store.step === step.id;
              const isCompleted = store.step > step.id;
              const isLast = idx === STEPS.length - 1;
              const StepIcon = step.icon;

              return (
                <div
                  key={step.id}
                  className="flex gap-3 cursor-pointer group"
                  onClick={() => store.setStep(step.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Go to ${step.title}`}
                  onKeyDown={(e) => e.key === "Enter" && store.setStep(step.id)}
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center transition-all group-hover:border-primary/50",
                        isCompleted
                          ? "border-primary bg-primary text-primary-foreground"
                          : isActive
                            ? "border-primary bg-primary/20 text-primary glow-primary-sm"
                            : "border-border bg-card text-muted-foreground",
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <StepIcon className="w-3 h-3" />
                      )}
                    </div>
                    {!isLast && (
                      <div
                        className={cn(
                          "w-0.5 h-6 transition-colors my-1",
                          isCompleted ? "bg-primary" : "bg-border",
                        )}
                      />
                    )}
                  </div>
                  <div className="pt-1 pb-2">
                    <p
                      className={cn(
                        "text-[11px] font-bold tracking-wider leading-none",
                        isActive || isCompleted
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {step.title}
                    </p>
                    <p
                      className={cn(
                        "text-[9px] font-mono mt-0.5 uppercase",
                        isActive
                          ? "text-primary"
                          : isCompleted
                            ? "text-emerald-400"
                            : "text-muted-foreground/50",
                      )}
                    >
                      {isActive ? "Active" : isCompleted ? "Done" : "Pending"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Right: Workspace */}
        <section className="flex-1 p-5 md:p-6 flex flex-col relative overflow-y-auto">
          <ProgressRing score={Math.round(integrityScore)} />

          {/* Header Info */}
          <div className="mb-4 max-w-[calc(100%-60px)] shrink-0">
            <h2 className="text-lg font-bold tracking-tight mb-0.5">
              {STEPS[store.step - 1].title}
            </h2>
            <p className="text-muted-foreground text-xs">
              Complete this step to advance your dossier.
            </p>
          </div>

          {/* Dynamic Step Content Area */}
          <div className="h-full bg-card/10 backdrop-blur-sm p-4 relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={store.step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                {store.step === 1 && <StepUploadResume />}
                {store.step === 2 && <StepFinalizeProfile />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center border-t border-border pt-3 mt-1 shrink-0 bg-background/80 backdrop-blur-sm sticky bottom-0">
            <p className="text-[9px] font-mono text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {store.step === STEPS.length
                ? "Ready"
                : `Step ${store.step} of ${STEPS.length}`}
            </p>
            {store.step > 1 && (
              <button
                onClick={() => store.setStep(store.step - 1)}
                className="text-[10px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-widest transition-colors py-1 px-3 border border-transparent hover:border-border rounded-sm bg-card/50"
              >
                Go Back
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
