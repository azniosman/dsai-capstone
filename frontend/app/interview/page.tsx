"use client";

import { useState, useEffect } from "react";
import { Loader2, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import api from "@/lib/api-client";

const FALLBACK_ROLES = [
  "Data Engineer", "Software Engineer", "Data Scientist", "Data Analyst",
  "ML Engineer", "DevOps Engineer", "Cloud Architect", "Cybersecurity Analyst",
  "Full Stack Developer", "Product Manager",
];

interface InterviewMessage {
  role: "user" | "assistant";
  content: string;
  gapTargeted?: boolean;
  targetSkill?: string;
}

export default function MockInterview() {
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

  useEffect(() => {
    api.get("/api/roles")
      .then((res) => {
        const titles = res.data.map((r: { title: string }) => r.title);
        if (titles.length > 0) setRoleOptions(titles);
      })
      .catch((err) => { console.error(err); });
  }, []);

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
      setMessages([{
        role: "assistant",
        content: res.data.reply,
        gapTargeted: res.data.gap_targeted,
        targetSkill: res.data.target_skill,
      }]);
      setQuestionNum(res.data.question_number);
    } catch (err) {
      console.error(err);
      setMessages([{ role: "assistant", content: "Let's start! Tell me about yourself and your experience." }]);
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
      setMessages([...newMsgs, {
        role: "assistant",
        content: res.data.reply,
        gapTargeted: res.data.gap_targeted,
        targetSkill: res.data.target_skill,
      }]);
      setQuestionNum(res.data.question_number);
      if (res.data.feedback) setFeedback(res.data.feedback);
      if (res.data.is_complete) setComplete(true);
    } catch (err) {
      console.error(err);
      toast.error("Interview request failed. Please try again.");
      setMessages([...newMsgs, { role: "assistant", content: "Sorry, there was a connection issue. Please try answering again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <header>
        <p className="section-label mb-1">Practice</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Mock Interview</h1>
      </header>

      {!started ? (
        <Card variant="data">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Select a role and difficulty to begin a 5-question practice session.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-widest" style={{ letterSpacing: "0.08em" }}>
                Target Role
              </Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-widest" style={{ letterSpacing: "0.08em" }}>
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
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Status bar */}
          <div className="flex gap-2 items-center">
            <Badge variant="accent">{role}</Badge>
            <Badge variant="outline">{difficulty}</Badge>
            <Badge variant="data" className="data-num">Q{questionNum} / 5</Badge>
          </div>

          {/* Transcript */}
          <Card variant="elevated" className="max-h-[400px] overflow-auto">
            <CardContent className="p-4">
              {messages.map((msg, i) => (
                <div key={`${msg.role}-${i}-${msg.content.slice(0, 20)}`} className="mb-5 last:mb-0">
                  <p className="section-label mb-1.5">
                    {msg.role === "assistant" ? "Interviewer" : "You"}
                  </p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  {msg.gapTargeted && msg.targetSkill && (
                    <Badge variant="warning" className="mt-2">
                      Targets your gap: {msg.targetSkill}
                    </Badge>
                  )}
                </div>
              ))}
              {loading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
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
            <Button onClick={() => { setStarted(false); setMessages([]); }} className="w-full">
              Start New Interview
            </Button>
          ) : (
            <div className="flex gap-2">
              <Textarea
                rows={3}
                placeholder="Type your answer..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                className="flex-1"
              />
              <Button onClick={sendAnswer} disabled={loading} className="min-w-[80px] self-end">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Answer"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
