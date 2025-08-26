# fhEVM DCA Bot - Frontend

This is the Next.js frontend for the fhEVM DCA Bot.

## Vercel Deployment

### Root Directory Setup
When deploying to Vercel, set the **Root Directory** to: `app/packages/site`

### Build Configuration
- **Install Command**: `corepack enable && corepack prepare pnpm@10.0.0 --activate && pnpm -w install --no-frozen-lockfile`
- **Build Command**: `pnpm build`
- **Output Directory**: `.next`
- **Node Version**: 20.x (>=18.18 <21)

### Environment Variables
Set these in Vercel dashboard:

**Public (safe to expose):**
- `NEXT_PUBLIC_CHAIN_ID`
- `NEXT_PUBLIC_RPC`
- `NEXT_PUBLIC_INTENTS`
- `NEXT_PUBLIC_AGGREGATOR`
- `NEXT_PUBLIC_EXECUTOR`
- `NEXT_PUBLIC_ADAPTER`
- `NEXT_PUBLIC_TOKEN_IN`
- `NEXT_PUBLIC_TOKEN_OUT`
- `NEXT_PUBLIC_DEMO_MODE`

**Server-only (secrets):**
- `EXECUTOR_KEY`
- `UNISWAP_ROUTER`
- `K_MIN`
- `TIME_WINDOW`
- `SEPOLIA_RPC_URL`

### Local Development
From the repo root:
```bash
pnpm dev:site    # Start development server
pnpm build:site  # Build the site
pnpm start:site  # Start production server
```
