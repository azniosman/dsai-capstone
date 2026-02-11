import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, Paper, TextField, Typography, Alert, Divider,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from "@mui/material";
import { useSnackbar } from "../contexts/SnackbarContext";
import api from "../api/client";

export default function AccountSettings() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useSnackbar();

  const [account, setAccount] = useState({ name: "", email: "" });
  const [passwords, setPasswords] = useState({ current_password: "", new_password: "", confirm: "" });
  const [loading, setLoading] = useState({ account: false, password: false, delete: false });
  const [error, setError] = useState({ account: null, password: null });
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    api.get("/api/auth/me")
      .then((res) => setAccount({ name: res.data.name, email: res.data.email }))
      .catch(() => navigate("/login"));
  }, [navigate]);

  const handleAccountUpdate = async (e) => {
    e.preventDefault();
    setLoading((l) => ({ ...l, account: true }));
    setError((e) => ({ ...e, account: null }));
    try {
      const res = await api.patch("/api/auth/me", account);
      localStorage.setItem("userName", res.data.name);
      localStorage.setItem("userEmail", res.data.email);
      showSuccess("Account updated successfully.");
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to update account";
      setError((e) => ({ ...e, account: msg }));
      showError(msg);
    } finally {
      setLoading((l) => ({ ...l, account: false }));
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm) {
      setError((e) => ({ ...e, password: "Passwords do not match" }));
      return;
    }
    setLoading((l) => ({ ...l, password: true }));
    setError((e) => ({ ...e, password: null }));
    try {
      await api.post("/api/auth/change-password", {
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      });
      setPasswords({ current_password: "", new_password: "", confirm: "" });
      showSuccess("Password changed successfully.");
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to change password";
      setError((e) => ({ ...e, password: msg }));
      showError(msg);
    } finally {
      setLoading((l) => ({ ...l, password: false }));
    }
  };

  const handleDeleteAccount = async () => {
    setLoading((l) => ({ ...l, delete: true }));
    try {
      await api.delete("/api/auth/me");
      localStorage.removeItem("token");
      localStorage.removeItem("userName");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("profileId");
      showSuccess("Account deleted.");
      navigate("/");
    } catch (err) {
      showError(err.response?.data?.detail || "Failed to delete account");
    } finally {
      setLoading((l) => ({ ...l, delete: false }));
      setDeleteOpen(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: "auto" }}>
      <Typography variant="h5" gutterBottom>Account Settings</Typography>

      {/* Personal Information */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Personal Information</Typography>
        {error.account && <Alert severity="error" sx={{ mb: 2 }}>{error.account}</Alert>}
        <Box component="form" onSubmit={handleAccountUpdate} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Name"
            required
            value={account.name}
            onChange={(e) => setAccount({ ...account, name: e.target.value })}
          />
          <TextField
            label="Email"
            type="email"
            required
            value={account.email}
            onChange={(e) => setAccount({ ...account, email: e.target.value })}
          />
          <Button type="submit" variant="contained" disabled={loading.account} sx={{ alignSelf: "flex-start" }}>
            {loading.account ? "Saving..." : "Save Changes"}
          </Button>
        </Box>
      </Paper>

      {/* Security */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Security</Typography>
        {error.password && <Alert severity="error" sx={{ mb: 2 }}>{error.password}</Alert>}
        <Box component="form" onSubmit={handlePasswordChange} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Current Password"
            type="password"
            required
            value={passwords.current_password}
            onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
          />
          <TextField
            label="New Password"
            type="password"
            required
            inputProps={{ minLength: 8 }}
            value={passwords.new_password}
            onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
            helperText="Minimum 8 characters"
          />
          <TextField
            label="Confirm New Password"
            type="password"
            required
            value={passwords.confirm}
            onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
          />
          <Button type="submit" variant="contained" disabled={loading.password} sx={{ alignSelf: "flex-start" }}>
            {loading.password ? "Changing..." : "Change Password"}
          </Button>
        </Box>
      </Paper>

      {/* Danger Zone */}
      <Paper sx={{ p: 3, border: "1px solid", borderColor: "error.main" }}>
        <Typography variant="h6" color="error" gutterBottom>Danger Zone</Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Permanently delete your account and all associated data. This action cannot be undone.
        </Typography>
        <Button variant="outlined" color="error" onClick={() => setDeleteOpen(true)}>
          Delete Account
        </Button>
      </Paper>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete your account? This will permanently remove your account and linked profile. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteAccount} color="error" disabled={loading.delete}>
            {loading.delete ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
