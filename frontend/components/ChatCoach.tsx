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
import { Bot, User, Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { chatApi, type ChatMessage } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

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
    <div className="flex items-center gap-1.5 py-1 px-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-primary"
          animate={{
            y: ["0%", "-50%", "0%"],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/** Single chat message bubble */
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "flex gap-3 w-full",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      {/* Avatar */}
      <Avatar
        className={cn(
          "h-8 w-8 shrink-0 shadow-sm border",
          isUser
            ? "border-secondary bg-secondary"
            : "border-primary/20 bg-primary/10",
        )}
      >
        <AvatarFallback className="bg-transparent">
          {isUser ? (
            <User className="h-4 w-4 text-secondary-foreground" />
          ) : (
            <Bot className="h-4 w-4 text-primary" />
          )}
        </AvatarFallback>
      </Avatar>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[85%] rounded-[1.5rem] px-5 py-3.5 text-sm whitespace-pre-wrap leading-relaxed shadow-sm relative group",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-card text-foreground border border-border/50 rounded-tl-sm hover:border-primary/30 transition-colors",
        )}
      >
        {msg.isLoading && !msg.content ? (
          <TypingDots />
        ) : (
          <span
            dangerouslySetInnerHTML={{
              __html: msg.content.replace(/\n/g, "<br/>"),
            }}
          />
        )}
      </div>
    </motion.div>
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
        "flex flex-col rounded-[2rem] border border-border/60 bg-card/40 backdrop-blur-2xl overflow-hidden shadow-2xl relative",
        compact ? "min-h-[420px]" : "min-h-[580px]",
      )}
    >
      {/* ── Background Glow ── */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-border/40 bg-background/30 shrink-0 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10 border border-primary/20 shadow-sm">
              <AvatarFallback className="bg-primary/10 text-primary">
                <Bot className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            {/* Active Status Dot */}
            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-background rounded-full flex items-center justify-center">
              <span className="relative flex h-2 w-2">
                {isLoading && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={cn(
                    "relative inline-flex rounded-full h-2 w-2",
                    isLoading ? "bg-emerald-500" : "bg-emerald-500/80",
                  )}
                />
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground flex items-center gap-1.5 truncate">
              SkillBridge Coach
              <Sparkles className="h-3 w-3 text-primary animate-pulse" />
            </p>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground truncate">
              {engine}
            </p>
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <ScrollArea className="flex-1 flex flex-col p-0 relative z-10 w-full h-[400px]">
        {/* Empty state — show suggestion grid */}
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="px-6 py-10 h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto"
            >
              <div className="w-20 h-20 rounded-3xl bg-linear-to-b from-primary/20 to-primary/5 text-primary flex items-center justify-center mb-6 shadow-sm border border-primary/10">
                <Bot className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-foreground mb-2">
                How can I help you today?
              </h3>
              <p className="text-sm text-muted-foreground mb-8 max-w-sm">
                Ask me about your career path, interview strategies, or get a
                detailed review of your skill gaps.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {suggestions.map((s, idx) => (
                  <motion.button
                    key={s}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => sendMessage(s)}
                    className="text-left text-sm px-5 py-4 rounded-[1.25rem] border border-border/50 bg-card/50 backdrop-blur-sm hover:bg-muted/70 hover:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all duration-300 leading-snug group shadow-sm hover:shadow-md"
                  >
                    <span className="line-clamp-2 text-foreground/80 group-hover:text-foreground">
                      {s}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message thread */}
        <div className="space-y-6 mt-4 pb-6 px-6 relative z-10 w-full">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          <div ref={bottomRef} className="h-2 w-full" />
        </div>
      </ScrollArea>

      {/* ── Input ── */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-border/40 bg-background/40 backdrop-blur-xl shrink-0 z-10 relative"
      >
        <div className="relative flex items-center group">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="resize-none min-h-[52px] max-h-[120px] text-sm py-4 pl-5 pr-14 rounded-3xl bg-card border-border/50 shadow-inner focus-visible:ring-primary/30 focus-visible:bg-background transition-all"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size="icon"
            className={cn(
              "absolute right-2 h-9 w-9 rounded-full shrink-0 shadow-md transition-all duration-300",
              input.trim() && !isLoading
                ? "bg-primary hover:bg-primary/90 hover:scale-105"
                : "bg-muted text-muted-foreground",
            )}
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Send className="h-4 w-4 ml-0.5" />
            )}
          </Button>
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-2 font-medium">
          AI Coach may produce inaccurate information. Verify critical career
          advice.
        </p>
      </form>
    </div>
  );
}
