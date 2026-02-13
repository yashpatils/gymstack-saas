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

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_STRIPE_PRICE_ID` (optional if billing checkout flow disabled)


## Vercel project settings

- **Root Directory:** `frontend`
- **Build Command:** `npm run predeploy`
- **Install Command:** `npm install`
