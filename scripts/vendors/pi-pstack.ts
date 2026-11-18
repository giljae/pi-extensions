/**
 * `cursor/plugins` `pstack/` vendoring descriptor.
 *
 * A mirror of `pstack/skills/**` and `pstack/agents/**`, adapted only by the
 * two fail-loud transforms below. The shared core in `scripts/lib/vendor.ts`
 * does the fetch, copy, hashing, and `UPSTREAM.json` work. Never hand-edit the
 * vendored tree.
 */
import type { Transform, VendorSpec } from "../lib/vendor.ts";

const PI_NOTE_MARKER = "read `harness/pi.md`";
const PI_NOTE =
  "> On Pi, read `harness/pi.md` at this package's root before acting, and map " +
  "every Cursor name it lists (`Task`, model slugs, `.cursor` paths) onto Pi.";

const CURSOR_ONLY_KEYS = ["icon", "color", "alwaysApply", "paths"];
const AGENT_PROFILES: Record<string, { tools: string; acceptanceRole: string }> = {
  "poteto-agent": { tools: "read, grep, find, ls, bash, edit, write", acceptanceRole: "writer" },
  "comment-sicko": { tools: "read, grep, find, ls", acceptanceRole: "read-only" },
};
const OPEN = "---\n".length;
const CLOSE = "\n---".length;

function frontmatterEnd(text: string): number {
  if (!text.startsWith("---\n")) throw new Error("missing frontmatter");
  const close = text.indexOf("\n---", 4);
  if (close === -1) throw new Error("unterminated frontmatter");
  return close + "\n---".length;
}

/** Strip Cursor-only frontmatter keys and point every skill at the Pi adapter. */
export const piHostNote: Transform = {
  name: "pi-host-note",
  include: (relPath) => /^skills\/[^/]+\/SKILL\.md$/.test(relPath),
  apply: (text) => {
    if (text.includes(PI_NOTE_MARKER)) throw new Error("Pi note already present");
    const at = frontmatterEnd(text);
    const body = text.slice(OPEN, at - CLOSE);
    const kept = body
      .split("\n")
      .filter((line) => !CURSOR_ONLY_KEYS.some((key) => line.startsWith(`${key}:`)))
      .join("\n");
    const head = `${text.slice(0, OPEN)}${kept}\n---`;
    return `${head}\n\n${PI_NOTE}\n${text.slice(at)}`;
  },
};

/** Convert a Cursor agent file's frontmatter to the pi-subagents schema. */
export const piAgentFrontmatter: Transform = {
  name: "pi-agent-frontmatter",
  include: (relPath) => /^agents\/[^/]+\.md$/.test(relPath),
  apply: (text) => {
    if (text.includes("inheritSkills:")) throw new Error("agent already converted");
    const at = frontmatterEnd(text);
    const body = text.slice(OPEN, at - CLOSE);
    const lines = body.split("\n");
    const nameLine = lines.find((line) => line.startsWith("name:"));
    if (!nameLine) throw new Error("agent has no name");
    const profile = AGENT_PROFILES[nameLine.slice("name:".length).trim()];
    if (!profile) throw new Error(`unknown agent: ${nameLine}`);
    const model = lines.find((line) => line.startsWith("model:"));
    if (model && !model.startsWith("model: claude-")) throw new Error("unexpected model slug");
    const kept = lines.filter(
      (line) => !line.startsWith("is_background:") && !line.startsWith("model:"),
    );
    kept.push("inheritSkills: false");
    if (model) kept.push("thinking: high");
    kept.push(`tools: ${profile.tools}`);
    kept.push(`acceptanceRole: ${profile.acceptanceRole}`);
    const head = `${text.slice(0, OPEN)}${kept.join("\n")}\n---`;
    return `${head}${text.slice(at)}`;
  },
};

const piPstack: VendorSpec = {
  repo: "https://github.com/cursor/plugins",
  refStrategy: { kind: "commit", commit: "93b916d4a1e806507e22f4716b352fa91f2b227e" },
  include: [
    { from: "pstack/skills", to: "skills" },
    { from: "pstack/agents", to: "agents" },
  ],
  exclude: ["skills/statechart/scripts/test"],
  transforms: [piHostNote, piAgentFrontmatter],
  packageDir: "packages/pi-pstack",
};

export default piPstack;
