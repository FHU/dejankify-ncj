# Dejankify

A web-based page audit tool that analyzes URLs for SEO, accessibility, and code quality issues — with AI-powered fixes.

## Features

- **Alt Text Audit** — Finds images with missing/bad alt text, generates suggestions via Claude Vision
- **Open Graph Tags** — Checks for missing OG tags, suggests improvements
- **Accessibility Scan** — Checks landmarks, form labels, lang attribute, ARIA usage, and more
- **PageSpeed Insights** — Pulls scores and top failing audits from Google's API
- **Meta Tag Audit** — Validates title, description, viewport, charset, canonical
- **Heading Hierarchy** — Detects skipped levels, multiple h1s, empty headings
- **Color Contrast** — Parses inline styles and checks WCAG 2.1 contrast ratios
- **AI Chat Sidebar** — Ask follow-up questions about any audit finding (streaming responses)

## Tech Stack

- **Framework**: Next.js 15+ (App Router)
- **Database**: PostgreSQL (Neon for production, Docker for local dev)
- **ORM**: Prisma
- **Auth**: Auth.js v5 with Google OAuth
- **AI**: Anthropic Claude API
- **Styling**: Tailwind CSS 4

## Quick Start

### Prerequisites

- Node.js 18+
- Docker Desktop (for local PostgreSQL)
- Google OAuth credentials ([console.cloud.google.com](https://console.cloud.google.com))
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

### Setup

```bash
# 1. Clone and install
git clone <your-repo-url>
cd dejankify
npm install

# 2. Configure environment
cp .env.local.example .env.local
# Edit .env.local with your credentials

# 3. Start local database
docker compose up -d

# 4. Push schema to database
npm run db:push

# 5. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with Google.

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Navigate to APIs & Services → Credentials
4. Create an OAuth 2.0 Client ID (Web application)
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret to `.env.local`

### Using Neon (Production)

1. Create a free database at [neon.tech](https://neon.tech)
2. Copy the connection string to `DATABASE_URL` in `.env.local`
3. Run `npm run db:push`

## Project Structure

```
src/
├── actions/          # Server Actions (analyze, sessions, chat)
├── analyzers/        # Analysis modules (one per audit type)
├── app/              # Next.js App Router pages
│   ├── dashboard/    # Authenticated dashboard
│   └── api/auth/     # Auth.js API routes
├── components/
│   ├── analysis/     # Report display components
│   ├── layout/       # Shell, sidebar, chat panel
│   └── ui/           # Shared primitives
├── lib/              # Utilities (prisma, auth, claude, fetcher)
└── types/            # Shared TypeScript interfaces
```

## Rate Limits

- **15 analyses/day** per user (configurable via `DAILY_ANALYSIS_LIMIT`)
- **$2/day** estimated API cost cap (configurable via `DAILY_COST_LIMIT_CENTS`)

## Deployment

See [DEPLOY.md](./DEPLOY.md) for full Vercel + Neon deployment instructions.

## License

MIT
