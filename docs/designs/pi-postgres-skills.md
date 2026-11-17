# pi-postgres-skills, the shared vendoring core, and the release pipeline

- **Author:** [@giljae](https://github.com/giljae)
- **Status:** Proposal
- **Date:** 2026-11-17
- **Tracking:** None. Downstream port of [`microsoft/postgres-skills`](https://github.com/microsoft/postgres-skills).
- **Builds on:** [`docs/designs/pi-extensions.md`](pi-extensions.md) (the monorepo skeleton and `@giljae/pi-egm`).

## Problem statement

Pi has no PostgreSQL guidance. `microsoft/postgres-skills` is a Microsoft
plugin (MIT) for Claude Code, GitHub Copilot CLI, and Codex CLI. It bundles
three skills in the Agent Skills format — `postgresql-best-practices` (23
reference guides), `pg-graph` (10), and `migrate-oracle-app` (27 + scripts) —
plus an MCP server declaration pointing at `@microsoft/postgres-mcp`.

Pi reads the same Agent Skills format, so the skills port almost directly. Two
gaps make a plain copy insufficient:

1. A Pi package cannot declare MCP servers in its manifest. Pi only loads MCP
   servers from `~/.pi/agent/mcp.json`, `.pi/mcp.json`, or an extension that
   calls `pi.registerMcpServer()`. Upstream's `plugin/.mcp.json` is inert on Pi.
2. Upstream has no Pi host support: `migrate-oracle-app` assumes a Windows path
   separator and a `<plugin-root>` two directories above the skill, and the
   skills reference MCP tools by the names Claude/Copilot expose, not Pi's
   `mcp__<server>__<tool>` form.

Two further problems come from the monorepo itself:

3. The existing vendoring (`scripts/sync-egm.ts`) is EGM-specific: a hardcoded
   repo, an EGM directory allowlist, and two EGM transforms. A second vendored
   package would duplicate the clone/copy/hash/`UPSTREAM.json`/`--check` logic
   — the part that is genuinely identical and easy to get subtly wrong.
4. `@giljae/pi-egm` publishes by hand. When upstream moves, nothing flows to npm
   or the Pi gallery without a manual release.

This project adds `@giljae/pi-postgres-skills`, extracts a shared vendoring core
that both packages use, and adds an automated release pipeline so an upstream
change reaches npm and pi.dev after review.

## Scope

### Goals

- A shared vendoring core (`scripts/lib/vendor.ts`) used by EGM and the new
  package: pinned fetch, allowlisted copy, fail-loud transforms, sorted SHA-256
  tree hashing, `UPSTREAM.json` read/write, and an offline `--check`.
- `@giljae/pi-postgres-skills`: a **full mirror** of `plugin/skills/**` at a
  pinned commit, adapted only by named transforms.
- An MCP extension that registers `postgres-mcp` with
  `pi.registerMcpServer()`, pinned to `@microsoft/postgres-mcp` so
  `pi install` yields working tools.
- Automated release: a reviewed upstream-sync PR carries a patch changeset;
  merging publishes to npm; the `pi-package` keyword lists it on the Pi gallery.
- One version policy: every package starts at `0.0.1` and increments one
  patch at a time (`0.0.1 → 0.0.2 → …`) per released change. No minor/major
  bumps until a package reaches 1.0.
- **Extensible by convention.** Adding a package is a descriptor file (vendored)
  or a directory (non-vendored); no shared script or workflow edit, and
  repo-level tests cover it automatically.

### Non-goals

- Contributing to or forking upstream `microsoft/postgres-skills`.
- Vendoring `@microsoft/postgres-mcp` itself; it stays an external dependency.
- Curating away the Azure/HorizonDB or Oracle content. The mirror is one-to-one.
- Auto-merging upstream-sync pull requests.
- Semver minor/major semantics before 1.0.

### Anti-goals

- Hand-editing anything under a vendored tree. Only the sync script and its
  transforms may change vendored output.
- A transform that skips silently when upstream wording moves.

## Approaches considered

### Vendoring core

| Approach | Decision | Rationale |
| --- | --- | --- |
| **A.** Copy the EGM script per package | Rejected | Duplicates the identical, error-prone clone/copy/hash logic; fixes land in one place only by discipline. |
| **B.** Generalize every package up front, refactor EGM | Rejected | Forces an EGM rewrite and a config-heavy core before the second consumer proves the shape. |
| **C.** Shared core + per-package transform module | **Accepted** | Shares the genuinely identical logic, keeps subset/transforms/ref-strategy per package, and makes a new package one descriptor file. Matches the monorepo rule: add a shared helper when a second package needs it. |

### Fidelity

| Approach | Decision | Rationale |
| --- | --- | --- |
| Full mirror (1:1 tree + named transforms) | **Accepted** | Upstream updates arrive as a mechanical re-copy; `--check` proves fidelity to a commit. |
| Curated subset (trim Azure/Oracle by hand) | Rejected | Turns every upstream release into a manual merge with growing divergence; the cheap-update property disappears exactly where curated. |

### MCP registration

| Approach | Decision | Rationale |
| --- | --- | --- |
| Extension calling `pi.registerMcpServer()` | **Accepted** | Only way to make installing the package yield working tools. |
| Document `pi mcp add` in the README | Rejected as the primary path | Not "install and it works"; kept as the manual override. |
| Package manifest field | Impossible | Pi packages expose extensions/skills/prompts/themes only. |

### Release

| Approach | Decision | Rationale |
| --- | --- | --- |
| `changesets/action` + npm trusted publishing | **Accepted** | Version PR is reviewable; OIDC removes a long-lived npm token. Gallery reflects npm automatically. |
| Human-triggered `changeset publish` (current EGM model) | Rejected by owner | Upstream changes must reach npm/pi.dev without a manual step. |
| Custom version bump without changesets | Rejected | Loses per-package changelogs and changeset intent. |

## Repository layout

```text
pi-extensions/
  scripts/
    lib/vendor.ts              # NEW: shared vendoring core
    vendors/                   # NEW: one descriptor per vendored package, auto-discovered
      pi-egm.ts                # REFACTORED: EGM descriptor + transforms on the core
      pi-postgres-skills.ts    # NEW: postgres descriptor + transforms on the core
    run-vendor-sync.ts         # NEW: discovery + `--check` / `--latest` runner for CI
  .github/workflows/
    ci.yml                     # unchanged: typecheck + tests on every PR
    vendor-sync.yml            # NEW: scheduled vendored-package sync -> PR (replaces egm-sync.yml)
    release.yml                # NEW: changesets/action -> npm publish
  packages/
    pi-egm/                    # existing, backfilled onto the core + release flow
    pi-postgres-skills/        # NEW
      package.json
      UPSTREAM.json
      README.md
      extensions/postgres-mcp/index.ts   # hand-written
      skills/                            # vendored, never hand-edited
      tests/
```

## The shared vendoring core (`scripts/lib/vendor.ts`)

A package describes what to vendor; the core does the identical work.

```ts
export interface Transform {
  name: string;
  /** Deterministic rewrite. Must throw when its anchor is missing or ambiguous. */
  apply(text: string, relPath: string): string;
}

export interface VendorSpec {
  repo: string;
  /** "tag": newest semver tag or an explicit tag. "commit": pinned SHA (postgres). */
  refStrategy: { kind: "tag"; tag?: string } | { kind: "commit"; commit: string };
  /** Allowlisted roots, copied verbatim, each optionally remapped to a dest root. */
  include: Array<string | { from: string; to: string }>;
  /** Files copied outside the roots, as source -> dest pairs. */
  files?: Array<{ from: string; to: string }>;
  transforms: Transform[];
  packageDir: string;
}

export function runVendorSync(spec: VendorSpec, opts: { latest?: boolean }): {
  changed: boolean;
  ref: string;
  commit: string;
};
export function checkVendor(spec: VendorSpec): boolean;
```

Core steps, identical for both packages:

1. Resolve the pin. A tag resolves through `git ls-remote --tags`; `--latest`
   with `kind: "commit"` resolves the remote default branch to a SHA. postgres
   has no usable release tags today (the only tag is the stale namespaced
   `postgres-skills--v0.1.1` while the plugin is at 0.3.0), so it pins commits.
2. Fetch exactly that commit: `git init` + `git fetch --depth 1 origin <sha>`
   + `checkout` (a plain `--branch` clone cannot reach an arbitrary SHA).
3. Remove and re-copy the allowlisted subset, remapping each source root to
   its destination (`plugin/skills` → `skills` for postgres; identity roots for
   EGM).
4. Apply each transform. Each asserts its anchor appears exactly once and
   throws otherwise, so upstream rewording fails the sync instead of skipping.
5. Hash the tree (sorted, POSIX relative paths) and write `UPSTREAM.json`
   (`repo`, `ref`, `commit`, `transforms`, `files`).
6. `--check` recomputes the hashes offline and compares, for the vendor
   integrity test and for `vendor-sync.yml` to detect a no-op.

Each vendored package supplies one descriptor at `scripts/vendors/<pkg>.ts`
exporting a `VendorSpec`; it holds only the parts that differ — `pi-egm.ts`
(tag ref, `skills/agents/resources/docs` + two docs, EGM transforms) and
`pi-postgres-skills.ts` (commit ref, `plugin/skills` → `skills`, postgres
transforms). `run-vendor-sync.ts` discovers descriptors by globbing
`scripts/vendors/*.ts`; there is no central registry and no package name is
hardcoded in the runner or any workflow.

**My call:** EGM is migrated onto the core and to `scripts/vendors/pi-egm.ts` in
the same change. The existing `sync-egm.test.ts` covers the transforms, and a
`--check` against the pinned ref proves the refactor is byte-identical offline.
Leaving the core used by one package would defeat its purpose.

## Extensibility: adding a package

The monorepo is meant to host more packages, so adding one is a convention, not
a wiring change.

- **Vendored package.** Add `scripts/vendors/<pkg>.ts` (a `VendorSpec`) and the
  package directory. `run-vendor-sync.ts` and `vendor-sync.yml` pick it up
  automatically; no shared script or workflow is edited.
- **Non-vendored package** (pure skills or a hand-written extension). Add the
  package directory only. With no descriptor, sync skips it; the release
  pipeline still versions and publishes it.
- **No hardcoded package names** in `scripts/`, `.github/workflows/`, or the
  repo-level tests. A grep test asserts that.
- **Repo-level package tests iterate `packages/*`**, so every future package is
  covered by the manifest, license, and `files` checks without new test code.
- **Per-package release checklist** (documented in the repo README): the
  `pi-package` keyword, `publishConfig.access: "public"`, a minimal `files` list,
  a `pi` manifest, a `LICENSE`, and an npm trusted publisher configured for the
  new package name before its first publish.

## The `@giljae/pi-postgres-skills` package

### Vendored content

A full mirror of `plugin/skills/**` from a pinned `microsoft/postgres-skills`
commit: all three skills and their references and `migrate-oracle-app` scripts.
`UPSTREAM.json` records the commit and per-file SHA-256.

### Transforms (the only adaptations)

Full mirror means the content stays one-to-one; host assumptions are corrected
by named transforms, not by editing files.

- **`pi-host-pointer`** — insert one Pi line immediately after the closing
  `---` of the frontmatter in each of the three `SKILL.md` files (asserted once
  each), stating that the MCP tools are exposed as `mcp__postgres-mcp__<operation>`
  (upstream names them `postgres_mcp_*`), and that on Pi the package root is the
  package directory. The skills' many exact-name references stay untouched.
- **`pi-path-separators`** — make the `migrate-oracle-app` examples
  OS-independent. Every backslash in that skill's Markdown files is a path
  separator today, so the transform rewrites path separators to `/` in those
  files only (never the `.mjs` scripts, whose backslashes are string/regex
  escapes and which already use `path.join`). It collapses the JSON-escaped
  `\\` in `conversion-state-schema.md` first, replaces the remaining `\` that
  sit between path characters, and then asserts no backslash remains anywhere.
  Upstream introducing a non-path backslash (a regex `\.`) leaves it in place
  and fails the sync instead of corrupting it. Windows accepts `/`, so the
  examples run on any OS.

**My call:** do not rewrite `postgres_mcp_*` references in place. The migration
skill deliberately reasons about provider names (`pgsql_*` in VS Code Copilot
vs `postgres_mcp_*` in Copilot CLI) and forbids `_db_context` calls; a blind
rename would corrupt that logic. One mapping note is safer and keeps the mirror.

### MCP extension

`extensions/postgres-mcp/index.ts` registers the server during load, so it
connects alongside `mcp.json` servers at session start:

```ts
export default function (pi) {
  pi.registerMcpServer("postgres-mcp", {
    command: process.execPath,             // launch the installed bin, no network
    args: [postgresMcpBin(), "run", "--no-telemetry"],
    env: { POSTGRES_MCP_QUERY_TIMEOUT_MS: "540000" },
    timeout: 90,
    exposure: "codemode",
    description: "PostgreSQL MCP: query, inspect, and modify a selected database.",
  });
}
```

- `@microsoft/postgres-mcp` is a pinned `dependencies` entry;
  `postgresMcpBin()` resolves its installed bin so a session start needs no
  network. A unit test asserts the resolved bin exists.
- **My call:** launch the installed bin rather than `npx @latest`. Keep
  `npx -y @microsoft/postgres-mcp@<pin> run --no-telemetry` as the documented
  manual fallback if bin resolution proves unreliable. The version is bumped by
  a dependabot PR.
- `exposure` defaults to `codemode`. `toolExposure` may mark the read-only tools
  `direct` later; left as an open decision.
- A user `mcp.json` entry named `postgres-mcp` overrides this registration,
  which is the intended escape hatch.

### Manifest and docs

- `keywords: ["pi-package", …]`, `publishConfig.access: "public"`, minimal
  `files` (runtime only), `pi: { extensions: ["./extensions"], skills: ["./skills"] }`.
- The package ships its own `LICENSE` carrying upstream's MIT text and the
  Microsoft copyright, plus attribution in `UPSTREAM.json` and the README
  ("not an official Microsoft product"). The repo root license (Apache-2.0)
  stays repo-level; licensing is per package, as with `pi-egm`.
- README states the install command, that the MCP server starts on load, the
  MIT attribution, the read-only profile recommendation, and the
  `npx @microsoft/postgres-mcp connection add … --access-mode ro` setup step.

## The release pipeline

### Version policy

Every package starts at `0.0.1` and increments one patch per released change.
Sync-generated changes always emit a `patch` changeset, so `changeset version`
yields `0.0.1 → 0.0.2 → …`. Minor/major are reserved for a deliberate future
decision.

### `vendor-sync.yml` (scheduled)

`vendor-sync.yml` discovers the vendored packages from `scripts/vendors/*.ts`
and runs `scripts/run-vendor-sync.ts <package>` for each (a generated matrix, so
adding a package needs no workflow edit):

1. Run the package's sync with `--latest`.
2. If the tree changed, add a `patch` changeset for that package and open a PR
   titled `chore(<pkg>): sync <upstream> upstream`, showing the new ref/commit
   and the vendored diff.
3. CI (typecheck + tests + `--check`) runs on the PR. A human reviews and merges.
   No auto-merge.

### `release.yml`

On push to `main`, `changesets/action@v1`:

- opens or updates a **Version Packages** PR (`changeset version`);
- when that PR merges, runs `changeset publish` → npm.

Auth uses **npm trusted publishing (OIDC)**: `permissions: id-token: write`,
no `NPM_TOKEN`. If the npm account cannot use OIDC, fall back to an
`NPM_TOKEN` secret. Trusted publishing is configured per package on npmjs.com,
so each new package name needs it before its first publish (onboarding
checklist above). A `--dry-run` publish job runs on PRs so a broken manifest
fails before merge. `changesets/action` is package-agnostic: a new package is
versioned and published without any release-workflow change.

### Pi gallery

Publishing a package with the `pi-package` keyword makes it eligible for the Pi
gallery; there is no separate submission step. The listing updates on the
gallery's own refresh cadence after npm publish. `@giljae/pi-egm` already
appears; the first post-pipeline release updates it.

### Backfill

`@giljae/pi-egm` is already published at `0.0.1`. Migrating it onto the core and
adding `release.yml` means its next upstream sync publishes `0.0.2` the same way
as the new package.

## Verification

Offline (CI, every PR):

- `npm run check` (typecheck + vitest) passes.
- Core unit tests: ref resolution, transform fail-loud, sorted hashing,
  `--check` detects a hand edit.
- Per-package integrity tests: hashes match `UPSTREAM.json`; vendored trees are
  untouched except through transforms.
- Repo-level package tests iterate `packages/*` and assert the `pi-package`
  keyword, `files`, `publishConfig`, a `pi` manifest, and a `LICENSE`, so a new
  package is covered without new test code.
- A grep test asserts no package name is hardcoded in `scripts/`,
  `.github/workflows/`, or the repo-level tests.
- `run-vendor-sync <package> --check` reports no drift on a clean tree.
- `npm publish --dry-run` succeeds for each changed package.

Live (before README claims support):

1. `pi install npm:@giljae/pi-postgres-skills`; confirm the skills load and the
   `postgres-mcp` server connects.
2. Run one read-only scenario end to end (connect a read-only profile, list
   tables and sizes) and confirm tool names resolve.
3. Trigger `vendor-sync.yml` manually against the current pin; confirm it opens
   no-op or a PR as expected.
4. Confirm the new version and the updated `pi-egm` version appear on the gallery.

## Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Upstream rewords a transform anchor | Sync silently diverges | Core asserts exactly one match and throws; `--check` blocks the PR |
| A vendored file is hand-edited | Drift from the recorded commit | Integrity test fails CI |
| Arbitrary-SHA shallow fetch fails in CI | Sync cannot pin postgres | Use `init` + `fetch --depth 1 <sha>`; covered by a core unit test |
| A transform corrupts migration provider logic | Wrong guidance in a niche skill | Keep references untouched; one mapping note only |
| MCP version pin ages | Missing fixes, or `@latest` supply-chain risk | Pin in `dependencies`; bump via a dependabot PR |
| `postgres-mcp` bin resolution fails | MCP server does not start | Resolve the installed bin; a unit test asserts it; documented `npx` fallback |
| OIDC trusted publishing unavailable | Release fails | Fallback `NPM_TOKEN` secret; document both |
| Publishing under a Microsoft-like name | Endorsement confusion | Distinct `@giljae` scope, retained MIT attribution, explicit disclaimer |
| A new package bypasses the conventions | Misconfigured publish | Repo-level package tests iterate `packages/*`; onboarding checklist |
| Scheduling rots | Updates stop | `workflow_dispatch` on both workflows; `--check` still guards the last pin |

## Rollout

Two ordered, non-overlapping changes keep the refactor and the new package
from tangling.

**Phase 1 — shared core + release pipeline (no vendored content change).**

1. Freeze this design.
2. Add `scripts/lib/vendor.ts` and its unit tests; migrate `sync-egm.ts` onto
   it; run `sync-egm --ref v0.1.1 --check` to prove byte-identical output.
3. Add `run-vendor-sync.ts`, `vendor-sync.yml` (replacing `egm-sync.yml`), and
   `release.yml`; update `tests/workflows.test.ts`. Backfill `pi-egm` onto the
   release flow.
4. Run the offline suite and merge. The next EGM sync can publish
   `pi-egm@0.0.2`.

**Phase 2 — the new package (purely additive).**

5. Add `scripts/sync-postgres-skills.ts`, vendor the tree at the pinned commit,
   and add the package's integrity and manifest tests.
6. Add the MCP extension and its test.
7. Run the offline suite, then the live gates; publish
   `pi-postgres-skills@0.0.1`.

Phase 1 changes only shared infrastructure and `pi-egm`; Phase 2 only adds a
package. Each is independently reviewable and revertable; nothing publishes
until the release workflow is enabled in Phase 1.

Rollback is a revert of the affected phase's commits.

## Open decisions

- **Pinned upstream commit and ref strategy.** **My call:** pin an explicit
  `microsoft/postgres-skills` commit on `main` (no usable release tags), and
  detect movement by `git ls-remote` on the default branch.
- **Package name.** **My call:** `@giljae/pi-postgres-skills`.
- **MCP tool exposure.** **My call:** `codemode` for all tools at first; revisit
  `toolExposure` to expose read-only tools directly after live use.
- **npm publish auth.** **My call:** npm trusted publishing (OIDC); fall back to
  an `NPM_TOKEN` secret if the account cannot use OIDC.

Resolved with the owner: full mirror plus the OS-independent
`pi-path-separators` transform; `changesets/action` with a reviewable Version
Packages PR; EGM migrated in Phase 1, before the new package.
