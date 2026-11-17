/**
 * Load less on players' machines (B6240-B6242, stale design desk 2026-11-15 f1), driven in two browsers:
 * rothenstein-wodx only.
 *   node tools/harness/gate-two.mjs gateplayerload [--url https://localhost:30030]
 * Phases (each a run({phase}) call in one of the browsers):
 *   "setup"  (Gamemaster Test): makes the Player Test user if missing, and checks the Storyteller's side:
 *     a. WoDX Chronicle's world timeline is in on the Storyteller's client (events.loaded(), the world eras, thousands
 *        of events), and the Dated events page of Chronicle Rules is written
 *     b. the Threads of Fate cards and the People tables load when first asked for, and a person is made
 *     c. the Storyteller's client measures what it loaded at start (module files and bytes), and the measure sees the
 *        timeline files there (gate-two.mjs enlarges the browser's timing buffer, which holds 250 files by default)
 *   "player" (Player Test, a fresh browser with nothing cached):
 *     d. none of the large tables were fetched at start: world-history, future-events, future-world, threads-cards,
 *        people-world, data/people.mjs
 *     e. what a player sees is still there: has() and fired() agree with the Storyteller's fired list, the Dated
 *        events page reads the same rows, and the clock's year is shown
 *     f. on first use the timeline loads on the player's client too (events.load()), and the list grows
 *     g. the measure: module files, bytes and the time the last module script arrived, written to the result
 *   "finish" (Gamemaster Test): writes Data/wodx-gate/gateplayerload-result.json with every step and both measures.
 * Run on main for the "before" figures (steps d and f then fail there by design) and on the branch for "after".
 * Nothing is made but the Player Test user, and the clock never moves.
 */
const PLAYER = "Player Test";
const C = () => game.modules.get("wodx-chronicle")?.api;
const HEAVY = ["wodx-chronicle/data/world-history.mjs", "wodx-chronicle/data/future-events.mjs", "wodx-chronicle/data/future-world.mjs",
  "wodx-storyteller/data/threads-cards.mjs", "wodx-creation/data/people-world.mjs", "wodx-creation/data/people.mjs"];

/** What this browser fetched from the WoDX modules since it opened the game. */
function measure() {
  const all = performance.getEntriesByType("resource");
  const rs = all.filter(r => /\/modules\/wodx-/.test(r.name));
  const nav = performance.getEntriesByType("navigation")[0];
  const scripts = rs.filter(r => /\.(m?js)(\?|$)/.test(r.name));
  return {files: rs.length, scripts: scripts.length,
    bytes: rs.reduce((n, r) => n + (r.decodedBodySize || 0), 0), sent: rs.reduce((n, r) => n + (r.encodedBodySize || 0), 0),
    lastScriptMs: Math.round(Math.max(0, ...scripts.map(r => r.responseEnd))), domLoadedMs: Math.round(nav?.domContentLoadedEventEnd ?? 0),
    heavy: HEAVY.filter(h => rs.some(r => r.name.includes(`/modules/${h}`))), entries: all.length,
    // The browser stops writing timings when its buffer (250 by default) is full, and then files go uncounted
    full: all.length === 250};
}
const pageText = () => {
  const j = game.journal.find(x => x.flags?.["wodx-chronicle"]?.kind === "chronicle-rules" || x.name === "Chronicle Rules");
  return (j?.pages?.find(p => p.name === "Dated events")?.text?.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
};

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed${R.errors?.length ? `, ${R.errors.length} error(s)` : ""}`;
  const bad = R.steps.filter(s => !s.pass);
  if ( bad.length ) R.summary += `; failed: ${bad.map(s => JSON.stringify(s).slice(0, 400)).join(" ; ")}`;
  const file = new File([JSON.stringify(R, null, 1)], "gateplayerload-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run({phase = "setup", ids = null, playerSteps = []} = {}) {
  if ( game.world.id !== "rothenstein-wodx" ) return {error: "Run this gate in rothenstein-wodx only"};
  if ( phase === "setup" ) return setup();
  if ( phase === "player" ) return player(ids);
  if ( phase === "finish" ) return finish(ids, playerSteps);
  return {error: `no phase ${phase}`};
}

/* ---------------- Storyteller side ---------------- */

async function setup() {
  if ( !game.user.isGM ) return {error: "setup runs as Gamemaster Test"};
  const steps = [];
  const ok = (name, pass, detail = {}) => steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message}); } };
  let user = game.users.find(u => u.name === PLAYER);
  if ( !user ) user = await User.create({name: PLAYER, role: CONST.USER_ROLES.PLAYER});
  const gmMeasure = measure();
  await step("a. the timeline is in on the Storyteller's client", async () => {
    const ev = C().events;
    const loaded = typeof ev.loaded === "function" ? ev.loaded() : null;
    const n = ev.list().length, eras = (ev.eras ?? []).length;
    ok("a. the timeline is in on the Storyteller's client", loaded !== false && n > 1000 && eras >= 5, {loaded, events: n, eras});
  });
  await step("a2. the Dated events page is written", async () => {
    await C().eras?.refreshRulesJournal?.();
    const t = pageText();
    ok("a2. the Dated events page is written", t.length > 200, {chars: t.length});
  });
  await step("b. the cards and the People tables load on first use", async () => {
    const S = game.modules.get("wodx-storyteller")?.api?.threads, P = game.modules.get("wodx-creation")?.api?.people;
    if ( S?.loadCards ) await S.loadCards();
    if ( P?.load ) await P.load();
    const person = P?.generate?.({batch: "gate-playerload", row: 0});
    ok("b. the cards and the People tables load on first use", (S?.cards?.length ?? 0) > 50 && !!person?.name, {cards: S?.cards?.length ?? 0, person: person?.name ?? null});
  });
  // The measure must see what the Storyteller's client loads at start (the timeline), or a "nothing heavy" on the
  // player's side proves nothing
  const timeline = HEAVY.slice(0, 3);
  ok("c. the Storyteller's start-up measure sees the timeline", !gmMeasure.full && timeline.every(h => gmMeasure.heavy.includes(h)), {measure: gmMeasure});
  const fired = C().events.fired();
  return {user: user.id, steps, gmMeasure, fired: fired.length, firedSample: fired.slice(-20), page: pageText().slice(0, 4000), year: C().eras?.currentYear?.() ?? null};
}

/* ---------------- Player side ---------------- */

async function player(ids) {
  const steps = [];
  const ok = (name, pass, detail = {}) => steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message}); } };
  const m = measure();
  ok("d. no large table was fetched at start", !m.full && m.heavy.length === 0, {heavy: m.heavy, entries: m.entries, full: m.full});
  await step("e. what a player sees is still there", async () => {
    const ev = C().events, fired = ev.fired();
    const same = fired.length === ids.fired && ids.firedSample.every(id => ev.has(id));
    const page = pageText();
    ok("e. the fired list agrees with the Storyteller's", same, {fired: fired.length, gm: ids.fired});
    ok("e2. the Dated events page reads the same", page.slice(0, 4000) === ids.page, {chars: page.length});
    ok("e3. the clock's year is shown", Number(C().eras?.currentYear?.()) === Number(ids.year), {year: C().eras?.currentYear?.()});
  });
  await step("f. the timeline loads on first use on the player's client", async () => {
    const ev = C().events, before = ev.list().length;
    const was = typeof ev.loaded === "function" ? ev.loaded() : null;
    if ( ev.load ) await ev.load();
    const after = ev.list().length;
    ok("f. the timeline loads on first use on the player's client", was === false && after > before + 1000, {was, before, after});
  });
  ok("g. the player's start-up measure", true, {measure: m});
  return steps;
}

/* ---------------- Finish ---------------- */

async function finish(ids, playerSteps) {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [...(ids?.steps ?? []), ...(playerSteps ?? [])], errors: []};
  const gm = ids?.gmMeasure, pl = (playerSteps ?? []).find(s => s.name?.startsWith("g."))?.measure;
  R.measure = {storyteller: gm, player: pl};
  return save(R);
}
