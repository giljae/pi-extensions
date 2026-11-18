/**
 * `intincrab/blueprint` vendoring descriptor.
 *
 * A lean mirror of the skill subset (skill files only, not the upstream
 * marketing site, promo film, or README assets), adapted only by the two
 * fail-loud transforms below. The shared core in `scripts/lib/vendor.ts` does
 * the fetch, copy, hashing, and `UPSTREAM.json` work. Never hand-edit the
 * vendored tree.
 */
import type { Transform, VendorSpec } from "../lib/vendor.ts";

const CMD_ANCHOR = "or types /blueprint [topic].";
const CMD_REPLACEMENT = "or runs `/skill:blueprint` with a topic.";

const PI_NOTE_MARKER = "On Pi, invoke this skill with";
const PI_NOTE =
  "> On Pi, invoke this skill with `/skill:blueprint` (or the `/blueprint` prompt template). The " +
  "installed package is read-only and Playwright is not bundled, so install it in a scratch " +
  "directory and run the scripts with `NODE_PATH=<scratch>/node_modules`: " +
  "`npm i playwright@1.56.1 && npx playwright install chromium`. Linting needs only Node.";

const SKILL_FILE = "skills/blueprint/SKILL.md";

function frontmatterEnd(text: string): number {
  if (!text.startsWith("---\n")) throw new Error("missing frontmatter");
  const close = text.indexOf("\n---", 4);
  if (close === -1) throw new Error("unterminated frontmatter");
  return close + "\n---".length;
}

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/** Point the routing description at the command Pi actually has. */
export const piSkillCommand: Transform = {
  name: "pi-skill-command",
  include: (relPath) => relPath === SKILL_FILE,
  apply: (text) => {
    const matches = count(text, CMD_ANCHOR);
    if (matches !== 1) throw new Error(`command anchor not found or ambiguous (${matches} matches)`);
    return text.replace(CMD_ANCHOR, CMD_REPLACEMENT);
  },
};

/** Note the Pi invocation and the scratch-dir Playwright install. */
export const piHostNote: Transform = {
  name: "pi-host-note",
  include: (relPath) => relPath === SKILL_FILE,
  apply: (text) => {
    if (text.includes(PI_NOTE_MARKER)) throw new Error("Pi note already present");
    const at = frontmatterEnd(text);
    return `${text.slice(0, at)}\n\n${PI_NOTE}\n${text.slice(at)}`;
  },
};

const piBlueprint: VendorSpec = {
  repo: "https://github.com/intincrab/blueprint",
  refStrategy: { kind: "commit", commit: "84b89576f1e4f4e308e12b3eb4cbb37816b8104e" },
  include: [
    { from: "references", to: "skills/blueprint/references" },
    { from: "runtime", to: "skills/blueprint/runtime" },
    { from: "scripts", to: "skills/blueprint/scripts" },
    { from: "templates", to: "skills/blueprint/templates" },
    { from: "examples", to: "skills/blueprint/examples" },
  ],
  files: [
    { from: "SKILL.md", to: "skills/blueprint/SKILL.md" },
    { from: "video/encode.swift", to: "skills/blueprint/video/encode.swift" },
  ],
  transforms: [piSkillCommand, piHostNote],
  packageDir: "packages/pi-blueprint",
};

export default piBlueprint;
