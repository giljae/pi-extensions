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

Some packages vendor upstream content. Each vendored package ships one
descriptor at `scripts/vendors/<pkg>.ts`; the shared core fetches a pinned ref,
copies an allowlisted subset, applies fail-loud transforms, and records
per-file hashes in `UPSTREAM.json`.

```bash
npm run vendor:check                                    # verify every vendored tree, no network
npx tsx scripts/run-vendor-sync.ts --all --latest       # refresh all vendored trees
npx tsx scripts/run-vendor-sync.ts pi-egm --ref v0.1.1  # refresh one tree at a pinned ref
```

Vendored paths are generated — never hand-edit them; the integrity test will
fail. The scheduled `vendor-sync` workflow opens a pull request when an upstream
moves. See [NOTICE](NOTICE) for the upstream attribution.

Releases use [changesets](https://github.com/changesets/changesets); each
package carries its own version. On merge to `main`, the `release` workflow
opens a Version Packages pull request and, when that merges, publishes to npm;
the `pi-package` keyword lists each package on the Pi gallery.

## Adding a package

1. Create `packages/<name>/` with a `package.json`: a unique name, the
   `pi-package` keyword, `publishConfig.access: "public"`, a minimal `files`
   list, a `pi` manifest when it ships skills or extensions, and a `LICENSE`.
2. If it vendors an upstream, add a descriptor at `scripts/vendors/<name>.ts`
   (a default `VendorSpec` export). `run-vendor-sync.ts` and `vendor-sync.yml`
   discover it automatically — no shared script or workflow change.
3. Run `npm run vendor:check`, and `npm run check` for the full suite.
4. Configure an [npm trusted publisher](https://docs.npmjs.com/trusted-publishers)
   for the new package name before its first publish.
5. Open a pull request. CI covers the manifest, license, and shared-code
   conventions for every package under `packages/*`.

## License

Apache-2.0. Portions are vendored from
[`google/elephant-goldfish-model`](https://github.com/google/elephant-goldfish-model)
(Apache-2.0, Copyright Google LLC); see [NOTICE](NOTICE).

**Not an officially supported Google product.**
