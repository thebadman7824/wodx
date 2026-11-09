/**
 * Dated events gate (WoDX Chronicle 0.5.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateevents.mjs?${Date.now()}`)).run()
 * Back the world up first.
 *
 * It holds the world first (WoDX Chronicle's Hold the world), so moving the clock wakes no routine, faction turn,
 * expiring effect or era proposal in Rothenstein, and checks the events itself with check({force: true}). At the end
 * it puts back the clock, the hold, the fired list and the Storyteller's event choices, and deletes its chat cards.
 *   1. the module: WoDX Chronicle 0.5.0 or later with the events API and 25 events
 *   2. the settings menu "Dated events" is registered
 *   3. moving the clock past 1 October 1347 fires the Black Death: one card, the hook, has() true
 *   4. a jump to 1500 posts one card naming the Convention of Thorns
 *   5. setting the clock back to 1440 undoes Thorns and keeps the Camarilla
 *   6. a switched-off event does not fire
 *   7. Chronicle Rules has a "Dated events" page with a table
 *   8. the Dated events window opens with a search box and a row per event
 *   9. put everything back
 *  10. data versions: every WoDX module on in the world has one recorded, and a backup folder can be written
 * Result: Data/wodx-gate/gateevents-result.json.
 */
const M = "wodx-chronicle";
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const newer = (a, b) => {
  const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
  for ( let i = 0; i < 3; i++ ) if ( (pa[i] ?? 0) !== (pb[i] ?? 0) ) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return true;
};

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) {
    ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"});
    return save(R, "gateevents-result.json");
  }
  const api = game.modules.get(M)?.api;
  const t0 = game.time.worldTime;
  const saved = {
    fired: foundry.utils.deepClone(game.settings.get(M, "eventsFired")),
    overrides: foundry.utils.deepClone(game.settings.get(M, "eventOverrides")),
    held: !!api?.isHeld?.(), active: game.settings.get(M, "activeEra")
  };
  const msgsBefore = new Set(game.messages.map(m => m.id));
  // World time for a date, through the WoDX calendar's own engine
  const {getEngine} = await import(`/modules/${M}/scripts/calendar.mjs`);
  const at = (y, m, d) => getEngine().dateToTime({year: y, month: m, day: d, hour: 21});
  const keyOf = t => { const d = getEngine().timeToDate(t); return d.year * 10000 + d.month * 100 + d.day; };
  const cards = () => game.messages.filter(m => !msgsBefore.has(m.id) && /wodx-events/.test(m.content ?? ""));
  try {
    const mod = game.modules.get(M);
    ok("1. module", mod?.active && newer(mod.version, "0.5.0") && api?.events && api.events.list().length === 25,
      {version: mod?.version, events: api?.events?.list().length});
    ok("2. settings menu", !!game.settings.menus.get(`${M}.eventsMenu`));

    await api.hold(true);
    const check = o => api.events.check({force: true, ...o});
    await game.settings.set(M, "eventOverrides", {});
    await game.time.set(at(1340, 1, 1)); await sleep(300);
    await game.settings.set(M, "eventsFired", api.events.list().filter(e => e.live && e.key <= 13400101).map(e => e.id));
    const seen = [];
    const hook = Hooks.on("wodxEventFired", ev => seen.push(ev.id));
    const n0 = cards().length;
    await game.time.set(at(1348, 1, 1)); await sleep(500); await check(); await sleep(300);
    Hooks.off("wodxEventFired", hook);
    ok("3. Black Death fires once", api.events.has("black-death") && seen.filter(id => id === "black-death").length === 1 && cards().length === n0 + 1,
      {seen, cards: cards().length - n0});

    const n1 = cards().length;
    await game.time.set(at(1500, 1, 1)); await sleep(500); await check({label: "the gate's skip"}); await sleep(300);
    const skipCards = cards().slice(n1);
    ok("4. one card for the jump", skipCards.length === 1 && /Convention of Thorns/.test(skipCards[0]?.content ?? "") && /during the gate/.test(skipCards[0]?.content ?? ""), {cards: skipCards.length});

    await game.time.set(at(1440, 1, 1)); await sleep(500); await check(); await sleep(300);
    ok("5. back to 1440", !api.events.has("thorns") && api.events.has("camarilla"), {fired: api.events.fired()});

    await game.settings.set(M, "eventOverrides", {"third-great-maelstrom": {on: false}}); await sleep(300);
    await game.time.set(at(1620, 1, 1)); await sleep(500); await check(); await sleep(300);
    ok("6. switched-off event stays unfired", !api.events.has("third-great-maelstrom") && api.events.has("thorns"));

    await api.eras.refreshRulesJournal(); await sleep(500);
    const rules = game.journal.find(j => j.getFlag(M, "kind") === "chronicle-rules");
    const page = rules?.pages.getName("Dated events");
    ok("7. Chronicle Rules page", !!page && /<table/.test(page.text?.content ?? ""));

    await api.events.open(); await sleep(600);
    const app = [...foundry.applications.instances.values()].find(a => a.rendered && a.element?.classList.contains("wodx-events-app"));
    const rows = app?.element.querySelectorAll(".wodx-event-row").length ?? 0;
    ok("8. window", !!app && !!app.element.querySelector("input.wodx-search") && rows === 25, {rows});
    await app?.close();
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    await game.time.set(t0); await sleep(500);
    await game.settings.set(M, "eventOverrides", saved.overrides ?? {});
    await game.settings.set(M, "eventsFired", saved.fired);
    if ( saved.active && game.settings.get(M, "activeEra") !== saved.active ) await game.settings.set(M, "activeEra", saved.active);
    await sleep(500);
    const mine = game.messages.filter(m => !msgsBefore.has(m.id)).map(m => m.id);
    if ( mine.length ) await ChatMessage.deleteDocuments(mine);
    await api?.hold?.(saved.held);
    await sleep(300);
    await api?.eras?.refreshRulesJournal();
    // Releasing the hold catches the events up to the clock, so the list after is what the date gives
    const after = game.settings.get(M, "eventsFired");
    const same = (a, b) => JSON.stringify([...(a ?? [])].sort()) === JSON.stringify([...(b ?? [])].sort());
    const byDate = api?.events?.list().filter(e => e.live && e.key <= keyOf(t0)).map(e => e.id);
    ok("9. put back", game.time.worldTime === t0 && !!api?.isHeld?.() === saved.held && (same(after, saved.fired) || same(after, byDate)),
      {removedCards: mine.length, time: game.time.worldTime === t0, held: !!api?.isHeld?.(), saved: saved.fired, after, byDate});
  }
  try {
    const st = api?.migrations?.status() ?? [];
    const on = [...game.modules].filter(m => m.active && m.id.startsWith("wodx-")).map(m => m.id);
    ok("10. data versions", on.length > 0 && on.every(id => st.find(s => s.module === id)?.data >= 1), {status: st});
  } catch (err) { ok("10. data versions", false, {error: err.message}); }
  return save(R, "gateevents-result.json");
}
