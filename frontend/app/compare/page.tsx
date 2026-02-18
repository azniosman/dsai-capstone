"use client";

import { useEffect, useState } from "react";
import { Loader2, GitCompare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import api from "@/lib/api-client";
import { extractApiError } from "@/lib/utils";

function difficultyVariant(d: string): "success" | "warning" | "destructive" | "outline" {
  if (d === "easy") return "success";
  if (d === "moderate") return "warning";
  if (d === "hard") return "destructive";
  return "outline";
}

interface Role {
  id: number;
  title: string;
  category: string;
}

interface ComparedRole {
  role_id: number;
  title: string;
  match_score: number;
  transition_difficulty: string;
  salary_range: string;
  education_level: string;
  min_experience_years: number;
  career_switcher_friendly: boolean;
  matched_skills: string[];
  missing_skills: string[];
}

interface CompareResult {
  common_skills: string[];
  roles: ComparedRole[];
  unique_skills_per_role: Record<string, string[]>;
}

export default function RoleComparison() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get("/api/roles")
      .then((res) => setRoles(res.data))
      .catch(() => { })
      .finally(() => setRolesLoading(false));
  }, []);

  const toggleRole = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const compare = async () => {
    const profileId = localStorage.getItem("profileId");
    if (!profileId) { setError("Create a profile first."); return; }
    if (selectedIds.length < 2) { setError("Select at least 2 roles."); return; }

    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/api/compare-roles", {
        profile_id: parseInt(profileId),
        role_ids: selectedIds,
      });
      setResult(res.data);
    } catch (err: unknown) {
      setError(extractApiError(err, "Comparison failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <p className="section-label mb-1">Analysis Tool</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Compare Roles</h1>
      </header>

      {/* Selection card */}
      <Card variant="data">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <GitCompare className="h-4 w-4 text-primary" />
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest" style={{ fontSize: "0.625rem", letterSpacing: "0.1em" }}>
              Select 2–4 roles to compare
            </p>
          </div>
          {rolesLoading ? (
            <div className="flex gap-1.5 mb-4 flex-wrap">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-6 w-24 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {roles.map((r) => (
                <Badge
                  key={r.id}
                  variant={selectedIds.includes(r.id) ? "default" : "outline"}
                  className="cursor-pointer"
                  role="checkbox"
                  aria-checked={selectedIds.includes(r.id)}
                  aria-label={`${selectedIds.includes(r.id) ? "Deselect" : "Select"} ${r.title}`}
                  tabIndex={0}
                  onClick={() => toggleRole(r.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleRole(r.id); } }}
                >
                  {r.title}
                </Badge>
              ))}
            </div>
          )}
          {selectedIds.length > 0 && (
            <p className="text-xs text-muted-foreground mb-3 data-num">
              {selectedIds.length} selected: {selectedIds.map((id) => roles.find((r) => r.id === id)?.title).join(" · ")}
            </p>
          )}
          <Button onClick={compare} disabled={loading || selectedIds.length < 2}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Run Comparison
          </Button>
        </CardContent>
      </Card>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {result && (
        <div className="space-y-5">
          {/* Common skills */}
          <Card variant="metric">
            <CardContent className="p-5">
              <p className="section-label mb-3">Skills in Common</p>
              <div className="flex gap-1.5 flex-wrap">
                {result.common_skills.length > 0
                  ? result.common_skills.map((s) => <Badge key={s} variant="accent">{s}</Badge>)
                  : <p className="text-sm text-muted-foreground">No common required skills across selected roles.</p>}
              </div>
            </CardContent>
          </Card>

          {/* Comparison table */}
          <Card variant="elevated">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 border-b border-border">
                      <TableHead className="font-bold text-foreground w-32">Attribute</TableHead>
                      {result.roles.map((r) => (
                        <TableHead key={r.role_id} className="text-center font-bold text-foreground">{r.title}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">Match Score</TableCell>
                      {result.roles.map((r) => {
                        const score = Math.round(r.match_score * 100);
                        return (
                          <TableCell key={r.role_id} className="text-center">
                            <span className={`font-bold data-num text-lg ${score >= 60 ? "text-primary" : "text-amber-500"}`}>
                              {score}%
                            </span>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">Transition</TableCell>
                      {result.roles.map((r) => (
                        <TableCell key={r.role_id} className="text-center">
                          <Badge variant={difficultyVariant(r.transition_difficulty)}>{r.transition_difficulty}</Badge>
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">Salary</TableCell>
                      {result.roles.map((r) => (
                        <TableCell key={r.role_id} className="text-center font-semibold data-num text-sm">{r.salary_range || "N/A"}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="hidden md:table-row">
                      <TableCell className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">Education</TableCell>
                      {result.roles.map((r) => (
                        <TableCell key={r.role_id} className="text-center text-sm">{r.education_level}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="hidden md:table-row">
                      <TableCell className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">Min. Exp.</TableCell>
                      {result.roles.map((r) => (
                        <TableCell key={r.role_id} className="text-center data-num text-sm">{r.min_experience_years} yrs</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">Career Switch</TableCell>
                      {result.roles.map((r) => (
                        <TableCell key={r.role_id} className="text-center">
                          <Badge variant={r.career_switcher_friendly ? "success" : "muted"}>
                            {r.career_switcher_friendly ? "Friendly" : "Standard"}
                          </Badge>
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">Matched</TableCell>
                      {result.roles.map((r) => (
                        <TableCell key={r.role_id} className="text-center">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {r.matched_skills.map((s) => (
                              <Badge key={s} variant="success" className="text-xs">{s}</Badge>
                            ))}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">Missing</TableCell>
                      {result.roles.map((r) => (
                        <TableCell key={r.role_id} className="text-center">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {r.missing_skills.map((s) => (
                              <Badge key={s} variant="warning" className="text-xs">{s}</Badge>
                            ))}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Unique skills */}
          <Card variant="elevated">
            <CardContent className="p-5">
              <p className="section-label mb-4">Unique Skills per Role</p>
              <div className="space-y-4">
                {Object.entries(result.unique_skills_per_role).map(([title, skills]) => (
                  <div key={title}>
                    <p className="text-xs font-bold mb-1.5">{title}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {skills.length > 0
                        ? skills.map((s) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)
                        : <span className="text-xs text-muted-foreground">None unique</span>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
