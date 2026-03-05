"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Terminal,
  Send,
  Loader2,
  Brain,
  Zap,
  FileText,
  Map,
  Mic2,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  copilotApi,
  type ChatMessage,
  type CareerIntelligence,
} from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  sender: "ai" | "user";
  text: string;
  time: string;
  isLoading?: boolean;
  isStructured?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COPILOT_ACTIONS = [
  {
    id: "analyze",
    label: "ANALYZE_CAREER",
    icon: Brain,
    description: "Full Intelligence Report",
    color: "text-primary",
    border: "border-primary/30",
    hoverBg: "hover:bg-primary",
    command: "analyze_career" as const,
  },
  {
    id: "skill_gap",
    label: "SKILL_GAP_SCAN",
    icon: Zap,
    description: "Identify Missing Skills",
    color: "text-accent-coral",
    border: "border-accent-coral/30",
    hoverBg: "hover:bg-accent-coral",
    command: "skill_gap" as const,
  },
  {
    id: "career_plan",
    label: "CAREER_PLAN_12M",
    icon: Map,
    description: "12‑Month Transition Plan",
    color: "text-emerald-400",
    border: "border-emerald-400/30",
    hoverBg: "hover:bg-emerald-400",
    command: "career_plan" as const,
  },
  {
    id: "resume_tips",
    label: "RESUME_OPTIMIZER",
    icon: FileText,
    description: "Improvement Tips",
    color: "text-amber-400",
    border: "border-amber-400/30",
    hoverBg: "hover:bg-amber-400",
    command: "resume_tips" as const,
  },
  {
    id: "interview_prep",
    label: "INTERVIEW_PREP",
    icon: Mic2,
    description: "Mock Q&A Practice",
    color: "text-violet-400",
    border: "border-violet-400/30",
    hoverBg: "hover:bg-violet-400",
    command: "interview_prep" as const,
  },
] as const;

type CopilotCommand = (typeof COPILOT_ACTIONS)[number]["command"];

const COMMAND_PROMPTS: Record<CopilotCommand, string> = {
  analyze_career:
    "Analyze my career profile in depth. Provide a comprehensive Career Intelligence Report with sections: Professional Profile, Experience Assessment, Top Skills, Strengths, Development Areas, Recommended Career Paths, and Immediate Next Steps.",
  skill_gap:
    "Perform a detailed skill gap analysis for my target career path. List the skills I'm missing, prioritize them by importance, and recommend specific Singapore resources (SkillsFuture, SCTP) to close each gap.",
  career_plan:
    "Create a structured 12-month career transition plan for me. Include monthly milestones, specific actions for each phase (Foundation, Development, Transition), key resources, and relevant Singapore programmes.",
  resume_tips:
    "Review my resume and provide 6-8 specific, actionable improvement tips. Focus on impact quantification, keyword optimization for ATS systems, and Singapore tech market expectations.",
  interview_prep:
    "Generate 10 targeted interview questions based on my experience and target career path. For each question, include tips on how to structure a strong answer using the STAR method.",
};

function elapsedLabel(startMs: number): string {
  return `T+${((Date.now() - startMs) / 1000).toFixed(2)}s`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CopilotChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [engine, setEngine] = useState<string>("STANDBY");
  const [profileId, setProfileId] = useState<number | undefined>(undefined);
  const [intelligence, setIntelligence] = useState<CareerIntelligence | null>(
    null,
  );
  const [isExtracting, setIsExtracting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = Number(localStorage.getItem("profileId")) || undefined;
    setProfileId(id);

    // Load cached career intelligence if available
    const cached = localStorage.getItem("careerIntelligence");
    if (cached) {
      try {
        setIntelligence(JSON.parse(cached));
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Core send logic ───────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string, command?: CopilotCommand) => {
      if (!text.trim() || isLoading) return;

      const sentAt = Date.now();
      const userMsg: Message = {
        id: `u-${sentAt}`,
        sender: "user",
        text: text.trim(),
        time: elapsedLabel(sentAt),
      };
      const loadingId = `ai-${sentAt}`;
      const loadingMsg: Message = {
        id: loadingId,
        sender: "ai",
        text: "",
        time: "—",
        isLoading: true,
        isStructured: !!command,
      };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setInput("");
      setIsLoading(true);

      const history: ChatMessage[] = messages
        .filter((m) => !m.isLoading)
        .map((m) => ({
          role: m.sender === "ai" ? "assistant" : "user",
          content: m.text,
        }));
      history.push({ role: "user", content: text.trim() });

      try {
        let reply = "";

        // Route through copilot/chat for enriched context
        await copilotApi.chat(
          { profile_id: profileId ?? null, messages: history, command },
          (chunk: string) => {
            const engineMatch = chunk.match(/\[ENGINE:\s*(.*?)\]/);
            if (engineMatch) {
              setEngine(engineMatch[1].trim().toUpperCase());
              chunk = chunk.replace(/\[ENGINE:\s*.*?\]\n?/, "");
            }
            reply += chunk;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === loadingId
                  ? { ...m, text: reply, time: elapsedLabel(sentAt) }
                  : m,
              ),
            );
          },
        );

        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId ? { ...m, isLoading: false } : m,
          ),
        );
      } catch (err: unknown) {
        const detail =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ??
          "CONNECTION_FAILED: Unable to reach Copilot core. Retry.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? {
                  ...m,
                  text: detail,
                  time: elapsedLabel(sentAt),
                  isLoading: false,
                }
              : m,
          ),
        );
      } finally {
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 10);
      }
    },
    [isLoading, messages, profileId],
  );

  // ─── Quick actions ─────────────────────────────────────────────────────────

  const handleQuickAction = useCallback(
    async (command: CopilotCommand) => {
      if (isLoading) return;

      // For analyze, career_plan, resume_tips — use dedicated endpoints for richer output
      if (profileId) {
        if (command === "analyze_career") {
          const sentAt = Date.now();
          const userMsg: Message = {
            id: `u-${sentAt}`,
            sender: "user",
            text: "ANALYZE_CAREER — Generate my full Career Intelligence Report",
            time: elapsedLabel(sentAt),
          };
          const loadingId = `ai-${sentAt}`;
          setMessages((prev) => [
            ...prev,
            userMsg,
            {
              id: loadingId,
              sender: "ai",
              text: "",
              time: "—",
              isLoading: true,
              isStructured: true,
            },
          ]);
          setIsLoading(true);
          try {
            const result = await copilotApi.analyze(profileId);
            setEngine(result.engine.toUpperCase());
            if (result.intelligence) {
              setIntelligence(result.intelligence);
              localStorage.setItem(
                "careerIntelligence",
                JSON.stringify(result.intelligence),
              );
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === loadingId
                  ? {
                      ...m,
                      text: result.analysis,
                      time: elapsedLabel(sentAt),
                      isLoading: false,
                      isStructured: true,
                    }
                  : m,
              ),
            );
          } catch {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === loadingId
                  ? {
                      ...m,
                      text: "Analysis failed. Please try again.",
                      time: elapsedLabel(sentAt),
                      isLoading: false,
                    }
                  : m,
              ),
            );
          } finally {
            setIsLoading(false);
          }
          return;
        }

        if (command === "career_plan") {
          const sentAt = Date.now();
          const userMsg: Message = {
            id: `u-${sentAt}`,
            sender: "user",
            text: "CAREER_PLAN_12M — Generate my 12-month transition roadmap",
            time: elapsedLabel(sentAt),
          };
          const loadingId = `ai-${sentAt}`;
          setMessages((prev) => [
            ...prev,
            userMsg,
            {
              id: loadingId,
              sender: "ai",
              text: "",
              time: "—",
              isLoading: true,
              isStructured: true,
            },
          ]);
          setIsLoading(true);
          try {
            const result = await copilotApi.careerPlan({
              profile_id: profileId,
            });
            setEngine(result.engine.toUpperCase());
            const { plan } = result;
            const formatted =
              `## CAREER TRANSITION PLAN — ${plan.target_role.toUpperCase()}\n\n` +
              `**Duration:** ${plan.total_months} months\n\n` +
              plan.milestones
                .map(
                  (m) =>
                    `### MONTH ${m.month} — ${m.title}\n` +
                    m.actions.map((a) => `• ${a}`).join("\n") +
                    `\n**Outcome:** ${m.outcome}`,
                )
                .join("\n\n") +
              `\n\n**Key Resources:** ${plan.key_resources.join(", ")}\n\n` +
              `**Singapore Programmes:** ${plan.singapore_programmes.join(", ")}`;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === loadingId
                  ? {
                      ...m,
                      text: formatted,
                      time: elapsedLabel(sentAt),
                      isLoading: false,
                      isStructured: true,
                    }
                  : m,
              ),
            );
          } catch {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === loadingId
                  ? {
                      ...m,
                      text: "Plan generation failed. Please try again.",
                      time: elapsedLabel(sentAt),
                      isLoading: false,
                    }
                  : m,
              ),
            );
          } finally {
            setIsLoading(false);
          }
          return;
        }

        if (command === "resume_tips") {
          const sentAt = Date.now();
          const userMsg: Message = {
            id: `u-${sentAt}`,
            sender: "user",
            text: "RESUME_OPTIMIZER — Analyse and improve my resume",
            time: elapsedLabel(sentAt),
          };
          const loadingId = `ai-${sentAt}`;
          setMessages((prev) => [
            ...prev,
            userMsg,
            {
              id: loadingId,
              sender: "ai",
              text: "",
              time: "—",
              isLoading: true,
            },
          ]);
          setIsLoading(true);
          try {
            const result = await copilotApi.resumeTips({
              profile_id: profileId,
            });
            setEngine(result.engine.toUpperCase());
            const formatted =
              `## RESUME OPTIMIZATION REPORT\n\n` +
              result.tips.map((tip, i) => `${i + 1}. ${tip}`).join("\n\n");
            setMessages((prev) =>
              prev.map((m) =>
                m.id === loadingId
                  ? {
                      ...m,
                      text: formatted,
                      time: elapsedLabel(sentAt),
                      isLoading: false,
                      isStructured: true,
                    }
                  : m,
              ),
            );
          } catch {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === loadingId
                  ? {
                      ...m,
                      text: "Resume analysis failed. Please try again.",
                      time: elapsedLabel(sentAt),
                      isLoading: false,
                    }
                  : m,
              ),
            );
          } finally {
            setIsLoading(false);
          }
          return;
        }
      }

      // Fallback: send as a copilot chat message
      sendMessage(COMMAND_PROMPTS[command], command);
    },
    [isLoading, profileId, sendMessage],
  );

  // ─── Extract intelligence ──────────────────────────────────────────────────

  const handleExtract = useCallback(async () => {
    if (!profileId || isExtracting) return;
    setIsExtracting(true);
    try {
      const result = await copilotApi.extract(profileId, true);
      setIntelligence(result.intelligence);
      localStorage.setItem(
        "careerIntelligence",
        JSON.stringify(result.intelligence),
      );
      const sentAt = Date.now();
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${sentAt}`,
          sender: "ai",
          text:
            `✦ CAREER INTELLIGENCE EXTRACTED\n\n` +
            `Experience Level: ${result.intelligence.experience_level}\n` +
            `Top Skills: ${result.intelligence.top_skills.slice(0, 5).join(", ")}\n` +
            `Career Paths: ${result.intelligence.career_paths.join(", ")}\n\n` +
            `Profile Summary: ${result.intelligence.professional_summary}\n\n` +
            `You can now use ANALYZE_CAREER for a full report.`,
          time: elapsedLabel(sentAt),
          isStructured: true,
        },
      ]);
    } catch {
      // silent — user can retry
    } finally {
      setIsExtracting(false);
    }
  }, [profileId, isExtracting]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex h-screen w-full flex-col bg-background-dark font-display text-slate-100 selection:bg-primary selection:text-background-dark overflow-hidden">
      <style>{`
        .cyber-grid {
          background-image: linear-gradient(to right, rgba(37, 157, 244, 0.04) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(37, 157, 244, 0.04) 1px, transparent 1px);
          background-size: 20px 20px;
        }
        .copilot-scroll::-webkit-scrollbar { width: 3px; }
        .copilot-scroll::-webkit-scrollbar-track { background: rgba(37, 157, 244, 0.03); }
        .copilot-scroll::-webkit-scrollbar-thumb { background: rgba(37, 157, 244, 0.25); }
        .copilot-scroll::-webkit-scrollbar-thumb:hover { background: rgba(37, 157, 244, 0.5); }
        .structured-msg h2, .structured-msg h3 { color: rgba(37, 157, 244, 0.9); margin-top: 1rem; margin-bottom: 0.5rem; font-weight: 700; }
        .structured-msg h2 { font-size: 0.75rem; letter-spacing: 0.15em; }
        .structured-msg h3 { font-size: 0.65rem; letter-spacing: 0.12em; color: rgba(255,255,255,0.7); }
        .structured-msg ul, .structured-msg ol { margin-left: 1rem; }
        .structured-msg li { margin-bottom: 0.25rem; }
        .structured-msg strong { color: rgba(37, 157, 244, 0.8); }
      `}</style>

      <div className="absolute inset-0 cyber-grid pointer-events-none z-0" />

      {/* Header */}
      <header className="relative z-20 flex items-center bg-background-dark/90 backdrop-blur-md border-b border-primary/20 px-4 py-3 gap-3">
        <Link
          href="/dashboard"
          className="text-primary flex size-9 shrink-0 items-center justify-center border border-primary/30 hover:bg-primary/10 transition-colors"
        >
          <Terminal className="h-4 w-4" />
        </Link>

        <div className="flex-1 min-w-0">
          <h1 className="text-primary text-[11px] font-bold tracking-[0.2em] font-mono uppercase leading-none">
            AI_CAREER_COPILOT
          </h1>
          <p className="text-[9px] font-mono text-slate-500 tracking-widest mt-0.5">
            SKLBR_INTELLIGENCE_CORE // v2.0
          </p>
        </div>

        {/* Intelligence status badge */}
        {profileId && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2"
          >
            {intelligence ? (
              <div className="flex items-center gap-1.5 border border-primary/30 bg-primary/5 px-2.5 py-1">
                <div className="size-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_5px_rgba(37,157,244,0.8)]" />
                <span className="text-[9px] font-mono text-primary tracking-widest uppercase">
                  PROFILE_LOADED
                </span>
              </div>
            ) : (
              <button
                onClick={handleExtract}
                disabled={isExtracting}
                className="flex items-center gap-1.5 border border-amber-400/40 bg-amber-400/5 px-2.5 py-1 text-amber-400 hover:bg-amber-400/10 transition-colors disabled:opacity-50"
              >
                {isExtracting ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <RefreshCw className="size-3" />
                )}
                <span className="text-[9px] font-mono tracking-widest uppercase">
                  {isExtracting ? "SCANNING..." : "ANALYZE_PROFILE"}
                </span>
              </button>
            )}
          </motion.div>
        )}

        {/* Engine indicator */}
        <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest hidden sm:block">
          ENGINE: <span className="text-primary/70">{engine}</span>
        </div>
      </header>

      {/* Status bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-1 border-b border-primary/10 bg-primary/3">
        <div className="flex items-center gap-2">
          <div
            className={`size-1.5 rounded-full ${
              isLoading
                ? "bg-amber-400 animate-pulse"
                : "bg-primary animate-pulse shadow-[0_0_5px_rgba(37,157,244,0.6)]"
            }`}
          />
          <span className="text-[9px] font-mono text-primary/60 tracking-widest uppercase">
            {isLoading ? "PROCESSING_QUERY" : "COPILOT_ONLINE"}
          </span>
        </div>
        {intelligence && (
          <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">
            LEVEL:{" "}
            <span className="text-primary/50">
              {intelligence.experience_level.toUpperCase()}
            </span>
          </span>
        )}
      </div>

      {/* Messages */}
      <main className="relative z-10 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6 copilot-scroll">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Empty state */}
          <AnimatePresence>
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center min-h-[35vh] text-center gap-6"
              >
                <div className="relative">
                  <div className="absolute inset-0 rounded-full blur-2xl bg-primary/10 animate-pulse" />
                  <div className="relative border border-primary/20 bg-primary/5 p-8">
                    <Brain className="h-12 w-12 text-primary mx-auto mb-3 opacity-60" />
                    <p className="font-mono text-[11px] text-primary tracking-widest uppercase font-bold">
                      COPILOT_READY
                    </p>
                    <p className="font-mono text-[10px] text-slate-500 mt-2 max-w-xs">
                      {profileId
                        ? intelligence
                          ? "Career intelligence loaded. Select an action or type your question."
                          : "Click ANALYZE_PROFILE to extract your career intelligence."
                        : "Upload a resume to unlock full Copilot capabilities."}
                    </p>
                  </div>
                </div>

                {intelligence && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl"
                  >
                    {[
                      { label: "Level", value: intelligence.experience_level },
                      {
                        label: "Top Skills",
                        value: intelligence.top_skills.slice(0, 2).join(", "),
                      },
                      {
                        label: "Best Path",
                        value: intelligence.career_paths[0] ?? "—",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="border border-primary/20 bg-primary/5 px-3 py-2 text-left"
                      >
                        <p className="text-[8px] font-mono text-primary/50 uppercase tracking-widest">
                          {item.label}
                        </p>
                        <p className="text-[11px] font-mono text-slate-300 mt-0.5 truncate">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Message list */}
          {messages.map((msg, idx) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx === messages.length - 1 ? 0 : 0 }}
              className={`flex flex-col gap-1.5 max-w-[90%] sm:max-w-[80%] ${
                msg.sender === "user" ? "items-end ml-auto" : "items-start"
              }`}
            >
              {msg.sender === "ai" ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-primary font-bold tracking-widest uppercase px-2 py-0.5 border border-primary/30 bg-primary/10">
                      COPILOT_CORE
                    </span>
                    <span className="text-[8px] font-mono text-slate-600 uppercase">
                      {msg.time}
                    </span>
                  </div>
                  <div className="bg-background-dark/60 border-l-2 border-primary p-4 sm:p-5 shadow-[2px_2px_0px_rgba(37,157,244,0.06)]">
                    <div
                      className={`font-mono text-[12px] sm:text-[13px] leading-relaxed text-slate-300 ${
                        msg.isStructured ? "structured-msg" : ""
                      }`}
                    >
                      {msg.isLoading && !msg.text ? (
                        <div className="flex items-center gap-2 text-primary/60">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-[10px] tracking-widest animate-pulse">
                            PROCESSING_INTELLIGENCE...
                          </span>
                        </div>
                      ) : msg.isStructured ? (
                        <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed">
                          {msg.text}
                        </pre>
                      ) : (
                        <span className="whitespace-pre-wrap">{msg.text}</span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-mono text-slate-600 uppercase">
                      {msg.time}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 font-bold tracking-widest uppercase px-2 py-0.5 border border-slate-600/50 bg-slate-800/50">
                      USER_NODE
                    </span>
                  </div>
                  <div className="bg-slate-800/50 border-r-2 border-slate-500/50 p-4 sm:p-5">
                    <p className="font-mono text-[12px] sm:text-[13px] leading-relaxed text-slate-200">
                      {msg.text}
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          ))}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 bg-background-dark/95 backdrop-blur-md border-t border-primary/20 p-4 sm:p-5 pb-20 md:pb-5 space-y-3">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Quick action buttons */}
          <div className="grid grid-cols-5 gap-1.5">
            {COPILOT_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.id}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleQuickAction(action.command)}
                  disabled={isLoading}
                  className={`flex flex-col items-center gap-1 border ${action.border} bg-background-dark/80 px-2 py-2.5 ${action.color} ${action.hoverBg} hover:text-background-dark disabled:opacity-30 disabled:cursor-not-allowed transition-all group`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-[7px] font-mono font-bold tracking-widest uppercase leading-none hidden sm:block text-center">
                    {action.label.replace("_", "\n")}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Input bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="relative flex items-center border border-primary/30 bg-background-dark/60 focus-within:border-primary focus-within:shadow-[0_0_12px_rgba(37,157,244,0.08)] transition-all"
          >
            <div className="pl-3 text-primary">
              <ChevronRight className="h-4 w-4" />
            </div>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="w-full bg-transparent border-none focus:ring-0 text-slate-100 font-mono text-[13px] uppercase tracking-wider placeholder:text-slate-700 py-3.5 px-3 disabled:opacity-50"
              placeholder="ASK_COPILOT..."
              type="text"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-primary/10 border-l border-primary/30 text-primary font-mono font-bold text-[10px] px-5 py-3.5 hover:bg-primary hover:text-background-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all uppercase tracking-[0.2em] flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <span className="hidden sm:inline">TRANSMIT</span>
                  <Send className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
