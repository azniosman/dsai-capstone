"use client";

/**
 * ChatCoach — AI Career Coach chat interface powered by Amazon Bedrock.
 *
 * Standalone embeddable component; drop into any page.
 * State is local (no client-side persistence).
 * All API calls go through /api/chat (FastAPI → Bedrock/Gemini).
 *
 * @param profileId   - Optional profile context attached to every request
 * @param placeholder - Input field placeholder text
 * @param suggestions - Starter questions shown on empty state (2-col grid)
 * @param compact     - Smaller height for embedded panels (default: false)
 */

import { useState, useRef, useEffect, FormEvent } from "react";
import { Bot, User, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { chatApi, type ChatMessage } from "@/lib/api";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface ChatCoachProps {
  profileId?: number;
  placeholder?: string;
  suggestions?: string[];
  /** Constrain height for embedded use */
  compact?: boolean;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const DEFAULT_SUGGESTIONS = [
  "What skills should I focus on for a Data Engineering role?",
  "How do I transition from finance to tech in Singapore?",
  "What SkillsFuture courses are best for cloud computing?",
  "Review my skill gap and suggest a 3-month plan",
];

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

/** Animated three-dot typing indicator */
function TypingDots() {
  return (
    <span
      className="inline-flex items-center gap-1 py-0.5"
      aria-label="AI is typing"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-current animate-typing-dot"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </span>
  );
}

/** Single chat message bubble */
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div
      className={cn("flex gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}
    >
      {/* Avatar */}
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback
          className={cn(
            "text-[10px] font-bold rounded",
            isUser
              ? "bg-secondary text-secondary-foreground"
              : "bg-primary text-primary-foreground",
          )}
        >
          {isUser ? (
            <User className="h-3.5 w-3.5" />
          ) : (
            <Bot className="h-3.5 w-3.5" />
          )}
        </AvatarFallback>
      </Avatar>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card text-foreground border border-border",
        )}
      >
        {msg.isLoading && !msg.content ? (
          <TypingDots />
        ) : (
          <span
            dangerouslySetInnerHTML={{
              __html: msg.content.replace(/\ng/g, "<br/>"),
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function ChatCoach({
  profileId,
  placeholder = "Ask your AI Career Coach anything…",
  suggestions = DEFAULT_SUGGESTIONS,
  compact = false,
}: ChatCoachProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [engine, setEngine] = useState<string>("Connecting...");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to newest message
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    const loadingMsgId = crypto.randomUUID();
    const loadingMsg: Message = {
      id: loadingMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setIsLoading(true);

    // Build conversation history for the API (exclude the placeholder loading msg)
    const history: ChatMessage[] = messages
      .filter((m) => m.id !== loadingMsgId)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));
    history.push({ role: "user", content: text.trim() });

    try {
      let streamedResponse = "";

      await chatApi.sendStream(
        {
          profile_id: profileId ?? null,
          messages: history,
        },
        (chunk: string) => {
          // Check for engine metadata tag
          const engineMatch = chunk.match(/\[ENGINE:\s*(.*?)\]/);
          if (engineMatch) {
            setEngine(engineMatch[1]);
            chunk = chunk.replace(/\[ENGINE:\s*.*?\]\n?/, "");
          }

          streamedResponse += chunk;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === loadingMsgId ? { ...m, content: streamedResponse } : m,
            ),
          );
        },
      );

      // Finalize the message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsgId ? { ...m, isLoading: false } : m,
        ),
      );
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Sorry, I couldn't reach the AI Coach. Please try again.";

      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsgId
            ? { ...m, content: detail, isLoading: false }
            : m,
        ),
      );
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 10);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col rounded-3xl border border-border bg-card/60 backdrop-blur-md overflow-hidden shadow-xl",
        compact ? "min-h-[420px]" : "min-h-[560px]",
      )}
    >
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-border/50 bg-background/50 shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-primary/20 shadow-sm">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
              AI
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">
              SkillBridge Coach
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-2 w-2">
                {isLoading && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span
                  className={cn(
                    "relative inline-flex rounded-full h-2 w-2",
                    isLoading ? "bg-emerald-500" : "bg-emerald-500/50",
                  )}
                ></span>
              </span>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground truncate">
                {engine}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <ScrollArea className="h-[500px] flex flex-col p-0 relative">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-size-[20px_20px] pointer-events-none" />

        {/* Empty state — show suggestion grid */}
        {messages.length === 0 && (
          <div className="space-y-6 flex flex-col items-center justify-center h-full py-8 text-center relative z-10">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
              <Bot className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                How can I help you today?
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-[250px] mx-auto">
                Ask me anything about your career, skill gaps, or learning path.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md mt-4">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left text-xs px-4 py-3 rounded-2xl border border-border/60 bg-card hover:bg-muted/70 hover:border-primary/40 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 leading-snug"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message thread */}
        <div className="space-y-5 mt-2 pb-4 relative z-10">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          <div ref={bottomRef} className="h-1" />
        </div>
      </ScrollArea>

      {/* ── Input ── */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 p-3 border-t border-border/50 bg-background/80 backdrop-blur-md shrink-0 focus-within:bg-background transition-colors"
      >
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="resize-none min-h-[44px] max-h-[120px] text-sm py-3 px-4 rounded-2xl bg-muted/30 border-transparent focus-visible:ring-primary/20 focus-visible:bg-card focus-visible:border-primary/30"
          disabled={isLoading}
        />
        <Button
          type="submit"
          disabled={isLoading || !input.trim()}
          size="icon"
          className="h-11 w-11 rounded-full shrink-0 shadow-sm"
          aria-label="Send message"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5 ml-0.5" />
          )}
        </Button>
      </form>
    </div>
  );
}
