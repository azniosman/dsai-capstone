"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  User, Briefcase, BarChart3, Route, FileText, MessageSquare, HelpCircle,
  TrendingUp, GitCompare, Users, Wrench, Activity, LogIn, GraduationCap,
  Menu, Settings, Sun, Moon, Sparkles, Command, Cpu
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

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="text-muted-foreground hover:text-foreground"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};

const NAV_SECTIONS = [
  {
    header: "Intelligence",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: Cpu },
      { label: "Matches", path: "/recommendations", icon: Briefcase },
      { label: "Gaps", path: "/skill-gap", icon: BarChart3 },
      { label: "Roadmap", path: "/roadmap", icon: Route },
    ],
  },
  {
    header: "Tools",
    items: [
      { label: "JD Match", path: "/jd-match", icon: FileText },
      { label: "Coach", path: "/chat", icon: MessageSquare },
      { label: "Interview", path: "/interview", icon: HelpCircle },
      { label: "Courses", path: "/courses", icon: GraduationCap },
    ],
  },
];

function UserMenu() {
  const router = useRouter();
  const userName = typeof window !== "undefined" ? localStorage.getItem("userName") : null;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  if (!token) {
    return (
      <Button variant="default" size="sm" asChild>
        <Link href="/login">Login</Link>
      </Button>
    );
  }

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const handleLogout = async () => {
    localStorage.clear();
    router.push("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="ml-2 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem disabled className="text-xs text-muted-foreground">
          {userName}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/dashboard")}>
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/account")}>
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Navbar() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const pathname = usePathname();
  const { tenantConfig } = useTenant();

  const NAV_LINKS = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Jobs", path: "/recommendations" },
    { label: "Gaps", path: "/skill-gap" },
    { label: "Roadmap", path: "/roadmap" },
    { label: "Coach", path: "/chat" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4">
        {/* Mobile Menu */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2 md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] sm:w-[300px]">
            <SheetHeader>
              <SheetTitle className="text-left text-lg font-bold">Menu</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-4 py-4">
              {NAV_SECTIONS.map((section) => (
                <div key={section.header} className="space-y-1">
                  <h4 className="px-2 text-xs font-semibold text-muted-foreground mb-2">
                    {section.header}
                  </h4>
                  {section.items.map((item) => (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setSheetOpen(false)}
                      className={`flex items-center gap-3 px-2 py-2 text-sm font-medium rounded-md transition-colors ${pathname === item.path
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                        }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/" className="mr-8 flex items-center gap-2">
          {tenantConfig.logoUrl ? (
            <img src={tenantConfig.logoUrl} alt={tenantConfig.name} className="h-8 w-auto" />
          ) : (
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-primary flex items-center justify-center text-primary-foreground">
                <Command className="h-4 w-4" />
              </div>
              <span className="font-semibold text-sm tracking-tight">{tenantConfig.name}</span>
            </div>
          )}
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.path;

            return (
              <Link
                key={link.path}
                href={link.path}
                className={`transition-colors hover:text-foreground/80 ${isActive ? "text-foreground font-semibold" : "text-muted-foreground"
                  }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
