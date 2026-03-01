"use client";

import { useEffect, useState } from "react";
import {
  GraduationCap,
  Search,
  Clock,
  Zap,
  Users,
  BookOpen,
  Filter,
  ChevronRight,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import api from "@/lib/api-client";
import { useModalStore } from "@/store/modalStore";
import { motion } from "framer-motion";

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

function normalizeCourse(raw: Record<string, unknown>): Course {
  const fee = Number(raw.course_fee ?? raw.courseFee ?? 0);
  const subsidyPct = Number(raw.subsidy_percent ?? raw.subsidyPercent ?? 70);
  return {
    id: Number(raw.id),
    title: String(raw.title || ""),
    provider: String(raw.provider || ""),
    duration_weeks: Number(raw.duration_weeks ?? raw.durationWeeks ?? 0),
    level: String(raw.level ?? "intermediate"),
    mces_eligible: Boolean(raw.mces_eligible ?? raw.mcesEligible ?? false),
    certification: raw.certification ? String(raw.certification) : undefined,
    skills_taught: Array.isArray(raw.skills_taught ?? raw.skillsTaught)
      ? ((raw.skills_taught ?? raw.skillsTaught) as string[])
      : [],
    course_fee: fee,
    subsidy_percent: subsidyPct,
    subsidy_amount: Number(
      raw.subsidy_amount ?? Math.round((fee * subsidyPct) / 100),
    ),
    sfc_applicable: Number(
      raw.sfc_applicable ?? raw.skillsfutureCreditAmount ?? 0,
    ),
    nett_payable: Number(raw.nett_payable ?? raw.nettFeeAfterSubsidy ?? 0),
  };
}

const LEVEL_COLORS: Record<string, string> = {
  beginner: "text-green-600 bg-green-50 border-green-200",
  intermediate: "text-amber-600 bg-amber-50 border-amber-200",
  advanced: "text-red-600 bg-red-50 border-red-200",
};

const CATEGORIES = [
  "All",
  "Data Science",
  "Cloud",
  "Cybersecurity",
  "AI/ML",
  "DevOps",
  "Design",
];

/* ─── Course card ─── */
function CourseCard({
  course,
  index,
}: {
  course: Course;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const levelClass = LEVEL_COLORS[course.level] ?? "text-muted-foreground bg-muted border-border";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className="glass-card p-4 hover-lift flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-md border font-semibold",
                levelClass,
              )}
            >
              {course.level.toUpperCase()}
            </span>
            {course.mces_eligible && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md border text-primary bg-primary/8 border-primary/20 font-semibold">
                MCES
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold leading-tight">{course.title}</h3>
          <p className="micro-type text-[9px] opacity-50 mt-0.5">
            {course.provider}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-base font-black tabular-nums text-primary">
            ${course.nett_payable.toLocaleString()}
          </div>
          <div className="micro-type text-[9px] opacity-40 line-through">
            ${course.course_fee.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {course.duration_weeks}w
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Star className="h-3 w-3" />
          {course.subsidy_percent}% subsidy
        </span>
        {course.certification && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <GraduationCap className="h-3 w-3" />
            {course.certification}
          </span>
        )}
      </div>

      {/* Skills preview */}
      {course.skills_taught.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {course.skills_taught.slice(0, expanded ? undefined : 4).map((s) => (
            <span
              key={s}
              className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground font-medium"
            >
              {s}
            </span>
          ))}
          {!expanded && course.skills_taught.length > 4 && (
            <button
              onClick={() => setExpanded(true)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-primary/8 text-primary font-semibold"
            >
              +{course.skills_taught.length - 4}
            </button>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="flex items-center gap-2 pt-1 border-t border-border/40">
        <div className="flex-1 min-w-0">
          <div className="flex gap-3 text-[10px]">
            <span className="text-muted-foreground">
              SFC: <strong className="text-primary">-${course.sfc_applicable.toLocaleString()}</strong>
            </span>
            <span className="text-muted-foreground">
              Subsidy: <strong className="text-green-600">-${course.subsidy_amount.toLocaleString()}</strong>
            </span>
          </div>
        </div>
        <Button size="sm" className="clay-btn text-xs h-7 px-3 shrink-0">
          <Zap className="h-3 w-3 mr-1" /> Deploy
        </Button>
      </div>
    </motion.div>
  );
}

export default function CourseBrowser() {
  const { openModal } = useModalStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [level, setLevel] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const params: Record<string, string> = {};
    if (level) params.level = level;

    api
      .get("/api/courses", { params, signal: controller.signal })
      .then((res) => {
        const rawList = Array.isArray(res.data)
          ? res.data
          : (res.data?.courses ?? []);
        setCourses(rawList.map(normalizeCourse));
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError("Failed to load courses.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [level]);

  const filtered = courses.filter((c) => {
    const matchSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.skills_taught.some((s) =>
        s.toLowerCase().includes(search.toLowerCase()),
      );
    const matchLevel = !level || c.level === level;
    return matchSearch && matchLevel;
  });

  // Top course recommendation (highest subsidy)
  const topCourse = courses.reduce<Course | null>(
    (best, c) => (!best || c.subsidy_percent > best.subsidy_percent ? c : best),
    null,
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2 mb-1">
          <span className="live-dot" />
          <p className="micro-type text-primary">Learning Path</p>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              Resource Hub
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              SkillsFuture SCTP courses with subsidy calculations
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openModal("skillsFutureCourses")}
            className="shrink-0"
          >
            <Search className="h-3.5 w-3.5 mr-1.5" />
            Search SSG Live
          </Button>
        </div>
      </header>

      {/* Filter bar */}
      <div className="glass-card p-3 flex items-center gap-3 flex-wrap">
        <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

        {/* Category pills */}
        <div className="flex gap-1.5 flex-wrap flex-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "text-xs px-3 py-1 rounded-full font-medium transition-all duration-150",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Level filter */}
        <div className="flex gap-1">
          {["", "beginner", "intermediate", "advanced"].map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={cn(
                "text-[10px] px-2 py-1 rounded-md font-semibold transition-all duration-150",
                level === l
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              {l || "All"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-7 h-7 text-xs bg-background"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main grid + sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* Course grid — 3 cols */}
        <div className="xl:col-span-3">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-52 rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center glass-card">
              <BookOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-semibold">No courses found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try adjusting your search filters
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="h-3.5 w-3.5 text-primary" />
                <p className="micro-type">
                  {filtered.length} course{filtered.length !== 1 ? "s" : ""}{" "}
                  available
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((course, i) => (
                  <CourseCard key={course.id} course={course} index={i} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sidebar — 1 col */}
        <div className="space-y-4">
          {/* Resume Booster */}
          {topCourse && (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <p className="micro-type">Resume Booster</p>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Highest subsidy course for your profile:
              </p>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/15 space-y-1.5">
                <p className="text-xs font-bold leading-tight">
                  {topCourse.title}
                </p>
                <p className="micro-type text-[9px] opacity-60">
                  {topCourse.provider}
                </p>
                <div className="flex items-center justify-between">
                  <span className="micro-type text-[9px] text-green-600">
                    {topCourse.subsidy_percent}% subsidised
                  </span>
                  <span className="text-sm font-black tabular-nums text-primary">
                    ${topCourse.nett_payable.toLocaleString()}
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                className="clay-btn w-full mt-3 text-xs"
              >
                Deploy <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          )}

          {/* Course Stream */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-3.5 w-3.5 text-secondary" />
              <p className="micro-type">Course Stream</p>
            </div>
            <div className="space-y-2">
              {courses.slice(0, 3).map((c, i) => (
                <div
                  key={c.id}
                  className="flex items-start gap-2 py-2 border-b border-border/30 last:border-0"
                >
                  <span className="micro-type text-[9px] text-primary opacity-60 font-mono mt-0.5 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">{c.title}</p>
                    <p className="micro-type text-[9px] opacity-50">
                      {c.duration_weeks}w · {c.level}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Node Connections */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="micro-type">Node Connections</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Connect your skill gaps to targeted courses via the{" "}
              <a href="/skill-gap" className="text-primary hover:underline">
                Skill Matrix
              </a>
              .
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["Python", "Cloud", "ML Ops", "SQL", "React"].map((s) => (
                <span
                  key={s}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
