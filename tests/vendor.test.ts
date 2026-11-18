import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { expect, test } from "vitest";
import {
  applyTransform, checkVendor, copyVendored, hashTree, pickLatestTag, readUpstream,
  resolveRef, runVendorSync, writeUpstream,
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

test("copyVendored removes each excluded path", () => {
  const src = tmp(); const dest = tmp();
  mkdirSync(path.join(src, "skills", "keep"), { recursive: true });
  mkdirSync(path.join(src, "skills", "drop", "test"), { recursive: true });
  writeFileSync(path.join(src, "skills", "keep", "SKILL.md"), "k");
  writeFileSync(path.join(src, "skills", "drop", "SKILL.md"), "d");
  writeFileSync(path.join(src, "skills", "drop", "test", "fixture"), "f");
  copyVendored(src, dest, ["skills"], [], ["skills/drop/test"]);
  expect(existsSync(path.join(dest, "skills", "drop", "test"))).toBe(false);
  expect(Object.keys(hashTree(dest, ["skills"]))).toEqual([
    "skills/drop/SKILL.md",
    "skills/keep/SKILL.md",
  ]);
});

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

function gitIn(repo: string): (args: string[]) => string {
  return (args) => execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
}

test("resolveRef resolves a tag and an explicit commit", () => {
  const repo = gitRepo();
  const base = { repo: `file://${repo}`, include: [], transforms: [] } as unknown as VendorSpec;
  const byTag = resolveRef({ ...base, refStrategy: { kind: "tag", tag: "v0.1.0" } }, {}, gitIn(repo));
  const byCommit = resolveRef({ ...base, refStrategy: { kind: "commit", commit: byTag.commit } }, {}, gitIn(repo));
  expect(byTag.commit).toBe(byCommit.commit);
});

test("resolveRef with latest advances a commit pin but keeps it without latest", () => {
  const repo = gitRepo();
  const first = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).trim();
  writeFileSync(path.join(repo, "plugin", "skills", "s", "SKILL.md"), "changed");
  execFileSync("git", ["commit", "-aqm", "second"], { cwd: repo });
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).trim();
  const base = { repo: `file://${repo}`, include: [], transforms: [] } as unknown as VendorSpec;
  const spec = { ...base, refStrategy: { kind: "commit", commit: first } } as VendorSpec;
  expect(resolveRef(spec, {}, gitIn(repo)).commit).toBe(first);
  expect(resolveRef(spec, { latest: true }, gitIn(repo)).commit).toBe(head);
});

test("runVendorSync copies, transforms, records, and reports change", () => {
  const repo = gitRepo(); const dest = tmp();
  const marker: Transform = { name: "marker", include: (p) => p.endsWith("SKILL.md"), apply: (t) => `${t}\nPi` };
  const spec: VendorSpec = { repo: `file://${repo}`, refStrategy: { kind: "commit" }, include: [{ from: "plugin/skills", to: "skills" }], transforms: [marker], packageDir: dest };
  expect(runVendorSync(spec, { ref: "HEAD" }).changed).toBe(true);
  expect(readUpstream(dest)!.files["skills/s/SKILL.md"]).toBeTruthy();
  expect(runVendorSync(spec, { ref: "HEAD" }).changed).toBe(false);
});
