"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
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
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Mock Interview</h1>

      {!started ? (
        <Card className="p-6">
          <CardContent className="p-0 space-y-4">
            <p>Practice for your tech interview! Select a role and difficulty level.</p>
            <div>
              <Label>Target Role</Label>
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
            <div>
              <Label>Difficulty</Label>
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
          <div className="flex gap-2 mb-4">
            <Badge className="bg-primary hover:bg-primary">{role}</Badge>
            <Badge variant="outline">{difficulty}</Badge>
            <Badge variant="outline">Q{questionNum}/5</Badge>
          </div>

          <Card className="p-4 mb-4 max-h-[400px] overflow-auto">
            <CardContent className="p-0">
              {messages.map((msg, i) => (
                <div key={`${msg.role}-${i}-${msg.content.slice(0, 20)}`} className="mb-4">
                  <p className="text-xs text-muted-foreground">
                    {msg.role === "assistant" ? "Interviewer" : "You"}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.gapTargeted && msg.targetSkill && (
                    <Badge className="mt-1 bg-orange-100 text-orange-800 hover:bg-orange-100">
                      Targets your gap: {msg.targetSkill}
                    </Badge>
                  )}
                </div>
              ))}
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            </CardContent>
          </Card>

          {feedback && (
            <Alert className="mb-4">
              <AlertDescription>{feedback}</AlertDescription>
            </Alert>
          )}

          {complete ? (
            <Button onClick={() => { setStarted(false); setMessages([]); }}>
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
              <Button onClick={sendAnswer} disabled={loading} className="min-w-[80px]">
                Answer
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
