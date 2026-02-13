import { useState, useRef, useEffect } from "react";
import {
  Box, Button, Chip, Paper, TextField, Typography, Avatar,
} from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import api from "../api/client";

const SUGGESTED_PROMPTS = [
  "What high-growth roles match my skills?",
  "Which SCTP courses should I take first?",
  "What salary can I expect as a career switcher?",
  "How do I use my SkillsFuture Credits?",
  "Help me prepare for tech interviews",
  "What are the top skills in demand for 2026?",
];

function TypingIndicator() {
  return (
    <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", p: 1.5 }}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: "grey.400",
            animation: "typing-dot 1.4s infinite",
            animationDelay: `${i * 0.2}s`,
            "@keyframes typing-dot": {
              "0%, 60%, 100%": { opacity: 0.3, transform: "scale(0.8)" },
              "30%": { opacity: 1, transform: "scale(1)" },
            },
          }}
        />
      ))}
    </Box>
  );
}

export default function CareerChat() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm WorkD AI, your Senior Career Advisor specialising in Singapore's tech market. Ask me about job roles, skill gaps, SCTP courses, subsidies, or career transition strategies." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    const userMsg = { role: "user", content: msg };
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
    } catch {
      setMessages([...newMsgs, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 700, mx: "auto", display: "flex", flexDirection: "column", height: "70vh" }}>
      <Typography variant="h5" gutterBottom>WorkD AI Career Advisor</Typography>

      <Paper sx={{ flex: 1, overflow: "auto", p: 2, mb: 2 }}>
        {messages.map((msg, i) => (
          <Box key={i} sx={{ display: "flex", gap: 1, mb: 2, justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            {msg.role === "assistant" && (
              <Avatar sx={{ bgcolor: "primary.main", width: 32, height: 32 }}>
                <SmartToyIcon fontSize="small" />
              </Avatar>
            )}
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                maxWidth: "75%",
                bgcolor: msg.role === "user" ? "primary.main" : "grey.100",
                color: msg.role === "user" ? "white" : "text.primary",
                borderRadius: 2,
              }}
            >
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{msg.content}</Typography>
            </Paper>
            {msg.role === "user" && (
              <Avatar sx={{ bgcolor: "secondary.main", width: 32, height: 32 }}>
                <PersonIcon fontSize="small" />
              </Avatar>
            )}
          </Box>
        ))}
        {loading && (
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <Avatar sx={{ bgcolor: "primary.main", width: 32, height: 32 }}>
              <SmartToyIcon fontSize="small" />
            </Avatar>
            <Paper elevation={0} sx={{ bgcolor: "grey.100", borderRadius: 2 }}>
              <TypingIndicator />
            </Paper>
          </Box>
        )}
        <div ref={endRef} />
      </Paper>

      {/* Suggested prompts — show only at start */}
      {messages.length <= 1 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
          {SUGGESTED_PROMPTS.map((prompt) => (
            <Chip
              key={prompt}
              label={prompt}
              variant="outlined"
              color="primary"
              onClick={() => send(prompt)}
              sx={{ cursor: "pointer" }}
            />
          ))}
        </Box>
      )}

      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Ask about careers, skills, SCTP courses..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={loading}
        />
        <Button variant="contained" onClick={() => send()} disabled={loading}>
          Send
        </Button>
      </Box>
    </Box>
  );
}
