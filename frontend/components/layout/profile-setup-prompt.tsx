"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCircle,
  FileText,
  Brain,
  ArrowRight,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Checks localStorage for `profileId` after login.
 * If no profile exists, renders a full-screen overlay prompting the user
 * to complete their profile via the profile-builder page.
 *
 * Dismissable — users can skip and complete later.
 * Saves a `profileSetupDismissed` flag so it only shows once per session.
 */
export function ProfileSetupPrompt() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const profileId = localStorage.getItem("profileId");
    const dismissed = sessionStorage.getItem("profileSetupDismissed");

    if (token && !profileId && !dismissed) {
      // Small delay so the dashboard renders first
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleBuildProfile = () => {
    setIsVisible(false);
    sessionStorage.setItem("profileSetupDismissed", "true");
    router.push("/profile-builder");
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem("profileSetupDismissed", "true");
  };

  const features = [
    {
      icon: FileText,
      title: "Upload Resume",
      description: "Import your resume for AI-powered parsing",
    },
    {
      icon: UserCircle,
      title: "Personal Details",
      description: "Add your contact info and location",
    },
    {
      icon: Brain,
      title: "Skills & Expertise",
      description: "Map your competencies for better matching",
    },
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Complete your profile"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="relative w-full max-w-lg bg-card border border-border rounded-lg shadow-2xl overflow-hidden"
          >
            {/* Header glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-card"
              aria-label="Dismiss"
              tabIndex={0}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content */}
            <div className="relative p-8 space-y-6">
              {/* Badge */}
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 border border-primary bg-primary/10 flex items-center justify-center text-primary rounded-lg">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground tracking-tight">
                    Complete Your Profile
                  </h2>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    3 quick steps to unlock AI features
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Set up your career profile to unlock personalized job matching,
                skill gap analysis, and tailored upskilling recommendations.
              </p>

              {/* Steps preview */}
              <div className="space-y-3">
                {features.map((feature, idx) => (
                  <div
                    key={feature.title}
                    className="flex items-center gap-3 p-3 border border-border rounded-lg bg-background/50"
                  >
                    <div className="w-8 h-8 border border-primary/20 bg-primary/5 flex items-center justify-center text-primary rounded-lg shrink-0">
                      <feature.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground">
                        {feature.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground/50 uppercase">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleBuildProfile}
                  className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold uppercase tracking-widest rounded-lg transition-all"
                >
                  Build My Profile
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  onClick={handleDismiss}
                  variant="outline"
                  className="h-11 border-border text-muted-foreground hover:text-foreground text-xs font-bold uppercase tracking-widest rounded-lg"
                >
                  Later
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
