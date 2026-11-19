# Plan: pi-startup-factory

- **Design:** [`docs/designs/pi-startup-factory.md`](../../designs/pi-startup-factory.md)
- **Date:** 2026-11-19
- **Branch:** `feat/pi-startup-factory`

## Steps

1. **Package skeleton** — `packages/pi-startup-factory/package.json` with the
   `pi-package` keyword, `pi.skills` + `pi.prompts`, `pi-subagents.agents`, MIT,
   `files`, `repository`, `publishConfig`; `LICENSE` (MIT). Run `npm install` so
   the workspace enters the lockfile.
2. **Orchestrator skill** — `skills/startup-factory/SKILL.md`: input handling
   (`<idea>`, `status`, `resume <run>`), setup, the six stages, the two gates,
   the main-thread fallback, and the honesty rules. Written from scratch.
3. **References** — `references/run-layout.md` (run folder, `state.json` schema,
   `decisions.md`) and `references/scoring.md` (judge rubric, thresholds,
   `GO` / `PIVOT` / `NO GO`, three-signal rule).
4. **Seven agents** — `agents/factory-*.md` with `pi-subagents` frontmatter and
   original method prompts; `factory-` prefix to avoid collisions.
5. **Prompt template** — `prompts/factory.md` for `/factory <idea>`.
6. **Tests** — `tests/package.test.ts`, `tests/agents.test.ts`,
   `tests/skill.test.ts`.
7. **README + changeset** — package README, a row in the root README, an
   inspiration note in `NOTICE`, and a `minor` changeset.
8. **Verify** — `npm run check` (typecheck + 75+ tests) and `npm run vendor:check`
   (unchanged; no new vendored tree).

## Verification gate

- `npm run check` passes.
- `npx tsx -e` sanity: package JSON parses and matches the design manifest.
- Manually read `SKILL.md` and each agent once against the design's honesty rules.

## Out of scope

- Publishing. The `0.0.1-stage` bootstrap + trusted publisher is a separate,
  human-run step after review.
