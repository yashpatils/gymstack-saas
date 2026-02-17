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

- `NEXT_PUBLIC_API_URL` (public browser API origin)
- `NEXT_PUBLIC_SITE_URL` (public canonical site URL used for Next.js metadata, e.g. `https://gymstack.club`)
- `API_URL` (server-only API origin for SSR/server actions; point to Railway backend)
- `NEXT_PUBLIC_STRIPE_PRICE_ID` (optional if billing checkout flow disabled)


## Vercel project settings

- **Root Directory:** `frontend`
- **Build Command:** `npm run predeploy`
- **Install Command:** `npm install`

## Domains

- Attach `gymstack.club`, `www.gymstack.club`, wildcard `*.gymstack.club`, and `admin.gymstack.club` to the Vercel project.
- `admin.gymstack.club` is reserved for the platform-owner console and rewrites to `/_admin/*`.
