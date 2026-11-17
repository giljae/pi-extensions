import { readFileSync, readdirSync } from "node:fs";
import { expect, test } from "vitest";
import { ROLE_TO_PERSONA, buildGoldfishArgv, buildReviewTask, runChild } from "../extensions/egm-goldfish/index.ts";

test("pins the exact read-only child argv", () => {
  expect(buildGoldfishArgv("Task: review x")).toEqual([
    "--no-context-files", "--no-session",
    "--no-mcp", "--no-skills", "--no-prompt-templates",
    "--tools", "read,grep,find,ls",
    "-p", "Task: review x",
  ]);
});

test("never grants a mutation tool", () => {
  const argv = buildGoldfishArgv("Task: x").join(" ");
  for (const tool of ["bash", "edit", "write"]) expect(argv).not.toContain(tool);
});

test("maps every vendored persona name", () => {
  const root = new URL("../", import.meta.url);
  const names = readdirSync(new URL("agents/", root))
    .filter((f) => f.endsWith(".md"))
    .map((f) => /^name:\s*(egm-[a-z-]+)\s*$/m.exec(readFileSync(new URL(`agents/${f}`, root), "utf8").split("---", 2)[1] ?? "")?.[1]);
  expect(Object.keys(ROLE_TO_PERSONA).sort()).toEqual(names.sort());
});

test("runChild rejects instead of hanging when the command is missing", async () => {
  await expect(runChild({ command: "definitely-not-a-real-binary-xyz", args: [] })).rejects.toThrow();
});

test("buildReviewTask carries standards, context, and focus", () => {
  const task = buildReviewTask({
    role: "egm-zoom-out",
    target: "/abs/design.md",
    standards: ["/abs/zoom-out-standard.md"],
    context: ["/abs/baseline.md", "/abs/zoom_out_report.md"],
    focus: "focus on mitigations",
  });
  for (const needle of [
    "/abs/design.md",
    "/abs/zoom-out-standard.md",
    "/abs/baseline.md",
    "/abs/zoom_out_report.md",
    "focus on mitigations",
  ]) {
    expect(task).toContain(needle);
  }
});

test("buildReviewTask works with only role and target", () => {
  const task = buildReviewTask({ role: "egm-comprehension", target: "/abs/x.md" });
  expect(task).toContain("/abs/x.md");
});
