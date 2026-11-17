import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

/** A deterministic rewrite of one vendored file. Must throw when its anchor is missing or ambiguous. */
export interface Transform {
  name: string;
  include(relPath: string): boolean;
  apply(text: string, relPath: string): string;
}

export type IncludeEntry = string | { from: string; to: string };

export interface VendorSpec {
  repo: string;
  refStrategy: { kind: "tag"; tag?: string } | { kind: "commit"; commit?: string };
  include: IncludeEntry[];
  files?: Array<{ from: string; to: string }>;
  transforms: Transform[];
  packageDir: string;
}

export interface VendorRecord {
  repo: string;
  ref: string;
  commit: string;
  transforms: string[];
  files: Record<string, string>;
}

const ROOT_EXCLUDES = new Set(["node_modules", "tests", "UPSTREAM.json", ".git"]);

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

/** `"skills"` means copy `skills` to `skills`. */
export function normalizeInclude(entry: IncludeEntry): { from: string; to: string } {
  return typeof entry === "string" ? { from: entry, to: entry } : entry;
}

function hashFile(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function walk(dir: string, rel: string, out: Record<string, string>): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (rel === "" && ROOT_EXCLUDES.has(entry.name)) continue;
    const childRel = rel === "" ? entry.name : `${rel}/${entry.name}`;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, childRel, out);
    else out[childRel] = hashFile(abs);
  }
}

/**
 * Hash the vendored tree under `roots` (POSIX relative paths, sorted keys).
 * An empty `roots` hashes the package root, excluding `node_modules`, `tests`,
 * `UPSTREAM.json`, and `.git`.
 */
export function hashTree(packageDir: string, roots: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(packageDir)) return out;
  if (roots.length === 0) {
    walk(packageDir, "", out);
  } else {
    for (const root of roots) {
      if (root === "") {
        walk(packageDir, "", out);
        continue;
      }
      const abs = path.join(packageDir, root);
      if (!fs.existsSync(abs)) continue;
      if (fs.statSync(abs).isDirectory()) walk(abs, toPosix(root), out);
      else out[toPosix(root)] = hashFile(abs);
    }
  }
  const sorted: Record<string, string> = {};
  for (const key of Object.keys(out).sort()) sorted[key] = out[key];
  return sorted;
}

export function applyTransform(text: string, relPath: string, transforms: Transform[]): string {
  let out = text;
  for (const transform of transforms) {
    if (transform.include(relPath)) out = transform.apply(out, relPath);
  }
  return out;
}

export function readUpstream(packageDir: string): VendorRecord | null {
  const file = path.join(packageDir, "UPSTREAM.json");
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as VendorRecord;
}

export function writeUpstream(packageDir: string, record: VendorRecord): void {
  fs.mkdirSync(packageDir, { recursive: true });
  fs.writeFileSync(path.join(packageDir, "UPSTREAM.json"), `${JSON.stringify(record, null, 2)}\n`);
}

/** Remove each destination root, then copy the source root and any extra files. */
export function copyVendored(
  srcRoot: string,
  packageDir: string,
  include: IncludeEntry[],
  files?: Array<{ from: string; to: string }>,
): void {
  for (const entry of include) {
    const { from, to } = normalizeInclude(entry);
    const dest = path.join(packageDir, to);
    fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(path.join(srcRoot, from), dest, { recursive: true });
  }
  for (const entry of files ?? []) {
    const dest = path.join(packageDir, entry.to);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(srcRoot, entry.from), dest);
  }
}

function rootsOf(spec: VendorSpec): string[] {
  const roots = new Set<string>();
  for (const entry of spec.include) roots.add(normalizeInclude(entry).to);
  for (const entry of spec.files ?? []) {
    const dir = path.posix.dirname(entry.to);
    roots.add(dir === "." ? "" : dir);
  }
  return [...roots];
}

export function checkVendor(spec: VendorSpec): boolean {
  const record = readUpstream(spec.packageDir);
  if (!record) return false;
  const actual = hashTree(spec.packageDir, rootsOf(spec));
  return JSON.stringify(record.files) === JSON.stringify(actual);
}
