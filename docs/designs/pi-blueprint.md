# pi-blueprint

- **Author:** [@giljae](https://github.com/giljae)
- **Status:** Draft (awaiting approval)
- **Date:** 2026-11-19
- **Tracking:** None. Downstream port of [`intincrab/blueprint`](https://github.com/intincrab/blueprint).
- **Builds on:** [`docs/designs/pi-design-skills.md`](pi-design-skills.md) (the shared vendoring core,
  the package conventions, the release pipeline) and [`docs/designs/pi-pstack.md`](pi-pstack.md)
  (the pattern of a small hand-written Pi layer beside a vendored tree).

## Problem statement

Pi can explain a mechanism in prose, but it has no way to draw one. `intincrab/blueprint`
(MIT) is a skill that turns a "how does X work" question into an animated patent-sheet
explainer: parts drawn in one at a time, each numbered, each added because the last one
fell short, with one plain caption per step. It ships as a single `<blueprint-scene>`
element or a standalone HTML page, and exports to GIF, MP4 and PNG.

The skill is almost entirely portable. It is a `SKILL.md` plus plain Node scripts
(`node >= 18`) with no Claude-specific code. The runtime, the linter, the frame renderer,
the exporter, the craft reference, the templates and the 21 worked examples all run
unchanged. Pi reads the Agent Skills format directly, so this is a content port with a
thin host adaptation, not a rewrite.

## Scope

### Goals

- A lean mirror of `intincrab/blueprint` at a pinned commit: the files the skill needs to
  run, and nothing else. Adapted only by named, fail-loud transforms.
- A new package `@giljae/pi-blueprint` on the shared vendoring core, so the existing
  `vendor-sync` and `release` workflows cover it with no change.
- A `/blueprint <topic>` prompt template so the Pi command matches the upstream command.
- The full export path works on Pi: lint (`check.mjs`), frame render (`frames.mjs`), and
  GIF / PNG / MP4 export (`export.mjs`).

### Non-goals

- Vendoring the upstream marketing surface: `assets/` (685 KB of README logos and preview
  GIFs), `site/` (the blueprint.intincrab.com builder), `gallery/`, and the upstream
  `README.md` and `package.json`. Nothing in the skill imports them.
- Vendoring the upstream promo-film sources in `video/` (`film.html`, `render.mjs`,
  `audio.py`, `music.py`, `gif.swift`, `readme-media.mjs`).
- Any extension or custom tool. This package is a skill plus one prompt template.
- Rewriting the scene format, the runtime, or the examples.
- Bundling Playwright. It is an optional, external tool the user installs themselves.

### Anti-goals

- Hand-editing the vendored tree. Only the descriptor and its transforms may change
  vendored output.
- A transform that skips silently when upstream wording moves.
- Shipping the marketing site or its assets to make the package "complete".

## Approaches considered

| Approach | Decision | Rationale |
| --- | --- | --- |
| **Lean skill mirror** (skill files only + hand-written Pi prompt) | **Accepted** | The excluded files are upstream's own marketing site and promo film; the skill never reads them. Small package, few transform anchors, full functionality. |
| Full mirror (whole repo including `site/`, `video/`, `assets/`) | Rejected | ~1.3 MB instead of ~350 KB, and every Claude-Code marketing string in `site/` becomes a transform anchor. Rebuilds a website Pi never serves. |
| Reimplement the scripts as a Pi extension | Rejected | The scripts are plain Node and already host-agnostic; reimplementing them adds maintenance and diverges from the pinned upstream for no capability. |

One thing is decided by the environment rather than by preference: an installed Pi package
is read-only, so Playwright cannot be installed into the skill directory at run time. The
skill's existing scratch-dir + `NODE_PATH` path is the correct one on Pi, and the Pi note
says so explicitly.

## Repository layout (delta)

```text
scripts/vendors/
  pi-blueprint.ts                  # NEW: descriptor + the pi-host-note / pi-skill-command transforms
packages/
  pi-blueprint/                    # NEW
    package.json
    LICENSE                        # MIT, Copyright (c) 2026 Ajay Chauhan
    README.md
    UPSTREAM.json                  # generated
    prompts/
      blueprint.md                 # hand-written Pi adapter: /blueprint <topic>
    skills/
      blueprint/                   # vendored, never hand-edited
        SKILL.md
        references/craft.md
        runtime/blueprint.js
        scripts/{check,frames,build,export}.mjs + scripts/lib/{gif,inline,png}.mjs
        templates/{scene,incident}.js
        examples/small/*.js  examples/complex/*.js
        video/encode.swift         # the macOS MP4 fallback export.mjs calls
    tests/vendor.test.ts
tests/
  pi-blueprint-transforms.test.ts  # NEW: descriptor + transform unit tests
docs/designs/pi-blueprint.md       # this document
```

No workflow change: `vendor-sync.yml` discovers `scripts/vendors/*.ts` by glob and
`release.yml` is package-agnostic.

## The `@giljae/pi-blueprint` package

### Vendored content

A lean mirror of `intincrab/blueprint` at the pinned commit
`4cba2c68fb3f06043c7d9b2711db847e1802ef6c` (no release tags; re-resolve at
implementation time and record the SHA in `UPSTREAM.json`). The descriptor maps the
upstream subset under `skills/blueprint/`:

- `include` (source root → dest root):
  - `references/` → `skills/blueprint/references`
  - `runtime/` → `skills/blueprint/runtime`
  - `scripts/` → `skills/blueprint/scripts`
  - `templates/` → `skills/blueprint/templates`
  - `examples/` → `skills/blueprint/examples`
- `files` (single files):
  - `SKILL.md` → `skills/blueprint/SKILL.md`
  - `video/encode.swift` → `skills/blueprint/video/encode.swift`

That is ~350 KB across ~44 files. `UPSTREAM.json` records the repo, commit, transform
names, and per-file SHA-256, scoped to `skills/blueprint/**`.

Two deliberate exceptions to the "whole upstream" rule:

- **`video/encode.swift` is vendored** even though the rest of `video/` is not. `export.mjs`
  shells out to it through `swift` for MP4 on macOS when `ffmpeg` is absent. On Windows and
  Linux MP4 uses `ffmpeg` from `PATH` and the file is unused, but dropping it would silently
  break macOS MP4 export.
- **`LICENSE` is added by hand, not vendored.** It is upstream's MIT text
  (Copyright (c) 2026 Ajay Chauhan). It sits outside the hashed roots, exactly as in
  `pi-design-skills`.

### Transforms (the only adaptation)

Both are fail-loud: a missing or ambiguous anchor throws, never skips.

- **`pi-skill-command`** — `include` matches `skills/blueprint/SKILL.md` only. Rewrites the
  trailing command in the frontmatter description from `or types /blueprint [topic].` to the
  Pi form, so the routing description names a command Pi actually has. Asserts the anchor
  appears exactly once.
- **`pi-host-note`** — `include` matches `skills/blueprint/SKILL.md` only. Inserts one
  blockquote after the frontmatter:
  1. On Pi, invoke with `/skill:blueprint [topic]` or the `/blueprint` prompt template.
  2. The installed package is read-only and Playwright is not bundled, so install it in a
     scratch directory and run the scripts with `NODE_PATH=<scratch>/node_modules` —
     `npm i playwright@1.56.1 && npx playwright install chromium` — rather than inside the
     skill directory.

**My calls** (stated so they can be corrected while reading):

- Keep the vendored `SKILL.md` otherwise byte-for-byte upstream. Two small anchors are
  cheaper to maintain than a rewritten file, and `--check` proves fidelity to the commit.
- The `npm i` step in upstream's workflow ("once, in `<skill-dir>`") is left in the text and
  corrected by the note, rather than rewritten in place. One note beats many tiny edits.

### The Pi prompt template

`prompts/blueprint.md` is hand-written (not vendored), the Pi equivalent of the upstream
`/blueprint` command. Frontmatter sets `description` and `argument-hint: "<topic>"`; the
body tells Pi to use the `blueprint` skill for `${@:-how it works}` and to follow the
skill's workflow end to end (lint, render frames, look at them, ship). This mirrors the
`harness/pi.md` and `PI.md` adapters in `pi-pstack` and `pi-egm`: a small, explicit Pi
layer beside the vendored tree.

### Manifest, license, docs

- `name: "@giljae/pi-blueprint"`, `version: "0.0.0"`, `license: "MIT"`, `type: "module"`,
  `repository` pointing at this repo (`directory: packages/pi-blueprint`, required for npm
  provenance), `keywords: ["pi-package", "blueprint", "explainer", "diagram", "animation",
  "visualization", "documentation"]`, `publishConfig.access: "public"`,
  `files: ["skills", "prompts", "README.md", "LICENSE"]`,
  `pi: { "skills": ["./skills"], "prompts": ["./prompts/*.md"] }`.
  Version starts at `0.0.0`; the first release is a `patch` changeset to `0.0.1`
  (the `pi-pstack` baseline convention), so `release.yml` publishes `0.0.1`.
- `LICENSE`: upstream MIT text, Copyright (c) 2026 Ajay Chauhan.
- `README.md`: what the package is, `pi install npm:@giljae/pi-blueprint`, the
  `/blueprint <topic>` command, the Playwright setup note, a short description of the
  sheet format and the exports, MIT attribution, and "not affiliated with the author".

## Verification

Offline (CI, every PR):

- `npm run check` (typecheck + vitest) passes.
- `tests/pi-blueprint-transforms.test.ts`: the descriptor maps the expected include/files
  and pins the commit; each transform inserts once, throws when its anchor is already
  present or absent, and its `include` matches only `skills/blueprint/SKILL.md`.
- `packages/pi-blueprint/tests/vendor.test.ts`:
  - `checkVendor(spec)` is true (the vendored tree matches `UPSTREAM.json`).
  - `skills/blueprint/SKILL.md` exists, carries exactly one Pi note, and its description
    no longer says `types /blueprint`.
  - `scripts/lib/{gif,inline,png}.mjs` and `video/encode.swift` are present (the export
    path is complete).
  - `examples/` holds 21 scene files; `references/craft.md` and `runtime/blueprint.js` exist.
- `npm run vendor:check` reports `pi-blueprint: ok`.
- The repo-level `tests/packages.test.ts` covers the manifest, `repository`, `LICENSE`,
  `files`, and `pi` conventions automatically.

Live (before the README claims support):

1. `pi install npm:@giljae/pi-blueprint`; confirm the skill loads, `/skill:blueprint`
   resolves, and `/blueprint how a cache works` expands.
2. Run one end-to-end scenario: lint an existing example, render frames with the scratch-dir
   Playwright, read the PNG back, and export a GIF.
3. Confirm `node <skill-dir>/scripts/build.mjs examples/small/cache.js` produces a
   standalone HTML page.

## Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Upstream rewords the two `SKILL.md` anchors | Sync silently diverges | Each transform asserts its anchor exactly once and throws; `--check` blocks the PR |
| A vendored file is hand-edited | Drift from the recorded commit | The integrity test fails CI |
| Someone drops `video/encode.swift` as "marketing" | macOS MP4 export breaks silently | The integrity test asserts the file is present; the design names it explicitly |
| The active Pi model cannot view images | The "look at the frames" self-check degrades | Not a code fault; the README states the skill still lints with `check.mjs` and can export, and frame-reading requires an image-capable model |
| Playwright is not installed, or installed read-only | `frames.mjs` / `export.mjs` exit 2 | The Pi note and README give the scratch-dir + `NODE_PATH` recipe; lint needs only Node |
| `/blueprint` or `blueprint` collides with a user's own prompt or skill | One wins, a warning is produced | The prompt (`/blueprint`) and the skill (`/skill:blueprint`) are separate namespaces, so they never collide with each other; the README notes that a user prompt or skill of the same name would |
| Upstream has no release tags | Cannot pin a tag | Pin a commit and detect movement by `git ls-remote` (already the postgres/design path) |
| `examples/` grows or shrinks upstream | A hard-coded count fails CI | The integrity test asserts a floor (`>= 21`), not equality |

## Rollout

1. Add `scripts/vendors/pi-blueprint.ts` and its transform unit test.
2. Vendor the tree (`npx tsx scripts/run-vendor-sync.ts pi-blueprint`), add `UPSTREAM.json`,
   and add the package integrity test.
3. Add `package.json`, `LICENSE`, `README.md`, and `prompts/blueprint.md`.
4. Run the offline suite, then `npm publish --dry-run --workspace packages/pi-blueprint`;
   add the `patch` changeset and commit. `release.yml` publishes `0.0.1` when the changeset
   is merged.

Rollback is a revert of the package and descriptor commits; nothing publishes until the
changeset is merged.
