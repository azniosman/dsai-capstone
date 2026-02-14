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

interface RewriteResult {
    original: string;
    rewritten: string;
    improvement_notes: string;
}

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
            const res = await api.post("/api/resume/rewrite", {
                target_role: role,
                bullet_point: bullet,
            });
            setResult(res.data);
            toast.success("Rewrite generated!");
        } catch (err: unknown) {
            const msg = (err as any).response?.data?.detail || "Failed to rewrite text";
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
        <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold mb-2">AI Resume Rewriter</h1>
            <p className="text-sm text-muted-foreground mb-6">
                Turn your basic bullet points into impactful, role-specific achievements.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Input Section */}
                <Card className="p-6">
                    <CardContent className="p-0 space-y-4">
                        <div>
                            <Label htmlFor="role">Target Role</Label>
                            <Input
                                id="role"
                                placeholder="e.g. Data Scientist, Product Manager"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="bullet">Your Bullet Point</Label>
                            <Textarea
                                id="bullet"
                                rows={6}
                                placeholder="e.g. Fixed bugs in the login system."
                                value={bullet}
                                onChange={(e) => setBullet(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleRewrite} disabled={loading} className="w-full">
                            {loading ? "Optimizing..." : "Rewrite with AI"}
                        </Button>
                        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                    </CardContent>
                </Card>

                {/* Output Section */}
                <div className="space-y-4">
                    {!result && !loading && (
                        <div className="h-full flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/50 text-muted-foreground">
                            <PenTool className="h-10 w-10 mb-2 opacity-50" />
                            <p>Result will appear here</p>
                        </div>
                    )}

                    {loading && (
                        <div className="h-full flex flex-col items-center justify-center p-8 border rounded-lg bg-background">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                            <p className="text-sm animate-pulse">Analyzing impact...</p>
                        </div>
                    )}

                    {result && (
                        <Card className="p-6 bg-[#f0f9ff] dark:bg-slate-900 border-[#bae6fd] dark:border-slate-800">
                            <CardContent className="p-0">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold flex items-center gap-2 text-[#0284c7] dark:text-sky-400">
                                        <CheckCircle2 className="h-5 w-5" />
                                        Optimized Version
                                    </h3>
                                    <Button variant="ghost" size="icon" onClick={copyToClipboard} className="h-8 w-8">
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-lg font-medium mb-4">{result.rewritten}</p>

                                <div className="bg-white dark:bg-slate-950 p-4 rounded-md text-sm border">
                                    <p className="font-semibold mb-1">Why this is better:</p>
                                    <p className="text-muted-foreground">{result.improvement_notes}</p>
                                </div>

                                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Original</p>
                                    <p className="text-sm opacity-70 strike-through">{result.original}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
