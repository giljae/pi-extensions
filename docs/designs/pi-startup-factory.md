# pi-startup-factory

- **Author:** [@giljae](https://github.com/giljae)
- **Status:** Draft
- **Date:** 2026-11-19
- **Tracking:** None. Independent Pi package. **Concept inspired by**
  [`tiagoapolo/startup-factory`](https://github.com/tiagoapolo/startup-factory);
  no upstream file, text, or prompt is copied (the upstream ships **no license**,
  so nothing may be redistributed from it).
- **Builds on:** [`docs/designs/pi-pstack.md`](pi-pstack.md) (a small
  hand-written Pi layer over an existing delegation extension) and the shared
  package conventions (manifest, tests, changesets, release pipeline).

## Problem statement

A founder can ask a coding agent "is this idea worth 30 days?" and get a
confident answer built on vibes. The valuable version is the opposite: parallel
research from real sources, a judge that is allowed to say no, and a 30 day plan
with pass/fail thresholds — stopping for the founder at the two decisions that
matter.

Pi can do this today, but nothing packages the *process*. Two mature extensions
already supply the hard parts:

- [`pi-web-access`](https://www.npmjs.com/package/pi-web-access) — keyless web
  search, page/PDF fetch, and source checking (`web_search`, `fetch_content`,
  `get_search_content`, `source_check`), zero config via Exa MCP.
- [`pi-subagents`](https://www.npmjs.com/package/pi-subagents) — delegation to
  fresh, isolated child agents, with single / parallel / chain modes.

This package is the missing content: an orchestrator skill, seven focused
specialist agents, and the scoring/plan/state references that make the pipeline
honest and resumable. It is a **content pack over `pi-subagents` + `pi-web-access`**,
not a reimplementation of web access or delegation.

## Scope

### Goals

- A new package `@giljae/pi-startup-factory` that runs a six-stage pipeline from
  a niche or idea:
  1. Intake → `brief.md`
  2. Parallel research → `research/market.md`, `research/pains.md`,
     `research/viability.md`
  3. Verdict → `verdict.md`, then **Gate 1** (founder decides)
  4. Plan → `plan.md`, critic review → `review.md` (≤ 2 revisions), then
     **Gate 2** (founder approves)
  5. Build plan → `build.md`
  6. Wrap → `summary.md`
- Seven specialist agents, each with an original, method-specific prompt:
  `factory-scout`, `factory-miner`, `factory-analyst`, `factory-judge`,
  `factory-strategist`, `factory-critic`, `factory-architect`.
- A resumable run model: `runs/<YYYYMMDD>_<slug>/` with `state.json` and
  `decisions.md`, so an interrupted session continues from the recorded stage.
- Honesty by construction: every factual claim cites a source, every number is
  labeled `ESTIMATE` with its math, and the judge may return `NO GO`.
- A `/factory <idea>` prompt template so the Pi command matches the concept.
- Works on a stock Pi **without** `pi-subagents` by falling back to the main
  thread (the `pi-pstack` harness pattern), and uses `pi-subagents` when present.

### Non-goals

- Copying any file, prompt, or sentence from `tiagoapolo/startup-factory`.
- Vendoring. There is nothing to vendor: this is hand-written, so there is no
  `UPSTREAM.json`, no `scripts/vendors/` descriptor, and no sync workflow entry.
- Shipping our own web-search or subagent machinery. `pi-web-access` and
  `pi-subagents` own that; we depend on and document them.
- Automating external actions. The pipeline only writes documents: it never
  sends messages, publishes pages, buys ads, or spends money.
- Guaranteeing a specific search provider. `pi-web-access` already handles
  provider selection and fallbacks.

### Anti-goals

- A pipeline that fabricates numbers, companies, quotes, or dates. Every agent
  is told to write "not found" rather than guess.
- A soft judge that keeps a run alive against the evidence. A `NO GO` must be
  shown plainly.
- Answering a founder gate on the founder's behalf.

## Approaches considered

| Approach | Decision | Rationale |
| --- | --- | --- |
| **Content pack over `pi-subagents` + `pi-web-access`** | **Accepted** | Both hard parts already exist and are maintained; the missing value is the process, the roles, and the honesty rules. Small package, no maintenance of scraping or delegation. |
| Direct port of the upstream repo | Rejected | The upstream has no license (confirmed: no `LICENSE`, absent from git history, GitHub license API returns 404). Redistributing it into an npm package is copyright infringement and exposes the publisher. |
| Reimplement web search/fetch inside this package | Rejected | `pi-web-access` is zero-config, multi-provider, and already integrated with `pi-subagents`' built-in `researcher`. Rebuilding it adds a fragile scraper for no capability. |
| Ship our own subagent extension (like `pi-egm`'s tool) | Rejected | `pi-subagents` is the standard, supports parallel/chain/background, and discovers package agents through `pi-subagents.agents`. A bespoke tool would duplicate it. |
| One generic `researcher` agent reused for all three research roles | Considered, rejected | The three roles have distinct methods (search-trend analysis, review mining, traffic→revenue math). Separate prompt files keep each method sharp and the outputs comparable. |

### The one environment-driven constraint

`pi-subagents` foreground children do **not** load the parent's ambient
extensions, so a child does not automatically see `pi-web-access` tools. The
package handles this explicitly rather than silently:

- Research/verification agents list the `pi-web-access` tool names in
  `tools` and document `pi-web-access` as a companion install.
- The orchestrator skill checks a child's status block: if a web step reports
  missing web tools, it reruns that step as a background child (`async: true`,
  which **does** load ambient extensions) or, failing that, in the main session,
  which always has them. It never silently produces a sourceless report.

## Repository layout (delta)

```text
packages/
  pi-startup-factory/              # NEW
    package.json                   # pi-package keyword, pi + pi-subagents manifests, MIT
    LICENSE                        # MIT, Copyright (c) 2026 giljae
    README.md
    skills/
      startup-factory/
        SKILL.md                   # orchestrator
        references/
          scoring.md               # judge rubric, thresholds, verdict format
          run-layout.md            # run folder, state.json schema, decisions.md
    agents/
      factory-scout.md
      factory-miner.md
      factory-analyst.md
      factory-judge.md
      factory-strategist.md
      factory-critic.md
      factory-architect.md
    prompts/
      factory.md                   # /factory <idea>
    tests/
      package.test.ts
      agents.test.ts
      skill.test.ts
docs/
  designs/pi-startup-factory.md    # this file
  superpowers/plans/2026-11-19-pi-startup-factory.md
.changeset/<id>.md
README.md                          # add a row
NOTICE                             # add an inspiration note (no license obligation)
```

## Package manifest

```jsonc
{
  "name": "@giljae/pi-startup-factory",
  "license": "MIT",
  "keywords": ["pi-package", "startup", "validation", "market-research", "subagents"],
  "publishConfig": { "access": "public" },
  "type": "module",
  "files": ["skills", "agents", "prompts", "README.md", "LICENSE"],
  "pi": { "skills": ["./skills"], "prompts": ["./prompts"] },
  "pi-subagents": { "agents": ["./agents"] },
  "peerDependencies": { "@earendil-works/pi-coding-agent": "^1.0.0" },
  "peerDependenciesMeta": { "@earendil-works/pi-coding-agent": { "optional": true } }
}
```

## Agents

Each agent is a markdown file with `pi-subagents` frontmatter (`name`,
`description`, `tools`, `thinking`, `acceptanceRole`, `inheritSkills: false`)
and an original system prompt written for this package. Names are prefixed
`factory-` so they cannot collide with other packages' agents.

| Agent | Writes | Tools | thinking | Role |
| --- | --- | --- | --- | --- |
| `factory-scout` | `research/market.md` | read, write, web_search, fetch_content, get_search_content | medium | competitors, pricing, search demand |
| `factory-miner` | `research/pains.md` | read, write, web_search, fetch_content, get_search_content | medium | reviews, forums, real complaints |
| `factory-analyst` | `research/viability.md` | read, write, web_search, fetch_content, get_search_content | medium | market size, traffic→revenue math |
| `factory-judge` | `verdict.md` | read, write, web_search, fetch_content, source_check | high | score evidence, GO / PIVOT / NO GO |
| `factory-strategist` | `plan.md` | read, write | medium | 30 day validation plan |
| `factory-critic` | `review.md` | read, write, web_search, fetch_content | high | stress-test the plan |
| `factory-architect` | `build.md` | read, write, web_search, fetch_content | medium | tooling and build plan |

Model choice stays with the operator: agents declare only a `thinking` level and
inherit the session model, mirroring `pi-pstack`. Operators raise the model for
`factory-judge` and `factory-critic` in `pi-subagents` configuration if they want
a stronger judge than the researcher.

## Testing

- `tests/package.test.ts` — manifest: name, MIT, `pi-package` keyword, non-empty
  `files`, `pi.skills`, `pi-subagents.agents`, LICENSE present, repository URL.
- `tests/agents.test.ts` — all seven agents exist; each has `name`/`description`/
  `tools` frontmatter; names are unique and `factory-` prefixed; web agents list
  `web_search`; judge/critic use `thinking: high`; every agent sets
  `inheritSkills: false`.
- `tests/skill.test.ts` — `SKILL.md` frontmatter has `name`/`description`; it
  names both gates and the fallback path; referenced `references/` files exist.
- Repo-level `tests/packages.test.ts` covers the package automatically.

## Rollout

Hand-written package, so: `npm install` (lockfile), `npm run check`,
`npx changeset` for `@giljae/pi-startup-factory` at `minor`. No vendor
descriptor, no `UPSTREAM.json`, no workflow change. First publish uses the
documented `0.0.1-stage` bootstrap before the trusted publisher is configured.

## Provenance and license

MIT, Copyright (c) 2026 giljae. Original work; the pipeline shape is inspired by
`tiagoapolo/startup-factory`, which is unlicensed and therefore contributes no
code or text. Not affiliated with the upstream author.
