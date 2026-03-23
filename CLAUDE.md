# Ordo HQ

> ⚠️ **THIS FILE IS COMMITTED TO GIT.** Do not add sensitive data: no emails, URLs, passwords, API keys, or secrets. Use environment variable references instead.

Internal team portal for Ordo.

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

## Tech Stack

| Layer | Technology |
|-------|------------|
| Package Manager | Bun |
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS v4 |
| Auth | NextAuth v5 (Google OAuth, domain-restricted) |

## Auth

Access is restricted to `@ordoschools.com` and `@ordo.com` Google accounts. Config is in `src/auth.ts`.

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
| `Dockerfile` | Multi-stage build (deps, builder, runner) |
| `docker-compose.yml` | Blue/green services, Postgres, Caddy |
| `Caddyfile` | Reverse proxy config (upstream switches between blue/green) |
| `scripts/deploy.sh` | Blue-green deploy script (lock, migrate, health check, switch) |
| `.github/workflows/build.yml` | CI/CD pipeline |

### Manual deploy

```bash
ssh root@<server> "cd /opt/ordo-hq && ./scripts/deploy.sh <image_tag>"
```

## Code Style

### TypeScript
- Use strict mode
- Prefer explicit types over `any`
- Use path aliases: `@/lib/*`, `@/components/*`, `@/app/*`

### React / Next.js
- Use Server Components by default
- Add `'use client'` only when hooks or interactivity are needed
- Prefer async Server Components for data fetching

### Styling
- Use Tailwind CSS exclusively
- No inline styles
- **Mobile-first** — write mobile styles as the default, add `md:` / `lg:` for desktop (see below)

## Code Quality

| Principle | Why |
|-----------|-----|
| DRY — Don't Repeat Yourself | Extract shared logic to `lib/`, shared UI to `components/` |
| Readability over cleverness | Clever code is hard to debug |
| Early returns over nested conditionals | Reduces indentation and cognitive load |
| One function = one job | Easier to test and understand |
| Reuse before creating | Check existing components/helpers before building new ones |
| Avoid premature abstraction | Duplicate twice before abstracting |
| Keep rules/context lean | Build components, don't document them inline — rules files guide behavior, not store code |

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
- Return JSON responses with `NextResponse.json()`
- Use proper HTTP status codes (201 create, 400 validation, 401 auth, 404 not found, 500 error)
- Validate required fields before any operation
- Log errors to console for debugging

## Don't

- **🔐 Don't EVER create unauthenticated routes or endpoints** — OAuth is mandatory
- **🔐 Don't bypass, disable, or work around authentication**
- **🔐 Don't create public access, guest access, or shareable links** — Everything requires OAuth
- Don't use inline styles
- Don't put business logic in components (use `lib/`)
- Don't commit `.env.local` or any secrets
- Don't duplicate code — extract shared logic to `lib/`, shared UI to `components/`
- Don't forget loading and error states
- Don't let rules/context files bloat — keep them short, actionable directives; build reusable components instead of embedding code or lengthy patterns in rules

## Do

- Keep components small and focused
- Use semantic HTML
- Handle loading and error states
- Check existing abstractions before creating new ones
- Update `.env.example` when adding new env vars
- Use `bun install` instead of `npm install`
