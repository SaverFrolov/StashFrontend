# QWEN.md — Mandatory execution directives

## Build & Test Rule
NEVER run the dev-server or long-running preview servers (`vite dev`, `vite preview`, `pnpm dev`, etc.).
Verify functionality solely through single-pass builds (`pnpm build` / `npm run build`) and type checking (`tsc --noEmit`, exposed as `pnpm typecheck`).

Не запускай dev-сервер, проверяй работоспособность только через разовую сборку `npm run build`.

## Dependency Versions
Use strict, modern latest stable versions for all packages: React 18+, Vite 5+, TanStack Query v5, Tailwind CSS 3.4, Radix UI primitives, Zod v3, react-i18next. No deprecated legacy packages.

## Monorepo Structure
Strict workspace boundaries via pnpm workspaces:
- `apps/web` — the web app / PWA
- `apps/extension` — Chromium MV3 extension
- `packages/ui` — design tokens + shared components
- `packages/api-client` — types, ApiClient interface, MockApi, RestApi

## Error Recovery
If a build or type error occurs: inspect the output, fix the TypeScript/React code directly, re-run the build. Commit checkpoints frequently (`git add -A && git commit`) after each working phase.

## Spec
The full product specification is `frontend_v2.docx` (provided by the user). Where something is unspecified, choose the simplest conventional option and record the choice in README.md.
