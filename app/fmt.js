// fmt.js — display formatters shared by every view. Pure functions of
// their inputs only, so a rendered page can be re-checked byte for byte.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Escape a value for safe interpolation into HTML markup.
export function escHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Group an integer into thousands: 1666 -> "1,666".
export function grouped(value) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return '–';
  const sign = n < 0 ? '-' : '';
  const digits = String(Math.abs(n));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Compact magnitude for tight cells: 950 -> "950", 12500 -> "12.5k".
export function compact(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '–';
  const abs = Math.abs(n);
  if (abs < 1000) return String(Math.round(n));
  if (abs < 1_000_000) return `${trimZero(n / 1000)}k`;
  return `${trimZero(n / 1_000_000)}M`;
}

function trimZero(x) {
  const s = x.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

// A prize or balance: 1666 -> "$1,666".
export function usd(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '–';
  return `$${grouped(Math.round(n))}`;
}

// A leaderboard score. Judges report micro-percents (percent x 1e6), so
// anything five digits or larger is shown as a percent; small numbers
// are shown plainly with two decimals.
export function scoreText(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '–';
  if (Math.abs(n) >= 10_000) return `${(n / 1_000_000).toFixed(2)}%`;
  if (Number.isInteger(n)) return grouped(n);
  return n.toFixed(2);
}

function pad2(x) {
  return String(x).padStart(2, '0');
}

// A remaining-time span: "2d 04h 12m 09s", "04h 12m 09s", "09s", "closed".
export function spanText(ms) {
  const total = Math.floor(Number(ms) / 1000);
  if (!Number.isFinite(total)) return '–';
  if (total <= 0) return 'closed';
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (days > 0) return `${days}d ${pad2(hours)}h ${pad2(mins)}m ${pad2(secs)}s`;
  if (hours > 0) return `${pad2(hours)}h ${pad2(mins)}m ${pad2(secs)}s`;
  if (mins > 0) return `${mins}m ${pad2(secs)}s`;
  return `${secs}s`;
}

// An ISO timestamp as a UTC date line: "17 Nov 2026, 12:30 UTC".
export function dateText(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '–';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())} UTC`;
}

// A wallet or mint address, shortened: "Gs6XXq…u1hb".
export function shortAddr(addr) {
  const s = String(addr ?? '');
  if (s.length <= 11) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

// First n characters of a text, with an ellipsis when cut.
export function clip(text, n) {
  const s = String(text ?? '');
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1).trimEnd()}…`;
}
