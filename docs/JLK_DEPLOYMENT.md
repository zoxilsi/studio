# JLK Wallpaper Studio deployment

This fork preserves the MIT-licensed zoxilsi studio engine and LICENSE. The app is a static Next.js export: no backend, account, paid service, or runtime environment secret is required. Telemetry scripts have been removed.

## GitHub Pages

In `JK-levi/wallpaper-studio`, select **Settings → Pages → Build and deployment → Source: GitHub Actions**. Merge the implementation to `main` (or run **Deploy JLK Wallpaper Studio** manually). The workflow installs the pinned pnpm version, runs type checking, lint, production build and browser regression tests, then uploads `out/` and deploys it. Its environment URL is the authoritative deployed URL. A URL is not considered verified until the workflow succeeds and the page is opened.

The Pages action supplies the repository base path. Manifest scope/start URL, icons, and Next.js chunks use that same path. Custom-domain root deployments work with an empty base path.

## Local production verification

```sh
pnpm install --frozen-lockfile
NEXT_PUBLIC_BASE_PATH=/wallpaper-studio pnpm check
mkdir -p /tmp/jlk-pages/wallpaper-studio
cp -R out/. /tmp/jlk-pages/wallpaper-studio/
python3 -m http.server 4173 --directory /tmp/jlk-pages
```

Open `/wallpaper-studio/` on that server. Google Fonts (`fonts.googleapis.com` and `fonts.gstatic.com`) must be reachable at build time; font files are bundled in output. Do not use `next start` for this static-export app.

## Install and local data

Safari Share → Add to Home Screen installs the standalone shell on iPhone/iPad. The manifest is served at the configured base path. This release deliberately requires an internet connection to launch; it does not claim offline support and has no service worker cache that can trap stale releases.

Autosave and named projects live in browser localStorage. Clearing site data removes them; exporting `.mesha` files provides a portable backup. Project data is never uploaded. iOS image export supports a share/save fallback as described in the app.

## Hosting access

The setup session can read the fork over Git, but the GitHub Pages API request was denied by the outbound proxy before reaching GitHub (HTTP CONNECT 403). The `api.github.com` and `jk-levi.github.io` domains have been added to the environment draft; this does not apply network changes or publish the environment. Deployment configuration is supplied here; enabling Pages or verifying a live deployment requires GitHub hosting/API access. Do not treat an inferred github.io address as a verified deployment.

## Regression checks

```sh
pnpm check
pnpm test:production
```

`test:production` builds for the `/wallpaper-studio` subpath and runs the Playwright suite against a local static server. The suite exercises responsive navigation and the manifest, mesh/color/effect edits and undo/redo, refresh persistence, shape editing and PNG pixels, and recoverable WebGL context loss. It defines iPhone, iPad portrait/landscape, and desktop Chromium projects. The configured matrix runs 15 relevant tests with no duplicate viewport-only skips.

The runner uses `/usr/bin/chromium` when available, otherwise Playwright’s installed Chromium. Run `pnpm exec playwright install chromium` on other machines, or set `CHROMIUM_PATH` to an installed Chromium executable. Headless runs use SwiftShader for the real WebGL pipeline. This is mobile viewport/touch emulation, **not physical iPhone/iPad Safari certification**. Test screenshots and failure traces are written under `/tmp/jlk-playwright-results`.

A read-only `git push --dry-run origin HEAD:refs/heads/jlk-wallpaper-studio` succeeded during implementation, so branch publication can use the existing Git proxy even while GitHub API access is blocked. This dry-run did not publish code or verify Pages deployment.
