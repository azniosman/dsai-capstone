"use client";

import { AppModal } from "@/components/ui/AppModal";
import { useModalStore } from "@/store/modalStore";
import ChatCoach from "@/components/chat/ChatCoach";
import { useEffect, useState } from "react";

export default function AIChatModal() {
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
      size="xl"
      className="p-0 sm:p-0 h-[85vh] flex flex-col"
    >
      {/* 
        We pass compact=false to let ChatCoach fill the modal vertically.
        Removing internal padding on AppModal lets ChatCoach sit flush. 
      */}
      <div className="-m-6 h-[calc(100%+3rem)]">
        <ChatCoach profileId={profileId} compact={false} />
      </div>
    </AppModal>
  );
}
