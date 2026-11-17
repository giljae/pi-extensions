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
