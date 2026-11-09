/* Negotiation Gym engine. Pure logic, no DOM, no network.
   Loads in the browser as window.NCGym.engine and in Node via require().

   Scenario shape (see gym/scenarios.js):
     { id, title, domain, counterpart:{name, role}, brief, you:{...},
       scale:{unit, walkaway, target, best},          // outcome units, higher is better for you
       objectives:[{id, label, kind, ...}],
       start, nodes:{ [id]: Node } }
   Node: { say: string | {default, cooperative, firm, evasive},
           choices:[Choice] }   or terminal: { say, outcome:{id, label, value, rapport, summary} }
   Choice: { id, label, tags:[...], rapport:+n, flags:[...], next: id | {default, firm, ...},
             note: coaching note shown in the debrief }
   Behaviors change the counterpart's lines and where a choice leads, so the same move can land
   differently against a cooperative, firm or evasive counterpart. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.NCGym = root.NCGym || {}; root.NCGym.engine = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BEHAVIORS = {
    cooperative: { label: 'Cooperative', blurb: 'Wants a deal and will trade if you give a reason.' },
    firm: { label: 'Firm', blurb: 'Holds the line, tests your resolve, moves only for leverage.' },
    evasive: { label: 'Evasive', blurb: 'Stalls, changes the subject, hopes you drop it.' }
  };

  const TAGS = {
    anchor: 'Opened with a specific, ambitious ask',
    probe: 'Asked a question to learn their constraints',
    evidence: 'Backed the ask with evidence',
    batna: 'Named a credible alternative calmly',
    silence: 'Held silence after an ask',
    reframe: 'Put the problem on their side',
    trade: 'Traded a concession for something back',
    concede: 'Gave ground without getting anything back',
    lock: 'Locked the agreement in writing or with a date',
    hostile: 'Raised the temperature',
    accept_early: 'Accepted before testing for more',
    vague: 'Made a vague ask with no specifics'
  };

  const RUBRIC = [
    { id: 'outcome', label: 'Outcome against your target', max: 40,
      how: 'Full marks at or above target, zero at or below walk-away, a straight line between.' },
    { id: 'objectives', label: 'Objectives met', max: 25,
      how: 'Each scenario objective is worth an equal share of 25.' },
    { id: 'discipline', label: 'Concession discipline', max: 15,
      how: 'Starts at 15. Minus 5 for each concession given with nothing back, minus 5 for accepting before testing. Trades do not cost points.' },
    { id: 'craft', label: 'Craft: anchor, probe, evidence', max: 10,
      how: 'Up to 4 for anchoring with a specific ask, 3 for at least one probing question, 3 for backing the ask with evidence. Minus 2 for each vague ask.' },
    { id: 'relationship', label: 'Relationship', max: 10,
      how: 'Final rapport from -3 to +3 maps to 0 to 10. Each hostile move costs rapport.' }
  ];

  function pick(v, behavior) {
    if (v == null) return v;
    if (typeof v === 'object' && !Array.isArray(v)) return behavior in v ? v[behavior] : v.default;
    return v;
  }

  function isTerminal(node) { return !!(node && node.outcome); }

  function lineFor(scenario, nodeId, behavior) { return pick(scenario.nodes[nodeId].say, behavior); }

  function nextFor(choice, behavior) { return pick(choice.next, behavior); }

  function newRun(scenario, behavior) {
    if (!BEHAVIORS[behavior]) throw new Error('Unknown behavior: ' + behavior);
    return { v: 1, scenarioId: scenario.id, behavior, node: scenario.start, turns: [],
      rapport: 0, flags: [], tags: [], startedAt: null, done: false, outcome: null };
  }

  /* Apply a choice. Returns a new run object; the input is not mutated. */
  function choose(scenario, run, choiceId) {
    if (run.done) throw new Error('Run is already finished');
    const node = scenario.nodes[run.node];
    const choice = (node.choices || []).find(c => c.id === choiceId);
    if (!choice) throw new Error('No choice ' + choiceId + ' at ' + run.node);
    const next = nextFor(choice, run.behavior);
    if (!scenario.nodes[next]) throw new Error('Choice ' + choiceId + ' leads to missing node ' + next);
    const before = bestReachable(scenario, run.node, run.behavior);
    const after = bestReachable(scenario, next, run.behavior);
    const turn = { node: run.node, choice: choice.id, next,
      said: lineFor(scenario, run.node, run.behavior), label: choice.label,
      tags: (choice.tags || []).slice(), rapport: choice.rapport || 0,
      bestBefore: before.value, bestAfter: after.value };
    const out = Object.assign({}, run, {
      node: next,
      turns: run.turns.concat([turn]),
      rapport: clamp(run.rapport + (choice.rapport || 0), -3, 3),
      flags: uniq(run.flags.concat(choice.flags || [])),
      tags: run.tags.concat(choice.tags || [])
    });
    const n = scenario.nodes[next];
    if (isTerminal(n)) {
      out.done = true;
      out.outcome = Object.assign({}, n.outcome, { node: next,
        rapport: clamp(out.rapport + (n.outcome.rapport || 0), -3, 3) });
      out.rapport = out.outcome.rapport;
    }
    return out;
  }

  /* Rebuild a run from a list of choice ids (used for resume and for rewind). */
  function replay(scenario, behavior, choiceIds) {
    let run = newRun(scenario, behavior);
    for (const id of choiceIds) run = choose(scenario, run, id);
    return run;
  }

  /* Best outcome value still reachable from a node under a behavior. Memoized per scenario. */
  const memo = new WeakMap();
  function bestReachable(scenario, nodeId, behavior) {
    let m = memo.get(scenario);
    if (!m) { m = {}; memo.set(scenario, m); }
    const key = behavior + '|' + nodeId;
    if (m[key]) return m[key];
    const seen = new Set();
    const walk = id => {
      const k = behavior + '|' + id;
      if (m[k]) return m[k];
      if (seen.has(id)) throw new Error('Cycle at ' + id + ' in ' + scenario.id);
      seen.add(id);
      const node = scenario.nodes[id];
      if (!node) throw new Error('Missing node ' + id + ' in ' + scenario.id);
      let res;
      if (isTerminal(node)) res = { value: node.outcome.value, outcome: node.outcome.id, path: [] };
      else {
        res = null;
        for (const c of node.choices) {
          const r = walk(nextFor(c, behavior));
          if (!res || r.value > res.value) res = { value: r.value, outcome: r.outcome, path: [c.id].concat(r.path) };
        }
      }
      seen.delete(id);
      m[k] = res;
      return res;
    };
    return walk(nodeId);
  }

  /* All terminal outcomes reachable from start under a behavior. */
  function reachableOutcomes(scenario, behavior) {
    const found = new Map(); const seen = new Set();
    const walk = id => {
      if (seen.has(id)) return; seen.add(id);
      const node = scenario.nodes[id];
      if (isTerminal(node)) { found.set(node.outcome.id, node.outcome); return; }
      node.choices.forEach(c => walk(nextFor(c, behavior)));
    };
    walk(scenario.start);
    return [...found.values()];
  }

  function objectiveMet(obj, run, scenario) {
    const o = run.outcome || {};
    switch (obj.kind) {
      case 'value-at-least': return (o.value || 0) >= obj.value;
      case 'flag': return run.flags.includes(obj.flag);
      case 'tag': return run.tags.includes(obj.tag);
      case 'no-tag': return !run.tags.includes(obj.tag);
      case 'rapport-at-least': return run.rapport >= obj.value;
      case 'not-below-walkaway': return (o.value || 0) >= scenario.scale.walkaway;
      default: throw new Error('Unknown objective kind ' + obj.kind);
    }
  }

  function turnsWith(run, tag) { return run.turns.map((t, i) => t.tags.includes(tag) ? i + 1 : 0).filter(Boolean); }

  /* Transparent score: every criterion returns points, max, and the evidence behind them. */
  function score(scenario, run) {
    if (!run.done) throw new Error('Score a finished run');
    const s = scenario.scale; const o = run.outcome;
    const rows = [];

    let outPts, outWhy;
    if (o.value <= s.walkaway) {
      outPts = 0; outWhy = 'Result ' + fmt(scenario, o.value) + ' is at or below your walk-away of ' + fmt(scenario, s.walkaway) + '.';
    } else {
      const f = Math.min(1, (o.value - s.walkaway) / (s.target - s.walkaway));
      outPts = Math.round(40 * f);
      outWhy = 'Result ' + fmt(scenario, o.value) + ' against target ' + fmt(scenario, s.target) + ' and walk-away ' + fmt(scenario, s.walkaway) + '.';
    }
    rows.push({ id: 'outcome', points: outPts, why: outWhy });

    const objs = scenario.objectives.map(ob => ({ id: ob.id, label: ob.label, met: objectiveMet(ob, run, scenario) }));
    const metN = objs.filter(x => x.met).length;
    rows.push({ id: 'objectives', points: Math.round(25 * metN / objs.length), why: metN + ' of ' + objs.length + ' objectives met.', objectives: objs });

    const conc = turnsWith(run, 'concede'); const early = turnsWith(run, 'accept_early');
    const disc = Math.max(0, 15 - 5 * conc.length - 5 * early.length);
    const dWhy = [];
    if (conc.length) dWhy.push('Gave ground for nothing at turn ' + conc.join(', ') + '.');
    if (early.length) dWhy.push('Accepted before testing at turn ' + early.join(', ') + '.');
    const tr = turnsWith(run, 'trade');
    if (tr.length) dWhy.push('Traded rather than gave at turn ' + tr.join(', ') + '.');
    rows.push({ id: 'discipline', points: disc, why: dWhy.join(' ') || 'No free concessions.' });

    const an = turnsWith(run, 'anchor'), pr = turnsWith(run, 'probe'), ev = turnsWith(run, 'evidence'), vg = turnsWith(run, 'vague');
    const craft = Math.max(0, (an.length ? 4 : 0) + (pr.length ? 3 : 0) + (ev.length ? 3 : 0) - 2 * vg.length);
    const cWhy = [
      an.length ? 'Anchored at turn ' + an[0] + '.' : 'No specific anchor.',
      pr.length ? 'Probed at turn ' + pr.join(', ') + '.' : 'Never asked what was behind their position.',
      ev.length ? 'Used evidence at turn ' + ev.join(', ') + '.' : 'No evidence offered.'
    ];
    if (vg.length) cWhy.push('Vague ask at turn ' + vg.join(', ') + '.');
    rows.push({ id: 'craft', points: Math.min(10, craft), why: cWhy.join(' ') });

    const rel = Math.round((run.rapport + 3) / 6 * 10);
    const ho = turnsWith(run, 'hostile');
    rows.push({ id: 'relationship', points: rel, why: 'Final rapport ' + signed(run.rapport) + ' on a -3 to +3 scale.' + (ho.length ? ' Heat raised at turn ' + ho.join(', ') + '.' : '') });

    const criteria = rows.map(r => Object.assign({}, RUBRIC.find(x => x.id === r.id), r));
    const total = criteria.reduce((a, r) => a + r.points, 0);
    return { total, max: 100, grade: grade(total), criteria };
  }

  function grade(t) { return t >= 85 ? 'Strong' : t >= 65 ? 'Solid' : t >= 45 ? 'Mixed' : 'Rough'; }

  /* Debrief: the turning points, the best line you could have taken, and drills for weak spots. */
  function debrief(scenario, run, drills) {
    const sc = score(scenario, run);
    const turns = run.turns.map((t, i) => {
      const node = scenario.nodes[t.node];
      const choice = node.choices.find(c => c.id === t.choice);
      const best = bestReachable(scenario, t.node, run.behavior);
      const bestChoice = node.choices.find(c => c.id === best.path[0]);
      return Object.assign({}, t, { n: i + 1, swing: t.bestAfter - t.bestBefore, note: choice.note || '',
        bestChoiceId: best.path[0], bestChoiceLabel: bestChoice ? bestChoice.label : null,
        alternatives: node.choices.filter(c => c.id !== t.choice).map(c => ({ id: c.id, label: c.label,
          best: bestReachable(scenario, nextFor(c, run.behavior), run.behavior).value })) });
    });
    // The turning point is the single turn where the best still-possible result moved the most.
    let turning = null;
    turns.forEach(t => { if (t.swing !== 0 && (!turning || Math.abs(t.swing) > Math.abs(turning.swing))) turning = t; });
    const top = bestScoreLine(scenario, run.behavior);
    const bestLine = { total: top.total, choices: top.choices, outcome: top.run.outcome,
      steps: top.run.turns.map(t => ({ said: t.said, label: t.label })) };
    const weak = sc.criteria.filter(c => c.points / c.max < 0.7).map(c => c.id);
    const tagMisses = [];
    if (!run.tags.includes('anchor')) tagMisses.push('anchor');
    if (!run.tags.includes('probe')) tagMisses.push('probe');
    if (run.tags.includes('concede') || run.tags.includes('accept_early')) tagMisses.push('concede');
    if (run.tags.includes('hostile')) tagMisses.push('hostile');
    if (!run.tags.includes('lock') && scenario.objectives.some(o => o.kind === 'flag')) tagMisses.push('lock');
    const recommended = (drills || []).filter(d => d.skills.some(s => weak.includes(s) || tagMisses.includes(s)));
    return { score: sc, turns, turning, bestLine, recommended: recommended.slice(0, 4) };
  }

  /* Every complete line of play under a behavior, as choice-id lists. Scenarios are small DAGs. */
  function allLines(scenario, behavior, limit) {
    const out = []; const max = limit || 5000;
    const walk = (id, path) => {
      if (out.length >= max) return;
      const node = scenario.nodes[id];
      if (isTerminal(node)) { out.push(path); return; }
      node.choices.forEach(c => walk(nextFor(c, behavior), path.concat([c.id])));
    };
    walk(scenario.start, []);
    return out;
  }

  /* The highest-scoring line under the rubric (not just the biggest number), ties to the shorter line. */
  function bestScoreLine(scenario, behavior) {
    let best = null;
    for (const line of allLines(scenario, behavior)) {
      const run = replay(scenario, behavior, line);
      const t = score(scenario, run).total;
      if (!best || t > best.total || (t === best.total && line.length < best.choices.length)) best = { total: t, choices: line, run };
    }
    return best;
  }

  function validateScenario(scenario, drills) {
    const errs = [];
    const ids = Object.keys(scenario.nodes);
    if (!scenario.nodes[scenario.start]) errs.push('start node missing');
    const s = scenario.scale;
    if (!(s && s.walkaway < s.target && s.target <= s.best)) errs.push('scale must satisfy walkaway < target <= best');
    for (const id of ids) {
      const n = scenario.nodes[id];
      if (!n.say) errs.push(id + ': no counterpart line');
      if (isTerminal(n)) continue;
      if (!n.choices || n.choices.length < 2) errs.push(id + ': needs at least two choices');
      for (const c of n.choices || []) {
        for (const b of Object.keys(BEHAVIORS)) {
          const nx = nextFor(c, b);
          if (!scenario.nodes[nx]) errs.push(id + '.' + c.id + ' -> missing ' + nx + ' (' + b + ')');
        }
        for (const t of c.tags || []) if (!TAGS[t]) errs.push(id + '.' + c.id + ': unknown tag ' + t);
        if (!c.note) errs.push(id + '.' + c.id + ': missing coaching note');
      }
    }
    if (errs.length) return errs;
    for (const b of Object.keys(BEHAVIORS)) {
      try { bestReachable(scenario, scenario.start, b); } catch (e) { errs.push(b + ': ' + e.message); continue; }
      const outs = reachableOutcomes(scenario, b);
      if (outs.length < 3) errs.push(b + ': only ' + outs.length + ' distinct outcomes reachable');
    }
    for (const ob of scenario.objectives) {
      if (!['value-at-least', 'flag', 'tag', 'no-tag', 'rapport-at-least', 'not-below-walkaway'].includes(ob.kind)) errs.push('objective ' + ob.id + ': unknown kind');
    }
    if (drills) for (const id of scenario.drills || []) if (!drills.find(d => d.id === id)) errs.push('unknown drill ' + id);
    return errs;
  }

  function fmt(scenario, v) {
    const u = scenario.scale.unit;
    return typeof u === 'function' ? u(v) : v + ' ' + (v === 1 && scenario.scale.unitOne ? scenario.scale.unitOne : u);
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function uniq(a) { return [...new Set(a)]; }
  function signed(n) { return n > 0 ? '+' + n : String(n); }

  /* Persistence helpers: versioned, tolerant of corrupt or missing storage. */
  const STORE_KEY = 'nc-gym-v1';
  function emptyStore() { return { v: 1, active: null, history: [], drills: {} }; }
  function loadStore(storage) {
    try {
      const raw = storage && storage.getItem(STORE_KEY);
      if (!raw) return emptyStore();
      const d = JSON.parse(raw);
      if (!d || d.v !== 1 || !Array.isArray(d.history)) return emptyStore();
      return Object.assign(emptyStore(), d);
    } catch (e) { return emptyStore(); }
  }
  function saveStore(storage, data) {
    try { storage.setItem(STORE_KEY, JSON.stringify(data)); return true; } catch (e) { return false; }
  }
  /* History entries carry a stable id so debrief links survive new rounds being added.
     Entries saved before ids existed are backfilled; returns true if anything changed. */
  function newHistoryId(data) {
    const taken = new Set((data.history || []).map(h => h.id));
    let id; let n = 0;
    do { id = 'r' + Date.now().toString(36) + (n++ ? n.toString(36) : ''); } while (taken.has(id));
    return id;
  }
  function ensureHistoryIds(data) {
    let changed = false;
    (data.history || []).forEach(h => { if (h && !h.id) { h.id = newHistoryId(data); changed = true; } });
    return changed;
  }
  /* Find a history entry by id, or by position for links made before ids existed. */
  function findHistory(data, ref) {
    if (ref == null || ref === '') return null;
    const byId = data.history.find(h => h.id === ref);
    if (byId) return byId;
    return /^\d+$/.test(ref) ? data.history[Number(ref)] || null : null;
  }
  /* Restore an in-progress run from saved choice ids. Returns null if the scenario changed under it. */
  function restoreActive(scenarios, active) {
    if (!active) return null;
    const sc = scenarios.find(s => s.id === active.scenarioId);
    if (!sc || !BEHAVIORS[active.behavior] || !Array.isArray(active.choices)) return null;
    try { return { scenario: sc, run: replay(sc, active.behavior, active.choices) }; } catch (e) { return null; }
  }

  return { BEHAVIORS, TAGS, RUBRIC, newRun, choose, replay, bestReachable, reachableOutcomes,
    score, debrief, validateScenario, allLines, bestScoreLine, lineFor, nextFor, isTerminal, fmt, objectiveMet,
    STORE_KEY, emptyStore, loadStore, saveStore, restoreActive, newHistoryId, ensureHistoryIds, findHistory };
});
