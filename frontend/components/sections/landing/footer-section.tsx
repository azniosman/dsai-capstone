import { Terminal } from "lucide-react";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/dashboard", label: "DASHBOARD" },
  { href: "/recommendations", label: "JOB_MATCHING" },
  { href: "/skill-gap", label: "SKILL_ANALYSIS" },
  { href: "/courses", label: "LEARNING_PATHS" },
];

const TOOL_LINKS = [
  { href: "/jd-match", label: "JD_MATCH" },
  { href: "/chat", label: "CAREER_COACH" },
  { href: "/roadmap", label: "ROLE_COMPARISON" },
  { href: "/market-intel", label: "MARKET_INTELLIGENCE" },
];

export function FooterSection() {
  return (
    <footer className="bg-background border-t border-white/10 pt-20 pb-32">
      <div className="max-w-[1400px] mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-20">
          {/* Brand */}
          <div className="space-y-6 md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#00f2f2] flex items-center justify-center rounded-sm">
                <Terminal className="text-black w-5 h-5" />
              </div>
              <span className="text-white text-lg font-black uppercase tracking-[0.2em]">
                SKILLBRIDGE_INTEL
              </span>
            </div>
            <p className="text-neutral-500 font-sans text-sm leading-relaxed max-w-sm uppercase tracking-wider">
              AI-powered geospatial career intelligence. Real-time talent
              mapping and predictive upskilling roadmaps for the Singapore
              island node.
            </p>
          </div>

          {/* Core Navigation */}
          <div className="space-y-6">
            <h4 className="tactical-label text-[#00f2f2]">NAVIGATION</h4>
            <nav className="flex flex-col gap-3" aria-label="Core features">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="tactical-label text-neutral-500 hover:text-white transition-all hover:translate-x-1"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Tools */}
          <div className="space-y-6">
            <h4 className="tactical-label text-[#00f2f2]">UTILITIES</h4>
            <nav className="flex flex-col gap-3" aria-label="Tools">
              {TOOL_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="tactical-label text-neutral-500 hover:text-white transition-all hover:translate-x-1"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/5 pt-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="tactical-label text-neutral-700">
            © 2026 SKILLBRIDGE. ALL_RIGHTS_RESERVED.
          </p>

          <div className="flex items-center gap-12 text-neutral-700">
            <div className="tactical-label cursor-pointer hover:text-neutral-400">
              DATA_POLICY
            </div>
            <div className="tactical-label cursor-pointer hover:text-neutral-400">
              SECURITY_AUDIT
            </div>
            <div className="tactical-label cursor-pointer hover:text-neutral-400">
              SYSTEM_v4.2.0
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
