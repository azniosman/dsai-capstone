import { Terminal } from "lucide-react";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/recommendations", label: "Job Matching" },
  { href: "/skill-gap", label: "Skill Gap Analysis" },
  { href: "/courses", label: "Learning Paths" },
];

const TOOL_LINKS = [
  { href: "/jd-match", label: "JD Match" },
  { href: "/chat", label: "Career Coach" },
  { href: "/roadmap", label: "Role Comparison" },
  { href: "/market-intel", label: "Market Intelligence" },
];

export function FooterSection() {
  return (
    <footer className="bg-background border-t border-primary/20 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-6 h-6 text-primary" />
              <span className="text-foreground text-lg font-bold uppercase tracking-tight">
                SkillBridge
              </span>
            </div>
            <p className="text-muted-foreground font-mono text-xs leading-relaxed max-w-xs">
              AI-powered career intelligence — job matching, skill gap analysis,
              and personalized upskilling roadmaps for Singapore&apos;s tech
              ecosystem.
            </p>
          </div>

          {/* Core Navigation */}
          <div className="space-y-4">
            <h4 className="text-primary font-mono text-xs font-bold uppercase tracking-widest">
              Core Features
            </h4>
            <nav className="flex flex-col gap-2" aria-label="Core features">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-primary text-sm font-mono transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Tools */}
          <div className="space-y-4">
            <h4 className="text-primary font-mono text-xs font-bold uppercase tracking-widest">
              Tools
            </h4>
            <nav className="flex flex-col gap-2" aria-label="Tools">
              {TOOL_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-primary text-sm font-mono transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            © 2026 SkillBridge. All rights reserved.
          </p>
          <div className="flex gap-4">
            <div className="w-8 h-px bg-primary/20" />
            <div className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
            <div className="w-8 h-px bg-primary/20" />
          </div>
        </div>
      </div>
    </footer>
  );
}
