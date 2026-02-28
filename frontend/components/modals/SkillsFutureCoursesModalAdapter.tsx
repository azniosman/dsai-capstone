"use client";

import { useModalStore } from "@/store/modalStore";
import SkillsFutureCoursesModal from "@/components/modals/SkillsFutureCoursesModal";

export default function SkillsFutureCoursesModalAdapter() {
  const { isOpen, closeModal, data } = useModalStore();
  const d = (data || {}) as { keyword?: string; skill?: string };
  return (
    <SkillsFutureCoursesModal
      isOpen={isOpen}
      onClose={closeModal}
      initialKeyword={d.keyword}
      initialSkill={d.skill}
    />
  );
}
