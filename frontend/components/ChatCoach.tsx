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
    <span className="inline-flex items-center gap-1 py-0.5" aria-label="AI is typing">
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
    <div className={cn("flex gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback
          className={cn(
            "text-[10px] font-bold rounded",
            isUser
              ? "bg-secondary text-secondary-foreground"
              : "bg-primary text-primary-foreground"
          )}
        >
          {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
        </AvatarFallback>
      </Avatar>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-foreground border border-border"
        )}
      >
        {msg.isLoading ? <TypingDots /> : msg.content}
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
  const [engine, setEngine] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    const loadingMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setIsLoading(true);

    // Build conversation history for the API (exclude the placeholder loading msg)
    const history: ChatMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    history.push({ role: "user", content: text.trim() });

    try {
      const res = await chatApi.send({
        profile_id: profileId ?? null,
        messages: history,
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? { ...m, content: res.reply, isLoading: false }
            : m
        )
      );
      if (res.engine) setEngine(res.engine);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Sorry, I couldn't reach the AI Coach. Please try again.";

      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? { ...m, content: detail, isLoading: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
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
        "flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-md",
        compact ? "min-h-[420px]" : "min-h-[560px]"
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30 shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
            AI
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">SkillBridge AI Coach</p>
          <p className="text-xs text-muted-foreground truncate">
            Powered by Amazon Bedrock · Claude 3.5 Sonnet
          </p>
        </div>
        <Badge variant={isLoading ? "warning" : "success"} className="shrink-0 text-[10px]">
          {isLoading ? (
            <><Loader2 className="h-2.5 w-2.5 animate-spin" /> Thinking…</>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {engine ?? "Online"}
            </>
          )}
        </Badge>
      </div>

      {/* ── Messages ── */}
      <ScrollArea className="flex-1 px-4 py-4">
        {/* Empty state — show suggestion grid */}
        {messages.length === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center pt-2">
              Ask me anything about your career, skill gaps, or learning path.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left text-xs px-3 py-2.5 rounded-xl border border-border bg-muted/40 hover:bg-muted/70 hover:border-primary/40 transition-all duration-150 leading-snug"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message thread */}
        <div className="space-y-4 mt-2">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* ── Input ── */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 px-4 py-3 border-t border-border bg-muted/20 shrink-0"
      >
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="resize-none min-h-[40px] max-h-[120px] text-sm"
          disabled={isLoading}
        />
        <Button
          type="submit"
          disabled={isLoading || !input.trim()}
          size="icon"
          aria-label="Send message"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
