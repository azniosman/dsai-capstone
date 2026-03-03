"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Zap, ArrowLeft, Server, AlertTriangle, Bomb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import api from "@/lib/api-client";
import { extractApiError } from "@/lib/utils";
import ProfileForm from "@/components/profile/profile-form";
import Link from "next/link";

export default function AccountSettings() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState({ name: "", email: "" });
  const [passwords, setPasswords] = useState({
    current_password: "",
    new_password: "",
    confirm: "",
  });
  const [loading, setLoading] = useState({
    account: false,
    password: false,
    delete: false,
  });
  const [error, setError] = useState<{
    account: string | null;
    password: string | null;
  }>({ account: null, password: null });
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    api
      .get("/api/auth/me")
      .then((res) => {
        setAccount({ name: res.data.name, email: res.data.email });
        setReady(true);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const handleAccountUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading((l) => ({ ...l, account: true }));
    setError((e) => ({ ...e, account: null }));
    try {
      const res = await api.patch("/api/auth/me", account);
      localStorage.setItem("userName", res.data.name);
      localStorage.setItem("userEmail", res.data.email);
      toast.success("Identity synchronized successfully.");
    } catch (err: unknown) {
      const msg = extractApiError(err, "Failed to update identity");
      setError((e) => ({ ...e, account: msg }));
      toast.error(msg);
    } finally {
      setLoading((l) => ({ ...l, account: false }));
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
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
      toast.success("Security keys rotated successfully.");
    } catch (err: unknown) {
      const msg = extractApiError(err, "Failed to rotate keys");
      setError((e) => ({ ...e, password: msg }));
      toast.error(msg);
    } finally {
      setLoading((l) => ({ ...l, password: false }));
    }
  };

  const handleDeleteAccount = async () => {
    setLoading((l) => ({ ...l, delete: true }));
    try {
      await api.delete("/api/auth/me");
      localStorage.clear();
      toast.success("Entity purged.");
      router.push("/");
    } catch (err: unknown) {
      toast.error(extractApiError(err, "Failed to purge entity"));
    } finally {
      setLoading((l) => ({ ...l, delete: false }));
      setDeleteOpen(false);
    }
  };

  if (!ready)
    return (
      <div className="max-w-2xl mx-auto items-center flex justify-center min-h-screen">
        <div className="text-primary font-mono text-xs uppercase animate-pulse">
          Loading Identity Matrix...
        </div>
      </div>
    );

  return (
    <div className="relative flex min-h-screen flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 selection:bg-primary/30 overflow-x-hidden">
      <style>{`
        .cyber-grid {
          background-image: linear-gradient(to right, rgba(37, 157, 244, 0.05) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(37, 157, 244, 0.05) 1px, transparent 1px);
          background-size: 20px 20px;
        }
        .scanline {
          background: linear-gradient(to bottom, transparent 50%, rgba(37, 157, 244, 0.02) 50%);
          background-size: 100% 4px;
        }
      `}</style>

      <div className="absolute inset-0 cyber-grid scanline pointer-events-none z-0"></div>

      {/* Header */}
      <header className="relative z-10 flex items-center bg-background-dark/80 backdrop-blur-md border-b border-primary/20 p-4 justify-between sticky top-0">
        <Link
          href="/dashboard"
          className="text-primary flex size-10 shrink-0 items-center justify-center hover:bg-primary/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-primary text-sm font-bold leading-tight tracking-[0.2em] flex-1 text-center font-mono uppercase">
          ENTITY_PROFILE
        </h2>
        <div className="flex w-10 items-center justify-end">
          <button className="flex items-center justify-center text-primary">
            <Server className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Technical Metadata */}
      <div className="relative z-10 flex justify-between px-4 py-2 bg-primary/5 border-b border-primary/10">
        <p className="text-primary/60 text-[10px] font-bold font-mono tracking-widest uppercase">
          ENCRYPTION_LEVEL: OMEGA
        </p>
        <p className="text-primary/60 text-[10px] font-bold font-mono tracking-widest uppercase">
          UIP_VERSION: 1.0.4
        </p>
      </div>

      <div className="relative z-10 flex-1 flex flex-col max-w-[1200px] w-full mx-auto p-4 sm:p-6 lg:p-10 space-y-8">
        <Tabs defaultValue="security" className="w-full relative">
          <TabsList className="flex flex-wrap h-auto bg-transparent border-b border-primary/10 w-full justify-start rounded-none mb-10 overflow-x-auto gap-2 sm:gap-4 no-scrollbar">
            <TabsTrigger
              value="profile"
              className="shrink-0 rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent px-4 pb-4 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-slate-500 data-[state=active]:text-primary transition-all font-mono"
            >
              ENTITY_PROFILE
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="shrink-0 rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent px-4 pb-4 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-slate-500 data-[state=active]:text-primary transition-all font-mono"
            >
              SECURITY_ENCLAVE
            </TabsTrigger>
          </TabsList>

          <TabsContent value="security" className="space-y-12 mt-0">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Left Col: Forms */}
              <div className="space-y-12">
                {/* Personal Information */}
                <section className="space-y-6">
                  <h3 className="text-primary/40 text-[11px] font-bold tracking-[0.3em] uppercase font-mono mb-4 border-l-2 border-primary pl-3">
                    CORE_CONFIG
                  </h3>

                  {error.account && (
                    <Alert
                      variant="destructive"
                      className="rounded-none border-accent-coral bg-accent-coral/10 text-accent-coral font-mono text-[10px] uppercase"
                    >
                      <AlertDescription>{error.account}</AlertDescription>
                    </Alert>
                  )}

                  <form
                    onSubmit={handleAccountUpdate}
                    className="space-y-6 bg-(--card-dark) p-6 border border-primary/10"
                  >
                    <div className="space-y-2">
                      <Label
                        htmlFor="name"
                        className="block text-[10px] font-bold text-slate-400 font-mono tracking-widest uppercase"
                      >
                        NODE_DESIGNATION
                      </Label>
                      <Input
                        id="name"
                        required
                        value={account.name}
                        onChange={(e) =>
                          setAccount({ ...account, name: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-primary/20 text-primary p-3 focus:border-primary focus:ring-1 focus:ring-primary rounded-none font-mono text-sm uppercase transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="email"
                        className="block text-[10px] font-bold text-slate-400 font-mono tracking-widest uppercase"
                      >
                        PRIMARY_COMMS
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={account.email}
                        onChange={(e) =>
                          setAccount({ ...account, email: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-primary/20 text-primary p-3 focus:border-primary focus:ring-1 focus:ring-primary rounded-none font-mono text-sm uppercase transition-colors"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={loading.account}
                      className="w-full bg-primary/10 border border-primary text-primary hover:bg-primary hover:text-background-dark rounded-none font-mono font-bold uppercase tracking-widest text-[10px] py-6 transition-all shadow-[0_0_15px_rgba(37,157,244,0.1)]"
                    >
                      {loading.account ? "PROCESSING..." : "SAVE_PARAMETERS"}
                    </Button>
                  </form>
                </section>

                {/* Password Change */}
                <section className="space-y-6">
                  <h3 className="text-primary/40 text-[11px] font-bold tracking-[0.3em] uppercase font-mono mb-4 border-l-2 border-primary pl-3">
                    ACCESS_CONTROL
                  </h3>

                  {error.password && (
                    <Alert
                      variant="destructive"
                      className="rounded-none border-accent-coral bg-accent-coral/10 text-accent-coral font-mono text-[10px] uppercase"
                    >
                      <AlertDescription>{error.password}</AlertDescription>
                    </Alert>
                  )}

                  <form
                    onSubmit={handlePasswordChange}
                    className="space-y-6 bg-(--card-dark) p-6 border border-primary/10"
                  >
                    <div className="space-y-2">
                      <Label
                        htmlFor="current_password"
                        className="block text-[10px] font-bold text-slate-400 font-mono tracking-widest uppercase"
                      >
                        EXISTING_CIPHER
                      </Label>
                      <Input
                        id="current_password"
                        type="password"
                        required
                        value={passwords.current_password}
                        onChange={(e) =>
                          setPasswords({
                            ...passwords,
                            current_password: e.target.value,
                          })
                        }
                        className="w-full bg-slate-900 border border-primary/20 text-primary p-3 focus:border-primary focus:ring-1 focus:ring-primary rounded-none font-mono tracking-[0.2em] transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="new_password"
                        className="block text-[10px] font-bold text-slate-400 font-mono tracking-widest uppercase"
                      >
                        NEW_CIPHER
                      </Label>
                      <Input
                        id="new_password"
                        type="password"
                        required
                        minLength={8}
                        value={passwords.new_password}
                        onChange={(e) =>
                          setPasswords({
                            ...passwords,
                            new_password: e.target.value,
                          })
                        }
                        className="w-full bg-slate-900 border border-primary/20 text-primary p-3 focus:border-primary focus:ring-1 focus:ring-primary rounded-none font-mono tracking-[0.2em] transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="confirm_password"
                        className="block text-[10px] font-bold text-slate-400 font-mono tracking-widest uppercase"
                      >
                        VERIFY_CIPHER
                      </Label>
                      <Input
                        id="confirm_password"
                        type="password"
                        required
                        minLength={8}
                        value={passwords.confirm}
                        onChange={(e) =>
                          setPasswords({
                            ...passwords,
                            confirm: e.target.value,
                          })
                        }
                        className="w-full bg-slate-900 border border-primary/20 text-primary p-3 focus:border-primary focus:ring-1 focus:ring-primary rounded-none font-mono tracking-[0.2em] transition-colors"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={loading.password}
                      variant="outline"
                      className="w-full border-primary/40 text-primary hover:bg-primary/10 hover:border-primary rounded-none font-mono font-bold uppercase tracking-widest text-[10px] py-6 transition-all"
                    >
                      {loading.password
                        ? "ROTATING_KEYS..."
                        : "UPDATE_SECURITY"}
                    </Button>
                  </form>
                </section>
              </div>

              {/* Right Col: Context & Danger Zone */}
              <div className="space-y-12">
                <div className="p-8 bg-primary/5 border border-primary/20 space-y-6 relative overflow-hidden backdrop-blur-sm">
                  <div className="absolute top-0 right-0 p-3 border-l border-b border-primary/20 bg-primary/10">
                    <Zap className="h-4 w-4 text-primary animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold uppercase text-slate-100 tracking-tighter">
                    System Integrity
                  </h3>
                  <p className="font-mono text-[10px] uppercase text-slate-400 leading-relaxed tracking-wider border-l border-primary/30 pl-3">
                    &gt; Identity metadata synchronizes with match engine.
                    <br />
                    &gt; Key rotation requires re-authentication.
                    <br />
                    &gt; End-to-end encryption active.
                  </p>
                  <div className="space-y-3 pt-4 border-t border-primary/10">
                    <div className="flex justify-between items-center font-mono text-[9px] font-bold uppercase tracking-widest">
                      <span className="text-slate-500">Data Encryption</span>
                      <span className="text-primary">Active (AES-256)</span>
                    </div>
                    <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-full shadow-[0_0_8px_#259df4]" />
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <section className="p-8 border border-accent-coral/30 bg-accent-coral/5 space-y-6 relative overflow-hidden backdrop-blur-sm">
                  <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-accent-coral"></div>
                  <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-accent-coral"></div>
                  <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-accent-coral"></div>
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-accent-coral"></div>

                  <div className="flex items-center gap-3 text-accent-coral mb-2">
                    <AlertTriangle className="w-6 h-6 shrink-0 shadow-[0_0_10px_rgba(255,127,127,0.5)]" />
                    <h3 className="text-[11px] font-bold tracking-[0.3em] uppercase font-mono">
                      DESTRUCT_SEQUENCE
                    </h3>
                  </div>
                  <div className="p-3 border-l-2 border-accent-coral/50 bg-accent-coral/10">
                    <p className="text-[9px] text-accent-coral/90 font-mono tracking-widest leading-relaxed uppercase">
                      WARNING: ENTITY_PURGE IS IRREVERSIBLE. ALL NEURAL LINKS
                      AND SUBSIDIES WILL BE TERMINATED IMMEDIATELY.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full bg-transparent border border-accent-coral/30 text-accent-coral hover:bg-accent-coral/20 hover:border-accent-coral transition-all uppercase font-mono tracking-widest text-[10px] font-bold py-6 rounded-none"
                    onClick={() => setDeleteOpen(true)}
                  >
                    PURGE_ENTITY
                  </Button>
                </section>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="profile" className="mt-0">
            <div className="max-w-4xl mx-auto border border-primary/20 p-6 sm:p-10 bg-(--card-dark) backdrop-blur-md relative overflow-hidden shadow-[0_0_30px_rgba(37,157,244,0.05)]">
              <div className="absolute top-0 right-0 p-1 border-b border-l border-primary/30 bg-primary/10">
                <span className="text-[8px] font-mono text-primary tracking-widest uppercase font-bold">
                  PROFILE_CONFIG
                </span>
              </div>
              <header className="mb-8 border-b border-white/5 pb-6">
                <h2 className="text-2xl font-bold uppercase tracking-tighter text-slate-100 mb-2">
                  Professional Baseline
                </h2>
                <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
                  Update intelligence dossier for accurate vector matching.
                </p>
              </header>
              <div className="[&_label]:text-[10px] [&_label]:font-mono [&_label]:text-primary/70 [&_label]:uppercase [&_input]:bg-slate-900 [&_input]:border-primary/20 [&_input]:text-slate-100 [&_input]:rounded-none [&_input]:font-mono [&_textarea]:bg-slate-900 [&_textarea]:border-primary/20 [&_textarea]:text-slate-100 [&_textarea]:rounded-none [&_textarea]:font-mono [&_select]:bg-slate-900 [&_select]:border-primary/20 [&_select]:text-slate-100 [&_select]:rounded-none [&_select]:font-mono">
                <ProfileForm />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-none border-accent-coral bg-background-dark/95 backdrop-blur-xl max-w-md shadow-[0_0_50px_rgba(255,127,127,0.1)]">
          <DialogHeader>
            <DialogTitle className="font-bold uppercase tracking-tighter text-2xl text-slate-100 flex items-center gap-2">
              <Bomb className="w-6 h-6 text-accent-coral" /> Confirm Purge
            </DialogTitle>
            <DialogDescription className="font-mono text-[10px] uppercase tracking-wider text-slate-400 pt-4 leading-relaxed border-l-2 border-accent-coral/30 pl-3">
              &gt; Are you certain?
              <br />
              &gt; Erasing node will terminate all SCTP processes.
              <br />
              &gt; Data recovery impossible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-6 sm:justify-start gap-4 flex-col sm:flex-row w-full">
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={loading.delete}
              className="rounded-none bg-accent-coral/20 border border-accent-coral text-accent-coral hover:bg-accent-coral hover:text-black font-mono font-bold uppercase tracking-widest text-[10px] px-8 h-12 flex-1"
            >
              {loading.delete ? "EXECUTING..." : "CONFIRM_PURGE"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              className="rounded-none border-primary/20 text-slate-300 hover:text-primary hover:border-primary font-mono font-bold uppercase tracking-widest text-[10px] px-8 h-12 flex-1 bg-transparent"
            >
              ABORT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
