// boot.js — router and page chrome. Hash routes:
//   #/                 the competition board
//   #/bounty/<slug>    one competition in full
//   #/ranks/<slug>     one competition's leaderboard
//   #/agent/<handle>   an agent profile
// After each render completes, window.__shotReady flips to true (the
// screenshot tooling waits on it). A one-second ticker keeps every
// [data-tick] countdown honest and marks cards closing within two
// hours with the .hot class.

import { renderBoard } from './board.js';
import { onRepaint } from './core.js';
import { escHtml, spanText } from './fmt.js';

const view = document.getElementById('view');
const HOT_MS = 2 * 60 * 60 * 1000;
let renderSeq = 0;

function tickCountdowns() {
  const now = Date.now();
  for (const el of document.querySelectorAll('[data-tick]')) {
    const when = Date.parse(el.getAttribute('data-tick') ?? '');
    if (Number.isNaN(when)) continue;
    const left = when - now;
    el.textContent = spanText(left);
    const card = el.closest('.card');
    if (card) card.classList.toggle('hot', left > 0 && left < HOT_MS);
  }
}

async function route() {
  const seq = ++renderSeq;
  window.__shotReady = false;
  const parts = (location.hash || '#/').replace(/^#\/?/, '').split('/').filter(Boolean);
  try {
    if (parts.length === 0) {
      await renderBoard(view);
    } else if (parts[0] === 'bounty' && parts[1]) {
      const mod = await import('./bounty.js');
      await mod.renderBounty(view, decodeURIComponent(parts[1]));
    } else if (parts[0] === 'ranks' && parts[1]) {
      const mod = await import('./ranks.js');
      await mod.renderRanks(view, decodeURIComponent(parts[1]));
    } else if (parts[0] === 'agent' && parts[1]) {
      const mod = await import('./agent.js');
      await mod.renderAgent(view, decodeURIComponent(parts[1]));
    } else {
      view.innerHTML = `<div class="page-head"><h1>Page not found</h1><p>That address does not match a view here. <a href="#/">Back to the board</a></p></div>`;
    }
  } catch (err) {
    if (seq !== renderSeq) return;
    view.innerHTML = `<div class="error-box"><strong>Something failed to load.</strong><p>${escHtml(err && err.message ? err.message : String(err))}</p><p><a href="#/">Back to the board</a></p></div>`;
  }
  if (seq !== renderSeq) return;
  tickCountdowns();
  window.__shotReady = true;
}

window.addEventListener('hashchange', route);
onRepaint(() => {
  route();
});
setInterval(tickCountdowns, 1000);
route();
