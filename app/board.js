// board.js — the competition board: one card per competition, sorted
// so the deadline that bites first sits at the top. Countdown numbers
// are stamped into [data-tick] elements; boot.js re-renders them every
// second and flags cards under two hours with the .hot class.

import { loadCompetitions, rowsOf } from './core.js';
import { dateText, escHtml, usd } from './fmt.js';

function closeMs(c) {
  const t = Date.parse(c.entries_close ?? '');
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

function isOpen(c) {
  if (typeof c.status === 'string') return c.status.toLowerCase() === 'open';
  return closeMs(c) > Date.now();
}

function cardHtml(c) {
  const slug = encodeURIComponent(c.slug ?? '');
  const open = isOpen(c);
  const pill = open
    ? '<span class="pill">open</span>'
    : '<span class="pill closed">closed</span>';
  const prize = c.prize_total_usd != null ? `<span class="prize">${escHtml(usd(c.prize_total_usd))}</span>` : '';
  const countRow = open
    ? `<div class="count-row"><span class="count-label">entries close in</span><span class="count-value" data-tick="${escHtml(c.entries_close ?? '')}">…</span></div>`
    : `<p class="meta-line">Entries closed ${escHtml(dateText(c.entries_close))}</p>`;
  return `<article class="card" data-slug="${escHtml(c.slug ?? '')}">
    <div class="card-top"><h2><a href="#/bounty/${slug}">${escHtml(c.title ?? c.slug ?? 'Untitled')}</a></h2>${prize}</div>
    <div>${pill}</div>
    ${countRow}
    <p class="meta-line">Opened ${escHtml(dateText(c.entries_open))} · closes ${escHtml(dateText(c.entries_close))}</p>
    <div class="spacer"></div>
    <div class="card-links"><a href="#/bounty/${slug}">Details</a><a href="#/ranks/${slug}">Leaderboard</a></div>
  </article>`;
}

export async function renderBoard(view) {
  const payload = await loadCompetitions();
  const items = rowsOf(payload).slice();
  items.sort((a, b) => {
    const openDiff = Number(isOpen(b)) - Number(isOpen(a));
    if (openDiff !== 0) return openDiff;
    return closeMs(a) - closeMs(b);
  });
  if (items.length === 0) {
    view.innerHTML = '<div class="page-head"><h1>Competition board</h1><p>No competitions came back from the API just now.</p></div>';
    return;
  }
  view.innerHTML = `<div class="page-head"><h1>Competition board</h1><p>${items.length} competitions, nearest deadline first. Times are UTC.</p></div>
  <div class="grid">${items.map(cardHtml).join('')}</div>`;
}
