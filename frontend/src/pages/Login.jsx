import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, Paper, TextField, Typography, Alert, Tabs, Tab,
} from "@mui/material";
import { useSnackbar } from "../contexts/SnackbarContext";
import api from "../api/client";

export default function Login() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");
  const userName = localStorage.getItem("userName");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("username", form.email);
      params.append("password", form.password);
      const res = await api.post("/api/auth/login", params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      localStorage.setItem("token", res.data.access_token);
      const me = await api.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${res.data.access_token}` },
      });
      localStorage.setItem("userName", me.data.name);
      localStorage.setItem("userEmail", me.data.email);
      showSuccess(`Welcome back, ${me.data.name}!`);
      navigate("/");
    } catch (err) {
      const msg = err.response?.data?.detail || "Login failed";
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/auth/register", form);
      showSuccess("Account created! Please log in.");
      setTab(0);
      setError(null);
    } catch (err) {
      const msg = err.response?.data?.detail || "Registration failed";
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    showSuccess("Logged out successfully.");
    navigate("/");
  };

  if (token) {
    return (
      <Paper sx={{ p: 4, maxWidth: 400, mx: "auto", textAlign: "center" }}>
        <Typography variant="h5" gutterBottom>Welcome, {userName || "User"}</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          You are logged in.
        </Typography>
        <Button variant="outlined" onClick={handleLogout} sx={{ mt: 2 }}>
          Log Out
        </Button>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 4, maxWidth: 400, mx: "auto" }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }} centered>
        <Tab label="Login" />
        <Tab label="Register" />
      </Tabs>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {tab === 0 ? (
        <Box component="form" onSubmit={handleLogin} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <TextField label="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </Box>
      ) : (
        <Box component="form" onSubmit={handleRegister} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <TextField label="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </Button>
        </Box>
      )}
    </Paper>
  );
}
