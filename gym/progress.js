/* Negotiation Gym progress and comparison. Pure logic, no DOM, no network.
   Loads in the browser as window.NCGym.progress (after engine.js) and in Node via require().

   Everything here is derived by replaying saved rounds (scenario id, behavior, choice ids) through
   the engine, so the numbers always match what the debrief shows. Rounds that no longer replay
   (a scenario changed under them) are counted as skipped, never guessed at. */
(function (root, factory) {
  const engine = (typeof module === 'object' && module.exports) ? require('./engine.js') : root.NCGym.engine;
  const api = factory(engine);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.NCGym.progress = api; }
})(typeof self !== 'undefined' ? self : this, function (E) {
  'use strict';

  const BEHAVIOR_ORDER = Object.keys(E.BEHAVIORS);
  const DIFFICULTY_ORDER = ['Starter', 'Intermediate', 'Advanced'];
  const CLEAR = 65; // "Solid" or better clears a ladder cell, or the cell's ceiling when that is lower
  const WINDOW = 5; // rounds per trend window

  // Habits that cost points, and habits that earn them. Each maps to the drill that trains it.
  const COSTLY = ['concede', 'accept_early', 'hostile', 'vague'];
  const STRONG = ['anchor', 'probe', 'evidence', 'trade', 'lock', 'silence'];

  /* Replay saved history entries (newest first). Returns { rounds, skipped }. */
  function replayHistory(scenarios, history) {
    const rounds = []; let skipped = 0;
    for (const h of history || []) {
      const s = h && scenarios.find(x => x.id === h.scenarioId);
      if (!s || !E.BEHAVIORS[h.behavior] || !Array.isArray(h.choices)) { skipped++; continue; }
      try {
        const run = E.replay(s, h.behavior, h.choices);
        if (!run.done) { skipped++; continue; }
        rounds.push({ entry: h, scenario: s, run, score: E.score(s, run) });
      } catch (e) { skipped++; }
    }
    return { rounds, skipped };
  }

  function pct(points, max) { return max ? Math.round(100 * points / max) : 0; }
  function avg(a) { return a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null; }

  function drillFor(drills, skill) { return (drills || []).find(d => d.skills.includes(skill)) || null; }

  /* The ladder: best score for every scenario against every counterpart behavior. */
  function ladder(scenarios, rounds) {
    const rank = d => { const i = DIFFICULTY_ORDER.indexOf(d); return i < 0 ? DIFFICULTY_ORDER.length : i; };
    const sorted = scenarios.slice().sort((a, b) => rank(a.difficulty) - rank(b.difficulty));
    return sorted.map(s => ({ id: s.id, title: s.title, difficulty: s.difficulty,
      cells: BEHAVIOR_ORDER.map(b => {
        const mine = rounds.filter(r => r.scenario.id === s.id && r.run.behavior === b);
        const best = mine.length ? Math.max(...mine.map(r => r.score.total)) : null;
        const top = mine.length ? mine.reduce((x, y) => y.score.total > x.score.total ? y : x) : null;
        const ceiling = E.bestScoreLine(s, b).total;
        return { behavior: b, tries: mine.length, best, ceiling, clearAt: Math.min(CLEAR, ceiling),
          cleared: best != null && best >= Math.min(CLEAR, ceiling), bestId: top ? top.entry.id : null };
      }) }));
  }

  /* Per-criterion average share of points: the most recent WINDOW rounds against the WINDOW before. */
  function criteria(rounds) {
    const recent = rounds.slice(0, WINDOW), prior = rounds.slice(WINDOW, 2 * WINDOW);
    return E.RUBRIC.map(r => {
      const share = list => avg(list.map(x => { const c = x.score.criteria.find(k => k.id === r.id); return pct(c.points, c.max); }));
      const now = share(recent), before = share(prior);
      const delta = now == null || before == null ? null : now - before;
      return { id: r.id, label: r.label, max: r.max, recentPct: now, priorPct: before, delta,
        trend: delta == null ? null : delta >= 5 ? 'up' : delta <= -5 ? 'down' : 'flat' };
    });
  }

  /* How often each habit shows up across rounds (a round counts once per habit). */
  function habits(rounds, tags, drills) {
    const n = rounds.length;
    return tags.map(tag => {
      const hit = rounds.filter(r => r.run.tags.includes(tag));
      return { tag, label: E.TAGS[tag], rounds: hit.length, share: n ? Math.round(100 * hit.length / n) : 0,
        scenarios: [...new Set(hit.map(r => r.scenario.title))], drill: drillFor(drills, tag) };
    });
  }

  /* One concrete next step: drill the weakest recent criterion, then take the next uncleared cell. */
  function nextStep(lad, crit, costly, drills, doneDrills) {
    const out = {};
    const worstHabit = costly.filter(h => h.rounds > 0 && h.drill).sort((a, b) => b.share - a.share)[0];
    const weakest = crit.filter(c => c.recentPct != null).sort((a, b) => a.recentPct - b.recentPct)[0];
    if (worstHabit && worstHabit.share >= 40) {
      out.drill = worstHabit.drill;
      out.why = '"' + worstHabit.label + '" showed up in ' + worstHabit.share + '% of your rounds.';
    } else if (weakest && weakest.recentPct < 70) {
      const d = drillFor(drills, weakest.id);
      if (d) { out.drill = d; out.why = 'Your weakest area lately is ' + weakest.label.toLowerCase() + ' (' + weakest.recentPct + '% of the points).'; }
    }
    if (out.drill && doneDrills && doneDrills[out.drill.id]) out.drillDone = true;
    for (const row of lad) {
      const cell = row.cells.find(c => !c.cleared);
      if (cell) { out.round = { scenarioId: row.id, title: row.title, behavior: cell.behavior, best: cell.best, tries: cell.tries }; break; }
    }
    return out;
  }

  function progress(scenarios, history, drills, doneDrills) {
    const { rounds, skipped } = replayHistory(scenarios, history);
    const lad = ladder(scenarios, rounds);
    const crit = criteria(rounds);
    const costly = habits(rounds, COSTLY, drills);
    const strong = habits(rounds, STRONG, drills);
    const cells = lad.reduce((a, r) => a.concat(r.cells), []);
    return { rounds: rounds.length, skipped, ladder: lad, clearedCells: cells.filter(c => c.cleared).length,
      totalCells: cells.length, criteria: crit, costly, strong,
      next: nextStep(lad, crit, costly, drills, doneDrills), clearAt: CLEAR, window: WINDOW };
  }

  /* Compare two rounds of the same scenario. Finds where the lines split, the outcome and rubric
     differences, and which side scored more on each criterion. Throws if they cannot be compared. */
  function compareRuns(scenario, a, b) {
    const ra = E.replay(scenario, a.behavior, a.choices), rb = E.replay(scenario, b.behavior, b.choices);
    if (!ra.done || !rb.done) throw new Error('Both rounds must be finished to compare them');
    const sa = E.score(scenario, ra), sb = E.score(scenario, rb);
    const same = a.behavior === b.behavior;
    let split = 0;
    // Shared opening only counts while both the move and the counterpart's line match.
    while (split < ra.turns.length && split < rb.turns.length &&
      ra.turns[split].choice === rb.turns[split].choice && ra.turns[split].said === rb.turns[split].said) split++;
    const identical = same && split === ra.turns.length && split === rb.turns.length;
    const side = (run, sc) => ({ behavior: run.behavior, outcome: run.outcome, total: sc.total, grade: sc.grade,
      turns: run.turns.slice(split).map((t, i) => ({ n: split + i + 1, said: t.said, label: t.label, tags: t.tags,
        bestBefore: t.bestBefore, bestAfter: t.bestAfter })) });
    const rows = sa.criteria.map(c => { const o = sb.criteria.find(x => x.id === c.id);
      return { id: c.id, label: c.label, max: c.max, a: c.points, b: o.points, delta: o.points - c.points }; });
    let headline;
    if (identical) headline = 'These two rounds took exactly the same line.';
    else if (!same && split === 0) headline = 'Different counterparts, so the conversation differed from the first line.';
    else if (split === 0) headline = 'The rounds split on your very first move.';
    else headline = 'The rounds match for ' + split + ' turn' + (split === 1 ? '' : 's') + ', then split at turn ' + (split + 1) + '.';
    const gained = rows.filter(r => r.delta > 0).sort((x, y) => y.delta - x.delta);
    const lost = rows.filter(r => r.delta < 0).sort((x, y) => x.delta - y.delta);
    return { sameBehavior: same, identical, split, shared: ra.turns.slice(0, split).map(t => ({ said: t.said, label: t.label })),
      a: side(ra, sa), b: side(rb, sb), rows, delta: sb.total - sa.total, headline, gained, lost };
  }

  return { progress, compareRuns, replayHistory, CLEAR, WINDOW, COSTLY, STRONG };
});
