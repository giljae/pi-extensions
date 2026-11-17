# @giljae/pi-egm

> Design with an elephant. Review with a goldfish.

The [Elephant-Goldfish Model](https://egm.dev) (EGM) for the
[Pi coding agent](https://pi.dev). It brings a spec-driven workflow to Pi:

- **Elephant** — your Pi session, holding the full project context, asks the
  hard questions and drafts the specification.
- **Goldfish** — fresh child sessions with *zero* conversation history that
  read only the draft and the live source, then attack it from conflicting
  perspectives and expose unstated assumptions while changes are still cheap.
- **You** — make the architectural trade-offs and approve the spec before any
  code is written.

The point is [egm.dev](https://egm.dev)'s core idea, unchanged: a reviewer that
never saw the conversation is much better at noticing what the conversation
assumed. This package runs that protocol natively on Pi.

## Why this package

- **No subagent extension required.** It bundles `egm_goldfish`, a tool that
  spawns each reviewer as a fresh, headless `pi` child process. You install this
  package and nothing else.
- **Reviewers are read-only, by construction.** A reviewer gets `read`, `grep`,
  `find`, and `ls` — no `bash`, `edit`, or `write`. It cannot modify your
  workspace, and the parent session writes every report.
- **Vendored from upstream, kept current.** The skills, personas, and standards
  are copied from `google/elephant-goldfish-model` at a pinned release and
  recorded in `UPSTREAM.json`. A scheduled workflow opens a pull request when
  upstream moves, so the content does not silently drift.

## Install

```bash
pi install npm:@giljae/pi-egm
```

Start a new Pi session, then invoke a skill with its `/skill:` command:

```text
/skill:egm-brainstorm Add webhook delivery to this project.
```

> **Before the first npm release**, or to run from a checkout:
> `pi -e /path/to/pi-extensions/packages/pi-egm` (or `pi -e ./packages/pi-egm`
> from the repo root). This loads the package for one session without adding it
> to your settings.

## Quick start: your first design

Open your project in Pi and pick a feature that needs design decisions. The
example below adds webhook delivery — what happens when a delivery fails, or
when the same event arrives twice?

```text
/skill:egm-brainstorm Add webhook delivery to this project.
```

The elephant explores requirements and trade-offs with you, then writes the
agreed direction to `concepts_brief.md`.

```text
/skill:egm-draft
```

It turns the brief into `design_draft.md`, pausing after each section for your
feedback.

```text
/skill:egm-review docs/designs/webhooks.md
```

Five phases of Goldfish review run against the document and the live code —
initial zoom-out, comprehension, design critique, intermediate zoom-out, and
implementation readiness. You decide which findings to act on.

You can also review any existing design document or PR plan without writing a
new spec:

```text
/skill:egm-review docs/designs/webhooks.md
/skill:egm-drift-report docs/designs/
```

## The skills

All seven skills are available. Invoke any of them as `/skill:egm-<name>`.

| Command | Use it to… |
| --- | --- |
| `/skill:egm-brainstorm` | Turn a half-formed idea into a structured brief through questions and independent review. Writes `concepts_brief.md`. |
| `/skill:egm-draft` | Turn a brief (or your notes) into a design document, section by section, pausing for your feedback. |
| `/skill:egm-review` | Run the five-phase Goldfish review of a design document or PR plan. |
| `/skill:egm-review-loop` | Run a configured reviewer group repeatedly until findings converge. |
| `/skill:egm-resolve` | Work through review findings and apply the fixes you approve, one gate at a time. |
| `/skill:egm-drift-report` | Compare checked-in design docs against the current source and report where they diverge. |
| `/skill:egm-bootstrap` | Generate a README context hierarchy for an existing codebase. |

Every human approval gate from upstream is preserved: the agent pauses for
readiness before dispatching reviewers, for section approvals while drafting,
for preset selection during review, and for explicit approval before editing
files.

## Do I need a subagent extension?

No. This is the most common question, so it deserves a direct answer.

EGM's only hard prerequisite is a way to run a reviewer in a **fresh context**
with **read-only** access. Many Pi setups get that from a general-purpose
subagent extension. This package does not depend on one. `egm_goldfish` starts
its own `pi` child process and enforces the properties directly:

- fresh context — `--no-session`, no parent history, no memory;
- no inherited tooling — `--no-extensions --no-mcp --no-skills
  --no-prompt-templates`;
- no project instruction files — `--no-context-files` (disables `AGENTS.md` and
  `CLAUDE.md`);
- read-only — `--tools read,grep,find,ls`.

Because the parent session is not forking its own context, a generic "spawn a
subagent" tool is neither required nor sufficient. A forked-context review is
not a Goldfish review, and the skills will stop rather than fake one.

## Configuration

### Where drafts and reports go

By default, briefs, drafts, and reports are written to the working directory.
To keep them out of the repo root, add this line to your project `AGENTS.md`
(or to the prompt):

```text
EGM artifact directory: .dev/docs
```

A relative path resolves against the working directory. Design docs you intend
to keep still belong in your repo (for example `docs/designs/`); the artifact
directory is for scratch drafts and review output.

### Reviewer model and thinking level

Reviewers rarely need your flagship model. `egm_goldfish` accepts optional
`model` and `thinking_level` parameters, so you can ask the agent to run
reviewers on something cheaper, for example:

```text
Run the review, but use a fast model for the Goldfish reviewers.
```

Left unset, a reviewer uses your session's default model and thinking level.

## What's vendored, and how it stays current

`skills/`, `agents/`, `resources/`, and the referenced `docs/*.md` are copied
verbatim from [`google/elephant-goldfish-model`](https://github.com/google/elephant-goldfish-model)
(Apache-2.0, Copyright Google LLC). The only text changes are one Pi routing
line per skill and the `Pi: egm_goldfish` dispatch name.

- `UPSTREAM.json` pins the upstream repository, release tag, commit, and the
  SHA-256 of every vendored file.
- `scripts/sync-egm.ts` regenerates the tree from the pinned release.
- A scheduled GitHub Actions workflow runs the sync weekly and opens a pull
  request when upstream publishes a new tag, so updates arrive as a reviewable
  diff rather than a surprise.
- An integrity test fails CI if a vendored file is edited by hand.

Never hand-edit the vendored paths — change them upstream, or the next sync will
overwrite them.

## Known limits

- **`APPEND_SYSTEM.md` is not suppressed.** `--no-context-files` disables
  `AGENTS.md` and `CLAUDE.md`, but Pi may still load `APPEND_SYSTEM.md` files.
  Do not plant design facts there; treat it as outside the isolation boundary.
- **`egm-bootstrap` write workers are out of scope.** Reviewers are read-only,
  so bootstrap's write-capable worker delegation is not supported. The skill
  stops and says so instead of substituting a reviewer.
- **Skill commands need an interactive session.** In a headless run, read the
  vendored `skills/<name>/SKILL.md` directly.
- **Installing runs extension code.** As with any Pi package, review the source
  before installing.

## Provenance and license

- Skills, personas, document standards, and the `docs/codex.md` and
  `docs/claude.md` guides: [google/elephant-goldfish-model](https://github.com/google/elephant-goldfish-model)
  ([egm.dev](https://egm.dev)), Apache-2.0, Copyright Google LLC. Upstream is
  the canonical home for content changes.
- Pi integration (`PI.md`, `extensions/`, packaging, sync tooling): Apache-2.0.
- **Not an officially supported Google product.**

See [NOTICE](../../NOTICE) and [UPSTREAM.json](UPSTREAM.json).

## Development

From the monorepo root:

```bash
npm install
npm run check                                                # typecheck + tests
npm run sync-egm -- --ref v0.1.1 --package packages/pi-egm   # refresh vendored EGM
npm run sync-egm -- --check --package packages/pi-egm        # verify hashes, no network
pi -e ./packages/pi-egm                                      # try the package locally
```
