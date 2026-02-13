"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  User, Briefcase, BarChart3, Route, FileText, MessageSquare, HelpCircle,
  TrendingUp, GitCompare, Users, Wrench, Activity, LogIn, GraduationCap,
  Home, Menu, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { useTenant } from "@/contexts/tenant-context";
import api from "@/lib/api-client";

const NAV_SECTIONS = [
  {
    header: "Core",
    items: [
      { label: "Profile", path: "/", icon: User },
      { label: "Jobs", path: "/recommendations", icon: Briefcase },
      { label: "Skill Gap", path: "/skill-gap", icon: BarChart3 },
      { label: "Roadmap", path: "/roadmap", icon: Route },
    ],
  },
  {
    header: "Tools",
    items: [
      { label: "JD Match", path: "/jd-match", icon: FileText },
      { label: "Compare Roles", path: "/compare", icon: GitCompare },
      { label: "Career Coach", path: "/chat", icon: MessageSquare },
      { label: "Mock Interview", path: "/interview", icon: HelpCircle },
      { label: "Courses", path: "/courses", icon: GraduationCap },
    ],
  },
  {
    header: "Insights",
    items: [
      { label: "Market Insights", path: "/market", icon: TrendingUp },
      { label: "Peer Comparison", path: "/peers", icon: Users },
      { label: "Projects", path: "/projects", icon: Wrench },
      { label: "Progress", path: "/progress", icon: Activity },
    ],
  },
  {
    header: "Account",
    items: [
      { label: "Settings", path: "/account", icon: Settings },
    ],
  },
];

function NavDrawerContent({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const { tenantConfig } = useTenant();

  return (
    <div className="pt-2">
      {tenantConfig.logoUrl ? (
        <div className="px-4 mb-2">
          <img src={tenantConfig.logoUrl} alt={tenantConfig.name} className="max-w-full h-auto" />
        </div>
      ) : (
        <h2 className="px-4 mb-1 text-lg font-bold">{tenantConfig.name}</h2>
      )}
      <p className="px-4 text-xs text-muted-foreground">Career Intelligence Platform</p>

      <nav className="mt-4 space-y-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.header}>
            <p className="px-4 mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.header}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-4 py-2 mx-2 rounded-lg text-sm transition-colors ${
                        active
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <div className="border-t pt-2">
          <p className="px-4 mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Help
          </p>
          <button
            onClick={() => { onClose(); alert("Simulating guided tour!"); }}
            className="flex items-center gap-3 px-4 py-2 mx-2 rounded-lg text-sm hover:bg-muted text-foreground w-full text-left"
          >
            <Home className="h-4 w-4 shrink-0" />
            Show Tour
          </button>
        </div>
      </nav>
    </div>
  );
}

function UserMenu() {
  const router = useRouter();
  const { tenantConfig } = useTenant();

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const userName = typeof window !== "undefined" ? localStorage.getItem("userName") : null;

  if (!token) {
    return (
      <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20">
        <Link href="/login">
          <LogIn className="h-4 w-4 mr-1" />
          Login
        </Link>
      </Button>
    );
  }

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      try {
        await api.post("/api/auth/logout", { refresh_token: refreshToken });
      } catch {
        // Ignore
      }
    }
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("profileId");
    localStorage.removeItem("tenantName");
    router.push("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="ml-2 hover:bg-white/20">
          <Avatar className="h-8 w-8">
            <AvatarFallback
              className="text-xs font-medium"
              style={{ backgroundColor: tenantConfig.primaryColor, color: "white" }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled className="text-sm">
          {userName || "User"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/")}>Profile</DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/account")}>Account Settings</DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Navbar() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { tenantConfig } = useTenant();

  return (
    <header
      className="sticky top-0 z-50"
      style={{ background: `var(--tenant-gradient)` }}
    >
      <div className="container mx-auto flex items-center h-14 px-4">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2 text-white hover:bg-white/20">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[260px] p-0 overflow-y-auto">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <NavDrawerContent onClose={() => setSheetOpen(false)} />
          </SheetContent>
        </Sheet>

        {tenantConfig.logoUrl ? (
          <img src={tenantConfig.logoUrl} alt={tenantConfig.name} className="h-8 mr-2" />
        ) : (
          <h1 className="text-lg font-bold text-white tracking-tight flex-1">
            {tenantConfig.name}
          </h1>
        )}

        <nav className="hidden md:flex gap-1 ml-auto mr-2">
          {[
            { label: "Profile", path: "/" },
            { label: "Jobs", path: "/recommendations" },
            { label: "Gaps", path: "/skill-gap" },
            { label: "Roadmap", path: "/roadmap" },
            { label: "Coach", path: "/chat" },
          ].map((link) => (
            <Button key={link.path} variant="ghost" size="sm" asChild className="text-white hover:bg-white/20">
              <Link href={link.path}>{link.label}</Link>
            </Button>
          ))}
        </nav>

        <UserMenu />
      </div>
    </header>
  );
}
