"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import api from "@/lib/api-client";
import { extractApiError } from "@/lib/utils";
import SkeletonCard from "@/components/ui/skeleton-card";
import ProfileForm from "@/components/profile/profile-form";

const FIELD_LABEL = "text-xs font-semibold uppercase tracking-widest text-muted-foreground";

export default function AccountSettings() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState({ name: "", email: "" });
  const [passwords, setPasswords] = useState({ current_password: "", new_password: "", confirm: "" });
  const [loading, setLoading] = useState({ account: false, password: false, delete: false });
  const [error, setError] = useState<{ account: string | null; password: string | null }>({ account: null, password: null });
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    api.get("/api/auth/me")
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
      toast.success("Account updated successfully.");
    } catch (err: unknown) {
      const msg = extractApiError(err, "Failed to update account");
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
      toast.success("Password changed successfully.");
    } catch (err: unknown) {
      const msg = extractApiError(err, "Failed to change password");
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
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userName");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("profileId");
      toast.success("Account deleted.");
      router.push("/");
    } catch (err: unknown) {
      toast.error(extractApiError(err, "Failed to delete account"));
    } finally {
      setLoading((l) => ({ ...l, delete: false }));
      setDeleteOpen(false);
    }
  };

  if (!ready) return <div className="max-w-xl mx-auto"><SkeletonCard count={2} /></div>;

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <header>
        <p className="section-label mb-1">Configuration</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Account Settings</h1>
      </header>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general">Account & Security</TabsTrigger>
          <TabsTrigger value="profile">Professional Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-5 mt-5">
          {/* Personal Information */}
          <Card variant="data">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <Settings className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground" style={{ fontSize: "0.625rem", letterSpacing: "0.1em" }}>
                  Personal Information
                </h2>
              </div>
              {error.account && <Alert variant="destructive" className="mb-4"><AlertDescription>{error.account}</AlertDescription></Alert>}
              <form onSubmit={handleAccountUpdate} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className={FIELD_LABEL}>Name</Label>
                  <Input id="name" required value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className={FIELD_LABEL}>Email</Label>
                  <Input id="email" type="email" required value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} />
                </div>
                <Button type="submit" disabled={loading.account}>
                  {loading.account ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Security */}
          <Card variant="elevated">
            <CardContent className="p-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-5" style={{ fontSize: "0.625rem", letterSpacing: "0.1em" }}>
                Security
              </h2>
              {error.password && <Alert variant="destructive" className="mb-4"><AlertDescription>{error.password}</AlertDescription></Alert>}
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="current_password" className={FIELD_LABEL}>Current Password</Label>
                  <Input id="current_password" type="password" required value={passwords.current_password}
                    onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new_password" className={FIELD_LABEL}>New Password</Label>
                  <Input id="new_password" type="password" required minLength={8} value={passwords.new_password}
                    onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })} />
                  <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm_password" className={FIELD_LABEL}>Confirm New Password</Label>
                  <Input id="confirm_password" type="password" required value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} />
                </div>
                <Button type="submit" disabled={loading.password}>
                  {loading.password ? "Changing..." : "Change Password"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card variant="ghost" className="border-destructive/40">
            <CardContent className="p-6">
              <h2 className="text-sm font-bold text-destructive uppercase tracking-widest mb-1" style={{ fontSize: "0.625rem", letterSpacing: "0.1em" }}>
                Danger Zone
              </h2>
              <Separator className="mb-4 bg-destructive/20" />
              <p className="text-sm text-muted-foreground mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="mt-5">
          <ProfileForm />
        </TabsContent>
      </Tabs>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure? This will permanently remove your account and linked profile. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={loading.delete}>
              {loading.delete ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
