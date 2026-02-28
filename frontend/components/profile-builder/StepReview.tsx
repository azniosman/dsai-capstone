"use client";

import { useProfileBuilderStore } from "@/store/profileBuilderStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { profileApi } from "@/lib/api";
import { ArrowLeft, Loader2, CheckCircle2, FileText, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function StepReview() {
  const store = useProfileBuilderStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: store.personalInfo.name || "Anonymous User",
        email: store.personalInfo.email,
        phone: store.personalInfo.phone,
        location: store.personalInfo.location,
        education: (store.parsedResume?.education as string) || undefined,
        years_experience: (store.parsedResume?.experience_years as number) || 0,
        is_career_switcher: false,
        skills: store.skills,
      };

      const profile = await profileApi.create(payload);
      localStorage.setItem("profileId", String(profile.id));

      toast.success("Profile Setup Complete!", {
        description: "Your personalized dashboard is ready.",
      });

      // Dispatch event for UI refreshes
      window.dispatchEvent(new Event("profile-updated"));

      store.close();

      // Navigate to dashboard
      router.push("/dashboard");
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Could not save profile. Please try again.";
      toast.error("Failed to save profile", { description: errorMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-bold">Review Your Profile</h3>
        <p className="text-sm text-muted-foreground">
          Confirm your details before proceeding to your dashboard.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        {/* Resume Box */}
        {store.resumeFile && (
          <div className="flex items-center gap-4 p-4 border rounded-xl bg-muted/20">
            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Resume Uploaded</p>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {store.resumeFile.name}
              </p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-500 ml-auto" />
          </div>
        )}

        {/* Info Box */}
        <div className="p-4 border rounded-xl space-y-3">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b">
            <User className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-bold">Personal Details</h4>
            <Button
              variant="link"
              className="ml-auto text-xs h-auto p-0"
              onClick={() => store.setStep(2)}
            >
              Edit
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Name</p>
              <p className="font-medium">{store.personalInfo.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Email</p>
              <p className="font-medium truncate">{store.personalInfo.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Phone</p>
              <p className="font-medium">{store.personalInfo.phone || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Location</p>
              <p className="font-medium">
                {store.personalInfo.location || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Skills Box */}
        <div className="p-4 border rounded-xl space-y-3">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-bold">
              Skills ({store.skills.length})
            </h4>
            <Button
              variant="link"
              className="ml-auto text-xs h-auto p-0"
              onClick={() => store.setStep(3)}
            >
              Edit
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {store.skills.map((s) => (
              <Badge key={s} variant="secondary" className="font-normal">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-6 border-t flex justify-between items-center shrink-0">
        <Button
          variant="outline"
          onClick={store.prevStep}
          disabled={isSubmitting}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="min-w-[140px]"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Complete Profile"
          )}
        </Button>
      </div>
    </div>
  );
}
