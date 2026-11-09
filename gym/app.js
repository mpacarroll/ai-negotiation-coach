/* Negotiation Gym UI. Hash routes:
   #/                     scenario picker, resume, history
   #/setup/<id>           brief, objectives, counterpart behavior, rubric
   #/play                 the live run (state lives in the store, so a reload resumes)
   #/debrief/<n>          debrief of history entry n (0 is the newest)
   #/drills, #/drill/<id> targeted drills */
(function () {
  'use strict';
  const { engine: E, scenarios: SCENARIOS, drills: DRILLS } = window.NCGym;
  const app = document.getElementById('app');
  const HISTORY_MAX = 50;

  let storage = null;
  try { storage = window.localStorage; storage.setItem('nc-gym-probe', '1'); storage.removeItem('nc-gym-probe'); } catch (e) { storage = null; }
  let store = E.loadStore(storage);
  // `notice` is persistent (storage blocked); `flash` shows on the next rendered page only.
  const notice = storage ? '' : 'This browser is blocking storage, so runs will not be saved after you close the tab. Everything else works.';
  let flash = '';
  if (E.ensureHistoryIds(store)) save();

  function save() {
    if (!storage) return;
    if (!E.saveStore(storage, store)) flash = 'Could not save progress in this browser (storage full or blocked). Your current run still works.';
  }

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const scen = id => SCENARIOS.find(s => s.id === id);
  const drill = id => DRILLS.find(d => d.id === id);
  const go = h => { if (location.hash === h) render(); else location.hash = h; };

  function noticeHtml() {
    const msgs = [notice, flash].filter(Boolean);
    flash = '';
    return msgs.map(m => `<p class="notice" role="status">${esc(m)}</p>`).join('');
  }
  const STALE = 'A saved run could not be restored because the scenario changed. It has been cleared.';

  /* ---------- home ---------- */
  function bestFor(id) {
    const runs = store.history.filter(h => h.scenarioId === id);
    return runs.length ? Math.max(...runs.map(r => r.total)) : null;
  }

  function home() {
    const active = E.restoreActive(SCENARIOS, store.active);
    if (store.active && !active) { store.active = null; save(); flash = STALE; }
    const cards = SCENARIOS.map(s => {
      const best = bestFor(s.id);
      return `<article class="card" data-scenario="${esc(s.id)}">
        <div class="row"><span class="tag">${esc(s.domain)}</span><span class="tag ochre">${esc(s.difficulty)}</span></div>
        <h3>${esc(s.title)}</h3>
        <p class="small muted">With ${esc(s.counterpart.name)}, ${esc(s.counterpart.role)}.</p>
        <p class="small">${esc(s.brief)}</p>
        <p class="small muted">${best == null ? 'Not tried yet.' : 'Your best: ' + best + ' / 100'}</p>
        <a class="btn small" href="#/setup/${esc(s.id)}">Set up this round</a>
      </article>`;
    }).join('');
    const hist = store.history.slice(0, 8).map(h => {
      const s = scen(h.scenarioId); if (!s) return '';
      return `<li><a href="#/debrief/${esc(h.id)}">${esc(s.title)}</a> <span class="muted small">vs ${esc(E.BEHAVIORS[h.behavior].label.toLowerCase())}, ${h.total}/100 ${esc(h.grade)}, ${esc(new Date(h.at).toLocaleDateString())}</span></li>`;
    }).join('');
    app.innerHTML = `
      <header class="intro">
        <h1>The Negotiation Gym</h1>
        <p class="lede">Practice the hard conversation before you have it. Pick a scenario, set how the other side behaves, and play it out. Afterwards you get a transparent score, a replay of where the conversation turned, and short drills for the moves that cost you.</p>
      </header>
      ${noticeHtml()}
      ${active ? `<div class="notice" id="resume"><b>Round in progress:</b> ${esc(active.scenario.title)} vs a ${esc(E.BEHAVIORS[active.run.behavior].label.toLowerCase())} counterpart, turn ${active.run.turns.length + 1}.
        <div class="row" style="margin-top:8px"><a class="btn small" href="#/play">Resume</a><button class="btn ghost small" data-act="discard">Discard it</button></div></div>` : ''}
      <h2>Scenarios</h2>
      <div class="cards">${cards}</div>
      <h2>Your recent rounds</h2>
      ${hist ? `<ul class="plain" id="history">${hist}</ul><button class="btn ghost small" data-act="clear">Clear my history</button>` : '<p class="muted">Nothing yet. Rounds you finish show up here, saved only in this browser.</p>'}
      <h2>How scoring works</h2>
      ${rubricHtml()}
    `;
    on('[data-act=discard]', () => { store.active = null; save(); render(); });
    on('[data-act=clear]', () => { if (confirm('Clear all saved rounds and drill progress from this browser?')) { store = E.emptyStore(); save(); render(); } });
  }

  function rubricHtml() {
    return `<table class="rubric"><thead><tr><th>Criterion</th><th>Points</th><th>How it is scored</th></tr></thead><tbody>${
      E.RUBRIC.map(r => `<tr><td>${esc(r.label)}</td><td class="pts">${r.max}</td><td class="small">${esc(r.how)}</td></tr>`).join('')
    }</tbody></table>`;
  }

  /* ---------- setup ---------- */
  function setup(id) {
    const s = scen(id); if (!s) return notFound();
    const last = store.history.find(h => h.scenarioId === id);
    const pick = last ? last.behavior : 'cooperative';
    app.innerHTML = `
      <header class="intro"><span class="tag">${esc(s.domain)}</span>
        <h1>${esc(s.title)}</h1>
        <p class="lede">${esc(s.brief)}</p></header>
      ${noticeHtml()}
      <div class="layout">
        <div>
          <h2>Your numbers</h2>
          <ul class="plain">
            <li><b>Anchor:</b> ${esc(s.you.anchor)}</li>
            <li><b>Target:</b> ${esc(s.you.target)}</li>
            <li><b>Walk-away:</b> ${esc(s.you.walkaway)}</li>
          </ul>
          <h2>Objectives</h2>
          <ul class="plain obj">${s.objectives.map(o => `<li>${esc(o.label)}</li>`).join('')}</ul>
          <form id="setup-form">
            <fieldset><legend>How should ${esc(s.counterpart.name)} behave?</legend>
              ${Object.entries(E.BEHAVIORS).map(([k, b]) => `<label class="choice-b"><input type="radio" name="behavior" value="${k}" ${k === pick ? 'checked' : ''}><span><b>${esc(b.label)}</b><br><span class="small muted">${esc(b.blurb)}</span></span></label>`).join('')}
            </fieldset>
            <div class="row"><button class="btn" type="submit">Start the conversation</button><a href="#/" class="small">Back to scenarios</a></div>
          </form>
        </div>
        <aside>
          <h2>Scoring</h2>
          <p class="small muted">The same rubric applies to every round, and every point in your debrief says where it came from.</p>
          ${rubricHtml()}
          <h3>Drills for this one</h3>
          <ul class="plain">${(s.drills || []).map(d => `<li><a href="#/drill/${esc(d)}">${esc(drill(d).title)}</a></li>`).join('')}</ul>
        </aside>
      </div>`;
    document.getElementById('setup-form').onsubmit = e => {
      e.preventDefault();
      const behavior = new FormData(e.target).get('behavior');
      store.active = { scenarioId: s.id, behavior, choices: [], startedAt: Date.now() };
      save(); go('#/play');
    };
  }

  /* ---------- play ---------- */
  function play() {
    const restored = E.restoreActive(SCENARIOS, store.active);
    if (!restored) { if (store.active) flash = STALE; store.active = null; save(); return go('#/'); }
    const { scenario: s, run } = restored;
    if (run.done) return finish(s, run);
    const chat = run.turns.map(t => `<div class="msg them"><span class="who">${esc(s.counterpart.name)}</span>${esc(t.said)}</div><div class="msg you"><span class="who">You</span>${esc(t.label)}</div>`).join('');
    const node = s.nodes[run.node];
    app.innerHTML = `
      <header class="intro"><span class="tag">Turn ${run.turns.length + 1}</span> <span class="tag ochre">${esc(E.BEHAVIORS[run.behavior].label)} counterpart</span>
        <h1>${esc(s.title)}</h1></header>
      ${noticeHtml()}
      <div class="layout">
        <div>
          <div class="chat" id="chat">${chat}<div class="msg them" id="current"><span class="who">${esc(s.counterpart.name)}, ${esc(s.counterpart.role)}</span>${esc(E.lineFor(s, run.node, run.behavior))}</div></div>
          <h3>Your move</h3>
          <div class="moves">${node.choices.map(c => `<button class="move" data-choice="${esc(c.id)}">${esc(c.label)}</button>`).join('')}</div>
          <div class="row" style="margin-top:16px">
            ${run.turns.length ? '<button class="btn ghost small" data-act="undo">Take back my last move</button>' : ''}
            <button class="btn ghost small" data-act="restart">Restart this round</button>
            <a class="small" href="#/">Pause and go back</a>
          </div>
        </div>
        <aside class="card">
          <h3>Objectives</h3>
          <ul class="plain obj">${s.objectives.map(o => `<li>${esc(o.label)}</li>`).join('')}</ul>
          <h3>Your numbers</h3>
          <ul class="plain small"><li><b>Anchor:</b> ${esc(s.you.anchor)}</li><li><b>Target:</b> ${esc(s.you.target)}</li><li><b>Walk-away:</b> ${esc(s.you.walkaway)}</li></ul>
        </aside>
      </div>`;
    app.querySelectorAll('[data-choice]').forEach(b => b.onclick = () => {
      try {
        const next = E.choose(s, run, b.dataset.choice);
        store.active.choices.push(b.dataset.choice); save();
        if (next.done) finish(s, next); else render();
      } catch (err) { failure(err); }
    });
    on('[data-act=undo]', () => { store.active.choices.pop(); save(); render(); });
    on('[data-act=restart]', () => { store.active.choices = []; save(); render(); });
  }

  function finish(s, run) {
    const sc = E.score(s, run);
    const id = E.newHistoryId(store);
    store.history.unshift({ id, scenarioId: s.id, behavior: run.behavior, choices: run.turns.map(t => t.choice),
      total: sc.total, grade: sc.grade, outcomeId: run.outcome.id, at: Date.now() });
    store.history = store.history.slice(0, HISTORY_MAX);
    store.active = null; save();
    go('#/debrief/' + id);
  }

  /* ---------- debrief ---------- */
  function debrief(ref) {
    const h = E.findHistory(store, ref);
    const s = h && scen(h.scenarioId);
    if (!s) return notFound('That round is not in this browser\'s history.');
    let run;
    try { run = E.replay(s, h.behavior, h.choices); } catch (err) { return notFound('That round no longer matches the current scenario, so it cannot be replayed.'); }
    const d = E.debrief(s, run, DRILLS);
    const o = run.outcome;
    const fmt = v => E.fmt(s, v);
    const objs = d.score.criteria.find(c => c.id === 'objectives').objectives;
    const timeline = d.turns.map((t, i) => {
      const isTP = d.turning && d.turning.n === t.n;
      const swing = t.swing === 0 ? '<span class="swing muted">Best still possible unchanged: ' + esc(fmt(t.bestAfter)) + '</span>'
        : `<span class="swing ${t.swing < 0 ? 'down' : 'up'}">Best still possible: ${esc(fmt(t.bestBefore))} &rarr; ${esc(fmt(t.bestAfter))}</span>`;
      return `<li class="${isTP ? 'turn-pt' : ''}" data-turn="${t.n}">
        <div class="row"><b>Turn ${t.n}</b>${isTP ? '<span class="tag ochre">Turning point</span>' : ''}${t.tags.map(g => `<span class="tag" title="${esc(E.TAGS[g])}">${esc(g.replace('_', ' '))}</span>`).join('')}</div>
        <p class="small muted" style="margin:.3em 0">${esc(s.counterpart.name)}: "${esc(t.said)}"</p>
        <p style="margin:.2em 0"><b>You:</b> ${esc(t.label)}</p>
        ${swing}
        <p class="small" style="margin:.4em 0">${esc(t.note)}</p>
        <details><summary class="small">Other moves here</summary><ul class="alts">${t.alternatives.map(a => `<li><span>${esc(a.label)} <span class="muted">(best reachable: ${esc(fmt(a.best))})</span></span><button class="btn ghost small" data-rewind="${i}" data-alt="${esc(a.id)}">Try this instead</button></li>`).join('')}</ul></details>
      </li>`;
    }).join('');
    const tp = d.turning;
    app.innerHTML = `
      <header class="intro"><span class="tag">Debrief</span> <span class="tag ochre">${esc(E.BEHAVIORS[run.behavior].label)} counterpart</span>
        <h1>${esc(s.title)}</h1>
        <p class="lede"><b>${esc(o.label)}.</b> ${esc(o.summary)} Result: ${esc(fmt(o.value))}.</p></header>
      ${noticeHtml()}
      <div class="layout">
        <div>
          <div class="card score" id="score"><span class="big">${d.score.total}</span><span>/ 100</span><span class="tag">${esc(d.score.grade)}</span>
            <span class="small muted">Best possible against this counterpart: ${d.bestLine.total}</span></div>
          ${tp ? `<p class="notice"><b>Where it turned:</b> turn ${tp.n}. Before it, the best still possible was ${esc(fmt(tp.bestBefore))}; after it, ${esc(fmt(tp.bestAfter))}.${tp.swing < 0 && tp.bestChoiceLabel ? ' The stronger move was: "' + esc(tp.bestChoiceLabel) + '"' : ''}</p>`
            : '<p class="notice"><b>No turning point:</b> you kept the best result in reach the whole way.</p>'}
          <h2>Replay</h2>
          <ol class="timeline" id="timeline">${timeline}</ol>
          <details id="best-line"><summary>Show the highest-scoring line (${d.bestLine.total}/100)</summary>
            <ol>${d.bestLine.steps.map(st => `<li class="small"><span class="muted">"${esc(st.said)}"</span><br><b>${esc(st.label)}</b></li>`).join('')}</ol>
            <p class="small">Ends: ${esc(d.bestLine.outcome.label)}, ${esc(fmt(d.bestLine.outcome.value))}.</p></details>
        </div>
        <aside>
          <h2>Score breakdown</h2>
          <table class="rubric" id="rubric"><tbody>${d.score.criteria.map(c => `<tr><td><b>${esc(c.label)}</b><div class="bar"><i style="width:${Math.round(100 * c.points / c.max)}%"></i></div><span class="small muted">${esc(c.why)}</span></td><td class="pts">${c.points}/${c.max}</td></tr>`).join('')}</tbody></table>
          <h3>Objectives</h3>
          <ul class="plain obj">${objs.map(x => `<li class="${x.met ? 'met' : 'miss'}">${esc(x.label)}</li>`).join('')}</ul>
          <h2>Drills for you</h2>
          ${d.recommended.length ? `<ul class="plain" id="recommended">${d.recommended.map(r => `<li><a href="#/drill/${esc(r.id)}">${esc(r.title)}</a>${store.drills[r.id] ? ' <span class="small muted">(done)</span>' : ''}<br><span class="small muted">${esc(r.pack)}</span></li>`).join('')}</ul>` : '<p class="small">Nothing weak enough to drill. Try a tougher counterpart.</p>'}
          <h2>Go again</h2>
          <div class="row">${Object.keys(E.BEHAVIORS).map(b => `<button class="btn ${b === run.behavior ? '' : 'ghost'} small" data-again="${b}">${b === run.behavior ? 'Same counterpart' : 'vs ' + esc(E.BEHAVIORS[b].label.toLowerCase())}</button>`).join('')}</div>
          <p><button class="btn ghost small" data-act="copy">Copy this debrief as text</button> <span class="small muted" id="copy-msg" role="status"></span></p>
          <p><a href="#/">All scenarios</a></p>
        </aside>
      </div>`;
    app.querySelectorAll('[data-rewind]').forEach(b => b.onclick = () => {
      const keep = h.choices.slice(0, Number(b.dataset.rewind));
      store.active = { scenarioId: s.id, behavior: h.behavior, choices: keep.concat([b.dataset.alt]), startedAt: Date.now(), rewoundFrom: h.id };
      const r = E.restoreActive(SCENARIOS, store.active);
      if (!r) { store.active = null; save(); return failure(new Error('Could not rebuild the round from that point.')); }
      save();
      if (r.run.done) finish(s, r.run); else go('#/play');
    });
    app.querySelectorAll('[data-again]').forEach(b => b.onclick = () => {
      store.active = { scenarioId: s.id, behavior: b.dataset.again, choices: [], startedAt: Date.now() }; save(); go('#/play');
    });
    on('[data-act=copy]', () => {
      const text = debriefText(s, run, d);
      const msg = document.getElementById('copy-msg');
      const done = () => { msg.textContent = 'Copied.'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => { msg.textContent = 'Copy blocked by the browser.'; });
      else msg.textContent = 'Copy is not available in this browser.';
    });
  }

  function debriefText(s, run, d) {
    const fmt = v => E.fmt(s, v);
    const lines = [`Negotiation Gym debrief: ${s.title} (${E.BEHAVIORS[run.behavior].label} counterpart)`,
      `Result: ${run.outcome.label}, ${fmt(run.outcome.value)}. Score ${d.score.total}/100 (${d.score.grade}).`, ''];
    d.score.criteria.forEach(c => lines.push(`${c.label}: ${c.points}/${c.max}. ${c.why}`));
    lines.push('');
    d.turns.forEach(t => lines.push(`Turn ${t.n}${d.turning && d.turning.n === t.n ? ' (turning point)' : ''}: ${t.label} [best still possible ${fmt(t.bestBefore)} -> ${fmt(t.bestAfter)}] ${t.note}`));
    if (d.recommended.length) { lines.push('', 'Drills: ' + d.recommended.map(r => r.title).join('; ')); }
    return lines.join('\n');
  }

  /* ---------- drills ---------- */
  function drills() {
    app.innerHTML = `
      <header class="intro"><h1>Drills</h1><p class="lede">Two-minute reps for the moves that decide most negotiations. Each one links to the free prep tool and the matching Scripts Pack rule.</p></header>
      ${noticeHtml()}
      <div class="cards">${DRILLS.map(d => `<article class="card" data-drill="${esc(d.id)}"><h3>${esc(d.title)}</h3><p class="small muted">${esc(d.pack)}</p><p class="small">${store.drills[d.id] ? (store.drills[d.id].correct ? 'Done, first try.' : 'Done.') : 'Not done yet.'}</p><a class="btn small" href="#/drill/${esc(d.id)}">Start</a></article>`).join('')}</div>`;
  }

  function drillPage(id) {
    const d = drill(id); if (!d) return notFound();
    app.innerHTML = `
      <header class="intro"><span class="tag">Drill</span><h1>${esc(d.title)}</h1><p class="lede">${esc(d.prompt)}</p></header>
      <div class="layout"><div id="drill">
        ${d.options.map((o, i) => `<button class="opt" data-opt="${i}">${esc(o.text)}</button>`).join('')}
        <div id="feedback" role="status"></div>
      </div>
      <aside class="card"><h3>Keep going</h3>
        <p class="small"><a href="${esc(d.material.href)}">${esc(d.material.label)}</a> in the free Negotiation Room.</p>
        <p class="small muted">${esc(d.pack)}</p>
        <p><a href="#/drills">All drills</a> &middot; <a href="#/">Scenarios</a></p></aside></div>`;
    let first = true;
    app.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => {
      const o = d.options[Number(b.dataset.opt)];
      b.classList.add(o.correct ? 'right' : 'wrong');
      const fb = document.getElementById('feedback');
      fb.innerHTML = `<p class="notice"><b>${o.correct ? 'Yes.' : 'Not quite.'}</b> ${esc(o.why)}</p>` +
        (o.correct ? `<p><b>Practice:</b> ${esc(d.practice)}</p>` : '');
      if (o.correct) {
        app.querySelectorAll('[data-opt]').forEach(x => { x.disabled = true; });
        store.drills[d.id] = { done: true, correct: first, at: Date.now() }; save();
      }
      first = false;
    });
  }

  /* ---------- failure paths ---------- */
  function notFound(msg) {
    app.innerHTML = `<header class="intro"><h1>Not found</h1><p class="lede">${esc(msg || 'That page does not exist.')}</p></header><p><a class="btn" href="#/">Back to scenarios</a></p>`;
  }
  function failure(err) {
    app.innerHTML = `<header class="intro"><h1>Something went wrong</h1><p class="lede">The round hit an error and could not continue: ${esc(err && err.message)}</p></header>
      <div class="row"><button class="btn" data-act="reset">Start over</button><a href="#/">Back to scenarios</a></div>`;
    on('[data-act=reset]', () => { store.active = null; save(); go('#/'); });
  }

  function on(sel, fn) { const el = app.querySelector(sel); if (el) el.onclick = fn; }

  function render() {
    const parts = (location.hash.replace(/^#\/?/, '') || '').split('/');
    try {
      switch (parts[0]) {
        case '': home(); break;
        case 'setup': setup(parts[1]); break;
        case 'play': play(); break;
        case 'debrief': debrief(parts[1]); break;
        case 'drills': drills(); break;
        case 'drill': drillPage(parts[1]); break;
        default: notFound();
      }
    } catch (err) { failure(err); }
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', render);
  render();
})();
