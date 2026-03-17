# Light Mode Implementation Guide

## Overview

SkillBridge now supports both **Dark Mode (Obsidian)** and **Light Mode (Arctic)** themes. The theme system is built on CSS custom properties and integrates with `next-themes` for seamless switching.

## Theme Architecture

### Color Palettes

#### Dark Mode (Obsidian) - Default
```
Background:     #09090b (Zinc 950)
Card:           #18181b (Zinc 900)
Foreground:     #fafafa (Zinc 50)
Primary:        #259df4 (Neon Cyan)
Border:         #27272a (Zinc 800)
Muted:          #27272a (Zinc 800)
```

#### Light Mode (Arctic)
```
Background:     #fafafa (Zinc 50)
Card:           #ffffff (White)
Foreground:     #09090b (Zinc 950)
Primary:        #1e40af (Deep Blue)
Border:         #e4e4e7 (Zinc 200)
Muted:          #f4f4f5 (Zinc 100)
```

### File Structure

```
frontend/
├── app/
│   ├── globals.css          # Theme CSS variables
│   └── layout.tsx           # ThemeProvider configuration
└── components/
    └── layout/
        ├── app-shell.tsx     # Theme-aware container
        └── sidebar-nav.tsx   # Theme toggle + colors
```

## Usage

### Manual Theme Toggle

Users can toggle themes via the sidebar:
1. Navigate to the bottom of the sidebar
2. Click "Light Mode" or "Dark Mode"
3. Theme preference persists across sessions

### Programmatic Control

```tsx
import { useTheme } from "next-themes";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  return (
    <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      Toggle Theme
    </button>
  );
}
```

### CSS Usage

All theme-aware components use CSS variables:

```tsx
// ✅ Correct - uses theme variables
<div className="bg-background text-foreground border-border">
  Content
</div>

// ❌ Wrong - hardcoded colors
<div className="bg-[#09090b] text-[#fafafa]">
  Content
</div>
```

## Component Guidelines

### Cards & Containers

```tsx
// Dark & Light compatible
<Card className="bg-card border-border/50">
  <CardContent className="text-foreground">
    ...
  </CardContent>
</Card>
```

### Text Colors

```tsx
// Primary text
<h1 className="text-foreground">Title</h1>

// Secondary text  
<p className="text-muted-foreground">Description</p>

// Accent text
<span className="text-primary">Highlight</span>
```

### Borders & Dividers

```tsx
// Standard border
<div className="border border-border">...</div>

// Subtle border
<div className="border border-border/30">...</div>

// Primary accent border
<div className="border border-primary/20">...</div>
```

## Light Mode Specific Styles

### Shadows
Light mode uses softer, more diffuse shadows:
```css
.light {
  --shadow-opacity: 0.3;
  --shadow-blur: 12px;
  --shadow-color: hsl(240 5% 96%);
}
```

### Grid Pattern
Light mode has a more visible grid:
```css
.light body {
  background-image:
    linear-gradient(rgba(30, 64, 175, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(30, 64, 175, 0.06) 1px, transparent 1px);
}
```

### Glow Effects
Light mode glows are more subtle:
```css
.light .glow-primary {
  box-shadow: 0 0 15px rgba(30, 64, 175, 0.5);
}
```

## Testing Checklist

- [ ] All pages render correctly in both themes
- [ ] Text has sufficient contrast in light mode
- [ ] Icons are visible on both backgrounds
- [ ] Borders are visible but not harsh
- [ ] Hover states work in both themes
- [ ] Theme toggle persists preference
- [ ] No hardcoded colors break the theme

## Common Issues & Solutions

### Issue: Hardcoded background colors
```tsx
// ❌ Before
<div className="bg-[#09090b]">...</div>

// ✅ After
<div className="bg-background">...</div>
```

### Issue: Slate/gray color names
```tsx
// ❌ Before
<span className="text-slate-400">...</span>

// ✅ After
<span className="text-muted-foreground">...</span>
```

### Issue: White text everywhere
```tsx
// ❌ Before
<h1 className="text-white">...</h1>

// ✅ After
<h1 className="text-foreground">...</h1>
```

## Future Enhancements

1. **System Theme Detection**: Auto-switch based on OS preference
2. **High Contrast Mode**: Accessibility-focused variant
3. **Custom Accent Colors**: User-selectable primary colors
4. **Reduced Motion**: Respect prefers-reduced-motion

## Related Files

- `frontend/app/globals.css` - Theme variable definitions
- `frontend/app/layout.tsx` - ThemeProvider setup
- `frontend/components/layout/sidebar-nav.tsx` - Theme toggle UI
- `frontend/components/providers/theme-provider.tsx` - Theme context wrapper
