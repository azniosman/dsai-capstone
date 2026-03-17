"use client";

import { useProfileBuilderStore } from "@/store/profileBuilderStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { profileApi } from "@/lib/api";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  FileText,
  User,
  ShieldCheck,
  X,
  Plus
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function StepFinalizeProfile() {
  const store = useProfileBuilderStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const router = useRouter();

  const handleAddSkill = (e: React.KeyboardEvent | React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.trim()) return;
    const added = newSkill.trim().toUpperCase();
    if (!store.skills.includes(added)) {
      store.setSkills([...store.skills, added]);
    }
    setNewSkill("");
  };

  const removeSkill = (skillToRemove: string) => {
    store.setSkills(store.skills.filter((s) => s !== skillToRemove));
  };

  const handleSubmit = async () => {
    if (!store.personalInfo.name || !store.personalInfo.email) {
      toast.error("Missing Parameters", {
        description: "Name and Vector ID (Email) are required.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: store.personalInfo.name,
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
            Verify &amp; Finalize Node
          </h3>
        </div>
        <p className="font-mono text-[10px] text-editorial-black/50 border-l border-muted-cyan/30 pl-3 leading-relaxed">
          &gt; Review extracted identity parameters and mapped tensors.
          <br />
          &gt; Update any missing entity data below and securely initialize system.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        {/* Document Verification Box */}
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

        {/* Unified Identity Form */}
        <div className="p-5 border border-muted-cyan/30 bg-muted-cyan/5 space-y-4 relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-muted-cyan shadow-[0_0_8px_rgba(37,157,244,0.8)]" />

          <div className="flex items-center gap-2 mb-2 pb-3 border-b border-muted-cyan/20">
            <User className="h-4 w-4 text-muted-cyan" />
            <h4 className="font-mono text-[10px] font-bold text-editorial-black uppercase tracking-widest">
              Entity Parameters
            </h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-mono text-[9px] font-bold uppercase tracking-widest text-editorial-black/70">
                Name <span className="text-soft-coral ml-1">*</span>
              </Label>
              <Input
                required
                value={store.personalInfo.name}
                onChange={(e) => store.setPersonalInfo({ name: e.target.value })}
                placeholder="Agent Unknown"
                className="font-mono text-xs rounded-none border-b border-muted-cyan/50 bg-muted-cyan/5 focus-visible:border-muted-cyan focus-visible:bg-muted-cyan/10"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-[9px] font-bold uppercase tracking-widest text-editorial-black/70">
                Vector ID (Email) <span className="text-soft-coral ml-1">*</span>
              </Label>
              <Input
                type="email"
                required
                value={store.personalInfo.email}
                onChange={(e) => store.setPersonalInfo({ email: e.target.value })}
                placeholder="operator@network.com"
                className="font-mono text-xs rounded-none border-b border-muted-cyan/50 bg-muted-cyan/5 focus-visible:border-muted-cyan focus-visible:bg-muted-cyan/10"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-[9px] font-bold uppercase tracking-widest text-editorial-black/70">
                Comms Link (Phone)
              </Label>
              <Input
                type="tel"
                value={store.personalInfo.phone}
                onChange={(e) => store.setPersonalInfo({ phone: e.target.value })}
                placeholder="+01 234 567 890"
                className="font-mono text-xs rounded-none border-b border-muted-cyan/50 bg-muted-cyan/5 focus-visible:border-muted-cyan focus-visible:bg-muted-cyan/10"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-[9px] font-bold uppercase tracking-widest text-editorial-black/70">
                Geo-Location Coordinates
              </Label>
              <Input
                value={store.personalInfo.location || "Singapore"}
                onChange={(e) => store.setPersonalInfo({ location: e.target.value })}
                placeholder="Global Node"
                className="font-mono text-xs rounded-none border-b border-muted-cyan/50 bg-muted-cyan/5 focus-visible:border-muted-cyan focus-visible:bg-muted-cyan/10"
              />
            </div>
          </div>
        </div>

        {/* Unified Skills Management */}
        <div className="p-5 border border-muted-cyan/30 bg-muted-cyan/5 space-y-4 relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-soft-coral shadow-[0_0_8px_rgba(147,51,234,0.8)]" />

          <div className="flex items-center gap-2 mb-2 pb-3 border-b border-muted-cyan/20">
            <CheckCircle2 className="h-4 w-4 text-soft-coral" />
            <h4 className="font-mono text-[10px] font-bold text-editorial-black uppercase tracking-widest">
              Mapped Tensors ({store.skills.length})
            </h4>
          </div>
          
          <form
            onSubmit={handleAddSkill}
            className="flex items-center gap-2 mb-4"
          >
            <Input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="e.g. REACT, PYTHON, AWS..."
              className="font-mono text-xs uppercase h-9 rounded-none border-b border-muted-cyan/50 bg-muted-cyan/5 focus-visible:border-muted-cyan focus-visible:bg-muted-cyan/10"
            />
            <Button
              type="submit"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-none bg-muted-cyan/20 border border-muted-cyan text-muted-cyan hover:bg-muted-cyan hover:text-black"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </form>

          <div className="flex flex-wrap gap-2">
            {store.skills.map((s) => (
              <Badge
                key={s}
                variant="secondary"
                className="rounded-none bg-muted-cyan/10 border border-muted-cyan/30 text-editorial-black font-mono text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 px-2 py-1 shadow-[0_0_5px_rgba(37,157,244,0.1)] hover:bg-soft-coral/10 hover:border-soft-coral hover:text-soft-coral transition-colors cursor-pointer group"
                onClick={() => removeSkill(s)}
              >
                {s}
                <X className="h-3 w-3 opacity-50 group-hover:opacity-100" />
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Footer / Initialization */}
      <div className="pt-6 border-t border-editorial-black/10 flex justify-between items-center shrink-0">
        <Button
          variant="ghost"
          onClick={store.prevStep}
          disabled={isSubmitting}
          className="font-mono text-[10px] uppercase tracking-widest text-editorial-black/50 hover:text-editorial-black hover:bg-editorial-black/5 rounded-none"
        >
          <ArrowLeft className="mr-2 h-3 w-3" /> Revert
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            isSubmitting ||
            !store.personalInfo.name ||
            !store.personalInfo.email
          }
          className="bg-muted-cyan/10 border border-muted-cyan text-muted-cyan hover:bg-muted-cyan hover:text-[#09090b] shadow-[0_0_10px_rgba(37,157,244,0.2)] rounded-none font-mono text-[10px] uppercase tracking-[0.2em] font-bold min-w-[200px] transition-all group"
        >
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
