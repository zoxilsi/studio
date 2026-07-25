# Contributing to zoxilsi studio

Thanks for your interest in improving zoxilsi studio. This guide covers the
development workflow and the quality bar for contributions. By participating,
you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

You do not need to be an expert or contribute code. Bug reports, design
feedback, documentation, testing, accessibility improvements, translations,
presets, and thoughtful ideas all help the project grow. If this is your first
open-source contribution, mention it—we are happy to help.

## Before you start

- Search existing issues and pull requests first.
- Open an issue for a substantial change before investing in an implementation.
- Never report a vulnerability publicly; follow the
  [security policy](.github/SECURITY.md).
- Small documentation and obvious bug-fix pull requests can be opened directly.

Look for issues labeled
[`good first issue`](https://github.com/zoxilsi/studio/labels/good%20first%20issue)
or [`help wanted`](https://github.com/zoxilsi/studio/labels/help%20wanted).
If nothing fits, start a
[Discussion](https://github.com/zoxilsi/studio/discussions).

## Branching model

We follow a lightweight pull-request workflow:

- **`main`** — production. Every commit here is deployable; Vercel ships
  it automatically. Protected: changes land via pull request only.
- **`feature/*`** — one branch per feature, cut from the target branch.
- **`fix/*`** — one branch per bug fix.

Releases are tagged from `main` using [SemVer](https://semver.org)
(`v1.0.0`, `v1.1.0`, …).

For most contributions, fork the repository, create a branch from `main`, and
open a pull request back to `main`. Maintainers may use `develop` temporarily
for a coordinated release.

## Set up locally

Prerequisites: Node.js 20 LTS, pnpm 9, Git, and a WebGL2-capable browser.

```bash
git clone https://github.com/YOUR_USERNAME/studio.git
cd studio
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Keep your branch focused. Avoid formatting or refactoring unrelated files.

## Commit convention

Commits follow [Conventional Commits](https://www.conventionalcommits.org):

```
<type>(<scope>): <summary>
```

Types: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`,
`ci`, `chore`. Scopes map to subsystems (`mesh`, `shaders`, `presets`,
`export`, `ui`, …).

## Local checks

Run the same gates CI enforces before opening a pull request:

```bash
pnpm check
```

The command type-checks, lints, and creates a production build. Also manually
exercise the affected editor workflow and check the browser console. For visual
changes, test a narrow viewport and attach before/after media to the PR.

## Pull requests

- Link the issue using `Closes #123`.
- Explain why the change is needed, not only what the diff does.
- Include reproducible verification steps.
- Add or update tests when the repository has coverage for the changed area.
- Update user-facing documentation when behavior changes.
- Keep draft pull requests marked as drafts until they are reviewable.
- Resolve review conversations and wait for required checks before merge.

Maintainers generally squash-merge pull requests, so the PR title should follow
the Conventional Commits format. Approval does not guarantee immediate merge.

## Project layout

See the **Architecture** section of the [README](README.md) for a map of
the codebase and how the rendering pipeline fits together.
