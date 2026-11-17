/**
 * Deterministic EGM vendoring sync.
 *
 * Clones a pinned google/elephant-goldfish-model ref, copies an allowlisted
 * subset into a Pi package, applies fixed text transforms, and records the
 * commit and per-file hashes in UPSTREAM.json. Never hand-edit the output.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const UPSTREAM_REPO = "https://github.com/google/elephant-goldfish-model";

const CLAUDE_LINE =
  "In Claude Code or Cowork, read `${CLAUDE_PLUGIN_ROOT}/docs/claude.md` first.";
const PI_LINE = "In Pi, read `../../PI.md` first.";
const DISPATCH_TOKEN = "Codex: `spawn_agent`)";
const DISPATCH_REPLACEMENT = "Codex: `spawn_agent`; Pi: `egm_goldfish`)";

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/** Insert the Pi pointer line after the single Claude routing line. */
export function insertPiPointer(text: string): string {
  if (text.includes(PI_LINE)) throw new Error("Pi pointer already present");
  const matches = count(text, CLAUDE_LINE);
  if (matches !== 1) {
    throw new Error(`Claude anchor not found or ambiguous (${matches} matches)`);
  }
  return text.replace(CLAUDE_LINE, `${CLAUDE_LINE}\n${PI_LINE}`);
}

/** Add the Pi tool name to the reviewer-dispatch enumeration. */
export function appendPiDispatchName(text: string): string {
  const matches = count(text, DISPATCH_TOKEN);
  if (matches === 0) return text;
  if (matches > 1) {
    throw new Error(`Pi dispatch enumeration ambiguous (${matches} matches)`);
  }
  return text.replace(DISPATCH_TOKEN, DISPATCH_REPLACEMENT);
}

function sha256(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function listVendored(packageDir: string): string[] {
  const out: string[] = [];
  const walk = (rel: string) => {
    const abs = path.join(packageDir, rel);
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const child = path.posix.join(rel, entry.name);
      if (entry.isDirectory()) walk(child);
      else out.push(child);
    }
  };
  for (const rel of ["skills", "agents", "resources", "docs"]) walk(rel);
  return out.sort();
}

function hashTree(packageDir: string): Record<string, string> {
  const files: Record<string, string> = {};
  for (const rel of listVendored(packageDir)) {
    files[rel] = sha256(path.join(packageDir, rel));
  }
  return files;
}

function copyDir(from: string, to: string): void {
  fs.cpSync(from, to, { recursive: true });
}

export interface SyncOptions {
  ref: string;
  packageDir: string;
  root?: string;
  check?: boolean;
}

export interface SyncResult {
  changed: boolean;
  commit: string;
}

/** Clone the pinned ref, vendor the allowlisted subset, and record hashes. */
export async function runSync(options: SyncOptions): Promise<SyncResult> {
  const packageDir = path.resolve(options.packageDir);
  const root = path.resolve(options.root ?? path.dirname(packageDir));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "egm-sync-"));
  try {
    execFileSync(
      "git",
      ["clone", "--depth", "1", "--branch", options.ref, "--single-branch", UPSTREAM_REPO, tmp],
      { stdio: "pipe" },
    );
    const commit = execFileSync("git", ["-C", tmp, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();

    const dest = packageDir;
    fs.rmSync(path.join(dest, "skills"), { recursive: true, force: true });
    fs.rmSync(path.join(dest, "agents"), { recursive: true, force: true });
    fs.rmSync(path.join(dest, "resources"), { recursive: true, force: true });
    fs.rmSync(path.join(dest, "docs"), { recursive: true, force: true });
    fs.mkdirSync(dest, { recursive: true });
    copyDir(path.join(tmp, "skills"), path.join(dest, "skills"));
    copyDir(path.join(tmp, "agents"), path.join(dest, "agents"));
    copyDir(path.join(tmp, "resources"), path.join(dest, "resources"));
    fs.mkdirSync(path.join(dest, "docs"), { recursive: true });
    for (const name of ["codex.md", "claude.md"]) {
      fs.copyFileSync(path.join(tmp, "docs", name), path.join(dest, "docs", name));
    }

    for (const skill of fs.readdirSync(path.join(dest, "skills"))) {
      const file = path.join(dest, "skills", skill, "SKILL.md");
      let text = fs.readFileSync(file, "utf8");
      text = appendPiDispatchName(insertPiPointer(text));
      fs.writeFileSync(file, text);
    }

    const files = hashTree(dest);
    const upstreamPath = path.join(dest, "UPSTREAM.json");
    const previous = fs.existsSync(upstreamPath)
      ? (JSON.parse(fs.readFileSync(upstreamPath, "utf8")) as {
          files?: Record<string, string>;
          commit?: string;
        })
      : undefined;
    const changed = JSON.stringify(previous?.files) !== JSON.stringify(files);

    if (options.check) {
      const ok = JSON.stringify(previous?.files) === JSON.stringify(files);
      if (!ok) throw new Error("Vendored tree does not match UPSTREAM.json");
      return { changed: false, commit: previous?.commit ?? commit };
    }

    fs.writeFileSync(
      upstreamPath,
      JSON.stringify(
        {
          repo: UPSTREAM_REPO,
          ref: options.ref,
          commit,
          transforms: ["pi-pointer", "pi-dispatch-name"],
          files,
        },
        null,
        2,
      ) + "\n",
    );
    return { changed, commit };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/** Pick the highest semver tag from the upstream repository. */
export function latestRef(): string {
  const out = execFileSync("git", ["ls-remote", "--tags", "--refs", UPSTREAM_REPO], {
    encoding: "utf8",
  });
  const tags = out
    .split("\n")
    .map((line) => line.split("refs/tags/")[1])
    .filter((tag): tag is string => Boolean(tag) && /^v\d+\.\d+\.\d+$/.test(tag));
  const rank = (tag: string) => tag.slice(1).split(".").map(Number);
  tags.sort((a, b) => {
    const [a1, a2, a3] = rank(a);
    const [b1, b2, b3] = rank(b);
    return a1 - b1 || a2 - b2 || a3 - b3;
  });
  if (tags.length === 0) throw new Error("No semver tags found upstream");
  return tags[tags.length - 1];
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined =>
    args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
  const ref = args.includes("--latest") ? latestRef() : get("--ref");
  if (!ref) throw new Error("Provide --ref <tag> or --latest");
  const result = await runSync({
    ref,
    packageDir: get("--package") ?? "packages/pi-egm",
    check: args.includes("--check"),
  });
  console.log(
    `${args.includes("--check") ? "checked" : result.changed ? "updated" : "unchanged"}: ${ref} (${result.commit})`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
