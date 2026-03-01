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
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTenant } from "@/contexts/tenant-context";
import api from "@/lib/api-client";

const CORE_NAV = [
  { step: "01", label: "Dashboard", path: "/dashboard", icon: Cpu },
  { step: "02", label: "Target Search", path: "/recommendations", icon: Briefcase },
  { step: "03", label: "Skill Matrix", path: "/skill-gap", icon: BarChart3 },
  { step: "04", label: "Learning Path", path: "/courses", icon: BookOpen },
];

const TOOLS_NAV = [
  { label: "JD Match", path: "/jd-match", icon: FileText },
  { label: "Career Coach", path: "/chat", icon: MessageSquare },
  { label: "Compare Roles", path: "/roadmap", icon: GitCompare },
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
        "fixed left-0 top-0 z-40 h-screen flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200 ease-in-out",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-14 border-b border-sidebar-border shrink-0",
          collapsed ? "justify-center px-0" : "px-4 gap-3",
        )}
      >
        <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shrink-0 shadow-sm">
          <Command className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <span className="font-bold text-sm tracking-tight text-sidebar-foreground truncate block">
              {tenantConfig.name}
            </span>
            <span className="micro-type text-[9px] opacity-60 block">
              Intelligence Platform
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {/* Core System */}
        <div>
          {!collapsed && (
            <p className="micro-type px-2 mb-2 opacity-50">Core System</p>
          )}
          <ul className="space-y-px">
            {CORE_NAV.map((item) => {
              const isActive =
                pathname === item.path ||
                pathname.startsWith(item.path + "/");
              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors duration-150",
                      collapsed ? "justify-center" : "",
                      isActive
                        ? "bg-primary/10 text-primary border-l-[2px] border-primary pl-[6px]"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground border-l-[2px] border-transparent pl-[6px]",
                    )}
                  >
                    {!collapsed && (
                      <span
                        className={cn(
                          "font-mono text-[10px] font-bold shrink-0 w-5",
                          isActive ? "text-primary" : "text-muted-foreground/50",
                        )}
                      >
                        {item.step}
                      </span>
                    )}
                    <item.icon
                      className={cn(
                        "shrink-0",
                        collapsed ? "h-5 w-5" : "h-4 w-4",
                        isActive ? "text-primary" : "",
                      )}
                    />
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Tools */}
        <div>
          {!collapsed && (
            <p className="micro-type px-2 mb-2 opacity-50">Tools</p>
          )}
          <ul className="space-y-px">
            {TOOLS_NAV.map((item) => {
              const isActive =
                pathname === item.path ||
                pathname.startsWith(item.path + "/");
              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors duration-150",
                      collapsed ? "justify-center" : "",
                      isActive
                        ? "bg-primary/10 text-primary border-l-[2px] border-primary pl-[6px]"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground border-l-[2px] border-transparent pl-[6px]",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "shrink-0",
                        collapsed ? "h-5 w-5" : "h-4 w-4",
                        isActive ? "text-primary" : "",
                      )}
                    />
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Bottom: User + Controls */}
      <div className="border-t border-sidebar-border p-2 space-y-px shrink-0">
        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="Toggle theme"
          className={cn(
            "flex items-center gap-3 w-full rounded-lg px-2 py-2 text-sm font-medium text-sidebar-foreground/50 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors duration-150",
            collapsed ? "justify-center" : "",
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
            "flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-sidebar-foreground/50 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors duration-150",
            collapsed ? "justify-center" : "",
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
                "flex items-center gap-3 w-full rounded-lg px-2 py-2 text-sm font-medium hover:bg-sidebar-accent/60 transition-colors duration-150",
                collapsed ? "justify-center" : "",
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
            <DropdownMenuItem
              disabled
              className="text-xs text-muted-foreground"
            >
              {userName}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/account")}>
              <Settings className="h-4 w-4 mr-2" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Collapse Toggle */}
        <button
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex items-center gap-3 w-full rounded-lg px-2 py-2 text-sm font-medium text-sidebar-foreground/35 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors duration-150",
            collapsed ? "justify-center" : "justify-end",
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
