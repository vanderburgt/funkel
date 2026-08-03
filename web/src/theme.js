// Theme resolution: 'auto' follows the system, 'light'/'dark' pin it.
// The preference mirrors to localStorage so index.html can apply it before
// the first paint, and to the server settings so it follows the account.

const KEY = 'funkel.theme';

export function themePref() {
  try { return localStorage.getItem(KEY) || 'auto'; } catch { return 'auto'; }
}

export function applyTheme(pref) {
  try { localStorage.setItem(KEY, pref); } catch { /* private mode */ }
  resolve();
}

function resolve() {
  const pref = themePref();
  const dark = pref === 'dark' ||
    (pref === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const color = dark ? '#161310' : '#F3EFE6';
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', color));
}

window.matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', () => { if (themePref() === 'auto') resolve(); });

resolve();
