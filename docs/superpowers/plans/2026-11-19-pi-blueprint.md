# pi-blueprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `@giljae/pi-blueprint`, a lean mirror of `intincrab/blueprint` on the existing shared vendoring core, so the current sync and release workflows publish it with no change.

**Architecture:** A new descriptor at `scripts/vendors/pi-blueprint.ts` pins an upstream commit, copies the skill subset under `skills/blueprint/`, and applies two fail-loud transforms to `SKILL.md`. A hand-written prompt template gives Pi the `/blueprint <topic>` command; the manifest exposes both the skill and the prompt. `vendor-sync.yml` discovers the descriptor by glob and `release.yml` is package-agnostic, so no workflow changes.

**Tech Stack:** Node 22+, npm workspaces, TypeScript (no build step), vitest, `@changesets/cli`, GitHub Actions.

**Spec:** `docs/designs/pi-blueprint.md`

## Global Constraints

- New package name `@giljae/pi-blueprint`; skills + one prompt template, no extension.
- Upstream pin: repo `https://github.com/intincrab/blueprint`, commit `4cba2c68fb3f06043c7d9b2711db847e1802ef6c` (upstream has no release tags; re-resolve at implementation time and record the SHA in `UPSTREAM.json`).
- Lean subset only, never hand-edit the vendored tree:
  - `include`: `references`→`skills/blueprint/references`, `runtime`→`skills/blueprint/runtime`, `scripts`→`skills/blueprint/scripts`, `templates`→`skills/blueprint/templates`, `examples`→`skills/blueprint/examples`
  - `files`: `SKILL.md`→`skills/blueprint/SKILL.md`, `video/encode.swift`→`skills/blueprint/video/encode.swift`
- Exactly two transforms, both `include`-scoped to `skills/blueprint/SKILL.md`, both fail-loud: missing or ambiguous anchor throws, never skips.
- `LICENSE` is hand-added upstream MIT text, Copyright (c) 2026 Ajay Chauhan; it is **not** vendored and not hashed.
- Package manifest: `license: "MIT"`, `type: "module"`, a `repository` object with `directory: packages/pi-blueprint` (npm provenance requires it), `publishConfig.access: "public"`, `files: ["skills", "prompts", "README.md", "LICENSE"]`, `pi: { "skills": ["./skills"], "prompts": ["./prompts/*.md"] }`, `keywords` includes `pi-package`.
- Playwright is not a dependency and not bundled; it is documented as an external tool.
- No workflow changes: `vendor-sync.yml` and `release.yml` already cover any `scripts/vendors/*.ts` package.
- Version starts at `0.0.0`; the first release is a `patch` changeset, so the release pipeline publishes `0.0.1`.

## Review Focus

1. Upstream rewords an anchor in `SKILL.md` → the transform must throw, never skip. (Task 1)
2. A vendored file is hand-edited → the integrity test must fail on a hash mismatch. (Task 3)
3. A partial sync drops a required file (for example `video/encode.swift`, or a `scripts/lib/*.mjs`) → the integrity test must fail; macOS MP4 otherwise breaks silently. (Task 3)
4. Upstream removes examples → the integrity test must fail on a floor, so the package never ships without its worked examples. (Task 3)
5. The manifest omits `repository`, `pi`, `files`, or the license → the repo-level `packages.test.ts` must fail. (Task 2)

## File Structure

| File | Responsibility |
| --- | --- |
| `scripts/vendors/pi-blueprint.ts` | The vendoring descriptor: upstream pin, subset mapping, and the two transforms. |
| `packages/pi-blueprint/package.json` | The package manifest the release pipeline reads. |
| `packages/pi-blueprint/LICENSE` | Upstream MIT text. |
| `packages/pi-blueprint/README.md` | Install, use, Playwright setup, attribution. |
| `packages/pi-blueprint/prompts/blueprint.md` | The hand-written `/blueprint <topic>` adapter that invokes the skill. |
| `packages/pi-blueprint/skills/blueprint/**` | The vendored skill tree (generated). |
| `packages/pi-blueprint/UPSTREAM.json` | Generated provenance record (pin + per-file SHA-256). |
| `packages/pi-blueprint/tests/vendor.test.ts` | Integrity test for the vendored tree. |
| `tests/pi-blueprint-transforms.test.ts` | Unit tests for the descriptor and its transforms. |

---

### Task 1: `pi-blueprint` descriptor and transforms

**Files:**
- Create: `scripts/vendors/pi-blueprint.ts`
- Test: `tests/pi-blueprint-transforms.test.ts`

**Interfaces:**
- Consumes: `Transform`, `VendorSpec` from `scripts/lib/vendor.ts` (see `scripts/vendors/pi-design-skills.ts` for the `frontmatterEnd` shape).
- Produces: default export `VendorSpec`; named exports `piSkillCommand: Transform` and `piHostNote: Transform`.

- [ ] **Step 1: Write the failing test** in `tests/pi-blueprint-transforms.test.ts`

```ts
import { expect, test } from "vitest";
import spec, { piHostNote, piSkillCommand } from "../scripts/vendors/pi-blueprint.ts";

test("descriptor mirrors the skill subset at a pinned commit", () => {
  expect(spec.repo).toBe("https://github.com/intincrab/blueprint");
  expect(spec.refStrategy).toEqual({ kind: "commit", commit: "4cba2c68fb3f06043c7d9b2711db847e1802ef6c" });
  expect(spec.include).toEqual([
    { from: "references", to: "skills/blueprint/references" },
    { from: "runtime", to: "skills/blueprint/runtime" },
    { from: "scripts", to: "skills/blueprint/scripts" },
    { from: "templates", to: "skills/blueprint/templates" },
    { from: "examples", to: "skills/blueprint/examples" },
  ]);
  expect(spec.files).toEqual([
    { from: "SKILL.md", to: "skills/blueprint/SKILL.md" },
    { from: "video/encode.swift", to: "skills/blueprint/video/encode.swift" },
  ]);
  expect(spec.packageDir).toBe("packages/pi-blueprint");
  expect(spec.transforms.map((t) => t.name)).toEqual(["pi-skill-command", "pi-host-note"]);
});

test("piSkillCommand rewrites the command once and throws when the anchor is gone", () => {
  const doc = "---\nname: blueprint\ndescription: a scene, or types /blueprint [topic].\n---\n# Blueprint\n";
  const out = piSkillCommand.apply(doc, "skills/blueprint/SKILL.md");
  expect(out).not.toContain("types /blueprint [topic]");
  expect(out).toContain("/skill:blueprint");
  expect(() => piSkillCommand.apply(out, "skills/blueprint/SKILL.md")).toThrow();
});

test("piHostNote inserts once after frontmatter and throws when present", () => {
  const doc = "---\nname: blueprint\n---\n# Blueprint\n";
  const out = piHostNote.apply(doc, "skills/blueprint/SKILL.md");
  expect(out.match(/On Pi, invoke this skill with/g)).toHaveLength(1);
  expect(() => piHostNote.apply(out, "skills/blueprint/SKILL.md")).toThrow();
});

test("both transforms only match skills/blueprint/SKILL.md", () => {
  expect(piSkillCommand.include("skills/blueprint/SKILL.md")).toBe(true);
  expect(piSkillCommand.include("skills/blueprint/examples/small/cache.js")).toBe(false);
  expect(piHostNote.include("skills/blueprint/SKILL.md")).toBe(true);
  expect(piHostNote.include("skills/blueprint/references/craft.md")).toBe(false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/pi-blueprint-transforms.test.ts`
Expected: FAIL — cannot resolve `../scripts/vendors/pi-blueprint.ts`.

- [ ] **Step 3: Implement `scripts/vendors/pi-blueprint.ts`**

Follow the shape of `scripts/vendors/pi-design-skills.ts` (same `frontmatterEnd` helper). Use these exact constants:

```ts
const CMD_ANCHOR = "or types /blueprint [topic].";
const CMD_REPLACEMENT = "or runs `/skill:blueprint` with a topic.";

const PI_NOTE_MARKER = "On Pi, invoke this skill with";
const PI_NOTE =
  "> On Pi, invoke this skill with `/skill:blueprint` (or the `/blueprint` prompt template). The " +
  "installed package is read-only and Playwright is not bundled, so install it in a scratch " +
  "directory and run the scripts with `NODE_PATH=<scratch>/node_modules`: " +
  "`npm i playwright@1.56.1 && npx playwright install chromium`. Linting needs only Node.";
```

- `piSkillCommand`: `name: "pi-skill-command"`, `include` = `relPath === "skills/blueprint/SKILL.md"`. In `apply`, count occurrences of `CMD_ANCHOR`; if not exactly 1, throw (`anchor not found or ambiguous (N matches)`); otherwise `replace` it with `CMD_REPLACEMENT`.
- `piHostNote`: `name: "pi-host-note"`, same `include`. In `apply`, throw if the text already includes `PI_NOTE_MARKER`; otherwise insert `` `\n\n${PI_NOTE}\n` `` after the frontmatter end (reuse `frontmatterEnd`).
- Default `VendorSpec`: `repo: "https://github.com/intincrab/blueprint"`, `refStrategy: { kind: "commit", commit: "4cba2c68fb3f06043c7d9b2711db847e1802ef6c" }`, the `include` and `files` arrays from the test, `transforms: [piSkillCommand, piHostNote]`, `packageDir: "packages/pi-blueprint"`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/pi-blueprint-transforms.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/vendors/pi-blueprint.ts tests/pi-blueprint-transforms.test.ts
git commit -m "feat(pi-blueprint): add the vendoring descriptor and transforms"
```

---

### Task 2: `pi-blueprint` manifest, license, README, and prompt

**Files:**
- Create: `packages/pi-blueprint/package.json`
- Create: `packages/pi-blueprint/LICENSE`
- Create: `packages/pi-blueprint/README.md`
- Create: `packages/pi-blueprint/prompts/blueprint.md`

**Interfaces:**
- Consumes: nothing.
- Produces: the package manifest the release pipeline reads, and the `/blueprint` prompt the skill is invoked through.

- [ ] **Step 1: Write `packages/pi-blueprint/package.json`**

```json
{
  "name": "@giljae/pi-blueprint",
  "version": "0.0.0",
  "description": "Animated patent-sheet explainers for the Pi coding agent, vendored from intincrab/blueprint (MIT). Not affiliated with the author.",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/giljae/pi-extensions.git",
    "directory": "packages/pi-blueprint"
  },
  "keywords": ["pi-package", "blueprint", "explainer", "diagram", "animation", "visualization", "documentation"],
  "publishConfig": { "access": "public" },
  "type": "module",
  "files": ["skills", "prompts", "README.md", "LICENSE"],
  "pi": { "skills": ["./skills"], "prompts": ["./prompts/*.md"] }
}
```

- [ ] **Step 2: Write `packages/pi-blueprint/LICENSE`**

Copy upstream's MIT text verbatim; the copyright line is `Copyright (c) 2026 Ajay Chauhan`.

- [ ] **Step 3: Write `packages/pi-blueprint/prompts/blueprint.md`**

```markdown
---
description: Draw an animated patent-sheet explainer of a topic
argument-hint: "<topic>"
---
Use the `blueprint` skill to make an animated explainer of: ${@:-how it works}

Follow the skill's workflow end to end: find the "but… so…" chain, pick the parts, lay out
the sheet, lint it with `scripts/check.mjs`, render frames and look at them, then ship it as
an embed or an export. Read `references/craft.md` before writing the scene.
```

- [ ] **Step 4: Write `packages/pi-blueprint/README.md`**

Sections: what the package is (a one-paragraph summary of the sheet format); install
(`pi install npm:@giljae/pi-blueprint`); use (`/blueprint how a cache works`, or
`/skill:blueprint`); Playwright setup (the scratch-dir + `NODE_PATH` recipe, since the
installed package is read-only); what it exports (GIF, MP4, PNG, standalone HTML); a one-line
note that the frame self-check needs an image-capable model and lint needs only Node; a note
that a user prompt, skill, or command of the same name (`/blueprint`) would collide and the
first discovered wins; MIT attribution and "not affiliated with the author".

- [ ] **Step 5: Run the repo-level convention test**

Run: `npx vitest run tests/packages.test.ts`
Expected: PASS — the new package is gallery-ready (keyword, public access, `files`, `LICENSE`, `repository`, `pi`).

- [ ] **Step 6: Commit**

```bash
git add packages/pi-blueprint/package.json packages/pi-blueprint/LICENSE packages/pi-blueprint/README.md packages/pi-blueprint/prompts
git commit -m "feat(pi-blueprint): add the manifest, license, README, and prompt"
```

---

### Task 3: Vendor the `pi-blueprint` tree

**Files:**
- Generate: `packages/pi-blueprint/skills/blueprint/**`
- Generate: `packages/pi-blueprint/UPSTREAM.json`
- Create: `packages/pi-blueprint/tests/vendor.test.ts`

**Interfaces:**
- Consumes: the Task 1 descriptor, `checkVendor` from `scripts/lib/vendor.ts`.
- Produces: the vendored tree and its integrity test.

- [ ] **Step 1: Write the integrity test** in `packages/pi-blueprint/tests/vendor.test.ts`

```ts
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { expect, test } from "vitest";
import { checkVendor } from "../../../scripts/lib/vendor.ts";
import spec from "../../../scripts/vendors/pi-blueprint.ts";

test("vendored tree matches UPSTREAM.json", () => {
  expect(checkVendor(spec)).toBe(true);
});

test("the skill carries exactly one Pi note and no upstream slash command", () => {
  const text = readFileSync(new URL("../skills/blueprint/SKILL.md", import.meta.url), "utf8");
  expect(text.match(/On Pi, invoke this skill with/g)).toHaveLength(1);
  expect(text).not.toContain("types /blueprint [topic]");
});

test("the runtime, export helpers, and the macOS encoder are present", () => {
  const dir = new URL("../skills/blueprint/", import.meta.url);
  for (const rel of [
    "references/craft.md",
    "runtime/blueprint.js",
    "scripts/check.mjs",
    "scripts/frames.mjs",
    "scripts/build.mjs",
    "scripts/export.mjs",
    "scripts/lib/gif.mjs",
    "scripts/lib/inline.mjs",
    "scripts/lib/png.mjs",
    "templates/scene.js",
    "templates/incident.js",
    "video/encode.swift",
  ]) {
    expect(existsSync(new URL(rel, dir)), rel).toBe(true);
  }
});

test("the worked examples are vendored", () => {
  const dir = new URL("../skills/blueprint/examples/", import.meta.url);
  const count = (sub: string) => readdirSync(new URL(sub, dir)).filter((n) => n.endsWith(".js")).length;
  expect(count("small/")).toBeGreaterThanOrEqual(10);
  expect(count("complex/")).toBeGreaterThanOrEqual(11);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run packages/pi-blueprint/tests/vendor.test.ts`
Expected: FAIL — no `skills/` tree yet.

- [ ] **Step 3: Run the sync** (network)

Run: `npx tsx scripts/run-vendor-sync.ts pi-blueprint`
Expected: `changed: pi-blueprint <commit>`; `packages/pi-blueprint/skills/blueprint/` holds the skill subset and `UPSTREAM.json` records the repo, commit, the two transform names, and per-file SHA-256 under `skills/blueprint/**`.

- [ ] **Step 4: Run the tests and the offline check**

Run: `npx vitest run packages/pi-blueprint/tests/vendor.test.ts && npm run vendor:check`
Expected: PASS (4 tests); every vendor line reads `ok`, including `pi-blueprint: ok`.

- [ ] **Step 5: Commit**

```bash
git add packages/pi-blueprint/skills packages/pi-blueprint/UPSTREAM.json packages/pi-blueprint/tests/vendor.test.ts
git commit -m "chore(pi-blueprint): vendor the skill tree at the pinned commit"
```

---

### Task 4: Final verification and changeset

**Files:**
- Create: `.changeset/pi-blueprint-initial.md`
- Modify: any file a failing check reveals.

**Interfaces:**
- Consumes: everything above.
- Produces: a green `npm run check` and a publishable package.

- [ ] **Step 1: Run the full offline suite**

Run: `npm run check`
Expected: typecheck clean, all vitest suites pass.

- [ ] **Step 2: Run the offline vendor drift check**

Run: `npm run vendor:check`
Expected: `pi-egm: ok`, `pi-postgres-skills: ok`, `pi-design-skills: ok`, `pi-pstack: ok`, `pi-blueprint: ok`, exit 0.

- [ ] **Step 3: Dry-run the publish**

Run: `npm publish --dry-run --workspace packages/pi-blueprint`
Expected: the tarball lists `skills/`, `prompts/`, `README.md`, `LICENSE`, `package.json`; no `UPSTREAM.json`, no `tests/`, no `node_modules`.

- [ ] **Step 4: Confirm the review-focus guards hold**

Run: `npx vitest run tests/pi-blueprint-transforms.test.ts packages/pi-blueprint/tests/vendor.test.ts`
Expected: PASS — each transform throws on a reworded or already-present anchor, a hand edit fails the hash, and the required runtime/export files and example floor are asserted.

- [ ] **Step 5: Add the changeset and commit**

Create `.changeset/pi-blueprint-initial.md`:

```markdown
---
"@giljae/pi-blueprint": patch
---

Initial release: a lean mirror of `intincrab/blueprint` for the Pi coding agent — the
`blueprint` skill (runtime, linter, frame renderer, GIF/MP4/PNG export, craft reference,
templates, and 21 worked examples) plus a `/blueprint <topic>` prompt template.
```

Then:

```bash
git add -A
git commit -m "chore(pi-blueprint): verify the package end to end"
```

---

## Execution Notes

- **Publish path.** After merge to `main`, `release.yml` opens a Version Packages PR (this needs the changeset from Task 4); merging it publishes `0.0.1` via npm trusted publishing, already configured for the repo's packages. Confirm the trusted publisher covers the new name before the first publish.
- **Upstream pin.** Re-resolve `intincrab/blueprint` HEAD at implementation time with `git ls-remote`; if it has moved, record the new SHA in the descriptor's `refStrategy.commit` (and in the Task 1 test) and in `UPSTREAM.json`. No tags exist upstream, so the commit is the pin.
- **Live gate (after Task 4, before the README claims support):** `pi install npm:@giljae/pi-blueprint`; confirm the skill loads, `/skill:blueprint` resolves, `/blueprint how a cache works` expands, and one end-to-end GIF export succeeds with the scratch-dir Playwright.
