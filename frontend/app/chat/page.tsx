"use client";

import { useState, useRef, useEffect } from "react";
import { Terminal, Send, Mic, Settings2, Loader2 } from "lucide-react";
import Link from "next/link";
import { chatApi, type ChatMessage } from "@/lib/api";

interface Message {
  id: string;
  sender: "ai" | "user";
  text: string;
  time: string;
  isLoading?: boolean;
}

function elapsedLabel(startMs: number): string {
  const s = ((Date.now() - startMs) / 1000).toFixed(3);
  return `T+${s}s`;
}

const QUICK_COMMANDS = [
  "What are my skill gaps?",
  "What is the salary range for my skill set?",
  "What skills should I prioritize?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [engine, setEngine] = useState<string>("STANDBY");
  const [profileId, setProfileId] = useState<number | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = Number(localStorage.getItem("profileId")) || undefined;
    setProfileId(id);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
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
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setIsLoading(true);

    // Build history from all non-loading messages + new user turn
    const history: ChatMessage[] = messages
      .filter((m) => !m.isLoading)
      .map((m) => ({
        role: m.sender === "ai" ? "assistant" : "user",
        content: m.text,
      }));
    history.push({ role: "user", content: text.trim() });

    try {
      let reply = "";

      await chatApi.sendStream(
        { profile_id: profileId ?? null, messages: history },
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
        prev.map((m) => (m.id === loadingId ? { ...m, isLoading: false } : m)),
      );
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "CONNECTION_FAILED: Unable to reach AI core. Retry.";

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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="relative flex h-screen w-full flex-col bg-background-dark font-display text-slate-100 selection:bg-primary selection:text-background-dark overflow-hidden">
      <style>{`
        .cyber-grid {
          background-image: linear-gradient(to right, rgba(37, 157, 244, 0.05) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(37, 157, 244, 0.05) 1px, transparent 1px);
          background-size: 20px 20px;
        }
        .scanline {
          width: 100%;
          height: 2px;
          background: rgba(37, 157, 244, 0.1);
          position: absolute;
          top: 0;
          left: 0;
          z-index: 10;
          pointer-events: none;
        }
        .terminal-scroll::-webkit-scrollbar { width: 4px; }
        .terminal-scroll::-webkit-scrollbar-track { background: rgba(37, 157, 244, 0.05); }
        .terminal-scroll::-webkit-scrollbar-thumb { background: rgba(37, 157, 244, 0.3); }
        .terminal-scroll::-webkit-scrollbar-thumb:hover { background: rgba(37, 157, 244, 0.6); }
      `}</style>

      <div className="absolute inset-0 cyber-grid pointer-events-none z-0" />
      <div className="scanline" />

      {/* Header */}
      <header className="relative z-20 flex items-center bg-background-dark/80 backdrop-blur-md border-b border-primary/20 p-4 justify-between">
        <Link
          href="/dashboard"
          className="text-primary flex size-10 shrink-0 items-center justify-center border border-primary/30 hover:bg-primary/10 transition-colors"
        >
          <Terminal className="h-5 w-5" />
        </Link>
        <h1 className="text-primary text-sm font-bold leading-tight tracking-[0.2em] flex-1 text-center font-mono uppercase">
          NEURAL_ASSISTANT_INTERFACE
        </h1>
        <div className="flex w-10 items-center justify-end">
          <button className="flex items-center justify-center size-10 border border-primary/30 text-primary hover:bg-primary/10 transition-colors">
            <Settings2 className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* System Status Bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-1.5 border-b border-primary/10 bg-primary/5">
        <div className="flex items-center gap-2">
          <div
            className={`size-1.5 rounded-full shadow-[0_0_5px_rgba(37,157,244,0.8)] ${
              isLoading
                ? "bg-amber-400 animate-pulse"
                : "bg-primary animate-pulse"
            }`}
          />
          <span className="text-[10px] font-mono text-primary tracking-widest uppercase font-bold">
            {isLoading ? "PROCESSING_INPUT" : "CORE_SYSTEM_ACTIVE"}
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          ENGINE: <span className="text-primary/70">{engine}</span>
        </span>
      </div>

      {/* Chat Area */}
      <main className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 terminal-scroll">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[40vh] text-center gap-4">
              <div className="border border-primary/20 bg-primary/5 p-6">
                <Terminal className="h-10 w-10 text-primary mx-auto mb-3 opacity-60" />
                <p className="font-mono text-[11px] text-primary tracking-widest uppercase">
                  AWAITING_FIRST_PACKET
                </p>
                <p className="font-mono text-[10px] text-slate-500 mt-1">
                  Enter a command or select a query below
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col gap-2 max-w-[85%] sm:max-w-[75%] ${
                msg.sender === "user" ? "items-end ml-auto" : "items-start"
              }`}
            >
              {msg.sender === "ai" ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-primary font-bold tracking-widest uppercase px-2 py-0.5 border border-primary/30 bg-primary/10 shadow-[0_0_10px_rgba(37,157,244,0.1)]">
                      SKLBR_CORE
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 uppercase">
                      {msg.time}
                    </span>
                  </div>
                  <div className="bg-(--card-dark) border-l-2 border-primary p-4 sm:p-5 shadow-[4px_4px_0px_0px_rgba(37,157,244,0.05)]">
                    <div className="font-mono text-xs sm:text-[13px] leading-relaxed text-slate-300">
                      {msg.isLoading && !msg.text ? (
                        <div className="flex items-center gap-2 text-primary/60">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-[11px] tracking-widest">
                            PROCESSING...
                          </span>
                        </div>
                      ) : (
                        <span className="whitespace-pre-wrap">{msg.text}</span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-slate-500 uppercase">
                      {msg.time}
                    </span>
                    <span className="text-[10px] font-mono text-slate-300 font-bold tracking-widest uppercase px-2 py-0.5 border border-slate-600 bg-slate-800">
                      USER_NODE
                    </span>
                  </div>
                  <div className="bg-slate-800 border-r-2 border-slate-400 p-4 sm:p-5">
                    <p className="font-mono text-xs sm:text-[13px] leading-relaxed text-slate-100 uppercase tracking-wider">
                      {msg.text}
                    </p>
                  </div>
                </>
              )}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Footer / Input Area */}
      <footer className="relative z-20 bg-background-dark/90 backdrop-blur-md border-t border-primary/20 p-4 sm:p-6 pb-20 md:pb-6 space-y-4">
        <div className="max-w-4xl mx-auto">
          {/* Quick Commands */}
          <div className="flex gap-2 overflow-x-auto pb-4 terminal-scroll">
            {QUICK_COMMANDS.map((cmd) => (
              <button
                key={cmd}
                onClick={() => sendMessage(cmd)}
                disabled={isLoading}
                className="whitespace-nowrap font-mono text-[10px] font-bold border border-primary/30 bg-primary/5 px-4 py-2 text-primary hover:bg-primary hover:text-background-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all uppercase tracking-widest"
              >
                {cmd}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="flex flex-col gap-3">
            <form
              onSubmit={handleSubmit}
              className="relative flex items-center border border-primary/30 bg-(--card-dark) focus-within:border-primary focus-within:shadow-[0_0_15px_rgba(37,157,244,0.1)] transition-all"
            >
              <div className="pl-4 text-primary">
                <span className="font-mono font-bold text-lg animate-pulse">
                  &gt;
                </span>
              </div>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="w-full bg-transparent border-none focus:ring-0 text-slate-100 font-mono text-sm sm:text-base uppercase tracking-wider placeholder:text-slate-600 py-4 sm:py-5 px-3 disabled:opacity-60"
                placeholder="AWAITING_INPUT_PACKET..."
                type="text"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-primary/20 border-l border-primary/30 text-primary font-mono font-bold text-[11px] px-6 py-4 sm:py-5 hover:bg-primary hover:text-background-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-[0.2em] flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span className="hidden sm:inline">SEND_PACKET</span>
                    <Send className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="flex justify-between px-2">
              <div className="flex gap-6">
                <button
                  disabled
                  className="text-slate-600 flex items-center gap-1 cursor-not-allowed"
                >
                  <Mic className="h-4 w-4" />
                  <span className="text-[9px] font-mono uppercase tracking-widest hidden sm:inline">
                    Audio
                  </span>
                </button>
              </div>
              <span className="text-[9px] font-mono text-primary/40 uppercase tracking-widest">
                ENCRYPT_MODE: <span className="text-primary/70">AES_256</span>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
