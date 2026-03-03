"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Terminal,
  Fingerprint,
  Zap,
  Shield,
  ArrowRight,
  TerminalSquare,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import api from "@/lib/api-client";
import { extractApiError } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().email("Invalid format"),
  password: z.string().min(1, "Cipher required"),
});

const registerSchema = z
  .object({
    name: z.string().min(2, "Invalid name"),
    email: z.string().email("Invalid format"),
    password: z.string().min(8, "Cipher too weak (min 8)"),
    password_confirm: z.string(),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: "Cipher mismatch",
    path: ["password_confirm"],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") || "login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pendingProfile =
    typeof window !== "undefined"
      ? (() => {
          try {
            const raw = localStorage.getItem("pending_profile");
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        })()
      : null;

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: pendingProfile?.name || "",
      email: pendingProfile?.email || "",
      password: "",
      password_confirm: "",
    },
  });

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const userName =
    typeof window !== "undefined" ? localStorage.getItem("userName") : null;

  const { login: authLogin, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const onLoginSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("username", data.email);
      params.append("password", data.password);
      const res = await api.post("/api/auth/login", params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const resData = res.data;

      const me = await api.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${resData.access_token}` },
      });

      let profileId: string | undefined = undefined;
      try {
        const profile = await api.get("/api/profile/me", {
          headers: { Authorization: `Bearer ${resData.access_token}` },
        });
        profileId = String(profile.data.id);
      } catch {
        /* No linked profile */
      }

      authLogin(
        resData.access_token,
        {
          name: me.data.name,
          email: me.data.email,
          profileId,
        },
        resData.refresh_token,
      );

      toast.success(`Access Granted: ${me.data.name}`);
      const redirect = searchParams.get("redirect");
      router.push(redirect || "/dashboard");
    } catch (err: unknown) {
      setError(extractApiError(err, "Authentication Failed"));
    } finally {
      setLoading(false);
    }
  };

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/auth/register", {
        email: data.email,
        password: data.password,
        passwordConfirm: data.password_confirm,
        name: data.name,
        tenantName: "Global",
      });
      const params = new URLSearchParams();
      params.append("username", data.email);
      params.append("password", data.password);
      const loginRes = await api.post("/api/auth/login", params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      localStorage.setItem("token", loginRes.data.access_token);
      if (loginRes.data.refresh_token)
        localStorage.setItem("refreshToken", loginRes.data.refresh_token);
      const me = await api.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${loginRes.data.access_token}` },
      });
      localStorage.setItem("userName", me.data.name);
      localStorage.setItem("userEmail", me.data.email);
      const pendingRaw = localStorage.getItem("pending_profile");
      if (pendingRaw) {
        try {
          const pending = JSON.parse(pendingRaw);
          const profileRes = await api.post("/api/profile", pending, {
            headers: { Authorization: `Bearer ${loginRes.data.access_token}` },
          });
          localStorage.setItem("profileId", String(profileRes.data.id));
          localStorage.removeItem("pending_profile");
          toast.success("Profile Node Initialized.");
        } catch {
          localStorage.removeItem("pending_profile");
        }
      } else {
        toast.success(`Node Created: ${me.data.name}`);
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(extractApiError(err, "Integration Failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    toast.success("Connection Severed.");
    router.push("/");
  };

  if (token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark font-display text-slate-100 selection:bg-primary/30 relative overflow-hidden">
        <style>{`
          .cyber-grid {
            background-image: linear-gradient(to right, rgba(37, 157, 244, 0.05) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(37, 157, 244, 0.05) 1px, transparent 1px);
            background-size: 40px 40px;
          }
          .scanline {
            background: linear-gradient(to bottom, transparent 50%, rgba(37, 157, 244, 0.02) 50%);
            background-size: 100% 4px;
          }
          .frosted {
            backdrop-filter: blur(12px);
            background: rgba(11, 14, 20, 0.8);
          }
        `}</style>
        <div className="absolute inset-0 cyber-grid scanline" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-sm"
        >
          <div className="w-full frosted border border-primary/30 relative flex flex-col overflow-hidden p-8">
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary"></div>

            <div className="h-16 w-16 border border-primary bg-primary/10 flex items-center justify-center mx-auto text-primary shadow-[0_0_15px_rgba(37,157,244,0.3)] mb-6">
              <Terminal className="h-8 w-8" />
            </div>
            <div className="space-y-2 text-center">
              <p className="font-mono text-[10px] text-primary tracking-widest animate-pulse">
                SESSION ACTIVE
              </p>
              <h1 className="text-2xl font-bold uppercase tracking-tighter">
                Connection <br /> Established
              </h1>
              <p className="font-mono text-xs text-slate-500">
                ID: {userName || "SYS.ADMIN"}
              </p>
            </div>
            <div className="space-y-4 pt-8">
              <Button
                onClick={() => router.push("/dashboard")}
                className="w-full bg-primary/10 border border-primary text-primary rounded-none font-bold uppercase tracking-widest h-12 hover:bg-primary hover:text-background-dark hover:shadow-[0_0_15px_rgba(37,157,244,0.5)] transition-all"
              >
                Access Dashboard
              </Button>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full text-accent-coral hover:text-white hover:bg-accent-coral/20 font-mono font-bold uppercase tracking-widest text-[9px] rounded-none transition-colors border-none"
              >
                Sever Connection
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 selection:bg-primary/30 relative overflow-hidden">
      <style>{`
        .cyber-grid {
          background-image: linear-gradient(to right, rgba(37, 157, 244, 0.05) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(37, 157, 244, 0.05) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .scanline {
          background: linear-gradient(to bottom, transparent 50%, rgba(37, 157, 244, 0.02) 50%);
          background-size: 100% 4px;
        }
        .frosted {
          backdrop-filter: blur(12px);
          background: rgba(11, 14, 20, 0.8);
        }
      `}</style>

      <div className="absolute inset-0 cyber-grid scanline" />

      {/* Header Status Bar Decor */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center border-b border-primary/10 z-20">
        <div className="flex items-center gap-2">
          <Shield className="text-primary w-4 h-4" />
          <span className="font-mono text-[10px] tracking-widest text-primary/60 uppercase hidden sm:inline">
            Node: SG-CENTRAL-01
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] tracking-widest text-primary uppercase">
            System_Status: Stable
          </span>
          <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_#259df4] animate-pulse"></div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 relative z-10 w-full">
        <div className="w-full max-w-sm frosted border border-primary/30 relative flex flex-col overflow-hidden">
          {/* Decorative Corners */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary"></div>
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary"></div>
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary"></div>
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary"></div>

          {/* Icon Section */}
          <div className="pt-10 pb-6 flex flex-col items-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
              <Fingerprint
                className="w-12 h-12 text-primary relative z-10 drop-shadow-[0_0_15px_rgba(37,157,244,0.8)]"
                strokeWidth={1.5}
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tighter text-center uppercase leading-none text-slate-100">
              Secure Connection
              <br />
              <span className="text-primary">_SKLBR</span>
            </h1>
            <p className="font-mono text-[10px] text-primary/40 mt-4 tracking-[0.2em]">
              ENCRYPTION: AES-256-GCM
            </p>
          </div>

          {/* Actions / Forms */}
          <div className="px-6 pb-10 flex flex-col gap-4">
            <Tabs
              value={tab}
              onValueChange={(v) => {
                setTab(v);
                setError(null);
              }}
              className="w-full"
            >
              <TabsList className="flex w-full bg-transparent border-b border-primary/10 rounded-none p-0 mb-6">
                <TabsTrigger
                  value="login"
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent py-2 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 data-[state=active]:text-primary data-[state=active]:shadow-[0_2px_10px_rgba(37,157,244,0.1)] transition-all"
                >
                  AUTH_REQ
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent py-2 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 data-[state=active]:text-primary data-[state=active]:shadow-[0_2px_10px_rgba(37,157,244,0.1)] transition-all"
                >
                  INIT_AUTH
                </TabsTrigger>
              </TabsList>

              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, x: 5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  {error && (
                    <Alert
                      variant="destructive"
                      className="mb-6 rounded-none border-accent-coral bg-accent-coral/10 text-accent-coral text-xs font-mono py-3"
                    >
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <TabsContent value="login" className="mt-0 space-y-6">
                    <form
                      onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                      className="space-y-4"
                    >
                      <div className="space-y-2 relative group">
                        <Label
                          htmlFor="email"
                          className="font-mono text-[10px] text-primary/60 uppercase tracking-widest"
                        >
                          Vector ID (Email)
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="sys.admin@sklbr.co"
                          {...loginForm.register("email")}
                          className="rounded-none border-primary/20 bg-slate-950/50 text-primary placeholder:text-primary/20 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all h-10 font-mono text-xs"
                        />
                        {loginForm.formState.errors.email && (
                          <p className="text-[9px] font-mono text-accent-coral uppercase mt-1 absolute -bottom-4">
                            {loginForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2 relative group pt-2">
                        <Label
                          htmlFor="password"
                          className="font-mono text-[10px] text-primary/60 uppercase tracking-widest"
                        >
                          Cipher (Password)
                        </Label>
                        <Input
                          id="password"
                          type="password"
                          {...loginForm.register("password")}
                          className="rounded-none border-primary/20 bg-slate-950/50 text-primary focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all h-10 font-mono text-lg tracking-[0.2em]"
                        />
                        {loginForm.formState.errors.password && (
                          <p className="text-[9px] font-mono text-accent-coral uppercase mt-1 absolute -bottom-4">
                            {loginForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>

                      <div className="pt-4">
                        <Button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-primary/10 border border-primary text-primary rounded-none font-bold font-mono uppercase tracking-[0.2em] h-12 hover:bg-primary hover:text-background-dark hover:shadow-[0_0_20px_rgba(37,157,244,0.5)] transition-all duration-300 group"
                        >
                          {loading ? (
                            <span className="animate-pulse">Processing...</span>
                          ) : (
                            <span className="flex items-center justify-center gap-3">
                              Execute{" "}
                              <Zap className="h-3 w-3 group-hover:scale-125 transition-transform" />
                            </span>
                          )}
                        </Button>
                      </div>
                    </form>
                  </TabsContent>

                  <TabsContent value="register" className="mt-0 space-y-4">
                    <form
                      onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                      className="space-y-3"
                    >
                      <div className="space-y-1.5 relative">
                        <Label
                          htmlFor="name"
                          className="font-mono text-[10px] text-primary/60 uppercase tracking-widest"
                        >
                          Name
                        </Label>
                        <Input
                          id="name"
                          placeholder="Your Name"
                          {...registerForm.register("name")}
                          className="rounded-none border-primary/20 bg-slate-950/50 text-primary placeholder:text-primary/20 focus:border-primary h-10 font-mono text-xs"
                        />
                        {registerForm.formState.errors.name && (
                          <p className="text-[9px] font-mono text-accent-coral uppercase absolute right-0 top-0">
                            {registerForm.formState.errors.name.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5 relative">
                        <Label
                          htmlFor="reg-email"
                          className="font-mono text-[10px] text-primary/60 uppercase tracking-widest"
                        >
                          Vector ID
                        </Label>
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="agent@sklbr.co"
                          {...registerForm.register("email")}
                          className="rounded-none border-primary/20 bg-slate-950/50 text-primary placeholder:text-primary/20 focus:border-primary h-10 font-mono text-xs"
                        />
                        {registerForm.formState.errors.email && (
                          <p className="text-[9px] font-mono text-accent-coral uppercase absolute right-0 top-0">
                            {registerForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5 relative">
                        <Label
                          htmlFor="reg-password"
                          className="font-mono text-[10px] text-primary/60 uppercase tracking-widest"
                        >
                          New Cipher
                        </Label>
                        <Input
                          id="reg-password"
                          type="password"
                          {...registerForm.register("password")}
                          className="rounded-none border-primary/20 bg-slate-950/50 text-primary focus:border-primary h-10 font-mono tracking-[0.2em]"
                        />
                        {registerForm.formState.errors.password && (
                          <p className="text-[8px] font-mono text-accent-coral uppercase absolute right-0 top-0">
                            {registerForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5 relative">
                        <Label
                          htmlFor="reg-confirm"
                          className="font-mono text-[10px] text-primary/60 uppercase tracking-widest"
                        >
                          Verify Cipher
                        </Label>
                        <Input
                          id="reg-confirm"
                          type="password"
                          {...registerForm.register("password_confirm")}
                          className="rounded-none border-primary/20 bg-slate-950/50 text-primary focus:border-primary h-10 font-mono tracking-[0.2em]"
                        />
                        {registerForm.formState.errors.password_confirm && (
                          <p className="text-[8px] font-mono text-accent-coral uppercase absolute right-0 top-0">
                            {
                              registerForm.formState.errors.password_confirm
                                .message
                            }
                          </p>
                        )}
                      </div>

                      <div className="pt-2">
                        <Button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-primary/10 border border-primary text-primary rounded-none font-bold font-mono uppercase tracking-[0.2em] h-12 hover:bg-primary hover:text-background-dark hover:shadow-[0_0_20px_rgba(37,157,244,0.5)] transition-all duration-300 group"
                        >
                          {loading ? (
                            <span className="animate-pulse">
                              Initializing...
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-3">
                              Create SKLBR ID{" "}
                              <Zap className="h-3 w-3 group-hover:scale-125 transition-transform" />
                            </span>
                          )}
                        </Button>
                      </div>
                    </form>
                  </TabsContent>
                </motion.div>
              </AnimatePresence>
            </Tabs>

            {/* Visual Element underneath form matching login.html visual design loosely */}
            <div className="mt-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-primary/20"></div>
                <span className="font-mono text-[9px] text-primary/40 tracking-widest uppercase">
                  Developer_Node_Auth
                </span>
                <div className="h-px flex-1 bg-primary/20"></div>
              </div>
              <div className="flex flex-col gap-3">
                <a
                  className="flex items-center justify-between group py-2 border-b border-primary/5"
                  href="#"
                >
                  <span className="font-mono text-[11px] text-primary/70 group-hover:text-primary transition-colors">
                    GITHUB_SYNC
                  </span>
                  <ArrowRight className="text-primary/30 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Decor */}
      <div className="absolute bottom-12 left-0 w-full flex flex-col items-center gap-2 z-10 pointer-events-none hidden sm:flex">
        <p className="font-mono text-[9px] text-primary/20 uppercase tracking-[0.3em]">
          Singapore Tech Talent Network | SEC-L3
        </p>
        <div className="flex gap-4">
          <div className="w-8 h-px bg-primary/10"></div>
          <div className="w-1 h-1 bg-primary/40 rounded-full"></div>
          <div className="w-8 h-px bg-primary/10"></div>
        </div>
      </div>

      {/* Bottom Nav Bar Integration (Mobile primarily) */}
      <div className="fixed bottom-0 left-0 w-full z-50 md:hidden">
        <div className="flex gap-2 border-t border-primary/20 bg-background-dark/90 backdrop-blur-md px-4 pb-6 pt-2">
          <Link
            className="flex flex-1 flex-col items-center justify-end gap-1 text-primary/40 hover:text-primary transition-colors"
            href="/recommendations"
          >
            <div className="flex h-8 items-center justify-center">
              <TerminalSquare className="w-6 h-6" />
            </div>
          </Link>
          <Link
            className="flex flex-1 flex-col items-center justify-end gap-1 text-primary"
            href="/login"
          >
            <div className="flex h-10 items-center justify-center">
              <Fingerprint
                className="w-8 h-8 drop-shadow-[0_0_10px_rgba(37,157,244,0.6)]"
                strokeWidth={1}
              />
            </div>
          </Link>
          <Link
            className="flex flex-1 flex-col items-center justify-end gap-1 text-primary/40 hover:text-primary transition-colors"
            href="/profile-builder"
          >
            <div className="flex h-8 items-center justify-center">
              <Settings className="w-6 h-6" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-background-dark font-mono text-xs text-primary animate-pulse tracking-widest uppercase">
          INITIALIZING TERMINAL...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
