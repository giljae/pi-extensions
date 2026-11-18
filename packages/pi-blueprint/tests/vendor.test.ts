import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
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

test("the vendored linter runs clean on an example (runtime loads as CommonJS)", () => {
  const script = fileURLToPath(new URL("../skills/blueprint/scripts/check.mjs", import.meta.url));
  const example = fileURLToPath(new URL("../skills/blueprint/examples/small/cache.js", import.meta.url));
  const out = execFileSync(process.execPath, [script, example], { encoding: "utf8" });
  expect(out).toContain("clean");
});
