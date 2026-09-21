# Nexora Client — Build Conventions (READ FIRST)

You are building pages for the new Nexora React client at `/Users/gurudeeppaidipati/Desktop/Projects/nexora/client`.
Follow these conventions exactly so all pages feel like one product.

## Stack
- React 19 + TypeScript + Vite. Tailwind CSS v4 (no tailwind.config — tokens live in `src/index.css` `@theme`).
- `motion` package (import from `motion/react`) for animation. `lucide-react` for icons. `recharts` for charts.
- `@monaco-editor/react` for the code editor. `socket.io-client` via `useSocket()` from `@/lib/socket`.
- Path alias: `@/` → `src/`.

## Design language — "Synthwave Rift"
- Dark-first. Background `bg-background` (#0F0F23), cards `bg-surface`, raised `bg-surface-2`.
- Primary violet `primary` (#7C3AED) / `primary-bright` (#A78BFA), accent rose `accent` (#F43F5E), `cyan`, plus
  `success/warning/info/destructive/gold/streak` tokens. NEVER hardcode hex — always use token classes.
- Display font: `font-display` (Russo One) for page titles, section headers, numbers-with-attitude.
  Body: default `font-body` (Chakra Petch). Code/timers/numbers in tables: `font-mono` + `tabular-nums`.
- Signature effects (use sparingly, purposefully):
  - `glow-text` / `glow-accent-text` — neon text shadow for hero titles only.
  - `glow-box` / `glow-box-accent` — neon box shadow for primary CTAs / featured cards.
  - `card-neon` — the standard card surface (built into `<Card>`).
  - `grid-bg` — background grid (already in AppLayout; don't repeat per page).
  - `text-gradient` — gradient text for special highlights (level-ups, brand).
  - `skeleton` — loading shimmer (use `<Skeleton>`/`<LoadingBlock>`).
- Radii: cards 0.875rem (rounded-xl-ish via card-neon), controls rounded-lg. Borders: 1px `border-border`.
- Motion rules: 150–300ms micro-interactions, spring ease `[0.34,1.56,0.64,1]` for pop-ins,
  exit ≈ 60–70% of enter duration, stagger lists 30–50ms, respect `prefers-reduced-motion` (global CSS handles it).
- Uppercase + `tracking-wider` for small labels (11px, `text-foreground-faint`).

## Components — use, don't reinvent
Import from `@/components/ui`:
`Button` (variants: primary|accent|outline|ghost|subtle|danger|link; sizes sm|md|lg|icon|icon-sm; `loading` prop),
`Card` (+Header/Title/Description/Content/Footer; props `glow`, `interactive`),
`Badge` (variants default|primary|accent|success|warning|danger|info|cyan|gold|outline), `DifficultyBadge`,
`Input`/`Textarea`/`Select`/`Label`/`Field` (Field takes label/error/hint),
`Skeleton`/`Progress`/`XpBar`, `Modal`/`ConfirmDialog`, `Tabs` (variants underline|pills),
`useToast()` (success/error/warning/info), `EmptyState`/`LoadingBlock`/`ErrorState`,
`Table`/`THead`/`TBody`/`TR`/`TH`/`TD`, `Tooltip`, `Avatar` (src/name/size/online), `StatCard`, `PageHeader`.
Shared: `PlatformBadge`, `VerdictBadge` from `@/components/shared/PlatformBadge`.

Every page starts with `<PageHeader title=… subtitle=… actions=… />` unless it's a full-bleed view (Solve IDE).

## Data & state
- API: `api.get/post/put/delete` from `@/lib/api` — credentials included, throws `ApiError(status, message)`.
  Query params via `{ query: {...} }`. Errors surface as `err.message` — show via `useToast()` or `<ErrorState>`.
- Fetching: `useApi(fetcher, deps)` from `@/hooks/useApi` → `{ data, loading, error, refetch }`.
  Render `<LoadingBlock>` while loading, `<ErrorState onRetry>` on error, `<EmptyState>` when empty.
- Auth: `useAuth()` from `@/context/AuthContext` → `{ user, loading, refresh, login, register, logout }`.
  Call `refresh()` after actions that change XP/streak so the sidebar updates.
- Sockets: `useSocket()` may be null before connect — always guard.
- API contract: see `.ui-rebuild/api-catalog.md` in the repo root (`nexora/.ui-rebuild/api-catalog.md`).
  Bind to the exact field names there. If the catalog and reality disagree, the running server wins — test with curl.

## Quality bar
- TypeScript strict: no `any` unless unavoidable; type every API response you consume.
- Accessibility: aria-labels on icon buttons, `role="tablist"/"dialog"` etc. already in primitives — don't strip them.
  Contrast ≥ 4.5:1 for body text. Focus rings are global — never `outline-none` without a replacement.
- Responsive: pages must work at 375px → 1440px. Grids: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` style patterns.
  Tables: horizontal scroll wrapper is built into `<Table>`.
- No emoji as icons. SVG (lucide) only.
- Keep page files under ~500 lines; split subviews into `src/components/<page>/…`.
- Default-export page components; they're lazy-loaded from `src/App.tsx` — keep that pattern.

## Routes (already wired in App.tsx)
/hub /problems /solve/:id /contests /workshop /nexus /analytics /achievements /ailab /learn /social
/submissions /bookmarks /profile /settings /auth + 404.
