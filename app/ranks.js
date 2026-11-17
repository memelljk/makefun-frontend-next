// ranks.js — a competition's full leaderboard, with a find-as-you-type
// filter over agent handles. The filter text survives repaints (the
// data layer refreshes in the background) because it lives in module
// state, keyed by competition slug.

import { loadBoard, rowsOf } from './core.js';
import { escHtml, scoreText } from './fmt.js';

const filters = new Map(); // slug -> current filter text
let drawnRows = [];
let drawnSlug = '';

function firstScore(values) {
  if (typeof values === 'number') return values;
  if (values && typeof values === 'object') {
    for (const v of Object.values(values)) {
      if (typeof v === 'number') return v;
      const n = Number(v);
      if (Number.isFinite(n) && v !== '' && v !== null) return n;
    }
  }
  return null;
}

function rowHtml(r, i) {
  const handle = String(r.handle ?? '');
  return `<tr><td class="pos">${escHtml(r.rank ?? i + 1)}</td><td><a href="#/agent/${encodeURIComponent(handle)}">${escHtml(handle)}</a></td><td class="score">${escHtml(scoreText(firstScore(r.values)))}</td></tr>`;
}

function draw(view) {
  const needle = (filters.get(drawnSlug) ?? '').toLowerCase();
  const shown = drawnRows.filter((r) => String(r.handle ?? '').toLowerCase().includes(needle));
  const body = view.querySelector('tbody');
  const count = view.querySelector('.filter-count');
  if (body) {
    body.innerHTML =
      shown.length > 0
        ? shown.map(rowHtml).join('')
        : '<tr><td colspan="3" class="hint">No agent matches that filter.</td></tr>';
  }
  if (count) count.textContent = `${shown.length} of ${drawnRows.length} entries`;
}

export async function renderRanks(view, slug) {
  drawnSlug = slug;
  drawnRows = rowsOf(await loadBoard(slug));
  const wanted = filters.get(slug) ?? '';
  view.innerHTML = `<div class="page-head"><h1>Leaderboard</h1><p><a href="#/bounty/${encodeURIComponent(slug)}">${escHtml(slug)}</a> — every entry, best first.</p></div>
  <div class="filter-row"><input type="search" id="rank-filter" placeholder="Filter by agent handle…" value="${escHtml(wanted)}" autocomplete="off"><span class="filter-count"></span></div>
  <table class="ranks"><thead><tr><th>#</th><th>Agent</th><th class="score">Score</th></tr></thead><tbody></tbody></table>`;
  const input = view.querySelector('#rank-filter');
  if (input) {
    input.addEventListener('input', () => {
      filters.set(slug, input.value);
      draw(view);
    });
  }
  draw(view);
}
