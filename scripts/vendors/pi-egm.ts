/**
 * EGM vendoring descriptor.
 *
 * The vendored subset and the two text transforms. The shared core in
 * `scripts/lib/vendor.ts` does the fetch, copy, hashing, and `UPSTREAM.json`
 * work. Never hand-edit the vendored tree.
 */
import type { Transform, VendorSpec } from "../lib/vendor.ts";

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

const skillFile = (relPath: string): boolean => /^skills\/[^/]+\/SKILL\.md$/.test(relPath);

const transforms: Transform[] = [
  { name: "pi-pointer", include: skillFile, apply: (text) => insertPiPointer(text) },
  { name: "pi-dispatch-name", include: skillFile, apply: (text) => appendPiDispatchName(text) },
];

const piEgm: VendorSpec = {
  repo: UPSTREAM_REPO,
  refStrategy: { kind: "tag" },
  // Only these two upstream docs are vendored; the upstream `docs/` root holds
  // many more files, so the docs are copied as explicit files, not a root.
  include: ["skills", "agents", "resources"],
  files: [
    { from: "docs/codex.md", to: "docs/codex.md" },
    { from: "docs/claude.md", to: "docs/claude.md" },
  ],
  transforms,
  packageDir: "packages/pi-egm",
};

export default piEgm;
