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
      c.skills_taught.some((s) =>
        s.toLowerCase().includes(search.toLowerCase()),
      );
    return matchSearch;
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden h-screen -m-12 font-display bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 antialiased">
      {/* Top Navigation */}
      <header className="flex h-14 items-center justify-between border-b border-slate-custom-200 bg-white dark:bg-slate-custom-900 px-6 shrink-0 z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 text-primary">
            <BarChart className="w-8 h-8" />
            <h1 className="text-lg font-bold tracking-tight text-slate-custom-900 dark:text-white uppercase">
              Learning Path{" "}
              <span className="text-xs font-normal text-slate-custom-400">
                v4.2.0
              </span>
            </h1>
          </div>
          <nav className="flex items-center gap-1">
            <a
              className="px-3 py-1 text-sm font-medium text-primary bg-primary/10 rounded"
              href="#"
            >
              Inventory
            </a>
            <a
              className="px-3 py-1 text-sm font-medium text-slate-custom-600 dark:text-slate-custom-300 hover:bg-slate-custom-50 dark:hover:bg-slate-custom-800 rounded transition-colors"
              href="#"
            >
              Market Intelligence
            </a>
            <a
              className="px-3 py-1 text-sm font-medium text-slate-custom-600 dark:text-slate-custom-300 hover:bg-slate-custom-50 dark:hover:bg-slate-custom-800 rounded transition-colors"
              href="#"
            >
              Local Providers
            </a>
            <a
              className="px-3 py-1 text-sm font-medium text-slate-custom-600 dark:text-slate-custom-300 hover:bg-slate-custom-50 dark:hover:bg-slate-custom-800 rounded transition-colors"
              href="#"
            >
              AI Career Path
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative flex items-center">
            <Search className="absolute left-3 text-slate-custom-400 w-5 h-5 pointer-events-none" />
            <input
              className="h-9 w-80 rounded border-slate-custom-200 bg-slate-custom-50 dark:bg-slate-custom-800 dark:border-slate-custom-700 pl-10 text-sm focus:border-primary focus:ring-0 placeholder:text-slate-custom-400"
              placeholder="Search certifications, domains, providers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="text"
            />
          </div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r border-slate-custom-200 dark:border-slate-custom-800 bg-white dark:bg-slate-custom-900 flex flex-col p-4 shrink-0 overflow-y-auto z-10">
          <div className="mb-6">
            <p className="text-[10px] font-bold text-slate-custom-400 uppercase tracking-widest mb-3">
              Certification Status
            </p>
            <div className="space-y-1">
              <div className="flex items-center justify-between p-2 rounded bg-primary/5 border border-primary/10">
                <span className="text-sm font-medium text-slate-custom-700 dark:text-slate-custom-300">
                  AWS Solutions Arch.
                </span>
                <span className="text-xs font-bold text-primary font-mono">
                  84%
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded hover:bg-slate-custom-50 dark:hover:bg-slate-custom-800 border border-transparent transition-colors">
                <span className="text-sm font-medium text-slate-custom-600 dark:text-slate-custom-400">
                  CISSP Professional
                </span>
                <span className="text-xs font-bold text-slate-custom-400 font-mono">
                  42%
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded hover:bg-slate-custom-50 dark:hover:bg-slate-custom-800 border border-transparent transition-colors">
                <span className="text-sm font-medium text-slate-custom-600 dark:text-slate-custom-400">
                  GCP Cloud Architect
                </span>
                <span className="text-xs font-bold text-slate-custom-400 font-mono">
                  12%
                </span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-[10px] font-bold text-slate-custom-400 uppercase tracking-widest mb-3">
              Local Providers (SG)
            </p>
            <div className="space-y-3">
              <div className="p-3 border border-slate-custom-100 dark:border-slate-custom-800 rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-custom-800 dark:text-slate-custom-200">
                    NTUC LearningHub
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-bold rounded">
                    SF ELIGIBLE
                  </span>
                </div>
                <p className="text-[10px] text-slate-custom-500 leading-tight">
                  Hybrid Bootcamps, Corporate Training Specialists
                </p>
              </div>
              <div className="p-3 border border-slate-custom-100 dark:border-slate-custom-800 rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-custom-800 dark:text-slate-custom-200">
                    Informatics Academy
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold rounded">
                    ACCREDITED
                  </span>
                </div>
                <p className="text-[10px] text-slate-custom-500 leading-tight">
                  Specialized Cyber Security & Cloud Degree tracks
                </p>
              </div>
              <div className="p-3 border border-slate-custom-100 dark:border-slate-custom-800 rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-custom-800 dark:text-slate-custom-200">
                    General Assembly
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-bold rounded">
                    SF ELIGIBLE
                  </span>
                </div>
                <p className="text-[10px] text-slate-custom-500 leading-tight">
                  Intensive tech immersive programs for mid-career
                </p>
              </div>
            </div>
          </div>

          <div className="mt-auto p-4 bg-slate-custom-900 dark:bg-slate-custom-800 rounded-xl text-white">
            <p className="text-xs font-bold mb-1">SkillsFuture Credit</p>
            <p className="text-lg font-bold font-mono">S$1,240.00</p>
            <div className="mt-3 h-1 w-full bg-slate-custom-700 rounded-full overflow-hidden">
              <div className="bg-primary h-full w-3/4"></div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <section className="flex-1 overflow-y-auto bg-slate-custom-50 dark:bg-slate-custom-900/50 p-6 custom-scrollbar">
          {/* Header Metrics */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-custom-900 p-4 border border-slate-custom-200 dark:border-slate-custom-800 rounded shadow-sm">
              <p className="text-[10px] font-bold text-slate-custom-400 uppercase mb-1">
                Total SG Postings
              </p>
              <p className="text-2xl font-bold text-slate-custom-900 dark:text-white font-mono">
                1,842
              </p>
              <p className="text-[10px] text-green-600 font-medium flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3" /> +12% this month
              </p>
            </div>
            <div className="bg-white dark:bg-slate-custom-900 p-4 border border-slate-custom-200 dark:border-slate-custom-800 rounded shadow-sm">
              <p className="text-[10px] font-bold text-slate-custom-400 uppercase mb-1">
                Avg. Salary Delta
              </p>
              <p className="text-2xl font-bold text-slate-custom-900 dark:text-white font-mono">
                +S$1.4k
              </p>
              <p className="text-[10px] text-slate-custom-500 mt-1">
                Monthly increase projection
              </p>
            </div>
            <div className="bg-white dark:bg-slate-custom-900 p-4 border border-slate-custom-200 dark:border-slate-custom-800 rounded shadow-sm">
              <p className="text-[10px] font-bold text-slate-custom-400 uppercase mb-1">
                Overall Readiness
              </p>
              <p className="text-2xl font-bold text-primary font-mono">68.4%</p>
              <div className="mt-2 h-1.5 w-full bg-slate-custom-100 dark:bg-slate-custom-800 rounded-full overflow-hidden">
                <div className="bg-primary h-full w-[68%]"></div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-custom-900 p-4 border border-slate-custom-200 dark:border-slate-custom-800 rounded shadow-sm">
              <p className="text-[10px] font-bold text-slate-custom-400 uppercase mb-1">
                AI Recommendation
              </p>
              <p className="text-sm font-bold text-slate-custom-800 dark:text-slate-custom-200 leading-tight">
                Focus on &apos;Security & Compliance&apos; domains
              </p>
              <p className="text-[10px] text-primary mt-1 underline cursor-pointer">
                View Roadmap
              </p>
            </div>
          </div>

          {/* Heatmap View Equivalent */}
          <div className="bg-white dark:bg-slate-custom-900 border border-slate-custom-200 dark:border-slate-custom-800 rounded shadow-sm mb-6">
            <div className="border-b border-slate-custom-100 dark:border-slate-custom-800 p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-custom-800 dark:text-slate-custom-200">
                  Domain Readiness Heatmap: AWS Certified Solutions Architect -
                  Associate
                </h3>
                <p className="text-[11px] text-slate-custom-500 font-mono uppercase tracking-tighter">
                  Instance ID: CERT-8829-ASAA | Real-time AI Analysis
                </p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-xs font-bold border border-slate-custom-200 dark:border-slate-custom-700 rounded hover:bg-slate-custom-50 dark:hover:bg-slate-custom-800 transition-colors">
                  HISTORICAL
                </button>
                <button className="px-3 py-1 text-xs font-bold bg-primary text-white rounded hover:bg-primary/90 transition-colors">
                  LIVE TRACKER
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-5 gap-3 h-48">
                <div className="relative group">
                  <div className="absolute inset-0 bg-green-500/80 rounded flex flex-col items-center justify-center text-white">
                    <span className="text-2xl font-black font-mono">94%</span>
                    <span className="text-[10px] font-bold uppercase text-center px-2">
                      Design Resilient Architectures
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-green-400 rounded flex flex-col items-center justify-center text-white shadow-sm">
                    <span className="text-2xl font-black font-mono">81%</span>
                    <span className="text-[10px] font-bold uppercase text-center px-2">
                      Design High-Performing Architectures
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-400 rounded flex flex-col items-center justify-center text-white shadow-sm">
                    <span className="text-2xl font-black font-mono">58%</span>
                    <span className="text-[10px] font-bold uppercase text-center px-2">
                      Design Secure Applications & Architectures
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-orange-500 rounded flex flex-col items-center justify-center text-white shadow-sm">
                    <span className="text-2xl font-black font-mono">32%</span>
                    <span className="text-[10px] font-bold uppercase text-center px-2">
                      Design Cost-Optimized Architectures
                    </span>
                  </div>
                </div>
                <div className="bg-slate-custom-50 dark:bg-slate-custom-800 border-2 border-dashed border-slate-custom-200 dark:border-slate-custom-700 rounded flex flex-col items-center justify-center text-slate-custom-400 hover:bg-slate-custom-100 dark:hover:bg-slate-custom-700 transition-colors cursor-pointer">
                  <PlusCircle className="w-10 h-10 mb-2 stroke-1" />
                  <span className="text-[10px] font-bold uppercase">
                    Add Domain
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Certification Inventory Table */}
          <div className="bg-white dark:bg-slate-custom-900 border border-slate-custom-200 dark:border-slate-custom-800 rounded shadow-sm overflow-hidden">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 text-xs font-bold uppercase">
                {error}
              </div>
            )}
            <div className="p-4 border-b border-slate-custom-100 dark:border-slate-custom-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-custom-800 dark:text-slate-custom-200">
                Global Certification Inventory
              </h3>
              <div className="flex gap-2">
                <button className="p-1 text-slate-custom-400 hover:text-slate-custom-600">
                  <Filter className="w-5 h-5" />
                </button>
                <button className="p-1 text-slate-custom-400 hover:text-slate-custom-600">
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-slate-custom-500 font-bold text-xs uppercase tracking-widest">
                No certifications found matching query.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-custom-50 dark:bg-slate-custom-800/50 border-b border-slate-custom-100 dark:border-slate-custom-800">
                  <tr>
                    <th className="p-3 text-[10px] font-bold text-slate-custom-400 uppercase tracking-widest">
                      Certification Name
                    </th>
                    <th className="p-3 text-[10px] font-bold text-slate-custom-400 uppercase tracking-widest">
                      Provider
                    </th>
                    <th className="p-3 text-[10px] font-bold text-slate-custom-400 uppercase tracking-widest">
                      Readiness
                    </th>
                    <th className="p-3 text-[10px] font-bold text-slate-custom-400 uppercase tracking-widest text-center">
                      Nett Fee
                    </th>
                    <th className="p-3 text-[10px] font-bold text-slate-custom-400 uppercase tracking-widest text-right">
                      Avg. Salary Boost
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-custom-100 dark:divide-slate-custom-800">
                  {filtered.map((course) => (
                    <tr
                      key={course.id}
                      className="hover:bg-slate-custom-50 dark:hover:bg-slate-custom-800/50 transition-colors cursor-pointer group"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded bg-slate-custom-100 dark:bg-slate-custom-800 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                            <GraduationCap className="text-slate-custom-400 group-hover:text-primary w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-custom-800 dark:text-slate-custom-200">
                              {course.title}
                            </p>
                            {course.mces_eligible && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-bold rounded mr-1">
                                MCES ELIGIBLE
                              </span>
                            )}
                            {course.sfc_applicable > 0 && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold rounded">
                                SFC APPLICABLE
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-xs font-medium text-slate-custom-600 dark:text-slate-custom-400">
                        {course.provider}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-slate-custom-100 dark:bg-slate-custom-800 rounded-full overflow-hidden">
                            <div className="bg-primary h-full w-[42%]"></div>
                          </div>
                          <span className="text-[10px] font-bold font-mono">
                            42%
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center">
                          <span className="text-[10px] px-2 py-0.5 bg-slate-custom-100 dark:bg-slate-custom-800 text-slate-custom-700 dark:text-slate-custom-300 font-bold rounded-full font-mono">
                            S${course.nett_payable}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-right text-xs font-bold font-mono text-slate-custom-800 dark:text-slate-custom-200">
                        S$1,200 / mo
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="bg-slate-custom-50 dark:bg-slate-custom-800/50 p-3 border-t border-slate-custom-100 dark:border-slate-custom-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-custom-500 font-medium tracking-widest uppercase">
                Showing {filtered.length} active trackable certifications
              </span>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 text-[10px] font-bold border border-slate-custom-200 dark:border-slate-custom-700 rounded hover:bg-slate-custom-100 dark:hover:bg-slate-custom-700 transition-colors uppercase disabled:opacity-50"
                  disabled
                >
                  Previous
                </button>
                <button className="px-3 py-1 text-[10px] font-bold border border-slate-custom-200 dark:border-slate-custom-700 rounded hover:bg-slate-custom-100 dark:hover:bg-slate-custom-700 transition-colors uppercase">
                  Next
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Contextual Intelligence Sidebar (Right) */}
        <aside className="w-80 border-l border-slate-custom-200 dark:border-slate-custom-800 bg-white dark:bg-slate-custom-900 p-6 flex flex-col shrink-0 overflow-y-auto custom-scrollbar z-10">
          <h3 className="text-xs font-bold text-slate-custom-400 uppercase tracking-widest mb-6">
            Market Intelligence
          </h3>
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold text-slate-custom-800 dark:text-slate-custom-200 mb-3">
                Salary Projection (SG Region)
              </p>
              <div className="relative pt-6 h-32 w-full">
                <div className="absolute inset-0 bg-primary/5 rounded-lg border border-primary/10"></div>
                <div className="absolute bottom-4 left-4 right-4 h-1 bg-slate-custom-200 dark:bg-slate-custom-700 rounded-full overflow-hidden">
                  <div className="bg-primary h-full w-2/3 relative">
                    <div className="absolute -top-6 right-0 translate-x-1/2 flex flex-col items-center">
                      <span className="text-[9px] font-bold bg-primary text-white px-1.5 py-0.5 rounded">
                        YOU
                      </span>
                      <div className="w-0.5 h-6 bg-primary"></div>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-6 left-4 right-4 flex justify-between text-[9px] font-bold text-slate-custom-400 font-mono">
                  <span>S$4k</span>
                  <span>S$8k</span>
                  <span>S$12k+</span>
                </div>
                <p className="absolute bottom-1 right-4 text-[8px] font-bold text-slate-custom-400">
                  MARKET 75th PERCENTILE
                </p>
              </div>
              <p className="text-[10px] text-slate-custom-500 mt-2 italic leading-tight">
                Projected S$12k increase per annum upon completion of AWS +
                CISSP stack.
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-custom-800 dark:text-slate-custom-200 mb-3">
                AI Path Recommendation
              </p>
              <div className="space-y-4">
                <div className="relative pl-6 pb-4 border-l-2 border-slate-custom-100 dark:border-slate-custom-800">
                  <div className="absolute -left-1.5 top-0 size-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-custom-900 shadow-sm"></div>
                  <p className="text-xs font-bold text-slate-custom-800 dark:text-slate-custom-200">
                    Cloud Fundamentals
                  </p>
                  <p className="text-[10px] text-slate-custom-500">
                    Completed via AWS Cloud Practitioner
                  </p>
                </div>
                <div className="relative pl-6 pb-4 border-l-2 border-slate-custom-100 dark:border-slate-custom-800">
                  <div className="absolute -left-1.5 top-0 size-3 bg-primary rounded-full border-2 border-white dark:border-slate-custom-900 shadow-sm"></div>
                  <p className="text-xs font-bold text-slate-custom-800 dark:text-slate-custom-200">
                    Specialized Security
                  </p>
                  <p className="text-[10px] text-slate-custom-500">
                    Current Phase: Preparing for CISSP
                  </p>
                  <button className="mt-2 text-[9px] font-bold text-primary uppercase hover:underline">
                    View Gap Analysis
                  </button>
                </div>
                <div className="relative pl-6">
                  <div className="absolute -left-1.5 top-0 size-3 bg-slate-custom-200 dark:bg-slate-custom-700 rounded-full border-2 border-white dark:border-slate-custom-900"></div>
                  <p className="text-xs font-bold text-slate-custom-400">
                    Enterprise Architecture
                  </p>
                  <p className="text-[10px] text-slate-custom-500">
                    Target Phase: TOGAF 9.2
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Footer Meta-Bar */}
      <footer className="h-8 border-t border-slate-custom-200 dark:border-slate-custom-800 bg-white dark:bg-slate-custom-900 flex items-center justify-between px-6 shrink-0 z-10 w-full">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-green-500"></span>
            <span className="text-[9px] font-bold text-slate-custom-500 font-mono">
              API CONNECTED: SSG-GATEWAY-L4
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-primary animate-pulse"></span>
            <span className="text-[9px] font-bold text-slate-custom-500 font-mono">
              AI MODEL: CERTPREDICT-v2.1
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
