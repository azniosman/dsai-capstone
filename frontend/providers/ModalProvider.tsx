"use client";

import { useModalStore } from "@/store/modalStore";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ResumeUploadModal = dynamic(
  () => import("@/components/modals/ResumeUploadModal"),
  { ssr: false },
);
const ResumePreviewModal = dynamic(
  () => import("@/components/modals/ResumePreviewModal"),
  { ssr: false },
);
const CareerAnalysisModal = dynamic(
  () => import("@/components/modals/CareerAnalysisModal"),
  { ssr: false },
);
const SkillGapModal = dynamic(
  () => import("@/components/modals/SkillGapModal"),
  { ssr: false },
);
const AIChatModal = dynamic(() => import("@/components/modals/AIChatModal"), {
  ssr: false,
});
const ProfileModal = dynamic(() => import("@/components/modals/ProfileModal"), {
  ssr: false,
});

const JDMatchModal = dynamic(() => import("@/components/modals/JDMatchModal"), {
  ssr: false,
});

const RoleMatchModal = dynamic(
  () => import("@/components/modals/RoleMatchModal"),
  { ssr: false },
);
const SkillsFutureCoursesModalAdapter = dynamic(
  () => import("@/components/modals/SkillsFutureCoursesModalAdapter"),
  { ssr: false },
);
const MatchIntelligenceModal = dynamic(
  () => import("@/components/modals/MatchIntelligenceModal"),
  { ssr: false },
);
const AiExecutiveBriefModal = dynamic(
  () => import("@/components/modals/AiExecutiveBriefModal"),
  { ssr: false },
);

const CourseIntelModal = dynamic(
  () => import("@/components/modals/CourseIntelModal"),
  { ssr: false },
);

export function ModalProvider() {
  const [mounted, setMounted] = useState(false);
  const { type, isOpen } = useModalStore();

  useEffect(() => {
    setTimeout(() => {
      setMounted(true);
    }, 0);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <>
      {type === "resumeUpload" && isOpen && <ResumeUploadModal />}
      {type === "resumePreview" && isOpen && <ResumePreviewModal />}
      {type === "careerAnalysis" && isOpen && <CareerAnalysisModal />}
      {type === "skillGap" && isOpen && <SkillGapModal />}
      {type === "aiChat" && isOpen && <AIChatModal />}
      {type === "profile" && isOpen && <ProfileModal />}

      {type === "jdMatch" && isOpen && <JDMatchModal />}

      {type === "roleMatch" && isOpen && <RoleMatchModal />}
      {type === "skillsFutureCourses" && isOpen && (
        <SkillsFutureCoursesModalAdapter />
      )}
      {type === "matchIntelligence" && isOpen && <MatchIntelligenceModal />}
      {type === "aiExecutiveBrief" && isOpen && <AiExecutiveBriefModal />}
      {type === "courseIntel" && isOpen && <CourseIntelModal />}
    </>
  );
}
