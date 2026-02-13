# Frontend (Next.js)

## Scripts

- `npm run dev` — start local dev server.
- `npm run lint` — run `next lint`.
- `npm run typecheck` — run TypeScript check.
- `npm run build` — production build.
- `npm run predeploy` — lint + typecheck + build.

## Vercel

Use this Build Command:

```bash
npm run predeploy
```

Required env vars:

- `NEXT_PUBLIC_API_URL` (required in Vercel production/preview; local development can fallback to `http://localhost:3000`)
- `NEXT_PUBLIC_BASE_DOMAIN` (platform base domain used for tenant subdomains, example: `gymstack-saas.vercel.app`)
- `NEXT_PUBLIC_APP_URL` (canonical root app URL, example: `https://gymstack-saas.vercel.app`)
- `NEXT_PUBLIC_STRIPE_PRICE_ID` (optional if billing checkout flow disabled)


## Vercel project settings

- **Root Directory:** `frontend`
- **Build Command:** `npm run predeploy`
- **Install Command:** `npm install`


## Subdomain routing

- Root domain serves marketing/owner auth.
- `*.${NEXT_PUBLIC_BASE_DOMAIN}` is treated as tenant/location hostnames.
- Local development supports `<slug>.localhost:3000` and `/_sites/<slug>` fallback routes.
