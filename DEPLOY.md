# Deploying Dejankify to Vercel + Neon

## Prerequisites

- GitHub account with the repo pushed
- [Vercel account](https://vercel.com) (free tier works)
- [Neon account](https://neon.tech) (free tier works)
- Google OAuth credentials (production redirect URI)
- Anthropic API key

---

## Step 1: Set Up Neon Database

1. Sign in at [console.neon.tech](https://console.neon.tech)
2. Create a new project (name it `dejankify`)
3. Select the region closest to your Vercel deployment (default: `us-east-1`)
4. Copy the connection string — it looks like:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dejankify?sslmode=require
   ```

## Step 2: Push Schema to Neon

From your local machine:

```bash
# Set the production DATABASE_URL temporarily
export DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dejankify?sslmode=require"

# Push the schema
npx prisma db push
```

## Step 3: Update Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Edit your OAuth 2.0 Client
3. Add your production redirect URI:
   ```
   https://your-app.vercel.app/api/auth/callback/google
   ```
4. If you have a custom domain, also add:
   ```
   https://dejankify.yourdomain.com/api/auth/callback/google
   ```

## Step 4: Deploy to Vercel

### Option A: Via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Vercel will auto-detect Next.js
4. Add these environment variables:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Your Neon connection string |
   | `AUTH_SECRET` | Run `npx auth secret` to generate |
   | `AUTH_GOOGLE_ID` | Your Google OAuth Client ID |
   | `AUTH_GOOGLE_SECRET` | Your Google OAuth Client Secret |
   | `ANTHROPIC_API_KEY` | Your Anthropic API key |
   | `PAGESPEED_API_KEY` | (optional) Google API key |
   | `DAILY_ANALYSIS_LIMIT` | `15` |
   | `DAILY_COST_LIMIT_CENTS` | `50` |

5. Click **Deploy**

### Option B: Via Vercel CLI

```bash
npm i -g vercel
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add AUTH_SECRET
vercel env add AUTH_GOOGLE_ID
vercel env add AUTH_GOOGLE_SECRET
vercel env add ANTHROPIC_API_KEY

# Deploy
vercel --prod
```

## Step 5: Verify

1. Visit your deployed URL
2. Sign in with Google
3. Submit a URL and verify the analysis runs
4. Check the chat sidebar responds

---

## Configuration Notes

### Function Duration

The `vercel.json` sets the chat streaming endpoint to 60s max duration. On Vercel's free tier, functions have a 10s limit. You may need Vercel Pro ($20/month) if analyses or chat responses take longer than 10s.

Alternatively, for the free tier:
- The analysis runs as a server action (which has longer limits)
- The chat streaming endpoint may need to be converted back to a non-streaming server action

### Neon Connection Pooling

For production traffic, use Neon's pooled connection string (the one ending in `-pooler`) in your `DATABASE_URL`. This handles connection limits better with serverless functions.

### Cost Management

With the default limits (15 analyses/day, $2/day cap per user):
- Each full analysis with AI costs roughly 2–8 cents (depends on image count)
- Each chat message costs roughly 0.1–0.5 cents
- A single user doing 15 analyses + 30 chat messages ≈ $1.50/day worst case

### Custom Domain

1. In Vercel dashboard → Settings → Domains
2. Add your domain
3. Update DNS records as instructed
4. Update Google OAuth redirect URIs to include the new domain
