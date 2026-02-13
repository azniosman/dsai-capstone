"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import api from "@/lib/api-client";

const DIFFICULTY_CLASSES: Record<string, string> = {
  easy: "bg-green-100 text-green-800 hover:bg-green-100",
  moderate: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  hard: "bg-red-100 text-red-800 hover:bg-red-100",
};

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
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get("/api/roles").then((res) => setRoles(res.data)).catch(() => {});
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
      setError((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Comparison failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Compare Roles</h1>

      <Card className="p-6 mb-6">
        <CardContent className="p-0">
          <p className="text-sm text-muted-foreground mb-3">Select 2-4 roles to compare:</p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {roles.map((r) => (
              <Badge
                key={r.id}
                variant={selectedIds.includes(r.id) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleRole(r.id)}
              >
                {r.title}
              </Badge>
            ))}
          </div>
          {selectedIds.length > 0 && (
            <p className="text-xs text-muted-foreground mb-3">
              Selected: {selectedIds.map((id) => roles.find((r) => r.id === id)?.title).join(", ")}
            </p>
          )}
          <Button onClick={compare} disabled={loading || selectedIds.length < 2}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Compare
          </Button>
        </CardContent>
      </Card>

      {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}

      {result && (
        <>
          <Card className="p-6 mb-4">
            <CardContent className="p-0">
              <h3 className="font-bold mb-2">Skills in Common</h3>
              <div className="flex gap-1 flex-wrap">
                {result.common_skills.length > 0
                  ? result.common_skills.map((s) => <Badge key={s} className="bg-primary hover:bg-primary">{s}</Badge>)
                  : <p className="text-sm text-muted-foreground">No common required skills</p>}
              </div>
            </CardContent>
          </Card>

          <div className="border rounded-lg overflow-x-auto mb-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Attribute</TableHead>
                  {result.roles.map((r) => (
                    <TableHead key={r.role_id} className="text-center">{r.title}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Match Score</TableCell>
                  {result.roles.map((r) => (
                    <TableCell key={r.role_id} className="text-center">
                      <span className={`font-bold ${r.match_score >= 0.6 ? "text-green-600" : "text-orange-500"}`}>
                        {Math.round(r.match_score * 100)}%
                      </span>
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Transition</TableCell>
                  {result.roles.map((r) => (
                    <TableCell key={r.role_id} className="text-center">
                      <Badge className={DIFFICULTY_CLASSES[r.transition_difficulty] || ""}>{r.transition_difficulty}</Badge>
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Salary</TableCell>
                  {result.roles.map((r) => (
                    <TableCell key={r.role_id} className="text-center">{r.salary_range || "N/A"}</TableCell>
                  ))}
                </TableRow>
                <TableRow className="hidden md:table-row">
                  <TableCell className="font-medium">Education</TableCell>
                  {result.roles.map((r) => (
                    <TableCell key={r.role_id} className="text-center">{r.education_level}</TableCell>
                  ))}
                </TableRow>
                <TableRow className="hidden md:table-row">
                  <TableCell className="font-medium">Min Experience</TableCell>
                  {result.roles.map((r) => (
                    <TableCell key={r.role_id} className="text-center">{r.min_experience_years} yrs</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Career Switcher</TableCell>
                  {result.roles.map((r) => (
                    <TableCell key={r.role_id} className="text-center">
                      {r.career_switcher_friendly ? "Yes" : "No"}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Matched Skills</TableCell>
                  {result.roles.map((r) => (
                    <TableCell key={r.role_id} className="text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {r.matched_skills.map((s) => (
                          <Badge key={s} variant="outline" className="border-green-500 text-green-700">{s}</Badge>
                        ))}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Missing Skills</TableCell>
                  {result.roles.map((r) => (
                    <TableCell key={r.role_id} className="text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {r.missing_skills.map((s) => (
                          <Badge key={s} variant="outline" className="border-red-500 text-red-700">{s}</Badge>
                        ))}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <Card className="p-6">
            <CardContent className="p-0">
              <h3 className="font-bold mb-2">Unique Skills per Role</h3>
              {Object.entries(result.unique_skills_per_role).map(([title, skills]) => (
                <div key={title} className="mt-2">
                  <p className="text-sm font-bold">{title}:</p>
                  <div className="flex gap-1 flex-wrap">
                    {skills.length > 0
                      ? skills.map((s) => <Badge key={s} variant="outline">{s}</Badge>)
                      : <span className="text-xs text-muted-foreground">None</span>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
