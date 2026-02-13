"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import api from "@/lib/api-client";

export default function AccountSettings() {
  const router = useRouter();

  const [account, setAccount] = useState({ name: "", email: "" });
  const [passwords, setPasswords] = useState({ current_password: "", new_password: "", confirm: "" });
  const [loading, setLoading] = useState({ account: false, password: false, delete: false });
  const [error, setError] = useState<{ account: string | null; password: string | null }>({ account: null, password: null });
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    api.get("/api/auth/me")
      .then((res) => setAccount({ name: res.data.name, email: res.data.email }))
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
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Failed to update account";
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
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Failed to change password";
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
      toast.error((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Failed to delete account");
    } finally {
      setLoading((l) => ({ ...l, delete: false }));
      setDeleteOpen(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Account Settings</h1>

      <Card className="p-6 mb-6">
        <CardContent className="p-0">
          <h2 className="text-lg font-bold mb-4">Personal Information</h2>
          {error.account && <Alert variant="destructive" className="mb-4"><AlertDescription>{error.account}</AlertDescription></Alert>}
          <form onSubmit={handleAccountUpdate} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" required value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} />
            </div>
            <Button type="submit" disabled={loading.account}>
              {loading.account ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="p-6 mb-6">
        <CardContent className="p-0">
          <h2 className="text-lg font-bold mb-4">Security</h2>
          {error.password && <Alert variant="destructive" className="mb-4"><AlertDescription>{error.password}</AlertDescription></Alert>}
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <Label htmlFor="current_password">Current Password</Label>
              <Input id="current_password" type="password" required value={passwords.current_password} onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="new_password">New Password</Label>
              <Input id="new_password" type="password" required minLength={8} value={passwords.new_password} onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })} />
              <p className="text-xs text-muted-foreground mt-1">Minimum 8 characters</p>
            </div>
            <div>
              <Label htmlFor="confirm_password">Confirm New Password</Label>
              <Input id="confirm_password" type="password" required value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} />
            </div>
            <Button type="submit" disabled={loading.password}>
              {loading.password ? "Changing..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="p-6 border-destructive">
        <CardContent className="p-0">
          <h2 className="text-lg font-bold text-destructive mb-2">Danger Zone</h2>
          <Separator className="mb-4" />
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <Button variant="outline" className="text-destructive border-destructive" onClick={() => setDeleteOpen(true)}>
            Delete Account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete your account? This will permanently remove your account and linked profile. This action cannot be undone.
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
