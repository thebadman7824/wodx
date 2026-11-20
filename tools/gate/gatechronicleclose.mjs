/**
 * Close this chronicle gate (Chronicle Packs Desk c1, c2, c3; B7570-B7576), in a testbed world with a chronicle in
 * play, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatechronicleclose.mjs?${Date.now()}`)).run()
 * WoDX Chronicle, WoDX Storyteller. Never in a Live world. It names no chronicle: it works on the one in play.
 *   1. the api is there, and the saga window offers "Close this chronicle"
 *   2. at a book's end the queue asks "carry on, or close here", once; no later book is offered meanwhile;
 *      approving carries on
 *   3. closing takes the chronicle out of play: no saga books, its state put away, the window lists it as closed,
 *      and a card says so
 *   4. a week of game time brings no saga, front, twist, reveal or encounter card
 *   5. the Threads of Fate deck and the world events hold none of its own cards or events
 *   6. Open it again brings it back into play with its saga state as it was
 *   7. carry to a new chronicle: a carry file for one character, read back in, makes the character once, without the
 *      chronicle mark and with the note on the sheet
 *   8. every other WoDX module still answers
 * It puts back the settings it changed, deletes the chat cards and the character it made, and puts the clock back
 * (gate rule 16). The carry file it writes stays in Data/wodx-carry as a gate artifact.
 * Result: Data/wodx-gate/gatechronicleclose-result.json.
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
async function until(fn, ms = 6000) {
  const t = Date.now();
  while ( Date.now() - t < ms ) { try { if ( await fn() ) return true; } catch (e) { /* not yet */ } await sleep(150); }
  return false;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( /live/i.test(game.world.id) ) return "Not on a Live world.";
  const C = "wodx-chronicle", api = () => game.modules.get(C)?.api, pod = () => api()?.pod, saga = () => pod()?.saga, appr = () => api()?.approvals;
  const ST = () => game.modules.get("wodx-storyteller")?.api;
  const pack = api()?.chronicle?.current?.();
  if ( !pack ) return save({...R, steps: [{name: "0 a chronicle in play", pass: false, why: "No chronicle is in play in this world; run it in the testbed world."}]}, "gatechronicleclose-result.json");
  const KEYS = ["podSaga", "podState", "chroniclesClosed"];
  const get = k => { try { return foundry.utils.deepClone(game.settings.get(C, k)); } catch (e) { return undefined; } };
  const t0 = Date.now(), time0 = game.time.worldTime, was = Object.fromEntries(KEYS.map(k => [k, get(k)]));
  const pend0 = new Set((appr()?.pending?.() ?? []).map(p => p.id));
  const settled = async () => { try { await saga()?.settled?.(); } catch (e) { /* older Chronicle */ } };
  const story = () => game.messages.contents.filter(m => m.timestamp >= t0 && /wct-(pod|front|reveal|encounter|twist)/.test(m.content ?? "") && !/is closed|last book is done/.test(m.content ?? ""));
  const first = pack.manifest?.firstBook ?? pack.saga?.SAGA?.books?.[0]?.key;
  const made = [];
  try {
    await game.settings.set(C, "podSaga", true);
    await settled();
    await game.settings.set(C, "podState", {cities: {}, chains: [], saga: {endings: {}, clocks: {}, books: {[first]: "done"}, after: {[first]: "ask"}}});

    await step("1 api", async () => {
      const app = await pod()?.open?.(); await sleep(500);
      const btn = !!app?.element?.querySelector?.("[data-action=chronicleClose]");
      const carryOn = !!app?.element?.querySelector?.("[data-action=sagaCarryOn]");
      await app?.close?.();
      ok("1 api", typeof saga()?.close === "function" && typeof saga()?.reopen === "function" && typeof ST()?.carry?.write === "function" && btn && carryOn,
        {btn, carryOn, chronicle: pack.id});
    });

    await step("2 next book or close", async () => {
      await saga().tick(); await saga().tick();
      const mine = () => (appr().pending() ?? []).filter(x => x.type === `${C}.podSagaEnd` && !pend0.has(x.id));
      const asked = mine(), offered = (appr().pending() ?? []).filter(x => x.type === `${C}.podSaga` && !pend0.has(x.id));
      if ( asked[0] ) await appr().decide(asked[0].id, "approve");
      await settled();
      const after = game.settings.get(C, "podState")?.saga?.after?.[first];
      ok("2 next book or close", asked.length === 1 && asked[0].data?.book === first && !offered.length && after === "next",
        {asked: asked.map(x => x.title), offered: offered.length, after});
    });

    const before = foundry.utils.deepClone(game.settings.get(C, "podState")?.saga ?? {});
    await step("3 close", async () => {
      await settled();
      await saga().close();
      await until(() => !api().chronicle.current());
      const st = game.settings.get(C, "podState"), list = game.settings.get(C, "chroniclesClosed") ?? {};
      const app = await pod()?.open?.(); await sleep(500);
      const listed = !!app?.element?.querySelector?.("[data-action=chronicleOpen]");
      const sagaShown = !!app?.element?.querySelector?.("[data-action=sagaClocks]");
      await app?.close?.();
      const card = await until(() => game.messages.contents.some(m => m.timestamp >= t0 && /the chronicle is closed/.test(m.content ?? "")));
      ok("3 close", !api().chronicle.current() && !!list[pack.id] && !!st.closed?.[pack.id] && !st.saga && saga().rules.SAGA.books.length === 0 && listed && !sagaShown && card,
        {inPlay: api().chronicle.currentId(), listed, sagaShown, card});
    });

    await step("4 a quiet week", async () => {
      const n0 = story().length;
      for ( let i = 0; i < 7; i++ ) { await game.time.advance(DAY); await sleep(250); }
      await settled(); await sleep(800);
      ok("4 a quiet week", story().length === n0, {cards: story().slice(n0).map(m => m.content.slice(0, 120))});
    });

    await step("5 no cards or events", async () => {
      const own = new Set(((await pack.cards?.()) ?? []).map(c => c.key)), events = new Set(((await pack.events?.()) ?? []).map(e => e.id));
      const T = ST()?.threads;
      let deck = [];
      try { await T?.loadCards?.(); deck = T?.cards ?? []; } catch (e) { deck = []; }
      const inDeck = deck.filter(c => own.has(c.key)).map(c => c.key);
      await api()?.events?.load?.();
      const ev = api()?.events?.list?.() ?? [];
      const inEvents = ev.filter(e => events.has(e.id)).map(e => e.id);
      if ( !deck.length ) R.notes.push("The Threads deck could not be read through the api: only the world events were checked.");
      ok("5 no cards or events", !inDeck.length && !inEvents.length, {inDeck, inEvents, own: own.size, events: events.size});
    });

    await step("6 open it again", async () => {
      await saga().reopen(pack.id);
      await until(() => api().chronicle.currentId() === pack.id);
      await until(() => !!game.settings.get(C, "podState")?.saga);
      const st = game.settings.get(C, "podState");
      ok("6 open it again", api().chronicle.currentId() === pack.id && !st.closed?.[pack.id] && JSON.stringify(st.saga?.books) === JSON.stringify(before.books)
        && saga().rules.SAGA.books.length > 0, {books: st.saga?.books, was: before.books});
    });

    await step("7 carry", async () => {
      const a = game.actors.contents.find(x => x.hasPlayerOwner) ?? game.actors.contents[0];
      if ( !a ) { ok("7 carry", false, {why: "no actor in this world"}); return; }
      const doc = a.toObject();
      foundry.utils.setProperty(doc, "flags.wodx.chronicle", pack.id);
      const w = await ST().carry.write({Actor: [{doc}]}, {download: false});
      const r1 = await ST().carry.read(w.path), r2 = await ST().carry.read(w.path);
      const mine = game.actors.contents.filter(x => x.flags?.["wodx-storyteller"]?.carried?.sourceId === a.id && x.id !== a.id);
      made.push(...mine.map(x => x.id));
      const m = mine[0];
      ok("7 carry", !!w.path && r1.made?.length === 1 && r2.made?.length === 0 && mine.length === 1 && !m.flags?.wodx?.chronicle
        && m.folder?.name === "Carried across" && /Carried across from/.test(String(m.system?.notes ?? m.flags["wodx-storyteller"].carried.from)),
      {path: w.path, first: r1, second: r2, copies: mine.length});
    });

    await step("8 other modules", async () => {
      const mods = ["wodx-actions", "wodx-combat", "wodx-npc", "wodx-storyteller", "wodx-library", "wodx-senses"].filter(m => game.modules.get(m)?.active && !game.modules.get(m)?.api);
      ok("8 other modules", !mods.length, {missing: mods});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      await settled();
      // Approve, never reject, what this gate left in the queue: a rejected book end would close the chronicle
      for ( const p of (appr()?.pending?.() ?? []).filter(p => !pend0.has(p.id)) ) await appr().decide(p.id, p.type === `${C}.podSagaEnd` ? "approve" : "reject", "gate cleanup");
      if ( made.length ) await Actor.deleteDocuments(made);
      const f = game.folders.find(x => x.type === "Actor" && x.name === "Carried across" && !x.contents?.length);
      if ( f ) await f.delete();
      const msgs = game.messages.filter(m => m.timestamp >= t0);
      if ( msgs.length ) await ChatMessage.deleteDocuments(msgs.map(m => m.id));
      for ( const k of KEYS ) if ( was[k] !== undefined ) await game.settings.set(C, k, was[k]);
      await settled();
      if ( game.time.worldTime !== time0 ) await game.time.advance(time0 - game.time.worldTime);
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatechronicleclose-result.json");
}
