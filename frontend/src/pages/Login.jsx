import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, Paper, TextField, Typography, Alert, Tabs, Tab, Link as MuiLink,
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

  // Forgot-password flow state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetForm, setResetForm] = useState({ token: "", new_password: "" });
  const [forgotStep, setForgotStep] = useState(1); // 1 = enter email, 2 = enter token + new password

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
      // Auto-load linked profile
      try {
        const profile = await api.get("/api/profile/me", {
          headers: { Authorization: `Bearer ${res.data.access_token}` },
        });
        localStorage.setItem("profileId", profile.data.id);
      } catch {
        // No linked profile yet — that's fine
      }
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
    localStorage.removeItem("profileId");
    showSuccess("Logged out successfully.");
    navigate("/");
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/api/auth/forgot-password", { email: forgotEmail });
      if (res.data.reset_token) {
        setResetToken(res.data.reset_token);
        setResetForm((prev) => ({ ...prev, token: res.data.reset_token }));
      }
      setForgotStep(2);
      showSuccess("Reset token generated. Use it below to set a new password.");
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to request password reset";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/auth/reset-password", resetForm);
      showSuccess("Password reset successfully! Please log in.");
      setShowForgot(false);
      setForgotStep(1);
      setResetToken("");
      setResetForm({ token: "", new_password: "" });
      setForgotEmail("");
      setTab(0);
    } catch (err) {
      const msg = err.response?.data?.detail || "Password reset failed";
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
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

  // Forgot-password view
  if (showForgot) {
    return (
      <Paper sx={{ p: 4, maxWidth: 400, mx: "auto" }}>
        <Typography variant="h6" gutterBottom>Reset Password</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {forgotStep === 1 ? (
          <Box component="form" onSubmit={handleForgotSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Email"
              type="email"
              required
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
            />
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? "Sending..." : "Get Reset Token"}
            </Button>
            <MuiLink component="button" variant="body2" onClick={() => { setShowForgot(false); setError(null); }}>
              Back to Login
            </MuiLink>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleResetSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {resetToken && (
              <Alert severity="info" sx={{ wordBreak: "break-all" }}>
                <Typography variant="caption" display="block" gutterBottom>
                  Your reset token (demo mode — in production this would be emailed):
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                  {resetToken}
                </Typography>
              </Alert>
            )}
            <TextField
              label="Reset Token"
              required
              multiline
              maxRows={3}
              value={resetForm.token}
              onChange={(e) => setResetForm({ ...resetForm, token: e.target.value })}
            />
            <TextField
              label="New Password"
              type="password"
              required
              inputProps={{ minLength: 8 }}
              value={resetForm.new_password}
              onChange={(e) => setResetForm({ ...resetForm, new_password: e.target.value })}
              helperText="Minimum 8 characters"
            />
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
            <MuiLink component="button" variant="body2" onClick={() => { setShowForgot(false); setForgotStep(1); setError(null); }}>
              Back to Login
            </MuiLink>
          </Box>
        )}
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
          <MuiLink component="button" variant="body2" onClick={() => { setShowForgot(true); setError(null); }}>
            Forgot Password?
          </MuiLink>
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
