"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Trash2, Database, Search, Cpu, Zap, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface PipelineState {
  embedTimeMs?: number;
  searchTimeMs?: number;
  llmTimeMs?: number;
  totalTimeMs?: number;
}

interface Message {
  id: string;
  role: "system" | "user" | "ai";
  content: string;
  sources?: string[];
  pipeline?: PipelineState;
  isStreaming?: boolean;
}

const SUGGESTED_PROMPTS = [
  "Explain the RAG pipeline",
  "Describe system architecture",
  "Which AWS services are used?",
  "How are datasets ingested?",
  "How is the system deployed?",
];

export default function SkillBridgeTerminal() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      role: "system",
      content:
        "SKILLBRIDGE SYSTEM TERMINAL v1.0.4\nType a query to explore the application architecture, or select a suggested prompt.",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activePipelineStep, setActivePipelineStep] = useState<string | null>(
    null,
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activePipelineStep]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: "system",
        content: "Terminal cleared. Awaiting input...",
      },
    ]);
  };

  const submitQuery = async (query: string) => {
    if (!query.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: query.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Simulate real-time pipeline steps for UX
    const steps = [
      { id: "embed", delay: 200 },
      { id: "search", delay: 800 },
      { id: "context", delay: 1500 },
      { id: "llm", delay: 2000 },
    ];

    steps.forEach((step) => {
      setTimeout(() => setActivePipelineStep(step.id), step.delay);
    });

    try {
      const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const baseUrl = rawUrl.replace(/\/+$/, "");
      // Global nestJS prefix is /api, and IntelligenceController has no route prefix
      const res = await fetch(`${baseUrl}/api/system-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!res.ok) throw new Error("Terminal connection unstable");

      const data = await res.json();

      setActivePipelineStep(null);

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "ai",
          content: data.reply || "No response generated.",
          sources: data.sources || [],
          pipeline: data.pipeline,
        },
      ]);
    } catch (err: unknown) {
      setActivePipelineStep(null);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "system",
          content: `[ERROR] ${err instanceof Error ? err.message : "Unknown error"}`,
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const renderPipelineIndicators = () => {
    if (!isLoading && !activePipelineStep) return null;

    const pipelineNodes = [
      { id: "embed", icon: Cpu, label: "EMBEDDING" },
      { id: "search", icon: Search, label: "VECTOR_SEARCH" },
      { id: "context", icon: Database, label: "CONTEXT_BUILD" },
      { id: "llm", icon: Zap, label: "LLM_INFER" },
    ];

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mt-4 mb-2 p-3 bg-brand-slate/30 border border-brand-border rounded-sm"
      >
        {pipelineNodes.map((node, idx) => {
          const isActive = activePipelineStep === node.id;
          const Icon = node.icon;
          return (
            <div key={node.id} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-2 py-1 rounded-sm transition-all duration-300 ${isActive ? "bg-brand-accent/20 text-brand-accent border border-brand-accent/40 shadow-[0_0_10px_rgba(56,189,248,0.3)]" : "text-text-dim"}`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${isActive ? "animate-pulse" : ""}`}
                />
                <span className="text-[10px] uppercase tracking-wider font-bold">
                  {node.label}
                </span>
              </div>
              {idx < pipelineNodes.length - 1 && (
                <div className="w-4 h-[1px] bg-brand-border"></div>
              )}
            </div>
          );
        })}
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full font-mono text-[13px] leading-relaxed relative text-text-main group/terminal">
      {/* Header Actions */}
      <div className="absolute top-0 right-0 flex gap-2 z-20 opacity-0 group-hover/terminal:opacity-100 transition-opacity p-2">
        <button
          onClick={handleClear}
          className="p-1.5 bg-brand-slate/80 hover:bg-brand-accent/20 text-text-dim hover:text-brand-accent border border-brand-border rounded shadow-lg backdrop-blur-sm transition-colors flex items-center gap-2"
          title="Clear Terminal"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase font-bold tracking-wider pr-1">
            Clear
          </span>
        </button>
      </div>

      {/* Terminal History Output */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar pb-6 pr-4 space-y-6"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col gap-2"
            >
              {msg.role === "user" && (
                <div className="flex items-start gap-3">
                  <span className="text-brand-accent mt-0.5">{">"}</span>
                  <div className="text-white font-medium">{msg.content}</div>
                </div>
              )}

              {msg.role === "system" && (
                <div className="text-text-dim/80 italic border-l-2 border-brand-border pl-3 font-semibold pb-1">
                  {msg.content}
                </div>
              )}

              {msg.role === "ai" && (
                <div className="flex flex-col gap-3 pl-4 border-l border-brand-accent/30 relative group">
                  <div className="text-brand-accent text-[11px] font-bold uppercase tracking-widest flex justify-between items-center">
                    <span>SkillBridge AI</span>
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-brand-accent/20 text-text-dim hover:text-brand-accent rounded transition-all"
                      title="Copy Response"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="prose prose-invert prose-pre:bg-brand-navy prose-pre:border prose-pre:border-brand-border prose-p:leading-relaxed prose-a:text-brand-accent max-w-none text-text-main text-[13px]">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>

                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 text-[11px] bg-brand-slate/20 p-2 rounded border border-brand-border/50">
                      <span className="text-text-dim uppercase font-bold tracking-wider mb-1 block">
                        Sources:
                      </span>
                      <ul className="flex flex-col gap-1">
                        {msg.sources.map((s, i) => (
                          <li
                            key={i}
                            className="text-text-dim hover:text-brand-accent transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-border inline-block"></span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {msg.pipeline && (
                    <div className="text-[10px] text-text-dim/60 font-mono flex gap-3 mt-1">
                      <span>Σ: {msg.pipeline.totalTimeMs}ms</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {renderPipelineIndicators()}

        {/* Suggested Prompts Array */}
        {!isLoading && messages.length <= 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap gap-2 pt-4"
          >
            {SUGGESTED_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => submitQuery(prompt)}
                className="px-3 py-1.5 bg-brand-navy border border-brand-border hover:border-brand-accent text-text-dim hover:text-brand-accent hover:bg-brand-accent/5 rounded-sm transition-all text-xs text-left"
              >
                {prompt}
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="pt-4 border-t border-brand-border mt-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitQuery(inputValue);
          }}
          className="flex items-center gap-3 bg-brand-navy border border-brand-border focus-within:border-brand-accent/50 focus-within:shadow-[0_0_15px_rgba(56,189,248,0.15)] rounded-sm p-3 transition-all"
        >
          <span className="text-brand-accent font-bold animate-pulse">
            {">"}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            placeholder={
              isLoading ? "Executing query..." : "Enter system prompt..."
            }
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-text-dim/50 font-mono text-[13px]"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="text-text-dim hover:text-brand-accent disabled:opacity-50 disabled:hover:text-text-dim transition-colors"
          >
            <span className="material-symbols-outlined text-lg">
              keyboard_return
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
