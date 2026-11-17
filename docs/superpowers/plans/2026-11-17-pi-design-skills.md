# pi-design-skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `@giljae/pi-design-skills`, a full mirror of `emilkowalski/skills` on the existing shared vendoring core, so the current sync and release workflows publish it with no change.

**Architecture:** A new descriptor at `scripts/vendors/pi-design-skills.ts` pins an upstream commit, copies `skills/**`, and applies one fail-loud transform (`pi-host-note`) to `learn-taste/SKILL.md`. The package is skills-only. `vendor-sync.yml` discovers the descriptor by glob and `release.yml` is package-agnostic, so no workflow changes.

**Tech Stack:** Node 22+, npm workspaces, TypeScript (no build step), vitest, `@changesets/cli`, GitHub Actions.

**Spec:** `docs/designs/pi-design-skills.md`

## Global Constraints

- New package name `@giljae/pi-design-skills`; skills-only, no extension.
- Upstream pin: repo `https://github.com/emilkowalski/skills`, commit `64eb3deb9a5fbfa041faf783e0bc3fd635872e9c` (no release tags; re-resolve if newer at implementation time and record the SHA in `UPSTREAM.json`).
- Full mirror of `skills/**` (20 `SKILL.md` + 9 references). Never hand-edit the vendored tree.
- Exactly one transform, `pi-host-note`, applied only to `skills/learn-taste/SKILL.md`. It is fail-loud: missing or already-present anchor throws.
- Package manifest: `license: "MIT"`, a `repository` object with `directory: packages/pi-design-skills` (npm provenance requires it), `publishConfig.access: "public"`, `files: ["skills", "README.md", "LICENSE"]`, `pi: { "skills": ["./skills"] }`, `keywords` includes `pi-package`.
- `LICENSE` carries upstream's MIT text, Copyright (c) 2026 Emil Kowalski.
- No workflow changes: `vendor-sync.yml` and `release.yml` already cover any `scripts/vendors/*.ts` package.
- Version starts at `0.0.1`; the release is a `patch` changeset.

## Review Focus

1. Upstream rewords the `learn-taste` anchor → the transform must throw, never skip. (Task 1)
2. A vendored file is hand-edited → the integrity test must fail on a hash mismatch. (Task 3)
3. `skills/learn-taste/SKILL.md` is missing or renamed upstream → the sync must not silently produce a tree without the note; the integrity test asserts the file exists and carries exactly one note. (Task 3)
4. A skill directory upstream lacks a `SKILL.md` (malformed addition) → the integrity test asserts every skill directory contains one. (Task 3)
5. A package manifest omits `repository`, `pi`, or the license → the repo-level `packages.test.ts` must fail. (Task 2)

---

### Task 1: `pi-design-skills` descriptor and transform

**Files:**
- Create: `scripts/vendors/pi-design-skills.ts`
- Test: `tests/pi-design-transforms.test.ts`

**Interfaces:**
- Consumes: `Transform`, `VendorSpec` from `scripts/lib/vendor.ts`.
- Produces: default export `VendorSpec`; named `piHostNote: Transform`.

- [ ] **Step 1: Write the failing test** in `tests/pi-design-transforms.test.ts`

```ts
import { expect, test } from "vitest";
import spec, { piHostNote } from "../scripts/vendors/pi-design-skills.ts";

test("descriptor mirrors skills/ at a pinned commit", () => {
  expect(spec.include).toEqual(["skills"]);
  expect(spec.packageDir).toBe("packages/pi-design-skills");
  expect(spec.transforms.map((t) => t.name)).toEqual(["pi-host-note"]);
});

test("piHostNote inserts once after frontmatter and throws when present", () => {
  const doc = "---\nname: learn-taste\n---\n# X\n";
  const out = piHostNote.apply(doc, "skills/learn-taste/SKILL.md");
  expect(out.match(/On Pi, project context lives in/g)).toHaveLength(1);
  expect(() => piHostNote.apply(out, "skills/learn-taste/SKILL.md")).toThrow();
});

test("piHostNote.include only matches the learn-taste skill", () => {
  expect(piHostNote.include("skills/learn-taste/SKILL.md")).toBe(true);
  expect(piHostNote.include("skills/animate/SKILL.md")).toBe(false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/pi-design-transforms.test.ts`
Expected: FAIL — cannot resolve `../scripts/vendors/pi-design-skills.ts`.

- [ ] **Step 3: Implement `scripts/vendors/pi-design-skills.ts`**

Follow `scripts/vendors/pi-postgres-skills.ts`. `piHostNote`:
`include` = `(relPath) => relPath === "skills/learn-taste/SKILL.md"`; `apply` throws
if the text includes `"On Pi, project context lives in"`, else inserts after the
frontmatter block (reuse the frontmatter-end logic from the postgres descriptor):
`> On Pi, project context lives in AGENTS.md (Pi reads it automatically), and corrections come from the current session rather than the Claude Code paths named below.`
Export the default `VendorSpec`:
`repo: "https://github.com/emilkowalski/skills"`, `refStrategy: { kind: "commit", commit: "64eb3deb9a5fbfa041faf783e0bc3fd635872e9c" }`, `include: ["skills"]`, `transforms: [piHostNote]`, `packageDir: "packages/pi-design-skills"`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/pi-design-transforms.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/vendors/pi-design-skills.ts tests/pi-design-transforms.test.ts
git commit -m "feat(pi-design-skills): add the vendoring descriptor and transform"
```

---

### Task 2: `pi-design-skills` manifest, license, and README

**Files:**
- Create: `packages/pi-design-skills/package.json`
- Create: `packages/pi-design-skills/LICENSE`
- Create: `packages/pi-design-skills/README.md`

**Interfaces:**
- Consumes: nothing.
- Produces: the package manifest the release pipeline reads.

- [ ] **Step 1: Write the package files**

`package.json`: `name: "@giljae/pi-design-skills"`, `version: "0.0.1"`, `description` naming it as Emil Kowalski's UI/motion design skills for Pi, `license: "MIT"`,
`repository: { "type": "git", "url": "https://github.com/giljae/pi-extensions.git", "directory": "packages/pi-design-skills" }`,
`keywords: ["pi-package", "design", "ui", "animation", "motion", "frontend"]`,
`publishConfig: { "access": "public" }`, `type: "module"`,
`files: ["skills", "README.md", "LICENSE"]`, `pi: { "skills": ["./skills"] }`.
(No `dependencies`; no extension.) Copy upstream's MIT text into `LICENSE`.
`README.md`: what the package is, `pi install npm:@giljae/pi-design-skills`, a short
list of the skills, the MIT attribution, and a note that generic skill names may
collide with a user's other skills.

- [ ] **Step 2: Run the repo-level convention test**

Run: `npx vitest run tests/packages.test.ts`
Expected: PASS — the new package is gallery-ready (keyword, public access, `files`, `LICENSE`, `repository`, `pi`).

- [ ] **Step 3: Commit**

```bash
git add packages/pi-design-skills/package.json packages/pi-design-skills/LICENSE packages/pi-design-skills/README.md
git commit -m "feat(pi-design-skills): add the package manifest, license, and README"
```

---

### Task 3: Vendor the `pi-design-skills` tree

**Files:**
- Generate: `packages/pi-design-skills/skills/**`
- Generate: `packages/pi-design-skills/UPSTREAM.json`
- Create: `packages/pi-design-skills/tests/vendor.test.ts`

**Interfaces:**
- Consumes: the Task 1 descriptor, `checkVendor` from `scripts/lib/vendor.ts`.
- Produces: the vendored tree and its integrity test.

- [ ] **Step 1: Write the integrity test** in `packages/pi-design-skills/tests/vendor.test.ts`

```ts
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { expect, test } from "vitest";
import { checkVendor } from "../../../scripts/lib/vendor.ts";
import spec from "../../../scripts/vendors/pi-design-skills.ts";

test("vendored tree matches UPSTREAM.json", () => {
  expect(checkVendor(spec)).toBe(true);
});

test("every skill has a SKILL.md and learn-taste carries one Pi note", () => {
  const dir = new URL("../skills/", import.meta.url);
  const names = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  expect(names.length).toBeGreaterThanOrEqual(20);
  for (const name of names) {
    expect(existsSync(new URL(`${name}/SKILL.md`, dir)), name).toBe(true);
  }
  const text = readFileSync(new URL("learn-taste/SKILL.md", dir), "utf8");
  expect(text.match(/On Pi, project context lives in/g)).toHaveLength(1);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run packages/pi-design-skills/tests/vendor.test.ts`
Expected: FAIL — no `skills/` tree yet.

- [ ] **Step 3: Run the sync** (network)

Run: `npx tsx scripts/run-vendor-sync.ts pi-design-skills`
Expected: `changed: pi-design-skills <commit>`; `packages/pi-design-skills/skills/` holds the 20 skills and their references, and `UPSTREAM.json` records the repo, commit, transforms, and per-file SHA-256.

- [ ] **Step 4: Run the tests and the offline check**

Run: `npx vitest run packages/pi-design-skills/tests/vendor.test.ts && npm run vendor:check`
Expected: PASS; `pi-egm: ok`, `pi-postgres-skills: ok`, `pi-design-skills: ok`.

- [ ] **Step 5: Commit**

```bash
git add packages/pi-design-skills/skills packages/pi-design-skills/UPSTREAM.json packages/pi-design-skills/tests/vendor.test.ts
git commit -m "chore(pi-design-skills): vendor the skills at the pinned commit"
```

---

### Task 4: Final verification

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
Expected: `pi-egm: ok`, `pi-postgres-skills: ok`, `pi-design-skills: ok`, exit 0.

- [ ] **Step 3: Dry-run the publish**

Run: `npm publish --dry-run --workspace packages/pi-design-skills`
Expected: the tarball lists `skills/`, `README.md`, `LICENSE`, `package.json`; no `UPSTREAM.json`, no `tests/`, no `node_modules`.

- [ ] **Step 4: Confirm the review-focus guards hold**

Run: `npx vitest run tests/pi-design-transforms.test.ts packages/pi-design-skills/tests/vendor.test.ts`
Expected: PASS — the transform throws on a reworded or already-present anchor, hand edits fail the hash, and every skill directory has a `SKILL.md`.

- [ ] **Step 5: Add the changeset and commit**

Create `.changeset/pi-design-skills-initial.md` with a `patch` entry for
`@giljae/pi-design-skills` ("Initial release: a full mirror of Emil Kowalski's
UI and motion design skills."). Then:

```bash
git add -A
git commit -m "chore(pi-design-skills): verify the package end to end"
```

---

## Execution Notes

- **Publish path.** After merge to `main`, `release.yml` opens a Version Packages
  PR (this needs a changeset, added in Task 4); merging it publishes `0.0.1` via
  npm trusted publishing, which is already configured for the repo's packages.
  Confirm the trusted publisher covers the new name before the first publish.
- **Live gate (after Task 4, before the README claims support):**
  `pi install npm:@giljae/pi-design-skills`; confirm the skills load and
  `/skill:animate` resolves.
