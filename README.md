# Stash — universal personal inbox (frontend)

**Stash** is a universal "personal inbox": save links, text notes, PDF/DOCX files and voice notes from a browser, desktop or phone into one store. The system keeps the original, extracts text, and an AI model adds an annotation and tags. The UI captures, organizes and retrieves — it is not a chatbot.

Built from the specification in `frontend_v2.docx`. Backend is out of scope: the app talks to an `ApiClient` interface with a full-featured `MockApi` (in-memory + localStorage, simulated processing pipeline).

## Repository layout (pnpm monorepo)

```
apps/web            — React 18 + Vite web app / PWA (screens S1–S12)
apps/extension      — Chromium MV3 extension (popup E1, options E2, context menus)
packages/ui         — design tokens (CSS variables), Tailwind preset, Radix-based components
packages/api-client — types, Zod schemas, ApiClient interface, MockApi, RestApi, seed data
scripts/gen-icons.mjs — dependency-free PNG icon generator
docs/design-tokens.md — token reference
```

## Requirements

- Node.js 18+ (tested on Node 24)
- pnpm 9 (`corepack enable pnpm`)

## Run

```bash
pnpm install
pnpm --filter @inbox/web dev        # dev server (http://localhost:5173)
```

Per `QWEN.md`, automated verification never starts dev servers — use single-pass builds:

```bash
pnpm build        # typecheck + production build for all packages
pnpm typecheck    # tsc --noEmit everywhere
pnpm test         # Vitest (plural formatter + status-to-label mapping)
```

Demo login: any email + any password (MockApi accepts everything). The store is seeded with 16 domain-diverse items, 3 collections and ~12 tags. Data persists in `localStorage` (`inbox-mock-db-v1`).

## Switching to the real API

Create `apps/web/.env.local`:

```
VITE_API_BASE_URL=https://your-fastapi-host/api
```

When `VITE_API_BASE_URL` is set, `createApiClient()` returns `RestApi` (Bearer-token auth, JSON endpoints mirroring the `ApiClient` interface); otherwise it returns `MockApi`. No code changes needed.

The extension stores its server URL and API token on its options page (Settings → Capture in the web app explains where to create tokens).

## Adding a locale

1. Copy `apps/web/src/locales/en.json` to `apps/web/src/locales/<lang>.json` and translate the values (keys must stay identical).
2. Register it in `apps/web/src/i18n.ts`: add the code to `SUPPORTED_LANGUAGES` and an entry to `resources`.
3. Add the language option in `SettingsScreen` → Appearance (`appearanceLanguage` select).

Nothing else references individual strings; plural forms are handled by `Intl.PluralRules` via i18next `_one/_few/_many/_other` keys.

## Loading the extension unpacked

1. `pnpm --filter @inbox/extension build` — output goes to `apps/extension/dist`.
2. Open `chrome://extensions` (Chrome, Yandex Browser or Edge).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select `apps/extension/dist`.
5. Open the extension options, set the server URL and API token.

## PWA / phone

The web app is a PWA (`vite-plugin-pwa`): install prompt banner, home-screen shortcut, and a Web Share Target — the phone share sheet can send links/text/files to `/capture`. In production, serve over HTTPS for the service worker to register.

## Feature flags

`packages/api-client/src/config.ts` exports `features`:

| Flag | Effect when false |
| --- | --- |
| `features.audio` | mic button and Audio feed filter are hidden |
| `features.semanticSearch` | "Meaning" search mode is hidden |
| `features.export` | export buttons/dialogs are hidden |

## Recorded decisions (unspecified in the spec → simplest conventional choice)

- **Bundler for the extension**: Vite MPA build (popup + options pages); the service worker `background.js` is plain JS copied from `public/` — no CRX tooling needed.
- **Icons**: generated solid-color PNGs (`scripts/gen-icons.mjs`) — accent square with a white "save to inbox" glyph; replace freely.
- **Font**: Inter Variable via `@fontsource-variable/inter` (self-hosted npm package, Latin + Cyrillic subsets, no CDN).
- **Router data flow**: TanStack Query for all reads; MockApi emits `inbox:mock-item-updated` window events which invalidate queries so pipeline statuses update live.
- **Auth**: MockApi accepts any credentials and persists a fake session in localStorage; `RequireAuth` redirects to `/login` and preserves the target path.
- **Item detail on wide screens**: `/items/:id` renders the feed (480 px) + detail split at ≥1280 px; below that it is a full page with a back button.
- **Export**: MockApi produces a JSON or Markdown download (no real ZIP packaging of originals — originals stay referenced by URL inside the JSON).
- **`APP_NAME`**: `"Stash"` from `packages/api-client/src/config.ts`.
- **Keyboard shortcuts** (M14 sheet): `⌘K/Ctrl+K` palette, `?` shortcuts sheet; the sheet also lists composer shortcuts (Enter/Shift+Enter).
