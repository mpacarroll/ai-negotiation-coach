// Unit tests for Gym progress and round comparison. Run: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../gym/engine.js');
const P = require('../gym/progress.js');
const SCENARIOS = require('../gym/scenarios.js');
const DRILLS = require('../gym/drills.js');
const byId = id => SCENARIOS.find(s => s.id === id);

// Deterministic fixtures: real lines through the deadline scenario against a firm counterpart.
const FOLD = { id: 'r1', scenarioId: 'deadline', behavior: 'firm', choices: ['anchor', 'twelve'], at: 1 };
const TRADE = { id: 'r2', scenarioId: 'deadline', behavior: 'firm', choices: ['anchor', 'silence', 'trade15'], at: 2 };
const EARLY = { id: 'r3', scenarioId: 'deadline', behavior: 'cooperative', choices: ['yes'], at: 3 };
const scoreOf = h => E.score(byId(h.scenarioId), E.replay(byId(h.scenarioId), h.behavior, h.choices)).total;

test('empty history: nothing played, nothing cleared, first challenge is the starter scenario', () => {
  const p = P.progress(SCENARIOS, [], DRILLS, {});
  assert.equal(p.rounds, 0);
  assert.equal(p.skipped, 0);
  assert.equal(p.clearedCells, 0);
  assert.equal(p.totalCells, SCENARIOS.length * Object.keys(E.BEHAVIORS).length);
  assert.equal(p.ladder[0].difficulty, 'Starter');
  assert.deepEqual(p.next.round && [p.next.round.scenarioId, p.next.round.behavior], [p.ladder[0].id, 'cooperative']);
  assert.equal(p.next.drill, undefined);
  p.criteria.forEach(c => assert.equal(c.recentPct, null));
});

test('ladder is ordered by difficulty and keeps the best score per scenario and counterpart', () => {
  const p = P.progress(SCENARIOS, [TRADE, FOLD], DRILLS, {});
  const rank = ['Starter', 'Intermediate', 'Advanced'];
  const order = p.ladder.map(r => rank.indexOf(r.difficulty));
  assert.deepEqual(order, order.slice().sort((a, b) => a - b));
  const cell = p.ladder.find(r => r.id === 'deadline').cells.find(c => c.behavior === 'firm');
  assert.equal(cell.tries, 2);
  assert.equal(cell.best, Math.max(scoreOf(TRADE), scoreOf(FOLD)));
  assert.equal(cell.bestId, 'r2');
  assert.equal(cell.ceiling, E.bestScoreLine(byId('deadline'), 'firm').total);
  assert.ok(cell.best <= cell.ceiling);
});

test('a cell whose ceiling is below the clear bar clears at its ceiling', () => {
  const p = P.progress(SCENARIOS, [], DRILLS, {});
  const low = p.ladder.flatMap(r => r.cells.map(c => ({ row: r.id, ...c }))).filter(c => c.ceiling < P.CLEAR);
  assert.ok(low.length >= 1, 'fixture assumption: at least one hard cell exists (heat vs evasive)');
  for (const c of low) {
    assert.equal(c.clearAt, c.ceiling);
    const s = byId(c.row);
    const top = E.bestScoreLine(s, c.behavior);
    const q = P.progress(SCENARIOS, [{ id: 'x', scenarioId: c.row, behavior: c.behavior, choices: top.choices, at: 1 }], DRILLS, {});
    assert.equal(q.ladder.find(r => r.id === c.row).cells.find(k => k.behavior === c.behavior).cleared, true);
  }
});

test('playing the best line everywhere clears every cell and leaves no next round', () => {
  const hist = [];
  for (const s of SCENARIOS) for (const b of Object.keys(E.BEHAVIORS)) hist.push({ id: s.id + b, scenarioId: s.id, behavior: b, choices: E.bestScoreLine(s, b).choices, at: 1 });
  const p = P.progress(SCENARIOS, hist, DRILLS, {});
  assert.equal(p.clearedCells, p.totalCells);
  assert.equal(p.next.round, undefined);
  assert.equal(p.costly.filter(h => h.share >= 40).length, 0);
});

test('habits count rounds, not moves, and point at a drill that trains them', () => {
  const p = P.progress(SCENARIOS, [EARLY, FOLD, TRADE], DRILLS, {});
  const concede = p.costly.find(h => h.tag === 'concede');
  assert.equal(concede.rounds, 2); // EARLY and FOLD
  assert.equal(concede.share, 67);
  assert.ok(concede.drill.skills.includes('concede'));
  assert.equal(p.costly.find(h => h.tag === 'accept_early').rounds, 1);
  assert.equal(p.strong.find(h => h.tag === 'silence').rounds, 1);
  assert.equal(p.next.drill.id, concede.drill.id);
  assert.match(p.next.why, /67%/);
});

test('next step flags a drill already done so the page can say so', () => {
  const p = P.progress(SCENARIOS, [EARLY, FOLD], DRILLS, { trade: { done: true } });
  assert.equal(p.next.drill.id, 'trade');
  assert.equal(p.next.drillDone, true);
});

test('skill trends compare the last five rounds with the five before', () => {
  const weak = Array.from({ length: 5 }, (_, i) => ({ ...FOLD, id: 'w' + i }));
  const strong = Array.from({ length: 5 }, (_, i) => ({ ...TRADE, id: 's' + i }));
  const p = P.progress(SCENARIOS, strong.concat(weak), DRILLS, {}); // newest first: strong rounds are recent
  const outcome = p.criteria.find(c => c.id === 'outcome');
  assert.ok(outcome.recentPct > outcome.priorPct);
  assert.equal(outcome.trend, 'up');
  const craft = p.criteria.find(c => c.id === 'craft');
  assert.equal(craft.trend, 'flat');
  const q = P.progress(SCENARIOS, weak.concat(strong), DRILLS, {});
  assert.equal(q.criteria.find(c => c.id === 'outcome').trend, 'down');
});

test('rounds that no longer replay are skipped, never guessed', () => {
  const p = P.progress(SCENARIOS, [FOLD, { id: 'g', scenarioId: 'deadline', behavior: 'firm', choices: ['removed'] },
    { id: 'h', scenarioId: 'gone', behavior: 'firm', choices: [] }, { id: 'i', scenarioId: 'deadline', behavior: 'weird', choices: [] },
    { id: 'j', scenarioId: 'deadline', behavior: 'firm', choices: ['anchor'] }, null], DRILLS, {});
  assert.equal(p.rounds, 1);
  assert.equal(p.skipped, 5);
});

test('compare: finds the split turn and the rubric differences', () => {
  const c = P.compareRuns(byId('deadline'), FOLD, TRADE);
  assert.equal(c.sameBehavior, true);
  assert.equal(c.identical, false);
  assert.equal(c.split, 1);
  assert.equal(c.shared.length, 1);
  assert.match(c.headline, /match for 1 turn, then split at turn 2/);
  assert.equal(c.a.turns[0].n, 2);
  assert.equal(c.a.turns.length, 1);
  assert.equal(c.b.turns.length, 2);
  assert.equal(c.delta, scoreOf(TRADE) - scoreOf(FOLD));
  assert.ok(c.delta > 0);
  assert.equal(c.rows.reduce((a, r) => a + r.delta, 0), c.delta);
  assert.equal(c.gained[0].id, 'outcome');
  assert.equal(c.lost.length, 0);
});

test('compare: identical lines, different counterparts, and a first-move split', () => {
  const s = byId('deadline');
  const same = P.compareRuns(s, FOLD, { ...FOLD, id: 'again' });
  assert.equal(same.identical, true);
  assert.equal(same.delta, 0);
  assert.match(same.headline, /exactly the same line/);
  // Same first move, different counterpart: the counterpart's reply differs, so nothing is shared after it.
  const cross = P.compareRuns(s, FOLD, { ...FOLD, behavior: 'cooperative', choices: ['anchor', 'twelve'] });
  assert.equal(cross.sameBehavior, false);
  assert.equal(cross.split, 1);
  const first = P.compareRuns(s, EARLY, { ...EARLY, choices: ['why', 'phase'] });
  assert.equal(first.split, 0);
  assert.match(first.headline, /very first move/);
});

test('compare: unfinished or broken rounds are rejected', () => {
  const s = byId('deadline');
  assert.throws(() => P.compareRuns(s, FOLD, { ...FOLD, choices: ['anchor'] }), /finished/);
  assert.throws(() => P.compareRuns(s, FOLD, { ...FOLD, choices: ['nope'] }));
});
