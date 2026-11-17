# pi-design-skills

- **Author:** [@giljae](https://github.com/giljae)
- **Status:** Approved
- **Date:** 2026-11-17
- **Tracking:** None. Downstream port of [`emilkowalski/skills`](https://github.com/emilkowalski/skills).
- **Builds on:** [`docs/designs/pi-postgres-skills.md`](pi-postgres-skills.md) (the shared vendoring core, the release pipeline, and the package conventions).

## Problem statement

Pi has no guidance for UI, motion, or interaction craft. Agents ship the same
"AI slop": wrong easing on enter animations, solid borders where a raised shadow
belongs, motion that fights the user. Emil Kowalski's `emilkowalski/skills` (MIT)
is 20 Agent Skills distilled from UI work at Vercel and Linear that name those
mistakes and how to avoid them. Pi reads the Agent Skills format directly, so
this is a content port, not a rewrite.

## Scope

### Goals

- A full mirror of `emilkowalski/skills` `skills/**` at a pinned commit, adapted
  only by named transforms — the same model as `pi-postgres-skills`.
- A new package `@giljae/pi-design-skills` on the shared vendoring core, so the
  existing `vendor-sync` and `release` workflows cover it with no change.
- One transform, `pi-host-note`, that corrects the single host-coupled file
  (`learn-taste`) without editing upstream bytes.

### Non-goals

- Vendoring the repo root cheatsheets (`performance-cheatsheet.md`,
  `ui-cheatsheet.md`): no skill references them.
- Curating away the mobile or library-specific skills (`write-swift`,
  `animate-expo`, `ask-sonner`). The mirror is one-to-one.
- Any extension or custom tool. This package is skills only.
- Rewriting skill names. Upstream names are kept.

### Anti-goals

- Hand-editing the vendored tree. Only the descriptor and its transform may
  change vendored output.
- A transform that skips silently when upstream wording moves.

## Approaches considered

| Approach | Decision | Rationale |
| --- | --- | --- |
| **Full mirror** (1:1 tree + named transforms) | **Accepted** | Matches `pi-postgres-skills`; content-only, so mirroring is cheap and `--check` proves fidelity to a commit. |
| Curated subset (drop `write-swift`, `animate-expo`, `ask-sonner`) | Rejected | Smaller, but diverges from upstream and turns every weekly sync into a manual merge. |

There is one sensible way to build it: reuse the shared core and the descriptor
convention already in the repo. No other mechanism fits.

## Repository layout (delta)

```text
scripts/vendors/
  pi-design-skills.ts            # NEW: descriptor + the pi-host-note transform
packages/
  pi-design-skills/              # NEW
    package.json
    UPSTREAM.json                # generated
    LICENSE                      # MIT, Copyright (c) 2026 Emil Kowalski
    README.md
    skills/                      # vendored, never hand-edited
    tests/vendor.test.ts
docs/designs/pi-design-skills.md # this document
```

No workflow change: `vendor-sync.yml` discovers `scripts/vendors/*.ts`, and
`release.yml` is package-agnostic.

## The `@giljae/pi-design-skills` package

### Vendored content

A full mirror of `skills/**` from a pinned `emilkowalski/skills` commit
(`64eb3deb9a5fbfa041faf783e0bc3fd635872e9c` at design time): 20 `SKILL.md` files
and their nine reference files. `UPSTREAM.json` records the commit and per-file
SHA-256.

### Transform (the only adaptation)

- **`pi-host-note`** — `include` matches `skills/learn-taste/SKILL.md` only.
  Inserts one line after the frontmatter noting that on Pi project context lives
  in `AGENTS.md` (which Pi reads) and corrections come from the current session,
  rather than the Claude Code paths the skill names. Asserts the anchor exactly
  once; the rest of the tree stays byte-for-byte upstream.

**My call:** do not rewrite the `CLAUDE.md` / `~/.claude/projects/` mentions in
place. One note is enough and keeps the mirror exact.

### Manifest, license, docs

- `name: "@giljae/pi-design-skills"`, `version: "0.0.1"`, `license: "MIT"`,
  `repository` pointing at this repo (`directory: packages/pi-design-skills`,
  required for npm provenance), `keywords: ["pi-package", "design", "ui",
  "animation", "motion", "frontend"]`, `publishConfig.access: "public"`,
  `files: ["skills", "README.md", "LICENSE"]`, `pi: { "skills": ["./skills"] }`.
- `LICENSE`: upstream MIT text (Copyright (c) 2026 Emil Kowalski).
- `README.md`: what the package is, the install command, a short list of the
  skills, MIT attribution, and "not affiliated with the author".

## Verification

Offline (CI, every PR):

- `npm run check` (typecheck + vitest) passes.
- `packages/pi-design-skills/tests/vendor.test.ts`: `checkVendor(spec)` is true;
  the `learn-taste` SKILL.md carries exactly one Pi note; the skill count is 20.
- `run-vendor-sync pi-design-skills --check` reports no drift.
- The repo-level `tests/packages.test.ts` covers the manifest, `repository`,
  `LICENSE`, and `pi` conventions automatically.

Live (before the README claims support):

1. `pi install npm:@giljae/pi-design-skills`; confirm the skills load and
   `/skill:animate` (and a couple more) resolve.
2. Run one scenario (ask Pi to animate a component) and confirm the skill fires.

## Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Upstream rewords the `learn-taste` anchor | Sync silently diverges | The transform asserts one match and throws; `--check` blocks the PR |
| A vendored file is hand-edited | Drift from the recorded commit | Integrity test fails CI |
| Generic skill names (`animate`, `prototype`) collide with a user's other skills | One skill wins, a warning is produced | Documented in the README; upstream names are kept on purpose |
| Upstream has no release tags | Cannot pin a tag | Pin a commit and detect movement by `git ls-remote` (already the postgres path) |
| Large `emil-design-eng` SKILL.md (~28 KB) | Costly when loaded | Loaded only when a task matches; within the existing skill budget |

## Rollout

1. Add `scripts/vendors/pi-design-skills.ts` and its transform test.
2. Vendor the tree, add `UPSTREAM.json`, and add the package's integrity test.
3. Add `package.json`, `LICENSE`, and `README.md`.
4. Run the offline suite, then `npm publish --dry-run`; commit and let the
   release pipeline publish `0.0.1` when the changeset is merged.

Rollback is a revert of the package and descriptor commits; nothing publishes
until a changeset is merged.
