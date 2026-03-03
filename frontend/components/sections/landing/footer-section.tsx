import { Terminal } from "lucide-react";
import Link from "next/link";

export function FooterSection() {
  return (
    <footer className="bg-background-dark border-t border-primary/20 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-6 h-6 text-primary" />
              <span className="text-slate-100 text-lg font-bold uppercase tracking-tight">
                SKLBR CI System
              </span>
            </div>
            <p className="text-slate-500 font-mono text-xs leading-relaxed max-w-xs">
              Career Intelligence Infrastructure — powering data-driven talent
              decisions for Singapore&apos;s tech ecosystem.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-primary font-mono text-xs font-bold uppercase tracking-widest">
              Navigation
            </h4>
            <nav className="flex flex-col gap-2">
              {[
                { href: "/dashboard", label: "Dashboard" },
                { href: "/recommendations", label: "Recommendations" },
                { href: "/skill-gap", label: "Skill Gap" },
                { href: "/courses", label: "Courses" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-slate-400 hover:text-primary text-sm font-mono transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Info */}
          <div className="space-y-4">
            <h4 className="text-primary font-mono text-xs font-bold uppercase tracking-widest">
              System Info
            </h4>
            <div className="space-y-2 font-mono text-xs text-slate-500">
              <p>Version: 4.02</p>
              <p>Region: SG-Central-01</p>
              <p>Status: Operational</p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-mono text-[10px] text-slate-600 uppercase tracking-widest">
            © 2026 Career Intelligence System. All rights reserved.
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
