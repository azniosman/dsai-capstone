"use client";

import { useModalStore } from "@/store/modalStore";
import { useProfileBuilderStore } from "@/store/profileBuilderStore";
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
const ProfileModal = dynamic(
  () => import("@/components/modals/ProfileModal"),
  { ssr: false },
);
const BuildProfileModal = dynamic(
  () => import("@/components/modals/BuildProfileModal"),
  { ssr: false },
);
const VoiceCoachModal = dynamic(
  () => import("@/components/modals/VoiceCoachModal"),
  { ssr: false },
);
const JDMatchModal = dynamic(
  () => import("@/components/modals/JDMatchModal"),
  { ssr: false },
);
const InterviewModal = dynamic(
  () => import("@/components/modals/InterviewModal"),
  { ssr: false },
);
const RoleMatchModal = dynamic(
  () => import("@/components/modals/RoleMatchModal"),
  { ssr: false },
);
const SkillsFutureCoursesModalAdapter = dynamic(
  () => import("@/components/modals/SkillsFutureCoursesModalAdapter"),
  { ssr: false },
);

export function ModalProvider() {
  const [mounted, setMounted] = useState(false);
  const { type, isOpen } = useModalStore();
  const isProfileBuilderOpen = useProfileBuilderStore((state) => state.isOpen);

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
      {type === "voiceCoach" && isOpen && <VoiceCoachModal />}
      {type === "jdMatch" && isOpen && <JDMatchModal />}
      {type === "interview" && isOpen && <InterviewModal />}
      {type === "roleMatch" && isOpen && <RoleMatchModal />}
      {type === "skillsFutureCourses" && isOpen && <SkillsFutureCoursesModalAdapter />}
      {isProfileBuilderOpen && <BuildProfileModal />}
    </>
  );
}
