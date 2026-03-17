"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Filter,
  Download,
  BarChart,
  TrendingUp,
  PlusCircle,
  GraduationCap,
  Sparkles,
} from "lucide-react";
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

export default function CourseBrowser() {
  const { openModal } = useModalStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const params: Record<string, string> = {};

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
  }, []);

  const filtered = courses.filter((c) => {
    const matchSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.provider.toLowerCase().includes(search.toLowerCase()) ||
      c.skills_taught.some((s) =>
        s.toLowerCase().includes(search.toLowerCase()),
      );
    return matchSearch;
  });

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 antialiased font-display">
      {/* Search Header */}
      <div className="sticky top-0 z-10 border-b border-slate-custom-200 dark:border-slate-custom-800 bg-white/80 dark:bg-slate-custom-900/80 backdrop-blur-md px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-custom-900 dark:text-white tracking-tight uppercase flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-primary" />
              Course Catalog
            </h1>
            <p className="text-sm font-medium text-slate-custom-500 mt-1">
              Explore {courses.length > 0 ? courses.length : "..."}{" "}
              industry-recognized programs and certifications.
            </p>
          </div>
          <div className="relative w-full sm:w-96 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-custom-400 w-5 h-5 group-focus-within:text-primary transition-colors" />
            <input
              className="w-full h-11 rounded-lg border-slate-custom-200 bg-slate-custom-50 dark:bg-slate-custom-800/50 dark:border-slate-custom-700 pl-10 pr-4 text-sm font-medium focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-slate-custom-400 shadow-sm transition-all outline-none"
              placeholder="Search by role, skill, or provider..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="text"
            />
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-custom-200 dark:border-slate-custom-800 bg-white dark:bg-slate-custom-900 p-6 flex flex-col h-[320px]"
              >
                <Skeleton className="h-6 w-3/4 mb-4 rounded" />
                <Skeleton className="h-4 w-1/2 mb-6 rounded" />
                <div className="flex gap-2 mb-auto">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <div className="mt-6 flex justify-between items-end">
                  <Skeleton className="h-8 w-24 rounded" />
                  <Skeleton className="h-10 w-32 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center border-2 border-dashed border-slate-custom-200 dark:border-slate-custom-800 rounded-2xl bg-white/50 dark:bg-slate-custom-900/50">
            <Search className="w-12 h-12 text-slate-custom-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-custom-700 dark:text-slate-custom-300 uppercase tracking-wide">
              No matching courses found
            </h3>
            <p className="text-sm text-slate-custom-500 mt-2">
              Try adjusting your search terms or filters to find exactly what
              you need.
            </p>
            <Button
              variant="outline"
              className="mt-6 text-xs font-bold uppercase tracking-wider h-9"
              onClick={() => setSearch("")}
            >
              Clear Search
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 content-start">
            {filtered.map((course, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                key={course.id}
                className="group relative flex flex-col bg-white dark:bg-slate-custom-900 border border-slate-custom-200 dark:border-slate-custom-800 hover:border-primary/40 dark:hover:border-primary/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all h-full"
              >
                {/* Meta badges */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  {course.mces_eligible && (
                    <span className="text-[9px] px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 font-bold rounded-full uppercase tracking-wider">
                      MCES
                    </span>
                  )}
                  {course.sfc_applicable > 0 && (
                    <span className="text-[9px] px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-bold rounded-full uppercase tracking-wider">
                      SFC Eligible
                    </span>
                  )}
                  {course.level && (
                    <span className="text-[9px] px-2 py-0.5 bg-slate-custom-100 text-slate-custom-600 dark:bg-slate-custom-800 dark:text-slate-custom-400 font-bold rounded-full uppercase tracking-wider ml-auto">
                      {course.level}
                    </span>
                  )}
                </div>

                {/* Core Info */}
                <h3 className="text-base font-bold text-slate-custom-900 dark:text-slate-custom-50 line-clamp-2 leading-tight mb-1 group-hover:text-primary transition-colors">
                  {course.title}
                </h3>
                <p className="text-xs font-medium text-slate-custom-500 dark:text-slate-custom-400 mb-4 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-custom-300 dark:bg-slate-custom-600"></span>
                  {course.provider}
                </p>

                {/* Skills Chips */}
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {course.skills_taught.slice(0, 4).map((skill, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-1 bg-slate-custom-50 dark:bg-slate-custom-800/50 text-slate-custom-600 dark:text-slate-custom-400 border border-slate-custom-100 dark:border-slate-custom-800 font-medium rounded-md truncate max-w-full"
                    >
                      {skill}
                    </span>
                  ))}
                  {course.skills_taught.length > 4 && (
                    <span className="text-[10px] px-2 py-1 bg-slate-custom-50 dark:bg-slate-custom-800/50 text-slate-custom-500 border border-slate-custom-100 dark:border-slate-custom-800 font-medium rounded-md">
                      +{course.skills_taught.length - 4} more
                    </span>
                  )}
                </div>

                <div className="mt-auto pt-4 border-t border-slate-custom-100 dark:border-slate-custom-800 flex items-end justify-between">
                  <div>
                    <p className="text-[9px] font-bold text-slate-custom-400 uppercase tracking-widest leading-none mb-1">
                      Nett Fee
                    </p>
                    <p className="text-lg font-black text-slate-custom-900 dark:text-white font-mono leading-none">
                      S${course.nett_payable}
                    </p>
                    {course.course_fee > course.nett_payable && (
                      <p className="text-[10px] text-slate-custom-400 mt-1 line-through decoration-slate-custom-300 dark:decoration-slate-custom-700">
                        S${course.course_fee}
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={() => openModal("courseIntel", course)}
                    className="h-9 px-3 gap-1.5 font-bold uppercase tracking-wider text-[10px] bg-primary/10 text-primary hover:bg-primary hover:text-white shadow-none transition-all Group-hover:translate-x-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Intel
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
