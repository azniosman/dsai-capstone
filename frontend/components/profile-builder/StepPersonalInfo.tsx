"use client";

import { useProfileBuilderStore } from "@/store/profileBuilderStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function StepPersonalInfo() {
  const { personalInfo, setPersonalInfo, nextStep, prevStep } =
    useProfileBuilderStore();

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    nextStep(); // Advance form upon submit
  };

  return (
    <form onSubmit={handleNext} className="flex flex-col h-full space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-sans font-black uppercase tracking-tighter text-editorial-black flex items-center gap-2">
          <span className="w-2 h-2 bg-muted-cyan shadow-[0_0_8px_rgba(37,157,244,0.8)]" />
          Entity Parameters
        </h3>
        <p className="font-mono text-[10px] text-editorial-black/50 border-l border-muted-cyan/30 pl-3 leading-relaxed">
          &gt; Formalize identity and contact vectors.
          <br />
          &gt; Required for encrypted communication channels.
        </p>
      </div>

      <div className="flex-1 space-y-5">
        <div className="space-y-2">
          <Label
            htmlFor="name"
            className="font-mono text-[9px] font-bold uppercase tracking-widest text-editorial-black/70"
          >
            Name (Full Name) <span className="text-soft-coral ml-1">*</span>
          </Label>
          <Input
            id="name"
            required
            value={personalInfo.name}
            onChange={(e) => setPersonalInfo({ name: e.target.value })}
            placeholder="Agent Unknown"
            className="font-mono text-xs rounded-none border-b border-muted-cyan/50 bg-muted-cyan/5 focus-visible:border-muted-cyan focus-visible:bg-muted-cyan/10"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="font-mono text-[9px] font-bold uppercase tracking-widest text-editorial-black/70"
            >
              Vector ID (Email) <span className="text-soft-coral ml-1">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={personalInfo.email}
              onChange={(e) => setPersonalInfo({ email: e.target.value })}
              placeholder="operator@network.com"
              className="font-mono text-xs rounded-none border-b border-muted-cyan/50 bg-muted-cyan/5 focus-visible:border-muted-cyan focus-visible:bg-muted-cyan/10"
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="phone"
              className="font-mono text-[9px] font-bold uppercase tracking-widest text-editorial-black/70"
            >
              Comms Link (Phone)
            </Label>
            <Input
              id="phone"
              type="tel"
              value={personalInfo.phone}
              onChange={(e) => setPersonalInfo({ phone: e.target.value })}
              placeholder="+01 234 567 890"
              className="font-mono text-xs rounded-none border-b border-muted-cyan/50 bg-muted-cyan/5 focus-visible:border-muted-cyan focus-visible:bg-muted-cyan/10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="location"
            className="font-mono text-[9px] font-bold uppercase tracking-widest text-editorial-black/70"
          >
            Geo-Location Coordinates
          </Label>
          <Input
            id="location"
            value={personalInfo.location || "Singapore"}
            onChange={(e) => setPersonalInfo({ location: e.target.value })}
            placeholder="Global Node"
            className="font-mono text-xs rounded-none border-b border-muted-cyan/50 bg-muted-cyan/5 focus-visible:border-muted-cyan focus-visible:bg-muted-cyan/10"
          />
        </div>
      </div>

      <div className="pt-6 border-t border-editorial-black/10 flex justify-between items-center shrink-0">
        <Button
          type="button"
          variant="ghost"
          onClick={prevStep}
          className="font-mono text-[10px] uppercase tracking-widest text-editorial-black/50 hover:text-editorial-black hover:bg-editorial-black/5 rounded-none"
        >
          <ArrowLeft className="mr-2 h-3 w-3" /> Revert
        </Button>
        <Button
          type="submit"
          disabled={!personalInfo.name || !personalInfo.email}
          className="bg-muted-cyan/10 border border-muted-cyan text-muted-cyan hover:bg-muted-cyan hover:text-[#09090b] shadow-[0_0_10px_rgba(37,157,244,0.2)] rounded-none font-mono text-[10px] uppercase tracking-[0.2em] font-bold transition-all group min-w-[140px]"
        >
          Inject Data{" "}
          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </form>
  );
}
