/**
 * Clean world gate (Chronicle Packs Desk e2, Ben 18 Nov 2026), in wodx-clean only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatecleanworld.mjs?${Date.now()}`)).run()
 * The shared game with no story chronicle: every WoDX module on except the chronicle modules. It proves the shared
 * game runs with none, and that no chronicle's content turns up. It names no chronicle: the chronicle modules are the
 * installed WoDX modules with a chronicle.mjs at their root, and their marks, cards and event ids are read from there.
 *   1. no chronicle module is on, none is registered and none is in play; the engines hold no story
 *   2. the saga window opens and tells no chronicle's story; a week of game time with the saga on brings no saga,
 *      front, twist, reveal or encounter card
 *   3. the Threads of Fate deck holds no card that belongs to a chronicle
 *   4. the world events, Future Darkness branch included, hold none of a chronicle's own events
 *   5. the faction window offers no chronicle's starting factions
 *   6. Otherworld tagging offers no chronicle's scene presets
 *   7. no world document carries a chronicle flag, and no name, chat card or journal page holds a chronicle's mark
 *   9. a character sheet opens and shows its traits (and no mark)
 *   8. every other WoDX module still answers
 * It puts back the settings it changed, deletes the chat cards it caused and puts the clock back (gate rule 16).
 * It is left out of the gate map (gate-map-extra.json notGates): in rothenstein-wodx a chronicle is in play on purpose.
 * run-gate.mjs --world clean --clean-set runs it with the rest of the clean smoke set.
 * Result: Data/wodx-gate/gatecleanworld-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DAY = 86400;
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const markRx = marks => (marks.length ? new RegExp(`(?<![\\w-])(${marks.map(esc).join("|")})(?![\\w-])`) : null);
// DOMParser builds an inert document: nothing in the markup runs
const textOf = html => new DOMParser().parseFromString(String(html ?? ""), "text/html").body.textContent ?? "";
const outerOf = el => (el ? el.outerHTML ?? "" : "");
const all = c => c?.contents ?? [...(c?.values?.() ?? c ?? [])];

/** The installed WoDX modules that carry a chronicle (a chronicle.mjs at their root), with what it holds. */
async function chronicleModules() {
  const out = [];
  for ( const m of game.modules ) {
    if ( !m.id.startsWith("wodx-") ) continue;
    const url = `/modules/${m.id}/chronicle.mjs`;
    const head = await fetch(url, {method: "HEAD"}).catch(() => null);
    if ( !head?.ok ) continue;
    const c = {id: m.id, active: !!m.active, marks: [], cards: [], events: [], presets: [], factions: 0, error: null};
    try {
      const {MANIFEST, PACK} = await import(`${url}?${Date.now()}`);
      c.chronicle = MANIFEST?.id ?? "";
      c.marks = MANIFEST?.marks ?? [];
      c.cards = ((await PACK?.cards?.()) ?? []).map(x => x.key);
      c.events = ((await PACK?.events?.()) ?? []).map(x => x.id);
      c.presets = Object.keys(PACK?.scenePresets ?? {});
      c.factions = PACK?.factions?.FACTIONS?.length ?? 0;
    } catch (e) { c.error = e.message; }
    out.push(c);
  }
  return out;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( /live/i.test(game.world.id) ) return "Not on the Live world.";
  if ( !game.world.flags?.wodx?.clean ) return save({...R, steps: [{name: "0 clean world", pass: false, why: `${game.world.id} is not the clean world (flags.wodx.clean); run it with --world clean`}]}, "gatecleanworld-result.json");
  const C = "wodx-chronicle", chron = () => game.modules.get(C)?.api, pod = () => chron()?.pod, saga = () => pod()?.saga;
  const KEYS = [[C, "podSaga"], [C, "podState"], [C, "rule.futureBranch"]];
  const get = ([m, k]) => { try { return foundry.utils.deepClone(game.settings.get(m, k)); } catch (e) { return undefined; } };
  const t0 = Date.now(), time0 = game.time.worldTime, was = KEYS.map(get);
  const story = () => game.messages.contents.filter(m => m.timestamp >= t0 && /wct-(pod|front|reveal|encounter|twist)/.test(m.content ?? ""));
  const opened = [], made = [];
  let found = [];
  try {
    found = await chronicleModules();
    R.chronicleModules = found.map(c => ({id: c.id, active: c.active, marks: c.marks.length, cards: c.cards.length, events: c.events.length, error: c.error}));
    if ( !found.length ) R.notes.push("No chronicle module is installed on this lane: steps 3 to 7 check against nothing but the flags.");
    const marks = [...new Set(found.flatMap(c => c.marks))], rx = markRx(marks);
    const hasMark = s => !!rx && rx.test(String(s ?? ""));
    // The words around a mark, so a failing step says where it was
    const around = s => { const t = String(s ?? ""), m = rx ? rx.exec(t) : null; return m ? t.slice(Math.max(0, m.index - 60), m.index + m[0].length + 40).replace(/\s+/g, " ") : null; };

    await step("1 no chronicle", async () => {
      const on = found.filter(c => c.active).map(c => c.id);
      const listed = (chron()?.chronicle?.list?.() ?? []).map(p => p.id), inPlay = chron()?.chronicle?.current?.() ?? null;
      const data = await import("/modules/wodx-rules/chronicle/chronicle-data.mjs");
      const held = {books: data.SAGA.books.length, fronts: data.FRONTS.length, twists: data.TWISTS.length, reveals: Object.keys(data.REVEALS).length, encounters: data.ENCOUNTERS.length, clues: data.CLUES.length};
      const errs = found.filter(c => c.error).map(c => `${c.id}: ${c.error}`);
      ok("1 no chronicle", !on.length && !listed.length && !inPlay && Object.values(held).every(n => n === 0) && !errs.length && !!chron()?.chronicle,
        {on, listed, inPlay: inPlay?.id ?? null, held, readErrors: errs});
    });

    await step("2 the saga stays quiet", async () => {
      const app = await pod()?.open?.(); await sleep(600);
      if ( app ) opened.push(app);
      const words = textOf(outerOf(app?.element));
      await game.settings.set(C, "podSaga", true);
      await game.settings.set(C, "podState", {cities: {}, chains: []});
      await saga()?.tick?.();
      for ( let d = 0; d < 7; d++ ) { await game.time.advance(DAY); await sleep(2300); }
      await saga()?.settled?.();
      const cards = story().map(m => textOf(m.content).slice(0, 160));
      const runs = (game.settings.get(C, "podState")?.chains ?? []).filter(r => r.saga);
      ok("2 the saga stays quiet", !!app && !hasMark(words) && !cards.length && !runs.length, {window: !!app, markInWindow: around(words), cards, sagaRuns: runs.length});
    });

    await step("3 Threads of Fate deck", async () => {
      const th = game.modules.get("wodx-storyteller")?.api?.threads;
      if ( typeof th?.loadCards !== "function" ) { ok("3 Threads of Fate deck", false, {why: "api.threads.loadCards is missing"}); return; }
      await th.loadCards();
      const deck = th.cards ?? [], theirs = new Set(found.flatMap(c => c.cards));
      const bad = deck.filter(c => c.chronicle || theirs.has(c.key)).map(c => c.key);
      const marked = deck.filter(c => hasMark(JSON.stringify(c))).map(c => c.key);
      ok("3 Threads of Fate deck", deck.length > 0 && !bad.length && !marked.length, {cards: deck.length, chronicleCards: bad, marked: marked.slice(0, 20)});
    });

    await step("4 world events", async () => {
      const ev = chron()?.events;
      await ev?.load?.();
      await game.settings.set(C, "rule.futureBranch", true).catch(() => R.notes.push("rule.futureBranch could not be set; the table as it stands was read."));
      await sleep(300);
      const ids = new Set((ev?.list?.() ?? []).map(e => e.id)), theirs = found.flatMap(c => c.events);
      const there = theirs.filter(id => ids.has(id) || ev?.has?.(id));
      ok("4 world events", ids.size > 0 && !there.length, {events: ids.size, chronicleEvents: theirs.length, there});
    });

    await step("5 factions", async () => {
      const f = game.modules.get("wodx-npc")?.api?.factions;
      const own = f?.chronicleFactions?.() ?? null;
      const app = await f?.FactionsAppClass?.()?.open?.(); await sleep(600);
      if ( app ) opened.push(app);
      const el = app?.element ?? document.querySelector(".wodx-factions, [id*=factions]");
      const button = !!el?.querySelector?.('[data-action="roth"]');
      ok("5 factions", !!f && !own && !button && !hasMark(textOf(outerOf(el))), {api: !!f, chronicleFactions: !!own, button, window: !!el, mark: around(textOf(outerOf(el)))});
    });

    await step("6 Otherworld presets", async () => {
      const api = game.modules.get("wodx-otherworlds")?.api;
      const app = await api?.openRatings?.(); await sleep(800);
      if ( app && typeof app.close === "function" ) opened.push(app);
      const el = app?.element ?? [...document.querySelectorAll(".application, .app")].find(e => e.querySelector?.('select[name="preset"]'));
      const options = [...(el?.querySelectorAll?.('select[name="preset"] option') ?? [])].map(o => o.value);
      ok("6 Otherworld presets", !!api && !options.length, {api: !!api, presets: options});
    });

    await step("7 world documents", async () => {
      const flagged = [], named = [];
      const chronFlag = d => d?.flags?.wodx?.chronicle ?? d?.flags?.[C]?.chronicle ?? null;
      for ( const k of ["actors", "items", "scenes", "journal", "tables", "macros", "playlists", "cards", "folders"] ) {
        for ( const d of all(game[k]) ) {
          if ( chronFlag(d) ) flagged.push(`${k}:${d.name}`);
          if ( hasMark(d.name) ) named.push(`${k}:${around(d.name)}`);
          if ( k === "journal" ) for ( const p of all(d.pages) ) { if ( hasMark(p.name) || hasMark(textOf(p.text?.content)) ) named.push(`journal page:${d.name}/${p.name}: ${around(p.name) ?? around(textOf(p.text?.content))}`); }
        }
      }
      for ( const m of all(game.messages) ) { if ( chronFlag(m) ) flagged.push(`message:${m.id}`); if ( hasMark(textOf(m.content)) ) named.push(`message:${around(textOf(m.content))}`); }
      const worldFlag = !!(game.world.flags?.wodx?.chronicle);
      ok("7 world documents", !flagged.length && !named.length && !worldFlag, {flagged: flagged.slice(0, 20), marked: named.slice(0, 20), worldFlag});
    });

    await step("9 a character sheet", async () => {
      // The shared sheet opens and shows its traits with no chronicle in play
      const a = await Actor.create({name: "Gate clean world mortal", type: "Mortal"});
      made.push(a);
      const sheet = a.sheet;
      const elOf = () => (sheet.element instanceof HTMLElement ? sheet.element : sheet.element?.[0]);
      await sheet.render(true);
      for ( let i = 0; i < 60 && !(sheet.rendered && elOf()?.querySelector?.("input, select")); i++ ) await sleep(100);
      const el = elOf();
      const rows = el ? el.querySelectorAll("input, select").length : 0; // the sheet's own fields
      const traits = a.system ? Object.keys(a.system.attributes ?? {}).length : 0;
      await sheet.close();
      ok("9 a character sheet", !!el && rows > 0 && traits > 0 && !hasMark(textOf(outerOf(el))), {rows, traits, mark: around(textOf(outerOf(el)))});
    });

    await step("8 other modules", async () => {
      const mods = ["wodx-actions", "wodx-combat", "wodx-npc", "wodx-storyteller", "wodx-library", "wodx-senses", "wodx-creation", "wodx-otherworlds", "wodx-interactables"]
        .filter(m => game.modules.get(m)?.active && !game.modules.get(m)?.api);
      ok("8 other modules", !mods.length, {missing: mods});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      for ( const a of opened ) await a.close?.().catch?.(() => {});
      for ( const d of made ) await d.delete().catch(() => {});
      await saga()?.settled?.();
      const msgs = game.messages.filter(m => m.timestamp >= t0);
      if ( msgs.length ) await ChatMessage.deleteDocuments(msgs.map(m => m.id));
      for ( let i = 0; i < KEYS.length; i++ ) if ( was[i] !== undefined ) await game.settings.set(KEYS[i][0], KEYS[i][1], was[i]);
      if ( game.time.worldTime !== time0 ) await game.time.advance(time0 - game.time.worldTime);
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatecleanworld-result.json");
}
