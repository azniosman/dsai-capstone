"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { AppModal } from "@/components/ui/AppModal";
import { useModalStore } from "@/store/modalStore";
import api from "@/lib/api-client";

const FALLBACK_ROLES = [
  "Data Engineer",
  "Software Engineer",
  "Data Scientist",
  "Data Analyst",
  "ML Engineer",
  "DevOps Engineer",
  "Cloud Architect",
  "Cybersecurity Analyst",
  "Full Stack Developer",
  "Product Manager",
];

interface InterviewMessage {
  role: "user" | "assistant";
  content: string;
  gapTargeted?: boolean;
  targetSkill?: string;
}

export default function InterviewModal() {
  const { isOpen, closeModal } = useModalStore();
  const [roleOptions, setRoleOptions] = useState(FALLBACK_ROLES);
  const [role, setRole] = useState("Software Engineer");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [questionNum, setQuestionNum] = useState(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get("/api/roles")
      .then((res) => {
        const data = res.data;
        if (Array.isArray(data)) {
          const titles = data.map((r: { title: string }) => r.title);
          if (titles.length > 0) setRoleOptions(titles);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const reset = () => {
    setStarted(false);
    setMessages([]);
    setFeedback(null);
    setComplete(false);
    setQuestionNum(0);
    setInput("");
  };

  const handleClose = () => {
    closeModal();
    reset();
  };

  const startInterview = async () => {
    setLoading(true);
    setStarted(true);
    setComplete(false);
    setFeedback(null);
    setMessages([]);
    try {
      const profileId = localStorage.getItem("profileId");
      const res = await api.post("/api/interview", {
        profile_id: profileId ? parseInt(profileId) : null,
        role_title: role,
        messages: [],
        difficulty,
      });
      setMessages([
        {
          role: "assistant",
          content: res.data.reply,
          gapTargeted: res.data.gap_targeted,
          targetSkill: res.data.target_skill,
        },
      ]);
      setQuestionNum(res.data.question_number);
    } catch {
      setMessages([
        {
          role: "assistant",
          content: "Let's start! Tell me about yourself and your experience.",
        },
      ]);
      setQuestionNum(1);
    } finally {
      setLoading(false);
    }
  };

  const sendAnswer = async () => {
    if (!input.trim() || loading) return;
    const userMsg: InterviewMessage = { role: "user", content: input.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);
    try {
      const profileId = localStorage.getItem("profileId");
      const res = await api.post("/api/interview", {
        profile_id: profileId ? parseInt(profileId) : null,
        role_title: role,
        messages: newMsgs,
        difficulty,
      });
      setMessages([
        ...newMsgs,
        {
          role: "assistant",
          content: res.data.reply,
          gapTargeted: res.data.gap_targeted,
          targetSkill: res.data.target_skill,
        },
      ]);
      setQuestionNum(res.data.question_number);
      if (res.data.feedback) setFeedback(res.data.feedback);
      if (res.data.is_complete) setComplete(true);
    } catch {
      toast.error("Interview request failed. Please try again.");
      setMessages([
        ...newMsgs,
        {
          role: "assistant",
          content:
            "Sorry, there was a connection issue. Please try answering again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Mock Interview"
      description={
        started
          ? `${role} · ${difficulty} · Q${questionNum} / 5`
          : "Select a role and difficulty to begin your practice session."
      }
      size="xl"
    >
      {!started ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              A 5-question AI-powered session tailored to your target role and
              skill gaps.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-widest">
              Target Role
            </Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-widest">
              Difficulty
            </Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="lg" className="w-full" onClick={startInterview}>
            Start Interview
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Status badges */}
          <div className="flex gap-2 flex-wrap">
            <Badge variant="accent">{role}</Badge>
            <Badge variant="outline">{difficulty}</Badge>
            <Badge variant="data" className="data-num">
              Q{questionNum} / 5
            </Badge>
          </div>

          {/* Transcript */}
          <Card variant="elevated" className="max-h-[340px] overflow-auto">
            <CardContent className="p-4">
              {messages.map((msg, i) => (
                <div
                  key={`${msg.role}-${i}-${msg.content.slice(0, 20)}`}
                  className="mb-5 last:mb-0"
                >
                  <p className="section-label mb-1.5">
                    {msg.role === "assistant" ? "Interviewer" : "You"}
                  </p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </p>
                  {msg.gapTargeted && msg.targetSkill && (
                    <Badge variant="warning" className="mt-2">
                      Targets your gap: {msg.targetSkill}
                    </Badge>
                  )}
                </div>
              ))}
              {loading && (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              )}
              <div ref={transcriptEndRef} />
            </CardContent>
          </Card>

          {feedback && (
            <Card variant="highlight">
              <CardContent className="p-4">
                <p className="section-label mb-2">Feedback</p>
                <p className="text-sm leading-relaxed">{feedback}</p>
              </CardContent>
            </Card>
          )}

          {complete ? (
            <Button onClick={reset} className="w-full">
              Start New Interview
            </Button>
          ) : (
            <div className="flex gap-2">
              <Textarea
                rows={3}
                placeholder="Type your answer..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                    sendAnswer();
                }}
                disabled={loading}
                className="flex-1"
              />
              <Button
                onClick={sendAnswer}
                disabled={loading}
                className="min-w-[80px] self-end"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Answer"
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </AppModal>
  );
}
