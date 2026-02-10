import { useState, useRef, useEffect } from "react";
import {
  Box, Button, Paper, TextField, Typography, Avatar, CircularProgress,
} from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import api from "../api/client";

export default function CareerChat() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm your career intelligence coach. Ask me anything about job roles, skill gaps, SCTP courses, or career transition strategies in Singapore." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
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
      <Typography variant="h5" gutterBottom>Career Coach</Typography>

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
            <CircularProgress size={20} />
          </Box>
        )}
        <div ref={endRef} />
      </Paper>

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
        <Button variant="contained" onClick={send} disabled={loading}>
          Send
        </Button>
      </Box>
    </Box>
  );
}
