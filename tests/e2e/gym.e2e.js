// Browser test for the Negotiation Gym. Serves the repo on a local port, drives Chromium.
// Run: node tests/e2e/gym.e2e.js   (set SHOTS=dir to save screenshots)
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png' };
const SHOTS = process.env.SHOTS;

function serve() {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(0, () => r(srv)));
}

const steps = [];
let firstDebrief = null;
async function step(name, fn) {
  try { await fn(); steps.push(['ok', name]); console.log('ok   ' + name); }
  catch (e) { steps.push(['FAIL', name]); console.log('FAIL ' + name + '\n     ' + e.message); }
}

(async () => {
  const srv = await serve();
  const base = `http://localhost:${srv.address().port}`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const shot = async name => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: true }); } };

  await step('home lists four scenarios and the rubric', async () => {
    await page.goto(base + '/gym/');
    assert.equal(await page.locator('[data-scenario]').count(), 4);
    assert.equal(await page.locator('table.rubric tbody tr').count(), 5);
    await shot('01-home');
  });

  await step('setup shows objectives and lets you pick a firm counterpart', async () => {
    await page.click('[data-scenario=deadline] a');
    await page.waitForSelector('#setup-form');
    assert.equal(await page.locator('.obj li').count(), 3);
    await page.check('input[value=firm]');
    await shot('02-setup');
    await page.click('#setup-form button[type=submit]');
    await page.waitForSelector('#current');
    assert.match(await page.textContent('#current'), /ten working days/);
  });

  await step('the firm counterpart answers differently, and a reload resumes the round', async () => {
    await page.click('[data-choice=why]');
    await page.waitForFunction(() => document.querySelector('#current').textContent.includes('The date is the date'));
    await page.reload();
    await page.waitForSelector('#current');
    assert.match(await page.textContent('#current'), /The date is the date/);
    assert.equal(await page.locator('.msg.you').count(), 1);
    await shot('03-play');
  });

  await step('take back a move, then finish on a weak line', async () => {
    await page.click('[data-act=undo]');
    await page.waitForFunction(() => document.querySelectorAll('.msg.you').length === 0);
    await page.click('[data-choice=anchor]');
    await page.click('[data-choice=twelve]');
    await page.waitForSelector('#score');
  });

  await step('debrief shows score breakdown, turning point, replay and drills', async () => {
    assert.match(page.url(), /#\/debrief\/r[0-9a-z]+$/);
    firstDebrief = page.url();
    assert.equal(await page.locator('#rubric tr').count(), 5);
    assert.equal(await page.locator('#timeline > li').count(), 2);
    assert.equal(await page.locator('li.turn-pt').count(), 1);
    assert.match(await page.textContent('li.turn-pt'), /Turn 2/);
    assert.ok(await page.locator('#recommended li').count() >= 1);
    await page.click('li.turn-pt summary');
    await shot('04-debrief');
  });

  await step('rewind from the turning point with a different move and get a better result', async () => {
    const before = Number(await page.textContent('#score .big'));
    await page.click('li.turn-pt [data-alt=silence]');
    await page.waitForSelector('[data-choice=trade15]');
    await page.click('[data-choice=trade15]');
    await page.waitForSelector('#score');
    const after = Number(await page.textContent('#score .big'));
    assert.ok(after > before, `${after} should beat ${before}`);
  });

  await step('history keeps both rounds after a reload', async () => {
    await page.goto(base + '/gym/#/');
    await page.reload();
    assert.equal(await page.locator('#history li').count(), 2);
    assert.match(await page.textContent('[data-scenario=deadline]'), /Your best: \d+/);
  });

  await step('a debrief link still opens the same round after newer rounds are added', async () => {
    await page.goto(firstDebrief);
    await page.waitForSelector('#score');
    assert.equal(await page.locator('#timeline > li').count(), 2);
    assert.match(await page.textContent('#timeline'), /Fine, twelve/);
  });

  await step('a debrief offers a comparison with the earlier round, which shows where they split', async () => {
    assert.equal(await page.locator('#compare-list li').count(), 1);
    await page.click('#compare-list a');
    await page.waitForSelector('#cmp-rubric');
    assert.match(page.url(), /#\/compare\/r[0-9a-z]+\/r[0-9a-z]+$/);
    assert.match(await page.textContent('#cmp-headline'), /match for 1 turn, then split at turn 2/);
    assert.match(await page.textContent('#cmp-headline'), /Round B scored \d+ more/);
    assert.equal(await page.locator('#cmp-rubric tbody tr').count(), 6);
    assert.match(await page.textContent('#cmp-a'), /Fine, twelve/);
    assert.match(await page.textContent('#cmp-b'), /Fifteen works/);
    await shot('07-compare');
  });

  await step('compare refuses rounds that do not exist', async () => {
    await page.goto(base + '/gym/#/compare/nope/also-nope');
    assert.match(await page.textContent('h1'), /Not found/);
  });

  await step('progress shows the ladder, skill trends, costly habits and a next step', async () => {
    await page.goto(base + '/gym/#/');
    await page.click('a[href="#/progress"].btn');
    await page.waitForSelector('#ladder');
    assert.equal(await page.locator('#ladder tbody tr').count(), 4);
    const cell = page.locator('[data-row=deadline] td[data-behavior=firm]');
    assert.match(await cell.textContent(), /\d+ \/ \d+/);
    assert.match(await cell.getAttribute('class'), /cleared|tried/);
    assert.match(await page.textContent('[data-row=deadline] td[data-behavior=evasive]'), /Not tried/);
    assert.equal(await page.locator('#skills tr').count(), 5);
    assert.match(await page.textContent('#costly'), /Gave ground without getting anything back/);
    assert.match(await page.textContent('#next-step'), /Next challenge/);
    await shot('08-progress');
  });

  await step('a ladder score opens its debrief, and an empty cell preselects that counterpart', async () => {
    await page.click('[data-row=deadline] td[data-behavior=firm] a');
    await page.waitForSelector('#score');
    await page.goto(base + '/gym/#/progress');
    await page.click('[data-row=deadline] td[data-behavior=evasive] a');
    await page.waitForSelector('#setup-form');
    assert.equal(await page.isChecked('input[value=evasive]'), true);
  });

  await step('the next step button starts the suggested round', async () => {
    await page.goto(base + '/gym/#/progress');
    const want = await page.getAttribute('#next-step [data-start]', 'data-behavior');
    await page.click('#next-step [data-start]');
    await page.waitForSelector('#current');
    assert.match(await page.textContent('header.intro'), new RegExp(want, 'i'));
    await page.click('[data-act=restart]');
    await page.goto(base + '/gym/#/');
    await page.click('#resume [data-act=discard]');
  });

  await step('a drill gives feedback, records completion, and links to the tool tab', async () => {
    await page.goto(base + '/gym/#/drill/anchor');
    await page.click('[data-opt="0"]');
    assert.match(await page.textContent('#feedback'), /Not quite/);
    await page.click('[data-opt="1"]');
    assert.match(await page.textContent('#feedback'), /Practice/);
    await page.goto(base + '/gym/#/drills');
    assert.match(await page.textContent('[data-drill=anchor]'), /Done\./);
    await shot('05-drills');
    await page.goto(base + '/tool/#rent');
    assert.equal(await page.getAttribute('.tab[data-t=rent]', 'aria-selected'), 'true');
    assert.ok(await page.isVisible('#rent'));
  });

  await step('corrupt storage recovers to a clean home page', async () => {
    await page.goto(base + '/gym/');
    await page.evaluate(() => localStorage.setItem('nc-gym-v1', '{broken'));
    await page.reload();
    assert.equal(await page.locator('[data-scenario]').count(), 4);
    assert.equal(await page.locator('#history').count(), 0);
  });

  await step('a stale in-progress round is cleared with a notice', async () => {
    await page.evaluate(() => localStorage.setItem('nc-gym-v1', JSON.stringify({ v: 1, history: [], drills: {}, active: { scenarioId: 'heat', behavior: 'firm', choices: ['removed-move'] } })));
    await page.reload();
    assert.match(await page.textContent('.notice'), /could not be restored/);
    assert.equal(await page.locator('#resume').count(), 0);
    await page.goto(base + '/gym/#/drills');
    assert.equal(await page.locator('.notice').count(), 0, 'one-off notice does not follow you around');
  });

  await step('opening the play page with a stale round explains why you landed home', async () => {
    await page.evaluate(() => localStorage.setItem('nc-gym-v1', JSON.stringify({ v: 1, history: [], drills: {}, active: { scenarioId: 'heat', behavior: 'firm', choices: ['removed-move'] } })));
    await page.goto('about:blank');
    await page.goto(base + '/gym/#/play');
    await page.waitForSelector('[data-scenario]');
    assert.match(page.url(), /#\/$/);
    assert.match(await page.textContent('.notice'), /could not be restored/);
  });

  await step('rounds saved before history ids existed get ids and old links still work', async () => {
    await page.evaluate(() => localStorage.setItem('nc-gym-v1', JSON.stringify({ v: 1, drills: {}, active: null,
      history: [{ scenarioId: 'deadline', behavior: 'firm', choices: ['anchor', 'twelve'], total: 30, grade: 'Rough', outcomeId: 'twelve', at: 1 }] })));
    await page.goto(base + '/gym/#/debrief/0');
    await page.reload();
    await page.waitForSelector('#score');
    const href = await page.evaluate(() => { location.hash = '#/'; return new Promise(r => setTimeout(() => r(document.querySelector('#history a').getAttribute('href')), 50)); });
    assert.match(href, /^#\/debrief\/r[0-9a-z]+$/);
  });

  await step('blocked storage still lets you play, with a warning', async () => {
    const c2 = await browser.newContext();
    await c2.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
    const p2 = await c2.newPage();
    const errs2 = [];
    p2.on('pageerror', e => errs2.push(e.message));
    await p2.goto(base + '/gym/#/setup/neighbor');
    assert.match(await p2.textContent('.notice'), /blocking storage/);
    await p2.click('#setup-form button[type=submit]');
    await p2.waitForSelector('[data-choice=hello]');
    assert.deepEqual(errs2, []);
    await c2.close();
  });

  await step('unknown routes show a not-found page', async () => {
    await page.goto(base + '/gym/#/setup/nope');
    assert.match(await page.textContent('h1'), /Not found/);
    await page.goto(base + '/gym/#/debrief/99');
    assert.match(await page.textContent('h1'), /Not found/);
    await page.goto(base + '/gym/#/debrief/not-a-round');
    assert.match(await page.textContent('h1'), /Not found/);
  });

  await step('progress with no rounds explains itself', async () => {
    const c3 = await browser.newContext();
    const p4 = await c3.newPage();
    await p4.goto(base + '/gym/#/progress');
    assert.match(await p4.textContent('#progress-empty'), /No finished rounds yet/);
    await c3.close();
  });

  await step('phone width has no horizontal scroll', async () => {
    const m = await browser.newContext({ viewport: { width: 375, height: 800 } });
    const p3 = await m.newPage();
    await p3.goto(base + '/gym/#/setup/heat');
    await p3.click('#setup-form button[type=submit]');
    await p3.waitForSelector('[data-choice]');
    const over = await p3.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(over <= 0, 'overflow ' + over);
    if (SHOTS) await p3.screenshot({ path: path.join(SHOTS, '06-phone-play.png'), fullPage: true });
    // Progress and compare at phone width, with two finished rounds seeded.
    await p3.evaluate(() => localStorage.setItem('nc-gym-v1', JSON.stringify({ v: 1, drills: {}, active: null, history: [
      { id: 'rb', scenarioId: 'deadline', behavior: 'firm', choices: ['anchor', 'silence', 'trade15'], total: 0, grade: '', at: 2 },
      { id: 'ra', scenarioId: 'deadline', behavior: 'firm', choices: ['anchor', 'twelve'], total: 0, grade: '', at: 1 }] })));
    for (const route of ['#/progress', '#/compare/ra/rb']) {
      await p3.goto(base + '/gym/' + route); await p3.reload();
      await p3.waitForSelector(route === '#/progress' ? '#ladder' : '#cmp-rubric');
      const o = await p3.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(o <= 0, route + ' overflow ' + o);
      if (SHOTS) await p3.screenshot({ path: path.join(SHOTS, (route === '#/progress' ? '09-phone-progress' : '10-phone-compare') + '.png'), fullPage: true });
    }
    await m.close();
  });

  await step('no page errors', async () => { assert.deepEqual(errors.filter(e => !/favicon|404/.test(e)), []); });

  await browser.close(); srv.close();
  const failed = steps.filter(s => s[0] === 'FAIL').length;
  console.log(`\n${steps.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
