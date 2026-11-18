import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
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
  exclude?: string[];
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

/** Remove each destination root, then copy the source root and any extra files, then delete each excluded path. */
export function copyVendored(
  srcRoot: string,
  packageDir: string,
  include: IncludeEntry[],
  files?: Array<{ from: string; to: string }>,
  exclude: string[] = [],
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
  for (const rel of exclude) {
    fs.rmSync(path.join(packageDir, rel), { recursive: true, force: true });
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

function compareVersions(a: string, b: string): number {
  const [a1, a2, a3] = a.replace(/^v/, "").split(".").map(Number);
  const [b1, b2, b3] = b.replace(/^v/, "").split(".").map(Number);
  return a1 - b1 || a2 - b2 || a3 - b3;
}

/** The highest `vX.Y.Z` tag, or null when there is none. */
export function pickLatestTag(tags: string[]): string | null {
  const semver = tags.filter((tag) => /^v\d+\.\d+\.\d+$/.test(tag));
  if (semver.length === 0) return null;
  semver.sort(compareVersions);
  return semver[semver.length - 1];
}

function lsRemoteTagCommit(runGit: (args: string[]) => string, repo: string, tag: string): string {
  const out = runGit(["ls-remote", "--tags", repo, `refs/tags/${tag}*`]);
  let plain = "";
  let peeled = "";
  for (const line of out.split("\n")) {
    const [sha, ref] = line.trim().split(/\s+/);
    if (!ref) continue;
    if (ref === `refs/tags/${tag}^{}`) peeled = sha;
    else if (ref === `refs/tags/${tag}`) plain = sha;
  }
  const commit = peeled || plain;
  if (!commit) throw new Error(`tag ${tag} not found at ${repo}`);
  return commit;
}

/** Resolve a spec's ref strategy to a `{ ref, commit }` pair using remote queries only. */
export function resolveRef(
  spec: VendorSpec,
  opts: { latest?: boolean; ref?: string },
  runGit: (args: string[]) => string,
): { ref: string; commit: string } {
  const strategy = spec.refStrategy;
  if (strategy.kind === "tag") {
    let ref = opts.ref ?? (opts.latest ? undefined : strategy.tag);
    if (!ref) {
      const out = runGit(["ls-remote", "--tags", "--refs", spec.repo]);
      const tags = out.split("\n").map((line) => line.split("refs/tags/")[1]).filter(Boolean);
      ref = pickLatestTag(tags) ?? undefined;
    }
    if (!ref) throw new Error(`no semver tag at ${spec.repo}`);
    return { ref, commit: lsRemoteTagCommit(runGit, spec.repo, ref) };
  }
  const requested = opts.ref ?? (opts.latest ? undefined : strategy.commit);
  if (requested && /^[0-9a-f]{7,40}$/i.test(requested)) return { ref: requested, commit: requested };
  const commit = requested
    ? runGit(["ls-remote", spec.repo, requested]).split(/\s+/)[0]
    : runGit(["ls-remote", spec.repo, "HEAD"]).split(/\s+/)[0];
  if (!commit) throw new Error(`cannot resolve ${requested ?? "HEAD"} at ${spec.repo}`);
  return { ref: requested ?? commit, commit };
}

/**
 * Fetch the resolved commit, copy the allowlisted subset, apply the transforms,
 * hash the tree, and record `UPSTREAM.json`. Returns whether the tree changed.
 */
export function runVendorSync(
  spec: VendorSpec,
  opts: { latest?: boolean; ref?: string } = {},
): { changed: boolean; ref: string; commit: string } {
  const previous = readUpstream(spec.packageDir);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vendor-sync-"));
  try {
    const git = (args: string[]) => execFileSync("git", args, { cwd: tmp, encoding: "utf8" }).trim();
    const remoteGit = (args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();
    git(["init", "-q"]);
    git(["remote", "add", "origin", spec.repo]);
    const { ref, commit } = resolveRef(spec, opts, remoteGit);
    const symref = remoteGit(["ls-remote", "--symref", spec.repo, "HEAD"]);
    const branch = symref.match(/ref:\s+(\S+)\tHEAD/)?.[1] ?? "HEAD";
    git(["fetch", "-q", "origin", branch]);
    git(["checkout", "-q", commit]);
    copyVendored(tmp, spec.packageDir, spec.include, spec.files, spec.exclude);
    const roots = rootsOf(spec);
    for (const rel of Object.keys(hashTree(spec.packageDir, roots))) {
      const abs = path.join(spec.packageDir, rel);
      const text = fs.readFileSync(abs, "utf8");
      const out = applyTransform(text, rel, spec.transforms);
      if (out !== text) fs.writeFileSync(abs, out);
    }
    const files = hashTree(spec.packageDir, roots);
    const changed = JSON.stringify(previous?.files) !== JSON.stringify(files);
    writeUpstream(spec.packageDir, {
      repo: spec.repo,
      ref,
      commit,
      transforms: spec.transforms.map((transform) => transform.name),
      files,
    });
    return { changed, ref, commit };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
