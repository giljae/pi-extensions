# Changelog

## [0.0.1] - 2026-11-17

Initial release.

### Added

- All seven EGM skills, the reviewer personas (eight Goldfish, the synthesizer,
  and the bootstrap orchestrator), the five document standards, and execution
  instructions, vendored from `google/elephant-goldfish-model` v0.1.1
  (Apache-2.0). The only text changes are one Pi routing line per skill and the
  `Pi: egm_goldfish` dispatch name.
- `egm_goldfish`, a read-only reviewer tool: each reviewer runs in a fresh `pi`
  child process (`--no-context-files --no-session --no-mcp --no-skills
  --no-prompt-templates`, plus a `read,grep,find,ls` tool allowlist) and receives
  the stage's document standards, baseline context, prior-stage reports, and an
  optional focus.
- `PI.md`, the Pi integration guide, and an expanded README.
- Deterministic upstream sync: `UPSTREAM.json`, `scripts/sync-egm.ts`, a weekly
  pull-request workflow, and a vendoring integrity test.
