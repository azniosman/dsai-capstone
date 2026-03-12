"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Terminal,
  Loader2,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import api from "@/lib/api-client";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  engine?: string;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  "What skills do I need for ML engineering?",
  "How does SkillsFuture funding work?",
  "What's the demand for cloud engineers in Singapore?",
  "I'm a career switcher - where should I start?",
];

const INITIAL_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "ai",
  content:
    "Hi! I'm SkillBridge AI 👋 I can help you explore Singapore tech careers, SkillsFuture courses, and career transitions. Try asking me anything!",
  engine: "groq",
  timestamp: new Date(),
};

export function DemoChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await api.post("/api/chat", {
        message: content.trim(),
      });

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "ai",
        content: response.data.reply,
        engine: response.data.engine,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "ai",
        content:
          "I apologize, but I'm having trouble connecting right now. Please try again in a moment!",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: "spring" }}
      >
        <Button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className={cn(
            "h-14 w-14 rounded-full shadow-2xl flex items-center justify-center gap-2",
            "bg-primary hover:bg-primary/90 text-white",
            "border-2 border-primary/30",
            "glow-primary"
          )}
        >
          <MessageSquare className="w-6 h-6" />
        </Button>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              height: isMinimized ? "auto" : "600px",
            }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25 }}
            className={cn(
              "fixed bottom-24 right-6 z-50",
              "w-[380px] max-w-[calc(100vw-3rem)]",
              "bg-card border border-primary/20 rounded-2xl",
              "shadow-2xl overflow-hidden",
              "flex flex-col"
            )}
            style={{ minHeight: isMinimized ? "64px" : "600px" }}
          >
            {/* Header */}
            <div className="bg-primary/10 border-b border-primary/20 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 border border-primary/30 rounded-xl flex items-center justify-center">
                  <Terminal className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">
                    SkillBridge AI
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[10px] text-muted-foreground font-mono uppercase">
                      Online
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="h-8 w-8 hover:bg-primary/10"
                >
                  {isMinimized ? (
                    <Maximize2 className="w-4 h-4" />
                  ) : (
                    <Minimize2 className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 hover:bg-primary/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex gap-3",
                        message.role === "user" ? "flex-row-reverse" : ""
                      )}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          message.role === "user"
                            ? "bg-primary/20 border border-primary/30"
                            : "bg-accent/20 border border-accent/30"
                        )}
                      >
                        {message.role === "user" ? (
                          <span className="text-xs font-bold text-primary">
                            U
                          </span>
                        ) : (
                          <Sparkles className="w-4 h-4 text-accent" />
                        )}
                      </div>
                      <div
                        className={cn(
                          "max-w-[75%] rounded-xl p-3 text-sm",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted border border-border/50"
                        )}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </p>
                        {message.engine && (
                          <p className="text-[9px] font-mono text-muted-foreground mt-2 flex items-center gap-1">
                            <Terminal className="w-2.5 h-2.5" />
                            [ENGINE: {message.engine.toUpperCase()}]
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-accent" />
                      </div>
                      <div className="bg-muted border border-border/50 rounded-xl p-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">
                            AI is thinking...
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Suggested Questions */}
                {messages.length === 1 && (
                  <div className="px-4 pb-2">
                    <p className="text-[10px] font-mono text-muted-foreground mb-2 uppercase tracking-wider">
                      Try asking:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTED_QUESTIONS.map((question, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          onClick={() => sendMessage(question)}
                          className="text-[10px] h-7 px-3 rounded-full border-primary/30 text-primary hover:bg-primary/10"
                        >
                          {question.slice(0, 40)}...
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="border-t border-primary/20 p-4 bg-card/50 backdrop-blur-sm">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask about careers, skills, or courses..."
                      className="flex-1 bg-muted/50 border-primary/30 text-sm rounded-xl"
                      disabled={isLoading}
                    />
                    <Button
                      onClick={() => sendMessage(input)}
                      disabled={isLoading || !input.trim()}
                      className="rounded-xl bg-primary hover:bg-primary/90"
                      size="icon"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
