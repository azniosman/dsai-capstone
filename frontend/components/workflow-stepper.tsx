"use client";

import { usePathname, useRouter } from "next/navigation";
import { User, Briefcase, BarChart3, Route } from "lucide-react";

const STEPS = [
  { label: "Profile", path: "/", icon: User },
  { label: "Job Matches", path: "/recommendations", icon: Briefcase },
  { label: "Skill Gaps", path: "/skill-gap", icon: BarChart3 },
  { label: "Roadmap", path: "/roadmap", icon: Route },
];

export default function WorkflowStepper() {
  const pathname = usePathname();
  const router = useRouter();
  const activeStep = STEPS.findIndex((s) => s.path === pathname);
  const current = activeStep === -1 ? 0 : activeStep;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isCompleted = i < current;
          const isActive = i === current;

          return (
            <div key={step.path} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => router.push(step.path)}
                className="flex flex-col items-center gap-1 group"
              >
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isCompleted
                      ? "bg-primary border-primary text-primary-foreground"
                      : isActive
                        ? "border-primary text-primary bg-primary/10"
                        : "border-muted-foreground/30 text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={`text-xs font-medium ${
                    isActive ? "text-primary" : isCompleted ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mt-[-20px] ${
                    isCompleted ? "bg-primary" : "bg-muted-foreground/20"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
