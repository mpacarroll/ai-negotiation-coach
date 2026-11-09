// Unit tests for the Negotiation Gym engine and content. Run: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../gym/engine.js');
const SCENARIOS = require('../gym/scenarios.js');
const DRILLS = require('../gym/drills.js');
const BEHAVIORS = Object.keys(E.BEHAVIORS);
const byId = id => SCENARIOS.find(s => s.id === id);

test('there are at least four complete scenarios', () => {
  assert.ok(SCENARIOS.length >= 4);
  assert.equal(new Set(SCENARIOS.map(s => s.id)).size, SCENARIOS.length);
});

for (const s of SCENARIOS) {
  test(`${s.id}: scenario graph is valid under every behavior`, () => {
    assert.deepEqual(E.validateScenario(s, DRILLS), []);
  });

  test(`${s.id}: every behavior has at least three real alternative outcomes`, () => {
    for (const b of BEHAVIORS) {
      const outs = E.reachableOutcomes(s, b);
      assert.ok(outs.length >= 3, `${b}: ${outs.length}`);
      assert.ok(new Set(outs.map(o => o.value)).size >= 3, `${b}: values not distinct enough`);
    }
  });

  test(`${s.id}: every line of play finishes and scores between 0 and 100`, () => {
    for (const b of BEHAVIORS) {
      for (const line of E.allLines(s, b)) {
        const run = E.replay(s, b, line);
        assert.equal(run.done, true);
        const sc = E.score(s, run);
        assert.ok(sc.total >= 0 && sc.total <= 100, `${line.join('>')}: ${sc.total}`);
        assert.equal(sc.criteria.reduce((a, c) => a + c.max, 0), 100);
        for (const c of sc.criteria) assert.ok(c.points >= 0 && c.points <= c.max && c.why, c.id);
      }
    }
  });

  test(`${s.id}: behavior changes what is possible`, () => {
    const bests = BEHAVIORS.map(b => E.bestScoreLine(s, b).choices.join('>') + '|' + E.reachableOutcomes(s, b).map(o => o.id).sort().join(','));
    assert.ok(new Set(bests).size >= 2, 'all behaviors play identically');
  });

  test(`${s.id}: the best scoring line beats the worst by a wide margin`, () => {
    for (const b of BEHAVIORS) {
      const totals = E.allLines(s, b).map(l => E.score(s, E.replay(s, b, l)).total);
      assert.ok(Math.max(...totals) - Math.min(...totals) >= 40, `${b}: spread too narrow`);
    }
  });
}

test('choose does not mutate the run and records the swing in what is still possible', () => {
  const s = byId('deadline');
  const r0 = E.newRun(s, 'cooperative');
  const r1 = E.choose(s, r0, 'yes');
  assert.equal(r0.turns.length, 0);
  assert.equal(r1.turns[0].bestBefore, 22);
  assert.equal(r1.turns[0].bestAfter, 10);
  assert.equal(r1.done, true);
  assert.equal(r1.outcome.id, 'crunch');
});

test('the same move lands differently against different counterparts', () => {
  const s = byId('deadline');
  const coop = E.replay(s, 'cooperative', ['why', 'phase']);
  const firm = E.replay(s, 'firm', ['why', 'phase']);
  assert.equal(coop.done, true);
  assert.equal(coop.outcome.id, 'phased');
  assert.equal(firm.done, false);
  assert.equal(firm.node, 'firm_phase');
  assert.notEqual(E.lineFor(s, 'why', 'cooperative'), E.lineFor(s, 'why', 'firm'));
});

test('rubric: a model line scores Strong, a fold scores Rough, and evidence is cited by turn', () => {
  const s = byId('deadline');
  const good = E.score(s, E.replay(s, 'cooperative', ['anchor', 'explain', 'plan']));
  assert.equal(good.grade, 'Strong');
  assert.equal(good.criteria.find(c => c.id === 'objectives').points, 25);
  const bad = E.score(s, E.replay(s, 'cooperative', ['yes']));
  assert.equal(bad.grade, 'Rough');
  assert.equal(bad.criteria.find(c => c.id === 'outcome').points, 0);
  assert.match(bad.criteria.find(c => c.id === 'discipline').why, /turn 1/);
});

test('rubric: outcome points are linear between walk-away and target', () => {
  const s = byId('deadline'); // walkaway 14, target 20
  const run = E.replay(s, 'firm', ['why', 'phase', 'trade23']); // 18 days
  const pts = E.score(s, run).criteria.find(c => c.id === 'outcome').points;
  assert.equal(pts, Math.round(40 * (18 - 14) / (20 - 14)));
});

test('rubric: negative-valued scales (days until fixed) score correctly', () => {
  const s = byId('heat');
  const fast = E.replay(s, 'cooperative', ['holdup', 'other', 'text']);
  assert.equal(fast.outcome.value, -2);
  assert.equal(E.fmt(s, fast.outcome.value), '2 days until fixed');
  assert.equal(E.score(s, fast).criteria.find(c => c.id === 'outcome').points, 40);
  const slow = E.replay(s, 'cooperative', ['whenever']);
  assert.equal(E.score(s, slow).criteria.find(c => c.id === 'outcome').points, 0);
});

test('rubric: the best scoring line is not always the biggest number', () => {
  const s = byId('neighbor');
  const biggest = E.bestReachable(s, s.start, 'cooperative');
  const top = E.bestScoreLine(s, 'cooperative');
  assert.equal(biggest.outcome, 'deal_six');
  assert.notEqual(top.run.outcome.id, 'deal_six');
  assert.equal(top.run.outcome.id, 'deal_best');
});

test('debrief finds the turning point and offers alternatives with what they could still reach', () => {
  const s = byId('remote');
  const run = E.replay(s, 'cooperative', ['ask', 'one']);
  const d = E.debrief(s, run, DRILLS);
  assert.equal(d.turning.n, 2);
  assert.equal(d.turning.swing, -1);
  const alt = d.turns[1].alternatives.find(a => a.id === 'need');
  assert.equal(alt.best, 2);
  assert.ok(d.bestLine.total > d.score.total);
  assert.ok(d.bestLine.steps.length > 0);
});

test('debrief recommends drills for the weak spots', () => {
  const s = byId('deadline');
  const d = E.debrief(s, E.replay(s, 'firm', ['rant', 'fold']), DRILLS);
  const ids = d.recommended.map(x => x.id);
  assert.ok(ids.includes('anchor'), ids.join(','));
  assert.ok(ids.includes('trade') || ids.includes('cool'), ids.join(','));
  assert.ok(d.recommended.length <= 4);
});

test('drills are well formed with exactly one correct answer and a free material link', () => {
  for (const d of DRILLS) {
    assert.equal(d.options.filter(o => o.correct).length, 1, d.id);
    assert.ok(d.options.every(o => o.why), d.id);
    assert.match(d.material.href, /^\.\.\/tool\/#(salary|rent|bill)$/, d.id);
  }
});

test('invalid moves are rejected', () => {
  const s = byId('heat');
  assert.throws(() => E.choose(s, E.newRun(s, 'firm'), 'nope'), /No choice/);
  assert.throws(() => E.newRun(s, 'grumpy'), /Unknown behavior/);
  const done = E.replay(s, 'firm', ['whenever']);
  assert.throws(() => E.choose(s, done, 'whenever'), /already finished/);
});

test('validateScenario catches broken links, cycles and thin outcomes', () => {
  const broken = { id: 'x', start: 'a', scale: { unit: 'u', walkaway: 0, target: 1, best: 1 }, objectives: [],
    nodes: { a: { say: 'hi', choices: [{ id: 'c', label: 'l', note: 'n', next: 'missing' }, { id: 'd', label: 'l', note: 'n', next: 'a' }] } } };
  assert.ok(E.validateScenario(broken).some(e => /missing/.test(e)));
  const cyc = { id: 'y', start: 'a', scale: { unit: 'u', walkaway: 0, target: 1, best: 1 }, objectives: [],
    nodes: { a: { say: 'hi', choices: [{ id: 'c', label: 'l', note: 'n', next: 'b' }, { id: 'd', label: 'l', note: 'n', next: 'e' }] },
      b: { say: 'b', choices: [{ id: 'c', label: 'l', note: 'n', next: 'a' }, { id: 'd', label: 'l', note: 'n', next: 'e' }] },
      e: { say: 'e', outcome: { id: 'e', value: 1 } } } };
  assert.ok(E.validateScenario(cyc).some(e => /Cycle/.test(e)));
});

test('persistence: corrupt, missing, or old storage falls back to an empty store', () => {
  const mem = data => ({ getItem: () => data, setItem: () => {} });
  assert.deepEqual(E.loadStore(mem(null)), E.emptyStore());
  assert.deepEqual(E.loadStore(mem('{not json')), E.emptyStore());
  assert.deepEqual(E.loadStore(mem(JSON.stringify({ v: 0, history: [] }))), E.emptyStore());
  assert.deepEqual(E.loadStore({ getItem: () => { throw new Error('blocked'); } }), E.emptyStore());
  assert.equal(E.saveStore({ setItem: () => { throw new Error('quota'); } }, E.emptyStore()), false);
  let saved = null;
  assert.equal(E.saveStore({ setItem: (k, v) => { saved = [k, v]; } }, E.emptyStore()), true);
  assert.equal(saved[0], E.STORE_KEY);
});

test('persistence: an in-progress run restores, and a stale one is dropped', () => {
  const ok = E.restoreActive(SCENARIOS, { scenarioId: 'neighbor', behavior: 'firm', choices: ['hello', 'fit'] });
  assert.equal(ok.run.node, 'react');
  assert.equal(ok.run.turns.length, 2);
  assert.equal(E.restoreActive(SCENARIOS, { scenarioId: 'neighbor', behavior: 'firm', choices: ['gone'] }), null);
  assert.equal(E.restoreActive(SCENARIOS, { scenarioId: 'nope', behavior: 'firm', choices: [] }), null);
  assert.equal(E.restoreActive(SCENARIOS, null), null);
});

test('content stays clear of advice language and house-style violations', () => {
  const text = JSON.stringify(SCENARIOS) + JSON.stringify(DRILLS);
  assert.doesNotMatch(text, /[–—]/, 'no en or em dashes');
  assert.doesNotMatch(text, /!/, 'no exclamation points');
  assert.doesNotMatch(text, /\b(invest|stock|crypto|lawsuit|sue)\b/i);
});
