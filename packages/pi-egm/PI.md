# Pi integration (Elephant-Goldfish Model on Pi)

Read this first when running EGM on Pi. It maps the harness-agnostic wording in
the skills to Pi's tools. Nothing here changes the skills' rules; it only names
Pi's equivalents.

## Paths and artifacts

- The plugin root is two directories above any skill's `SKILL.md`, so a skill
  reaches this file as `../../PI.md`. Resolve `agents/`, `resources/`, and this
  file against the plugin root. Resolve `references/` against the canonical skill
  directory. Resolve user documents and generated artifacts against the working
  directory. Never substitute similarly named files from the user's project for
  bundled personas or standards.
- If the user's prompt or an `AGENTS.md` has a line `EGM artifact directory: <path>`, write briefs, drafts, and reports there. A relative path resolves
  against the working directory; create the folder if it does not exist.

## Fresh-context Goldfish reviewers (CRITICAL)

A Goldfish runs in a child session with no conversation history. On Pi this is
the `egm_goldfish` tool. Dispatch one call per reviewer with a `role` (a persona
name resolved to a bundled file in code) and the absolute `target` path.

The tool starts a fresh headless `pi` process with no extensions, no context
files, no MCP servers, no discovered skills or prompt templates, and no
persisted session (`--no-extensions --no-context-files --no-session --no-mcp
--no-skills --no-prompt-templates`). It runs from a neutral directory, so pass
absolute paths, and it appends the persona body as the child's system prompt.

Reviewers are **read-only**: the child is launched with `--tools
read,grep,find,ls` and has no `bash`, `edit`, or `write` tool. A reviewer
returns its findings as text; **the parent writes every report file**. A
launched reviewer is not a completed review — wait for it and propagate
failures.

`--no-context-files` disables `AGENTS.md` and `CLAUDE.md`. Pi may still load
`APPEND_SYSTEM.md` files; that residual exposure is a known limit, not a
permission to place design facts there.

Never substitute a generic subagent tool. A forked-context spawn is not a
Goldfish review. If `egm_goldfish` is unavailable, stop and say a same-context
review is not a Goldfish review.

## Nesting: use direct dispatch

Wherever a skill says the synthesizer spawns reviewers, dispatch each reviewer
directly from this (Elephant) context with the same isolation, then synthesize
the findings in-thread. This is the upstream fallback for harnesses without
nesting; on Pi the Goldfish child has no spawn tools of its own.

## Human approval gates

Preserve every pause in the canonical skills: brainstorm readiness and brief
approval, draft intake and section approvals, review preset selection and stage
pauses, and resolve approval before edits. The extension never auto-approves. If
no structured question tool is available, ask one plain-text question and end
the turn.

## Invocation and scope

Skills load as Pi skills (`/skill:egm-<name>`). `egm-bootstrap` write-worker
delegation is out of scope for this package: if bootstrap needs a write-capable
worker, stop and say so rather than substituting a reviewer.

Installing this package runs its extension code. Review the package source
before installing, the same as any Pi package.
