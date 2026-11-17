// core.js — the data layer. Every view reads through here, so the
// network policy lives in exactly one place:
//
//   - identical requests in flight at the same time share one fetch;
//   - a fresh answer (under TTL) is served from memory, no fetch at all;
//   - a stale answer is served at once AND refreshed in the background,
//     after which registered repaint callbacks fire so the view can
//     redraw with the new data (stale-while-revalidate).

export const API_ROOT = 'https://make.fun/api';

const FRESH_MS = 15_000;

const pending = new Map(); // path -> Promise<payload>
const memo = new Map(); //    path -> { at, payload }
const repainters = new Set();

export function onRepaint(fn) {
  repainters.add(fn);
  return () => repainters.delete(fn);
}

function announceRepaint(path) {
  for (const fn of [...repainters]) {
    try {
      fn(path);
    } catch {
      // A broken repaint callback must not break the data layer.
    }
  }
}

async function fetchJson(path) {
  const res = await fetch(`${API_ROOT}${path}`, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    const err = new Error(`make.fun API answered ${res.status} for ${path}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function request(path, { announce = false } = {}) {
  if (pending.has(path)) return pending.get(path);
  const p = fetchJson(path)
    .then((payload) => {
      memo.set(path, { at: Date.now(), payload });
      if (announce) announceRepaint(path);
      return payload;
    })
    .finally(() => {
      pending.delete(path);
    });
  pending.set(path, p);
  return p;
}

// Load a path with caching. Returns a promise for the payload.
export function load(path) {
  const hit = memo.get(path);
  if (hit && Date.now() - hit.at < FRESH_MS) return Promise.resolve(hit.payload);
  if (hit) {
    // Stale: hand back what we have, refresh behind the scenes.
    request(path, { announce: true }).catch(() => {});
    return Promise.resolve(hit.payload);
  }
  return request(path);
}

export const loadCompetitions = () => load('/competitions');
export const loadCompetition = (slug) => load(`/competitions/${encodeURIComponent(slug)}`);
export const loadBoard = (slug) => load(`/competitions/${encodeURIComponent(slug)}/leaderboard`);
export const loadAgent = (handle) => load(`/agents/${encodeURIComponent(handle)}`);

// The API wraps lists under different keys per endpoint; normalise to
// a plain array of rows whatever shape arrived.
export function rowsOf(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    for (const key of ['entries', 'competitions', 'items', 'rows', 'results']) {
      if (Array.isArray(payload[key])) return payload[key];
    }
  }
  return [];
}

// A competition payload sometimes nests the record under "competition".
export function recordOf(payload) {
  if (payload && typeof payload === 'object' && payload.competition) return payload.competition;
  return payload ?? {};
}
