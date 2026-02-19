"use client";

/**
 * PageHeader — shared page-level header for all authenticated pages.
 *
 * Usage:
 *   <PageHeader
 *     section="Intelligence"
 *     title="Recommended Roles"
 *     description="Roles matched to your profile"
 *     live                           // optional: shows live-dot pulse
 *     action={<Button>…</Button>}   // optional: right-side action slot
 *   />
 */

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Small uppercase section label (e.g. "Intelligence", "Tools") */
  section?: string;
  /** Main page title — large bold heading */
  title: string;
  /** Optional subtitle / description */
  description?: string;
  /** Show a live pulse dot next to the section label */
  live?: boolean;
  /** Optional JSX rendered on the right side */
  action?: React.ReactNode;
  /** Additional className for the wrapper */
  className?: string;
}

export function PageHeader({
  section,
  title,
  description,
  live = false,
  action,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("flex items-start justify-between gap-4", className)}>
      <div>
        {section && (
          <div className="flex items-center gap-2 mb-1">
            {live && <span className="live-dot" aria-hidden="true" />}
            <p className="section-label">{section}</p>
          </div>
        )}
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground text-sm mt-1">{description}</p>
        )}
      </div>

      {action && (
        <div className="shrink-0 flex items-start gap-2">{action}</div>
      )}
    </header>
  );
}
