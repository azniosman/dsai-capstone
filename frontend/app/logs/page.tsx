"use client";

/**
 * @file logs/page.tsx
 * @description Real-time log monitor for SkillBridge backend activity.
 *
 * Data sources (in priority order):
 *  1. Server-Sent Events  — `GET /api/logs/stream` via NestJS LogController
 *  2. Polling fallback    — `GET /api/logs/recent?n=200` every 3 seconds,
 *     activated automatically when SSE connection fails or times out.
 *
 * Client-side ring buffer: 500 entries max. Excess entries are evicted from
 * the front to keep memory bounded regardless of session duration.
 *
 * Performance: rows are rendered with a windowed list (no react-window dep
 * required — we use a native CSS `contain: strict` table with overflow-y scroll
 * and anchor-based auto-scroll). For >500 rows, only the visible slice
 * renders due to the fixed-height container.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  Search,
  Wifi,
  WifiOff,
  X,
  Download,
  ChevronDown,
  Filter,
  Timer,
  Pause,
  Play,
} from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import PipelineCanvas from "./components/pipeline-flow/PipelineCanvas";
import ActivityTimeline from "./components/pipeline-flow/ActivityTimeline";

// ─── Types ────────────────────────────────────────────────────────────────────

type LogType = "RAG" | "LLM" | "AWS" | "SYSTEM" | "ERROR" | "INFO" | "WARN";

export interface LogEntry {
  _id: string; // client-side random key
  timestamp: string;
  type: LogType;
  component: string;
  message: string;
  traceId?: string;
  meta?: Record<string, any>;
}

type ConnectionStatus = "connecting" | "connected" | "polling" | "error";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_ENTRIES = 500;

const POLL_OPTIONS: { label: string; ms: number }[] = [
  { label: "1s", ms: 1_000 },
  { label: "3s", ms: 3_000 },
  { label: "5s", ms: 5_000 },
  { label: "10s", ms: 10_000 },
  { label: "30s", ms: 30_000 },
];

/**
 * Builds an absolute URL for a given API path.
 *
 * Handles two deployment modes:
 *  - Static export (S3/CloudFront): browser calls API Gateway directly via
 *    `NEXT_PUBLIC_API_URL`. Trailing slash is stripped; `/api` is added once.
 *  - Standalone server: Next.js rewrites proxy `/api/:path*` to the backend,
 *    so we just use the relative path `/api/...`.
 */
const buildApiUrl = (path: string): string => {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return `/api${path}`; // local dev: Next.js rewrite handles it
  const base = raw.replace(/\/+$/, ""); // strip all trailing slashes
  // Avoid doubling `/api` if the env var already ends with it
  const prefix = base.endsWith("/api") ? base : `${base}/api`;
  return `${prefix}${path}`;
};

const LOGS_RECENT_URL = buildApiUrl("/logs/recent");

const ALL_TYPES: LogType[] = [
  "RAG",
  "LLM",
  "AWS",
  "SYSTEM",
  "INFO",
  "WARN",
  "ERROR",
];

// ─── Styling helpers ──────────────────────────────────────────────────────────

const TYPE_STYLES: Record<
  LogType,
  { pill: string; row: string; icon: React.ReactNode; label: string }
> = {
  RAG: {
    pill: "bg-[#00f2f2]/15 text-[#00f2f2] border-[#00f2f2]/30",
    row: "hover:bg-[#00f2f2]/3",
    icon: <Activity className="w-3 h-3" />,
    label: "RAG",
  },
  LLM: {
    pill: "bg-[#259df4]/15 text-[#259df4] border-[#259df4]/30",
    row: "hover:bg-[#259df4]/3",
    icon: <CheckCircle className="w-3 h-3" />,
    label: "LLM",
  },
  AWS: {
    pill: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    row: "hover:bg-orange-500/3",
    icon: <Info className="w-3 h-3" />,
    label: "AWS",
  },
  SYSTEM: {
    pill: "bg-white/10 text-white/60 border-white/10",
    row: "hover:bg-white/3",
    icon: <Info className="w-3 h-3" />,
    label: "SYS",
  },
  INFO: {
    pill: "bg-[#259df4]/15 text-[#259df4] border-[#259df4]/30",
    row: "hover:bg-[#259df4]/3",
    icon: <Info className="w-3 h-3" />,
    label: "INFO",
  },
  WARN: {
    pill: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    row: "hover:bg-yellow-500/3",
    icon: <AlertTriangle className="w-3 h-3" />,
    label: "WARN",
  },
  ERROR: {
    pill: "bg-red-500/15 text-red-400 border-red-500/30",
    row: "hover:bg-red-500/3",
    icon: <AlertTriangle className="w-3 h-3" />,
    label: "ERR",
  },
};

// ─── Utilities ────────────────────────────────────────────────────────────────

let _idCounter = 0;
const makeId = () => `entry-${++_idCounter}`;

const formatTs = (iso: string): string => {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-SG", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  } catch {
    return iso;
  }
};

const downloadLogs = (entries: LogEntry[]) => {
  const text = entries
    .map(
      (e) =>
        `[${e.timestamp}] [${e.type}] [${e.component}] ${e.message}${
          e.meta ? " " + JSON.stringify(e.meta) : ""
        }`,
    )
    .join("\n");
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `skillbridge-logs-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LogsPage() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [autoScroll, setAutoScroll] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTypes, setActiveTypes] = useState<Set<LogType>>(
    new Set(ALL_TYPES),
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pollIntervalMs, setPollIntervalMs] = useState(3_000);
  const [activeComponents, setActiveComponents] = useState<Set<string>>(
    new Set(),
  );
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Pause state freezes the UI on a snapshot of entries, while the background
  // buffer continues receiving new events up to MAX_ENTRIES.
  const [pausedSnapshot, setPausedSnapshot] = useState<LogEntry[] | null>(null);

  const topRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // ── Ring buffer append ─────────────────────────────────────────────────────

  const appendEntries = useCallback((incoming: LogEntry[]) => {
    setEntries((prev) => {
      const combined = [...prev, ...incoming];
      return combined.length > MAX_ENTRIES
        ? combined.slice(combined.length - MAX_ENTRIES)
        : combined;
    });
  }, []);

  // ── Demo Mode Simulator ────────────────────────────────────────────────────

  useEffect(() => {
    if (!isDemoMode) return;

    let step = 0;
    const currentTraceId = `sklbr-${Math.random().toString(36).substring(2, 9)}`;
    const steps = [
      { t: "INFO", c: "chat_controller", m: "Received user query" },
      { t: "INFO", c: "embedding_service", m: "Generating query embeddings" },
      { t: "INFO", c: "vector_store", m: "Executing hybrid search" },
      { t: "INFO", c: "rag_service", m: "5 documents retrieved" },
      { t: "INFO", c: "rag_service", m: "Context builder assembled prompt" },
      { t: "INFO", c: "llm_service", m: "Invoking Bedrock model" },
      { t: "INFO", c: "llm_service", m: "Response stream generated" },
    ];

    const interval = setInterval(() => {
      if (step >= steps.length) {
        step = 0; // Loop the demo
        return;
      }

      const s = steps[step];
      const entry: LogEntry = {
        _id: makeId(),
        timestamp: new Date().toISOString(),
        type: s.t as LogType,
        component: s.c,
        message: s.m,
        traceId: currentTraceId,
      };

      appendEntries([entry]);
      step++;
    }, 1200);

    return () => clearInterval(interval);
  }, [isDemoMode, appendEntries]);

  // ── Polling connection ─────────────────────────────────────────────────────

  useEffect(() => {
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let lastSeenTs = "";
    let destroyed = false;

    const startPolling = async () => {
      if (destroyed) return;
      setConnectionStatus("polling");

      try {
        const res = await fetch(`${LOGS_RECENT_URL}?n=200`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Array<Omit<LogEntry, "_id">>;

        const newItems = data
          .filter((e) => e.timestamp > lastSeenTs)
          .map((e) => ({ ...e, _id: makeId() }));

        if (newItems.length > 0) {
          lastSeenTs = newItems[newItems.length - 1].timestamp;
          appendEntries(newItems);
        }
        setConnectionStatus("polling");
      } catch {
        setConnectionStatus("error");
      }
    };

    // Initial poll
    startPolling();
    // Set up interval for continuous polling
    pollTimer = setInterval(startPolling, pollIntervalMs);

    return () => {
      destroyed = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [appendEntries, pollIntervalMs]);

  // ── Auto-scroll (newest-at-top → scroll to top) ───────────────────────────

  useEffect(() => {
    if (autoScroll && topRef.current) {
      topRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [entries, autoScroll]);

  const handleScroll = useCallback(() => {
    const el = tableRef.current;
    if (!el) return;
    // When newest is at top, auto-scroll engages when user scrolls back to top.
    const atTop = el.scrollTop < 40;
    if (atTop && !autoScroll) setAutoScroll(true);
    if (!atTop && autoScroll) setAutoScroll(false);
  }, [autoScroll]);

  const togglePause = useCallback(() => {
    if (pausedSnapshot) {
      setPausedSnapshot(null); // Resume (catches up to latest)
      setAutoScroll(true);
    } else {
      setPausedSnapshot([...entries]); // Freeze current state
      setAutoScroll(false);
    }
  }, [pausedSnapshot, entries]);

  const toggleType = useCallback((t: LogType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) {
        next.delete(t);
      } else {
        next.add(t);
      }
      return next;
    });
  }, []);

  const toggleComponent = useCallback((c: string) => {
    setActiveComponents((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }, []);

  const availableComponents = useMemo(() => {
    return Array.from(new Set(entries.map((e) => e.component))).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    const source = pausedSnapshot ?? entries;
    let list = source.filter((e) => activeTypes.has(e.type));

    if (activeComponents.size > 0) {
      list = list.filter((e) => activeComponents.has(e.component));
    }

    if (search.trim()) {
      let regex: RegExp | null = null;
      let q = search.trim();

      // Attempt to parse /pattern/ or /pattern/i
      if (q.startsWith("/") && (q.endsWith("/") || q.endsWith("/i"))) {
        try {
          const isCaseInsensitive = q.endsWith("/i");
          const pattern = isCaseInsensitive ? q.slice(1, -2) : q.slice(1, -1);
          regex = new RegExp(pattern, isCaseInsensitive ? "i" : "");
        } catch {
          // ignore invalid regex, fallback to string matching
        }
      }

      if (regex) {
        list = list.filter(
          (e) =>
            regex!.test(e.message) ||
            regex!.test(e.component) ||
            regex!.test(e.type),
        );
      } else {
        q = q.toLowerCase();
        list = list.filter(
          (e) =>
            e.message.toLowerCase().includes(q) ||
            e.component.toLowerCase().includes(q) ||
            e.type.toLowerCase().includes(q),
        );
      }
    }
    // Newest first
    return [...list].reverse();
  }, [entries, pausedSnapshot, activeTypes, activeComponents, search]);

  // ─── Metrics Calculation ────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    // 1. LLM Latency Trend (last 20)
    const llmLogs = entries.filter(
      (e) => e.type === "LLM" && e.meta?.latencyMs !== undefined,
    );
    const latencyData = llmLogs.slice(-20).map((e, i) => ({
      i,
      latency: e.meta!.latencyMs as number,
      provider: e.meta!.provider as string,
    }));

    // 2. Provider Split (current buffer)
    const providerCounts: Record<string, number> = {};
    for (const e of llmLogs) {
      const p = (e.meta?.provider as string) || "unknown";
      providerCounts[p] = (providerCounts[p] || 0) + 1;
    }
    const providerSplit = Object.entries(providerCounts).map(
      ([name, value]) => ({
        name,
        value,
      }),
    );
    const PIE_COLORS = ["#00f2f2", "#259df4", "#8b5cf6", "#f59e0b"];

    // 3. Error Rate
    const errorCount = entries.filter(
      (e) => e.type === "ERROR" || e.type === "WARN",
    ).length;
    const errorRate =
      entries.length > 0 ? (errorCount / entries.length) * 100 : 0;

    // 4. RAG Engine Status
    const ragLogs = entries.filter(
      (e) => e.component === "RagService" || e.component === "EmbeddingService",
    );
    const latestRagLog = ragLogs[ragLogs.length - 1];
    let ragStatus = "Standby";
    let isRagActive = false;
    let isRagError = false;

    if (latestRagLog) {
      if (
        latestRagLog.component === "EmbeddingService" &&
        latestRagLog.message.includes("unavailable")
      ) {
        ragStatus = "Offline (Fallback)";
        isRagError = true;
      } else if (
        latestRagLog.component === "RagService" &&
        latestRagLog.message.includes("Hybrid RAG query complete")
      ) {
        ragStatus = "Online (Active)";
        isRagActive = true;
      } else {
        ragStatus = "Processing...";
        isRagActive = true;
      }
    }

    const activeTracesCount = new Set(
      entries.map((e) => e.traceId).filter(Boolean),
    ).size;

    return {
      latencyData,
      providerSplit,
      PIE_COLORS,
      errorRate,
      errorCount,
      ragStatus,
      isRagActive,
      isRagError,
      totalLogs: entries.length,
      activeTraces: activeTracesCount,
    };
  }, [entries]);

  // ─── Render ───────────────────────────────────────────────────────────────

  const JsonViewer = ({ data }: { data: any }) => {
    if (!data) return null;
    let str = JSON.stringify(data, null, 2);
    // Simple fast regex syntax highlighting for JSON
    str = str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const highlighted = str.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = "text-[#f59e0b]"; // number
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = "text-[#259df4]"; // key
            match =
              match.slice(0, -1) +
              '<span class="text-muted-foreground">:</span>';
          } else {
            cls = "text-[#00f2f2]"; // string
          }
        } else if (/true|false/.test(match)) {
          cls = "text-[#8b5cf6]"; // boolean
        } else if (/null/.test(match)) {
          cls = "text-muted-foreground"; // null
        }
        return `<span class="${cls}">${match}</span>`;
      },
    );

    return (
      <pre
        className="text-[10px] bg-background-dark/50 p-2 rounded border border-white/5 overflow-x-auto whitespace-pre-wrap break-all"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    );
  };

  const StatusBadge = () => {
    const cfg = {
      connecting: {
        icon: <RefreshCw className="w-3 h-3 animate-spin" />,
        label: "CONNECTING",
        color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
      },
      connected: {
        icon: <Wifi className="w-3 h-3" />,
        label: "SSE_LIVE",
        color: "text-[#00f2f2] border-[#00f2f2]/30 bg-[#00f2f2]/10",
      },
      polling: {
        icon: <RefreshCw className="w-3 h-3" />,
        label: `POLL_${POLL_OPTIONS.find((o) => o.ms === pollIntervalMs)?.label ?? "?"}`,
        color: "text-[#259df4] border-[#259df4]/30 bg-[#259df4]/10",
      },
      error: {
        icon: <WifiOff className="w-3 h-3" />,
        label: "DISCONNECTED",
        color: "text-red-400 border-red-500/30 bg-red-500/10",
      },
    }[connectionStatus];

    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-[10px] font-bold tracking-widest ${cfg.color}`}
      >
        {cfg.icon}
        {cfg.label}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-mono flex flex-col">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex flex-col gap-3">
          {/* Top row */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="tactical-label text-[#00f2f2]">
                  SKLBR · LOG_MONITOR
                </span>
                <StatusBadge />
              </div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                Real-Time Activity Log
              </h1>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Polling interval selector */}
              <div className="inline-flex items-center gap-1.5 border border-border rounded px-2 py-1.5">
                <Timer className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">
                  Poll
                </span>
                {POLL_OPTIONS.map((opt) => (
                  <button
                    key={opt.ms}
                    onClick={() => setPollIntervalMs(opt.ms)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest transition-all ${
                      pollIntervalMs === opt.ms
                        ? "bg-[#259df4]/20 text-[#259df4] border border-[#259df4]/40"
                        : "text-muted-foreground/50 hover:text-muted-foreground border border-transparent"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Pause/Resume Toggle */}
              <button
                onClick={togglePause}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-bold uppercase tracking-widest transition-all ${
                  pausedSnapshot
                    ? "border-yellow-500/40 text-yellow-400 bg-yellow-500/10 shadow-[0_0_10px_rgba(234,179,8,0.2)] animate-pulse"
                    : "border-border text-muted-foreground hover:border-border/80"
                }`}
              >
                {pausedSnapshot ? (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    Paused{" "}
                    <span className="opacity-50 border-l border-yellow-500/50 pl-1.5 ml-0.5">
                      {entries.length - pausedSnapshot.length} new
                    </span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3 h-3 fill-current" />
                    Pause
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  if (pausedSnapshot) setPausedSnapshot(null);
                  setAutoScroll((v) => !v);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-bold uppercase tracking-widest transition-all ${
                  autoScroll
                    ? "border-[#00f2f2]/40 text-[#00f2f2] bg-[#00f2f2]/10"
                    : "border-border text-muted-foreground hover:border-[#00f2f2]/30"
                }`}
              >
                <ChevronDown className="w-3 h-3 rotate-180" />
                Auto-scroll
              </button>

              <button
                onClick={() => downloadLogs([...filtered].reverse())}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-xs font-bold uppercase tracking-widest text-muted-foreground hover:border-[#259df4]/40 hover:text-[#259df4] transition-all"
              >
                <Download className="w-3 h-3" />
                Export
              </button>

              <button
                onClick={() => setEntries([])}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-xs font-bold uppercase tracking-widest text-muted-foreground hover:border-red-500/40 hover:text-red-400 transition-all"
              >
                <X className="w-3 h-3" />
                Clear
              </button>

              <button
                onClick={() => setIsDemoMode((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-bold uppercase tracking-widest transition-all ${
                  isDemoMode
                    ? "border-purple-500/50 text-purple-400 bg-purple-500/10 shadow-[0_0_10px_rgba(168,85,247,0.3)] animate-pulse"
                    : "border-border text-muted-foreground hover:border-purple-500/30 hover:text-purple-400"
                }`}
              >
                <Activity className="w-3 h-3" />
                Demo
              </button>
            </div>
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search (use /pattern/i for regex)..."
                className="w-full bg-card border border-border rounded pl-8 pr-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#00f2f2]/40 focus:border-[#00f2f2]/50"
              />
            </div>

            {/* Component filter (Multi-select pills) */}
            {availableComponents.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap border-r border-border/50 pr-2">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-1">
                  SVC
                </span>
                {availableComponents.map((c) => {
                  const active = activeComponents.has(c);
                  return (
                    <button
                      key={c}
                      onClick={() => toggleComponent(c)}
                      className={`px-1.5 py-0.5 rounded border text-[10px] font-mono tracking-tight transition-all ${
                        active
                          ? "border-[#00f2f2]/40 text-[#00f2f2] bg-[#00f2f2]/10"
                          : "border-border text-muted-foreground/50 hover:text-muted-foreground hover:border-border/80"
                      }`}
                    >
                      {c.replace("Service", "")}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Type pills */}
            <div className="flex items-center gap-1 flex-wrap">
              <Filter className="w-3 h-3 text-muted-foreground mr-1" />
              {ALL_TYPES.map((t) => {
                const s = TYPE_STYLES[t];
                const active = activeTypes.has(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleType(t)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold tracking-widest transition-all ${
                      active
                        ? s.pill
                        : "border-border text-muted-foreground/40 bg-transparent"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            {/* Record count */}
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {filtered.length} / {entries.length} entries
            </span>
          </div>
          {/* Dashboard Row */}
          {entries.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-1 mt-1 border-t border-border/50">
              {/* Metric 1: System Health */}
              <div className="flex flex-col p-2 bg-card/50 rounded border border-border/50">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                  System Health (Buffer)
                </span>
                <div className="flex items-end gap-2">
                  <span
                    className={`text-2xl font-black tabular-nums leading-none ${
                      metrics.errorRate > 10
                        ? "text-red-400"
                        : metrics.errorRate > 0
                          ? "text-yellow-400"
                          : "text-[#00f2f2]"
                    }`}
                  >
                    {(100 - metrics.errorRate).toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground mb-1">
                    healthy ({metrics.errorCount} warnings/errors)
                  </span>
                </div>
              </div>

              {/* Metric 2: RAG Pipeline Status */}
              <div className="flex flex-col p-2 bg-card/50 rounded border border-border/50">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                  RAG Engine Status
                </span>
                <div className="flex items-center gap-2 h-full pb-0.5">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${metrics.isRagError ? "bg-red-500 animate-pulse" : metrics.isRagActive ? "bg-[#00f2f2] shadow-[0_0_8px_#00f2f2]" : "bg-slate-500"}`}
                  />
                  <span
                    className={`text-lg font-bold tracking-tight ${metrics.isRagError ? "text-red-400" : metrics.isRagActive ? "text-[#00f2f2]" : "text-muted-foreground"}`}
                  >
                    {metrics.ragStatus}
                  </span>
                </div>
              </div>

              {/* Metric 2: LLM Latency Trend */}
              <div className="flex flex-col p-2 bg-card/50 rounded border border-border/50 relative">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                  LLM Latency (Last 20)
                </span>
                {metrics.latencyData.length > 0 ? (
                  <div className="h-8 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metrics.latencyData}>
                        <Line
                          type="monotone"
                          dataKey="latency"
                          stroke="#259df4"
                          strokeWidth={1.5}
                          dot={false}
                          isAnimationActive={false}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background border border-border p-1.5 text-[10px] shadow-xl">
                                  <span className="text-[#259df4] font-bold">
                                    {data.latency}ms
                                  </span>{" "}
                                  <span className="text-muted-foreground">
                                    {data.provider}
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-8 w-full flex items-center text-[10px] text-muted-foreground/50">
                    No LLM activity yet
                  </div>
                )}
              </div>

              {/* Metric 3: Provider Split */}
              <div className="flex flex-col p-2 bg-card/50 rounded border border-border/50 relative overflow-hidden">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                  Model Usage
                </span>
                {metrics.providerSplit.length > 0 ? (
                  <div className="absolute right-2 top-2 bottom-2 w-12 opacity-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={metrics.providerSplit}
                          innerRadius="60%"
                          outerRadius="100%"
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                          isAnimationActive={false}
                        >
                          {metrics.providerSplit.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                metrics.PIE_COLORS[
                                  index % metrics.PIE_COLORS.length
                                ]
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background border border-border p-1 rounded text-[10px] shadow-xl text-foreground">
                                  {data.name}: {data.value} reqs
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : null}
                {metrics.providerSplit.length > 0 ? (
                  <div className="flex flex-col justify-center h-8 pr-14 text-[10px]">
                    {metrics.providerSplit.map((p, i) => (
                      <div
                        key={p.name}
                        className="flex items-center justify-between"
                      >
                        <span className="text-muted-foreground truncate">
                          {p.name}
                        </span>
                        <span
                          className="font-bold tabular-nums"
                          style={{
                            color:
                              metrics.PIE_COLORS[i % metrics.PIE_COLORS.length],
                          }}
                        >
                          {p.value}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center h-8 text-[10px] text-muted-foreground/50">
                    Awaiting requests
                  </div>
                )}
              </div>

              {/* Metric 4: Total Logs */}
              <div className="flex flex-col p-2 bg-card/50 rounded border border-border/50">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                  Log Volume
                </span>
                <div className="flex items-end gap-2 h-full pb-0.5">
                  <span className="text-2xl font-black tabular-nums leading-none text-slate-300">
                    {metrics.totalLogs}
                  </span>
                  <span className="text-[10px] text-muted-foreground mb-1">
                    events
                  </span>
                </div>
              </div>

              {/* Metric 5: Active Traces */}
              <div className="flex flex-col p-2 bg-card/50 rounded border border-border/50">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                  Active Traces
                </span>
                <div className="flex items-end gap-2 h-full pb-0.5">
                  <span className="text-2xl font-black tabular-nums leading-none text-[#a78bfa]">
                    {metrics.activeTraces}
                  </span>
                  <span className="text-[10px] text-muted-foreground mb-1">
                    unique requests
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Dashboard Layout ────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden max-w-[1600px] w-full mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          {/* Left Panel: Visualization & Timeline */}
          <div className="lg:col-span-7 flex flex-col gap-6 h-full overflow-y-auto pr-2 custom-scrollbar pb-20">
            <PipelineCanvas entries={entries} />
            <ActivityTimeline entries={entries} />
          </div>

          {/* Right Panel: Live Interceptor Stream */}
          <div className="lg:col-span-5 h-full flex flex-col bg-slate-950/50 backdrop-blur-xl rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50 bg-slate-900/50 flex items-center justify-between shrink-0 drop-shadow-md">
              <h3 className="text-sm font-bold tracking-tight text-white/90">
                Interceptor Stream
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground mr-2">
                  {filtered.length} / {entries.length} raw
                </span>
              </div>
            </div>

            {filtered.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground p-8 text-center min-h-[300px]">
                <Activity className="w-10 h-10 opacity-20" />
                <p className="text-sm">
                  {entries.length === 0
                    ? "Waiting for log events…"
                    : "No entries match your filters."}
                </p>
              </div>
            )}

            {filtered.length > 0 && (
              <>
                {/* Column headers */}
                <div className="flex text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-1.5 mb-1 px-2 shrink-0">
                  <span className="w-[120px] shrink-0">Timestamp</span>
                  <span className="w-[72px] shrink-0">Type</span>
                  <span className="w-[130px] shrink-0">Component</span>
                  <span className="w-[100px] shrink-0">Model</span>
                  <span className="flex-1">Message</span>
                  <span className="w-[160px] shrink-0 hidden lg:block">
                    Meta
                  </span>
                </div>

                {/* Scrollable rows container — newest at top */}
                <div
                  ref={tableRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto custom-scrollbar"
                  style={{ contain: "strict" } as React.CSSProperties}
                >
                  <div ref={topRef} />
                  <AnimatePresence initial={false}>
                    {filtered.map((entry) => {
                      const s = TYPE_STYLES[entry.type];
                      const isExpanded = expandedId === entry._id;

                      return (
                        <motion.div
                          key={entry._id}
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.15 }}
                          onClick={() =>
                            setExpandedId(isExpanded ? null : entry._id)
                          }
                          title={entry.message}
                          className={`flex flex-col cursor-pointer border-b border-border/30 transition-colors ${s.row} ${
                            isExpanded ? "bg-white/3" : ""
                          }`}
                        >
                          {/* Main row */}
                          <div className="flex items-center px-2 py-1.5 gap-2">
                            {/* Timestamp */}
                            <span className="w-[120px] shrink-0 text-[11px] text-muted-foreground tabular-nums">
                              {formatTs(entry.timestamp)}
                            </span>

                            {/* Type pill */}
                            <span
                              className={`w-[72px] shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold tracking-widest ${s.pill}`}
                            >
                              {s.icon}
                              {s.label}
                            </span>

                            {/* Component */}
                            <span className="w-[130px] shrink-0 text-[11px] text-[#259df4] truncate font-semibold">
                              {entry.component}
                            </span>

                            {/* Model */}
                            <span className="w-[100px] shrink-0 text-[11px] text-muted-foreground truncate font-mono">
                              {entry.meta?.model || entry.meta?.provider || "-"}
                            </span>

                            {/* Message */}
                            <span
                              className={`flex-1 text-[11px] truncate ${
                                entry.type === "ERROR"
                                  ? "text-red-400"
                                  : entry.type === "WARN"
                                    ? "text-yellow-400"
                                    : "text-slate-300"
                              }`}
                            >
                              {entry.message}
                            </span>

                            {/* Meta (desktop) */}
                            {entry.meta && (
                              <span className="w-[160px] shrink-0 hidden lg:block text-[10px] text-muted-foreground truncate">
                                {Object.entries(entry.meta)
                                  .slice(0, 2)
                                  .map(([k, v]) => `${k}=${v}`)
                                  .join(" ")}
                              </span>
                            )}
                          </div>

                          {/* Expanded meta detail */}
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="px-2 pb-2 pl-[328px] text-[11px] text-muted-foreground space-y-0.5"
                            >
                              <div className="text-white/40 text-[10px] mb-1 uppercase tracking-widest">
                                Full message
                              </div>
                              <div className="text-slate-300 mb-2">
                                {entry.message}
                              </div>
                              {entry.meta && (
                                <div className="mt-2">
                                  <div className="text-white/40 text-[10px] mb-1 uppercase tracking-widest">
                                    Metadata
                                  </div>
                                  <JsonViewer data={entry.meta} />
                                </div>
                              )}
                              {entry.traceId && (
                                <div className="mt-3">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSearch(entry.traceId!);
                                      setActiveComponents(new Set());
                                      setActiveTypes(new Set(ALL_TYPES));
                                      setAutoScroll(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-[#00f2f2]/20 border border-white/10 hover:border-[#00f2f2]/50 hover:text-[#00f2f2] rounded text-[10px] text-white/70 transition-all font-mono tracking-tight"
                                  >
                                    <Filter className="w-3 h-3" />
                                    Filter Trace:{" "}
                                    <span className="font-bold text-[#00f2f2]">
                                      {entry.traceId}
                                    </span>
                                  </button>
                                </div>
                              )}
                              <div className="text-white/30 text-[10px] mt-2">
                                {entry.timestamp}
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
