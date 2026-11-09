# Negotiation Coach — "The Negotiation Room"

A free, private negotiation coach. Build your prep sheet (anchor / target / walk-away), get the exact phrases, and rehearse the conversation with any AI before you have it for real — for salary/raises, rent, and bills.

**Live:** mpacarroll.github.io/ai-negotiation-coach/tool/ · **Tool:** `tool/index.html` (self-contained, no account, nothing saved or sent).

Part of Mick Cairn's free tools — *the professionals you can't afford, made free and plain.* General coaching, not legal or financial advice. Not affiliated with any employer.

## The Negotiation Gym (`gym/`)

Branching practice negotiations. Pick a scenario, set the counterpart to cooperative, firm or evasive, and play it out. The debrief gives a transparent 100-point score, the turning point (the turn where the best result still possible moved most), a replay with coaching notes and "try this instead" rewinds, the highest-scoring line, and drills targeted at the weak spots. Runs and drill progress are saved only in the browser's localStorage; a reload mid-round resumes it.

| File | What it holds |
| --- | --- |
| `gym/engine.js` | Pure logic: runs, scoring rubric, best-reachable analysis, debrief, scenario validation, storage helpers |
| `gym/scenarios.js` | Four invented scenarios (deadline, remote days, broken heat, noisy neighbor) |
| `gym/drills.js` | Eight drills, each linked to a tool tab (`tool/#salary`, `#rent`, `#bill`) and a Scripts Pack rule by name |
| `gym/app.js`, `gym/index.html` | The page, hash-routed: `#/`, `#/setup/<id>`, `#/play`, `#/debrief/<n>`, `#/drills`, `#/drill/<id>` |

Try it locally: `python3 -m http.server 8000`, then open http://localhost:8000/gym/.

Tests (no install needed; Playwright is only for the browser test):

```bash
npm test            # node --test tests/*.test.js, engine and content
npm run test:e2e    # Chromium drives the page end to end
```

Adding a scenario: append to `gym/scenarios.js`. `npm test` fails unless every link resolves, the graph has no cycles, every behavior can reach at least three distinct outcomes, every choice has a coaching note, and best and worst lines differ by at least 40 points.

## License
MIT, see [LICENSE](LICENSE).
