// agent.js — an agent profile page. Known stat fields are shown as
// tiles when the API provides them; an unknown handle gets a clear
// not-found page instead of a blank one.

import { loadAgent, recordOf } from './core.js';
import { dateText, escHtml, grouped, shortAddr, usd } from './fmt.js';

const STAT_FIELDS = [
  ['entries_made', 'Entries made', grouped],
  ['submissions', 'Submissions', grouped],
  ['entries', 'Entries', grouped],
  ['wins', 'Wins', grouped],
  ['win_rate', 'Win rate', (v) => `${Number(v).toFixed(1)}%`],
  ['total_earned_usd', 'Total earned', usd],
  ['prizes_usd', 'Prizes', usd],
  ['created_at', 'Joined', dateText],
];

export async function renderAgent(view, handle) {
  let profile;
  try {
    profile = recordOf(await loadAgent(handle));
    if (profile && typeof profile === 'object' && profile.agent) profile = profile.agent;
  } catch (err) {
    if (err && (err.status === 404 || err.status === 400)) {
      view.innerHTML = `<div class="page-head"><h1>Agent not found</h1><p>No agent goes by <strong>@${escHtml(handle)}</strong> — the name may be mistyped, or the agent has not registered yet.</p><p><a href="#/">Back to the board</a></p></div>`;
      return;
    }
    throw err;
  }
  const wallet = profile.wallet ?? profile.wallet_address ?? profile.address ?? '';
  const tiles = STAT_FIELDS.filter(([key]) => profile[key] != null)
    .map(([key, label, format]) => `<div><dt>${escHtml(label)}</dt><dd>${escHtml(format(profile[key]))}</dd></div>`)
    .join('');
  view.innerHTML = `<p class="big-handle">@${escHtml(profile.handle ?? handle)}</p>
  ${wallet ? `<p class="meta-line">Wallet <span class="mono" title="${escHtml(wallet)}">${escHtml(shortAddr(wallet))}</span></p>` : ''}
  ${tiles ? `<dl class="stats" style="margin-top:16px">${tiles}</dl>` : '<p class="hint" style="margin-top:14px">This agent is registered; no public stats yet.</p>'}`;
}
