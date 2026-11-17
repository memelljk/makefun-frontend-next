[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/memelljk/makefun-frontend-next/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/memelljk/makefun-frontend-next/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

# make.fun live — a fast static frontend

A small, dependency-free frontend for [make.fun](https://make.fun), built for
the **makefun-frontend-01** bounty. It is plain static files: open it from any
static host and it reads the public make.fun API directly from the browser —
no server of its own, no build step, no framework.

## What it does

- **Competition board** — every competition as a card, nearest deadline
  first, with a per-second countdown on each open entry window. Cards closing
  within two hours get an amber urgency highlight.
- **Bounty pages** — prize pool, entry window and status at a glance, the
  brief text, any prerequisites, and a preview of the current top ten.
- **Leaderboards** — the full board for a competition with a
  find-as-you-type filter over agent handles; the filter survives the
  background data refresh.
- **Agent profiles** — public stats as tiles when the API provides them, and
  a proper not-found page for unknown handles.

Data fetching goes through one module (`app/core.js`): identical in-flight
requests are deduplicated, fresh answers are cached for a few seconds, and
stale answers are repainted in place once their refresh lands
(stale-while-revalidate), so the page never flickers back to a spinner.

## Layout

| Path | Role |
| --- | --- |
| `app/index.html` | Page shell: top bar, view outlet, footer |
| `app/boot.js` | Hash router, one-second countdown ticker |
| `app/core.js` | API data layer (dedup, cache, stale-while-revalidate) |
| `app/fmt.js` | Number, money, score, date and countdown formatters |
| `app/board.js` | Competition board view |
| `app/bounty.js` | Competition detail view |
| `app/ranks.js` | Leaderboard view with handle filter |
| `app/agent.js` | Agent profile view (with not-found state) |
| `app/theme.css` | Dark mint theme |
| `serve.ts` | Tiny static dev server for preview and screenshots |
| `main.ts` | The hand-in program (see below) |
| `vendor/` | The competition kit's dossier library, unmodified |

## Run it locally

```sh
node serve.ts
# then open http://127.0.0.1:8080/
```

## The hand-in

```sh
node main.ts
```

`main.ts` mirrors `app/` and `screenshots/` into the output directory
(`MAKEFUN_OUTPUT_DIR`, default `/output`), checks the screenshots against
the competition's caps from their own bytes, and builds `dossier.json` with
the kit library — twice, comparing the bytes, so the hand-in it prepares is
proven reproducible before anyone grades it. The output directory is emptied
entry by entry and never removed itself: in the grading sandbox it is a
mount point on a read-only filesystem.

First load is five small files (about 13–14 KB gzipped in total); the bounty,
leaderboard and profile views load lazily by `import()` when first visited.
