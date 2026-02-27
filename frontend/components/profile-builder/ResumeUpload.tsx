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

function UploadingChecklist({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="space-y-3 mt-4">
      {UPLOAD_STEPS.map((step, idx) => {
        const isPast = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        return (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: -10 }}
            animate={{
              opacity: isPast || isCurrent ? 1 : 0.4,
              x: 0,
            }}
            transition={{ delay: idx * 0.1 }}
            className={cn(
              "flex items-center gap-3 text-sm transition-colors duration-500",
              isPast
                ? "text-emerald-500"
                : isCurrent
                  ? "text-primary font-medium"
                  : "text-muted-foreground",
            )}
          >
            <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
              {isPast ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="bg-emerald-500/20 rounded-full p-0.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </motion.div>
              ) : isCurrent ? (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
              )}
            </div>
            <span>{step}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

function RadialProgress({ score }: { score: number }) {
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="40"
          className="stroke-muted/30"
          strokeWidth="8"
          fill="none"
        />
        <motion.circle
          cx="50"
          cy="50"
          r="40"
          className="stroke-primary"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDasharray: "0 251.2" }}
          animate={{ strokeDasharray: `${(score / 100) * 251.2} 251.2` }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="text-3xl font-black tracking-tighter text-foreground"
        >
          {score}
        </motion.span>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          / 100
        </span>
      </div>
    </div>
  );
}

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
        }, 1200);
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
              "flex flex-col items-center justify-center gap-3 h-64 border-2 border-dashed rounded-[2rem] cursor-pointer transition-all duration-500 relative overflow-hidden group",
              isDragging
                ? "border-primary bg-primary/5 scale-[1.02] shadow-[0_0_30px_rgba(var(--primary),0.1)]"
                : "border-border/60 hover:border-primary/50 hover:bg-linear-to-b hover:from-muted/30 hover:to-transparent",
            )}
          >
            {/* Animated dashed border effect on drag */}
            {isDragging && (
              <motion.div
                className="absolute inset-0 border-2 border-primary/40 rounded-[2rem]"
                animate={{ borderStyle: ["dashed", "dotted", "dashed"] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
            <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-size-[20px_20px] pointer-events-none" />
            <motion.div
              className="p-4 rounded-full bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground shadow-sm relative"
              whileHover={{ scale: 1.1, rotate: [0, -10, 10, 0] }}
            >
              <UploadCloud className="h-8 w-8 relative z-10" />
            </motion.div>
            <div className="text-center z-10 mt-2">
              <p className="text-base font-semibold mb-1 text-foreground">
                Drop your resume here
              </p>
              <p className="text-xs text-muted-foreground/80 font-medium tracking-wide">
                OR{" "}
                <span className="text-primary hover:underline underline-offset-2">
                  CLICK TO BROWSE
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
            className="p-8 border border-border rounded-[2rem] bg-card/60 backdrop-blur-xl shadow-xl space-y-6 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-linear-to-r from-primary/5 via-transparent to-primary/5 animate-pulse mix-blend-overlay pointer-events-none" />

            <div className="flex items-center gap-4 relative z-10 border-b border-border/50 pb-6">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0 animate-pulse ring-1 ring-primary/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                <FileText className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-base font-bold truncate block w-full text-foreground">
                  {file?.name}
                </span>
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mt-1">
                  <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                  AI Architect is analyzing...
                </span>
              </div>
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between text-xs font-semibold text-primary mb-3">
                <span className="uppercase tracking-widest text-[10px]">
                  Processing Pipeline
                </span>
                <span className="tabular-nums data-num">
                  {Math.max(apiProgress, 15)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden shadow-inner">
                <motion.div
                  className="h-full bg-linear-to-r from-primary/80 to-primary"
                  initial={{ width: "0%" }}
                  animate={{
                    width: `${Math.max(apiProgress, (currentStepIndex / UPLOAD_STEPS.length) * 100)}%`,
                  }}
                  transition={{ ease: "easeInOut", duration: 0.5 }}
                />
              </div>

              {/* Staggered text checklist */}
              <UploadingChecklist currentIndex={currentStepIndex} />
            </div>
          </motion.div>
        )}

        {/* ── Error ── */}
        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <Alert
              variant="destructive"
              className="rounded-2xl border-destructive/30 bg-destructive/10 backdrop-blur-md shadow-sm"
            >
              <XCircle className="h-5 w-5" />
              <AlertDescription className="font-medium ml-2">
                {errorMsg}
              </AlertDescription>
            </Alert>
            <Button
              variant="outline"
              size="default"
              onClick={reset}
              className="rounded-xl w-full sm:w-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Try Again
            </Button>
          </motion.div>
        )}

        {/* ── Success ── */}
        {status === "success" && result && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header Card */}
            <div className="p-6 border border-emerald-500/20 rounded-[2rem] bg-emerald-500/5 backdrop-blur-sm shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground tracking-tight">
                    Analysis Complete
                  </h3>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">
                    100% data extracted & structured
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                className="h-9 text-xs rounded-xl shadow-sm relative z-10 bg-background/50 backdrop-blur-md"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Upload New
              </Button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Readiness Score (Radial) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="p-6 border border-border rounded-[2rem] bg-card/60 backdrop-blur-md shadow-lg flex flex-col items-center justify-center text-center relative overflow-hidden group"
              >
                <div className="absolute top-0 w-full h-1 bg-linear-to-r from-primary/40 to-primary/10" />
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 w-full text-left flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" /> Career Readiness
                </p>
                <RadialProgress score={result.readiness_score || 0} />
              </motion.div>

              {/* Skills Extracted */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="p-6 border border-border rounded-[2rem] bg-card/60 backdrop-blur-md shadow-lg md:col-span-2 flex flex-col"
              >
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-bold tracking-tight">
                    Strengths & Extracted Skills
                  </h4>
                </div>

                <div className="flex-1 space-y-5">
                  {result.strengths && result.strengths.length > 0 ? (
                    <ul className="text-sm text-muted-foreground space-y-2.5">
                      {result.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="leading-snug">{s}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="flex flex-wrap gap-2 pt-4 border-t border-border/50">
                    {result.skills.slice(0, 8).map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="text-xs px-2.5 py-0.5 rounded-lg bg-secondary/40 font-medium"
                      >
                        {skill}
                      </Badge>
                    ))}
                    {result.skills.length > 8 && (
                      <Badge
                        variant="outline"
                        className="text-xs px-2.5 py-0.5 rounded-lg text-muted-foreground bg-transparent border-dashed"
                      >
                        +{result.skills.length - 8} more
                      </Badge>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Gaps & Recommendations */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-6 border border-amber-500/20 rounded-[2rem] bg-linear-to-b from-amber-500/5 to-transparent shadow-lg md:col-span-3 relative overflow-hidden"
              >
                <div className="absolute right-0 top-0 p-8 opacity-5 pointer-events-none">
                  <AlertTriangle className="w-32 h-32" />
                </div>

                <div className="flex items-center gap-2 mb-5 relative z-10">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <h4 className="text-sm font-bold tracking-tight">
                    Actionable Insights
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                      Identified Gaps
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {result.missing_skills?.map((skill, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs px-2.5 py-0.5 rounded-lg shadow-sm bg-background/50 backdrop-blur-sm"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
                      Recommended Upskilling
                    </p>
                    <ul className="space-y-2">
                      {result.recommended_courses?.map((course, i) => (
                        <li
                          key={i}
                          className="text-sm font-medium text-foreground flex items-center gap-2 leading-tight bg-background/40 px-3 py-2 rounded-xl border border-border/50"
                        >
                          <ChevronRight className="h-4 w-4 text-primary shrink-0" />
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
