# Deployment

zoxilsi studio builds to a fully static site (`output: "export"`) — the single
route prerenders at build time and everything else runs client-side in
WebGL. No server runtime, database or environment variables are required.

## Vercel (recommended)

1. Import the repository at [vercel.com/new](https://vercel.com/new).
2. Vercel auto-detects the Next.js preset — no configuration needed. It
   runs `next build`, which emits the static export, and serves it from
   the edge.
3. Every push to `main` deploys to production; pull requests get their
   own preview URL automatically.

| Setting | Value |
| --- | --- |
| Framework preset | Next.js (auto-detected) |
| Build command | `next build` (default) |
| Output | handled automatically |
| Install command | `pnpm install` (auto-detected from the lockfile) |

**Custom domain** (e.g. `studio.zoxilsi.cc`): Project → Settings →
Domains → add the domain, then point a `CNAME` at `cname.vercel-dns.com`
(Vercel shows the exact record). TLS is provisioned automatically.

## Any static host (Cloudflare Pages, Netlify, GitHub Pages)

Because the build is a static export, any static host works:

```bash
pnpm build          # emits ./out
npx serve out       # preview locally
```

Publish the `out/` directory. On Cloudflare Pages set the build command
to `pnpm build` and the output directory to `out`.

## Notes

- Image, video and code export all run in the browser — nothing to
  configure server-side.
- The app is stateless; caching the whole site at the edge is safe.
- `.mesha` project files are plain JSON the user saves and loads locally.
