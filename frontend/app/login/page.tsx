"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Command,
  Sparkles,
  TrendingUp,
  GraduationCap,
  Shield,
  ArrowRight,
  BarChart3,
  Activity,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api-client";
import { extractApiError } from "@/lib/utils";

const FEATURES = [
  {
    icon: <Sparkles className="h-4 w-4" />,
    label: "AI-Powered Matching",
    desc: "Smart job recommendations based on your skills",
  },
  {
    icon: <TrendingUp className="h-4 w-4" />,
    label: "Skill Gap Analysis",
    desc: "Identify exactly what you need to learn next",
  },
  {
    icon: <GraduationCap className="h-4 w-4" />,
    label: "SCTP Pathways",
    desc: "Subsidised SkillsFuture courses tailored for you",
  },
  {
    icon: <Shield className="h-4 w-4" />,
    label: "Career Coaching",
    desc: "AI coach to guide your career transition",
  },
];

const MARKET_PULSE = [
  { label: "SG Demand Index", bar: 78, delta: "+12.4%" },
  { label: "Top Skill: Python", bar: 95, delta: "#1" },
  { label: "Open Roles Today", bar: 54, delta: "542" },
];

const SKILLS = [
  "Python",
  "React",
  "Cloud",
  "AI/ML",
  "TypeScript",
  "SQL",
  "Docker",
];

function MarketBar({ value, delta }: { value: number; delta: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex-1 h-[3px] rounded-full bg-sidebar-border overflow-hidden">
        <div
          className="h-full bg-primary rounded-full"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-primary font-bold data-num w-12 text-right">
        {delta}
      </span>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") || "login");
  const [form, setForm] = useState({
    email: "",
    password: "",
    password_confirm: "",
    name: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const userName =
    typeof window !== "undefined" ? localStorage.getItem("userName") : null;

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
      if (res.data.refresh_token)
        localStorage.setItem("refreshToken", res.data.refresh_token);
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
        /* No linked profile */
      }
      toast.success(`Welcome back, ${me.data.name}!`);
      const redirect = searchParams.get("redirect");
      router.push(redirect || "/dashboard");
    } catch (err: unknown) {
      setError(extractApiError(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const profileId = searchParams.get("profileId");
    try {
      await api.post("/api/auth/register", {
        email: form.email,
        password: form.password,
        password_confirm: form.password_confirm,
        name: form.name,
        tenant_name: "Global",
        profile_id: profileId ? parseInt(profileId) : undefined,
      });
      toast.success("Account created! Please log in.");
      setTab("login");
    } catch (err: unknown) {
      setError(extractApiError(err, "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      try {
        await api.post("/api/auth/logout", { refresh_token: refreshToken });
      } catch {
        /* ignore */
      }
    }
    localStorage.clear();
    toast.success("Logged out.");
    router.push("/");
  };

  /* Already-logged-in state */
  if (token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card variant="metric" className="max-w-sm w-full">
          <CardContent className="p-8 text-center">
            <div className="h-14 w-14 rounded bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-5 text-primary">
              <Command className="h-7 w-7" />
            </div>
            <p className="section-label mb-2">Session Active</p>
            <h1 className="text-xl font-extrabold mb-1">
              Welcome back, {userName || "User"}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              You&apos;re already signed in.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => router.push("/dashboard")}
                className="gap-2 w-full"
              >
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={handleLogout} className="w-full">
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left: Brand Panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 bg-sidebar border-r border-sidebar-border p-10">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center text-primary-foreground shrink-0">
              <Command className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-sidebar-foreground">
                SkillBridge
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="live-dot" />
                <span
                  className="section-label text-primary"
                  style={{ fontSize: "0.55rem" }}
                >
                  Live Data
                </span>
              </div>
            </div>
          </div>

          {/* Headline */}
          <h2 className="text-2xl font-extrabold tracking-tight mb-3 text-sidebar-foreground leading-tight">
            Accelerate your career
            <br />
            <span className="text-primary">with intelligence.</span>
          </h2>
          <p className="text-sidebar-foreground/50 text-sm leading-relaxed mb-10">
            AI-powered job matching, skill gap analysis, and curated upskilling
            roadmaps for Singapore&apos;s tech professionals.
          </p>

          {/* Features */}
          <div className="space-y-4 mb-10">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-start gap-3">
                <div className="h-7 w-7 rounded bg-primary/15 border border-primary/25 flex items-center justify-center text-primary shrink-0 mt-0.5">
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-sidebar-foreground">
                    {f.label}
                  </p>
                  <p className="text-xs text-sidebar-foreground/50 mt-0.5">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Market Pulse */}
          <div className="border border-sidebar-border rounded p-4 bg-background/30">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
              <p
                className="section-label text-primary"
                style={{ fontSize: "0.55rem" }}
              >
                Market Pulse
              </p>
            </div>
            <div className="space-y-3">
              {MARKET_PULSE.map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-sidebar-foreground/60">
                      {m.label}
                    </span>
                  </div>
                  <MarketBar value={m.bar} delta={m.delta} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Skill tags */}
        <div className="flex flex-wrap gap-1.5 mt-6">
          {SKILLS.map((s) => (
            <Badge
              key={s}
              variant="accent"
              className="text-[0.65rem] font-semibold"
            >
              {s}
            </Badge>
          ))}
        </div>
      </div>

      {/* ── Right: Form Panel ── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="h-7 w-7 rounded bg-primary flex items-center justify-center text-primary-foreground">
              <Command className="h-4 w-4" />
            </div>
            <span className="font-extrabold text-base">SkillBridge</span>
          </div>

          <header className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <p className="section-label">Intelligence Platform</p>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              {tab === "login" ? "Sign in" : "Create account"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {tab === "login"
                ? "Welcome back. Enter your credentials to continue."
                : searchParams.get("profileId")
                  ? "Your profile is ready. Create a free account to unlock your personalised recommendations."
                  : "Start your career acceleration journey."}
            </p>
          </header>

          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(v);
              setError(null);
            }}
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="email"
                    className="text-xs font-semibold tracking-wide uppercase"
                    style={{ letterSpacing: "0.06em" }}
                  >
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="password"
                    className="text-xs font-semibold tracking-wide uppercase"
                    style={{ letterSpacing: "0.06em" }}
                  >
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? (
                    "Signing in..."
                  ) : (
                    <span className="flex items-center gap-2">
                      Sign In <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="name"
                    className="text-xs font-semibold uppercase"
                    style={{ letterSpacing: "0.06em" }}
                  >
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="Jane Doe"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="reg-email"
                    className="text-xs font-semibold uppercase"
                    style={{ letterSpacing: "0.06em" }}
                  >
                    Email
                  </Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="reg-password"
                    className="text-xs font-semibold uppercase"
                    style={{ letterSpacing: "0.06em" }}
                  >
                    Password
                  </Label>
                  <Input
                    id="reg-password"
                    type="password"
                    required
                    minLength={8}
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 8 characters
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="reg-confirm"
                    className="text-xs font-semibold uppercase"
                    style={{ letterSpacing: "0.06em" }}
                  >
                    Confirm Password
                  </Label>
                  <Input
                    id="reg-confirm"
                    type="password"
                    required
                    value={form.password_confirm}
                    onChange={(e) =>
                      setForm({ ...form, password_confirm: e.target.value })
                    }
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? (
                    "Creating account..."
                  ) : (
                    <span className="flex items-center gap-2">
                      Create Account <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
