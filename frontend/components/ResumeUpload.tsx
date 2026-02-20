"use client";

import {
  useState,
  useCallback,
  DragEvent,
  ChangeEvent,
  useEffect,
} from "react";
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
  ChevronRight,
  BarChart3,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { resumeApi, type ResumeUploadResult } from "@/lib/api";

const ACCEPTED_EXTENSIONS = ["pdf", "docx"];
const ACCEPTED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE_MB = 10;

const UPLOAD_STEPS = [
  "Uploading document...",
  "Parsing resume text...",
  "Analyzing skills with AI...",
  "Identifying skill gaps...",
  "Generating recommendations...",
];

interface ResumeUploadProps {
  profileId?: number;
  onComplete?: (data: ResumeUploadResult) => void;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

export default function ResumeUpload({
  profileId,
  onComplete,
}: ResumeUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [apiProgress, setApiProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<ResumeUploadResult | null>(null);

  const validate = (f: File): string | null => {
    if (f.size > MAX_SIZE_MB * 1024 * 1024)
      return `File too large — maximum ${MAX_SIZE_MB} MB`;
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ACCEPTED_EXTENSIONS.includes(ext))
      return "Only PDF and DOCX files are supported";
    return null;
  };

  // Fake step progression to make the demo look "smart" and active
  useEffect(() => {
    if (status === "uploading") {
      const interval = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev < UPLOAD_STEPS.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 1500); // Progress to next text step every 1.5s
      return () => clearInterval(interval);
    }
  }, [status]);

  const upload = useCallback(
    async (f: File) => {
      const err = validate(f);
      if (err) {
        setErrorMsg(err);
        setStatus("error");
        return;
      }

      setFile(f);
      setStatus("uploading");
      setApiProgress(0);
      setCurrentStepIndex(0);
      setErrorMsg("");
      setResult(null);

      try {
        const data = await resumeApi.upload(f, profileId, setApiProgress);

        // Add a slight artificial delay if it was too fast, so the user sees the animations
        setTimeout(() => {
          setResult(data);
          setStatus("success");
          onComplete?.(data);
        }, 1000);
      } catch (e: unknown) {
        const detail =
          (e as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail ?? "Upload failed. Please try again.";
        setErrorMsg(detail);
        setStatus("error");
        setApiProgress(0);
      }
    },
    [profileId, onComplete],
  );

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) upload(f);
  };
  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) upload(f);
  };

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setApiProgress(0);
    setCurrentStepIndex(0);
    setErrorMsg("");
    setResult(null);
  };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {/* ── Idle: Drop Zone ── */}
        {status === "idle" && (
          <motion.label
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={cn(
              "flex flex-col items-center justify-center gap-3 h-56 border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-300 relative overflow-hidden group",
              isDragging
                ? "border-primary bg-primary/5 scale-[1.02] shadow-lg shadow-primary/10"
                : "border-border/60 hover:border-primary/50 hover:bg-gradient-to-b hover:from-muted/30 hover:to-transparent",
            )}
          >
            <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[size:20px_20px] pointer-events-none" />
            <div className="p-4 rounded-full bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
              <UploadCloud className="h-8 w-8" />
            </div>
            <div className="text-center z-10">
              <p className="text-sm font-semibold mb-1">
                Drag & drop your resume
              </p>
              <p className="text-xs text-muted-foreground">
                or{" "}
                <span className="text-primary hover:underline">
                  browse files
                </span>{" "}
                (PDF, DOCX)
              </p>
            </div>
            <input
              type="file"
              accept={[
                ...ACCEPTED_EXTENSIONS.map((e) => `.${e}`),
                ...ACCEPTED_MIME,
              ].join(",")}
              onChange={onFileChange}
              className="sr-only"
            />
          </motion.label>
        )}

        {/* ── Uploading ── */}
        {status === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-6 border border-border rounded-3xl bg-card shadow-sm space-y-6 relative overflow-hidden"
          >
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 animate-pulse-slow mix-blend-overlay" />

            <div className="flex items-center gap-3 relative z-10">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 animate-pulse">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold truncate block w-full">
                  {file?.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  Analyzing with AI...
                </span>
              </div>
            </div>

            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between text-xs font-medium text-primary">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentStepIndex}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex items-center gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {UPLOAD_STEPS[currentStepIndex]}
                  </motion.span>
                </AnimatePresence>
                <span className="tabular-nums data-num animate-pulse">
                  {Math.max(apiProgress, 15)}%
                </span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary/80 to-primary"
                  initial={{ width: "0%" }}
                  animate={{
                    width: `${Math.max(apiProgress, (currentStepIndex / UPLOAD_STEPS.length) * 100)}%`,
                  }}
                  transition={{ ease: "easeInOut", duration: 0.5 }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Error ── */}
        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-3"
          >
            <Alert
              variant="destructive"
              className="rounded-2xl border-destructive/20 bg-destructive/5"
            >
              <XCircle className="h-4 w-4" />
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              className="rounded-xl"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Try Again
            </Button>
          </motion.div>
        )}

        {/* ── Success ── */}
        {status === "success" && result && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Header Card */}
            <div className="p-5 border border-emerald-500/20 rounded-3xl bg-emerald-500/[0.02] shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Analysis Complete
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    AI has processed your resume
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                className="h-8 text-xs rounded-xl shadow-sm"
              >
                Upload New
              </Button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Readiness Score */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="p-5 border border-border rounded-3xl bg-card shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden"
              >
                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-primary/40 to-primary/10" />
                <BarChart3 className="h-5 w-5 text-muted-foreground/30 mb-2 absolute left-4 top-4" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                  Career Readiness
                </p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-4xl font-black tracking-tighter text-foreground data-num">
                    {result.readiness_score || 0}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    /100
                  </span>
                </div>
              </motion.div>

              {/* Skills Extracted */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="p-5 border border-border rounded-3xl bg-card shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold">Strengths & Skills</h4>
                </div>
                {result.strengths && result.strengths.length > 0 ? (
                  <ul className="text-xs text-muted-foreground space-y-1.5 mb-3">
                    {result.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="leading-tight">{s}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/50">
                  {result.skills.slice(0, 5).map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="text-[10px] bg-secondary/50"
                    >
                      {skill}
                    </Badge>
                  ))}
                  {result.skills.length > 5 && (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-muted-foreground bg-transparent"
                    >
                      +{result.skills.length - 5} more
                    </Badge>
                  )}
                </div>
              </motion.div>

              {/* Gaps & Recommendations */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="p-5 border border-amber-500/20 rounded-3xl bg-amber-500/2 shadow-sm md:col-span-2"
              >
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <h4 className="text-sm font-semibold">Identified Gaps</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                      Missing Capabilities
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.missing_skills?.map((skill, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs bg-amber-500/5"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                      Recommended Upskilling
                    </p>
                    <ul className="space-y-1.5">
                      {result.recommended_courses?.map((course, i) => (
                        <li
                          key={i}
                          className="text-xs text-muted-foreground flex items-center gap-1.5 leading-tight"
                        >
                          <ChevronRight className="h-3 w-3 text-primary shrink-0" />
                          <span>{course}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
