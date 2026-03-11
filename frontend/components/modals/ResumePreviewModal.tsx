"use client";

import { AppModal } from "@/components/ui/AppModal";
import { useModalStore } from "@/store/modalStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronRight, User } from "lucide-react";
import { profileApi } from "@/lib/api";
import { toast } from "sonner";
import { useState } from "react";

export default function ResumePreviewModal() {
  const { isOpen, closeModal, data } = useModalStore();
  const [isSaving, setIsSaving] = useState(false);

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      const modalData = data as Record<string, unknown> | undefined;
      const skillsArr = Array.isArray(modalData?.skills)
        ? (modalData.skills as string[])
        : [];

      const payload = {
        name: (modalData?.name as string) || "Anonymous User",
        email: modalData?.email as string | undefined,
        education: (modalData?.education as string) || undefined,
        years_experience: (modalData?.experience_years as number) || 0,
        is_career_switcher: false,
        skills: skillsArr,
        resume_text: modalData?.resume_text as string | undefined,
      };

      const profile = await profileApi.create(payload);
      localStorage.setItem("profileId", String(profile.id));

      toast.success("Profile saved!", {
        description: "Your AI analysis is ready.",
      });

      // Dispatch a custom event so the dashboard can refresh
      window.dispatchEvent(new Event("profile-updated"));

      closeModal();
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Please try again later.";
      toast.error("Failed to save profile", {
        description: errorMsg,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const modalData = (data as Record<string, unknown>) || {};
  const dataName = (modalData.name as string) || "Name not found";
  const dataExp = (modalData.experience_years as number) || 0;
  const dataEducation = modalData.education as string | undefined;

  return (
    <AppModal
      isOpen={isOpen}
      onClose={closeModal}
      size="lg"
      title="Resume Analysis Complete"
      description="Here is what we extracted from your resume. Review and confirm to build your intelligent profile."
      footer={
        <div className="flex w-full justify-between items-center">
          <Button variant="ghost" onClick={closeModal} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSaving}>
            {isSaving ? "Saving..." : "Confirm & Save Profile"}
            {!isSaving && <ChevronRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Basic Info */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
          <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg">{dataName}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <span>{dataExp} years experience</span>
              {dataEducation && (
                <>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  <span>{dataEducation}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Extracted Skills */}
        <div>
          <h4 className="text-sm font-bold tracking-tight mb-3 text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Extracted Skills (
            {Array.isArray((data as Record<string, unknown>)?.skills)
              ? ((data as Record<string, unknown>).skills as string[]).length
              : 0}
            )
          </h4>
          <div className="flex flex-wrap gap-2">
            {Array.isArray((data as Record<string, unknown>)?.skills) &&
              ((data as Record<string, unknown>).skills as string[]).map(
                (skill: string) => (
                  <Badge
                    key={skill}
                    variant="secondary"
                    className="px-2.5 py-0.5 rounded-lg bg-secondary/40"
                  >
                    {skill}
                  </Badge>
                ),
              )}
            {(!Array.isArray((data as Record<string, unknown>)?.skills) ||
              ((data as Record<string, unknown>).skills as string[]).length ===
                0) && (
              <span className="text-sm text-muted-foreground">
                No skills extracted.
              </span>
            )}
          </div>
        </div>
      </div>
    </AppModal>
  );
}
