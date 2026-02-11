# Frontend Performance Notes

- We use `next/font` in `app/layout.tsx` for self-hosted, optimized font loading (`display: swap`) to reduce render-blocking requests.
- Use `next/image` for any user-visible images that are introduced in UI routes/components; there are currently no raw `<img>` tags in the app tree.
- Add `preconnect` only when an external origin is proven to be critical-path (for example, a required third-party asset loaded on first paint).
- Avoid adding heavy client libraries on marketing or shell routes unless the feature requires them; prefer server rendering and route-level code splitting.
