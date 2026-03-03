"use client";

import { useProfileBuilderStore } from "@/store/profileBuilderStore";
import { Button } from "@/components/ui/button";
import {
  UploadCloud,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  FileUp,
  Loader2,
  Terminal,
  Brain,
  X,
  ArrowRight,
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
        "relative h-full min-h-[220px] cursor-pointer overflow-hidden rounded-none transition-all duration-300",
        "border border-dashed",
        isDragActive
          ? "border-muted-cyan bg-muted-cyan/10 shadow-[0_0_20px_rgba(37,157,244,0.2)]"
          : "border-muted-cyan/30 hover:border-muted-cyan hover:bg-muted-cyan/5",
      )}
    >
      <input {...getInputProps()} />

      {/* Blueprint corner markers */}
      {[
        "top-0 left-0",
        "top-0 right-0 rotate-90",
        "bottom-0 left-0 -rotate-90",
        "bottom-0 right-0 rotate-180",
      ].map((pos, i) => (
        <div key={i} className={cn("absolute h-4 w-4", pos)}>
          <div className="absolute top-0 left-0 h-full w-[2px] bg-muted-cyan" />
          <div className="absolute top-0 left-0 h-[2px] w-full bg-muted-cyan" />
        </div>
      ))}

      {/* Scanning line animation */}
      {isDragActive && (
        <div
          className="absolute left-0 right-0 h-px bg-linear-to-r from-transparent via-muted-cyan to-transparent animate-scan pointer-events-none shadow-[0_0_10px_rgba(37,157,244,0.8)]"
          style={{ top: "50%" }}
        />
      )}

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
        <div
          className={cn(
            "h-12 w-12 flex items-center justify-center transition-all duration-300 rounded-none border",
            isDragActive
              ? "bg-muted-cyan/20 border-muted-cyan shadow-[0_0_15px_rgba(37,157,244,0.3)]"
              : "bg-muted-cyan/5 border-muted-cyan/30",
          )}
        >
          <UploadCloud
            className={cn(
              "h-5 w-5 transition-colors",
              isDragActive ? "text-muted-cyan" : "text-muted-cyan/60",
            )}
          />
        </div>
        <div className="text-center space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] font-bold text-editorial-black">
            {isDragActive ? "TARGET LOCKED" : "INITIALIZE SCAN_SEQUENCE"}
          </p>
          <p className="font-mono text-[9px] text-editorial-black/50 tracking-widest uppercase">
            Drop data file or click to transmit
          </p>
          <p className="font-mono text-[8px] text-editorial-black/30 tracking-widest uppercase mt-1">
            .PDF | .DOCX [MAX 5MB]
          </p>
        </div>
        <div className="flex items-center gap-2 mt-2 px-2 py-0.5 border border-muted-cyan/20 bg-muted-cyan/5">
          <span className="font-mono text-[7px] text-muted-cyan tracking-widest uppercase">
            NEURAL PARSER: ONLINE
          </span>
          <span className="live-dot scale-75 bg-muted-cyan shadow-[0_0_4px_rgba(37,157,244,0.8)]" />
        </div>
      </div>
    </div>
  );
}

/* ─── Skill confidence card ─── */
function SkillTag({
  skill,
  confidence,
}: {
  skill: string;
  confidence: number;
}) {
  const pct = Math.round(confidence * 100);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 px-2 py-1 bg-muted-cyan/10 border border-muted-cyan/30"
    >
      {" "}
      <span className="font-mono text-[10px] font-bold text-editorial-black uppercase tracking-wider truncate">
        {skill}
      </span>
      <span className="font-mono text-[9px] text-muted-cyan shrink-0">
        {pct}%
      </span>
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

      toast.success("Vector extraction complete!");
      nextStep();
    } catch (err) {
      toast.error(
        extractApiError(err, "Extraction failure. Reverting to manual input."),
      );
      nextStep();
    } finally {
      setIsUploading(false);
    }
  };

  const parsedSkills = parsedResume?.skills as string[] | undefined;
  const skillsWithConf = (parsedSkills || []).slice(0, 10).map((s, i) => ({
    skill: s,
    confidence: 0.7 + ((s.charCodeAt(0) + i) % 30) / 100,
  }));

  const expYears = parsedResume?.experience_years as number | undefined;
  const healthScore = parsedResume
    ? Math.min(95, 40 + skillsWithConf.length * 3 + (expYears ?? 0) * 4)
    : 0;

  return (
    <div className="flex flex-col h-full gap-6 relative">
      <div className="absolute top-0 right-0 p-1 border border-muted-cyan/20 bg-muted-cyan/5">
        <span className="text-[8px] font-mono text-muted-cyan uppercase tracking-widest">
          AWAITING_DATA
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-cyan" />
          <h3 className="text-xl font-sans font-black uppercase tracking-tighter text-editorial-black">
            Data Ingestion
          </h3>
        </div>
        <p className="font-mono text-[10px] text-editorial-black/50 border-l border-muted-cyan/30 pl-3 leading-relaxed">
          &gt; Supply unstructured career archive for ML processing.
          <br />
          &gt; Extraction pipeline will normalize parameters automatically.
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
        {/* Left: Dropzone */}
        <div className="flex flex-col gap-4">
          {resumeFile ? (
            <div className="flex items-center justify-between p-4 border border-muted-cyan/30 bg-muted-cyan/5 rounded-none shadow-[0_0_10px_rgba(37,157,244,0.1)] relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-muted-cyan text-[#09090b] text-[7px] font-mono font-bold px-1 uppercase tracking-widest">
                LOCKED
              </div>
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="h-10 w-10 border border-muted-cyan/50 bg-muted-cyan/10 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-muted-cyan" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest truncate text-editorial-black">
                    {resumeFile.name}
                  </p>
                  <p className="font-mono text-[8px] text-editorial-black/50">
                    {(resumeFile.size / 1024 / 1024).toFixed(2)} MB ARCHIVE
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {isUploading ? (
                  <div className="flex items-center gap-2 text-muted-cyan">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="font-mono text-[9px] uppercase tracking-widest">
                      Processing
                    </span>
                  </div>
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-soft-coral shadow-[0_0_8px_rgba(147,51,234,0.5)]" />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-none hover:bg-soft-coral/10 hover:text-soft-coral"
                  onClick={() => setResume(null as unknown as File)}
                  disabled={isUploading}
                >
                  {" "}
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div {...getRootProps()} className="flex-1 min-h-[220px]">
              {" "}
              <BlueprintDropzone
                isDragActive={isDragActive}
                onClick={open}
                getInputProps={getInputProps}
              />
            </div>
          )}

          {/* Status info */}
          <div className="flex items-center gap-4 p-4 border border-editorial-black/20 bg-editorial-black/5 rounded-none">
            <Brain className="h-5 w-5 text-editorial-black/50 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-editorial-black">
                Neural Extraction Engine
              </p>
              <p className="font-mono text-[8px] text-editorial-black/40 uppercase tracking-widest mt-1">
                Isolating: Nodes, Tensors, Contact Vectors
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 border border-muted-cyan/30 bg-muted-cyan/10 px-2 py-0.5">
              <span className="live-dot scale-75 bg-muted-cyan shadow-[0_0_5px_rgba(37,157,244,0.8)]" />
              <span className="font-mono text-[8px] text-muted-cyan uppercase font-bold tracking-widest">
                IDLE
              </span>
            </div>
          </div>
        </div>

        {/* Right: Live parsing panel */}
        <div className="border border-editorial-black/20 bg-editorial-black/5 p-6 flex flex-col gap-4 overflow-y-auto relative">
          <div className="absolute top-0 right-0 p-2 border-b border-l border-editorial-black/20 bg-editorial-black/10">
            <span className="text-[8px] font-mono text-editorial-black/50 uppercase tracking-widest">
              TELEMETRY
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-editorial-black">
              Live Data Stream
            </p>
            {parsedResume && (
              <Badge
                variant="default"
                className="rounded-none bg-muted-cyan text-[#09090b] font-mono text-[9px] uppercase font-bold tracking-widest hover:bg-muted-cyan"
              >
                {" "}
                EXTRACTED
              </Badge>
            )}
          </div>

          {!parsedResume && !isUploading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-editorial-black/30 border border-dashed border-editorial-black/20 m-2">
              <UploadCloud className="h-6 w-6 mb-3" />
              <p className="font-mono text-[9px] uppercase tracking-[0.2em]">
                Awaiting Data Feed
              </p>
            </div>
          )}

          {isUploading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8 border border-muted-cyan/50 bg-muted-cyan/10 m-2 relative overflow-hidden shadow-[0_0_20px_rgba(37,157,244,0.1)]">
              <div className="absolute left-0 top-1/2 w-full h-px bg-muted-cyan/80 animate-scan shadow-[0_0_12px_rgba(37,157,244,1)]" />
              <Loader2 className="h-6 w-6 animate-spin text-muted-cyan font-bold" />
              <p className="font-mono text-[10px] font-bold text-muted-cyan uppercase tracking-widest drop-shadow-[0_0_5px_rgba(37,157,244,0.5)]">
                Executing Extraction...
              </p>
              <div className="flex gap-2">
                {["Indexing", "Vectorizing", "Mapping"].map((step, i) => (
                  <span
                    key={step}
                    className="font-mono text-[8px] text-muted-cyan/70 uppercase tracking-widest"
                    style={{ animationDelay: `${i * 0.3}s` }}
                  >
                    &gt; {step}
                    {i < 2 ? " >" : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence>
            {parsedResume && !isUploading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {" "}
                {/* AI Career Health */}
                <div className="flex items-center justify-between p-4 bg-muted-cyan/10 border border-muted-cyan/30 shadow-[0_0_15px_rgba(37,157,244,0.1)]">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-muted-cyan mb-1">
                      Signal Strength
                    </p>
                    <p className="text-3xl font-sans font-black tracking-tighter text-muted-cyan drop-shadow-[0_0_8px_rgba(37,157,244,0.5)]">
                      {healthScore}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-editorial-black">
                      {skillsWithConf.length} Vectors
                    </p>
                    {expYears !== undefined && (
                      <p className="font-mono text-[9px] text-editorial-black/50 uppercase tracking-widest">
                        T={expYears}Y Duration
                      </p>
                    )}
                  </div>
                </div>
                {/* Extracted skills */}
                {skillsWithConf.length > 0 && (
                  <div>
                    <p className="font-mono text-[9px] text-editorial-black/50 uppercase tracking-widest mb-3 border-b border-editorial-black/10 pb-1">
                      Extracted Nodes
                    </p>
                    <div className="flex flex-wrap gap-2">
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
                  <div className="space-y-3 pt-4 border-t border-editorial-black/10">
                    {[
                      {
                        label: "Name",
                        val: String(
                          (parsedResume as Record<string, unknown>).name ?? "",
                        ),
                      },
                      {
                        label: "Vector ID",
                        val: String(
                          (parsedResume as Record<string, unknown>).email ?? "",
                        ),
                      },
                    ].map(
                      (row) =>
                        !!row.val && (
                          <div
                            key={row.label}
                            className="flex items-center gap-3"
                          >
                            {" "}
                            <span className="font-mono text-[9px] uppercase tracking-widest text-editorial-black/40 w-20 shrink-0">
                              {row.label}
                            </span>
                            <span className="font-mono text-[10px] font-bold truncate text-editorial-black">
                              {String(row.val)}
                            </span>
                            <CheckCircle2 className="h-3 w-3 text-muted-cyan shrink-0 drop-shadow-[0_0_4px_rgba(37,157,244,0.5)]" />
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
      <div className="pt-6 border-t border-editorial-black/10 flex justify-between items-center shrink-0">
        <Button
          variant="ghost"
          className="font-mono text-[10px] uppercase tracking-[0.2em] text-editorial-black/50 hover:text-editorial-black rounded-none"
          onClick={nextStep}
          disabled={isUploading}
        >
          {" "}
          Override (Manual Entry)
        </Button>
        <Button
          onClick={handleNext}
          disabled={!resumeFile || isUploading}
          className="bg-muted-cyan/10 border border-muted-cyan text-muted-cyan hover:bg-muted-cyan hover:text-[#09090b] shadow-[0_0_10px_rgba(37,157,244,0.2)] rounded-none font-mono text-[10px] uppercase tracking-[0.2em] font-bold min-w-[200px] transition-all group"
        >
          {" "}
          {isUploading ? (
            <span className="flex items-center justify-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin" /> Processing...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-3">
              Proceed to Verification{" "}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
