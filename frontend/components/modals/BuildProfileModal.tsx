"use client";

import { useProfileBuilderStore } from "@/store/profileBuilderStore";
import { AppModal } from "@/components/ui/AppModal";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

// The individual step components that we'll create next
import StepUploadResume from "@/components/profile-builder/StepUploadResume";
import StepPersonalInfo from "@/components/profile-builder/StepPersonalInfo";
import StepSkills from "@/components/profile-builder/StepSkills";
import StepReview from "@/components/profile-builder/StepReview";

const STEPS = [
  { id: 1, title: "Upload Resume" },
  { id: 2, title: "Personal Info" },
  { id: 3, title: "Skills & Goals" },
  { id: 4, title: "Review" },
];

export default function BuildProfileModal() {
  const { isOpen, close, step } = useProfileBuilderStore();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setTimeout(() => {
      setMounted(true);
    }, 0);
  }, []);

  if (!mounted) return null;

  return (
    <AppModal
      isOpen={isOpen}
      onClose={close}
      size="lg"
      className="max-h-[85vh] h-[800px] flex flex-col"
      hideCloseButton={step === 4}
      noPadding // Prevent default AppModal padding so we can do edge-to-edge
    >
      {/* Header & Progress Bar */}
      <div className="shrink-0 px-6 pt-6 pb-2 border-b">
        <DialogTitle className="text-xl font-bold mb-4">
          Build Your Profile
        </DialogTitle>
        <DialogDescription className="sr-only">
          Upload your resume and build your career profile.
        </DialogDescription>

        {/* Progress Stepper */}
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s, i) => {
            const isActive = s.id === step;
            const isCompleted = s.id < step;
            return (
              <div
                key={s.id}
                className="flex items-center flex-1 last:flex-none"
              >
                <div className="flex flex-col items-center gap-1.5 relative w-8">
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isCompleted
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.id}
                  </div>
                  <span
                    className={`text-[10px] absolute top-8 whitespace-nowrap ${isActive ? "text-primary font-bold" : "text-muted-foreground font-medium"}`}
                  >
                    {s.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 -translate-y-[10px] rounded-full transition-colors ${isCompleted ? "bg-primary/40" : "bg-muted"}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-background">
        {/* Main Content Area mapping to Steps */}
        <AnimatePresence mode="wait" initial={false}>
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="h-full overflow-y-auto px-6 py-6 custom-scrollbar"
            >
              <StepUploadResume />
            </motion.div>
          )}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="h-full overflow-y-auto px-6 py-6 custom-scrollbar"
            >
              <StepPersonalInfo />
            </motion.div>
          )}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="h-full overflow-y-auto px-6 py-6 custom-scrollbar"
            >
              <StepSkills />
            </motion.div>
          )}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="h-full overflow-y-auto px-6 py-6 custom-scrollbar"
            >
              <StepReview />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppModal>
  );
}
