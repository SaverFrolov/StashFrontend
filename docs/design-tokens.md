# Design tokens

Single source of truth: `packages/ui/src/tokens.css` (CSS variables) + `packages/ui/src/tailwind-preset.ts` (Tailwind mapping). Themes: `data-theme="light" | "dark" | "system"` on `<html>`; system honors `prefers-color-scheme`.

Character: calm, neutral, utilitarian. One accent colour only for primary actions, links, focus rings, selected states and the user-comment rule. Everything else is neutral. Body text meets WCAG AA in both themes.

## Color tokens

| Token | Light | Dark | Purpose |
| --- | --- | --- | --- |
| `--bg` | `#FAFAF9` | `#151514` | Application background |
| `--surface` | `#FFFFFF` | `#1C1C1B` | Primary card & surface background |
| `--surface-subtle` | `#F4F4F2` | `#242422` | Secondary/subtle background |
| `--border` | `#E4E4E0` | `#333330` | Default border |
| `--border-strong` | `#CFCFC9` | `#46463F` | Emphasized border |
| `--text` | `#1C1C1A` | `#ECECE8` | Primary text |
| `--text-secondary` | `#5C5C57` | `#A8A8A1` | Secondary text |
| `--text-tertiary` | `#6B6B65` | `#8A8A83` | Muted/tertiary text |
| `--accent` | `#0E7C66` | `#3FB59B` | Primary action & highlight |
| `--accent-hover` | `#0A6552` | `#5CC7AF` | Accent hover state |
| `--accent-subtle` | `#E6F3EF` | `#17302A` | Accent tint background |
| `--success` | `#1A7F4B` | `#4CC38A` | Success indicator |
| `--warning` | `#9A6700` | `#E3B341` | Warning indicator |
| `--danger` | `#B42318` | `#F97066` | Destructive/error indicator |

Tailwind classes: `bg-bg`, `bg-surface`, `bg-surface-subtle`, `border-border`, `border-border-strong`, `text-text`, `text-text-secondary`, `text-text-tertiary`, `bg-accent`, `text-accent`, `bg-accent-subtle`, `text-success`, `text-warning`, `text-danger`, etc.

Status is **never colour alone**: `StatusChip` always renders icon + plain-text label (`packages/ui/src/lib/status-meta.ts` maps status → label key, tone, icon; covered by tests).

## Typography

- **Font**: Inter Variable, self-hosted (`@fontsource-variable/inter`, Latin + Cyrillic), fallback `system-ui, "Segoe UI", Roboto, sans-serif`. Monospace (system) only for URLs, tokens, code.
- **Scale** (Tailwind `fontSize`, px/line-height): `xs` 12/16, `sm` 13/18, `base` 14/20 (default UI), `md` 16/24, `lg` 18/26, `xl` 22/28, `2xl` 28/34, `reading` 16/26 (extracted text & notes, measure 65–75 ch).
- **Weights**: 400 / 500 / 600 only. Sentence case everywhere; no all-caps. Tabular figures for dates and counts (`.tnum`, `font-variant-numeric: tabular-nums`).

## Spacing, grid, shape

- **Base unit** 4 px; steps 4, 8, 12, 16, 24, 32, 48, 64 (default Tailwind spacing scale).
- **Containers** (Tailwind `maxWidth`): feed & composer `max-w-feed` 720 px, item detail `max-w-detail` 760 px, settings `max-w-settings` 640 px, auth form `max-w-auth-form` 400 px. Breakpoints 640 / 768 / 1024 / 1280 (Tailwind defaults).
- **Controls**: 36 px high desktop (`h-9`), 44 px min touch targets mobile (`max-sm:h-11`). List rows: 12 px vertical padding, 1 px dividers.
- **Radii**: `rounded-control` 6 px (controls, chips), `rounded-dialog` 10 px (dialogs, popovers). No other radii; fully-rounded only for the avatar.
- **Elevation**: 1 px borders; a single soft shadow token `shadow-pop` for popovers, dialogs and toasts only. No nested cards.
- **Icons**: lucide, 20 px (16 px dense rows), `strokeWidth={1.5}`, outline only.
- **Motion**: 120–180 ms (`duration-150`) `ease-out` on opacity/transform only; `prefers-reduced-motion` disables transitions globally.
- **Focus**: 2 px accent ring, 2 px offset, on `:focus-visible` (defined in tokens.css).
- **Sidebar**: `--sidebar-width` 264 px, `--sidebar-rail-width` 64 px.
- **Safe areas**: body padding + composer padding use `env(safe-area-inset-*)`.
