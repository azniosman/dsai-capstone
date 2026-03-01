"use client";

import { useProfileBuilderStore } from "@/store/profileBuilderStore";
import { Button } from "@/components/ui/button";
import {
  UploadCloud,
  FileText,
  X,
  ArrowRight,
  Loader2,
  Brain,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import api from "@/lib/api-client";
import { extractApiError, cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Blueprint dropzone scanning line ─── */
function BlueprintDropzone({
  isDragActive,
  onClick,
  getInputProps,
}: {
  isDragActive: boolean;
  onClick?: () => void;
  getInputProps: () => object;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative h-full min-h-[200px] cursor-pointer overflow-hidden rounded-xl transition-all duration-200",
        "border-2 border-dashed",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-primary/30 hover:border-primary/60 hover:bg-primary/3",
      )}
    >
      <input {...getInputProps()} />

      {/* Blueprint corner markers */}
      {[
        "top-2 left-2",
        "top-2 right-2 rotate-90",
        "bottom-2 left-2 -rotate-90",
        "bottom-2 right-2 rotate-180",
      ].map((pos, i) => (
        <div key={i} className={cn("absolute h-4 w-4", pos)}>
          <div className="absolute top-0 left-0 h-full w-[2px] bg-primary/40" />
          <div className="absolute top-0 left-0 h-[2px] w-full bg-primary/40" />
        </div>
      ))}

      {/* Scanning line animation */}
      {isDragActive && (
        <div
          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent animate-scan pointer-events-none"
          style={{ top: "50%" }}
        />
      )}

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
        <div
          className={cn(
            "h-14 w-14 rounded-full flex items-center justify-center transition-all duration-200",
            isDragActive
              ? "bg-primary/20 ring-2 ring-primary/40"
              : "bg-primary/10 ring-1 ring-primary/20",
          )}
        >
          <UploadCloud
            className={cn(
              "h-7 w-7 transition-colors",
              isDragActive ? "text-primary" : "text-primary/60",
            )}
          />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold">
            {isDragActive ? "Drop to scan…" : "Drop resume or click to upload"}
          </p>
          <p className="micro-type mt-1 opacity-50">PDF or DOCX · max 5MB</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="micro-type text-[9px] opacity-40">
            AI PARSING ENABLED
          </span>
          <span className="live-dot scale-75" />
        </div>
      </div>
    </div>
  );
}

/* ─── Skill confidence card ─── */
function SkillTag({ skill, confidence }: { skill: string; confidence: number }) {
  const pct = Math.round(confidence * 100);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-primary/5 border border-primary/15"
    >
      <span className="text-xs font-semibold text-foreground truncate">
        {skill}
      </span>
      <span className="micro-type text-[9px] text-primary shrink-0">{pct}%</span>
    </motion.div>
  );
}

export default function StepUploadResume() {
  const {
    resumeFile,
    setResume,
    setParsedResume,
    nextStep,
    setPersonalInfo,
    setSkills,
    parsedResume,
  } = useProfileBuilderStore();
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setResume(acceptedFiles[0]);
      }
    },
    [setResume],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    noClick: true,
  });

  const handleNext = async () => {
    if (!resumeFile) return nextStep();

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", resumeFile);

    try {
      const res = await api.post("/api/upload-resume", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const parsed = res.data;
      setParsedResume(parsed);

      setPersonalInfo({
        name: (parsed.name as string) || "",
        email: (parsed.email as string) || "",
        phone: (parsed.phone as string) || "",
      });

      if (Array.isArray(parsed.skills)) {
        setSkills(parsed.skills as string[]);
      }

      toast.success("Resume scanned successfully!");
      nextStep();
    } catch (err) {
      toast.error(
        extractApiError(
          err,
          "Failed to parse resume. You can fill out the form manually.",
        ),
      );
      nextStep();
    } finally {
      setIsUploading(false);
    }
  };

  // Skills with synthetic confidence scores for display
  const parsedSkills = parsedResume?.skills as string[] | undefined;
  const skillsWithConf = (parsedSkills || []).slice(0, 10).map((s, i) => ({
    skill: s,
    confidence: 0.7 + ((s.charCodeAt(0) + i) % 30) / 100,
  }));

  const expYears = parsedResume?.experience_years as number | undefined;
  const healthScore = parsedResume
    ? Math.min(
        95,
        40 +
          (skillsWithConf.length * 3) +
          ((expYears ?? 0) * 4),
      )
    : 0;

  return (
    <div className="flex flex-col h-full gap-4">
      <div>
        <h3 className="text-lg font-bold">Upload Resume</h3>
        <p className="text-sm text-muted-foreground">
          AI scans your resume to extract skills and experience automatically.
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
        {/* Left: Dropzone */}
        <div className="flex flex-col gap-3">
          {resumeFile ? (
            <div className="flex items-center justify-between p-4 rounded-xl border border-primary/30 bg-primary/5">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {resumeFile.name}
                  </p>
                  <p className="micro-type text-[9px] opacity-50">
                    {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isUploading ? (
                  <div className="flex items-center gap-1.5 text-primary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="micro-type text-[9px]">Scanning…</span>
                  </div>
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setResume(null as unknown as File)}
                  disabled={isUploading}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div
              {...getRootProps()}
              className="flex-1 min-h-[200px]"
            >
              <BlueprintDropzone
                isDragActive={isDragActive}
                onClick={open}
                getInputProps={getInputProps}
              />
            </div>
          )}

          {/* Status info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
            <Brain className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">AI Parsing System</p>
              <p className="micro-type text-[9px] opacity-50">
                Extracts: skills, experience, education, contact info
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="live-dot" />
              <span className="micro-type text-[9px] text-green-600">
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Right: Live parsing panel */}
        <div className="glass-card p-4 flex flex-col gap-3 overflow-y-auto">
          <div className="flex items-center justify-between">
            <p className="micro-type">Live AI Parsing</p>
            {parsedResume && (
              <Badge
                variant="default"
                className="micro-type text-[9px] bg-green-600"
              >
                Scanned
              </Badge>
            )}
          </div>

          {!parsedResume && !isUploading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-muted-foreground/50">
              <UploadCloud className="h-8 w-8 mb-2" />
              <p className="text-xs">Upload your resume to begin AI parsing</p>
            </div>
          )}

          {isUploading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">
                Scanning document…
              </p>
              <div className="flex gap-1.5">
                {["Extracting skills", "Parsing experience", "Mapping profile"].map(
                  (step, i) => (
                    <span
                      key={step}
                      className="micro-type text-[9px] text-primary/60"
                      style={{ animationDelay: `${i * 0.3}s` }}
                    >
                      {step}
                      {i < 2 ? " →" : ""}
                    </span>
                  ),
                )}
              </div>
            </div>
          )}

          <AnimatePresence>
            {parsedResume && !isUploading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {/* AI Career Health */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/15">
                  <div>
                    <p className="micro-type text-[9px] opacity-60 mb-0.5">
                      AI Career Health
                    </p>
                    <p
                      className="text-2xl font-black tabular-nums text-primary"
                    >
                      {healthScore}
                    </p>
                    <p className="micro-type text-[9px] opacity-50">/ 100</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold">
                      {skillsWithConf.length} skills found
                    </p>
                    {expYears !== undefined && (
                      <p className="micro-type text-[9px] opacity-60">
                        {expYears}yr experience
                      </p>
                    )}
                  </div>
                </div>

                {/* Extracted skills */}
                {skillsWithConf.length > 0 && (
                  <div>
                    <p className="micro-type mb-2 opacity-60">
                      Extracted Skills
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {skillsWithConf.map(({ skill, confidence }) => (
                        <SkillTag
                          key={skill}
                          skill={skill}
                          confidence={confidence}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick info */}
                {!!(parsedResume as Record<string, unknown>).name && (
                  <div className="space-y-1.5 pt-2 border-t border-border/50">
                    {[
                      {
                        label: "Name",
                        val: String((parsedResume as Record<string, unknown>).name ?? ""),
                      },
                      {
                        label: "Email",
                        val: String((parsedResume as Record<string, unknown>).email ?? ""),
                      },
                    ].map(
                      (row) =>
                        !!row.val && (
                          <div
                            key={row.label}
                            className="flex items-center gap-2"
                          >
                            <span className="micro-type text-[9px] opacity-40 w-10 shrink-0">
                              {row.label}
                            </span>
                            <span className="text-xs font-medium truncate">
                              {String(row.val)}
                            </span>
                            <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                          </div>
                        ),
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-border/50 flex justify-between items-center shrink-0">
        <Button
          variant="ghost"
          className="text-muted-foreground text-sm"
          onClick={nextStep}
          disabled={isUploading}
        >
          Skip to Manual Entry
        </Button>
        <Button
          onClick={handleNext}
          disabled={!resumeFile || isUploading}
          className="clay-btn min-w-[130px]"
        >
          {isUploading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Scanning…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4" /> Next Step{" "}
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
