# pi-postgres-skills and the shared vendoring/release pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a shared, auto-discovering vendoring core, migrate `pi-egm` onto it, add an automated changesets→npm→pi.dev release pipeline, and add `@giljae/pi-postgres-skills` as a full mirror of `microsoft/postgres-skills` with a bundled MCP server.

**Architecture:** `scripts/lib/vendor.ts` does the identical work for every vendored package (pin a ref, fetch it, copy an allowlisted subset, apply fail-loud transforms, hash the tree, write `UPSTREAM.json`, offline `--check`). Each vendored package ships one descriptor at `scripts/vendors/<pkg>.ts`; `scripts/run-vendor-sync.ts` discovers descriptors by glob so adding a package needs no wiring change. The new package vendors `plugin/skills/**`, adapts it with two transforms, and registers `postgres-mcp` from an extension. Phase 1 (Tasks 1–6) changes only shared infrastructure and `pi-egm`; Phase 2 (Tasks 7–11) only adds the new package.

**Tech Stack:** Node 22+, npm workspaces, TypeScript (no build step), vitest, `@changesets/cli`, GitHub Actions, `tsx`.

**Spec:** `docs/designs/pi-postgres-skills.md`

## Global Constraints

- npm scope `@giljae`; new package name `@giljae/pi-postgres-skills`.
- Vendored trees (`skills/`, `UPSTREAM.json`) are generated. Never hand-edit them.
- `pi-egm` pin: repo `https://github.com/google/elephant-goldfish-model`, tag `v0.1.1`, commit `dea7761de06ce5b51c177ebb9bba0469f24af5a4`.
- `pi-postgres-skills` pin: repo `https://github.com/microsoft/postgres-skills`, commit `b7908c0b53b2a292fb8286d4d4bdba7ea4690291` (re-resolve if newer at implementation time; record the resolved SHA in `UPSTREAM.json`).
- Every vendored package: one `scripts/vendors/<pkg>.ts` exporting a `VendorSpec` as the default export.
- Transforms are deterministic and fail loud: a missing or ambiguous anchor throws; the sync never skips silently.
- Every `pi` package carries the `pi-package` keyword, `publishConfig.access: "public"`, a minimal `files` list (runtime only), and a `LICENSE`.
- Version policy: every package starts at `0.0.1`; each released change is a `patch` bump (`0.0.1 → 0.0.2 → …`). No minor/major before 1.0.
- No package name literals in `scripts/lib/**`, `scripts/run-vendor-sync.ts`, `.github/workflows/**`, or repo-level tests. Package-specific values live only in `scripts/vendors/<pkg>.ts` and the package directory.
- Release uses `changesets/action` with npm trusted publishing (OIDC); `NPM_TOKEN` secret is the documented fallback.
- Non-goals: no curation of upstream content, no vendoring of `@microsoft/postgres-mcp`, no auto-merge of sync PRs.

## Review Focus

1. Upstream rewords a transform anchor → the sync must throw, never skip. (Task 1, Task 7)
2. A vendored file is hand-edited → the integrity test must fail on a hash mismatch. (Task 9)
3. A core path assumes one ref strategy → it must handle both `tag` and `commit` pins. (Task 2)
4. A package is added without a descriptor → sync skips it, release still versions it, and the convention test still covers it. (Task 5, Task 6)
5. The path-separator transform meets a non-path backslash (e.g. a regex `\.`) → it must leave it and fail loudly, never corrupt it. (Task 7)

## File Structure

```text
scripts/
  lib/vendor.ts                    # shared core (create)
  vendors/pi-egm.ts                # EGM descriptor + transforms (create; replaces scripts/sync-egm.ts)
  vendors/pi-postgres-skills.ts    # postgres descriptor + transforms (create)
  run-vendor-sync.ts               # discovery + CLI (create)
  sync-egm.ts                      # delete (moved to scripts/vendors/pi-egm.ts)
.github/workflows/
  ci.yml                           # unchanged
  vendor-sync.yml                  # create (replaces egm-sync.yml)
  release.yml                      # create
  egm-sync.yml                     # delete
packages/pi-postgres-skills/
  package.json                     # create
  LICENSE                          # create (MIT, Microsoft copyright)
  README.md                        # create
  UPSTREAM.json                    # generated
  skills/                          # generated (vendored)
  extensions/postgres-mcp/index.ts # create
  tests/*.test.ts                  # create
tests/
  vendor.test.ts                   # create (core)
  run-vendor-sync.test.ts          # create (CLI)
  sync-egm.test.ts                 # modify (imports)
  workflows.test.ts                # modify
  packages.test.ts                 # create (repo-level conventions)
  no-hardcoded-packages.test.ts    # create
  pi-postgres-transforms.test.ts   # create
README.md                          # modify (package onboarding checklist)
```

---

### Task 1: Vendoring core — offline primitives

**Files:**
- Create: `scripts/lib/vendor.ts`
- Test: `tests/vendor.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface Transform { name: string; include(relPath: string): boolean; apply(text: string, relPath: string): string }`
  - `type IncludeEntry = string | { from: string; to: string }`
  - `interface VendorSpec { repo: string; refStrategy: { kind: "tag"; tag?: string } | { kind: "commit"; commit?: string }; include: IncludeEntry[]; files?: Array<{ from: string; to: string }>; transforms: Transform[]; packageDir: string }`
  - `interface VendorRecord { repo: string; ref: string; commit: string; transforms: string[]; files: Record<string, string> }`
  - `applyTransform(text: string, relPath: string, transforms: Transform[]): string`
  - `hashTree(packageDir: string, roots: string[]): Record<string, string>`
  - `copyVendored(srcRoot: string, packageDir: string, include: IncludeEntry[], files?: Array<{ from: string; to: string }>): void`
  - `readUpstream(packageDir: string): VendorRecord | null`
  - `writeUpstream(packageDir: string, record: VendorRecord): void`
  - `checkVendor(spec: VendorSpec): boolean`

- [ ] **Step 1: Write the failing tests** in `tests/vendor.test.ts`

```ts
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { expect, test } from "vitest";
import {
  applyTransform, checkVendor, copyVendored, hashTree, readUpstream, writeUpstream,
  type Transform, type VendorSpec,
} from "../scripts/lib/vendor.ts";

const tmp = () => mkdtempSync(path.join(os.tmpdir(), "vendor-"));

test("hashTree returns sorted POSIX keys and stable hashes", () => {
  const dir = tmp();
  mkdirSync(path.join(dir, "skills"), { recursive: true });
  writeFileSync(path.join(dir, "skills", "b.md"), "b");
  writeFileSync(path.join(dir, "skills", "a.md"), "a");
  const hashes = hashTree(dir, ["skills"]);
  expect(Object.keys(hashes)).toEqual(["skills/a.md", "skills/b.md"]);
  writeFileSync(path.join(dir, "skills", "a.md"), "A");
  expect(hashTree(dir, ["skills"])["skills/a.md"]).not.toBe(hashes["skills/a.md"]);
});

test("checkVendor is true on a match and false after a hand edit", () => {
  const dir = tmp();
  mkdirSync(path.join(dir, "skills", "s"), { recursive: true });
  writeFileSync(path.join(dir, "skills", "s", "SKILL.md"), "original");
  const spec = { repo: "r", refStrategy: { kind: "commit", commit: "c" }, include: ["skills"], transforms: [], packageDir: dir } as VendorSpec;
  writeUpstream(dir, { repo: "r", ref: "c", commit: "c", transforms: [], files: hashTree(dir, ["skills"]) });
  expect(checkVendor(spec)).toBe(true);
  writeFileSync(path.join(dir, "skills", "s", "SKILL.md"), "edited");
  expect(checkVendor(spec)).toBe(false);
});

test("readUpstream returns null when absent", () => {
  expect(readUpstream(tmp())).toBeNull();
});

test("applyTransform runs only matching transforms, in order, and propagates throws", () => {
  const upper: Transform = { name: "upper", include: (p) => p.endsWith(".md"), apply: (t) => t.toUpperCase() };
  const boom: Transform = { name: "boom", include: (p) => p.endsWith(".md"), apply: () => { throw new Error("anchor"); } };
  expect(applyTransform("hey", "a.md", [upper])).toBe("HEY");
  expect(applyTransform("hey", "a.txt", [upper])).toBe("hey");
  expect(() => applyTransform("hey", "a.md", [upper, boom])).toThrow("anchor");
});

test("copyVendored remaps a source root to a dest root and copies files", () => {
  const src = tmp(); const dest = tmp();
  mkdirSync(path.join(src, "plugin", "skills", "s"), { recursive: true });
  writeFileSync(path.join(src, "plugin", "skills", "s", "SKILL.md"), "x");
  writeFileSync(path.join(src, "LICENSE"), "mit");
  copyVendored(src, dest, [{ from: "plugin/skills", to: "skills" }], [{ from: "LICENSE", to: "LICENSE" }]);
  expect(hashTree(dest, ["skills"])["skills/s/SKILL.md"]).toBeTruthy();
  expect(hashTree(dest, [])["LICENSE"]).toBeTruthy();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/vendor.test.ts`
Expected: FAIL — cannot resolve `../scripts/lib/vendor.ts`.

- [ ] **Step 3: Implement the primitives in `scripts/lib/vendor.ts`**

Implement the signatures above. `hashTree` walks each `roots` entry under `packageDir`, returns `relPath → sha256` with sorted POSIX keys (`roots: []` means package root, excluding `node_modules`, `tests`, `UPSTREAM.json`). `copyVendored` removes each dest root, then copies `from`→`to` recursively and each `files` entry. `applyTransform` applies, in array order, every transform whose `include(relPath)` is true. `checkVendor` compares `JSON.stringify(readUpstream(dir)?.files)` with `JSON.stringify(hashTree(dir, rootsOf(spec)))`, where `rootsOf` derives `to` roots from `spec.include` plus the dest dirs of `spec.files`. `readUpstream`/`writeUpstream` read/write `<packageDir>/UPSTREAM.json`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/vendor.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/vendor.ts tests/vendor.test.ts
git commit -m "feat(vendor): add shared vendoring core primitives"
```

---

### Task 2: Vendoring core — git pin resolution and orchestration

**Files:**
- Modify: `scripts/lib/vendor.ts`
- Test: `tests/vendor.test.ts`

**Interfaces:**
- Consumes: Task 1's `VendorSpec`, `VendorRecord`, `applyTransform`, `hashTree`, `copyVendored`, `readUpstream`, `writeUpstream`.
- Produces:
  - `pickLatestTag(tags: string[]): string | null` — highest `vX.Y.Z`.
  - `resolveRef(spec: VendorSpec, opts: { latest?: boolean; ref?: string }, runGit: (args: string[]) => string): { ref: string; commit: string }`
  - `runVendorSync(spec: VendorSpec, opts?: { latest?: boolean; ref?: string }): { changed: boolean; ref: string; commit: string }`

- [ ] **Step 1: Write the failing tests** in `tests/vendor.test.ts`

```ts
import { execFileSync } from "node:child_process";
import { pickLatestTag, resolveRef, runVendorSync } from "../scripts/lib/vendor.ts";

test("pickLatestTag ranks semver vX.Y.Z and ignores others", () => {
  expect(pickLatestTag(["v0.1.0", "v0.2.0", "nightly", "v0.10.0"])).toBe("v0.10.0");
  expect(pickLatestTag([])).toBeNull();
});

function gitRepo(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "upstream-"));
  execFileSync("git", ["init", "-q"], { cwd: dir });
  execFileSync("git", ["config", "user.email", "t@t"], { cwd: dir });
  execFileSync("git", ["config", "user.name", "t"], { cwd: dir });
  mkdirSync(path.join(dir, "plugin", "skills", "s"), { recursive: true });
  writeFileSync(path.join(dir, "plugin", "skills", "s", "SKILL.md"), "hi");
  execFileSync("git", ["add", "."], { cwd: dir });
  execFileSync("git", ["commit", "-qm", "init"], { cwd: dir });
  execFileSync("git", ["tag", "v0.1.0"], { cwd: dir });
  return dir;
}

test("resolveRef resolves a tag and an explicit commit", () => {
  const repo = gitRepo();
  const base = { repo: `file://${repo}`, include: [], transforms: [] } as unknown as VendorSpec;
  const byTag = resolveRef({ ...base, refStrategy: { kind: "tag", tag: "v0.1.0" } }, {}, gitIn(repo));
  const byCommit = resolveRef({ ...base, refStrategy: { kind: "commit", commit: byTag.commit } }, {}, gitIn(repo));
  expect(byTag.commit).toBe(byCommit.commit);
});

test("runVendorSync copies, transforms, records, and reports change", () => {
  const repo = gitRepo(); const dest = tmp();
  const marker: Transform = { name: "marker", include: (p) => p.endsWith("SKILL.md"), apply: (t) => `${t}\nPi` };
  const spec: VendorSpec = { repo: `file://${repo}`, refStrategy: { kind: "commit" }, include: [{ from: "plugin/skills", to: "skills" }], transforms: [marker], packageDir: dest };
  expect(runVendorSync(spec, { ref: "HEAD" }).changed).toBe(true);
  expect(readUpstream(dest)!.files["skills/s/SKILL.md"]).toBeTruthy();
  expect(runVendorSync(spec, { ref: "HEAD" }).changed).toBe(false);
});
```

Add a `gitIn(repo)` helper that runs git with `cwd: repo` and returns stdout (test-local).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/vendor.test.ts`
Expected: FAIL — `pickLatestTag`/`resolveRef`/`runVendorSync` not exported.

- [ ] **Step 3: Implement in `scripts/lib/vendor.ts`**

`resolveRef`: for `kind: "tag"`, pick `opts.ref`/explicit tag/`pickLatestTag(ls-remote --tags)`; for `kind: "commit"`, use `opts.ref`/`spec.refStrategy.commit`/`ls-remote HEAD`. Return the resolved tag or SHA as `ref` and `rev-parse <ref>` as `commit`. `runVendorSync`: create a temp dir; `git init`; `git remote add origin <repo>`; `git fetch --depth 1 origin <commit>`; `git checkout FETCH_HEAD`; `copyVendored`; read every file under the dest roots, apply `applyTransform`, write back; `hashTree`; `writeUpstream`; report `changed` by comparing to the previous `files`. Delete the temp dir in `finally`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/vendor.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/vendor.ts tests/vendor.test.ts
git commit -m "feat(vendor): resolve pins and run the sync on tags and commits"
```

---

### Task 3: Migrate `pi-egm` onto the core

**Files:**
- Create: `scripts/vendors/pi-egm.ts`
- Delete: `scripts/sync-egm.ts`
- Modify: `tests/sync-egm.test.ts`
- Modify: `package.json` (replace the `sync-egm` script with `vendor:check`)

**Interfaces:**
- Consumes: `Transform`, `VendorSpec` from `scripts/lib/vendor.ts`.
- Produces: default export `VendorSpec`; named `insertPiPointer(text: string): string`, `appendPiDispatchName(text: string): string`.

- [ ] **Step 1: Write the failing test change**

In `tests/sync-egm.test.ts`, change the import to `../scripts/vendors/pi-egm.ts` for `insertPiPointer` and `appendPiDispatchName`, and replace the `checkSync` test with:

```ts
import { checkVendor } from "../scripts/lib/vendor.ts";
import piEgm from "../scripts/vendors/pi-egm.ts";

test("pi-egm descriptor pins the EGM tag and hashes the vendored tree", () => {
  expect(piEgm.refStrategy.kind).toBe("tag");
  expect(piEgm.transforms.map((t) => t.name)).toEqual(["pi-pointer", "pi-dispatch-name"]);
  expect(checkVendor(piEgm)).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/sync-egm.test.ts`
Expected: FAIL — cannot resolve `../scripts/vendors/pi-egm.ts`.

- [ ] **Step 3: Move and adapt the code**

Create `scripts/vendors/pi-egm.ts` from `scripts/sync-egm.ts`. Keep `insertPiPointer`/`appendPiDispatchName` unchanged. Export a default `VendorSpec`: `repo: "https://github.com/google/elephant-goldfish-model"`, `refStrategy: { kind: "tag" }`, `include: ["skills", "agents", "resources", "docs"]`, `files: [{ from: "docs/codex.md", to: "docs/codex.md" }, { from: "docs/claude.md", to: "docs/claude.md" }]`, `transforms: [{ name: "pi-pointer", include: (p) => /^skills\/[^/]+\/SKILL\.md$/.test(p), apply: (t) => insertPiPointer(t) }, { name: "pi-dispatch-name", include: (p) => /^skills\/[^/]+\/SKILL\.md$/.test(p), apply: (t) => appendPiDispatchName(t) }]`, `packageDir: "packages/pi-egm"`. Note: `include: ["skills","agents",...]` means "copy this root to the same name"; `docs/*.md` are covered by the `docs` root, so no explicit `files` are needed. Delete `scripts/sync-egm.ts`. In `package.json`, remove the `"sync-egm"` script entry (Task 4 adds `"vendor:check"`).

- [ ] **Step 4: Run the tests to verify the migration is offline-clean**

Run: `npx vitest run tests/sync-egm.test.ts`
Expected: PASS — the migrated core recomputes the same hashes as the committed `UPSTREAM.json` without network. The networked no-diff proof runs in Task 4, once the CLI exists.

- [ ] **Step 5: Commit**

```bash
git add scripts/vendors/pi-egm.ts scripts/sync-egm.ts tests/sync-egm.test.ts package.json
git commit -m "refactor(pi-egm): vendor through the shared core"
```

---

### Task 4: `run-vendor-sync.ts` CLI and discovery

**Files:**
- Create: `scripts/run-vendor-sync.ts`
- Test: `tests/run-vendor-sync.test.ts`

**Interfaces:**
- Consumes: `VendorSpec`, `runVendorSync`, `checkVendor`.
- Produces: `discoverVendors(dir?: string): Array<{ name: string; spec: VendorSpec }>`; `writeChangeset(packageName: string, dir?: string): string`; CLI `<pkg>|--all [--check] [--latest] [--ref <ref>] [--changeset]`.

- [ ] **Step 1: Write the failing tests**

```ts
import { discoverVendors, writeChangeset } from "../scripts/run-vendor-sync.ts";

test("discoverVendors finds the pi-egm descriptor", async () => {
  const vendors = await discoverVendors();
  expect(vendors.map((v) => v.name)).toContain("pi-egm");
});

test("writeChangeset writes a patch changeset and is idempotent per name", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "cs-"));
  const file = writeChangeset("@giljae/pi-egm", dir);
  expect(readFileSync(file, "utf8")).toContain('"@giljae/pi-egm": patch');
  expect(writeChangeset("@giljae/pi-egm", dir)).toBe(file);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/run-vendor-sync.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `scripts/run-vendor-sync.ts`**

`discoverVendors(dir = "scripts/vendors")` reads `*.ts` (excluding `*.test.ts`), dynamic-imports each, and returns `{ name: basename, spec: mod.default }`. `writeChangeset(pkg, dir = ".changeset")` writes `dir/vendor-<slug>.md` (deterministic name, overwrite) with `---\n"<pkg>": patch\n---\n\nSync vendored content.`. CLI: parse `<pkg>|--all`, `--check`, `--latest`, `--ref`, `--changeset`; for each selected vendor call `checkVendor` or `runVendorSync`, print `changed`/`unchanged`, exit non-zero when `--check` finds drift or when `--all` changed nothing but drift exists.

- [ ] **Step 4: Run the tests, the offline check, and the pinned-ref no-diff proof**

Run: `npx vitest run tests/run-vendor-sync.test.ts && npm run vendor:check`
Expected: PASS; `pi-egm: ok`, exit 0.
Run (network): `npx tsx scripts/run-vendor-sync.ts pi-egm --ref v0.1.1 && git diff --exit-code -- packages/pi-egm`
Expected: no diff — the shared core reproduces the existing EGM tree byte for byte.

- [ ] **Step 5: Commit**

```bash
git add scripts/run-vendor-sync.ts tests/run-vendor-sync.test.ts package.json
git commit -m "feat(vendor): auto-discovering sync CLI"
```

---

### Task 5: Repo-level package conventions and README checklist

**Files:**
- Create: `tests/packages.test.ts`
- Create: `tests/no-hardcoded-packages.test.ts`
- Modify: `README.md`
- Test: the two new test files

**Interfaces:**
- Consumes: nothing.
- Produces: no runtime interface; repo-wide guards.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/packages.test.ts
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";

const dirs = readdirSync(new URL("../packages", import.meta.url), { withFileTypes: true })
  .filter((d) => d.isDirectory()).map((d) => d.name);

test("every package is gallery-ready", () => {
  expect(dirs.length).toBeGreaterThan(0);
  for (const name of dirs) {
    const base = new URL(`../packages/${name}/`, import.meta.url);
    const pkg = JSON.parse(readFileSync(new URL("package.json", base), "utf8"));
    expect(pkg.keywords, name).toContain("pi-package");
    expect(pkg.publishConfig?.access, name).toBe("public");
    expect(Array.isArray(pkg.files) && pkg.files.length, name).toBeTruthy();
    expect(existsSync(new URL("LICENSE", base)), name).toBe(true);
    if (existsSync(new URL("skills", base)) || existsSync(new URL("extensions", base))) {
      expect(pkg.pi, name).toBeTruthy();
    }
  }
});
```

```ts
// tests/no-hardcoded-packages.test.ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { expect, test } from "vitest";

const SHARED = ["../scripts/lib", "../scripts/run-vendor-sync.ts", "../.github/workflows"];

test("shared code names no package", () => {
  const hits: string[] = [];
  const walk = (p: URL) => {
    const s = statSync(p);
    if (s.isDirectory()) { for (const e of readdirSync(p)) walk(new URL(`${e}${statSync(new URL(e, p)).isDirectory() ? "/" : ""}`, p)); return; }
    const text = readFileSync(p, "utf8");
    if (/@giljae\/pi-|packages\/pi-/.test(text)) hits.push(p.pathname);
  };
  for (const rel of SHARED) walk(new URL(rel + (rel.endsWith(".ts") ? "" : "/"), import.meta.url));
  expect(hits).toEqual([]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/packages.test.ts tests/no-hardcoded-packages.test.ts`
Expected: packages test passes against `pi-egm`; the hardcoded test passes only if the shared files are clean (fix any hit).

- [ ] **Step 3: Add the onboarding checklist to `README.md`**

Add a section "Adding a package" listing: create `packages/<name>/` with `package.json` (unique name, `pi-package`, public access, minimal `files`, `pi` manifest, `LICENSE`); for a vendored package add `scripts/vendors/<name>.ts`; run `npm run vendor:check`; configure an npm trusted publisher for the new name; open a PR — CI covers the rest.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/packages.test.ts tests/no-hardcoded-packages.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/packages.test.ts tests/no-hardcoded-packages.test.ts README.md
git commit -m "test: guard package conventions and shared-code purity"
```

---

### Task 6: Sync and release workflows

**Files:**
- Create: `.github/workflows/vendor-sync.yml`
- Create: `.github/workflows/release.yml`
- Delete: `.github/workflows/egm-sync.yml`
- Modify: `tests/workflows.test.ts`

**Interfaces:**
- Consumes: `scripts/run-vendor-sync.ts` CLI.
- Produces: CI automation; no code interface.

- [ ] **Step 1: Write the failing test change**

Rewrite `tests/workflows.test.ts` to assert: `ci.yml` contains `npm run check`; `vendor-sync.yml` contains `run-vendor-sync`, matches `/schedule|workflow_dispatch/`, and contains `create-pull-request`; `release.yml` contains `changesets/action` and `id-token`; and `.github/workflows/egm-sync.yml` no longer exists.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/workflows.test.ts`
Expected: FAIL — `vendor-sync.yml`/`release.yml` missing.

- [ ] **Step 3: Add the workflows and delete the old one**

`vendor-sync.yml`: `on: schedule (weekly) + workflow_dispatch`; `permissions: contents: write, pull-requests: write`; steps: checkout, setup-node 22 with npm cache, `npm ci`, `npx tsx scripts/run-vendor-sync.ts --all --latest --changeset`, `peter-evans/create-pull-request@v6` (branch `vendor-sync`, title `chore: sync vendored upstreams`, delete-branch). `release.yml`: `on: push branches [main] + pull_request`; `permissions: contents: write, pull-requests: write, id-token: write`; a dry-run job on `pull_request` running `npx changeset publish --dry-run`; the release job on `push` using `changesets/action@v1` with `version: npx changeset version`, `publish: npx changeset publish`, `env: GITHUB_TOKEN, NPM_CONFIG_PROVENANCE: "true"`. Delete `egm-sync.yml`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/workflows.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows tests/workflows.test.ts
git commit -m "ci: discover vendored packages and publish with changesets"
```

---

### Task 7: `pi-postgres-skills` descriptor and transforms

**Files:**
- Create: `scripts/vendors/pi-postgres-skills.ts`
- Test: `tests/pi-postgres-transforms.test.ts`

**Interfaces:**
- Consumes: `Transform`, `VendorSpec`.
- Produces: default export `VendorSpec`; named `piHostPointer: Transform`, `piPathSeparators: Transform`.

- [ ] **Step 1: Write the failing tests**

```ts
import { expect, test } from "vitest";
import spec, { piHostPointer, piPathSeparators } from "../scripts/vendors/pi-postgres-skills.ts";

test("descriptor mirrors plugin/skills into skills", () => {
  expect(spec.include).toEqual([{ from: "plugin/skills", to: "skills" }]);
  expect(spec.packageDir).toBe("packages/pi-postgres-skills");
  expect(spec.transforms.map((t) => t.name)).toEqual(["pi-host-pointer", "pi-path-separators"]);
});

test("piHostPointer inserts once after frontmatter and throws when present", () => {
  const doc = "---\nname: x\n---\n# X\n";
  const out = piHostPointer.apply(doc, "skills/x/SKILL.md");
  expect(out.match(/mcp__postgres-mcp__/g)).toHaveLength(1);
  expect(() => piHostPointer.apply(out, "skills/x/SKILL.md")).toThrow();
});

test("piPathSeparators normalizes paths and refuses non-path backslashes", () => {
  expect(piPathSeparators.apply('node "<skill-directory>\\scripts\\x.mjs"', "skills/migrate-oracle-app/SKILL.md"))
    .toBe('node "<skill-directory>/scripts/x.mjs"');
  expect(piPathSeparators.apply('"C:\\\\dev\\\\x"', "skills/migrate-oracle-app/references/a.md"))
    .toBe('"C:/dev/x"');
  expect(() => piPathSeparators.apply("regex \\.  here", "skills/migrate-oracle-app/references/a.md")).toThrow();
});

test("piPathSeparators include() only matches migrate-oracle-app markdown", () => {
  expect(piPathSeparators.include("skills/migrate-oracle-app/SKILL.md")).toBe(true);
  expect(piPathSeparators.include("skills/migrate-oracle-app/scripts/x.mjs")).toBe(false);
  expect(piPathSeparators.include("skills/pg-graph/SKILL.md")).toBe(false);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/pi-postgres-transforms.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `scripts/vendors/pi-postgres-skills.ts`**

`piHostPointer`: `include` = `/^skills\/[^/]+\/SKILL\.md$/`; `apply` throws if the text already contains `mcp__postgres-mcp__`, else inserts after the frontmatter block: `> On Pi, the PostgreSQL MCP tools are exposed as \`mcp__postgres-mcp__<operation>\` (for example \`mcp__postgres-mcp__postgres_mcp_query\`); this package directory is the plugin root.` `piPathSeparators`: `include` = `p.startsWith("skills/migrate-oracle-app/") && p.endsWith(".md")`; `apply` replaces `\\` → `/`, then replaces `\` that sits between `[A-Za-z0-9_.<>-]` on both sides with `/`, then throws if any `\` remains. Default export `VendorSpec`: `repo: "https://github.com/microsoft/postgres-skills"`, `refStrategy: { kind: "commit", commit: "b7908c0b53b2a292fb8286d4d4bdba7ea4690291" }`, `include: [{ from: "plugin/skills", to: "skills" }]`, `transforms: [piHostPointer, piPathSeparators]`, `packageDir: "packages/pi-postgres-skills"`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/pi-postgres-transforms.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/vendors/pi-postgres-skills.ts tests/pi-postgres-transforms.test.ts
git commit -m "feat(pi-postgres-skills): add the vendoring descriptor and transforms"
```

---

### Task 8: `pi-postgres-skills` manifest, license, and README

**Files:**
- Create: `packages/pi-postgres-skills/package.json`
- Create: `packages/pi-postgres-skills/LICENSE`
- Create: `packages/pi-postgres-skills/README.md`

**Interfaces:**
- Consumes: nothing.
- Produces: the package manifest the extension and release pipeline read.

- [ ] **Step 1: Write the package manifest**

`packages/pi-postgres-skills/package.json`: `name: "@giljae/pi-postgres-skills"`, `version: "0.0.1"`, `license: "MIT"`, `keywords: ["pi-package","postgresql","database","mcp","apache-age","pgvector"]`, `publishConfig: { access: "public" }`, `type: "module"`, `files: ["extensions","skills","README.md","LICENSE"]` (not `UPSTREAM.json`), `pi: { extensions: ["./extensions"], skills: ["./skills"] }`; **no `@earendil-works/pi-coding-agent` in `dependencies`** (declare it in `peerDependencies` with `"*"`); no `@microsoft/postgres-mcp` dependency yet (Task 10 decides the launch and may add it). Copy upstream's MIT text (© Microsoft) into `LICENSE`. Add a minimal `README.md` stating: install, that the MCP server starts on load, the read-only profile setup (`npx @microsoft/postgres-mcp connection add … --access-mode ro`), MIT attribution, and "not an official Microsoft product".

- [ ] **Step 2: Run the repo-level convention test**

Run: `npx vitest run tests/packages.test.ts`
Expected: PASS — the new package is gallery-ready.

- [ ] **Step 3: Commit**

```bash
git add packages/pi-postgres-skills/package.json packages/pi-postgres-skills/LICENSE packages/pi-postgres-skills/README.md
git commit -m "feat(pi-postgres-skills): add the package manifest, license, and README"
```

---

### Task 9: Vendor the `pi-postgres-skills` tree

**Files:**
- Generate: `packages/pi-postgres-skills/skills/**`
- Generate: `packages/pi-postgres-skills/UPSTREAM.json`
- Create: `packages/pi-postgres-skills/tests/vendor.test.ts`

**Interfaces:**
- Consumes: the Task 7 descriptor, `checkVendor`.
- Produces: the vendored tree and its integrity test.

- [ ] **Step 1: Run the sync** (network)

Run: `npx tsx scripts/run-vendor-sync.ts pi-postgres-skills`
Expected: `changed: pi-postgres-skills <commit>`; the three skills, their references, and `migrate-oracle-app/scripts/**` appear under `packages/pi-postgres-skills/skills`, and `UPSTREAM.json` records the repo, commit, transforms, and per-file SHA-256.

- [ ] **Step 2: Write the integrity test**

```ts
import { readFileSync, readdirSync } from "node:fs";
import { expect, test } from "vitest";
import { checkVendor } from "../../../scripts/lib/vendor.ts";
import spec from "../../../scripts/vendors/pi-postgres-skills.ts";

test("vendored tree matches UPSTREAM.json", () => {
  expect(checkVendor(spec)).toBe(true);
});

test("each SKILL.md carries exactly one Pi pointer", () => {
  const skills = readdirSync(new URL("../skills", import.meta.url), { withFileTypes: true })
    .filter((d) => d.isDirectory()).map((d) => d.name);
  expect(skills.sort()).toEqual(["migrate-oracle-app", "pg-graph", "postgresql-best-practices"]);
  for (const name of skills) {
    const text = readFileSync(new URL(`../skills/${name}/SKILL.md`, import.meta.url), "utf8");
    expect(text.match(/mcp__postgres-mcp__/g)?.length, name).toBe(1);
  }
});

test("migrate-oracle-app markdown has no backslashes left", () => {
  const base = new URL("../skills/migrate-oracle-app/", import.meta.url);
  const hits: string[] = [];
  const walk = (u: URL) => {
    for (const e of readdirSync(u, { withFileTypes: true })) {
      const c = new URL(e.name + (e.isDirectory() ? "/" : ""), u);
      if (e.isDirectory()) walk(c);
      else if (e.name.endsWith(".md") && readFileSync(c, "utf8").includes("\\")) hits.push(c.pathname);
    }
  };
  walk(base);
  expect(hits).toEqual([]);
});
```

- [ ] **Step 3: Run the tests to verify the tree is intact**

Run: `npx vitest run packages/pi-postgres-skills/tests/vendor.test.ts && npm run vendor:check`
Expected: PASS; `pi-egm: ok` and `pi-postgres-skills: ok`.

- [ ] **Step 4: Commit**

```bash
git add packages/pi-postgres-skills/skills packages/pi-postgres-skills/UPSTREAM.json packages/pi-postgres-skills/tests/vendor.test.ts
git commit -m "chore(pi-postgres-skills): vendor the skills at the pinned commit"
```

---

### Task 10: MCP extension

**Files:**
- Create: `packages/pi-postgres-skills/extensions/postgres-mcp/index.ts`
- Create: `packages/pi-postgres-skills/tests/extension.test.ts`
- Modify: `packages/pi-postgres-skills/package.json` (add `@microsoft/postgres-mcp` to `dependencies` if the launch resolves an installed bin)

**Interfaces:**
- Consumes: `pi.registerMcpServer`.
- Produces: `postgresMcpBin(): string`; default export `(pi: ExtensionAPI) => void`.

- [ ] **Step 1: Write the failing test**

```ts
import { existsSync } from "node:fs";
import { expect, test, vi } from "vitest";
import register, { postgresMcpBin } from "../extensions/postgres-mcp/index.ts";

test("registers postgres-mcp with a pinned, non-network launch", () => {
  const registerMcpServer = vi.fn();
  register({ registerMcpServer } as never);
  const [name, config] = registerMcpServer.mock.calls[0];
  expect(name).toBe("postgres-mcp");
  expect(config.exposure).toBe("codemode");
  expect(config.args).toContain("--no-telemetry");
  expect(config.env.POSTGRES_MCP_QUERY_TIMEOUT_MS).toBe("540000");
});

test("postgresMcpBin resolves an existing file", () => {
  expect(existsSync(postgresMcpBin())).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run packages/pi-postgres-skills/tests/extension.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the extension**

`postgresMcpBin()` resolves the installed `@microsoft/postgres-mcp` bin (`bin/postgres-mcp.js`) via `createRequire(import.meta.url)`; add `"@microsoft/postgres-mcp": "0.3.0"` to `dependencies` so it exists. Default export calls `pi.registerMcpServer("postgres-mcp", { command: process.execPath, args: [postgresMcpBin(), "run", "--no-telemetry"], env: { POSTGRES_MCP_QUERY_TIMEOUT_MS: "540000" }, timeout: 90, exposure: "codemode", description: "PostgreSQL MCP: query, inspect, and modify a selected database." })`. Do not pass `--no-telemetry` before `run`; keep the order `run --no-telemetry` (the server parses the subcommand first). Document the `npx -y @microsoft/postgres-mcp@0.3.0 run --no-telemetry` fallback in the README.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm install && npx vitest run packages/pi-postgres-skills/tests/extension.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/pi-postgres-skills/extensions packages/pi-postgres-skills/tests/extension.test.ts packages/pi-postgres-skills/package.json package-lock.json
git commit -m "feat(pi-postgres-skills): register the PostgreSQL MCP server"
```

---

### Task 11: Final verification

**Files:**
- Modify: any file a failing check reveals.

**Interfaces:**
- Consumes: everything above.
- Produces: a green `npm run check` and a publishable package.

- [ ] **Step 1: Run the full offline suite**

Run: `npm run check`
Expected: typecheck clean, all vitest suites pass.

- [ ] **Step 2: Run the offline vendor drift check**

Run: `npm run vendor:check`
Expected: `pi-egm: ok`, `pi-postgres-skills: ok`, exit 0.

- [ ] **Step 3: Dry-run the publish**

Run: `npm publish --dry-run --workspace packages/pi-postgres-skills`
Expected: the tarball lists `extensions/`, `skills/`, `README.md`, `LICENSE`, `package.json`; no `UPSTREAM.json`, no `tests/`, no `node_modules`.

- [ ] **Step 4: Confirm the review-focus guards hold**

Run: `npx vitest run tests/vendor.test.ts tests/pi-postgres-transforms.test.ts packages/pi-postgres-skills/tests/vendor.test.ts`
Expected: PASS — anchor failures throw, hand edits fail the hash, both ref strategies resolve, and a non-path backslash throws.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(pi-postgres-skills): verify the package end to end"
```

---

## Execution Notes

- **Phase boundary.** After Task 6, all of Phase 1 is done: the shared core, the `pi-egm` migration, repo guards, and both workflows. Merge/review that before starting Phase 2 (Tasks 7–11). Each phase is independently revertable; nothing publishes until `release.yml` is enabled.
- **Live gates (after Task 11, before the README claims support):** `pi install npm:@giljae/pi-postgres-skills` from a clean Pi version; confirm the skills load and `postgres-mcp` connects; run one read-only scenario; trigger `vendor-sync.yml` with `workflow_dispatch` against the current pin and confirm a no-op; confirm the gallery lists both packages after the first release.
- **Execution method:** choose Subagent-driven or Native when the plan is approved.
