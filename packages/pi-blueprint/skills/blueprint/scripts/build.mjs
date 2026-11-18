#!/usr/bin/env node
// Turn one or more scene files into a standalone HTML page with the runtime
// inlined, ready to open, host or attach. A scene's `sources` are listed under it.
//
//   node scripts/build.mjs examples/small/cache.js --out cache.html
//   node scripts/build.mjs a.js b.js --out explainers.html --title "How our API works" --play view --paper linen
//   --no-font: use the reader's own monospace font instead of fetching IBM Plex Mono from Google Fonts.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { scriptSafe, esc, httpSources } from './lib/inline.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const USAGE = 'usage: build.mjs scene.js [more.js] [--out page.html] [--title "…"] [--play loop|view|click|still] [--paper blue|linen] [--no-font]';
const VALUED = ['out', 'title', 'play', 'paper'], FLAGS = ['no-font'];
const argv = process.argv.slice(2), files = [], opt = {};
const fail = msg => { console.error(`${msg}\n${USAGE}`); process.exit(2); };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) { files.push(a); continue; }
  const eq = a.indexOf('='), key = a.slice(2, eq < 0 ? undefined : eq);
  if (key === 'help') { console.log(USAGE); process.exit(0); }
  if (FLAGS.includes(key) && eq < 0) { opt[key] = true; continue; }
  if (!VALUED.includes(key)) fail(`unknown option --${key}`);
  if (eq >= 0) opt[key] = a.slice(eq + 1);
  else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) opt[key] = argv[++i];
  else fail(`--${key} needs a value`);
}
if (!files.length) fail('no scene files given');
if (opt.play && !['loop', 'view', 'click', 'still'].includes(opt.play)) fail(`--play must be loop, view, click or still (got "${opt.play}")`);
if (opt.paper && !['blue', 'linen'].includes(opt.paper)) fail(`--paper must be blue or linen (got "${opt.paper}")`);

const runtime = readFileSync(resolve(here, '../runtime/blueprint.js'), 'utf8');
const scenes = files.map(f => {
  const code = readFileSync(resolve(f), 'utf8'), ids = [];
  vm.runInNewContext(code, { BLUEPRINT: { scene: (id, spec) => ids.push([id, spec, f]) } }, { filename: f });
  if (!ids.length) console.warn(`warn: ${f} defines no scene`);
  return { code, ids };
});
// The runtime keeps the last definition of an id, so a repeated id would show that one twice.
const seen = new Map();
for (const s of scenes.flatMap(s => s.ids)) {
  if (seen.has(s[0])) console.warn(`warn: scene "${s[0]}" is defined in ${seen.get(s[0])[2]} and ${s[2]}; the page shows the one from ${s[2]}, once`);
  seen.delete(s[0]); seen.set(s[0], s);
}
const all = [...seen.values()];
if (!all.length) { console.error('no scenes to build'); process.exit(1); }
const title = opt.title || (all.length === 1 ? all[0][1].title || all[0][0] : 'Blueprints');
const play = opt.play || 'loop', paper = opt.paper ? ` paper="${esc(opt.paper)}"` : '';
const sourcesOf = spec => {
  const list = httpSources(spec.sources);
  return list.length ? `<p class="src">Sources: ${list.map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(n)}</a>`).join(', ')}</p>` : '';
};

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
:root{--bg:#eef1f5;--fg:#1c2433;--muted:#5d6676}
@media (prefers-color-scheme:dark){:root{--bg:#0e1622;--fg:#e4ebf5;--muted:#9aa6b8}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 'IBM Plex Mono',ui-monospace,Menlo,monospace}
main{max-width:980px;margin:0 auto;padding:40px max(16px,env(safe-area-inset-right)) 64px max(16px,env(safe-area-inset-left));display:grid;gap:56px}
h1{font-size:20px;letter-spacing:.06em;text-transform:uppercase;margin:0}
h2{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 10px;font-weight:500}
.src{font-size:12.5px;color:var(--muted);margin:10px 0 0}
.src a{color:inherit}
</style></head><body><main>
${all.length > 1 ? `<h1>${esc(title)}</h1>` : ''}
${all.map(([id, s]) => `<section>${all.length > 1 ? `<h2>${esc(s.title || id)}</h2>` : ''}<blueprint-scene scene="${esc(id)}" play="${esc(play)}"${paper}${opt['no-font'] ? ' no-font' : ''} key></blueprint-scene>${sourcesOf(s)}</section>`).join('\n')}
</main>
<script>${scriptSafe(runtime)}</script>
${scenes.map(s => `<script>${scriptSafe(s.code)}</script>`).join('\n')}
</body></html>`;

const out = resolve(opt.out || (all.length === 1 ? `${all[0][0]}.html` : 'blueprints.html'));
writeFileSync(out, html);
console.log(`wrote ${out} (${all.length} scene${all.length > 1 ? 's' : ''}, ${(html.length / 1024).toFixed(0)} KB)`);
