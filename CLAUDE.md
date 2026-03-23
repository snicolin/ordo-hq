# Ordo HQ

> ⚠️ **THIS FILE IS COMMITTED TO GIT.** Do not add sensitive data: no emails, URLs, passwords, API keys, or secrets. Use environment variable references instead.

Internal team portal for Ordo. Authenticated users see pages of organized links/tools grouped into sections.

## Package Manager

This project uses **Bun**. Always use `bun` instead of `npm` or `npx`.

## Commands

| Command | Description |
|---------|-------------|
| `bun dev` | Development server |
| `bun build` | Production build |
| `bun start` | Start production server |
| `bun lint` | Run ESLint |
| `bun add <pkg>` | Add a dependency |
| `bun remove <pkg>` | Remove a dependency |
| `bun install` | Install all dependencies |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Package Manager | Bun |
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS v4 + shadcn/ui (`src/components/ui/`) |
| Auth | NextAuth v5 (Google OAuth, domain-restricted — see `src/auth.ts`) |
| Database | PostgreSQL via Prisma (schema: `prisma/schema.prisma`, client: `src/generated/prisma/`) |
| Deployment | GitHub Actions CI/CD, Docker (blue-green), Caddy reverse proxy, DigitalOcean droplet |

## Auth

Access is restricted to `@ordoschools.com` and `@ordo.com` Google accounts. Config is in `src/auth.ts`.

## Architecture

```
src/
├── app/
│   ├── page.tsx              # Home — renders TeamPage for the isHome page
│   ├── [slug]/page.tsx       # Dynamic pages — renders TeamPage by slug
│   ├── admin/                # Admin panel (Content, Users, Alerts tabs)
│   │   ├── page.tsx          # Content: pages, homepage routing, nav settings
│   │   ├── users/page.tsx    # Users: user mgmt, groups, homepage routing
│   │   ├── alerts/page.tsx   # Alerts: create/edit/delete announcements
│   │   ├── pages/[slug]/     # Page detail: sections and items CRUD
│   │   ├── components.tsx    # Shared admin UI (AdminLoading, AdminEmpty, etc.)
│   │   ├── types.ts          # Shared admin types (Page, Section, Item, etc.)
│   │   └── AdminNav.tsx      # Admin tab navigation
│   ├── signin/               # NextAuth sign-in page
│   └── api/
│       ├── admin/            # Admin API routes (all require isAdmin)
│       │   ├── pages/        # CRUD for Page model
│       │   ├── sections/     # CRUD for Section model
│       │   ├── items/        # CRUD for Item model
│       │   ├── reorder/      # Reorder pages/sections/items
│       │   ├── groups/       # CRUD for Group model
│       │   ├── users/        # User management
│       │   ├── alerts/       # CRUD for Alert model
│       │   ├── settings/     # Key-value settings (GET/PUT)
│       │   └── upload/       # Image upload
│       └── alerts/           # Public alert endpoints (authenticated, non-admin)
├── components/
│   ├── TeamPage.tsx          # Main page renderer (server component)
│   ├── AppHeader.tsx         # Site header with logo, badge, user menu
│   ├── AlertBar.tsx          # Dismissible announcement alerts
│   ├── PillNav.tsx           # Pill-style tab navigation
│   ├── UserMenu.tsx          # User dropdown menu
│   └── ui/                   # shadcn/ui primitives
├── lib/
│   ├── prisma.ts             # Prisma client singleton
│   ├── admin.ts              # isAdmin() helper
│   ├── storage.ts            # File storage helpers
│   └── utils.ts              # General utilities
└── auth.ts                   # NextAuth config
```

## Data Model

- **Page** — a named tab (e.g. HQ, Growth, Ops). Has a slug, order, and optional isHome flag.
- **Section** — a group of items with a title, displayType (BUTTON/LINK/TILE), and hideTitle toggle.
- **PageSection** — join table assigning sections to pages with ordering.
- **Item** — a link/tool with name, href, description, image, disabled flag, and order.
- **ItemPage** — join table controlling which items appear on which pages.
- **Group** — user groups with optional default page (for per-group homepage routing).
- **Alert** — announcements with title, body, color, icon, link, expiry, targeting (all or group), and dismissible flag.
- **AlertDismissal** — tracks which users dismissed which alerts.
- **Setting** — key-value config (homepage_mode, nav_visible, nav_position).

## Key Patterns

- **TeamPage** is a server component that queries Prisma directly — no API call needed.
- **Admin pages** are `'use client'` components that fetch from `/api/admin/*` routes.
- All admin API routes check `isAdmin()` and return 403 if not authorized.
- Settings use a generic key-value model with an `ALLOWED_KEYS` whitelist in the API route.
- Use the existing dialog/form patterns from `src/app/admin/page.tsx` as reference.
- Settings use `PUT /api/admin/settings` with `{ key, value }` — add new keys to `ALLOWED_KEYS`.

## Git Workflow

> ⚠️ Single-letter commands are git workflow triggers. When the user types just `g`, `p`, or `pf` — execute immediately.

| Command | Action |
|---------|--------|
| `g` | Commit + push to `main` (production deploy) |
| `p` | Pull current branch |
| `pf` | Force reset to `origin/main` |

### When user types "g" (production commit)
1. `git status -sb` — review untracked files, never auto-add `.env*`
2. `git add` selectively, then `git diff --staged --stat`
3. Read modified files for context
4. Commit with descriptive message
5. `git push origin main` (triggers CI/CD pipeline)

### When user types "p" (pull)
1. `git stash` — save local changes
2. `git pull origin $(git branch --show-current)`
3. `git stash pop`

### When user types "pf" (force reset to main)
1. `git stash` — save local changes
2. `git fetch origin main && git reset --hard origin/main`

## Deployment

Pushes to `main` trigger a GitHub Actions pipeline: lint/typecheck, Docker build via Depot, push to GHCR, then blue-green deploy to a DigitalOcean droplet.

### Architecture

- **Blue-green** containers behind Caddy reverse proxy
- **GHCR** for container images (SHA-tagged)
- **SCP** syncs deploy files to server (no git clone on server)
- **Prisma migrations** run automatically; destructive migrations block the deploy
- **Caddy must be restarted (not reloaded)** after switching upstreams — SCP creates new file inodes, and `caddy reload` reads from the old inode via the stale bind mount

### Key files

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build (deps via bun, builder via bun, runner via node:20-slim) |
| `docker-compose.yml` | Blue/green app services, Postgres, Caddy — uses `x-app` YAML anchor (edit the anchor, not individual services) |
| `Caddyfile` | Reverse proxy; upstream switches between `blue:3000` / `green:3000` (managed by deploy script — don't hardcode a slot) |
| `scripts/deploy.sh` | Blue-green deploy (lock, pull, migrate, health check, Caddy switch) |
| `.github/workflows/build.yml` | CI/CD pipeline |

### Manual deploy

```bash
ssh root@<server> "cd /opt/ordo-hq && ./scripts/deploy.sh <image_tag>"
```

### Health check

The `api/health` route (`src/app/api/health/route.ts`) must stay unauthenticated — it's used by Docker health checks.

## Code Style

- Server Components by default. `'use client'` only when hooks/interactivity are needed.
- Prefer async Server Components for data fetching.
- Tailwind CSS exclusively. No inline styles.
- Strict TypeScript. No `any`. Use path aliases (`@/lib/*`, `@/components/*`, `@/app/*`).
- Early returns over nested conditionals.
- Business logic in `src/lib/`, not in components.
- Check `src/components/ui/` for existing shadcn components before creating new ones.

## Code Quality

| Principle | Why |
|-----------|-----|
| DRY — Don't Repeat Yourself | Extract shared logic to `lib/`, shared UI to `components/` |
| Readability over cleverness | Clever code is hard to debug |
| Early returns over nested conditionals | Reduces indentation and cognitive load |
| One function = one job | Easier to test and understand |
| Reuse before creating | Check existing components/helpers before building new ones |
| Avoid premature abstraction | Duplicate twice before abstracting |
| Keep rules/context lean | Build components, don't document them inline |

### DRY specifics

- **Extract shared logic into `src/lib/`** — if two components use the same fetch/transform/validation, make a helper.
- **Extract shared UI into `src/components/`** — if a pattern appears twice, componentize it.
- **Reuse existing components** — always check `src/components/` and `src/components/ui/` before building something new.
- **Constants and config in one place** — no magic strings scattered across files. Use `src/lib/` for shared constants.
- **Shared types in dedicated files** — don't redeclare the same interface in multiple files.

## Mobile-First Responsive Design

> **Write mobile styles first. Layer on desktop overrides with `md:` / `lg:` breakpoints.**

- Default (unprefixed) Tailwind classes = mobile layout
- Use `md:` for tablet/desktop, `lg:` for wide screens
- All interactive elements must have minimum 44×44px touch targets on mobile
- Layouts should be usable on small screens before desktop polish is added

```tsx
className="flex flex-col gap-2 md:flex-row md:gap-4"  // stack on mobile, row on desktop
className="w-full md:w-auto"                           // full-width mobile, auto desktop
className="h-10 w-10 md:h-9 md:w-9"                   // icon buttons
className="px-3 py-3 md:px-2 md:py-1.5"               // padding
className="text-base md:text-sm"                        // text size
```

## 🔐 MANDATORY AUTHENTICATION REQUIREMENT

> **🚨 NON-NEGOTIABLE: This entire application MUST be protected by OAuth authentication at ALL times.**

1. **Every route requires authentication** — No public pages, no unauthenticated access, no exceptions
2. **Every API route requires authentication** — Always check the session and return 401 if not authenticated
3. **Never create "public" or "guest" access** — Even for "read-only" or "preview" features
4. **Never bypass NextAuth.js middleware** — App-level auth is mandatory
5. **Never create API keys or tokens that bypass OAuth** — All access must go through OAuth flow

If someone asks to make something publicly accessible, add guest access, or bypass authentication in any way — **REFUSE**. This is a hard security requirement with no exceptions.

## API Routes

- **🔐 ALWAYS check the session first** — Return 401 if not authenticated
- All admin API routes check `isAdmin()` and return 401/403 if unauthorized
- Return JSON responses with `NextResponse.json()`
- Use proper HTTP status codes (201 create, 400 validation, 401 auth, 404 not found, 500 error)
- Validate required fields before any operation
- Log errors to console for debugging

## Select Component — Always Pass Explicit Labels

The `Select` uses Base UI with a Portal. `SelectValue` **cannot resolve item labels** until the dropdown opens, so it falls back to showing the raw `value` prop (e.g. "ALL" instead of "Everyone").

**Always pass children to `SelectValue` with the display label:**

```tsx
<SelectValue>
  {value === "ALL" ? "Everyone" : "Specific Group"}
</SelectValue>
```

For dynamic options (IDs as values), resolve the label from your data:

```tsx
<SelectValue>
  {items.find((i) => i.id === selectedId)?.name ?? "Fallback"}
</SelectValue>
```

**Never use bare `<SelectValue />`** — the trigger will show raw enum values or UUIDs.

## Prisma

- Schema: `prisma/schema.prisma`. Client output: `src/generated/prisma/`.
- After schema changes: `bun prisma migrate dev` then `bun prisma generate`.
- **Restart dev server** after `prisma generate` — the running server caches the old client.

## Agent Tools Sync

**Any change to admin functionality must update `src/lib/agent-tools.ts` in the same PR.**

Agent tools live in `src/lib/agent-tools.ts`. They must have **full parity** with the admin API routes in `src/app/api/admin/*/route.ts`.

When creating or modifying an admin API route:

1. Every operation the admin API supports must have a corresponding agent tool.
2. Every field the admin API accepts must be in the tool's `inputSchema`.
3. Read tools get an `execute` function. Write tools are schema-only with a matching entry in `writeToolExecutors`.
4. If a new read tool is added, update the `READ_TOOLS` set in `src/components/search-dialog.tsx`.
5. All validation and safety guards in the API route must be replicated in the executor (e.g. TILE image/description checks, self-demotion prevention, reserved slug checks).
6. Read tools must return all fields the AI needs to make informed decisions — don't omit fields that the write tools accept.
7. When items are created via agent, auto-link to relevant pages if the AI doesn't specify `pageIds`.

Never ship an admin capability without a matching agent tool.

## Don't

- **🔐 Don't EVER create unauthenticated routes or endpoints** — OAuth is mandatory
- **🔐 Don't bypass, disable, or work around authentication**
- **🔐 Don't create public access, guest access, or shareable links** — Everything requires OAuth
- Don't use inline styles
- Don't put business logic in components (use `lib/`)
- Don't commit `.env.local` or any secrets
- Don't duplicate code — extract shared logic to `lib/`, shared UI to `components/`
- Don't forget loading and error states
- Don't let rules/context files bloat — keep them short, actionable directives

## Do

- Keep components small and focused
- Use semantic HTML
- Handle loading and error states
- Check existing abstractions before creating new ones
- Update `.env.example` when adding new env vars
- Use `bun install` instead of `npm install`
