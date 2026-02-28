"use client";

import { useProfileBuilderStore } from "@/store/profileBuilderStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, Plus, X } from "lucide-react";
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
    <div className="flex flex-col h-full space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-bold">Skills</h3>
        <p className="text-sm text-muted-foreground">
          Review the skills extracted from your resume or add missing ones
          manually.
        </p>
      </div>

      <div className="flex-1 space-y-6">
        <form onSubmit={handleAddSkill} className="flex gap-2">
          <Input
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            placeholder="e.g. Python, React, Project Management"
            className="flex-1"
          />
          <Button type="submit" variant="secondary">
            <Plus className="mr-2 h-4 w-4" /> Add
          </Button>
        </form>

        <div className="p-4 border rounded-xl bg-muted/20 min-h-[200px]">
          <div className="flex flex-wrap gap-2">
            {skills.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-4 text-center w-full">
                No skills added yet. Type a skill above to add one.
              </p>
            ) : (
              skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="px-3 py-1.5 text-sm bg-background border flex items-center gap-1.5"
                >
                  {skill}
                  <button
                    onClick={() => removeSkill(skill)}
                    className="hover:bg-muted/80 rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label={`Remove ${skill}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="pt-6 border-t flex justify-between items-center shrink-0">
        <Button variant="outline" onClick={prevStep}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={nextStep} disabled={skills.length === 0}>
          Next Step <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
