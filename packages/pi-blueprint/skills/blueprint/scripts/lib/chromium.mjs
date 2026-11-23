// Start Chromium for the scripts, with one error message that names both ways to get one.
// BLUEPRINT_CHROMIUM points at a Chromium already on the machine (a distro build, an offline box);
// otherwise Playwright's own download is used.

export const CHROMIUM_FIX = 'Run npx playwright install chromium, or set BLUEPRINT_CHROMIUM to a Chromium already on this machine (for example BLUEPRINT_CHROMIUM=/usr/bin/chromium-browser).';

// `fallback` is Playwright's launch options when BLUEPRINT_CHROMIUM is not set.
export async function launchChromium(pw, fallback = {}) {
  const exe = process.env.BLUEPRINT_CHROMIUM;
  try {
    return await pw.chromium.launch(exe ? { executablePath: exe } : fallback);
  } catch (e) {
    const why = String(e.message || e).split('\n')[0].replace(/^browserType\.launch:\s*/, '');
    throw new Error(exe
      ? `Could not start Chromium at BLUEPRINT_CHROMIUM=${exe}: ${why}`
      : `Could not start Chromium: ${why}\n${CHROMIUM_FIX}`);
  }
}
