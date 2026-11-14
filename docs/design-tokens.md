# Design tokens — Liquid Glass edition

Single source of truth: `packages/ui/src/tokens.css` (CSS variables) + `packages/ui/src/tailwind-preset.ts` (Tailwind mapping). Themes: `data-theme="light" | "dark" | "system"` on `<html>`; system honors `prefers-color-scheme`.

Character (updated 2026-11-14 at the user's request; supersedes spec section 8 palette, structure and typography kept): **liquid glass** — translucent frosted panels over an ambient green aurora background, specular glass rims, soft depth, glowing green primary actions. The green accent is preserved as the single accent colour. Body text meets WCAG AA in both themes (text tokens stay high-contrast; only surfaces are translucent).

## Glass system

| Token | Light | Dark | Purpose |
| --- | --- | --- | --- |
| `--surface` | `rgb(244 250 246 / 0.66)` | `rgb(22 34 28 / 0.55)` | Translucent panel background (green-tinted, no white) |
| `--surface-subtle` | `rgb(234 244 237 / 0.45)` | `rgb(30 44 37 / 0.45)` | Subtle translucent fill (hover, insets) |
| `--glass-border` | `rgb(14 124 102 / 0.18)` | `rgb(63 181 155 / 0.16)` | Green-tinted hairline on raised panels |
| `--glass-blur` | `20px` | `20px` | Frosted blur amount |
| `--glass-saturate` | `160%` | `160%` | Backdrop saturation boost |
| `--aurora-image` | green radial washes | deeper green washes | Ambient background (fixed attachment) |
| `--shadow-pop` | `0 8px 32px rgb(10 45 35 / 0.18)` | `0 8px 32px rgb(0 0 0 / 0.55)` | Soft depth for raised glass |
| `--shadow-glow` | `0 4px 18px rgb(14 124 102 / 0.4)` | `0 4px 18px rgb(63 181 155 / 0.35)` | Green glow for primary actions |

Mechanics (all in `tokens.css`):
- `body` and every `.bg-bg` element paint `--aurora-image` over `--bg` with `background-attachment: fixed`, so glass panels blur a stable ambient wash.
- Every `.bg-surface` element automatically gets `backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate))` — no per-component blur classes needed.
- `.glass-rim` adds the soft `--shadow-pop` depth only (no specular white inset lines — removed per user feedback; every hairline in the app is green-tinted, white is not used anywhere except text on accent buttons).
- Brighter green outlines (`border-accent/40`) are reserved for the sticky date separator chips and the search entry points (search screen input, header palette trigger).

## Color tokens

| Token | Light | Dark | Purpose |
| --- | --- | --- | --- |
| `--bg` | `#EAF2EC` | `#0A120E` | Base background under the aurora |
| `--border` | `rgb(14 124 102 / 0.14)` | `rgb(63 181 155 / 0.12)` | Hairline separators inside panels (green-tinted) |
| `--border-strong` | `rgb(14 124 102 / 0.28)` | `rgb(63 181 155 / 0.22)` | Emphasized border (inputs) |
| `--text` | `#12211B` | `#E9F0EA` | Primary text |
| `--text-secondary` | `#46554E` | `#A5B4AA` | Secondary text |
| `--text-tertiary` | `#5F6F67` | `#85938A` | Muted/tertiary text |
| `--accent` | `#0E7C66` | `#3FB59B` | Primary action & highlight (green, unchanged) |
| `--accent-hover` | `#0A6552` | `#5CC7AF` | Accent hover / gradient bottom stop |
| `--accent-subtle` | `rgb(14 124 102 / 0.12)` | `rgb(63 181 155 / 0.16)` | Accent tint background (selected rows) |
| `--success` | `#1A7F4B` | `#4CC38A` | Success indicator |
| `--warning` | `#9A6700` | `#E3B341` | Warning indicator |
| `--danger` | `#B42318` | `#F97066` | Destructive/error indicator |

Tailwind classes: `bg-bg`, `bg-surface`, `bg-surface-subtle`, `border-glass-border`, `border-border`, `border-border-strong`, `text-text`, `text-text-secondary`, `text-text-tertiary`, `bg-accent`, `text-accent`, `bg-accent-subtle`, `shadow-pop`, `shadow-glow`, `rounded-control`, `rounded-dialog`, etc.

Primary buttons: vertical gradient `from-accent to-accent-hover` + `shadow-glow` + `hover:brightness-110`. Secondary buttons: glass (`bg-surface` + `border-glass-border` + `shadow-pop`).

Status is **never colour alone**: `StatusChip` always renders icon + plain-text label (`packages/ui/src/lib/status-meta.ts` maps status → label key, tone, icon; covered by tests).

## Typography (unchanged)

- **Font**: Inter Variable, self-hosted (`@fontsource-variable/inter`, Latin + Cyrillic), fallback `system-ui, "Segoe UI", Roboto, sans-serif`. Monospace (system) only for URLs, tokens, code.
- **Scale** (Tailwind `fontSize`, px/line-height): `xs` 12/16, `sm` 13/18, `base` 14/20 (default UI), `md` 16/24, `lg` 18/26, `xl` 22/28, `2xl` 28/34, `reading` 16/26 (extracted text & notes, measure 65–75 ch).
- **Weights**: 400 / 500 / 600 only. Sentence case everywhere; no all-caps. Tabular figures for dates and counts (`.tnum`, `font-variant-numeric: tabular-nums`).

## Spacing, grid, shape

- **Base unit** 4 px; steps 4, 8, 12, 16, 24, 32, 48, 64 (default Tailwind spacing scale).
- **Containers** (Tailwind `maxWidth`): feed & composer `max-w-feed` 720 px, item detail `max-w-detail` 760 px, settings `max-w-settings` 640 px, auth form `max-w-auth-form` 400 px. Breakpoints 640 / 768 / 1024 / 1280 (Tailwind defaults).
- **Controls**: 36 px high desktop (`h-9`), 44 px min touch targets mobile (`max-sm:h-11`). List rows: 12 px vertical padding, 1 px hairline dividers.
- **Radii** (increased for the glass look): `rounded-control` 10 px (controls, chips), `rounded-dialog` 18 px (dialogs, popovers, raised panels). Fully-rounded only for the avatar.
- **Elevation**: glass rims + `--shadow-pop`; `--shadow-glow` only on primary actions. No nested opaque cards — inner panels stay translucent.
- **Icons**: lucide, 20 px (16 px dense rows), `strokeWidth={1.5}`, outline only.
- **Motion**: 120–180 ms (`duration-150`) `ease-out` on opacity/transform/filter only; `prefers-reduced-motion` disables transitions globally. No looping animation.
- **Focus**: 2 px accent ring, 2 px offset, on `:focus-visible` (defined in tokens.css).
- **Sidebar**: `--sidebar-width` 264 px, `--sidebar-rail-width` 64 px — glass panel over the aurora.
- **Safe areas**: body padding + composer padding use `env(safe-area-inset-*)`.
- **Modal overlays**: `bg-black/30 backdrop-blur-sm` (frosted dimming).

## Performance notes

- `backdrop-filter` is applied to panels via a single `.bg-surface` rule; feed rows are translucent panels over a fixed background — avoid adding blur to deeply nested small elements.
- The aurora is painted once per themed root (`body`, `.bg-bg`), not per component.
