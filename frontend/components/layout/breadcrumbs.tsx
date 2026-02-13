"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const ROUTE_LABELS: Record<string, string> = {
  "/": "Profile",
  "/recommendations": "Job Matches",
  "/skill-gap": "Skill Gaps",
  "/roadmap": "Roadmap",
  "/jd-match": "JD Match",
  "/compare": "Compare Roles",
  "/chat": "Career Coach",
  "/interview": "Mock Interview",
  "/market": "Market Insights",
  "/peers": "Peer Comparison",
  "/projects": "Projects",
  "/progress": "Progress",
  "/courses": "Courses",
  "/account": "Account Settings",
  "/login": "Login",
};

export default function AppBreadcrumbs() {
  const pathname = usePathname();

  if (pathname === "/") return null;

  const label = ROUTE_LABELS[pathname] || "Page";

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">Home</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{label}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
