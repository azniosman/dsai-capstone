"use client";

import { useEffect, useState } from "react";
import { GraduationCap, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SkeletonCard from "@/components/ui/skeleton-card";
import api from "@/lib/api-client";
import { useModalStore } from "@/store/modalStore";

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

/** Normalise backend camelCase fields (NestJS/MikroORM) to the snake_case shape this page uses. */
function normalizeCourse(raw: any): Course {
  const fee = raw.course_fee ?? raw.courseFee ?? 0;
  const subsidyPct = raw.subsidy_percent ?? raw.subsidyPercent ?? 70;
  return {
    id: raw.id,
    title: raw.title,
    provider: raw.provider,
    duration_weeks: raw.duration_weeks ?? raw.durationWeeks ?? 0,
    level: raw.level ?? "intermediate",
    mces_eligible: raw.mces_eligible ?? raw.mcesEligible ?? false,
    certification: raw.certification,
    skills_taught: raw.skills_taught ?? raw.skillsTaught ?? [],
    course_fee: fee,
    subsidy_percent: subsidyPct,
    subsidy_amount: raw.subsidy_amount ?? Math.round((fee * subsidyPct) / 100),
    sfc_applicable: raw.sfc_applicable ?? raw.skillsfutureCreditAmount ?? 0,
    nett_payable: raw.nett_payable ?? raw.nettFeeAfterSubsidy ?? 0,
  };
}

export default function CourseBrowser() {
  const { openModal } = useModalStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState("");
  const [level, setLevel] = useState("");
  const [mcesOnly, setMcesOnly] = useState(false);
  const [skillSearch, setSkillSearch] = useState("");
  const [providers, setProviders] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchCourses = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string | boolean> = {};
        if (provider) params.provider = provider;
        if (level) params.level = level;
        if (mcesOnly) params.mces_eligible = true;
        const res = await api.get("/api/courses", {
          params,
          signal: controller.signal,
        });
        // Backend returns SCTPCourse[] directly with camelCase fields — normalize to snake_case
        const rawList = Array.isArray(res.data) ? res.data : (res.data?.courses ?? []);
        const courseList: Course[] = rawList.map(normalizeCourse);
        setCourses(courseList);
        setProviders((prev) => {
          if (prev.length === 0 && courseList.length > 0) {
            return [...new Set(courseList.map((c: Course) => c.provider))].sort() as string[];
          }
          return prev;
        });
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error(err);
          setError("Failed to load courses.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchCourses();
    return () => controller.abort();
  }, [provider, level, mcesOnly]);

  const filtered = skillSearch
    ? courses.filter((c) =>
        c.skills_taught.some((s) =>
          s.toLowerCase().includes(skillSearch.toLowerCase()),
        ),
      )
    : courses;

  return (
    <div className="space-y-5">
      <header>
        <p className="section-label mb-1">Upskilling</p>
        <h1 className="text-2xl font-extrabold tracking-tight">
          SCTP Course Browser
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          SkillsFuture Career Transition Programme courses with real-time
          subsidy calculations.
        </p>
      </header>

      {/* Filters */}
      <Card variant="data">
        <CardContent className="p-4">
          <div className="flex gap-4 flex-wrap items-end">
            <Select value={provider} onValueChange={(v) => setProvider(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Providers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {providers.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={level} onValueChange={(v) => setLevel(v === "all" ? "" : v)}>
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
              <Switch
                checked={mcesOnly}
                onCheckedChange={setMcesOnly}
                id="mces"
              />
              <Label htmlFor="mces" className="text-sm font-medium">
                MCES Eligible
              </Label>
            </div>

            <Input
              placeholder="Search by skill..."
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
              className="w-[200px]"
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => openModal("skillsFutureCourses")}
              className="ml-auto"
            >
              <Search className="h-3.5 w-3.5 mr-1.5" />
              Search SkillsFuture
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {loading && <SkeletonCard count={4} />}

      {!loading && (
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap className="h-3.5 w-3.5 text-primary" />
          <p className="section-label">
            {filtered.length} course{filtered.length !== 1 ? "s" : ""} available
          </p>
        </div>
      )}

      {!loading && !error && (
        <div className="flex flex-col gap-3">
          {filtered.map((course) => (
            <Card key={course.id} variant="elevated" className="hover-lift">
              <CardContent className="p-5">
                <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
                  <div>
                    <h2 className="text-base font-bold leading-tight">
                      {course.title}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {course.provider} &middot; {course.duration_weeks}w
                      &middot; {course.level}
                    </p>
                  </div>
                  <div className="flex gap-1.5 items-center flex-wrap">
                    {course.mces_eligible && (
                      <Badge variant="success">MCES Eligible</Badge>
                    )}
                    {course.certification && (
                      <Badge variant="accent">{course.certification}</Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-1 flex-wrap mb-4">
                  {course.skills_taught.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>

                {/* Fee breakdown */}
                <div className="grid grid-cols-4 gap-3 border-t border-border pt-3">
                  <div>
                    <p className="section-label mb-1">Course Fee</p>
                    <p className="font-bold data-num text-sm">
                      ${course.course_fee.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="section-label mb-1">
                      Subsidy ({course.subsidy_percent}%)
                    </p>
                    <p className="font-bold data-num text-sm text-emerald-500">
                      -${course.subsidy_amount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="section-label mb-1">SFC Offset</p>
                    <p className="font-bold data-num text-sm text-primary">
                      -${course.sfc_applicable.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="section-label mb-1">You Pay</p>
                    <p className="font-extrabold data-num text-base text-primary">
                      ${course.nett_payable.toLocaleString()}
                    </p>
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
