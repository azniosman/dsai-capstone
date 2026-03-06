"use client";

/**
 * @file view_live_matrix/page.tsx
 * @description Live Interactive Matrix — IMDA Number of Infocomm Jobs
 *
 * Fetches employment and vacancy data from data.gov.sg and displays it in:
 *   1. A sortable, searchable, filterable data table
 *   2. A dual-axis line chart (Employed vs Vacancies over time)
 *
 * Data source: IMDA Number of Infocomm Jobs (data.gov.sg)
 * Dataset ID:  d_f3bbdfbf92b811fff364aeed23b5e0bb
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  Wifi,
  WifiOff,
  TrendingUp,
  Users,
  Briefcase,
  Database,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  fetchInfocommJobs,
  type InfocommRecord,
  type InfocommJobsMeta,
} from "@/lib/fetchInfocommJobs";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = "quarter" | "employed" | "vacancies";
type SortDir = "asc" | "desc";

// ─── Tooltip for recharts ─────────────────────────────────────────────────────

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

const ChartTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 text-xs font-mono space-y-1 border border-primary/20">
      <p className="text-primary font-bold tracking-wider">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ViewLiveMatrixPage() {
  const [records, setRecords] = useState<InfocommRecord[]>([]);
  const [meta, setMeta] = useState<InfocommJobsMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);

  // ── Filter & sort state ───────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("quarter");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // ── Fetch data ────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Direct client-side fetch since S3 static exports don't support Next.js API routes
      const data = await fetchInfocommJobs();
      setRecords(data.records);
      setMeta(data.meta);
      setLastFetchedAt(new Date().toLocaleTimeString("en-SG"));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch dataset. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Derived data ──────────────────────────────────────────────────────────

  /** Unique years for the year filter dropdown. */
  const availableYears = useMemo(() => {
    const years = [...new Set(records.map((r) => r.year))].sort();
    return years;
  }, [records]);

  /** Latest record for KPI cards. */
  const latestRecord = useMemo(() => records[records.length - 1], [records]);

  /** Previous record for YoY delta. */
  const prevYearRecord = useMemo(() => {
    if (!latestRecord) return null;
    return (
      records.findLast(
        (r) => r.year === latestRecord.year - 1 && r.quarter.includes("Q4"),
      ) ?? records[records.length - 5]
    );
  }, [records, latestRecord]);

  /** Filtered + sorted records for the table. */
  const displayRecords = useMemo(() => {
    let filtered = records;

    // Year filter
    if (selectedYear !== "all") {
      filtered = filtered.filter((r) => r.year === Number(selectedYear));
    }

    // Search filter (quarter string)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((r) => r.quarter.toLowerCase().includes(q));
    }

    // Sort
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      const cmp =
        typeof aVal === "string"
          ? aVal.localeCompare(bVal as string)
          : (aVal as number) - (bVal as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [records, selectedYear, searchQuery, sortKey, sortDir]);

  /** Chart data — sample every 2 records for readability if > 40 points. */
  const chartData = useMemo(() => {
    const src = records.filter(
      (r) => selectedYear === "all" || r.year === Number(selectedYear),
    );
    const step = src.length > 40 ? 2 : 1;
    return src
      .filter((_, i) => i % step === 0)
      .map((r) => ({
        name: r.quarter,
        Employed: r.employed,
        Vacancies: r.vacancies,
      }));
  }, [records, selectedYear]);

  // ── Sort handler ──────────────────────────────────────────────────────────
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 text-primary" />
    ) : (
      <ArrowDown className="h-3 w-3 text-primary" />
    );
  };

  // ── Delta helper ──────────────────────────────────────────────────────────
  const delta = (curr: number, prev: number | undefined) => {
    if (!prev || prev === 0) return null;
    const pct = ((curr - prev) / prev) * 100;
    return { pct: pct.toFixed(1), positive: pct >= 0 };
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background text-foreground font-display">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="section-label">DATA.GOV.SG · IMDA</span>
              <span
                className={`live-dot ${isLoading ? "opacity-50" : ""}`}
                title="Live dataset"
              />
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              Infocomm Jobs Matrix
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {lastFetchedAt && !isLoading && (
              <span className="text-[11px] font-mono text-muted-foreground hidden sm:block">
                Updated {lastFetchedAt}
              </span>
            )}
            <button
              onClick={fetchData}
              disabled={isLoading}
              aria-label="Refresh dataset"
              className="clay-btn flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ── Status banner ──────────────────────────────────────────── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm"
            >
              <WifiOff className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-destructive">
                  Failed to load dataset
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── KPI Cards ─────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Infocomm Employed",
              icon: Users,
              value: latestRecord?.employed,
              prev: prevYearRecord?.employed,
              color: "text-primary",
              bg: "bg-primary/5 border-primary/20",
            },
            {
              label: "Job Vacancies",
              icon: Briefcase,
              value: latestRecord?.vacancies,
              prev: prevYearRecord?.vacancies,
              color: "text-purple-400",
              bg: "bg-purple-500/5 border-purple-500/20",
            },
            {
              label: "Latest Quarter",
              icon: TrendingUp,
              value: null,
              text: latestRecord?.quarter ?? "—",
              color: "text-emerald-400",
              bg: "bg-emerald-500/5 border-emerald-500/20",
            },
            {
              label: "Total Records",
              icon: Database,
              value: null,
              text: meta ? `${meta.total} quarters` : "—",
              color: "text-amber-400",
              bg: "bg-amber-500/5 border-amber-500/20",
            },
          ].map((kpi) => {
            const Icon = kpi.icon;
            const d =
              kpi.value != null && kpi.prev != null
                ? delta(kpi.value, kpi.prev)
                : null;
            return (
              <motion.div
                key={kpi.label}
                whileHover={{ y: -2 }}
                className={`glass-card border rounded-xl px-4 py-4 ${kpi.bg}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="section-label">{kpi.label}</span>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                {isLoading ? (
                  <div className="h-7 w-24 rounded bg-muted/40 animate-pulse" />
                ) : (
                  <>
                    <p className={`text-2xl font-bold data-num ${kpi.color}`}>
                      {kpi.value != null
                        ? kpi.value.toLocaleString()
                        : (kpi.text ?? "—")}
                    </p>
                    {d && (
                      <p
                        className={`text-xs font-mono mt-1 ${d.positive ? "trend-up" : "trend-down"}`}
                      >
                        {d.positive ? "▲" : "▼"} {Math.abs(Number(d.pct))}% YoY
                      </p>
                    )}
                  </>
                )}
              </motion.div>
            );
          })}
        </section>

        {/* ── Chart ─────────────────────────────────────────────────── */}
        <section className="glass-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-sm">
                Employed vs Vacancies Over Time
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Quarterly trend — Singapore Infocomm sector
              </p>
            </div>
            <Wifi className="h-4 w-4 text-primary opacity-60" />
          </div>

          {isLoading ? (
            <div className="h-56 rounded-lg bg-muted/20 animate-pulse flex items-center justify-center">
              <span className="text-xs font-mono text-muted-foreground tracking-widest animate-pulse">
                LOADING_CHART...
              </span>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
              No data available for the selected filter.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart
                data={chartData}
                margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                />
                <XAxis
                  dataKey="name"
                  tick={{
                    fontSize: 10,
                    fill: "var(--muted-foreground)",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{
                    fontSize: 10,
                    fill: "var(--muted-foreground)",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                  width={40}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={7}
                  wrapperStyle={{
                    fontSize: 11,
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="Employed"
                  stroke="#259df4"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#259df4" }}
                />
                <Line
                  type="monotone"
                  dataKey="Vacancies"
                  stroke="#9333ea"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#9333ea" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* ── Filters row ───────────────────────────────────────────── */}
        <section className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search quarter… e.g. 2022 Q3"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>

          {/* Year filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="appearance-none bg-card border border-border rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary cursor-pointer min-w-[140px]"
              aria-label="Filter by year"
            >
              <option value="all">All Years</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Record count */}
          <div className="flex items-center px-3 py-2 bg-card border border-border rounded-lg text-xs font-mono text-muted-foreground whitespace-nowrap">
            {displayRecords.length} record
            {displayRecords.length !== 1 ? "s" : ""}
          </div>
        </section>

        {/* ── Data Table ────────────────────────────────────────────── */}
        <section className="glass-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm" role="grid">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {(
                    [
                      { key: "quarter" as SortKey, label: "Quarter" },
                      { key: "employed" as SortKey, label: "Employed" },
                      { key: "vacancies" as SortKey, label: "Vacancies" },
                    ] as { key: SortKey; label: string }[]
                  ).map(({ key, label }) => (
                    <th
                      key={key}
                      scope="col"
                      onClick={() => handleSort(key)}
                      className="px-5 py-3 text-left font-semibold text-xs tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors group"
                    >
                      <div className="flex items-center gap-1.5">
                        {label}
                        <SortIcon col={key} />
                      </div>
                    </th>
                  ))}
                  <th
                    scope="col"
                    className="px-5 py-3 text-left font-semibold text-xs tracking-wider text-muted-foreground"
                  >
                    Vacancy Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  // Skeleton rows
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/60 animate-pulse"
                    >
                      {[1, 2, 3, 4].map((j) => (
                        <td key={j} className="px-5 py-3.5">
                          <div className="h-3.5 bg-muted/40 rounded w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : displayRecords.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-12 text-center text-muted-foreground"
                    >
                      No records match your filter.
                    </td>
                  </tr>
                ) : (
                  displayRecords.map((record, idx) => {
                    /** Vacancy rate as % of employed */
                    const vacancyRate =
                      record.employed > 0
                        ? ((record.vacancies / record.employed) * 100).toFixed(
                            1,
                          )
                        : "—";
                    const vacancyNum = Number(vacancyRate);
                    const rateColor =
                      vacancyNum >= 4
                        ? "text-emerald-400"
                        : vacancyNum >= 2
                          ? "text-amber-400"
                          : "text-muted-foreground";

                    return (
                      <motion.tr
                        key={record.quarter}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.015, 0.3) }}
                        className="border-b border-border/40 hover:bg-primary/3 transition-colors"
                      >
                        {/* Quarter */}
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-[11px] font-bold text-primary/80 tracking-wider">
                            {record.quarter}
                          </span>
                        </td>

                        {/* Employed */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="data-num font-semibold tabular-nums">
                              {record.employed.toLocaleString()}
                            </span>
                            <div className="hidden sm:block flex-1 max-w-[80px]">
                              <div className="score-bar-track">
                                <div
                                  className="score-bar-fill bg-primary"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      (record.employed /
                                        Math.max(
                                          ...displayRecords.map(
                                            (r) => r.employed,
                                          ),
                                          1,
                                        )) *
                                        100,
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Vacancies */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="data-num font-semibold tabular-nums text-purple-400">
                              {record.vacancies.toLocaleString()}
                            </span>
                            <div className="hidden sm:block flex-1 max-w-[60px]">
                              <div className="score-bar-track">
                                <div
                                  className="score-bar-fill bg-purple-500"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      (record.vacancies /
                                        Math.max(
                                          ...displayRecords.map(
                                            (r) => r.vacancies,
                                          ),
                                          1,
                                        )) *
                                        100,
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Vacancy Rate */}
                        <td className="px-5 py-3.5">
                          <span
                            className={`font-mono text-xs font-semibold tabular-nums ${rateColor}`}
                          >
                            {vacancyRate !== "—" ? `${vacancyRate}%` : "—"}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          {!isLoading && meta && (
            <div className="border-t border-border/60 px-5 py-3 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
              <span>
                IMDA · data.gov.sg ·{" "}
                <span className="text-primary">
                  d_f3bbdfbf92b811fff364aeed23b5e0bb
                </span>
              </span>
              <span>
                {displayRecords.length} / {meta.total} records
              </span>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
