# pi-pstack

- **Author:** [@giljae](https://github.com/giljae)
- **Status:** Approved
- **Date:** 2026-11-18
- **Tracking:** None. Downstream port of [`cursor/plugins` `pstack/`](https://github.com/cursor/plugins/tree/main/pstack) by Lauren Tan (MIT).
- **Builds on:** [`docs/designs/pi-postgres-skills.md`](pi-postgres-skills.md) and [`docs/designs/pi-design-skills.md`](pi-design-skills.md) (the shared vendoring core, its fail-loud transform model, the release pipeline, and the package conventions).

## Problem statement

Pi is an opinionated terminal agent that deliberately omits batteries other
harnesses ship: no built-in subagents, no plan mode, no multi-model review. That
is a strength, but it leaves a gap for engineers who want a rigorous,
opinionated workflow on top — reproduce before fixing, verify against the real
artifact, sequence verifiable units, delegate bulk work, and keep the main
thread's context small.

`pstack` (by Lauren Tan / "poteto") is a mature, actively developed answer. It
ships 58 Agent Skills (24 short principles plus 34 workflow skills), a
`poteto-mode` router with 22 playbooks, two subagent roles (`poteto-agent`,
`comment-sicko`), optional reference scripts, and a guide. It is MIT-licensed
and written in the Agent Skills format, so Pi can read most of it directly. The
work is not authoring content; it is porting a Cursor-first, subagent-first
workflow onto Pi so that installing one package gives people a working
workflow, not a pile of broken Cursor references.

Two Pi facts shape the whole design:

1. **Pi reads the skills almost as-is.** The frontmatter (`name`, `description`,
   `disable-model-invocation`) is the Agent Skills spec; extra Cursor fields
   warn and are ignored.
2. **Pi has no built-in subagent, but `pi-subagents` does.** `pi-subagents`
   discovers agent `.md` files (from a user agent dir and configured
   `agentScanDirs`) with its own frontmatter schema (`thinking`, `tools`,
   `model`, `inheritSkills`, `acceptanceRole`, …). That is where pstack's two
   agents and its per-role model routing have to land — optionally, never as a
   hard dependency.

pstack's own `docs/harness/claude-code.md` already proves the intended porting
model: keep the skills verbatim, add a harness adapter that maps Cursor names,
and skip Cursor-only steps with a one-line note. This port does the same for Pi.

## Scope

### Goals

- A new package `@giljae/pi-pstack` with a full mirror of `pstack/skills/**`
  (58 skills, 22 playbooks, references) and `pstack/agents/**`, vendored from a
  pinned `cursor/plugins` commit and adapted only by named, fail-loud transforms.
- A Pi harness adapter (`harness/pi.md`) that maps every Cursor name the skills
  use — `Task`, model slugs, `.cursor` paths, Bugbot, Automations, cloud agents,
  transcripts — onto Pi, and names the Cursor-only steps to skip.
- A skills-only first release that **works on a stock Pi with no extensions**.
  Every subagent step degrades to "do it in the main thread" when no subagent
  tool exists.
- An optional second milestone that turns the two pstack agents into
  `pi-subagents` agents and lets `poteto-mode` use real delegation, with
  per-role `thinking` levels, when `pi-subagents` is installed.
- Reuse the shared vendoring core so the existing `vendor-sync` and `release`
  workflows cover the package with no change.

### Non-goals

- Rewriting upstream skill prose. Cursor names stay in the skills; the adapter
  maps them at runtime, exactly as upstream does for Claude Code.
- Shipping the `pstack/docs/` guide (2.3 MB, mostly images, Cursor-oriented) or
  the public logo asset. The README links upstream instead.
- Shipping the Benny automation pack (`pstack/automations/benny/`). It runs on
  Cursor Automations and has no Pi equivalent.
- Building a Pi extension. This is a skills package plus vendored agent files,
  following the `pi-design-skills` shape, not the `pi-egm` extension shape.
- Curating a "best-of" subset of skills. The mirror is one-to-one so weekly
  syncs stay mechanical.

### Anti-goals

- Hand-editing the vendored tree. Only the descriptor and its transforms may
  change vendored output.
- A transform that skips silently when upstream wording or frontmatter moves.
- A hard dependency on `pi-subagents`. Installing `@giljae/pi-pstack` must not
  fail or degrade when it is absent.
- Hardcoding Cursor model slugs into the shipped skills. They are mapped by the
  adapter, never rewritten in place.

## Approaches considered

| Approach | Decision | Rationale |
| --- | --- | --- |
| **A. Skills-only, self-contained** | **First release** | Install-and-run on stock Pi; the only failure mode left is "less parallelism". The 24 principles and the standalone skills are model-agnostic and useful immediately. |
| **B. A + optional `pi-subagents` integration** | **Target** | `pi-subagents` supplies exactly the missing primitive (fresh, tool-scoped, model-selectable children). Wiring the two pstack agents and per-role `thinking` levels revives `poteto-mode`'s delegation without forcing a dependency. |
| **C. Verbatim full mirror + adapter** | Rejected | Faithful, but ships 6 MB of dead weight (guide images, statechart test corpus), a Cursor-oriented guide, and a `setup-pstack` that writes a `.mdc` file no Pi reads. High confusion, high maintenance, no user benefit. |

There is no single sensible way: A and B are genuinely different products, and
C is a real (if weaker) option. We chose **B as the target with A as the first
release**, because a public package's first obligation is that `pi install`
never breaks, and delegation can be layered on afterward without changing the
install story.

**My call:** the network cost of vendoring from the `cursor/plugins` monorepo
(fetching the whole default branch to reach the `pstack/` subtree) is accepted
for now; see Risks.

## Repository layout (delta)

```text
scripts/vendors/
  pi-pstack.ts                     # NEW: descriptor + fail-loud transforms
scripts/lib/
  vendor.ts                        # MODIFIED: add optional `exclude`
packages/
  pi-pstack/                       # NEW
    package.json
    LICENSE                        # MIT, Copyright (c) 2026 Lauren Tan
    README.md                      # authored
    harness/pi.md                  # authored: the Pi adapter
    agents/                        # vendored, transformed, never hand-edited
    skills/                        # vendored, transformed, never hand-edited
    UPSTREAM.json                  # generated
    tests/vendor.test.ts
tests/
  pi-pstack-transforms.test.ts      # NEW
docs/designs/pi-pstack.md           # this document
```

No workflow change: `vendor-sync.yml` discovers `scripts/vendors/*.ts`, and
`release.yml` is package-agnostic.

## The `@giljae/pi-pstack` package

### Vendored content

From a pinned `cursor/plugins` commit (`93b916d4a1e806507e22f4716b352fa91f2b227e`
at design time):

- `pstack/skills/**` → `skills/` — 58 `SKILL.md`, 22 playbooks, references, and
  the runtime scripts for `poteto-mode` (`watch-pr`, `worktree-audit.sh`) and
  `statechart`.
- `pstack/agents/**` → `agents/` — `poteto-agent.md`, `comment-sicko.md`.
- **Excluded:** `pstack/skills/statechart/scripts/test/**` (3.6 MB of TLA+/TLC
  test corpus, never used at runtime), `pstack/docs/**`, `pstack/assets/**`,
  and `pstack/automations/**`.

### New capability in the shared core: `exclude`

`VendorSpec` gains an optional `exclude?: string[]` of destination-relative
paths or directory prefixes. After `copyVendored`, the core deletes every match,
so excluded files are neither transformed nor hashed. This is the only shared
change; it is additive, needs its own test, and lets any descriptor drop heavy
fixtures without per-file `include` lists. **My call:** implement `exclude` here
rather than enumerate 58 include entries or accept 3.6 MB of test corpus.

### Transforms (the only adaptations)

Two, both fail-loud (missing anchor → the sync throws):

1. **`pi-host-note`** — `include: ^skills/[^/]+/SKILL\.md$`. In the frontmatter
   it drops the Cursor-only keys no Pi build reads (`icon`, `color`,
   `alwaysApply`, `paths`; present in `poteto-mode`, `setup-pstack`, and
   `typescript-best-practices`), so Pi emits no invalid-field warning. After the
   frontmatter it inserts one line:

   > On Pi, read `harness/pi.md` at this package's root before acting, and map
   > every Cursor name it lists (Task, model slugs, `.cursor` paths) onto Pi.

   Mirrors the `pi-host-pointer` precedent in `pi-postgres-skills`. Because
   `poteto-mode` is always the entry point and every skill carries the pointer,
   the adapter is read wherever a workflow starts. Throws if the line is already
   present or a key it must strip is missing from a file it matched.

2. **`pi-agent-frontmatter`** — `include: ^agents/[^/]+\.md$`. Rewrites each
   vendored agent's YAML frontmatter to the `pi-subagents` schema so the same
   files serve milestone B without a second copy:
   - drop `is_background` (Pi subagents choose foreground/background per call);
   - replace the Cursor `model:` slug with `thinking: high` and no fixed
     `model` (Pi inherits the session model unless the user pins one);
   - keep `name` and `description` verbatim; add `inheritSkills: false` so a
     child reads pstack skills through its brief rather than inheriting the
     parent's catalog.
   The transform asserts each expected field exists once, so an upstream
   restructure fails the sync instead of shipping unconverted frontmatter.

**My call:** `setup-pstack` is not rewritten. Its Cursor-only write
(`~/.cursor/rules/pstack-models.mdc`) is redirected by `harness/pi.md`, which
tells the agent the Pi behavior (skip model pinning on a stock Pi; configure
`pi-subagents` role models in milestone B). One adapter, not a divergent skill.

### Authored files

- **`harness/pi.md`** — the Pi adapter, modeled on upstream's
  `docs/harness/claude-code.md`. Tables for: `Task` → `subagent` (or in-thread
  when absent); `AskQuestion` → ask in plain text; the todo list → the plan
  file or reply checklist; `subagent_type` → `pi-subagents` `agent`; Cursor
  model slugs → `thinking` levels / the user's configured Pi models; `.cursor`
  paths and `~/.cursor/projects/<slug>/agent-transcripts/` → the package's
  `skills/` and `~/.pi/agent/sessions/`; and a Cursor-only section (Bugbot,
  Automations, cloud agents, the built-in PR tool) that uses the upstream
  convention `Skipped on Pi: <step>. <reason>.` then continues.
- **`README.md`** — what pstack is, `pi install npm:@giljae/pi-pstack`, a short
  tour (`poteto-mode`, the principles, `unslop`, `tdd`, `how`/`why`), the
  optional `pi-subagents` story, MIT attribution, and "not affiliated with
  Lauren Tan or Cursor".
- **`LICENSE`** — upstream MIT text, Copyright (c) 2026 Lauren Tan.

### Manifest

```json
{
  "name": "@giljae/pi-pstack",
  "version": "0.0.1",
  "license": "MIT",
  "repository": { "type": "git", "url": "https://github.com/giljae/pi-extensions.git", "directory": "packages/pi-pstack" },
  "keywords": ["pi-package", "pstack", "poteto-mode", "workflow", "principles"],
  "publishConfig": { "access": "public" },
  "type": "module",
  "files": ["skills", "agents", "harness", "README.md", "LICENSE"],
  "pi": { "skills": ["./skills"] }
}
```

`agents/` is shipped as plain files for milestone B (it is not a Pi package
resource type). No `dependencies`.

### Milestone B — optional `pi-subagents` integration (release 0.1.0)

`pi-subagents` discovers agents from installed Pi packages: it scans
`~/.pi/agent/npm/node_modules` (and the project equivalent), reads each
package's `package.json`, and loads every directory listed under
`pi-subagents.agents` or `pi.subagents.agents`. The integration is therefore
declarative — no setup skill, extension, or `agentScanDirs` edit:

- `package.json` declares `"pi-subagents": { "agents": ["./agents"] }`. With
  `pi-subagents` installed the two agents load automatically; without it the
  key is inert.
- `pi-agent-frontmatter` also sets each agent's `tools` and `acceptanceRole`: a
  comment reviewer must not edit. `poteto-agent` is a writer
  (`read, grep, find, ls, bash, edit, write`, `acceptanceRole: writer`);
  `comment-sicko` is read-only (`read, grep, find, ls`,
  `acceptanceRole: read-only`).
- `harness/pi.md` maps `poteto-agent`/`comment-sicko` to the registered agents,
  maps each pstack role (code, judgment, panels, swarm workers) to a
  `pi-subagents` `thinking` level, and points per-role *model* choice at
  `pi-subagents`' own configuration, so no Cursor slug is ever used.
- `poteto-mode`'s subagent steps route through the adapter, so no skill edit is
  needed to switch from in-thread to delegated.

## Verification

Offline (CI, every PR):

- `npm run check` (typecheck + vitest) passes.
- `tests/pi-pstack-transforms.test.ts`: `pi-host-note` inserts exactly once and
  throws when present; `pi-agent-frontmatter` maps a fixture and throws on a
  missing field; `exclude` deletes the matched tree.
- `packages/pi-pstack/tests/vendor.test.ts`: `checkVendor(spec)` is true; every
  `skills/*/SKILL.md` exists and carries exactly one Pi note; no vendored skill
  frontmatter retains `icon`, `color`, `alwaysApply`, or `paths`; `agents/*.md`
  carry `thinking:` and no `is_background`/Cursor `model:`; the excluded
  `statechart/scripts/test` path is absent; the skill count is 58.
- `run-vendor-sync pi-pstack --check` reports no drift.
- The repo-level `tests/packages.test.ts` covers the manifest, `repository`,
  `LICENSE`, and `pi` conventions.

Live (before the README claims support):

1. `pi -e ./packages/pi-pstack`; confirm `/skill:poteto-mode` resolves and the
   host note routes the agent to `harness/pi.md`.
2. Run one in-thread scenario (a small bug fix) and confirm the adapter's
   "no subagent tool" path is followed without error.
3. Milestone B: with `pi-subagents` installed, run one `poteto-mode` task and
   confirm a `poteto-agent` child is spawned on the configured `thinking` level.

## Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| `cursor/plugins` is a large monorepo; the core fetches the whole branch | Slow syncs, heavy CI | Pin a commit; include only `pstack/**`. If it hurts, add a blobless fetch to the core as a follow-up (out of scope here). |
| Upstream rewords a transform anchor | Sync silently diverges | Both transforms assert their anchor and throw; `--check` blocks the PR. |
| A vendored file is hand-edited | Drift from the recorded commit | Integrity test fails CI. |
| Upstream moves fast (v0.15.x) | Frequent sync PRs | The `vendor-sync` workflow opens one PR per move; transforms keep diffs mechanical. |
| Skills keep Cursor names (`Task`, `~/.cursor/...`) | Confuses a Pi user or model | Every skill carries the host note; the adapter maps names and skips Cursor-only steps. |
| Generic skill names collide with a user's other skills | One skill wins, a warning | Documented in the README; upstream names kept on purpose. |
| The `statechart` skill needs Node + a TLA+/TLC toolchain | Skill appears broken when tools are absent | Documented in the README; the skill's own text already gates on tooling. |
| `pi-subagents` changes its agent schema or config location | Milestone B breaks | Integration is optional and additive; the schema is pinned in the transform test, and the adapter degrades to in-thread. |

## Rollout

**Milestone A — `0.0.1` (skills-only, self-contained)**

1. Add `exclude` to `scripts/lib/vendor.ts` with a test.
2. Add `scripts/vendors/pi-pstack.ts` (`pi-host-note`,
   `pi-agent-frontmatter`) and `tests/pi-pstack-transforms.test.ts`.
3. Vendor the tree; add `UPSTREAM.json` and `tests/vendor.test.ts`.
4. Author `package.json`, `LICENSE`, `README.md`, `harness/pi.md`.
5. Run `npm run check`, `npm run vendor:check`, and
   `npm publish --dry-run --workspace packages/pi-pstack`; add a `patch`
   changeset.

**Milestone B — `0.1.0` (optional `pi-subagents`)**

6. Add the `agentScanDirs` registration and the per-role mapping to
   `harness/pi.md`; add the live subagent check.

Rollback is a revert of the descriptor, core, and package commits; nothing
publishes until a changeset merges. The `watch-pr` and `statechart` runtime
scripts can be split into a later `@giljae/pi-pstack-tools` package if the
skills package proves too heavy on its own.
