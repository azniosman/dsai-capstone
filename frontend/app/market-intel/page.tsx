"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Radio,
  Brain,
  TrendingUp,
  Zap,
  Shield,
  Target,
  BarChart3,
  Globe,
  Cpu,
  MessageSquare,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ChevronRight,
  RefreshCw,
  Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ─── Types ─── */
interface LogEntry {
  id: number;
  timestamp: string;
  source: string;
  message: string;
  status: "success" | "warning" | "info" | "sync";
}

interface Sector {
  name: string;
  growth: number;
  demand: "High" | "Medium" | "Low";
  roles: number;
  trend: "up" | "down" | "stable";
  topSkills: string[];
}

/* ─── Mock Data ─── */
const SYNC_LOG_ENTRIES: LogEntry[] = [
  {
    id: 1,
    timestamp: "13:34:02",
    source: "SSG_API",
    message: "SkillsFuture course catalog synced — 2,847 entries refreshed",
    status: "success",
  },
  {
    id: 2,
    timestamp: "13:33:58",
    source: "JOB_CRAWLER",
    message: "MyCareersFuture scrape complete — 14,203 active listings indexed",
    status: "success",
  },
  {
    id: 3,
    timestamp: "13:33:45",
    source: "MARKET_ENGINE",
    message: "Sector demand vectors recalculated for Q1 2026",
    status: "sync",
  },
  {
    id: 4,
    timestamp: "13:33:30",
    source: "AI_MATCHER",
    message: "Neural embedding model v4.2 loaded — inference ready",
    status: "info",
  },
  {
    id: 5,
    timestamp: "13:33:12",
    source: "SALARY_DB",
    message: "Compensation benchmarks updated from MOM labor statistics",
    status: "success",
  },
  {
    id: 6,
    timestamp: "13:32:55",
    source: "CERT_VERIFIER",
    message: "WSQ certification database refresh — 892 new entries",
    status: "sync",
  },
  {
    id: 7,
    timestamp: "13:32:40",
    source: "TREND_ANALYZER",
    message:
      "⚠ Anomaly detected: 34% spike in AI/ML role postings vs last month",
    status: "warning",
  },
  {
    id: 8,
    timestamp: "13:32:22",
    source: "PROFILE_ENGINE",
    message: "User vector space reindexed — 45,201 profiles processed",
    status: "success",
  },
  {
    id: 9,
    timestamp: "13:32:05",
    source: "SUBSIDY_CALC",
    message: "SCTP/MCES subsidy matrices recalculated for new fiscal year",
    status: "info",
  },
  {
    id: 10,
    timestamp: "13:31:48",
    source: "GEO_MAPPER",
    message: "Regional demand heatmap generated for 14 districts",
    status: "sync",
  },
];

const SECTORS: Sector[] = [
  {
    name: "Artificial Intelligence",
    growth: 34,
    demand: "High",
    roles: 2847,
    trend: "up",
    topSkills: ["PyTorch", "LLMs", "MLOps", "Computer Vision"],
  },
  {
    name: "Cybersecurity",
    growth: 28,
    demand: "High",
    roles: 1923,
    trend: "up",
    topSkills: ["SIEM", "Zero Trust", "Pen Testing", "Cloud Security"],
  },
  {
    name: "Cloud Infrastructure",
    growth: 22,
    demand: "High",
    roles: 3102,
    trend: "up",
    topSkills: ["AWS", "Kubernetes", "Terraform", "DevOps"],
  },
  {
    name: "Fintech",
    growth: 18,
    demand: "Medium",
    roles: 1456,
    trend: "stable",
    topSkills: ["Blockchain", "Smart Contracts", "RegTech", "APIs"],
  },
  {
    name: "Data Engineering",
    growth: 26,
    demand: "High",
    roles: 2234,
    trend: "up",
    topSkills: ["Spark", "Airflow", "dbt", "Snowflake"],
  },
  {
    name: "Product Management",
    growth: 12,
    demand: "Medium",
    roles: 987,
    trend: "stable",
    topSkills: ["Agile", "Analytics", "Roadmapping", "A/B Testing"],
  },
];

const INTERVIEW_TOPICS = [
  {
    label: "System Design",
    icon: Cpu,
    difficulty: "Senior",
    duration: "45 min",
  },
  {
    label: "Data Structures & Algorithms",
    icon: BarChart3,
    difficulty: "Mid-Senior",
    duration: "30 min",
  },
  {
    label: "Behavioral & Leadership",
    icon: MessageSquare,
    difficulty: "All Levels",
    duration: "25 min",
  },
  {
    label: "Domain-Specific Technical",
    icon: Brain,
    difficulty: "Senior",
    duration: "40 min",
  },
];

/* ─── Status Icon Helper ─── */
const StatusIcon = ({ status }: { status: LogEntry["status"] }) => {
  const config = {
    success: { icon: CheckCircle2, color: "text-emerald-400" },
    warning: { icon: AlertCircle, color: "text-amber-400" },
    info: { icon: Activity, color: "text-primary" },
    sync: { icon: RefreshCw, color: "text-violet-400" },
  };
  const { icon: Icon, color } = config[status];
  return <Icon className={cn("w-4 h-4 shrink-0", color)} />;
};

/* ─── Main Component ─── */
export default function MarketIntelPage() {
  const [activeTab, setActiveTab] = useState<"sync" | "screening" | "sectors">(
    "sync",
  );
  const [logEntries, setLogEntries] = useState<LogEntry[]>(
    SYNC_LOG_ENTRIES.slice(0, 5),
  );
  const [isStreaming, setIsStreaming] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isStreaming) return;
    const remaining = SYNC_LOG_ENTRIES.slice(logEntries.length);
    if (remaining.length === 0) return;

    const timer = setTimeout(() => {
      setLogEntries((prev) => [...prev, remaining[0]]);
    }, 1200);

    return () => clearTimeout(timer);
  }, [logEntries, isStreaming]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logEntries]);

  const tabs: {
    key: typeof activeTab;
    label: string;
    icon: React.ElementType;
  }[] = [
    { key: "sync", label: "Live Sync Log", icon: Radio },
    { key: "screening", label: "AI Screening", icon: Brain },
    { key: "sectors", label: "Sector Intel", icon: Globe },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background font-mono">
      {/* Header */}
      <header className="border-b border-primary/20 bg-card/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border border-primary bg-primary/10 flex items-center justify-center text-primary glow-primary-sm">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight uppercase text-foreground">
                  Market Intelligence
                </h1>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Real-time data pipeline active
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-primary/30 text-primary font-mono text-[10px] uppercase tracking-widest"
              >
                SG-NODE-01
              </Badge>
              <Badge
                variant="outline"
                className="border-emerald-400/30 text-emerald-400 font-mono text-[10px] uppercase tracking-widest"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                Online
              </Badge>
            </div>
          </div>

          {/* Tabs */}
          <div
            className="flex gap-1 mt-4"
            role="tablist"
            aria-label="Intelligence sections"
          >
            {tabs.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
                  activeTab === tab.key
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-card",
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <AnimatePresence mode="wait">
          {/* ─── TAB 1: Live System Synchronization Log ─── */}
          {activeTab === "sync" && (
            <motion.div
              key="sync"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio
                    className={cn(
                      "w-4 h-4",
                      isStreaming
                        ? "text-emerald-400 animate-pulse"
                        : "text-muted-foreground",
                    )}
                  />
                  <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                    {isStreaming ? "Streaming" : "Paused"} — {logEntries.length}
                    /{SYNC_LOG_ENTRIES.length} events
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsStreaming(!isStreaming)}
                  className="text-[10px] uppercase tracking-widest font-bold border-primary/30 text-primary hover:bg-primary/10 rounded-lg h-8"
                >
                  {isStreaming ? "Pause" : "Resume"}
                </Button>
              </div>

              <div
                ref={logRef}
                className="border border-border rounded-lg bg-card/50 overflow-y-auto max-h-[65vh] custom-scrollbar"
              >
                <div className="divide-y divide-border">
                  {logEntries.map((entry, idx) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: idx < 5 ? idx * 0.05 : 0,
                        duration: 0.3,
                      }}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-primary/5 transition-colors group"
                    >
                      <StatusIcon status={entry.status} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                            {entry.source}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {entry.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-foreground/80 leading-relaxed">
                          {entry.message}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: "APIs Synced",
                    value: "8/8",
                    icon: Zap,
                    color: "text-emerald-400",
                  },
                  {
                    label: "Jobs Indexed",
                    value: "14,203",
                    icon: Target,
                    color: "text-primary",
                  },
                  {
                    label: "Profiles",
                    value: "45,201",
                    icon: Shield,
                    color: "text-violet-400",
                  },
                  {
                    label: "Latency",
                    value: "42ms",
                    icon: Clock,
                    color: "text-amber-400",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="border border-border rounded-lg bg-card/50 p-4 flex items-center gap-3"
                  >
                    <stat.icon className={cn("w-5 h-5 shrink-0", stat.color)} />
                    <div>
                      <p className="text-lg font-bold text-foreground data-num">
                        {stat.value}
                      </p>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                        {stat.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ─── TAB 2: AI Technical Screening & Mock Interview ─── */}
          {activeTab === "screening" && (
            <motion.div
              key="screening"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* AI Screening Intro */}
              <div className="border border-primary/20 rounded-lg bg-card/50 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[60px] pointer-events-none" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 border border-primary bg-primary/10 flex items-center justify-center text-primary rounded-lg">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold uppercase tracking-tight text-foreground">
                      AI-Powered Technical Assessment
                    </h2>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Adaptive difficulty • Real-time feedback •
                      Industry-calibrated
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                  Our assessment engine evaluates technical competencies through
                  structured scenarios, system design challenges, and behavioral
                  analysis. Results are benchmarked against 10,000+ Singapore
                  tech professionals.
                </p>
              </div>

              {/* Interview Topics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {INTERVIEW_TOPICS.map((topic) => (
                  <div
                    key={topic.label}
                    className="border border-border rounded-lg bg-card/50 p-5 hover:border-primary/40 hover:bg-primary/5 transition-all group cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 border border-primary/20 bg-primary/5 flex items-center justify-center text-primary rounded-lg group-hover:bg-primary group-hover:text-background transition-all">
                        <topic.icon className="w-5 h-5" />
                      </div>
                      <Badge
                        variant="outline"
                        className="border-primary/30 text-primary text-[10px] uppercase tracking-widest"
                      >
                        {topic.difficulty}
                      </Badge>
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-tight text-foreground mb-1">
                      {topic.label}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {topic.duration}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[10px] uppercase tracking-widest text-primary hover:bg-primary/10 font-bold h-7 px-3 rounded-lg"
                      >
                        <Play className="w-3 h-3 mr-1" /> Start
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mock Interview Panel */}
              <div className="border border-accent/20 rounded-lg bg-card/50 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Mic className="w-5 h-5 text-accent" />
                  <h3 className="text-sm font-bold uppercase tracking-tight text-foreground">
                    Live Mock Interview
                  </h3>
                  <Badge
                    variant="outline"
                    className="border-accent/30 text-accent text-[10px] uppercase tracking-widest ml-auto"
                  >
                    Beta
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  AI-powered voice interview simulation with real-time feedback
                  on communication, technical accuracy, and problem-solving
                  approach.
                </p>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-bold uppercase tracking-widest rounded-lg h-10">
                  <Mic className="w-4 h-4 mr-2" />
                  Begin Mock Interview
                </Button>
              </div>
            </motion.div>
          )}

          {/* ─── TAB 3: Sector Intelligence Deep-Dive ─── */}
          {activeTab === "sectors" && (
            <motion.div
              key="sectors"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold uppercase tracking-tight text-foreground">
                    Singapore Tech Sector Analysis
                  </h2>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                    Q1 2026 Data • Updated hourly from MOM, SSG, MyCareersFuture
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[10px] uppercase tracking-widest font-bold border-primary/30 text-primary hover:bg-primary/10 rounded-lg h-8"
                >
                  <RefreshCw className="w-3 h-3 mr-1.5" /> Refresh
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {SECTORS.map((sector) => (
                  <div
                    key={sector.name}
                    className="border border-border rounded-lg bg-card/50 p-5 hover:border-primary/40 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold uppercase tracking-tight text-foreground group-hover:text-primary transition-colors">
                        {sector.name}
                      </h3>
                      <ArrowUpRight
                        className={cn(
                          "w-4 h-4",
                          sector.trend === "up"
                            ? "text-emerald-400"
                            : "text-muted-foreground",
                        )}
                      />
                    </div>

                    {/* Growth Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-[10px] uppercase tracking-widest mb-1">
                        <span className="text-muted-foreground font-bold">
                          Growth
                        </span>
                        <span
                          className={cn(
                            "font-bold",
                            sector.growth >= 25
                              ? "text-emerald-400"
                              : sector.growth >= 15
                                ? "text-primary"
                                : "text-muted-foreground",
                          )}
                        >
                          +{sector.growth}%
                        </span>
                      </div>
                      <div className="score-bar-track">
                        <div
                          className="score-bar-fill bg-primary"
                          style={{
                            width: `${Math.min(sector.growth * 2.5, 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div className="flex gap-3 mb-4">
                      <div className="flex-1 bg-background/50 border border-border rounded-lg px-3 py-2 text-center">
                        <p className="text-base font-bold text-foreground data-num">
                          {sector.roles.toLocaleString()}
                        </p>
                        <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
                          Roles
                        </p>
                      </div>
                      <div className="flex-1 bg-background/50 border border-border rounded-lg px-3 py-2 text-center">
                        <p
                          className={cn(
                            "text-base font-bold",
                            sector.demand === "High"
                              ? "text-emerald-400"
                              : "text-primary",
                          )}
                        >
                          {sector.demand}
                        </p>
                        <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
                          Demand
                        </p>
                      </div>
                    </div>

                    {/* Top Skills */}
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
                        Top Skills
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {sector.topSkills.map((skill) => (
                          <span
                            key={skill}
                            className="text-[10px] px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary font-bold uppercase tracking-wider rounded"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action */}
                    <button className="w-full mt-4 flex items-center justify-center gap-1 text-[10px] uppercase tracking-widest font-bold text-primary hover:bg-primary/10 py-2 border border-primary/20 rounded-lg transition-colors">
                      Deep Dive <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
