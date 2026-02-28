"use client";

import { useState } from "react";
import { PenTool, CheckCircle2, Copy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import api from "@/lib/api-client";
import { extractApiError } from "@/lib/utils";

interface RewriteResult {
    original: string;
    rewritten: string;
    improvement_notes: string;
}

const FIELD_LABEL = "text-xs font-semibold uppercase tracking-widest";

export default function ResumeRewriter() {
    const [role, setRole] = useState("");
    const [bullet, setBullet] = useState("");
    const [result, setResult] = useState<RewriteResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRewrite = async () => {
        if (!role.trim()) { setError("Please enter a target role."); return; }
        if (!bullet.trim()) { setError("Please enter a bullet point to rewrite."); return; }

        setLoading(true);
        setError(null);
        try {
            const res = await api.post("/api/resume-rewriter", {
                target_role: role,
                bullet_point: bullet,
            });
            setResult(res.data);
            toast.success("Rewrite generated!");
        } catch (err: unknown) {
            const msg = extractApiError(err, "Failed to rewrite text");
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (result) {
            navigator.clipboard.writeText(result.rewritten);
            toast.success("Copied to clipboard!");
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-5">
            <header>
                <p className="section-label mb-1">AI Tool</p>
                <h1 className="text-2xl font-extrabold tracking-tight">Resume Rewriter</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Turn basic bullet points into impactful, role-specific achievements.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Input */}
                <Card variant="data">
                    <CardContent className="p-6 space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="role" className={FIELD_LABEL}>Target Role</Label>
                            <Input
                                id="role"
                                placeholder="e.g. Data Scientist, Product Manager"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="bullet" className={FIELD_LABEL}>Your Bullet Point</Label>
                            <Textarea
                                id="bullet"
                                rows={6}
                                placeholder="e.g. Fixed bugs in the login system."
                                value={bullet}
                                onChange={(e) => setBullet(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleRewrite} disabled={loading} className="w-full">
                            {loading ? "Optimising..." : "Rewrite with AI"}
                        </Button>
                        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                    </CardContent>
                </Card>

                {/* Output */}
                <div className="space-y-4">
                    {!result && !loading && (
                        <div className="h-full min-h-[200px] flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded bg-muted/20 text-muted-foreground">
                            <PenTool className="h-10 w-10 mb-2 opacity-30" />
                            <p className="text-sm">Result will appear here</p>
                        </div>
                    )}

                    {loading && (
                        <div className="h-full min-h-[200px] flex flex-col items-center justify-center p-8 border border-border rounded bg-card">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3" />
                            <p className="text-sm text-muted-foreground animate-pulse">Analysing impact...</p>
                        </div>
                    )}

                    {result && (
                        <Card variant="highlight">
                            <CardContent className="p-5">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-primary" />
                                        <p className="section-label text-primary">Optimised Version</p>
                                    </div>
                                    <Button variant="ghost" size="icon-sm" onClick={copyToClipboard}>
                                        <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                <p className="text-base font-semibold mb-4 leading-relaxed">{result.rewritten}</p>

                                <div className="bg-card p-4 rounded border border-border mb-4">
                                    <p className="section-label mb-1.5">Why this is better</p>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{result.improvement_notes}</p>
                                </div>

                                <div className="border-t border-border pt-3">
                                    <p className="section-label mb-1.5">Original</p>
                                    <p className="text-sm text-muted-foreground opacity-60 line-through">{result.original}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
