"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Briefcase,
  BarChart3,
  Route,
  FileText,
  MessageSquare,
  HelpCircle,
  GraduationCap,
  Menu,
  Sun,
  Moon,
  Command,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useTenant } from "@/contexts/tenant-context";

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
  const userName =
    typeof window !== "undefined" ? localStorage.getItem("userName") : null;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  if (!token) {
    return (
      <Button variant="default" size="sm" asChild>
        <Link href="/login">Login</Link>
      </Button>
    );
  }

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const handleLogout = async () => {
    localStorage.clear();
    router.push("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="ml-2 rounded-none border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary transition-colors h-8 w-8"
        >
          <Avatar className="h-full w-full rounded-none">
            <AvatarFallback className="bg-transparent text-primary text-[10px] font-mono font-bold tracking-widest rounded-none">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-background-dark/95 border border-primary/30 rounded-none backdrop-blur-md"
      >
        <DropdownMenuItem
          disabled
          className="text-[10px] font-mono text-primary/50 uppercase tracking-widest focus:bg-transparent"
        >
          {userName}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-primary/20" />
        <DropdownMenuItem
          onClick={() => router.push("/dashboard")}
          className="text-xs font-mono text-slate-300 hover:text-primary hover:bg-primary/10 focus:bg-primary/10 focus:text-primary cursor-pointer rounded-none transition-colors"
        >
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push("/account")}
          className="text-xs font-mono text-slate-300 hover:text-primary hover:bg-primary/10 focus:bg-primary/10 focus:text-primary cursor-pointer rounded-none transition-colors"
        >
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-primary/20" />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-xs font-mono text-accent-coral hover:text-accent-coral hover:bg-accent-coral/10 focus:bg-accent-coral/10 focus:text-accent-coral cursor-pointer rounded-none transition-colors"
        >
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
    <header className="sticky top-0 z-50 w-full border-b border-primary/20 bg-background-dark/95 backdrop-blur-sm -mb-2">
      <div className="container mx-auto flex h-16 items-center px-4 relative">
        <div className="absolute top-0 bottom-0 left-4 w-px bg-primary/20 hidden md:block"></div>
        <div className="absolute top-0 bottom-0 right-4 w-px bg-primary/20 hidden md:block"></div>
        {/* Mobile Menu */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2 md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[280px] sm:w-[300px] bg-background-dark border-r border-primary/30 rounded-none"
          >
            <SheetHeader>
              <SheetTitle className="text-left text-sm font-mono font-bold text-primary uppercase tracking-widest border-b border-primary/20 pb-4">
                System Menu
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-4 py-4">
              {NAV_SECTIONS.map((section) => (
                <div key={section.header} className="space-y-2">
                  <h4 className="px-2 text-[10px] font-mono font-bold text-primary/60 uppercase tracking-widest flex items-center gap-2 mb-3">
                    <span className="w-1.5 h-1.5 bg-primary/40 block"></span>{" "}
                    {section.header}
                  </h4>
                  {section.items.map((item) => (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setSheetOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 text-xs font-mono uppercase tracking-wider transition-colors border-l-[3px] ${
                        pathname === item.path
                          ? "bg-primary/10 text-primary border-primary"
                          : "text-slate-400 border-transparent hover:bg-primary/5 hover:text-slate-200 hover:border-primary/50"
                      }`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link
          href="/"
          className="mr-8 flex items-center gap-2 relative z-10 md:ml-4"
        >
          {tenantConfig.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenantConfig.logoUrl}
              alt={tenantConfig.name}
              className="h-8 w-auto mix-blend-screen"
            />
          ) : (
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 border border-primary bg-primary/10 flex items-center justify-center text-primary shadow-[0_0_8px_rgba(37,157,244,0.4)]">
                <Command className="h-3 w-3" />
              </div>
              <span className="font-mono font-bold text-sm tracking-widest uppercase text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
                {tenantConfig.name}
              </span>
            </div>
          )}
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-[11px] font-mono font-bold uppercase tracking-widest z-10">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.path;

            return (
              <Link
                key={link.path}
                href={link.path}
                className={`transition-all hover:text-primary relative group ${
                  isActive
                    ? "text-primary drop-shadow-[0_0_5px_rgba(37,157,244,0.5)]"
                    : "text-slate-400"
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute -bottom-5 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(37,157,244,0.8)]"></span>
                )}
                <span className="absolute -bottom-5 left-0 right-0 h-0.5 bg-primary/0 group-hover:bg-primary/50 transition-colors"></span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 z-10 md:mr-4">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
