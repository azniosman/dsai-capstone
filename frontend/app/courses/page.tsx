"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import SkeletonCard from "@/components/skeleton-card";
import api from "@/lib/api-client";

interface Course {
  id: number;
  title: string;
  provider: string;
  duration_weeks: number;
  level: string;
  mces_eligible: boolean;
  certification?: string;
  skills_taught: string[];
  course_fee: number;
  subsidy_percent: number;
  subsidy_amount: number;
  sfc_applicable: number;
  nett_payable: number;
}

export default function CourseBrowser() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState("");
  const [level, setLevel] = useState("");
  const [mcesOnly, setMcesOnly] = useState(false);
  const [skillSearch, setSkillSearch] = useState("");
  const [providers, setProviders] = useState<string[]>([]);

  useEffect(() => {
    fetchCourses();
  }, [provider, level, mcesOnly]);

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | boolean> = {};
      if (provider) params.provider = provider;
      if (level) params.level = level;
      if (mcesOnly) params.mces_eligible = true;
      const res = await api.get("/api/courses", { params });
      setCourses(res.data.courses);
      if (providers.length === 0 && res.data.courses.length > 0) {
        const uniqueProviders = [...new Set(res.data.courses.map((c: Course) => c.provider))].sort() as string[];
        setProviders(uniqueProviders);
      }
    } catch {
      setError("Failed to load courses.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = skillSearch
    ? courses.filter((c) =>
        c.skills_taught.some((s) => s.toLowerCase().includes(skillSearch.toLowerCase()))
      )
    : courses;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">SCTP Course Browser</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Browse SkillsFuture Career Transition Programme courses with real-time subsidy calculations.
      </p>

      <div className="flex gap-4 mb-6 flex-wrap items-center">
        <Select value={provider} onValueChange={setProvider}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Providers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            {providers.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch checked={mcesOnly} onCheckedChange={setMcesOnly} id="mces" />
          <Label htmlFor="mces" className="text-sm">MCES Eligible</Label>
        </div>

        <Input
          placeholder="Search by skill..."
          value={skillSearch}
          onChange={(e) => setSkillSearch(e.target.value)}
          className="w-[200px]"
        />
      </div>

      {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
      {loading && <SkeletonCard count={4} />}

      {!loading && (
        <p className="text-sm text-muted-foreground mb-4">
          Showing {filtered.length} course{filtered.length !== 1 ? "s" : ""}
        </p>
      )}

      {!loading && !error && (
        <div className="flex flex-col gap-4">
          {filtered.map((course) => (
            <Card key={course.id} className="p-6">
              <CardContent className="p-0">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <h2 className="text-lg font-bold">{course.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {course.provider} &middot; {course.duration_weeks} weeks &middot; {course.level}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {course.mces_eligible && (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">MCES Eligible</Badge>
                    )}
                    {course.certification && (
                      <Badge variant="outline">{course.certification}</Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-1 flex-wrap mt-3">
                  {course.skills_taught.map((s) => (
                    <Badge key={s} variant="outline">{s}</Badge>
                  ))}
                </div>

                <div className="flex gap-6 mt-4 flex-wrap">
                  <div>
                    <p className="text-xs text-muted-foreground">Course Fee</p>
                    <p className="font-semibold">${course.course_fee.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Subsidy ({course.subsidy_percent}%)</p>
                    <p className="font-semibold text-green-600">-${course.subsidy_amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">SFC Offset</p>
                    <p className="font-semibold text-blue-600">-${course.sfc_applicable.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">You Pay</p>
                    <p className="font-bold text-primary">${course.nett_payable.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
