"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { cn } from "@/lib/utils";

// Routes that use the sidebar layout
const SIDEBAR_ROUTES = [
    "/dashboard", "/recommendations", "/skill-gap", "/roadmap",
    "/jd-match", "/chat", "/interview", "/courses",
    "/market", "/compare", "/peers", "/progress",
    "/account", "/resume-rewriter", "/projects",
];

function useIsSidebarRoute() {
    const pathname = usePathname();
    return SIDEBAR_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

export function AppShell({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const isSidebarRoute = useIsSidebarRoute();

    if (!isSidebarRoute) {
        // Public pages: landing, login — no sidebar
        return <>{children}</>;
    }

    return (
        <div className="flex min-h-screen bg-background">
            <SidebarNav collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
            <div
                className={cn(
                    "flex-1 flex flex-col min-h-screen transition-all duration-200 ease-in-out",
                    collapsed ? "ml-16" : "ml-60"
                )}
            >
                <main className="flex-1 p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
