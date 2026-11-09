---
paths: ["gym/**", "tests/**"]
---
# Negotiation Gym

- Scenario values are "higher is better for you". Where real life is lower-is-better (days until a repair), store negatives and format with a unit function (see `heat`).
- `npm test` validates every scenario under every behavior; run it after any content edit.
- Turning point = turn with the largest change in best-reachable outcome value. Best line = highest rubric score, not the biggest number (they differ in `neighbor`).
- Storage key `nc-gym-v1`; bump `v` and keep `loadStore` tolerant if the shape changes. Active runs are saved as choice ids and replayed, so renamed choice ids invalidate saved runs (cleared with a notice).
- Drills link only to the free tool. The paid Scripts Pack is cited by rule or script name, never linked; storefront publication is on hold.
- Content is synthetic, nonfinancial, and not legal advice. No em dashes or exclamation points (a test enforces this).
