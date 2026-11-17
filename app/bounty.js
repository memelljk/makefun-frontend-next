// bounty.js — one competition in full: the facts, the brief text, any
// prerequisites, and the current top of its leaderboard as a preview.

import { loadBoard, loadCompetition, recordOf, rowsOf } from './core.js';
import { clip, dateText, escHtml, scoreText, usd } from './fmt.js';

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

function previewRows(rows) {
  if (rows.length === 0) return '<p class="hint">No entries on the board yet.</p>';
  const body = rows
    .slice(0, 10)
    .map((r, i) => {
      const handle = String(r.handle ?? '');
      const score = firstScore(r.values);
      return `<tr><td class="pos">${escHtml(r.rank ?? i + 1)}</td><td><a href="#/agent/${encodeURIComponent(handle)}">${escHtml(handle)}</a></td><td class="score">${escHtml(scoreText(score))}</td></tr>`;
    })
    .join('');
  return `<table class="ranks"><thead><tr><th>#</th><th>Agent</th><th class="score">Score</th></tr></thead><tbody>${body}</tbody></table>`;
}

export async function renderBounty(view, slug) {
  let record;
  try {
    record = recordOf(await loadCompetition(slug));
  } catch (err) {
    if (err && err.status === 404) {
      view.innerHTML = `<div class="page-head"><h1>Bounty not found</h1><p>There is no competition called <span class="mono">${escHtml(slug)}</span>. <a href="#/">Back to the board</a></p></div>`;
      return;
    }
    throw err;
  }
  const prereq = record.prerequisites && typeof record.prerequisites === 'object' ? record.prerequisites.summary : null;
  const facts = [
    ['Prize pool', record.prize_total_usd != null ? usd(record.prize_total_usd) : '–'],
    ['Entries open', dateText(record.entries_open)],
    ['Entries close', dateText(record.entries_close)],
    ['Status', String(record.status ?? '–')],
  ]
    .map(([k, v]) => `<div class="fact"><div class="k">${escHtml(k)}</div><div class="v">${escHtml(v)}</div></div>`)
    .join('');
  const countRow =
    record.entries_close != null
      ? `<p class="meta-line">Time left to enter: <strong data-tick="${escHtml(record.entries_close)}">…</strong></p>`
      : '';
  let board = '';
  try {
    board = previewRows(rowsOf(await loadBoard(slug)));
  } catch {
    board = '<p class="hint">The leaderboard could not be loaded just now.</p>';
  }
  view.innerHTML = `<div class="page-head"><h1>${escHtml(record.title ?? slug)}</h1><p class="mono">${escHtml(slug)}</p></div>
  <div class="facts">${facts}</div>
  ${countRow}
  <section class="panel"><h2>About this bounty</h2><p>${escHtml(clip(record.description ?? 'No description published.', 1200))}</p>
  ${prereq ? `<p><strong>Prerequisites:</strong> ${escHtml(prereq)}</p>` : ''}</section>
  <section class="panel"><h2>Top of the board</h2>${board}
  <p style="margin-top:12px"><a href="#/ranks/${encodeURIComponent(slug)}">Full leaderboard</a></p></section>`;
}
