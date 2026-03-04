"use client";

import { useEffect, useState } from "react";
import { useModalStore } from "@/store/modalStore";
import { AppModal } from "@/components/ui/AppModal";
import { Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api-client";
import type { Recommendation } from "@/lib/api";

export default function AiExecutiveBriefModal() {
  const { isOpen, closeModal, data, type } = useModalStore();
  const [generating, setGenerating] = useState(false);
  const [aiText, setAiText] = useState<string | null>(null);

  const isModalOpen = isOpen && type === "aiExecutiveBrief";
  const rec = data as Recommendation | null;

  const handleGenerateInsight = async (force: boolean = false) => {
    if (!rec) return;
    if (aiText && !force) return;

    setGenerating(true);
    setAiText(null);
    try {
      const pid = localStorage.getItem("profileId");
      const prompt = `Give a 3-sentence career insight for the role "${rec.title}" with match score ${Math.round(rec.match_score * 100)}%. Key skills I'm missing: ${(rec.missing_skills || []).slice(0, 3).join(", ") || "none"}. Keep it concise and actionable.`;

      const res = await api.post("/api/chat", {
        profile_id: pid ? parseInt(pid) : null,
        messages: [{ role: "user", content: prompt }],
      });

      let text = "";
      if (typeof res.data === "string") {
        text = res.data
          .split("\n")
          .filter((l: string) => !l.startsWith("[ENGINE:"))
          .join("\n")
          .trim();
      } else {
        text = res.data.reply ?? "";
      }

      setAiText(text || "Analysis complete.");
    } catch {
      setAiText("Unable to generate insight at this time.");
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (isModalOpen && rec && !aiText) {
      handleGenerateInsight();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, rec]);

  if (!isModalOpen || !rec) return null;

  return (
    <AppModal
      isOpen={isModalOpen}
      onClose={closeModal}
      title="AI Executive Brief"
      description={`Synthesizing intel for ${rec.title}`}
      size="md"
    >
      <div className="p-6 bg-background-dark border border-primary/30 rounded-xl relative overflow-hidden shadow-[0_0_15px_rgba(37,157,244,0.1)] mt-4">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[30px] pointer-events-none" />
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-primary/10">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary w-4 h-4 shadow-[0_0_8px_rgba(37,157,244,0.8)]" />
            <h3 className="font-mono font-bold uppercase tracking-widest text-[10px] text-primary">
              Executive Summary
            </h3>
          </div>
          {aiText && !generating && (
            <button
              onClick={() => handleGenerateInsight(true)}
              className="flex items-center gap-1 font-mono text-[8px] uppercase font-bold text-primary hover:text-white transition-colors tracking-widest border border-primary/20 bg-primary/5 px-2 py-1 rounded"
            >
              <RefreshCw className="w-3 h-3" /> Re-calculate
            </button>
          )}
        </div>

        <div className="min-h-[120px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {generating ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center space-y-4 py-8"
              >
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="font-mono text-[10px] uppercase font-bold text-primary tracking-widest animate-pulse">
                  Synthesizing Intel...
                </p>
              </motion.div>
            ) : aiText ? (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-4 relative z-10"
              >
                <div className="text-sm sm:text-[13px] font-mono leading-relaxed text-slate-200 border-l-2 border-primary/50 pl-4 py-1 uppercase tracking-wide">
                  {aiText.split("\n").map((line, i) => (
                    <p key={i} className="mb-2 last:mb-0">
                      <span className="text-primary/60 mr-2">&gt;</span>
                      {line.replace(/^>\s*/, "")}
                    </p>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          onClick={closeModal}
          className="bg-primary/10 border border-primary text-primary hover:bg-primary hover:text-background-dark font-mono font-bold uppercase text-[10px] tracking-widest px-8 transition-all"
        >
          Acknowledge
        </Button>
      </div>
    </AppModal>
  );
}
