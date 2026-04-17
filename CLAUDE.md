# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run ESLint

npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:push      # Sync schema to database (no migration file)
npm run db:studio    # Open Prisma Studio GUI
npm run db:seed      # Seed the database
```

There is no test suite configured.

## Environment Variables

```sh
DATABASE_URL                # PostgreSQL connection string
AUTH_SECRET                 # NextAuth session encryption key
AUTH_GOOGLE_ID              # Google OAuth client ID
AUTH_GOOGLE_SECRET          # Google OAuth client secret
ANTHROPIC_API_KEY           # Claude API key
PAGESPEED_API_KEY           # Optional: Google PageSpeed Insights
DAILY_ANALYSIS_LIMIT        # Max analyses per user/day (default 15)
DAILY_COST_LIMIT_CENTS      # Max API cost per user/day in cents (default 200)
```

## Architecture

**Dejankify** is a web page audit tool that fetches URLs, runs parallel analysis modules, stores results, and lets users chat with Claude about the findings.

### Request flow

1. User submits a URL in the dashboard → `src/actions/analyze.ts:runAnalysis()`
2. `runAnalysis` checks rate limits (`src/lib/rate-limit.ts`), fetches the page HTML (`src/lib/fetcher.ts`), then calls the orchestrator
3. `src/analyzers/index.ts` runs all analyzers concurrently via `Promise.allSettled()` — a failure in one does not block others
4. Results are saved to `AuditAnalysis` (with raw HTML) and associated with an `AuditSession`
5. Session detail page (`src/app/dashboard/session/[id]/`) renders `AnalysisReport` and mounts `ChatPanel`
6. Chat goes through `src/app/api/chat/route.ts` (streaming) → `src/actions/chat.ts` → Claude Haiku with session context

### Analyzer pattern

Each file in `src/analyzers/` exports a single `analyze*()` function and returns `ModuleResult`:

```ts
{ name, slug, score, maxScore, issues[], details }
```

- **Rule-based** (no API calls): `headings.ts`, `meta-tags.ts`, `accessibility.ts`, `contrast.ts`
- **AI-powered** (call Claude): `alt-text.ts` (vision), `open-graph.ts`
- **External API**: `pagespeed.ts` (Google PageSpeed Insights)

To add a new analyzer: create `src/analyzers/my-check.ts`, export `analyzeMyCheck()`, import and add it to the `Promise.allSettled` array in `src/analyzers/index.ts`.

### Claude usage

`src/lib/claude.ts` wraps the Anthropic SDK with two helpers:

- **Text completion** — used by OG tag and heading analyzers
- **Vision** — used by alt-text analyzer (encodes images via `src/lib/image-processing.ts`)

Two models are in use: **Claude Sonnet 4** for analysis/vision tasks, **Claude Haiku** for chat. Cost is estimated per-call and accumulated in `DailyUsage`.

### Database schema (Prisma)

Key models beyond the Auth.js standard tables:

- `AuditSession` — a user's named audit project
- `AuditAnalysis` — one URL analyzed; stores JSON results and raw HTML
- `ChatMessage` — conversation history scoped to a session
- `DailyUsage` — per-user per-day rate limit tracking

After any schema change: `npm run db:generate && npm run db:push`.

### Auth

Auth.js v5 (beta) with Google OAuth only. `src/middleware.ts` protects `/dashboard` and `/session` routes. The adapter uses Prisma for session persistence.

### Path aliases

`@/*` → `src/*` throughout the codebase.

### Server-only packages

`sharp` and `cheerio` are listed as `serverExternalPackages` in `next.config.ts` — do not import them in client components.
