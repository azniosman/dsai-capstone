import { useState, useEffect } from "react";
import {
  Box, Button, Card, CardContent, FormControl, InputLabel, MenuItem,
  Paper, Select, TextField, Typography, Alert, Chip, CircularProgress,
} from "@mui/material";
import api from "../api/client";

const FALLBACK_ROLES = [
  "Data Engineer", "Software Engineer", "Data Scientist", "Data Analyst",
  "ML Engineer", "DevOps Engineer", "Cloud Architect", "Cybersecurity Analyst",
  "Full Stack Developer", "Product Manager",
];

export default function MockInterview() {
  const [roleOptions, setRoleOptions] = useState(FALLBACK_ROLES);
  const [role, setRole] = useState("Software Engineer");

  useEffect(() => {
    api.get("/api/roles")
      .then((res) => {
        const titles = res.data.map((r) => r.title);
        if (titles.length > 0) setRoleOptions(titles);
      })
      .catch(() => {});
  }, []);
  const [difficulty, setDifficulty] = useState("intermediate");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [complete, setComplete] = useState(false);
  const [questionNum, setQuestionNum] = useState(0);

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
    } catch {
      setMessages([{ role: "assistant", content: "Let's start! Tell me about yourself and your experience." }]);
      setQuestionNum(1);
    } finally {
      setLoading(false);
    }
  };

  const sendAnswer = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
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
    } catch {
      setMessages([...newMsgs, { role: "assistant", content: "Could you elaborate on that?" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 700, mx: "auto" }}>
      <Typography variant="h5" gutterBottom>Mock Interview</Typography>

      {!started ? (
        <Paper sx={{ p: 3 }}>
          <Typography variant="body1" gutterBottom>
            Practice for your tech interview! Select a role and difficulty level.
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Target Role</InputLabel>
            <Select value={role} label="Target Role" onChange={(e) => setRole(e.target.value)}>
              {roleOptions.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Difficulty</InputLabel>
            <Select value={difficulty} label="Difficulty" onChange={(e) => setDifficulty(e.target.value)}>
              <MenuItem value="beginner">Beginner</MenuItem>
              <MenuItem value="intermediate">Intermediate</MenuItem>
              <MenuItem value="advanced">Advanced</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" size="large" onClick={startInterview} fullWidth>
            Start Interview
          </Button>
        </Paper>
      ) : (
        <>
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <Chip label={role} color="primary" />
            <Chip label={difficulty} variant="outlined" />
            <Chip label={`Q${questionNum}/5`} variant="outlined" />
          </Box>

          <Paper sx={{ p: 2, mb: 2, maxHeight: 400, overflow: "auto" }}>
            {messages.map((msg, i) => (
              <Box key={i} sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  {msg.role === "assistant" ? "Interviewer" : "You"}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {msg.content}
                </Typography>
                {msg.gapTargeted && msg.targetSkill && (
                  <Chip
                    label={`Targets your gap: ${msg.targetSkill}`}
                    size="small"
                    color="warning"
                    sx={{ mt: 0.5 }}
                  />
                )}
              </Box>
            ))}
            {loading && <CircularProgress size={20} />}
          </Paper>

          {feedback && (
            <Alert severity="info" sx={{ mb: 2 }}>{feedback}</Alert>
          )}

          {complete ? (
            <Button variant="contained" onClick={() => { setStarted(false); setMessages([]); }}>
              Start New Interview
            </Button>
          ) : (
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="Type your answer..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
              <Button variant="contained" onClick={sendAnswer} disabled={loading} sx={{ minWidth: 80 }}>
                Answer
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
