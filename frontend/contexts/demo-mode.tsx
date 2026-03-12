"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DemoProfile {
  id: number;
  name: string;
  email: string;
  yearsExperience: number;
  skills: string[];
  education: string;
  isCareerSwitcher: boolean;
  targetRole: string;
}

interface DemoModeContextType {
  isDemoMode: boolean;
  enableDemoMode: () => void;
  disableDemoMode: () => void;
  toggleDemoMode: () => void;
  demoProfile: DemoProfile | null;
  loadDemoProfile: () => Promise<void>;
}

// ─── Sample Demo Data ─────────────────────────────────────────────────────────

const DEMO_PROFILE: DemoProfile = {
  id: 99999,
  name: "Alex Tan",
  email: "alex.tan.demo@sklbr.co",
  yearsExperience: 8,
  skills: [
    "Python",
    "JavaScript",
    "React",
    "Node.js",
    "AWS",
    "Docker",
    "SQL",
    "Git",
    "Agile",
    "REST APIs",
  ],
  education: "B.Sc. Computer Science, NUS",
  isCareerSwitcher: true,
  targetRole: "Machine Learning Engineer",
};

const DEMO_LOCAL_STORAGE_KEY = "skillbridge_demo_mode";

// ─── Context ──────────────────────────────────────────────────────────────────

const DemoModeContext = createContext<DemoModeContextType | undefined>(
  undefined
);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoProfile, setDemoProfile] = useState<DemoProfile | null>(null);

  // Load demo mode state from localStorage on mount
  useEffect(() => {
    const savedDemoMode = localStorage.getItem(DEMO_LOCAL_STORAGE_KEY);
    if (savedDemoMode === "true") {
      setIsDemoMode(true);
    }
  }, []);

  const enableDemoMode = useCallback(() => {
    setIsDemoMode(true);
    localStorage.setItem(DEMO_LOCAL_STORAGE_KEY, "true");
    toast.success("Demo Mode Enabled", {
      description: "Sample profile data loaded for demonstration",
    });
  }, []);

  const disableDemoMode = useCallback(() => {
    setIsDemoMode(false);
    setDemoProfile(null);
    localStorage.setItem(DEMO_LOCAL_STORAGE_KEY, "false");
    toast.info("Demo Mode Disabled", {
      description: "Ready for live data",
    });
  }, []);

  const toggleDemoMode = useCallback(() => {
    if (isDemoMode) {
      disableDemoMode();
    } else {
      enableDemoMode();
    }
  }, [isDemoMode, enableDemoMode, disableDemoMode]);

  const loadDemoProfile = useCallback(async () => {
    // Store demo profile in localStorage to simulate logged-in state
    localStorage.setItem("token", "demo_token_" + Date.now());
    localStorage.setItem("profileId", String(DEMO_PROFILE.id));
    localStorage.setItem("userName", DEMO_PROFILE.name);
    localStorage.setItem("userEmail", DEMO_PROFILE.email);

    // Store demo profile data
    localStorage.setItem("demo_profile_data", JSON.stringify(DEMO_PROFILE));

    setDemoProfile(DEMO_PROFILE);

    toast.success("Demo Profile Loaded", {
      description: `Welcome, ${DEMO_PROFILE.name}! Ready for demo.`,
    });
  }, []);

  return (
    <DemoModeContext.Provider
      value={{
        isDemoMode,
        enableDemoMode,
        disableDemoMode,
        toggleDemoMode,
        demoProfile,
        loadDemoProfile,
      }}
    >
      {children}
    </DemoModeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (context === undefined) {
    throw new Error("useDemoMode must be used within a DemoModeProvider");
  }
  return context;
}

// ─── Demo Data Helpers ────────────────────────────────────────────────────────

export const DEMO_RECOMMENDATIONS = [
  {
    role_id: 1001,
    title: "Machine Learning Engineer",
    category: "Artificial Intelligence",
    salary_range: "S$ 8,000 - 12,000/mo",
    match_score: 0.73,
    content_score: 0.82,
    rule_score: 0.75,
    skill_match_quality: "strong",
    career_switcher_bonus: 0.4,
    matched_skills: [
      "Python",
      "AWS",
      "Docker",
      "SQL",
      "REST APIs",
      "Git",
    ],
    missing_skills: [
      "TensorFlow",
      "PyTorch",
      "MLOps",
      "Kubernetes",
    ],
    rationale:
      "Strong foundation in Python and cloud infrastructure. Your 8 years of software engineering experience translates well to ML engineering. Primary gaps are in ML-specific frameworks and MLOps practices.",
  },
  {
    role_id: 1002,
    title: "Cloud Solutions Architect",
    category: "Cloud Computing",
    salary_range: "S$ 9,000 - 14,000/mo",
    match_score: 0.81,
    content_score: 0.88,
    rule_score: 0.85,
    skill_match_quality: "strong",
    career_switcher_bonus: 0.3,
    matched_skills: [
      "AWS",
      "Docker",
      "Python",
      "Node.js",
      "REST APIs",
      "Agile",
    ],
    missing_skills: [
      "Terraform",
      "Solution Design",
      "Cost Optimization",
    ],
    rationale:
      "Excellent match given your AWS and backend development experience. Your full-stack background provides strong foundation for architecture roles. Consider adding infrastructure-as-code skills.",
  },
  {
    role_id: 1003,
    title: "DevOps Engineer",
    category: "Platform Engineering",
    salary_range: "S$ 7,500 - 11,000/mo",
    match_score: 0.68,
    content_score: 0.72,
    rule_score: 0.7,
    skill_match_quality: "moderate",
    career_switcher_bonus: 0.35,
    matched_skills: [
      "AWS",
      "Docker",
      "Python",
      "Git",
      "SQL",
    ],
    missing_skills: [
      "Kubernetes",
      "CI/CD",
      "Terraform",
      "Monitoring",
    ],
    rationale:
      "Good foundational skills for DevOps transition. Your containerization and cloud experience is valuable. Focus on Kubernetes and CI/CD pipelines to strengthen profile.",
  },
];

export const DEMO_SKILL_GAPS = [
  {
    role_id: 1001,
    role_title: "Machine Learning Engineer",
    match_score: 0.73,
    gaps: [
      {
        skill: "TensorFlow",
        gap_severity: "high",
        user_level: 0.5,
        required_level: 4,
      },
      {
        skill: "PyTorch",
        gap_severity: "high",
        user_level: 0.5,
        required_level: 4,
      },
      {
        skill: "MLOps",
        gap_severity: "high",
        user_level: 1,
        required_level: 3.5,
      },
      {
        skill: "Kubernetes",
        gap_severity: "medium",
        user_level: 1.5,
        required_level: 3.5,
      },
      {
        skill: "Data Pipelines",
        gap_severity: "medium",
        user_level: 2,
        required_level: 3.5,
      },
      {
        skill: "Model Deployment",
        gap_severity: "low",
        user_level: 2.5,
        required_level: 3.5,
      },
    ],
  },
];

export const DEMO_CHAT_SUGGESTIONS = [
  "What skills do I need for ML engineering?",
  "How does SkillsFuture funding work?",
  "What's the demand for cloud engineers in Singapore?",
  "I'm a career switcher - where should I start?",
  "Show me my top job recommendations",
  "What courses can help me learn TensorFlow?",
];
