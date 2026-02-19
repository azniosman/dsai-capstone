"use client";

import { useState, useEffect } from "react";
import { Briefcase, GraduationCap, Code, FileText, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import api from "@/lib/api-client";
import { extractApiError } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const FIELD_LABEL = "text-xs font-semibold uppercase tracking-widest text-muted-foreground";

interface ProfileData {
  id?: number;
  name: string;
  education: string;
  years_experience: number;
  age?: number;
  skills: string[];
  resume_text: string;
  is_career_switcher: boolean;
}

export default function ProfileForm() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [data, setData] = useState<ProfileData>({
    name: "",
    education: "",
    years_experience: 0,
    skills: [],
    resume_text: "",
    is_career_switcher: false,
  });
  const [skillInput, setSkillInput] = useState("");
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setFetching(true);
      const res = await api.get("/api/profile/me");
      if (res.data) {
        setData({
          id: res.data.id,
          name: res.data.name || "",
          education: res.data.education || "",
          years_experience: res.data.years_experience || 0,
          age: res.data.age,
          skills: res.data.skills || [],
          resume_text: res.data.resume_text || "",
          is_career_switcher: res.data.is_career_switcher || false,
        });
        // Persist profileId so other pages (recommendations, skill-gap, roadmap) can find it
        localStorage.setItem("profileId", String(res.data.id));
      }
    } catch (err) {
      // 404 is expected for new users
      console.log("Profile fetch result:", err);
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (data.id) {
        await api.patch(`/api/profile/${data.id}`, data);
        localStorage.setItem("profileId", String(data.id));
      } else {
        const res = await api.post("/api/profile", data);
        setData((prev) => ({ ...prev, id: res.data.id }));
        // Persist profileId so other pages (recommendations, skill-gap, roadmap) can find it
        localStorage.setItem("profileId", String(res.data.id));
      }
      toast.success("Profile saved successfully.");
    } catch (err) {
      toast.error(extractApiError(err, "Failed to save profile"));
    } finally {
      setLoading(false);
    }
  };

  const addSkill = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (skillInput.trim() && !data.skills.includes(skillInput.trim())) {
        const newSkills = [...data.skills, skillInput.trim()];
        setData({ ...data, skills: newSkills });
        setSkillInput("");
      }
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setData({ 
      ...data, 
      skills: data.skills.filter((s) => s !== skillToRemove) 
    });
  };

  const handleExtractSkills = async () => {
    if (!data.resume_text.trim()) {
      toast.error("Please enter resume text first.");
      return;
    }
    setExtracting(true);
    try {
      const res = await api.post("/api/profile/parse-resume", { resume_text: data.resume_text });
      const newSkills = res.data.skills || [];
      if (newSkills.length === 0) {
        toast.info("No new skills found in text.");
      } else {
        // Merge unique
        const merged = Array.from(new Set([...data.skills, ...newSkills]));
        setData({ ...data, skills: merged });
        toast.success(`Extracted ${newSkills.length} skills!`);
      }
    } catch (err) {
      toast.error(extractApiError(err, "Failed to extract skills"));
    } finally {
      setExtracting(false);
    }
  };

  if (fetching) {
    return (
      <Card>
        <CardContent className="p-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <Briefcase className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Professional Profile
          </h2>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="prof-name" className={FIELD_LABEL}>Display Name / Title</Label>
              <Input
                id="prof-name"
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
                placeholder="e.g. Jane Doe"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="experience" className={FIELD_LABEL}>Years of Experience</Label>
              <Input
                id="experience"
                type="number"
                min={0}
                value={data.years_experience}
                onChange={(e) => setData({ ...data, years_experience: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-3 w-3 text-muted-foreground" />
              <Label htmlFor="education" className={FIELD_LABEL}>Education</Label>
            </div>
            <Input
              id="education"
              value={data.education}
              onChange={(e) => setData({ ...data, education: e.target.value })}
              placeholder="e.g. Bachelor of Computer Science, NUS"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Code className="h-3 w-3 text-muted-foreground" />
              <Label htmlFor="skills" className={FIELD_LABEL}>Skills</Label>
            </div>
            <div className="flex gap-2">
              <Input
                id="skills"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={addSkill}
                placeholder="Type a skill and press Enter..."
                className="flex-1"
              />
              <Button type="button" variant="secondary" onClick={() => {
                if (skillInput.trim() && !data.skills.includes(skillInput.trim())) {
                  const newSkills = [...data.skills, skillInput.trim()];
                  setData({ ...data, skills: newSkills });
                  setSkillInput("");
                }
              }}>Add</Button>
            </div>
            
            <div className="flex flex-wrap gap-2 min-h-10 p-3 bg-muted/30 rounded-md border border-dashed">
              {data.skills.length > 0 ? (
                data.skills.map((skill) => (
                  <Badge 
                    key={skill} 
                    variant="secondary" 
                    className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors pr-1" 
                    onClick={() => removeSkill(skill)}
                  >
                    {skill}
                    <span className="ml-1 opacity-50 text-[10px]">✕</span>
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground self-center">No skills added yet.</span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-3 w-3 text-muted-foreground" />
                <Label htmlFor="resume" className={FIELD_LABEL}>Resume Text (Optional)</Label>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleExtractSkills}
                disabled={extracting}
                className="h-7 text-xs gap-1.5"
              >
                {extracting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-primary" />}
                {extracting ? "Analyzing..." : "Auto-Extract Skills"}
              </Button>
            </div>
            <Textarea
              id="resume"
              rows={8}
              value={data.resume_text}
              onChange={(e) => setData({ ...data, resume_text: e.target.value })}
              placeholder="Paste your resume content here..."
              className="font-mono text-xs leading-relaxed"
            />
            <p className="text-[10px] text-muted-foreground">
              Paste your full resume here. Our AI can analyze it to auto-populate your skills and improve recommendation accuracy.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/10">
            <div className="space-y-0.5">
              <Label className="text-base">Career Switcher Mode</Label>
              <p className="text-xs text-muted-foreground">
                Enable to prioritize beginner-friendly recommendations and learning pathways.
              </p>
            </div>
            <Switch
              checked={data.is_career_switcher}
              onCheckedChange={(checked) => setData({ ...data, is_career_switcher: checked })}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Profile...
              </>
            ) : (
              "Save Profile Changes"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
