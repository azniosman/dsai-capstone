"use client";

import { useProfileBuilderStore } from "@/store/profileBuilderStore";
import { Button } from "@/components/ui/button";
import { profileApi } from "@/lib/api";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  FileText,
  User,
  ShieldCheck,
} from "lucide-react";
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
        name: store.personalInfo.name || "Anonymous Agent",
        email: store.personalInfo.email,
        phone: store.personalInfo.phone,
        location: store.personalInfo.location,
        education: (store.parsedResume?.education as string) || undefined,
        years_experience: (store.parsedResume?.experience_years as number) || 0,
        is_career_switcher: false,
        skills: store.skills,
        resume_text:
          (store.parsedResume?.resume_text as string) ||
          (store.parsedResume?.resumeText as string) ||
          undefined,
      };

      const token = localStorage.getItem("token");

      if (!token) {
        localStorage.setItem("pending_profile", JSON.stringify(payload));
        store.reset();
        router.push("/login?tab=register");
        return;
      }

      const profile = await profileApi.create(payload);
      localStorage.setItem("profileId", String(profile.id));

      toast.success("Node Initialization Complete", {
        description: "Vector deployment successful.",
      });

      window.dispatchEvent(new Event("profile-updated"));
      store.reset();
      router.push("/dashboard");
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "System rejected payload. Reboot and try again.";
      toast.error("Initialization Failed", { description: errorMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 relative">
      <div className="absolute top-0 right-0 p-1 border border-soft-coral/30 bg-soft-coral/5">
        <span className="text-[8px] font-mono text-soft-coral uppercase tracking-widest animate-pulse">
          PENDING_DEPLOY
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-cyan" />
          <h3 className="text-xl font-sans font-black uppercase tracking-tighter text-editorial-black">
            Node Verification
          </h3>
        </div>
        <p className="font-mono text-[10px] text-editorial-black/50 border-l border-muted-cyan/30 pl-3">
          &gt; Final integrity check of synchronized vectors.
          <br />
          &gt; Authorization required to initialize system deployment.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        {/* Resume Box */}
        {store.resumeFile && (
          <div className="flex items-center gap-4 p-4 border border-muted-cyan/30 bg-muted-cyan/5 shadow-[0_0_15px_rgba(37,157,244,0.05)] relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-muted-cyan text-[#09090b] text-[7px] font-mono font-bold px-1 uppercase tracking-widest">
              VERIFIED
            </div>
            <div className="h-10 w-10 border border-muted-cyan/50 bg-muted-cyan/10 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-muted-cyan" />
            </div>
            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-editorial-black/60 mb-0.5">
                Archive Source Confirmed
              </p>
              <p className="font-mono text-[11px] font-bold text-editorial-black truncate max-w-[200px] uppercase">
                {store.resumeFile.name}
              </p>
            </div>
            <CheckCircle2 className="h-4 w-4 text-muted-cyan drop-shadow-[0_0_5px_rgba(37,157,244,0.8)] ml-auto" />
          </div>
        )}

        {/* Info Box */}
        <div className="p-5 border border-muted-cyan/30 bg-muted-cyan/5 space-y-4 relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-muted-cyan shadow-[0_0_8px_rgba(37,157,244,0.8)]" />

          <div className="flex items-center gap-2 mb-2 pb-3 border-b border-muted-cyan/20">
            <User className="h-4 w-4 text-muted-cyan" />
            <h4 className="font-mono text-[10px] font-bold text-editorial-black uppercase tracking-widest">
              Entity Parameters
            </h4>
            <Button
              variant="link"
              className="ml-auto text-[9px] h-auto p-0 font-mono text-muted-cyan uppercase tracking-widest hover:text-soft-coral"
              onClick={() => store.setStep(2)}
            >
              [ EDIT_NODE ]
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            <div>
              <p className="font-mono text-[8px] uppercase tracking-widest text-editorial-black/40 mb-1">
                Name
              </p>
              <p className="font-mono text-[11px] font-bold text-editorial-black uppercase tracking-wider">
                {store.personalInfo.name}
              </p>
            </div>
            <div>
              <p className="font-mono text-[8px] uppercase tracking-widest text-editorial-black/40 mb-1">
                Vector ID
              </p>
              <p className="font-mono text-[11px] font-bold text-editorial-black uppercase tracking-wider truncate">
                {store.personalInfo.email}
              </p>
            </div>
            <div>
              <p className="font-mono text-[8px] uppercase tracking-widest text-editorial-black/40 mb-1">
                Comms Link
              </p>
              <p className="font-mono text-[11px] font-bold text-editorial-black uppercase tracking-wider">
                {store.personalInfo.phone || "UNAVAILABLE"}
              </p>
            </div>
            <div>
              <p className="font-mono text-[8px] uppercase tracking-widest text-editorial-black/40 mb-1">
                Geo-Loc
              </p>
              <p className="font-mono text-[11px] font-bold text-editorial-black uppercase tracking-wider">
                {store.personalInfo.location || "UNDOCUMENTED"}
              </p>
            </div>
          </div>
        </div>

        {/* Skills Box */}
        <div className="p-5 border border-muted-cyan/30 bg-muted-cyan/5 space-y-4 relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-soft-coral shadow-[0_0_8px_rgba(147,51,234,0.8)]" />

          <div className="flex items-center gap-2 mb-2 pb-3 border-b border-muted-cyan/20">
            <CheckCircle2 className="h-4 w-4 text-soft-coral" />
            <h4 className="font-mono text-[10px] font-bold text-editorial-black uppercase tracking-widest">
              Mapped Tensors ({store.skills.length})
            </h4>
            <Button
              variant="link"
              className="ml-auto text-[9px] h-auto p-0 font-mono text-soft-coral uppercase tracking-widest hover:text-muted-cyan"
              onClick={() => store.setStep(3)}
            >
              [ EDIT_TENSORS ]
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {store.skills.map((s) => (
              <div
                key={s}
                className="px-2 py-1 bg-muted-cyan/10 border border-muted-cyan/30 font-mono text-[9px] uppercase tracking-widest text-editorial-black font-bold shadow-[0_0_5px_rgba(37,157,244,0.1)]"
              >
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-editorial-black/10 flex justify-between items-center shrink-0">
        <Button
          variant="ghost"
          onClick={store.prevStep}
          disabled={isSubmitting}
          className="font-mono text-[10px] uppercase tracking-widest text-editorial-black/50 hover:text-editorial-black hover:bg-editorial-black/5 rounded-none"
        >
          {" "}
          <ArrowLeft className="mr-2 h-3 w-3" /> Revert
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-muted-cyan/10 border border-muted-cyan text-muted-cyan hover:bg-muted-cyan hover:text-[#09090b] shadow-[0_0_10px_rgba(37,157,244,0.2)] rounded-none font-mono text-[10px] uppercase tracking-[0.2em] font-bold min-w-[200px] transition-all group"
        >
          {" "}
          {isSubmitting ? (
            <span className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin" /> EXECUTING DEPLOYMENT
            </span>
          ) : (
            <span className="flex items-center gap-3 drop-shadow-[0_0_2px_rgba(37,157,244,0.5)]">
              INITIALIZE SYSTEM
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
