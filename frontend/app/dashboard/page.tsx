"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    User, Briefcase, BarChart3, MessageSquare, HelpCircle, GraduationCap,
    PenTool, Wrench, TrendingUp, Loader2, MapPin, Clock, Zap,
    ChevronRight, Sparkles, Target, BookOpen, Activity,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { toast } from "sonner";
import api from "@/lib/api-client";
import { extractApiError } from "@/lib/utils";

/* ───────── Types ───────── */
interface DashboardSummary {
    profile_id: number;
    name: string;
    education: string | null;
    years_experience: number;
    skills: string[];
    is_career_switcher: boolean;
    skills_count: number;
    recommendations_count: number;
    gaps_identified: number;
    progress_entries: number;
    career_readiness: number;
}

interface Recommendation {
    role_id: number;
    title: string;
    category: string;
    match_score: number;
    matched_skills: string[];
    missing_skills: string[];
    skill_match_quality: string;
}

interface GapItem {
    skill: string;
    user_level: number;
    required_level: string;
    gap_severity: string;
}

interface RoleGap {
    role_title: string;
    match_score: number;
    gaps: GapItem[];
}

interface MarketInsight {
    role_category: string;
    avg_salary_sgd: number;
    yoy_growth_pct: number;
}

interface Course {
    id: number;
    title: string;
    provider: string;
    course_fee: number;
    subsidy_amount: number;
    nett_payable: number;
    skill_category: string;
    level: string;
}

interface ProjectSuggestion {
    skill: string;
    title: string;
    description: string;
    difficulty: string;
    estimated_hours: number;
    technologies: string[];
}

interface ProgressEntry {
    skill: string;
    level: number;
    recorded_at: string;
}

interface ProgressData {
    skills_acquired: number;
    skills_in_progress: number;
    skills_total: number;
    entries: ProgressEntry[];
}

interface TimelinePoint {
    date: string;
    skill: string;
    level: number;
}

/* ───────── Quick-action Cards ───────── */
const QUICK_ACTIONS = [
    { label: "Job Recommendations", desc: "AI-matched roles for your profile", icon: Briefcase, href: "/recommendations", color: "from-violet-500 to-purple-600" },
    { label: "Skill Gap Analysis", desc: "Identify missing skills for target roles", icon: BarChart3, href: "/skill-gap", color: "from-blue-500 to-cyan-600" },
    { label: "AI Career Coach", desc: "Chat with your career advisor", icon: MessageSquare, href: "/chat", color: "from-emerald-500 to-teal-600" },
    { label: "Mock Interview", desc: "Practice with AI interviewer", icon: HelpCircle, href: "/interview", color: "from-orange-500 to-amber-600" },
    { label: "Resume Rewriter", desc: "Optimize your resume bullet points", icon: PenTool, href: "/resume-rewriter", color: "from-pink-500 to-rose-600" },
    { label: "SCTP Courses", desc: "SkillsFuture-eligible upskilling", icon: GraduationCap, href: "/courses", color: "from-indigo-500 to-blue-600" },
];

/* ───────── Main Component ───────── */
export default function Dashboard() {
    const router = useRouter();
    const [tab, setTab] = useState("overview");
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Career Insights state
    const [recs, setRecs] = useState<Recommendation[]>([]);
    const [gaps, setGaps] = useState<RoleGap[]>([]);
    const [market, setMarket] = useState<MarketInsight[]>([]);
    const [insightsLoading, setInsightsLoading] = useState(false);
    const [insightsLoaded, setInsightsLoaded] = useState(false);

    // Learning state
    const [courses, setCourses] = useState<Course[]>([]);
    const [projectSuggestions, setProjectSuggestions] = useState<ProjectSuggestion[]>([]);
    const [learningLoading, setLearningLoading] = useState(false);
    const [learningLoaded, setLearningLoaded] = useState(false);

    // Activity state
    const [progressData, setProgressData] = useState<ProgressData | null>(null);
    const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
    const [activityLoading, setActivityLoading] = useState(false);
    const [activityLoaded, setActivityLoaded] = useState(false);

    // Settings state
    const [editForm, setEditForm] = useState({ name: "", education: "", years_experience: 0, is_career_switcher: false });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }
        api.get("/api/dashboard/summary")
            .then((res) => {
                setSummary(res.data);
                setEditForm({
                    name: res.data.name,
                    education: res.data.education || "",
                    years_experience: res.data.years_experience,
                    is_career_switcher: res.data.is_career_switcher,
                });
            })
            .catch((err) => {
                if (err.response?.status === 404) {
                    router.push("/");  // No profile — go to landing
                } else {
                    setError(extractApiError(err, "Failed to load dashboard"));
                }
            })
            .finally(() => setLoading(false));
    }, [router]);

    // Lazy-load tab data
    useEffect(() => {
        if (!summary) return;
        if (tab === "insights" && !insightsLoaded) {
            setInsightsLoading(true);
            Promise.allSettled([
                api.post("/api/recommend", { profile_id: summary.profile_id }),
                api.get(`/api/skill-gap/${summary.profile_id}`),
                api.get("/api/market-insights"),
            ]).then(([recsRes, gapsRes, marketRes]) => {
                if (recsRes.status === "fulfilled") setRecs(recsRes.value.data.recommendations?.slice(0, 5) || []);
                if (gapsRes.status === "fulfilled") setGaps(gapsRes.value.data.gaps?.slice(0, 3) || []);
                if (marketRes.status === "fulfilled") setMarket(marketRes.value.data.insights?.slice(0, 6) || []);
                setInsightsLoaded(true);
            }).finally(() => setInsightsLoading(false));
        }
        if (tab === "learning" && !learningLoaded) {
            setLearningLoading(true);
            Promise.allSettled([
                api.get("/api/courses"),
                api.get(`/api/project-suggestions/${summary.profile_id}`),
            ]).then(([coursesRes, projRes]) => {
                if (coursesRes.status === "fulfilled") setCourses(coursesRes.value.data.courses?.slice(0, 8) || []);
                if (projRes.status === "fulfilled") setProjectSuggestions(projRes.value.data.suggestions?.slice(0, 6) || []);
                setLearningLoaded(true);
            }).finally(() => setLearningLoading(false));
        }
        if (tab === "activity" && !activityLoaded) {
            setActivityLoading(true);
            Promise.allSettled([
                api.get(`/api/progress/${summary.profile_id}`),
                api.get(`/api/progress/${summary.profile_id}/timeline`),
            ]).then(([progRes, timeRes]) => {
                if (progRes.status === "fulfilled") setProgressData(progRes.value.data);
                if (timeRes.status === "fulfilled") setTimeline(timeRes.value.data.timeline || []);
                setActivityLoaded(true);
            }).finally(() => setActivityLoading(false));
        }
    }, [tab, summary, insightsLoaded, learningLoaded, activityLoaded]);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!summary) return;
        setSaving(true);
        try {
            await api.patch(`/api/profile/${summary.profile_id}`, editForm);
            toast.success("Profile updated!");
            // Refresh summary
            const res = await api.get("/api/dashboard/summary");
            setSummary(res.data);
        } catch (err: unknown) {
            toast.error(extractApiError(err, "Failed to update profile"));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-4" />
                    <p className="text-muted-foreground">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-xl mx-auto mt-12">
                <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
            </div>
        );
    }

    if (!summary) return null;

    const readinessColor = summary.career_readiness >= 70 ? "text-emerald-500" : summary.career_readiness >= 40 ? "text-amber-500" : "text-red-500";

    return (
        <div className="max-w-6xl mx-auto">
            {/* ─── Profile Header Card ─── */}
            <div className="relative mb-8 rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-indigo-600 opacity-90" />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48Y2lyY2xlIGN4PSIxMCIgY3k9IjEwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZykiLz48L3N2Zz4=')] opacity-30" />
                <div className="relative z-10 p-8 md:p-10">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                        <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                            {summary.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <div className="flex-1 text-white">
                            <h1 className="text-3xl font-bold mb-1">{summary.name}</h1>
                            <div className="flex flex-wrap gap-3 text-white/80 text-sm">
                                {summary.education && (
                                    <span className="flex items-center gap-1"><GraduationCap className="h-4 w-4" />{summary.education}</span>
                                )}
                                <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{summary.years_experience} years experience</span>
                                {summary.is_career_switcher && (
                                    <Badge className="bg-white/20 text-white hover:bg-white/30 border-0">Career Switcher</Badge>
                                )}
                            </div>
                        </div>
                        <div className="text-center md:text-right">
                            <div className={`text-4xl font-bold ${readinessColor}`} style={{ textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                                {Math.round(summary.career_readiness)}%
                            </div>
                            <p className="text-white/70 text-sm">Career Readiness</p>
                        </div>
                    </div>

                    {/* Skill chips */}
                    <div className="mt-6 flex flex-wrap gap-2">
                        {summary.skills.slice(0, 15).map((skill) => (
                            <Badge key={skill} className="bg-white/15 text-white hover:bg-white/25 border-white/20 backdrop-blur-sm px-3 py-1">
                                {skill}
                            </Badge>
                        ))}
                        {summary.skills.length > 15 && (
                            <Badge variant="outline" className="text-white/60 border-white/20">+{summary.skills.length - 15} more</Badge>
                        )}
                    </div>

                    {/* Quick stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        {[
                            { label: "Skills", value: summary.skills_count, icon: Zap },
                            { label: "Job Matches", value: summary.recommendations_count, icon: Target },
                            { label: "Skill Gaps", value: summary.gaps_identified, icon: BarChart3 },
                            { label: "Progress Logs", value: summary.progress_entries, icon: Activity },
                        ].map((stat) => (
                            <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                                <stat.icon className="h-5 w-5 text-white/70 mx-auto mb-1" />
                                <p className="text-2xl font-bold text-white">{stat.value}</p>
                                <p className="text-xs text-white/60">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── Tab Navigation ─── */}
            <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="w-full justify-start mb-6 bg-muted/50 p-1 rounded-xl h-auto flex-wrap">
                    <TabsTrigger value="overview" className="rounded-lg px-4 py-2.5 data-[state=active]:shadow-sm">
                        <Sparkles className="h-4 w-4 mr-2" />Overview
                    </TabsTrigger>
                    <TabsTrigger value="insights" className="rounded-lg px-4 py-2.5 data-[state=active]:shadow-sm">
                        <TrendingUp className="h-4 w-4 mr-2" />Career Insights
                    </TabsTrigger>
                    <TabsTrigger value="learning" className="rounded-lg px-4 py-2.5 data-[state=active]:shadow-sm">
                        <BookOpen className="h-4 w-4 mr-2" />Learning
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="rounded-lg px-4 py-2.5 data-[state=active]:shadow-sm">
                        <Activity className="h-4 w-4 mr-2" />Activity
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="rounded-lg px-4 py-2.5 data-[state=active]:shadow-sm">
                        <User className="h-4 w-4 mr-2" />Settings
                    </TabsTrigger>
                </TabsList>

                {/* ═══════ OVERVIEW TAB ═══════ */}
                <TabsContent value="overview">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {QUICK_ACTIONS.map((action) => {
                            const Icon = action.icon;
                            return (
                                <Link key={action.href} href={action.href}>
                                    <Card className="group h-full cursor-pointer border hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
                                        <CardContent className="p-6">
                                            <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                                                <Icon className="h-6 w-6 text-white" />
                                            </div>
                                            <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">{action.label}</h3>
                                            <p className="text-sm text-muted-foreground">{action.desc}</p>
                                            <div className="mt-3 flex items-center text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                                Go to {action.label} <ChevronRight className="h-4 w-4 ml-1" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Extra quick links */}
                    <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: "Market Insights", href: "/market", icon: TrendingUp },
                            { label: "Compare Roles", href: "/compare", icon: BarChart3 },
                            { label: "Portfolio Projects", href: "/projects", icon: Wrench },
                            { label: "Progress Tracking", href: "/progress", icon: Activity },
                        ].map((link) => {
                            const Icon = link.icon;
                            return (
                                <Link key={link.href} href={link.href}>
                                    <Card className="group cursor-pointer hover:border-primary/30 transition-all hover:shadow-sm">
                                        <CardContent className="p-4 flex items-center gap-3">
                                            <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                            <span className="text-sm font-medium group-hover:text-primary transition-colors">{link.label}</span>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                </TabsContent>

                {/* ═══════ CAREER INSIGHTS TAB ═══════ */}
                <TabsContent value="insights">
                    {insightsLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : (
                        <div className="space-y-6">
                            {/* Top Recommendations */}
                            <div>
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <Briefcase className="h-5 w-5 text-primary" />Top Job Matches
                                </h2>
                                {recs.length === 0 ? (
                                    <Card className="p-6"><CardContent className="p-0 text-center text-muted-foreground">No recommendations available yet. Complete your profile with more skills to get matches.</CardContent></Card>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {recs.slice(0, 3).map((rec) => (
                                            <Card key={rec.role_id} className="p-5 hover:shadow-md transition-shadow">
                                                <CardContent className="p-0">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <h3 className="font-semibold">{rec.title}</h3>
                                                        <Badge variant="outline" className="text-xs">{Math.round(rec.match_score * 100)}%</Badge>
                                                    </div>
                                                    <Badge variant="secondary" className="mb-3 text-xs">{rec.category}</Badge>
                                                    <div className="w-full bg-muted rounded-full h-2 mb-3">
                                                        <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${rec.match_score * 100}%` }} />
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {rec.matched_skills.slice(0, 4).map((s) => (
                                                            <Badge key={s} className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-xs">{s}</Badge>
                                                        ))}
                                                        {rec.missing_skills.slice(0, 2).map((s) => (
                                                            <Badge key={s} className="bg-red-100 text-red-800 hover:bg-red-100 text-xs">{s}</Badge>
                                                        ))}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                                {recs.length > 0 && (
                                    <div className="mt-3 text-center">
                                        <Button variant="outline" size="sm" asChild><Link href="/recommendations">View All Recommendations <ChevronRight className="h-4 w-4 ml-1" /></Link></Button>
                                    </div>
                                )}
                            </div>

                            {/* Skill Gap Radar */}
                            {gaps.length > 0 && gaps[0].gaps.length > 0 && (
                                <div>
                                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                        <Target className="h-5 w-5 text-primary" />Skill Gap — {gaps[0].role_title}
                                    </h2>
                                    <Card className="p-6">
                                        <CardContent className="p-0">
                                            <div className="h-[320px]" role="img" aria-label="Skill gap radar chart">
                                                <ResponsiveContainer>
                                                    <RadarChart data={gaps[0].gaps.slice(0, 10).map((g) => ({
                                                        skill: g.skill.length > 14 ? g.skill.slice(0, 14) + "…" : g.skill,
                                                        "Your Level": Math.round(g.user_level * 100),
                                                        Required: g.required_level === "required" ? 100 : 70,
                                                    }))}>
                                                        <PolarGrid />
                                                        <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
                                                        <PolarRadiusAxis domain={[0, 100]} />
                                                        <Radar name="Your Level" dataKey="Your Level" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.35} />
                                                        <Radar name="Required" dataKey="Required" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} />
                                                        <Legend />
                                                    </RadarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <div className="mt-3 text-center">
                                        <Button variant="outline" size="sm" asChild><Link href="/skill-gap">Full Skill Gap Analysis <ChevronRight className="h-4 w-4 ml-1" /></Link></Button>
                                    </div>
                                </div>
                            )}

                            {/* Market Sparklines */}
                            {market.length > 0 && (
                                <div>
                                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-primary" />Market Trends
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {market.map((m) => (
                                            <Card key={m.role_category} className="p-5 hover:shadow-md transition-shadow">
                                                <CardContent className="p-0">
                                                    <h3 className="font-semibold text-sm mb-1">{m.role_category}</h3>
                                                    <p className="text-2xl font-bold">SGD {m.avg_salary_sgd.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                                                    <Badge className={`mt-2 ${m.yoy_growth_pct > 0 ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-red-100 text-red-800 hover:bg-red-100"}`}>
                                                        {m.yoy_growth_pct > 0 ? "+" : ""}{m.yoy_growth_pct}% YoY
                                                    </Badge>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                    <div className="mt-3 text-center">
                                        <Button variant="outline" size="sm" asChild><Link href="/market">Full Market Report <ChevronRight className="h-4 w-4 ml-1" /></Link></Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </TabsContent>

                {/* ═══════ LEARNING TAB ═══════ */}
                <TabsContent value="learning">
                    {learningLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : (
                        <div className="space-y-6">
                            {/* Courses */}
                            <div>
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <GraduationCap className="h-5 w-5 text-primary" />Recommended SCTP Courses
                                </h2>
                                {courses.length === 0 ? (
                                    <Card className="p-6"><CardContent className="p-0 text-center text-muted-foreground">No courses found.</CardContent></Card>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {courses.slice(0, 6).map((c) => (
                                            <Card key={c.id} className="p-5 hover:shadow-md transition-shadow">
                                                <CardContent className="p-0">
                                                    <h3 className="font-semibold mb-1">{c.title}</h3>
                                                    <p className="text-sm text-muted-foreground mb-3">{c.provider}</p>
                                                    <div className="flex items-center gap-3 text-sm">
                                                        <Badge variant="secondary">{c.level}</Badge>
                                                        <Badge variant="outline">{c.skill_category}</Badge>
                                                    </div>
                                                    <Separator className="my-3" />
                                                    <div className="flex justify-between text-sm">
                                                        <span>Fee: <strong>${c.course_fee.toLocaleString()}</strong></span>
                                                        <span className="text-emerald-600 font-semibold">You pay: ${c.nett_payable.toLocaleString()}</span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                                <div className="mt-3 text-center">
                                    <Button variant="outline" size="sm" asChild><Link href="/courses">View All Courses <ChevronRight className="h-4 w-4 ml-1" /></Link></Button>
                                </div>
                            </div>

                            {/* Project Suggestions */}
                            {projectSuggestions.length > 0 && (
                                <div>
                                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                        <Wrench className="h-5 w-5 text-primary" />Portfolio Projects
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {projectSuggestions.slice(0, 3).map((p) => (
                                            <Card key={p.title} className="p-5 hover:shadow-md transition-shadow">
                                                <CardContent className="p-0">
                                                    <Badge className="mb-2" variant="secondary">{p.skill}</Badge>
                                                    <h3 className="font-semibold mb-2">{p.title}</h3>
                                                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{p.description}</p>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Badge variant="outline" className="text-xs">{p.difficulty}</Badge>
                                                        <span>~{p.estimated_hours}h</span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                    <div className="mt-3 text-center">
                                        <Button variant="outline" size="sm" asChild><Link href="/projects">All Project Ideas <ChevronRight className="h-4 w-4 ml-1" /></Link></Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </TabsContent>

                {/* ═══════ ACTIVITY TAB ═══════ */}
                <TabsContent value="activity">
                    {activityLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : (
                        <div className="space-y-6">
                            {/* Stats Row */}
                            {progressData && (
                                <div className="grid grid-cols-3 gap-4">
                                    <Card className="p-5 text-center">
                                        <CardContent className="p-0">
                                            <p className="text-3xl font-bold text-emerald-500">{progressData.skills_acquired}</p>
                                            <p className="text-sm text-muted-foreground">Acquired</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="p-5 text-center">
                                        <CardContent className="p-0">
                                            <p className="text-3xl font-bold text-amber-500">{progressData.skills_in_progress}</p>
                                            <p className="text-sm text-muted-foreground">In Progress</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="p-5 text-center">
                                        <CardContent className="p-0">
                                            <p className="text-3xl font-bold text-primary">{progressData.skills_total}</p>
                                            <p className="text-sm text-muted-foreground">Total Tracked</p>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* Timeline Chart */}
                            {timeline.length > 0 && (() => {
                                const dateMap: Record<string, Record<string, unknown>> = {};
                                timeline.forEach((t) => {
                                    if (!t.date) return;
                                    if (!dateMap[t.date]) dateMap[t.date] = { date: t.date };
                                    dateMap[t.date][t.skill] = t.level;
                                });
                                const chartData = Object.values(dateMap);
                                const allSkills = [...new Set(timeline.map((t) => t.skill))];
                                const COLORS = ["#7c3aed", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];
                                return (
                                    <Card className="p-6">
                                        <CardContent className="p-0">
                                            <h2 className="text-lg font-bold mb-3">Skill Progress Over Time</h2>
                                            <div className="h-[300px]" role="img" aria-label="Progress timeline chart">
                                                <ResponsiveContainer>
                                                    <LineChart data={chartData}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                                        <YAxis domain={[0, 1]} ticks={[0, 0.5, 1]} />
                                                        <Tooltip />
                                                        <Legend />
                                                        {allSkills.map((skill, i) => (
                                                            <Line key={skill} type="monotone" dataKey={skill} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot />
                                                        ))}
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })()}

                            {/* Recent Activity Log */}
                            {progressData?.entries && progressData.entries.length > 0 && (
                                <Card className="p-6">
                                    <CardContent className="p-0">
                                        <h2 className="text-lg font-bold mb-3">Recent Activity</h2>
                                        <div className="space-y-2">
                                            {progressData.entries.slice(0, 15).map((e, i) => (
                                                <div key={`${e.skill}-${e.recorded_at}-${i}`} className="flex items-center gap-3 py-2 border-b last:border-0">
                                                    <div className={`h-2.5 w-2.5 rounded-full ${e.level >= 1 ? "bg-emerald-500" : e.level >= 0.5 ? "bg-amber-500" : "bg-gray-400"}`} />
                                                    <Badge variant="secondary" className="text-xs">{e.skill}</Badge>
                                                    <span className="text-sm">{e.level >= 1 ? "Strong" : e.level >= 0.5 ? "Partial" : "Started"}</span>
                                                    <span className="text-xs text-muted-foreground ml-auto">{e.recorded_at}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {!progressData?.entries?.length && !timeline.length && (
                                <Card className="p-8">
                                    <CardContent className="p-0 text-center text-muted-foreground">
                                        <Activity className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                        <p className="font-semibold">No activity yet</p>
                                        <p className="text-sm">Start tracking your skill progress to see your learning journey here.</p>
                                        <Button variant="outline" className="mt-4" asChild><Link href="/progress">Go to Progress Tracker</Link></Button>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </TabsContent>

                {/* ═══════ SETTINGS TAB ═══════ */}
                <TabsContent value="settings">
                    <div className="max-w-xl">
                        <Card className="p-6">
                            <CardContent className="p-0">
                                <h2 className="text-xl font-bold mb-6">Edit Profile</h2>
                                <form onSubmit={handleProfileUpdate} className="space-y-5">
                                    <div>
                                        <Label htmlFor="edit-name">Full Name</Label>
                                        <Input id="edit-name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
                                    </div>
                                    <div>
                                        <Label htmlFor="edit-education">Education</Label>
                                        <Input id="edit-education" value={editForm.education} onChange={(e) => setEditForm({ ...editForm, education: e.target.value })} placeholder="e.g. Bachelor's in Computer Science" />
                                    </div>
                                    <div>
                                        <Label htmlFor="edit-experience">Years of Experience</Label>
                                        <Input id="edit-experience" type="number" min={0} max={40} value={editForm.years_experience} onChange={(e) => setEditForm({ ...editForm, years_experience: parseInt(e.target.value) || 0 })} />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" id="edit-switcher" checked={editForm.is_career_switcher} onChange={(e) => setEditForm({ ...editForm, is_career_switcher: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
                                        <Label htmlFor="edit-switcher">I'm a career switcher</Label>
                                    </div>
                                    <Separator />
                                    <div className="flex gap-3">
                                        <Button type="submit" disabled={saving}>
                                            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : "Save Changes"}
                                        </Button>
                                        <Button type="button" variant="outline" asChild><Link href="/account">Account Settings</Link></Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Skills display */}
                        <Card className="p-6 mt-6">
                            <CardContent className="p-0">
                                <h2 className="text-lg font-bold mb-3">Your Skills</h2>
                                <p className="text-sm text-muted-foreground mb-4">Skills are extracted from your resume. To update them, re-upload your resume on the home page.</p>
                                <div className="flex flex-wrap gap-2">
                                    {summary.skills.map((skill) => (
                                        <Badge key={skill} className="px-3 py-1">{skill}</Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
