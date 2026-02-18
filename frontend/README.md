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

## Automated route previews

Generate route/api artifacts from discovered app routes:

```bash
npm run artifacts:generate
```

Run route preview screenshots + report (desktop/mobile):

```bash
npm run ui:preview
```

Required env vars for authenticated previews:

- `QA_EMAIL`
- `QA_PASSWORD`
- `PLAYWRIGHT_BASE_URL` (optional override)

Preview outputs:

- `../artifacts/route-manifest.json`
- `../artifacts/api-endpoints.json`
- `../artifacts/ui-snapshots/**`
- `../artifacts/ui-preview-report.json`

## Platform layout rule

- Do not add page-level top navigation/side navigation inside platform pages.
- Use the centralized shell in `app/platform/layout.tsx` (`AppShell`) for all topbar/sidebar/mobile drawer behavior.
