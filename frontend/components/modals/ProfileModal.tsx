"use client";

import { AppModal } from "@/components/ui/AppModal";
import { useModalStore } from "@/store/modalStore";
import ProfileForm from "@/components/profile/profile-form";
import { useEffect, useState } from "react";

export default function ProfileModal() {
  const { isOpen, closeModal } = useModalStore();
  const [profileId, setProfileId] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setIsMounted(true);
      const pid = localStorage.getItem("profileId");
      if (pid) setProfileId(parseInt(pid, 10));
    }, 0);
  }, [isOpen]);

  if (!isMounted) return null;

  return (
    <AppModal
      isOpen={isOpen}
      onClose={closeModal}
      size="xl"
      title={profileId ? "Edit Profile" : "Create Profile"}
      description="Tell us about your background and skills so our AI can generate personalized career insights."
    >
      <div className="pt-2">
        <ProfileForm />
      </div>
    </AppModal>
  );
}
