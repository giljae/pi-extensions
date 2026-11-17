# pi-extensions

A small monorepo of [Pi coding agent](https://pi.dev) packages, published
independently under the `@giljae` npm scope and listed in the
[Pi package gallery](https://pi.dev/packages).

Each package does one thing well, installs on its own, and keeps its source of
truth close — so you can read it, trust it, and remove it without dragging a
framework along.

## What is this?

[Pi](https://pi.dev) is a terminal-first coding agent that you extend with
*packages*. A package can ship skills, prompt templates, themes, and **custom
tools** — small TypeScript extensions that add new capabilities to the agent.
Pi deliberately ships without some batteries (no built-in subagents, no plan
mode); packages are how you add the ones you want.

This repo collects a few of those packages. They are written for everyday use,
kept small on purpose, and published one by one. If you only want one, install
only that one.

## Packages

| Package | What it does | Install |
| --- | --- | --- |
| [`@giljae/pi-egm`](packages/pi-egm) | Brings the [Elephant-Goldfish Model](https://egm.dev) spec-driven workflow to Pi: an elephant drafts the spec, fresh zero-context **read-only** Goldfish reviewers stress-test it, and you approve the trade-offs. No subagent extension required. | `pi install npm:@giljae/pi-egm` |

More packages land here over time. Each has its own README with the full
details — start there:

- [`packages/pi-egm`](packages/pi-egm) — install, quick start, the skills,
  configuration, and the vendoring/sync model.

## Install a package

Install one package:

```bash
pi install npm:@giljae/pi-egm
```

Then start a new session. To try a package from a checkout without adding it to
your settings:

```bash
pi -e ./packages/pi-egm
```

Pi identifies each package by its npm name, and the gallery lists every
`pi-package` in the scope separately, so you can pick exactly what you need.

## Repository layout

```text
pi-extensions/
├── packages/            # one directory per published package
│   └── pi-egm/          # @giljae/pi-egm
├── scripts/             # repo tooling (for example, the EGM vendoring sync)
├── tests/               # repo-level tests (scaffold, workflows, sync tooling)
└── .github/workflows/   # CI and any scheduled maintenance workflows
```

Packages follow one shape: a `package.json` with a `pi` manifest and the
`pi-package` keyword, raw TypeScript (no build step), and tests beside the code.
Library packages with no Pi entry point say so in their README.

## Development

```bash
npm install
npm run check                                                # typecheck + tests
```

Some packages vendor upstream content and regenerate it with a script. For
`pi-egm`:

```bash
npm run sync-egm -- --ref v0.1.1 --package packages/pi-egm   # refresh vendored EGM
npm run sync-egm -- --check --package packages/pi-egm        # verify hashes, no network
```

Vendored paths are generated — never hand-edit them; the integrity test will
fail. See [NOTICE](NOTICE) for the upstream attribution.

Releases use [changesets](https://github.com/changesets/changesets); each
package carries its own version. Publishing is a deliberate, human-triggered
step.

## License

Apache-2.0. Portions are vendored from
[`google/elephant-goldfish-model`](https://github.com/google/elephant-goldfish-model)
(Apache-2.0, Copyright Google LLC); see [NOTICE](NOTICE).

**Not an officially supported Google product.**
