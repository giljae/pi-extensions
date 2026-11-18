import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const doc = readFileSync(new URL("../harness/pi.md", import.meta.url), "utf8");

test("the Pi adapter maps the Cursor surface pstack skills use", () => {
  for (const marker of [
    "Task", "subagent", "thinking", "AGENTS.md", "~/.pi/agent/sessions", "Skipped on Pi:",
    "pi-subagents", "poteto-agent", "comment-sicko", "swarm workers",
  ]) {
    expect(doc, marker).toContain(marker);
  }
});
