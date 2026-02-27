"use client";

import { useEffect, useState } from "react";
import { AppModal } from "@/components/ui/AppModal";
import { useModalStore } from "@/store/modalStore";
import { VoiceCoach } from "@/components/voice-coach/voice-coach";

export default function VoiceCoachModal() {
  const { isOpen, closeModal } = useModalStore();
  const [profileId, setProfileId] = useState<number | undefined>();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setIsMounted(true);
      const pid = localStorage.getItem("profileId");
      if (pid) setProfileId(parseInt(pid, 10));
    }, 0);
  }, []);

  if (!isMounted) return null;

  return (
    <AppModal
      isOpen={isOpen}
      onClose={closeModal}
      size="lg"
      noPadding
      className="overflow-visible"
    >
      <VoiceCoach profileId={profileId} />
    </AppModal>
  );
}
