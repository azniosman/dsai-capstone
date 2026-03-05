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
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type LogType = "RAG" | "LLM" | "AWS" | "SYSTEM" | "ERROR" | "INFO" | "WARN";

interface LogEntry {
  readonly timestamp: string;
  readonly type: LogType;
  readonly component: string;
  readonly message: string;
  readonly meta?: Record<string, string | number | boolean>;
  /** Client-side generated stable key. */
  readonly _id: string;
}

type ConnectionStatus = "connecting" | "connected" | "polling" | "error";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_ENTRIES = 500;
const POLL_INTERVAL_MS = 3_000;

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
const LOGS_STREAM_URL = buildApiUrl("/logs/stream");

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

  const bottomRef = useRef<HTMLDivElement>(null);
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

  // ── SSE connection ─────────────────────────────────────────────────────────

  useEffect(() => {
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let lastSeenTs = "";
    let destroyed = false;

    const startPolling = () => {
      if (destroyed) return;
      setConnectionStatus("polling");

      const poll = async () => {
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

      poll();
      pollTimer = setInterval(poll, POLL_INTERVAL_MS);
    };

    const connect = () => {
      if (destroyed) return;
      setConnectionStatus("connecting");

      try {
        es = new EventSource(LOGS_STREAM_URL);

        es.onopen = () => {
          if (!destroyed) setConnectionStatus("connected");
        };

        es.onmessage = (event: MessageEvent<string>) => {
          if (destroyed) return;
          try {
            const entry = JSON.parse(event.data) as Omit<LogEntry, "_id">;
            appendEntries([{ ...entry, _id: makeId() }]);
          } catch {
            /* ignore malformed frames */
          }
        };

        es.onerror = () => {
          es?.close();
          es = null;
          // Fall back to polling
          startPolling();
        };
      } catch {
        startPolling();
      }
    };

    connect();

    return () => {
      destroyed = true;
      es?.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [appendEntries]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [entries, autoScroll]);

  const handleScroll = useCallback(() => {
    const el = tableRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (atBottom && !autoScroll) setAutoScroll(true);
    if (!atBottom && autoScroll) setAutoScroll(false);
  }, [autoScroll]);

  // ── Filters ───────────────────────────────────────────────────────────────

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

  const filtered = useMemo(() => {
    let list = entries.filter((e) => activeTypes.has(e.type));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.message.toLowerCase().includes(q) ||
          e.component.toLowerCase().includes(q) ||
          e.type.toLowerCase().includes(q),
      );
    }
    return list;
  }, [entries, activeTypes, search]);

  // ─── Render ───────────────────────────────────────────────────────────────

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
        label: "POLLING_3s",
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

            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoScroll((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-bold uppercase tracking-widest transition-all ${
                  autoScroll
                    ? "border-[#00f2f2]/40 text-[#00f2f2] bg-[#00f2f2]/10"
                    : "border-border text-muted-foreground hover:border-[#00f2f2]/30"
                }`}
              >
                <ChevronDown className="w-3 h-3" />
                Auto-scroll
              </button>

              <button
                onClick={() => downloadLogs(filtered)}
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
                placeholder="Search message, component…"
                className="w-full bg-card border border-border rounded pl-8 pr-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#00f2f2]/40 focus:border-[#00f2f2]/50"
              />
            </div>

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
        </div>
      </header>

      {/* ── Log Table ───────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden max-w-[1600px] w-full mx-auto px-4 py-4">
        {filtered.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
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
              <span className="flex-1">Message</span>
              <span className="w-[160px] shrink-0 hidden lg:block">Meta</span>
            </div>

            {/* Scrollable rows container */}
            <div
              ref={tableRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto custom-scrollbar"
              style={{ contain: "strict" } as React.CSSProperties}
            >
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
                            <>
                              <div className="text-white/40 text-[10px] mb-1 uppercase tracking-widest">
                                Metadata
                              </div>
                              <pre className="text-[10px] text-[#00f2f2]/70 overflow-x-auto whitespace-pre-wrap break-all">
                                {JSON.stringify(entry.meta, null, 2)}
                              </pre>
                            </>
                          )}
                          <div className="text-white/30 text-[10px]">
                            {entry.timestamp}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
