"use client";

import { AppModal } from "@/components/ui/AppModal";
import { useModalStore } from "@/store/modalStore";
import ResumeUpload from "@/components/profile-builder/ResumeUpload";
import { useEffect, useState } from "react";

export default function ResumeUploadModal() {
  const { isOpen, closeModal } = useModalStore();
  const [profileId, setProfileId] = useState<number | undefined>();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setIsMounted(true);
      const pid = localStorage.getItem("profileId");
      if (pid) {
        setProfileId(parseInt(pid, 10));
      }
    }, 0);
  }, []);

  if (!isMounted) return null;

  return (
    <AppModal
      isOpen={isOpen}
      onClose={closeModal}
      title="Upload Resume"
      description="Upload your latest resume to automatically extract your skills and update your profile."
      size="md"
    >
      <div className="pt-2">
        <ResumeUpload
          profileId={profileId}
          onComplete={(data) => {
            // Give the success animation time to play before closing or transitioning
            setTimeout(() => {
              useModalStore.getState().openModal("resumePreview", data);
            }, 3000);
          }}
        />
      </div>
    </AppModal>
  );
}
