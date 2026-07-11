# Contributing

Thanks for your interest in improving zoxilsi studio. This guide covers the
branching model, commit conventions and local checks.

## Branching model

We follow a lightweight Git Flow:

- **`main`** — production. Every commit here is deployable; Vercel ships
  it automatically. Protected: changes land via pull request only.
- **`develop`** — integration branch for the next release. Feature
  branches merge here first.
- **`feature/*`** — one branch per feature, cut from `develop`.
- **`fix/*`** — bug fixes, cut from `develop` (or `main` for hotfixes).

Releases are tagged from `main` using [SemVer](https://semver.org)
(`v1.0.0`, `v1.1.0`, …).

## Commit convention

Commits follow [Conventional Commits](https://www.conventionalcommits.org):

```
<type>(<scope>): <summary>
```

Types: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`,
`ci`, `chore`. Scopes map to subsystems (`mesh`, `shaders`, `presets`,
`export`, `ui`, …).

## Local checks

Run the same gates CI enforces before opening a PR:

```bash
pnpm exec tsc --noEmit   # types
pnpm lint                # eslint
pnpm build               # production build
```

## Project layout

See the **Architecture** section of the [README](README.md) for a map of
the codebase and how the rendering pipeline fits together.
