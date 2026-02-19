"use client";

/**
 * ResumeUpload — drag-and-drop PDF/DOCX upload with progress and result display.
 *
 * Uploads to POST /api/upload-resume (multipart/form-data).
 * On success, displays extracted skills and fires the optional onComplete callback.
 * File size limit: 10 MB (enforced on frontend and backend).
 *
 * Uses only semantic CSS tokens — no hardcoded colors.
 */

import { useState, useCallback, DragEvent, ChangeEvent } from "react";
import { FileText, UploadCloud, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { resumeApi, type ResumeUploadResult } from "@/lib/api";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const ACCEPTED_EXTENSIONS = ["pdf", "docx"];
const ACCEPTED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE_MB = 10;

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface ResumeUploadProps {
  profileId?: number;
  onComplete?: (data: ResumeUploadResult) => void;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

type UploadStatus = "idle" | "uploading" | "success" | "error";

export default function ResumeUpload({ profileId, onComplete }: ResumeUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<ResumeUploadResult | null>(null);

  // ── Validation ──
  const validate = (f: File): string | null => {
    if (f.size > MAX_SIZE_MB * 1024 * 1024)
      return `File too large — maximum ${MAX_SIZE_MB} MB`;
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ACCEPTED_EXTENSIONS.includes(ext))
      return "Only PDF and DOCX files are supported";
    return null;
  };

  // ── Upload logic ──
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
      setProgress(0);
      setErrorMsg("");
      setResult(null);

      try {
        const data = await resumeApi.upload(f, profileId, setProgress);
        setResult(data);
        setStatus("success");
        setProgress(100);
        onComplete?.(data);
      } catch (e: unknown) {
        const detail =
          (e as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail ?? "Upload failed. Please try again.";
        setErrorMsg(detail);
        setStatus("error");
        setProgress(0);
      }
    },
    [profileId, onComplete] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── Drag-and-drop ──
  const onDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true); };
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
    setProgress(0);
    setErrorMsg("");
    setResult(null);
  };

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Idle: Drop Zone ── */}
      {status === "idle" && (
        <label
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-3 h-44 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-150",
            isDragging
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          )}
        >
          <UploadCloud
            className={cn(
              "h-9 w-9 transition-colors",
              isDragging ? "text-primary" : "text-muted-foreground/50"
            )}
          />
          <div className="text-center">
            <p className="text-sm font-medium">
              Drag &amp; drop your resume or{" "}
              <span className="text-primary underline underline-offset-2">browse</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF or DOCX · Max {MAX_SIZE_MB} MB
            </p>
          </div>
          <input
            type="file"
            accept={[...ACCEPTED_EXTENSIONS.map((e) => `.${e}`), ...ACCEPTED_MIME].join(",")}
            onChange={onFileChange}
            className="sr-only"
          />
        </label>
      )}

      {/* ── Uploading ── */}
      {status === "uploading" && (
        <div className="space-y-3 p-4 border border-border rounded-2xl bg-muted/20">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium truncate flex-1">{file?.name}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground">
            Extracting skills from your resume…
          </p>
        </div>
      )}

      {/* ── Error ── */}
      {status === "error" && (
        <div className="space-y-3">
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
          <Button variant="outline" size="sm" onClick={reset}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Try Again
          </Button>
        </div>
      )}

      {/* ── Success ── */}
      {status === "success" && result && (
        <div className="space-y-4 p-4 border border-border rounded-2xl bg-muted/20">
          {/* Status header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-sm font-semibold text-foreground">
                Resume parsed successfully
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={reset}>
              Upload another
            </Button>
          </div>

          {/* Skills */}
          {result.skills.length > 0 && (
            <div className="space-y-2">
              <p className="section-label">
                Skills detected ({result.skills.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Experience */}
          {result.experience_years !== undefined && (
            <p className="text-sm text-muted-foreground">
              Estimated experience:{" "}
              <span className="font-semibold text-foreground data-num">
                {result.experience_years} years
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
