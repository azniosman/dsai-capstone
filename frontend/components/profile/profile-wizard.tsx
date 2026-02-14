"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Upload, FileText, User, GraduationCap, Briefcase, CheckCircle2,
    ArrowRight, ArrowLeft, Loader2, X, Plus
} from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import api from "@/lib/api-client";

const STEPS = [
    { id: 1, label: "Resume", icon: FileText, desc: "Auto-fill with AI" },
    { id: 2, label: "Basics", icon: User, desc: "Personal Info" },
    { id: 3, label: "Skills", icon: GraduationCap, desc: "Your Expertise" },
    { id: 4, label: "Review", icon: CheckCircle2, desc: "Final Check" },
];

const COMMON_SKILLS = [
    "Python", "JavaScript", "SQL", "React", "Docker", "AWS",
    "Pandas", "TensorFlow", "Kubernetes", "Java", "Node.js", "PostgreSQL",
    "TypeScript", "Go", "Spark", "PyTorch", "Azure", "GCP",
];

export default function ProfileWizard() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
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

    // Load existing profile if any
    useEffect(() => {
        const loadProfile = async () => {
            const token = localStorage.getItem("token");
            if (!token) return;
            try {
                const res = await api.get("/api/profile/me");
                const p = res.data;
                setForm({
                    name: p.name || "",
                    education: p.education || "bachelor",
                    years_experience: p.years_experience || 0,
                    age: p.age ?? "",
                    skills: p.skills || [],
                    resume_text: p.resume_text || "",
                    is_career_switcher: p.is_career_switcher || false,
                });
                // If profile exists, maybe skip to review or let them edit? 
                // For now, start at step 1 but pre-filled.
            } catch (err) {
                // No profile logic
            }
        };
        loadProfile();
    }, []);

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
            // Auto-advance to next step
            setTimeout(() => setStep(2), 500);
        } catch (err) {
            console.error(err);
            setError("Failed to parse resume. Please try again or fill manually.");
        } finally {
            setUploading(false);
        }
    };

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

    const validateStep = (currentStep: number) => {
        if (currentStep === 2) {
            if (!form.name.trim()) {
                toast.error("Name is required");
                return false;
            }
        }
        return true;
    };

    const nextStep = () => {
        if (validateStep(step)) {
            setStep((prev) => Math.min(prev + 1, 4));
        }
    };

    const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        const payload = {
            ...form,
            age: form.age !== "" ? parseInt(form.age as string) : null,
        };

        try {
            // Check if updating or creating
            const token = localStorage.getItem("token");
            let isUpdate = false;
            let profileId = localStorage.getItem("profileId");

            if (token && !profileId) {
                try {
                    const me = await api.get("/api/profile/me");
                    profileId = me.data.id;
                    isUpdate = true;
                } catch { }
            } else if (profileId) {
                isUpdate = true;
            }

            if (isUpdate && profileId) {
                await api.patch(`/api/profile/${profileId}`, payload);
                toast.success("Profile updated!");
            } else {
                const res = await api.post("/api/profile", payload);
                localStorage.setItem("profileId", res.data.id);
                toast.success("Profile created!");
            }
            router.push("/recommendations");
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.detail || "Failed to save profile.";
            toast.error(msg);
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Stepper */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    {STEPS.map((s, i) => {
                        const Icon = s.icon;
                        const active = step === s.id;
                        const completed = step > s.id;

                        return (
                            <div key={s.id} className="flex flex-col items-center flex-1">
                                <div
                                    className={`
                    w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-300
                    ${active ? "bg-primary text-primary-foreground scale-110 shadow-lg" :
                                            completed ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}
                  `}
                                >
                                    {completed ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-5 w-5" />}
                                </div>
                                <span className={`text-xs font-medium uppercase tracking-wider ${active ? "text-primary" : "text-muted-foreground"}`}>
                                    {s.label}
                                </span>
                                <span className="text-[10px] text-muted-foreground hidden sm:block">{s.desc}</span>
                            </div>
                        );
                    })}
                </div>
                <Progress value={(step / 4) * 100} className="h-2" />
            </div>

            <Card className="border-none shadow-2xl overflow-hidden glass min-h-[500px] flex flex-col">
                <CardHeader>
                    <CardTitle className="text-2xl">
                        {step === 1 && "Let's Start with Your Resume"}
                        {step === 2 && "Tell Us About Yourself"}
                        {step === 3 && "What Are Your Skills?"}
                        {step === 4 && "Review & Complete"}
                    </CardTitle>
                    <CardDescription>
                        {step === 1 && "Upload your resume to auto-fill your profile details. We support PDF, DOCX, and TXT."}
                        {step === 2 && "Basic information helps us find roles that match your experience level."}
                        {step === 3 && "Add your technical skills to get better job recommendations."}
                        {step === 4 && "Double-check everything before we generate your personalized career plan."}
                    </CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* Step 1: Upload */}
                        {step === 1 && (
                            <div className="flex flex-col items-center justify-center h-full py-10 space-y-6">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="
                    w-full max-w-md h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center 
                    cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group
                  "
                                >
                                    <div className="p-4 bg-primary/10 rounded-full mb-4 group-hover:scale-110 transition-transform">
                                        {uploading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <Upload className="h-8 w-8 text-primary" />}
                                    </div>
                                    <p className="font-semibold text-lg mb-1">Click to Upload Resume</p>
                                    <p className="text-sm text-muted-foreground">PDF, DOCX, or TXT (Max 10MB)</p>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.docx,.doc,.txt"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <div className="relative w-full max-w-md">
                                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or continue manually</span></div>
                                </div>
                                <Button variant="outline" onClick={() => setStep(2)}>Skip Upload</Button>
                            </div>
                        )}

                        {/* Step 2: Basics */}
                        {step === 2 && (
                            <div className="space-y-4 max-w-lg mx-auto">
                                <div>
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input
                                        id="name"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        placeholder="e.g. Jane Doe"
                                        className="h-11"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="education">Education</Label>
                                        <Select value={form.education} onValueChange={(val) => setForm({ ...form, education: val })}>
                                            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="diploma">Diploma</SelectItem>
                                                <SelectItem value="bachelor">Bachelor's</SelectItem>
                                                <SelectItem value="master">Master's</SelectItem>
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
                                            className="h-11"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="age">Age (Optional)</Label>
                                        <Input
                                            id="age"
                                            type="number"
                                            value={form.age}
                                            onChange={(e) => setForm({ ...form, age: e.target.value })}
                                            placeholder="e.g. 30"
                                            className="h-11"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2 py-4 p-4 border rounded-lg bg-muted/30">
                                    <Switch
                                        id="career-switcher"
                                        checked={form.is_career_switcher}
                                        onCheckedChange={(checked) => setForm({ ...form, is_career_switcher: checked })}
                                    />
                                    <div className="space-y-1">
                                        <Label htmlFor="career-switcher" className="cursor-pointer">I am a Career Switcher</Label>
                                        <p className="text-xs text-muted-foreground">Highlight transferable skills matching different domains.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Skills */}
                        {step === 3 && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wider">Suggested Skills</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {COMMON_SKILLS.map((skill) => (
                                            <Badge
                                                key={skill}
                                                variant={form.skills.includes(skill) ? "default" : "outline"}
                                                className={`cursor-pointer h-9 px-4 text-sm transition-all ${form.skills.includes(skill) ? "scale-105" : "hover:border-primary"}`}
                                                onClick={() => toggleSkill(skill)}
                                            >
                                                {skill}
                                                {form.skills.includes(skill) && <X className="ml-1 h-3 w-3" />}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <div className="max-w-md">
                                    <h3 className="text-sm font-medium mb-2">Add Custom Skills</h3>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="e.g. Rust, GraphQL..."
                                            value={customSkill}
                                            onChange={(e) => setCustomSkill(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomSkill(); } }}
                                            className="h-11"
                                        />
                                        <Button onClick={addCustomSkill} variant="secondary" size="icon" className="h-11 w-11 shrink-0">
                                            <Plus className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>

                                {form.skills.length > 0 && (
                                    <div className="p-4 bg-muted/30 rounded-lg">
                                        <h3 className="text-sm font-medium mb-2">Your Selected Skills ({form.skills.length})</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {form.skills.map((skill) => (
                                                <Badge key={skill} variant="secondary" className="pl-3 pr-1 py-1">
                                                    {skill}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-4 w-4 ml-1 hover:bg-destructive/20 hover:text-destructive rounded-full"
                                                        onClick={() => toggleSkill(skill)}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 4: Review */}
                        {step === 4 && (
                            <div className="max-w-lg mx-auto space-y-6">
                                <div className="bg-muted/30 p-6 rounded-xl space-y-4">
                                    <div className="flex items-center justify-between border-b pb-4">
                                        <div>
                                            <h3 className="font-bold text-lg">{form.name}</h3>
                                            <p className="text-muted-foreground">{form.education === "bachelor" ? "Bachelor's Degree" : form.education} • {form.years_experience} Years Exp</p>
                                        </div>
                                        {form.is_career_switcher && <Badge variant="secondary">Career Switcher</Badge>}
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase">Skills</h4>
                                        <div className="flex flex-wrap gap-1">
                                            {form.skills.map(s => <Badge key={s} variant="outline" className="bg-background">{s}</Badge>)}
                                            {form.skills.length === 0 && <span className="text-sm text-muted-foreground italic">No skills selected</span>}
                                        </div>
                                    </div>

                                    {form.resume_text && (
                                        <div className="pt-2">
                                            <div className="flex items-center text-green-600 gap-2 text-sm font-medium">
                                                <FileText className="h-4 w-4" />
                                                Resume Uploaded & Parsed
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                            </div>
                        )}
                    </div>
                </CardContent>

                <CardFooter className="flex justify-between border-t bg-muted/10 p-6">
                    <Button
                        variant="ghost"
                        onClick={prevStep}
                        disabled={step === 1}
                        className="gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back
                    </Button>

                    {step < 4 ? (
                        <Button onClick={nextStep} className="gap-2 px-8">
                            Next Step <ArrowRight className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={loading} className="gap-2 px-8 w-full sm:w-auto" size="lg">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            {loading ? "Creating Profile..." : "Complete Profile"}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
