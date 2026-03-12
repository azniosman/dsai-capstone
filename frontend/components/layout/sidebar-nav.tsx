"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import {
  Cpu,
  Briefcase,
  BarChart3,
  BookOpen,
  FileText,
  MessageSquare,
  Settings,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Command,
  LogOut,
  GitCompare,
  TrendingUp,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useTenant } from "@/contexts/tenant-context";
import api from "@/lib/api-client";

const CORE_NAV = [
  { step: "01", label: "Dashboard", path: "/dashboard", icon: Cpu },
  {
    step: "02",
    label: "Target Search",
    path: "/recommendations",
    icon: Briefcase,
  },
  { step: "03", label: "Skill Matrix", path: "/skill-gap", icon: BarChart3 },
  { step: "04", label: "Learning Path", path: "/courses", icon: BookOpen },
];

const TOOLS_NAV = [
  { label: "JD Match", path: "/jd-match", icon: FileText },
  { label: "Career Coach", path: "/chat", icon: MessageSquare },
  { label: "Road Map", path: "/roadmap", icon: GitCompare },
  { label: "Market Intel", path: "/market-intel", icon: TrendingUp },
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

  const userName =
    typeof window !== "undefined" ? localStorage.getItem("userName") : null;
  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const handleLogout = async () => {
    const refreshToken =
      typeof window !== "undefined"
        ? localStorage.getItem("refreshToken")
        : null;
    if (refreshToken) {
      try {
        await api.post("/api/auth/logout", { refresh_token: refreshToken });
      } catch {
        /* ignore */
      }
    }
    localStorage.clear();
    router.push("/login");
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen flex flex-col bg-background border-r border-primary/20 transition-all duration-200 ease-in-out font-mono",
        collapsed ? "w-16" : "w-72",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "border-b border-primary/20 shrink-0 relative",
          collapsed ? "p-4 flex justify-center" : "p-8",
        )}
      >
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary opacity-50"></div>
        <div className="flex items-center gap-3">
          <div className="size-6 border border-primary bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-[0_0_8px_rgba(37,157,244,0.4)] dark:shadow-[0_0_8px_rgba(37,157,244,0.4)]">
            <Command className="size-3.5" />
          </div>
          {!collapsed && (
            <h1 className="text-sm font-bold tracking-widest uppercase text-foreground drop-shadow-sm">
              {tenantConfig.name || "SkillBridge"}
            </h1>
          )}
        </div>
        {!collapsed && (
          <p className={cn(
            "text-[10px] uppercase tracking-widest mt-2 flex items-center gap-2",
            theme === "dark" ? "text-primary/60" : "text-primary/80",
          )}>
            <span className="w-1.5 h-1.5 bg-primary/40 block"></span>
            Intelligence Platform
          </p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto flex flex-col">
        {/* Core System */}
        <div className="relative">
          {!collapsed && (
            <div className="text-[10px] font-bold text-primary/50 uppercase tracking-widest py-6 px-8 flex items-center gap-2">
              <span className="w-1 h-1 bg-primary/30 rounded-full"></span> Index
            </div>
          )}
          <div className="flex flex-col">
            {CORE_NAV.map((item) => {
              const isActive =
                pathname === item.path || pathname.startsWith(item.path + "/");
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "nav-link flex items-center transition-all duration-200 border-l-[3px]",
                    collapsed
                      ? "justify-center py-4 border-b border-background/20"
                      : "gap-3 px-8 py-4 border-b border-primary/5",
                    isActive
                      ? "bg-primary/10 text-primary border-primary shadow-[inset_4px_0_0_0_rgba(37,157,244,1)] dark:shadow-[inset_4px_0_0_0_rgba(37,157,244,1)]"
                      : "text-muted-foreground border-transparent hover:bg-primary/5 hover:text-foreground hover:border-primary/50",
                  )}
                >
                  <item.icon
                    className={cn("shrink-0", collapsed ? "size-5" : "size-4")}
                  />
                  {!collapsed && (
                    <span className="text-xs font-bold uppercase tracking-widest">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Tools */}
        <div className="relative mt-4">
          {!collapsed && (
            <div className="text-[10px] font-bold text-primary/50 uppercase tracking-widest py-6 px-8 flex items-center gap-2">
              <span className="w-1 h-1 bg-primary/30 rounded-full"></span> Tools
            </div>
          )}
          <div className="flex flex-col">
            {TOOLS_NAV.map((item) => {
              const isActive =
                pathname === item.path || pathname.startsWith(item.path + "/");
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "nav-link flex items-center transition-all duration-200 border-l-[3px]",
                    collapsed
                      ? "justify-center py-4 border-b border-background/20"
                      : "gap-3 px-8 py-4 border-b border-primary/5",
                    isActive
                      ? "bg-primary/10 text-primary border-primary shadow-[inset_4px_0_0_0_rgba(37,157,244,1)] dark:shadow-[inset_4px_0_0_0_rgba(37,157,244,1)]"
                      : "text-muted-foreground border-transparent hover:bg-primary/5 hover:text-foreground hover:border-primary/50",
                  )}
                >
                  <item.icon
                    className={cn("shrink-0", collapsed ? "size-5" : "size-4")}
                  />
                  {!collapsed && (
                    <span className="text-xs font-bold uppercase tracking-widest">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Bottom Profile Section */}
      <div
        className={cn(
          "mt-auto border-t border-primary/20 shrink-0 bg-background/50 relative",
          collapsed ? "p-4" : "p-8",
        )}
      >
        <div className="absolute top-0 right-0 w-2 h-2 border-b border-r border-primary opacity-50"></div>
        <div
          className={cn(
            "flex items-center",
            collapsed ? "justify-center mb-4" : "gap-4 mb-4",
          )}
        >
          <div className="size-10 border border-primary/30 bg-primary/5 p-0.5 shrink-0">
            <Avatar className="w-full h-full rounded-none">
              <AvatarFallback className="bg-transparent text-primary text-xs font-bold font-mono tracking-widest rounded-none">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className={cn(
                "block text-xs font-bold uppercase tracking-widest truncate",
                theme === "dark" ? "text-slate-200" : "text-slate-800",
              )}>
                {userName || "User Profile"}
              </span>
              <span className="text-[10px] tracking-wider text-primary/60">
                Standard User
              </span>
            </div>
          )}
        </div>

        {!collapsed && (
          <>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest mb-2 text-primary/80">
              <span>Sync Index</span>
              <span className={cn(
                "text-primary",
                theme === "dark" ? "drop-shadow-[0_0_3px_rgba(37,157,244,0.8)]" : "",
              )}>
                Active
              </span>
            </div>
            <div className="h-px bg-primary/20 w-full relative mb-6">
              <div className="absolute inset-y-0 left-0 bg-primary w-full shadow-[0_0_5px_rgba(37,157,244,0.5)] dark:shadow-[0_0_5px_rgba(37,157,244,0.5)] transition-all duration-1000"></div>
            </div>
          </>
        )}

        {/* User Controls */}
        <div className="flex flex-col gap-2 relative z-10">
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle theme"
            className={cn(
              "flex items-center w-full text-[10px] font-bold uppercase tracking-wider transition-colors duration-150 p-2 hover:bg-primary/5",
              collapsed ? "justify-center" : "gap-3",
              theme === "dark" ? "text-slate-400 hover:text-primary" : "text-slate-600 hover:text-primary",
            )}
          >
            <span className="relative h-4 w-4 shrink-0">
              <Sun className="h-4 w-4 absolute inset-0 transition-all rotate-0 scale-100 dark:-rotate-90 dark:scale-0" />
              <Moon className="h-4 w-4 absolute inset-0 transition-all rotate-90 scale-0 dark:rotate-0 dark:scale-100" />
            </span>
            {!collapsed && (
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            )}
          </button>

          {/* Settings */}
          <Link
            href="/account"
            className={cn(
              "flex items-center text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-primary transition-colors duration-150 p-2 hover:bg-primary/5",
              collapsed ? "justify-center" : "gap-3",
            )}
            title={collapsed ? "Settings" : undefined}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Settings</span>}
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center text-[10px] font-bold uppercase tracking-wider text-accent-coral/70 hover:text-accent-coral transition-colors duration-150 p-2 hover:bg-accent-coral/10",
              collapsed ? "justify-center" : "gap-3",
            )}
            title={collapsed ? "Logout" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>

          {/* Collapse Toggle */}
          <button
            onClick={onToggle}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex items-center mt-4 border-t border-primary/10 pt-4 text-[10px] font-bold uppercase tracking-widest text-primary/50 hover:text-primary transition-colors duration-150",
              collapsed ? "justify-center" : "justify-between w-full",
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <span>Collapse UI</span>
                <ChevronLeft className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
