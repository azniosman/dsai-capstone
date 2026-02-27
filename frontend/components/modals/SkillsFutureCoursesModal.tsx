"use client";

import { useState, useEffect, useCallback } from "react";
import { AppModal } from "@/components/ui/AppModal";
import { CourseCard } from "@/components/ui/course-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ssgApi, type SsgCourse, type PaginatedSsgCoursesResponse } from "@/lib/api";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  WifiOff,
} from "lucide-react";

const PAGE_SIZE = 9;

interface SkillsFutureCoursesModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-fill the keyword search from the calling context */
  initialKeyword?: string;
  /** Filter by skill tag */
  initialSkill?: string;
  /** Show personalised recommendations if provided */
  profileSkills?: string[];
  targetRole?: string;
}

export default function SkillsFutureCoursesModal({
  isOpen,
  onClose,
  initialKeyword = "",
  initialSkill = "",
  profileSkills,
  targetRole,
}: SkillsFutureCoursesModalProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [inputValue, setInputValue] = useState(initialKeyword);
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<PaginatedSsgCoursesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(
    async (kw: string, pg: number) => {
      setLoading(true);
      setError(null);
      try {
        const data = await ssgApi.searchCourses({
          keyword: kw || undefined,
          skill: initialSkill || undefined,
          limit: PAGE_SIZE,
          offset: pg * PAGE_SIZE,
        });
        setResult(data);
      } catch {
        setError("Failed to load courses. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [initialSkill],
  );

  // Load on open / keyword / page change
  useEffect(() => {
    if (isOpen) {
      fetchCourses(keyword, page);
    }
  }, [isOpen, keyword, page, fetchCourses]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPage(0);
      setKeyword(initialKeyword);
      setInputValue(initialKeyword);
      setResult(null);
    }
  }, [isOpen, initialKeyword]);

  const handleSearch = () => {
    setPage(0);
    setKeyword(inputValue);
  };

  const totalPages = result ? Math.ceil(result.total / PAGE_SIZE) : 0;

  const sourceInfo = result?.source === "live"
    ? { label: "Live SSG API", variant: "success" as const }
    : result?.source === "cached"
    ? { label: "Cached", variant: "accent" as const }
    : { label: "Offline (seeded)", variant: "secondary" as const };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        <span className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          SkillsFuture Courses
        </span>
      }
      description={
        targetRole
          ? `Showing courses relevant to ${targetRole}`
          : "Search SkillsFuture Singapore courses and SCTP programmes"
      }
      footer={
        totalPages > 1 ? (
          <div className="flex w-full items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages} &middot; {result?.total ?? 0} courses
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1 || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null
      }
    >
      {/* Search bar */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-9 h-9 text-sm"
            placeholder="Search by keyword or skill…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button size="sm" onClick={handleSearch} disabled={loading}>
          Search
        </Button>
      </div>

      {/* Source badge */}
      {result && (
        <div className="flex items-center gap-2 mb-4">
          {result.source === "seeded" && (
            <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <Badge variant={sourceInfo.variant} className="text-[0.6rem]">
            {sourceInfo.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {result.total} course{result.total !== 1 ? "s" : ""} found
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-medium mb-4">
          {error}
        </div>
      )}

      {/* Grid */}
      {!loading && !error && result && result.data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {result.data.map((course, idx) => (
            <CourseCard
              key={course.referenceNumber}
              course={course}
              rank={page * PAGE_SIZE + idx + 1}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && result && result.data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-16 w-16 rounded-3xl bg-muted/50 flex items-center justify-center mb-4">
            <GraduationCap className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-base font-bold text-foreground">No courses found</p>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">
            Try a different keyword or clear the search to browse all courses.
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-44 rounded-2xl bg-muted/40 animate-pulse"
            />
          ))}
        </div>
      )}
    </AppModal>
  );
}
