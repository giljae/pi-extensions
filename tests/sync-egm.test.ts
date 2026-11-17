import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { expect, test } from "vitest";
import { appendPiDispatchName, checkSync, insertPiPointer } from "../scripts/sync-egm.ts";

const CLAUDE = "In Claude Code or Cowork, read `${CLAUDE_PLUGIN_ROOT}/docs/claude.md` first.\n";

test("inserts the Pi pointer once after the Claude line", () => {
  const out = insertPiPointer(`intro\n${CLAUDE}\nbody\n`);
  expect(out).toContain("first.\nIn Pi, read `../../PI.md` first.\n");
  expect(out.match(/In Pi, read/g)).toHaveLength(1);
});

test("refuses when the Claude anchor is missing", () => {
  expect(() => insertPiPointer("intro\nbody\n")).toThrow(/Claude anchor/);
});

test("refuses when the Pi pointer is already present", () => {
  expect(() => insertPiPointer(`${CLAUDE}In Pi, read \`../../PI.md\` first.\n`)).toThrow(/already/);
});

test("appends the Pi dispatch name when the enumeration is present", () => {
  const line = "subagent tool (Antigravity: `invoke_subagent`; Claude Code: `Agent`; Codex: `spawn_agent`). Each";
  expect(appendPiDispatchName(line)).toContain("Codex: `spawn_agent`; Pi: `egm_goldfish`)");
});

test("leaves text without the enumeration unchanged", () => {
  expect(appendPiDispatchName("no enumeration here")).toBe("no enumeration here");
});

test("checkSync detects a hand-edited vendored file without network", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "egm-check-"));
  mkdirSync(path.join(dir, "skills", "s"), { recursive: true });
  const file = path.join(dir, "skills", "s", "SKILL.md");
  writeFileSync(file, "original");
  const hash = createHash("sha256").update("original").digest("hex");
  writeFileSync(path.join(dir, "UPSTREAM.json"), JSON.stringify({ files: { "skills/s/SKILL.md": hash } }));
  expect(checkSync(dir)).toBe(true);
  writeFileSync(file, "edited");
  expect(checkSync(dir)).toBe(false);
});
