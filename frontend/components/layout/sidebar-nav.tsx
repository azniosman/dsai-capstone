"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import {
    Cpu, Briefcase, BarChart3, Route, FileText, MessageSquare,
    HelpCircle, GraduationCap, TrendingUp, GitCompare, Users,
    Activity, Settings, Sun, Moon, ChevronLeft, ChevronRight,
    Command, LogOut
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTenant } from "@/contexts/tenant-context";
import api from "@/lib/api-client";

const NAV_SECTIONS = [
    {
        label: "Intelligence",
        items: [
            { label: "Dashboard", path: "/dashboard", icon: Cpu },
            { label: "Job Matches", path: "/recommendations", icon: Briefcase },
            { label: "Skill Gaps", path: "/skill-gap", icon: BarChart3 },
            { label: "Roadmap", path: "/roadmap", icon: Route },
        ],
    },
    {
        label: "Tools",
        items: [
            { label: "JD Match", path: "/jd-match", icon: FileText },
            { label: "Career Coach", path: "/chat", icon: MessageSquare },
            { label: "Interview Prep", path: "/interview", icon: HelpCircle },
            { label: "Courses", path: "/courses", icon: GraduationCap },
        ],
    },
    {
        label: "Insights",
        items: [
            { label: "Market Trends", path: "/market", icon: TrendingUp },
            { label: "Compare", path: "/compare", icon: GitCompare },
            { label: "Peers", path: "/peers", icon: Users },
            { label: "Progress", path: "/progress", icon: Activity },
        ],
    },
];

interface SidebarNavProps {
    collapsed: boolean;
    onToggle: () => void;
}

export function SidebarNav({ collapsed, onToggle }: SidebarNavProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const { tenantConfig } = useTenant();

    const userName = typeof window !== "undefined" ? localStorage.getItem("userName") : null;
    const initials = userName
        ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
        : "U";

    const handleLogout = async () => {
        const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
        if (refreshToken) {
            try { await api.post("/api/auth/logout", { refresh_token: refreshToken }); } catch { /* ignore */ }
        }
        localStorage.clear();
        router.push("/login");
    };

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 z-40 h-screen flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200 ease-in-out",
                collapsed ? "w-16" : "w-60"
            )}
        >
            {/* Logo */}
            <div className={cn(
                "flex items-center h-14 border-b border-sidebar-border shrink-0",
                collapsed ? "justify-center px-0" : "px-4 gap-3"
            )}>
                <div className="h-7 w-7 rounded bg-primary flex items-center justify-center text-primary-foreground shrink-0">
                    <Command className="h-4 w-4" />
                </div>
                {!collapsed && (
                    <span className="font-bold text-sm tracking-tight text-sidebar-foreground truncate">
                        {tenantConfig.name}
                    </span>
                )}
            </div>

            {/* Nav Sections */}
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
                {NAV_SECTIONS.map((section) => (
                    <div key={section.label}>
                        {!collapsed && (
                            <p className="section-label px-2 mb-2">{section.label}</p>
                        )}
                        <ul className="space-y-px">
                            {section.items.map((item) => {
                                const isActive = pathname === item.path || pathname.startsWith(item.path + "/");
                                return (
                                    <li key={item.path}>
                                        <Link
                                            href={item.path}
                                            title={collapsed ? item.label : undefined}
                                            className={cn(
                                                "flex items-center gap-3 rounded px-2 py-2 text-sm font-medium transition-colors duration-150",
                                                collapsed ? "justify-center" : "",
                                                isActive
                                                    ? "bg-primary/15 text-primary border-l-[3px] border-primary pl-[5px] font-semibold"
                                                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground border-l-[3px] border-transparent pl-[5px]"
                                            )}
                                        >
                                            <item.icon className={cn(
                                                "shrink-0",
                                                collapsed ? "h-5 w-5" : "h-4 w-4",
                                                isActive ? "text-primary" : ""
                                            )} />
                                            {!collapsed && <span className="truncate">{item.label}</span>}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            {/* Bottom: User + Controls */}
            <div className="border-t border-sidebar-border p-2 space-y-px shrink-0">
                {/* Theme Toggle */}
                <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    title="Toggle theme"
                    className={cn(
                        "flex items-center gap-3 w-full rounded px-2 py-2 text-sm font-medium text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150",
                        collapsed ? "justify-center" : ""
                    )}
                >
                    {/* Render only the active icon — no overlapping positioning */}
                    <span className="relative h-4 w-4 shrink-0">
                        <Sun className="h-4 w-4 absolute inset-0 transition-all rotate-0 scale-100 dark:-rotate-90 dark:scale-0" />
                        <Moon className="h-4 w-4 absolute inset-0 transition-all rotate-90 scale-0 dark:rotate-0 dark:scale-100" />
                    </span>
                    {!collapsed && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
                </button>

                {/* Settings */}
                <Link
                    href="/account"
                    className={cn(
                        "flex items-center gap-3 rounded px-2 py-2 text-sm font-medium text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150",
                        collapsed ? "justify-center" : ""
                    )}
                    title={collapsed ? "Settings" : undefined}
                >
                    <Settings className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>Settings</span>}
                </Link>

                {/* User Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className={cn(
                                "flex items-center gap-3 w-full rounded px-2 py-2 text-sm font-medium hover:bg-sidebar-accent transition-colors duration-150",
                                collapsed ? "justify-center" : ""
                            )}
                        >
                            <Avatar className="h-6 w-6 shrink-0">
                                <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            {!collapsed && (
                                <span className="truncate text-sidebar-foreground text-xs font-medium">
                                    {userName || "Account"}
                                </span>
                            )}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="end" className="w-48 mb-1">
                        <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                            {userName}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => router.push("/account")}>
                            <Settings className="h-4 w-4 mr-2" /> Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                            <LogOut className="h-4 w-4 mr-2" /> Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Collapse Toggle */}
                <button
                    onClick={onToggle}
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    className={cn(
                        "flex items-center gap-3 w-full rounded px-2 py-2 text-sm font-medium text-sidebar-foreground/35 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150",
                        collapsed ? "justify-center" : "justify-end"
                    )}
                >
                    {collapsed ? (
                        <ChevronRight className="h-4 w-4" />
                    ) : (
                        <>
                            <span className="text-xs">Collapse</span>
                            <ChevronLeft className="h-4 w-4" />
                        </>
                    )}
                </button>
            </div>
        </aside>
    );
}
