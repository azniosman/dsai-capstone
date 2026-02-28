/**
 * Shared chart color system for SkillBridge.
 *
 * Rules:
 * - Use CSS variables (var(--x)) for anything that must adapt to light/dark theme.
 * - Use semantic HSL literals ONLY for status colors that are intentionally fixed
 *   (green = success, amber = warning, red = error) — these are meaningful, not decorative.
 * - Never use raw hex values in chart components.
 */

// ─── Status colors (fixed semantic meanings) ────────────────────────────────

export const CHART_STATUS = {
  success: "hsl(145 60% 36%)",
  warning: "hsl(40 90% 45%)",
  error:   "hsl(5 78% 50%)",
  info:    "hsl(220 80% 55%)",
  flame:   "hsl(20 90% 55%)",
  purple:  "hsl(280 80% 55%)",
} as const;

// ─── Multi-series palette (line/bar charts with multiple data keys) ──────────

export const CHART_SERIES = [
  "hsl(var(--primary))",
  "hsl(40 90% 45%)",
  "hsl(145 60% 36%)",
  "hsl(280 80% 55%)",
  "hsl(5 78% 50%)",
  "hsl(200 80% 55%)",
] as const;

// ─── Axis and grid styles (spread onto Recharts props) ──────────────────────

export const CHART_AXIS = {
  tick:     { fill: "hsl(var(--muted-foreground))", fontSize: 11 } as const,
  tickBold: { fill: "hsl(var(--foreground))",       fontSize: 11 } as const,
  grid:     { stroke: "hsl(var(--border))", strokeDasharray: "3 3" } as const,
} as const;

// ─── Tooltip content style (passed to Recharts contentStyle prop) ────────────

export const TOOLTIP_STYLE: Record<string, string | number> = {
  backgroundColor: "var(--card)",
  border:          "1px solid var(--border)",
  borderRadius:    "8px",
  fontSize:        "11px",
  color:           "var(--foreground)",
  boxShadow:       "0 4px 12px hsl(240 4% 60% / 0.15)",
};

// ─── Gap severity → color mapping ───────────────────────────────────────────

export const GAP_COLOR: Record<string, string> = {
  none:   CHART_STATUS.success,
  low:    CHART_STATUS.info,
  medium: CHART_STATUS.warning,
  high:   CHART_STATUS.error,
};
