"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Briefcase, GraduationCap, ArrowDown, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import api from "@/lib/api-client";

const COMMON_SKILLS = [
  "Python", "JavaScript", "SQL", "React", "Docker", "AWS",
  "Pandas", "TensorFlow", "Kubernetes", "Java", "Node.js", "PostgreSQL",
  "TypeScript", "Go", "Spark", "PyTorch", "Azure", "GCP",
];

const HERO_FEATURES = [
  { icon: <FileText className="h-10 w-10" />, label: "Resume Parsing", desc: "AI-powered skill extraction from your resume" },
  { icon: <Briefcase className="h-10 w-10" />, label: "50+ Tech Roles", desc: "Comprehensive Singapore job market coverage" },
  { icon: <GraduationCap className="h-10 w-10" />, label: "SCTP Courses", desc: "SkillsFuture-eligible upskilling paths" },
];

export default function ProfileInput() {
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: "",
    education: "bachelor",
    years_experience: 0,
    age: "",
    skills: [] as string[],
    resume_text: "",
    is_career_switcher: false,
  });
  const [customSkill, setCustomSkill] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      let profile = null;
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const res = await api.get("/api/profile/me");
          profile = res.data;
          localStorage.setItem("profileId", profile.id);
        } catch (err) {
          console.error(err);
          // No linked profile
        }
      }
      if (!profile) {
        const profileId = localStorage.getItem("profileId");
        if (profileId) {
          try {
            const res = await api.get(`/api/profile/${profileId}`);
            profile = res.data;
          } catch (err) {
            console.error(err);
            // Profile not found
          }
        }
      }
      if (profile) {
        setForm({
          name: profile.name || "",
          education: profile.education || "bachelor",
          years_experience: profile.years_experience || 0,
          age: profile.age ?? "",
          skills: profile.skills || [],
          resume_text: "",
          is_career_switcher: profile.is_career_switcher || false,
        });
        setEditMode(true);
      }
    };
    loadProfile();
  }, []);

  const toggleSkill = (skill: string) => {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const addCustomSkill = () => {
    if (customSkill.trim() && !form.skills.includes(customSkill.trim())) {
      setForm((prev) => ({ ...prev, skills: [...prev.skills, customSkill.trim()] }));
      setCustomSkill("");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/api/upload-resume", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((prev) => ({
        ...prev,
        resume_text: res.data.text,
        skills: [...new Set([...prev.skills, ...res.data.skills])],
      }));
      toast.success("Resume parsed successfully!");
    } catch (err) {
      console.error(err);
      setError("Failed to parse resume file. Try pasting text instead.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      ...form,
      age: form.age !== "" ? parseInt(form.age as string) : null,
    };

    try {
      if (editMode) {
        const profileId = localStorage.getItem("profileId");
        await api.patch(`/api/profile/${profileId}`, payload);
        toast.success("Profile updated!");
        router.push("/recommendations");
      } else {
        const res = await api.post("/api/profile", payload);
        localStorage.setItem("profileId", res.data.id);
        toast.success("Profile created! Fetching your job matches...");
        router.push("/recommendations");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save profile. Please try again.");
      setError("Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div>
      {/* Hero Section */}
      <div
        style={{ background: "var(--tenant-gradient)" }}
        className="rounded-xl text-white p-8 md:p-12 mb-8 text-center"
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight">
          Discover Your Next Tech Career in Singapore
        </h1>
        <p className="text-lg mb-8 opacity-90">
          AI-powered job matching, skill gap analysis, and personalized upskilling roadmaps
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          {HERO_FEATURES.map((f) => (
            <div key={f.label} className="opacity-95">
              <div className="flex justify-center mb-2">{f.icon}</div>
              <p className="font-semibold">{f.label}</p>
              <p className="text-sm opacity-80">{f.desc}</p>
            </div>
          ))}
        </div>
        <Button
          size="lg"
          onClick={scrollToForm}
          className="bg-white text-primary hover:bg-gray-100"
        >
          Get Started
          <ArrowDown className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Profile Form */}
      <Card ref={formRef} className="max-w-2xl mx-auto p-8">
        <CardContent className="p-0">
          <h2 className="text-xl font-bold mb-4">
            {editMode ? "Edit Your Profile" : "Your Profile"}
          </h2>
          {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div>
              <Label htmlFor="education">Education</Label>
              <Select value={form.education} onValueChange={(val) => setForm({ ...form, education: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diploma">Diploma</SelectItem>
                  <SelectItem value="bachelor">Bachelor&apos;s</SelectItem>
                  <SelectItem value="master">Master&apos;s</SelectItem>
                  <SelectItem value="phd">PhD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="experience">Years of Experience</Label>
              <Input
                id="experience"
                type="number"
                min={0}
                value={form.years_experience}
                onChange={(e) => setForm({ ...form, years_experience: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="age">Age (optional)</Label>
              <Input
                id="age"
                type="number"
                min={16}
                max={100}
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">Used for SkillsFuture subsidy eligibility (e.g. MCES for 40+)</p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_career_switcher}
                onCheckedChange={(checked) => setForm({ ...form, is_career_switcher: checked })}
                id="career_switcher"
              />
              <Label htmlFor="career_switcher">I am a career switcher</Label>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Select your skills:</p>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SKILLS.map((skill) => (
                  <Badge
                    key={skill}
                    variant={form.skills.includes(skill) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleSkill(skill)}
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Add custom skill..."
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomSkill(); } }}
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={addCustomSkill}>Add</Button>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Upload Resume (PDF, DOCX, or TXT):</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                {uploading ? "Parsing..." : "Upload File"}
              </Button>
            </div>

            <div>
              <Label htmlFor="resume">Or paste resume text</Label>
              <Textarea
                id="resume"
                rows={6}
                value={form.resume_text}
                onChange={(e) => setForm({ ...form, resume_text: e.target.value })}
              />
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Analyzing..." : editMode ? "Update Profile" : "Get Recommendations"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
