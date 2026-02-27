"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Activity,
  Pencil,
  Trash2,
  Check,
  X,
  Flame,
  CheckCircle2,
  BookOpen,
  Target,
  Calendar,
  Trophy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartCard } from "@/components/ui/chart-card";
import { toast } from "sonner";
import api from "@/lib/api-client";
import { extractApiError, cn } from "@/lib/utils";
import { KpiCard } from "@/components/dashboard/KpiCard";
// import { TimelineView } from "@/components/dashboard/TimelineView";

const SkillProficiencyBar = dynamic(
  () =>
    import("@/components/dashboard/charts/SkillProficiencyBar").then(
      (mod) => mod.SkillProficiencyBar,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[350px] w-full bg-card/40 animate-pulse rounded-xl" />
    ),
  },
);
const ProgressTrendLine = dynamic(
  () =>
    import("@/components/dashboard/charts/ProgressTrendLine").then(
      (mod) => mod.ProgressTrendLine,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[350px] w-full bg-card/40 animate-pulse rounded-xl" />
    ),
  },
);

// ─── Types ────────────────────────────────────────────────────────────────────

import type { ProgressEntry, ProgressData, TimelinePoint } from "@/types/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const LEVEL_OPTIONS = [
  { value: "0", label: "Not started (0%)" },
  { value: "0.5", label: "Partial (50%)" },
  { value: "1", label: "Strong (100%)" },
];

function getLevelColor(level: number) {
  if (level >= 1) return "hsl(145 60% 36%)";
  if (level >= 0.5) return "hsl(40 90% 45%)";
  return "hsl(220 80% 55%)";
}

function getLevelLabel(level: number) {
  if (level >= 1) return "Strong";
  if (level >= 0.5) return "Partial";
  return "Learning";
}

function getLevelVariant(level: number): "success" | "warning" | "secondary" {
  if (level >= 1) return "success";
  if (level >= 0.5) return "warning";
  return "secondary";
}

// ─── Circular progress ring ──────────────────────────────────────────────────

function ProgressRing({ level }: { level: number }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const color = getLevelColor(level);

  return (
    <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0">
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth="6"
      />
      <motion.circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - level * circ }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        strokeLinecap="round"
        transform="rotate(-90 32 32)"
      />
      <text
        x="32"
        y="37"
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill={color}
      >
        {Math.round(level * 100)}%
      </text>
    </svg>
  );
}

// ─── Activity heatmap (8-week GitHub-style grid) ─────────────────────────────

function heatColor(count: number) {
  if (count === 0) return "hsl(var(--muted))";
  if (count === 1) return "hsl(145 60% 75%)";
  if (count === 2) return "hsl(145 60% 55%)";
  return "hsl(145 60% 36%)";
}

function ActivityHeatmap({ entries }: { entries: ProgressEntry[] }) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const countByDay = useMemo(() => {
    const map: Record<string, number> = {};
    entries.forEach((e) => {
      const raw = e.recorded_at ?? "";
      const dateStr = raw.includes("T") ? raw.split("T")[0] : raw.split(" ")[0];
      if (dateStr) map[dateStr] = (map[dateStr] || 0) + 1;
    });
    return map;
  }, [entries]);

  const weeks = useMemo(() => {
    const days = Array.from({ length: 56 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (55 - i));
      const dateStr = d.toISOString().split("T")[0];
      return {
        date: dateStr,
        count: countByDay[dateStr] || 0,
        label: d.toLocaleDateString("en-SG", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
      };
    });
    return Array.from({ length: 8 }, (_, w) => days.slice(w * 7, w * 7 + 7));
  }, [today, countByDay]);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 min-w-[340px]">
        <div className="flex flex-col gap-1 pt-5 pr-1">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <span
              key={i}
              className="text-[9px] text-muted-foreground h-4 flex items-center w-3"
            >
              {d}
            </span>
          ))}
        </div>
        <div className="flex flex-1 gap-1">
          {weeks.map((week, wi) => {
            const weekStart = new Date(week[0].date);
            const weekLabel = weekStart.toLocaleDateString("en-SG", {
              month: "short",
              day: "numeric",
            });
            return (
              <div key={wi} className="flex flex-col gap-1 flex-1">
                <span className="text-[9px] text-muted-foreground h-4 leading-4 truncate">
                  {weekLabel}
                </span>
                {week.map((day) => (
                  <div
                    key={day.date}
                    title={`${day.label}: ${day.count} entr${day.count === 1 ? "y" : "ies"}`}
                    className="h-4 rounded-sm cursor-default transition-opacity hover:opacity-70"
                    style={{ backgroundColor: heatColor(day.count) }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-end gap-1.5 mt-2 text-[9px] text-muted-foreground">
        <span>Less</span>
        {[0, 1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: heatColor(n) }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

// ─── Streak calculation ───────────────────────────────────────────────────────

function computeStreak(entries: ProgressEntry[]): number {
  const uniqueDates = new Set(
    entries
      .map((e) => {
        const raw = e.recorded_at ?? "";
        return raw.includes("T") ? raw.split("T")[0] : raw.split(" ")[0];
      })
      .filter(Boolean),
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (uniqueDates.has(d.toISOString().split("T")[0])) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProgressDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Auto-redirect if not logged in
  if (typeof window !== "undefined" && !localStorage.getItem("token")) {
    router.push("/login");
  }

  const profileId =
    typeof window !== "undefined" ? localStorage.getItem("profileId") : null;

  const {
    data: progress,
    isLoading: isProgressLoading,
    error: progressError,
    refetch,
  } = useQuery({
    queryKey: ["progress", profileId],
    queryFn: async () => {
      const res = await api.get(`/api/progress/${profileId}`);
      return res.data as ProgressData;
    },
    enabled: !!profileId,
  });

  const { data: timeline = [], isLoading: isTimelineLoading } = useQuery({
    queryKey: ["progress-timeline", profileId],
    queryFn: async () => {
      const res = await api.get(`/api/progress/${profileId}/timeline`);
      return (res.data.timeline || []) as TimelinePoint[];
    },
    enabled: !!profileId,
  });

  const loading = isProgressLoading || isTimelineLoading;
  const error = progressError
    ? extractApiError(progressError, "Failed to load progress")
    : null;

  // Record form
  const [newSkill, setNewSkill] = useState("");
  const [newLevel, setNewLevel] = useState("0.5");
  const [submitting, setSubmitting] = useState(false);

  // Skill card quick-update
  const [updatingSkill, setUpdatingSkill] = useState<string | null>(null);
  const [skillUpdateLevel, setSkillUpdateLevel] = useState("0.5");

  // Activity log inline edit/delete
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingLevel, setEditingLevel] = useState("0.5");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const refresh = () => {
    refetch();
    queryClient.invalidateQueries({
      queryKey: ["progress-timeline", profileId],
    });
  };

  const recordProgress = async () => {
    if (!newSkill.trim() || !profileId) return;
    setSubmitting(true);
    try {
      await api.post("/api/progress", {
        profile_id: parseInt(profileId),
        skill: newSkill.trim(),
        level: parseFloat(newLevel),
      });
      toast.success(`Progress recorded for "${newSkill.trim()}"`);
      setNewSkill("");
      refresh();
    } catch {
      toast.error("Failed to record progress");
    } finally {
      setSubmitting(false);
    }
  };

  const updateSkillCard = async (skill: string) => {
    if (!profileId) return;
    try {
      await api.post("/api/progress", {
        profile_id: parseInt(profileId),
        skill,
        level: parseFloat(skillUpdateLevel),
      });
      toast.success(
        `"${skill}" updated to ${Math.round(parseFloat(skillUpdateLevel) * 100)}%`,
      );
      setUpdatingSkill(null);
      refresh();
    } catch {
      toast.error("Failed to update skill");
    }
  };

  const saveEditEntry = async (id: number) => {
    setSavingId(id);
    try {
      await api.put(`/api/progress/${id}`, { level: parseFloat(editingLevel) });
      toast.success("Entry updated");
      setEditingId(null);
      refresh();
    } catch {
      toast.error("Failed to update entry");
    } finally {
      setSavingId(null);
    }
  };

  const deleteEntry = async (id: number) => {
    try {
      await api.delete(`/api/progress/${id}`);
      toast.success("Entry deleted");
      setDeletingId(null);
      refresh();
    } catch {
      toast.error("Failed to delete entry");
    }
  };

  // ─── Derived data ──────────────────────────────────────────────────────────

  const latestBySkill = useMemo<Record<string, ProgressEntry>>(() => {
    const latest: Record<string, ProgressEntry> = {};
    for (const e of progress?.entries ?? []) {
      if (!(e.skill in latest)) latest[e.skill] = e;
    }
    return latest;
  }, [progress]);

  const streak = useMemo(
    () => computeStreak(progress?.entries ?? []),
    [progress],
  );

  const levelBarData = useMemo(
    () =>
      Object.entries(latestBySkill)
        .sort((a, b) => b[1].level - a[1].level)
        .map(([skill, e]) => ({ skill, level: e.level })),
    [latestBySkill],
  );

  const { chartData, allSkills } = useMemo(() => {
    const dateMap: Record<string, Record<string, unknown>> = {};
    timeline.forEach((t) => {
      if (!t.date) return;
      if (!dateMap[t.date]) dateMap[t.date] = { date: t.date };
      dateMap[t.date][t.skill] = t.level;
    });
    return {
      chartData: Object.values(dateMap),
      allSkills: [...new Set(timeline.map((t) => t.skill))],
    };
  }, [timeline]);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center mt-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const skillList = Object.values(latestBySkill);

  return (
    <div className="space-y-6">
      <header>
        <p className="section-label mb-1">Tracking</p>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Progress Dashboard
        </h1>
      </header>

      {/* ── KPI Row ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Acquired"
          value={progress?.skills_acquired ?? 0}
          delta={0}
          accentColor="text-[hsl(145,60%,36%)]"
          iconColor="bg-emerald-500/10 text-emerald-600 ring-emerald-500/20"
          glowColor="bg-emerald-500/5"
          subLabel="Skills mastered"
        />
        <KpiCard
          icon={<BookOpen className="h-5 w-5" />}
          label="In Progress"
          value={progress?.skills_in_progress ?? 0}
          delta={0}
          accentColor="text-amber-500"
          iconColor="bg-amber-500/10 text-amber-500 ring-amber-500/20"
          glowColor="bg-amber-500/5"
          subLabel="Being learned"
        />
        <KpiCard
          icon={<Target className="h-5 w-5" />}
          label="Total Tracked"
          value={progress?.skills_total ?? 0}
          delta={0}
          subLabel="In portfolio"
        />
        <KpiCard
          icon={<Flame className="h-5 w-5" />}
          label="Day Streak"
          value={streak}
          delta={0}
          accentColor="text-orange-500"
          iconColor="bg-orange-500/10 text-orange-500 ring-orange-500/20"
          glowColor="bg-orange-500/5"
          subLabel="Consecutive days"
        />
      </div>

      {/* ── Record Progress Form ──────────────────────────────────────────── */}
      <Card variant="data">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-primary" />
            <p className="section-label">Record Skill Progress</p>
          </div>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[160px] space-y-1.5">
              <Label
                htmlFor="skill-name"
                className="text-xs font-semibold uppercase tracking-wider"
              >
                Skill Name
              </Label>
              <Input
                id="skill-name"
                placeholder="e.g. Python, SQL, Docker…"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && recordProgress()}
              />
            </div>
            <div className="min-w-[160px] space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider">
                Level
              </Label>
              <Select value={newLevel} onValueChange={setNewLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVEL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={recordProgress}
              disabled={submitting || !newSkill.trim()}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Record
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Skill Cards Grid ──────────────────────────────────────────────── */}
      {skillList.length > 0 && (
        <div>
          <p className="section-label mb-3">Current Skill Levels</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <AnimatePresence>
              {skillList.map((entry) => {
                const isUpdating = updatingSkill === entry.skill;
                return (
                  <motion.div
                    key={entry.skill}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card variant="metric" className="overflow-hidden">
                      <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                        <ProgressRing level={entry.level} />
                        <div className="space-y-1 w-full">
                          <p
                            className="text-sm font-semibold truncate"
                            title={entry.skill}
                          >
                            {entry.skill}
                          </p>
                          <Badge
                            variant={getLevelVariant(entry.level)}
                            className="text-[10px]"
                          >
                            {getLevelLabel(entry.level)}
                          </Badge>
                        </div>
                        <AnimatePresence mode="wait">
                          {isUpdating ? (
                            <motion.div
                              key="editing"
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              className="flex gap-1 w-full"
                            >
                              <Select
                                value={skillUpdateLevel}
                                onValueChange={setSkillUpdateLevel}
                              >
                                <SelectTrigger className="h-7 text-xs flex-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {LEVEL_OPTIONS.map((o) => (
                                    <SelectItem
                                      key={o.value}
                                      value={o.value}
                                      className="text-xs"
                                    >
                                      {o.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => updateSkillCard(entry.skill)}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => setUpdatingSkill(null)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="idle"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="w-full"
                            >
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full h-7 text-xs"
                                onClick={() => {
                                  setUpdatingSkill(entry.skill);
                                  setSkillUpdateLevel(String(entry.level));
                                }}
                              >
                                <Pencil className="h-3 w-3 mr-1" /> Update
                              </Button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── Skill Level Overview (horizontal bar) ────────────────────────── */}
      {levelBarData.length > 0 && (
        <ChartCard
          title="Skill Level Overview"
          height={Math.max(180, levelBarData.length * 28 + 40)}
          ariaLabel="Bar chart of current skill levels"
        >
          <SkillProficiencyBar data={levelBarData} />
        </ChartCard>
      )}

      {/* ── Activity Heatmap ─────────────────────────────────────────────── */}
      {(progress?.entries?.length ?? 0) > 0 && (
        <Card variant="elevated">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-primary" />
              <p className="section-label">Activity — Last 8 Weeks</p>
            </div>
            <ActivityHeatmap entries={progress!.entries} />
          </CardContent>
        </Card>
      )}

      {/* ── Progress Trend line ───────────────────────────────────────────── */}
      {chartData.length > 0 && (
        <ChartCard
          title="Progress Trend"
          height={260}
          ariaLabel="Line chart of skill progress over time"
        >
          <ProgressTrendLine data={chartData} skills={allSkills} />
        </ChartCard>
      )}

      {/* ── Activity Log with inline edit / delete ───────────────────────── */}
      {(progress?.entries?.length ?? 0) > 0 && (
        <Card variant="elevated">
          <CardContent className="p-5">
            <p className="section-label mb-4">Activity Log</p>
            <div className="space-y-0.5">
              {progress!.entries.slice(0, 30).map((e) => {
                const isEditing = editingId === e.id;
                const isDeleting = deletingId === e.id;
                const dateStr = e.recorded_at?.includes("T")
                  ? e.recorded_at.split("T")[0]
                  : (e.recorded_at?.split(" ")[0] ?? "");

                return (
                  <motion.div
                    key={`${e.id ?? e.skill}-${e.recorded_at}`}
                    layout
                    className={cn(
                      "flex items-center gap-3 py-2 px-2 rounded-lg transition-colors group",
                      isDeleting ? "bg-destructive/5" : "hover:bg-muted/30",
                    )}
                  >
                    <Badge
                      variant={getLevelVariant(e.level)}
                      className="shrink-0 text-[10px] max-w-[120px] truncate"
                    >
                      {e.skill}
                    </Badge>

                    <AnimatePresence mode="wait">
                      {isEditing ? (
                        <motion.div
                          key="editing"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2 flex-1"
                        >
                          <Select
                            value={editingLevel}
                            onValueChange={setEditingLevel}
                          >
                            <SelectTrigger className="h-7 text-xs w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LEVEL_OPTIONS.map((o) => (
                                <SelectItem
                                  key={o.value}
                                  value={o.value}
                                  className="text-xs"
                                >
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => saveEditEntry(e.id!)}
                            disabled={savingId === e.id}
                          >
                            {savingId === e.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </motion.div>
                      ) : isDeleting ? (
                        <motion.div
                          key="deleting"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2 flex-1"
                        >
                          <span className="text-xs text-destructive font-medium flex-1">
                            Delete this entry?
                          </span>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 px-2 text-xs"
                            onClick={() => deleteEntry(e.id!)}
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => setDeletingId(null)}
                          >
                            Cancel
                          </Button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="idle"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-3 flex-1"
                        >
                          <span className="text-xs text-muted-foreground flex-1">
                            {getLevelLabel(e.level)}
                          </span>
                          <span className="text-[10px] text-muted-foreground data-num shrink-0">
                            {dateStr}
                          </span>
                          {e.id !== undefined && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  setEditingId(e.id!);
                                  setEditingLevel(String(e.level));
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                onClick={() => setDeletingId(e.id!)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
