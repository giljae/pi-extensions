# Pi extensions monorepo and the pi-egm package

- **Author:** [@giljae](https://github.com/giljae)
- **Status:** Proposal. Supersedes the fork-local `docs/designs/pi_support.md` draft in `giljae/elephant-goldfish-model`.
- **Date:** 2026-11-17
- **Tracking:** None. This is a standalone downstream project, not an upstream EGM contribution.

## Problem statement

EGM's review workflow needs a fresh-context, read-only subagent tool. Pi ships
one no. A working downstream package already exists
([`@estebanforge/pi-egm`](https://www.npmjs.com/package/@estebanforge/pi-egm)),
but it **vendored the EGM skills once and never set up a sync path**: its repo
has no CI and no automation, so it drifts from upstream as
`google/elephant-goldfish-model` changes.

This project builds a personal Pi package monorepo that publishes several
`pi-package`s to the [Pi gallery](https://pi.dev/packages), starting with
`@giljae/pi-egm`. Its defining feature is a **deterministic, reviewed upstream
sync** for the vendored EGM content, so Google's updates flow in through a pull
request rather than manual re-copying.

## Scope

### Goals

- A private npm-workspaces monorepo (`giljae/pi-extensions`) that hosts several
  independently published `@giljae/pi-*` packages.
- `@giljae/pi-egm`: the seven EGM skills, nine personas, five standards, and
  execution instructions, vendored from a pinned EGM release, plus a bundled
  read-only reviewer tool and a Pi guide.
- A `sync-egm` script and a scheduled workflow that opens a PR when upstream
  EGM moves, updating the pinned ref and the vendored files together.
- A vendoring integrity test that fails when a vendored file is edited by hand
  or when the recorded hashes do not match the tree.
- Publish every package to npm (public scope) so it appears in the Pi gallery.

### Non-goals

- Contributing to upstream `google/elephant-goldfish-model`. This is downstream.
  The open upstream issue
  [#276](https://github.com/google/elephant-goldfish-model/issues/276) and the
  closed PR [#275](https://github.com/google/elephant-goldfish-model/pull/275)
  are context, not this project's deliverable.
- Forking or rewriting EGM's workflow logic or persona intent.
- A runtime service, MCP server, or network fetch at install time.
- Building packages beyond `pi-egm` in this design; they follow the same
  conventions once the skeleton exists.

## Approaches considered

| Approach | Decision | Rationale |
| --- | --- | --- |
| Add a thin Pi layer inside the EGM fork | Rejected | The fork cannot be published to the gallery as a multi-package monorepo, and mixing a Pi package with the EGM plugin root complicates upstream merges |
| One repo per Pi package | Rejected | The owner wants several packages; shared tooling and a shared release flow are cheaper in one workspace |
| `git subtree` of upstream into the package | Rejected | Pulls the whole upstream tree (site, tests, CI) into a publishable package and conflicts with the required text rewrites |
| Git submodule of upstream | Rejected | npm and pi.dev consumers receive submodule content unreliably |
| Manual re-vendoring (what `@estebanforge/pi-egm` does) | Rejected | This is the drift problem the project exists to solve |
| **Sync script + pinned ref + scheduled PR (chosen)** | Accepted | Deterministic, testable, copies only the needed subset, and turns upstream changes into a reviewed PR |

## Repository layout

```text
pi-extensions/
  package.json                     # private root: workspaces, scripts, devDeps
  tsconfig.json
  vitest.config.ts
  .changeset/                      # per-package versioning and changelogs
  .github/workflows/
    ci.yml                         # typecheck + tests + vendor integrity
    egm-sync.yml                   # scheduled upstream check -> PR
  scripts/sync-egm.ts             # vendoring and rewrite rules
  packages/
    pi-egm/
      package.json                 # @giljae/pi-egm
      UPSTREAM.json                # pinned repo/ref/commit + per-file sha256
      PI.md                        # Pi guide, hand-written
      extensions/                  # reviewer tool, hand-written
      skills/ agents/ resources/ docs/   # vendored, never hand-edited
      tests/
    pi-shared/                     # optional: child-process lifecycle
```

**My call:** npm workspaces with no build step; packages publish raw
TypeScript and Pi loads it directly, matching the working `@estebanforge`
precedent. `pi-shared` is added only when a second package needs the same
helper, not up front.

### Conventions for every package

- Manifest: unique `name`, `pi-package` keyword, `publishConfig.access:
  "public"`, minimal `files` (runtime only), `pi` manifest with `extensions`
  and `skills` where present.
- Plain library packages carry no `pi.extensions` and say so in their README.
- Version is per package. A package's version changes only when it releases.

## Vendoring and upstream sync

### The pinned upstream

`packages/pi-egm/UPSTREAM.json` records the source of truth:

```json
{
  "repo": "https://github.com/google/elephant-goldfish-model",
  "ref": "v0.1.1",
  "commit": "<40-char sha>",
  "transforms": ["pi-pointer", "pi-dispatch-name"],
  "files": { "skills/egm-review/SKILL.md": "<sha256>", "...": "..." }
}
```

EGM publishes release tags (`v0.1.0`, `v0.1.1`), so the pin is a tag plus its
resolved commit. The commit is the immutable part.

### `scripts/sync-egm.ts`

Given `--ref v0.1.1` (or `--latest` for the newest tag), the script:

1. Resolves the ref to a commit and downloads that commit's tarball.
2. Copies the allowlisted subset into `packages/pi-egm/`: `skills/**`,
   `agents/*.md`, `resources/**`, and `docs/codex.md` plus `docs/claude.md`
   (the skills link to both).
3. Applies two deterministic transforms:
   - after each skill's `In Claude Code or Cowork, read ... first.` line, insert
     `In Pi, read \`../../PI.md\` first.`;
   - append `Pi: egm_goldfish` to each `spawn ... subagent tool (...)` dispatch
     enumeration.
4. Refuses to run if a transform does not match exactly once per skill, so an
   upstream wording change fails loudly instead of silently skipping.
5. Rewrites `UPSTREAM.json` with the new ref, commit, and per-file SHA-256.
6. Prints a summary and exits non-zero when nothing changed.

**My call:** the vendored host links stay intact by copying `docs/codex.md` and
`docs/claude.md` rather than deleting lines. Deleting canonical lines would
drift the text further than necessary.

### Scheduled sync PR

`.github/workflows/egm-sync.yml` runs weekly and on `workflow_dispatch`:

1. `npx tsx scripts/sync-egm.ts --latest`.
2. If the tree changed, commit on a `sync-egm` branch and open a PR that names
   the old and new EGM refs and shows the vendored diff.
3. CI runs on that PR. A human reviews and merges; the release follows the
   normal per-package flow.

A failed transform or a non-empty diff against the pinned hashes blocks the PR.

## The pi-egm package

### Vendored content

`skills/`, `agents/`, `resources/`, and the two linked `docs/*.md` files are
generated and marked read-only in the repo (`CODEOWNERS` or a comment header is
unnecessary; the integrity test is the guard). `PI.md` and `extensions/` are
hand-written and never touched by `sync-egm.ts`.

### Reviewer tool

`extensions/egm-goldfish/index.ts` registers one tool, `egm_goldfish`, with
parameters `{ role, target, model?, thinking_level? }`.

- `role` is a persona `name` from the vendored `agents/*.md`, resolved in code
  so a project file cannot substitute a bundled persona.
- It spawns a fresh `pi` child with **`--no-context-files --no-session
  --no-mcp --no-skills --no-prompt-templates`** and **`--tools
  read,grep,find,ls`**, and appends the persona body as the system prompt.
- It does **not** pass `--no-extensions`. Provider extensions are how Pi reaches
  some models, and disabling them leaves the reviewer unable to run. Recorded as
  a live finding on 2026-11-17; tool isolation comes from the allowlist instead.
- **My call:** reviewers get no `bash`, `edit`, or `write`. The parent writes
  every report; the reviewer returns findings as text. This is stricter than
  `@estebanforge/pi-egm`, which leaves `bash` and `write` enabled, and matches
  EGM's read-only reviewer mandate.
- `--no-context-files` disables `AGENTS.md`/`CLAUDE.md`. Whether Pi still loads
  `APPEND_SYSTEM.md` is an open verification item (see Risks).
- The child runs from a neutral directory; project paths are passed absolute.

### Pi guide (`PI.md`)

States: install; that EGM skills are user-invocable only; path resolution
(package root for `agents/`, `resources/`, `docs/`; skill directory for
`references/`; project working directory for user files); the `EGM artifact
directory: <path>` override; delegation through `egm_goldfish` with `role`; the
read-only launch; that the parent writes reports and human gates are preserved;
and that installing the package runs its extension code.

## Tooling and publishing

- **Tests:** `vitest`. Two suites in `packages/pi-egm/tests/`: a vendoring
  integrity test (hashes, Pi pointers, transform counts) and an extension test
  (registered tool, isolation flags, no `bash`/`edit`/`write`).
- **Release:** `@changesets/cli`. `changeset` records intent, `changeset
  version` bumps versions and changelogs, `changeset publish` publishes changed
  packages. Publish stays human-triggered.
- **Gallery:** publishing a package with the `pi-package` keyword lists it on
  pi.dev. The repo name is irrelevant; each package name is the listing.
- **CI:** `.github/workflows/ci.yml` runs typecheck, tests, and the integrity
  test on every PR.

## Verification

Offline (CI, every PR):

- `vitest run` passes, including the hash integrity test.
- `tsc --noEmit` passes.
- `sync-egm.ts --ref <pinned>` reports no changes on a clean tree.
- Every vendored skill contains exactly one Pi pointer and one `Pi: egm_goldfish`.

Live (before the README claims working support), recorded in the package README
or `docs/`:

1. `pi install npm:@giljae/pi-egm` from a clean Pi version, then run
   `egm-brainstorm`, `egm-draft`, and `egm-review` end to end with interactive
   pauses.
2. Ask an `egm-*` reviewer to write a file; confirm it has no write or bash tool.
3. Place a parent marker; confirm no reviewer receives it, and confirm no
   `AGENTS.md`/`CLAUDE.md`/`APPEND_SYSTEM.md` content reaches the reviewer.

## Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| `--no-extensions` disables the provider extension | A reviewer cannot reach any model and the tool fails | Do not pass `--no-extensions`; keep the `--tools` allowlist for tool isolation. Found live on 2026-11-17. |
| An installed extension appends system-prompt context | Extension-injected text influences a reviewer | Tool isolation is enforced by the allowlist; document the residual and advise keeping context-injecting extensions out of review sessions |
| `APPEND_SYSTEM.md` still loads in the child | Project-planted facts leak to reviewers | `--no-context-files` disables it on Pi 1.5.2 (probe returned UNKNOWN); treat as host-version-dependent and never rely on it |
| Upstream rewrites skill preamble wording | The transform silently skips | The script asserts exactly one match per skill and exits non-zero otherwise |
| Vendored files edited by hand | Drift from `UPSTREAM.json` | Integrity test fails CI; the sync PR is the only path that changes them |
| Scheduled workflow rots or is disabled | Updates stop flowing | The integrity test still passes on the last pin; the workflow is manual-dispatchable and documented in the README |
| Publishing under a Google-like name | Endorsement confusion | Distinct `@giljae` scope, retained Apache-2.0 attribution, and "not an officially supported Google product" in every package |
| EstebanForge's package already exists | Duplicate effort | This package differentiates on sync automation and stricter read-only reviewers; name and README say so |

## Rollout and rollback

1. Freeze this design.
2. Scaffold the monorepo skeleton and `pi-shared` (only if needed).
3. Implement `sync-egm.ts`, the vendored `pi-egm` tree, and its integrity test.
4. Implement the `egm_goldfish` extension and `PI.md`, with the extension test.
5. Add `ci.yml` and `egm-sync.yml`.
6. Run the offline suite, then the live gates; publish to npm.

Rollback is a revert of the scaffold commit; nothing is published until the
live gates pass.

## Open decisions

- **Repository and npm scope.** **My call:** `giljae/pi-extensions` and
  `@giljae/*`. Confirm the npm account or org owns `@giljae`.
- **Pinned starting ref.** **My call:** `v0.1.1`, the newest upstream tag.
- **Tool name.** **My call:** `egm_goldfish`, matching the existing downstream
  convention. Renaming later means re-running the sync transform.
- **Disposition of the fork draft.** **My call:** revert the uncommitted
  `docs/designs/pi_support.md` and its index row in
  `giljae/elephant-goldfish-model`; this document replaces them.
