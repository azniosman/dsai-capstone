"use client";

import { useProfileBuilderStore } from "@/store/profileBuilderStore";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileText, X, ArrowRight, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import api from "@/lib/api-client";
import { extractApiError } from "@/lib/utils";

export default function StepUploadResume() {
  const {
    resumeFile,
    setResume,
    setParsedResume,
    nextStep,
    setPersonalInfo,
    setSkills,
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  });

  const handleNext = async () => {
    if (!resumeFile) return nextStep(); // Allow skip if user forces next, but button should be disabled ideally

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", resumeFile);

    try {
      const res = await api.post("/api/upload-resume", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const parsed = res.data;
      setParsedResume(parsed);

      // Auto-fill from parsed data securely
      setPersonalInfo({
        name: (parsed.name as string) || "",
        email: (parsed.email as string) || "",
        phone: (parsed.phone as string) || "",
      });

      if (Array.isArray(parsed.skills)) {
        setSkills(parsed.skills as string[]);
      }

      toast.success("Resume parsed successfully!");
      nextStep();
    } catch (err) {
      toast.error(
        extractApiError(
          err,
          "Failed to parse resume. You can fill out the form manually instead.",
        ),
      );
      nextStep(); // Let them proceed manually if parse fails
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-bold">Upload Your Resume</h3>
        <p className="text-sm text-muted-foreground">
          Let our AI automatically extract your skills, experience, and details.
          You can always edit them later.
        </p>
      </div>

      <div className="flex-1 min-h-[300px]">
        {resumeFile ? (
          <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/30">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate">
                  {resumeFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setResume(null as unknown as File)}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl cursor-pointer transition-colors duration-200 h-full ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            <input {...getInputProps()} />
            <div className="h-16 w-16 mb-4 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <UploadCloud className="h-8 w-8" />
            </div>
            <p className="text-sm font-semibold mb-1 text-center">
              {isDragActive ? "Drop file here" : "Click or drag file to upload"}
            </p>
            <p className="text-xs text-muted-foreground text-center">
              PDF or DOCX up to 5MB
            </p>
          </div>
        )}
      </div>

      <div className="pt-6 border-t flex justify-between items-center shrink-0">
        <Button
          variant="ghost"
          className="text-muted-foreground"
          onClick={nextStep}
          disabled={isUploading}
        >
          Skip to Manual Entry
        </Button>
        <Button
          onClick={handleNext}
          disabled={!resumeFile || isUploading}
          className="min-w-[120px]"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Next Step <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
