"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import api from "@/lib/api-client";
import { extractApiError } from "@/lib/utils";

export default function Login() {
  const router = useRouter();
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", password_confirm: "", name: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetForm, setResetForm] = useState({ token: "", new_password: "" });
  const [forgotStep, setForgotStep] = useState(1);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const userName = typeof window !== "undefined" ? localStorage.getItem("userName") : null;

  const handleLogin = async (e: React.FormEvent) => {
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
      if (res.data.refresh_token) localStorage.setItem("refreshToken", res.data.refresh_token);
      const me = await api.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${res.data.access_token}` },
      });
      localStorage.setItem("userName", me.data.name);
      localStorage.setItem("userEmail", me.data.email);
      try {
        const profile = await api.get("/api/profile/me", {
          headers: { Authorization: `Bearer ${res.data.access_token}` },
        });
        localStorage.setItem("profileId", profile.data.id);
      } catch {
        // No linked profile
      }
      toast.success(`Welcome back, ${me.data.name}!`);
      router.push("/");
    } catch (err: unknown) {
      const msg = extractApiError(err, "Login failed");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/auth/register", {
        email: form.email,
        password: form.password,
        password_confirm: form.password_confirm,
        name: form.name,
      });
      toast.success("Account created! Please log in.");
      setTab("login");
      setError(null);
    } catch (err: unknown) {
      const msg = extractApiError(err, "Registration failed");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      try { await api.post("/api/auth/logout", { refresh_token: refreshToken }); } catch { /* ignore */ }
    }
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("profileId");
    toast.success("Logged out successfully.");
    router.push("/");
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
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
      toast.success(res.data.reset_token
        ? "Reset token generated. Use it below to set a new password."
        : "If an account exists with that email, a reset link has been generated.");
    } catch (err: unknown) {
      setError(extractApiError(err, "Failed to request password reset"));
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/auth/reset-password", { ...resetForm, token: resetForm.token.trim() });
      toast.success("Password reset successfully! Please log in.");
      setShowForgot(false);
      setForgotStep(1);
      setResetToken("");
      setResetForm({ token: "", new_password: "" });
      setForgotEmail("");
      setTab("login");
    } catch (err: unknown) {
      const msg = extractApiError(err, "Password reset failed");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (token) {
    return (
      <Card className="max-w-sm mx-auto p-8 text-center">
        <CardContent className="p-0">
          <h1 className="text-xl font-bold mb-2">Welcome, {userName || "User"}</h1>
          <p className="text-sm text-muted-foreground mb-4">You are logged in.</p>
          <Button variant="outline" onClick={handleLogout}>Log Out</Button>
        </CardContent>
      </Card>
    );
  }

  if (showForgot) {
    return (
      <Card className="max-w-sm mx-auto p-8">
        <CardContent className="p-0">
          <h2 className="text-lg font-bold mb-4">Reset Password</h2>
          {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}

          {forgotStep === 1 ? (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <Label htmlFor="forgot-email">Email</Label>
                <Input id="forgot-email" type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Get Reset Token"}
              </Button>
              <button type="button" className="text-sm text-primary hover:underline" onClick={() => { setShowForgot(false); setError(null); }}>
                Back to Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              {resetToken && (
                <Alert>
                  <AlertDescription>
                    <p className="text-xs mb-1">Your reset token (demo mode — in production this would be emailed):</p>
                    <p className="font-mono text-xs break-all">{resetToken}</p>
                  </AlertDescription>
                </Alert>
              )}
              <div>
                <Label htmlFor="reset-token">Reset Token</Label>
                <Textarea id="reset-token" required rows={3} value={resetForm.token} onChange={(e) => setResetForm({ ...resetForm, token: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" required minLength={8} value={resetForm.new_password} onChange={(e) => setResetForm({ ...resetForm, new_password: e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">Minimum 8 characters</p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
              <button type="button" className="text-sm text-primary hover:underline" onClick={() => { setShowForgot(false); setForgotStep(1); setError(null); }}>
                Back to Login
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-sm mx-auto p-8">
      <CardContent className="p-0">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="login-password">Password</Label>
                <Input id="login-password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
              <button type="button" className="text-sm text-primary hover:underline" onClick={() => { setShowForgot(true); setError(null); }}>
                Forgot Password?
              </button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <Label htmlFor="reg-name">Name</Label>
                <Input id="reg-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="reg-email">Email</Label>
                <Input id="reg-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="reg-password">Password</Label>
                <Input id="reg-password" type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">Minimum 8 characters</p>
              </div>
              <div>
                <Label htmlFor="reg-confirm">Confirm Password</Label>
                <Input id="reg-confirm" type="password" required value={form.password_confirm} onChange={(e) => setForm({ ...form, password_confirm: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Registering..." : "Register"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
