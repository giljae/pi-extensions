# pi-pstack Milestone B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the optional `pi-subagents` integration to `@giljae/pi-pstack`: `pi-subagents` auto-discovers the package's two agents from the manifest, the agents carry writer/read-only tool policy, and the Pi adapter routes pstack's delegated roles and per-role thinking levels.

**Architecture:** `pi-subagents` reads each installed Pi package's `package.json` and loads the directories under `pi-subagents.agents`. So the integration is one manifest key plus an extended `pi-agent-frontmatter` transform that sets `tools`/`acceptanceRole`; `harness/pi.md` maps delegation. No setup skill, extension, or dependency.

**Tech Stack:** Node 22+, npm workspaces, TypeScript (no build step), vitest, `@changesets/cli`.

**Spec:** `docs/designs/pi-pstack.md` (Milestone B)

## Global Constraints

- Package `@giljae/pi-pstack`; `package.json` stays `version: "0.0.1"` (changesets owns the bump). No `dependencies`.
- Upstream pin unchanged: `cursor/plugins` commit `93b916d4a1e806507e22f4716b352fa91f2b227e`. The vendored tree is regenerated only by the sync; never hand-edit `skills/` or `agents/`.
- Agent frontmatter must match the `pi-subagents` schema: `name`, `description`, `inheritSkills`, `thinking`, `tools`, `acceptanceRole`.
- `poteto-agent` is a writer: `tools: read, grep, find, ls, bash, edit, write`, `acceptanceRole: writer`. `comment-sicko` is read-only: `tools: read, grep, find, ls`, `acceptanceRole: read-only`. A comment reviewer must never edit.
- Manifest key: `"pi-subagents": { "agents": ["./agents"] }`. Inert when `pi-subagents` is not installed; never a dependency.
- `harness/pi.md` maps `poteto-agent`/`comment-sicko` to the auto-discovered agents and each pstack role to a `pi-subagents` `thinking` level; per-role *model* choice stays in `pi-subagents` configuration — never a Cursor slug.
- The transforms stay fail-loud: an agent name without a profile throws, never silently omits tools.
- No workflow changes.

## Review Focus

1. **`comment-sicko` must be read-only.** If its agent file gains `edit`/`write`, a comment reviewer can mutate the tree. (Task 1 integrity test)
2. **`poteto-agent` must stay a writer.** Without `edit`/`write` it cannot implement. (Task 1 integrity test)
3. **An unknown agent name must throw**, not ship an agent with no tools. (Task 1 transform test)
4. **The `pi-subagents` manifest key must not break Pi's load or the repo convention test.** (Task 2, Task 4)
5. **Re-vendoring must keep Milestone A's invariants** — 58 skills, one note each, `statechart/scripts/test` absent. (Task 1, Task 4)

---

### Task 1: writer/read-only agent tools, and re-vendor

**Files:**
- Modify: `scripts/vendors/pi-pstack.ts` (`piAgentFrontmatter`)
- Modify: `tests/pi-pstack-transforms.test.ts`
- Generate: `packages/pi-pstack/agents/**`, `packages/pi-pstack/UPSTREAM.json`
- Modify: `packages/pi-pstack/tests/vendor.test.ts`

**Interfaces:**
- Consumes: `Transform`, `VendorSpec`, the existing `piAgentFrontmatter`.
- Produces: `piAgentFrontmatter` additionally emits `tools:` and `acceptanceRole:`; re-vendored `agents/*.md` and `UPSTREAM.json`.

- [ ] **Step 1: Write the failing tests**

Add to `tests/pi-pstack-transforms.test.ts`, reusing the existing `AGENT` (`name: poteto-agent`) and `AGENT_NO_MODEL` (`name: comment-sicko`) fixtures:

```ts
test("piAgentFrontmatter gives poteto-agent writer tools", () => {
  const out = piAgentFrontmatter.apply(AGENT, "agents/poteto-agent.md");
  expect(out).toContain("tools: read, grep, find, ls, bash, edit, write");
  expect(out).toContain("acceptanceRole: writer");
});

test("piAgentFrontmatter makes comment-sicko read-only", () => {
  const out = piAgentFrontmatter.apply(AGENT_NO_MODEL, "agents/comment-sicko.md");
  expect(out).toContain("tools: read, grep, find, ls");
  expect(out).toContain("acceptanceRole: read-only");
  expect(out).not.toMatch(/^tools: .*\b(edit|write)\b/m);
});

test("piAgentFrontmatter throws on an unknown agent name", () => {
  const orphan = "---\nname: mystery\ndescription: x\n---\n\nBody\n";
  expect(() => piAgentFrontmatter.apply(orphan, "agents/mystery.md")).toThrow();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/pi-pstack-transforms.test.ts`
Expected: FAIL — the transform does not emit `tools`/`acceptanceRole` and does not throw on `mystery`.

- [ ] **Step 3: Extend `piAgentFrontmatter` in `scripts/vendors/pi-pstack.ts`**

Add the profile table:

```ts
const AGENT_PROFILES: Record<string, { tools: string; acceptanceRole: string }> = {
  "poteto-agent": { tools: "read, grep, find, ls, bash, edit, write", acceptanceRole: "writer" },
  "comment-sicko": { tools: "read, grep, find, ls", acceptanceRole: "read-only" },
};
```

In `apply`, after `const lines = body.split("\n")`, resolve the profile and throw when absent:

```ts
const nameLine = lines.find((line) => line.startsWith("name:"));
if (!nameLine) throw new Error("agent has no name");
const profile = AGENT_PROFILES[nameLine.slice("name:".length).trim()];
if (!profile) throw new Error(`unknown agent: ${nameLine}`);
```

After the existing `kept.push("inheritSkills: false")` and optional `thinking: high`, append:

```ts
kept.push(`tools: ${profile.tools}`);
kept.push(`acceptanceRole: ${profile.acceptanceRole}`);
```

- [ ] **Step 4: Run the transform tests to verify they pass**

Run: `npx vitest run tests/pi-pstack-transforms.test.ts`
Expected: PASS.

- [ ] **Step 5: Extend the integrity test** in `packages/pi-pstack/tests/vendor.test.ts`

Add:

```ts
test("agents carry writer/read-only pi-subagents policy", () => {
  const dir = new URL("../agents/", import.meta.url);
  const poteto = readFileSync(new URL("poteto-agent.md", dir), "utf8");
  expect(poteto).toMatch(/^tools: .*edit, write/m);
  expect(poteto).toContain("acceptanceRole: writer");
  const sicko = readFileSync(new URL("comment-sicko.md", dir), "utf8");
  expect(sicko).toContain("acceptanceRole: read-only");
  expect(sicko).not.toMatch(/^tools: .*\b(edit|write)\b/m);
});
```

- [ ] **Step 6: Re-vendor and run the whole suite**

Run: `npx tsx scripts/run-vendor-sync.ts pi-pstack && npx vitest run packages/pi-pstack/tests/vendor.test.ts && npm run vendor:check`
Expected: `changed: pi-pstack <commit>`; all vendor tests pass; every package `ok`. `UPSTREAM.json` records the same commit with the extended transform.

- [ ] **Step 7: Commit**

```bash
git add scripts/vendors/pi-pstack.ts tests/pi-pstack-transforms.test.ts packages/pi-pstack/agents packages/pi-pstack/UPSTREAM.json packages/pi-pstack/tests/vendor.test.ts
git commit -m "feat(pi-pstack): set writer/read-only tools on the vendored agents"
```

---

### Task 2: declare the agents for `pi-subagents` discovery

**Files:**
- Modify: `packages/pi-pstack/package.json`
- Modify: `packages/pi-pstack/tests/vendor.test.ts`

**Interfaces:**
- Consumes: the `agents/` directory from Task 1.
- Produces: the manifest key `pi-subagents.agents` that `pi-subagents` reads.

- [ ] **Step 1: Write the failing test**

Add to `packages/pi-pstack/tests/vendor.test.ts`:

```ts
test("package declares its agents for pi-subagents discovery", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  expect(pkg["pi-subagents"]?.agents).toEqual(["./agents"]);
  expect(existsSync(new URL("../agents", import.meta.url))).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run packages/pi-pstack/tests/vendor.test.ts`
Expected: FAIL — `pkg["pi-subagents"]` is undefined.

- [ ] **Step 3: Add the manifest key**

In `packages/pi-pstack/package.json`, add after the `pi` manifest:

```json
  "pi": { "skills": ["./skills"] },
  "pi-subagents": { "agents": ["./agents"] }
```

- [ ] **Step 4: Run the test and the repo convention test**

Run: `npx vitest run packages/pi-pstack/tests/vendor.test.ts tests/packages.test.ts`
Expected: PASS — the key is present and the package is still gallery-ready.

- [ ] **Step 5: Commit**

```bash
git add packages/pi-pstack/package.json packages/pi-pstack/tests/vendor.test.ts
git commit -m "feat(pi-pstack): declare the agents for pi-subagents discovery"
```

---

### Task 3: delegation and role mapping in the adapter

**Files:**
- Modify: `packages/pi-pstack/harness/pi.md`
- Modify: `packages/pi-pstack/tests/harness.test.ts`

**Interfaces:**
- Consumes: the registered agents and role names from Tasks 1-2.
- Produces: the adapter's delegation and per-role `thinking` mapping.

- [ ] **Step 1: Write the failing test**

Extend the marker list in `packages/pi-pstack/tests/harness.test.ts`:

```ts
    "Task", "subagent", "thinking", "AGENTS.md", "~/.pi/agent/sessions", "Skipped on Pi:",
    "pi-subagents", "poteto-agent", "comment-sicko", "swarm workers",
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run packages/pi-pstack/tests/harness.test.ts`
Expected: FAIL — `poteto-agent` / `comment-sicko` / `swarm workers` are not yet in the adapter.

- [ ] **Step 3: Update `harness/pi.md`**

- In the Subagent fields table, state that `poteto-agent` and `comment-sicko` are registered automatically when `pi-subagents` is installed (this package declares them under `pi-subagents.agents`), so use `agent: "poteto-agent"` / `agent: "comment-sicko"`; keep the in-thread fallback when no subagent tool exists.
- In the Models table, replace the generic role text with a mapping from pstack roles to `pi-subagents` `thinking` levels: code playbooks (`feature`, `refactoring`, `bug-fix`, `perf-issue`, `hillclimb`), judgment and prose, `swarm workers`, and the review/design panels. State that the concrete model per role is set in `pi-subagents` configuration, never a Cursor slug.
- In the `setup-pstack` section, point model configuration at `pi-subagents` (per-agent or per-role model settings) instead of "a later release".

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run packages/pi-pstack/tests/harness.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/pi-pstack/harness/pi.md packages/pi-pstack/tests/harness.test.ts
git commit -m "feat(pi-pstack): map delegation and per-role thinking in the adapter"
```

---

### Task 4: docs, changeset, and final verification

**Files:**
- Modify: `packages/pi-pstack/README.md`
- Create: `.changeset/pi-pstack-subagents.md`
- Modify: any file a failing check reveals.

**Interfaces:**
- Consumes: everything above.
- Produces: a green `npm run check`, `npm run vendor:check`, and a publishable package.

- [ ] **Step 1: Update the README**

In the "How it runs on Pi" section, replace "that integration lands in a later release" with a short description: installing `pi-subagents` makes this package's `poteto-agent` (writer) and `comment-sicko` (read-only) load automatically, and `poteto-mode` delegates through the adapter; per-role model choice lives in `pi-subagents` configuration.

- [ ] **Step 2: Run the full offline suite**

Run: `npm run check && npm run vendor:check`
Expected: typecheck clean; all vitest suites pass; every package `ok`.

- [ ] **Step 3: Dry-run the publish**

Run: `npm publish --dry-run --workspace packages/pi-pstack`
Expected: the tarball lists `skills/`, `agents/`, `harness/`, `README.md`, `LICENSE`, `package.json`; the `agents/` files carry `tools`/`acceptanceRole`; no `UPSTREAM.json`, no `tests/`.

- [ ] **Step 4: Add the changeset**

Create `.changeset/pi-pstack-subagents.md`:

```markdown
---
"@giljae/pi-pstack": minor
---

Optional `pi-subagents` integration: `@giljae/pi-pstack` now declares its
`poteto-agent` (writer) and `comment-sicko` (read-only) for automatic discovery,
and the Pi harness adapter maps pstack's delegated roles and per-role thinking
levels.
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs(pi-pstack): document the pi-subagents integration and add the changeset"
```

---

## Execution Notes

- **Version.** This `minor` changeset plus Milestone A's pending `patch` changeset mean the eventual first publish is `0.1.0`. Deployment stays deferred; the Version Packages PR is regenerated on push and not merged yet.
- **Live gate (needs `pi-subagents`).** Install `pi-subagents`, `pi install npm:@giljae/pi-pstack` (or `pi -e`), and confirm `poteto-agent` and `comment-sicko` appear as available agents and one `poteto-mode` task spawns a `poteto-agent` child. This environment does not have `pi-subagents`, so this gate is the user's.
