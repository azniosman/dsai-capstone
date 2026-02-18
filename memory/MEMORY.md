# Project Memory — SkillBridge AI Frontend

## Theme System
- Tailwind CSS 4 (no tailwind.config.js) — all tokens live in `app/globals.css` via `@theme inline {}` and CSS custom properties
- Dark mode via `.dark` class (next-themes, default: dark)
- **Current accent: Electric Cyan** `hsl(190 100% 50%)` in dark mode, deep teal `hsl(194 90% 30%)` in light
- Radius: `0.375rem` (smaller than shadcn default for data-precision feel)

## Key Design Tokens (dark mode)
- bg: `218 22% 7%`, card: `218 20% 11%`, border: `218 16% 20%`
- primary: `190 100% 50%` (#00d4ff), primary-fg: `218 22% 7%` (dark text on cyan)
- sidebar: `218 22% 5%` (darkest layer)

## Component Variants
- `Card`: default, elevated, kpi, panel, ghost, **data** (top accent stripe), **metric** (left accent bar), **highlight** (tinted), **inset** (darker bg)
- `Button`: default, destructive, outline (border-2), secondary, ghost, link, accent, muted, **danger**
- `Badge`: default, secondary, destructive, outline, accent, success, warning, muted, **data** (mono), **rank**

## Utility Classes (globals.css)
- `.section-label` — tight uppercase 0.625rem caps
- `.kpi-number` / `.kpi-number-accent` — 2.75rem tabular-nums bold
- `.data-num` — tabular-nums inline
- `.trend-up` / `.trend-down` — green/red delta indicators
- `.hover-lift` — translateY(-1px) on hover
- `.live-dot` — animated green pulse dot for real-time status
- `.score-bar-track` / `.score-bar-fill` — 3px progress bar pair

## Sidebar
- Active item: `bg-primary/15 text-primary border-l-[3px] border-primary font-semibold`
- Collapsed width: 64px, expanded: 240px

## Workflow Notes
- Run `npm run lint` then `npx tsc --noEmit` to validate before committing
- Pre-existing lint errors in peers/projects/recommendations pages (not ours to fix)
- ESLint flags `void value;` as acceptable for intentionally-ignored callback params
