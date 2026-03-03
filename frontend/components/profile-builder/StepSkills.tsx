"use client";

import { useProfileBuilderStore } from "@/store/profileBuilderStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, Plus, X, Brain } from "lucide-react";
import { useState } from "react";

export default function StepSkills() {
  const { skills, setSkills, nextStep, prevStep } = useProfileBuilderStore();
  const [newSkill, setNewSkill] = useState("");

  const handleAddSkill = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  return (
    <div className="flex flex-col h-full space-y-6 relative">
      <div className="absolute top-0 right-0 p-1 border border-muted-cyan/20 bg-muted-cyan/5">
        <span className="text-[8px] font-mono text-muted-cyan uppercase tracking-widest">
          TENSOR_MAPPING
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-muted-cyan" />
          <h3 className="text-xl font-sans font-black uppercase tracking-tighter text-editorial-black">
            Competency Tensor
          </h3>
        </div>
        <p className="font-mono text-[10px] text-editorial-black/50 border-l border-muted-cyan/30 pl-3">
          &gt; Review automated node extraction results.
          <br />
          &gt; Append missing operational capacity parameters manually.
        </p>
      </div>

      <div className="flex-1 space-y-6">
        <form onSubmit={handleAddSkill} className="flex gap-2 relative group">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted-cyan font-bold">
              {">"}
            </div>
            <Input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="Inject new node (e.g. PyTorch, MLOps)"
              className="pl-8 font-mono text-xs bg-muted-cyan/5 border-b border-muted-cyan/50 focus-visible:border-muted-cyan focus-visible:bg-muted-cyan/10 transition-all rounded-none placeholder:text-editorial-black/30"
            />
          </div>
          <Button
            type="submit"
            className="bg-muted-cyan/10 border border-muted-cyan text-muted-cyan hover:bg-muted-cyan hover:text-[#09090b] shadow-[0_0_10px_rgba(37,157,244,0.2)] rounded-none font-mono text-[10px] uppercase tracking-[0.2em] font-bold transition-all"
          >
            <Plus className="mr-2 h-3 w-3" /> Append
          </Button>
        </form>

        <div className="p-6 border border-muted-cyan/30 bg-muted-cyan/5 min-h-[220px] shadow-[inset_0_0_20px_rgba(37,157,244,0.05)] relative">
          <div className="absolute top-0 left-0 px-2 py-0.5 bg-muted-cyan text-[#09090b] font-mono text-[8px] font-bold uppercase tracking-widest">
            ACTIVE TUBES: {skills.length}
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {skills.length === 0 ? (
              <p className="font-mono text-[10px] text-editorial-black/40 uppercase tracking-widest flex items-center justify-center w-full h-full min-h-[150px] border border-dashed border-muted-cyan/30">
                [ No Tensors Mapped ]
              </p>
            ) : (
              skills.map((skill) => (
                <div
                  key={skill}
                  className="px-3 py-1.5 font-mono text-[10px] bg-muted-cyan/10 border border-muted-cyan/30 text-editorial-black flex items-center gap-2 group hover:border-muted-cyan transition-colors shadow-[0_0_10px_rgba(0,0,0,0.05)] relative overflow-hidden"
                >
                  {" "}
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-muted-cyan group-hover:bg-[#09090b] transition-colors" />
                  <span className="uppercase tracking-wider font-bold">
                    {skill}
                  </span>
                  <button
                    onClick={() => removeSkill(skill)}
                    className="text-editorial-black/50 hover:text-soft-coral transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-editorial-black/10 flex justify-between items-center shrink-0">
        <Button
          variant="ghost"
          onClick={prevStep}
          className="font-mono text-[10px] uppercase tracking-widest text-editorial-black/50 hover:text-editorial-black hover:bg-editorial-black/5 rounded-none"
        >
          <ArrowLeft className="mr-2 h-3 w-3" /> Revert
        </Button>
        <Button
          onClick={nextStep}
          disabled={skills.length === 0}
          className="bg-muted-cyan/10 border border-muted-cyan text-muted-cyan hover:bg-muted-cyan hover:text-[#09090b] shadow-[0_0_10px_rgba(37,157,244,0.2)] rounded-none font-mono text-[10px] uppercase tracking-[0.2em] font-bold transition-all group min-w-[140px]"
        >
          Next Phase{" "}
          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
}
