// Helpers for pasting code and data into an HTML page.
//
// The HTML parser ends a <script> at the first "</script" whatever JavaScript thinks it is (a
// string, a regex, a comment), and "<!--" followed by "<script" changes where it ends. So a
// caption that says "</script>" would cut the page in half. Escaping both keeps the meaning:
// "<\/" is "</" in a string, a regex and a template, and is harmless in a comment; "\x3C" is "<"
// in a string, a template and a regex (including /u regexes, which reject "\!").

/** Source code (the runtime, a scene file) made safe to put between <script> and </script>. */
export const scriptSafe = code => String(code).replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '\\x3C!--');

/** A value as a JavaScript literal for an inline <script>: JSON with every "<" escaped. */
export const jsonScript = value => JSON.stringify(value).replace(/</g, '\\u003c');

/** Text for HTML content and double-quoted attributes. */
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** The scene's `sources` ([[name, url], …]) kept to well-formed http(s) links. */
export function httpSources(sources) {
  if (!Array.isArray(sources)) return [];
  return sources.flatMap(s => {
    const [name, url] = Array.isArray(s) ? s : [s && s.name, s && s.url];
    try { const u = new URL(String(url)); return /^https?:$/.test(u.protocol) && name ? [[String(name), u.href]] : []; }
    catch { return []; }
  });
}
