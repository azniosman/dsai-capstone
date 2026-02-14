"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import api from "@/lib/api-client";

const SUGGESTED_PROMPTS = [
  "What high-growth roles match my skills?",
  "Which SCTP courses should I take first?",
  "What salary can I expect as a career switcher?",
  "How do I use my SkillsFuture Credits?",
  "Help me prepare for tech interviews",
  "What are the top skills in demand for 2026?",
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

function TypingIndicator() {
  return (
    <div className="flex gap-1 items-center p-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-gray-400 animate-typing-dot"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}

export default function CareerChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm WorkD AI, your Senior Career Advisor specialising in Singapore's tech market. Ask me about job roles, skill gaps, SCTP courses, subsidies, or career transition strategies." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    const userMsg: Message = { role: "user", content: msg };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    try {
      const profileId = localStorage.getItem("profileId");
      const res = await api.post("/api/chat", {
        profile_id: profileId ? parseInt(profileId) : null,
        messages: newMsgs.map((m) => ({ role: m.role, content: m.content })),
      });
      setMessages([...newMsgs, { role: "assistant", content: res.data.reply }]);
    } catch (err) {
      console.error(err);
      setMessages([...newMsgs, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[70vh]">
      <h1 className="text-2xl font-bold mb-4">WorkD AI Career Advisor</h1>

      <Card className="flex-1 overflow-auto p-4 mb-4">
        <CardContent className="p-0">
          {messages.map((msg, i) => (
            <div
              key={`${msg.role}-${i}-${msg.content.slice(0, 20)}`}
              className={`flex gap-2 mb-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`px-3 py-2 rounded-lg max-w-[75%] text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.content}
              </div>
              {msg.role === "user" && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-[#00897b] text-white">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-2 mb-4">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-lg">
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </CardContent>
      </Card>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <Badge
              key={prompt}
              variant="outline"
              className="cursor-pointer border-primary text-primary hover:bg-primary/10"
              onClick={() => send(prompt)}
            >
              {prompt}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Ask about careers, skills, SCTP courses..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={loading}
        />
        <Button onClick={() => send()} disabled={loading}>Send</Button>
      </div>
    </div>
  );
}
