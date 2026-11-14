/**
 * Progress clocks, the pacing note and spirit standing gate (Storyteller 0.41.0, Otherworlds 0.16.0, Actions 3.51.0),
 * in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gategroup6.mjs?${Date.now()}`)).run()
 * Back the world up first. It holds the world and puts back the clocks, the log and its own actors at the end.
 *   1. the modules: Storyteller 0.41.0+, Otherworlds 0.16.0+, Actions 3.51.0+, with the clocks, pacing and spirits APIs
 *   2. a new own clock of 4 fills by hand, and a full clock says so in a whispered card
 *   3. a clock set to tick each faction turn fills one segment when the factions take their turn
 *   4. a long task on a gate actor shows as a read clock, Storyteller only until shown; shown to that actor, the rule lets its player see it
 *   5. the Clocks window opens with a row per clock, and the dashboard has a Progress clocks section
 *   6. a fight started goes in the log as "A fight began", and the pacing note can be read
 *   7. spirit standing: chiminage paid moves the Weaver court to +1; +3 more gives -1 difficulty; -5 refuses
 *   8. put everything back
 * Result: Data/wodx-gate/gategroup6-result.json.
 */
const ST = "wodx-storyteller", OW = "wodx-otherworlds", AC = "wodx-actions", CH = "wodx-chronicle";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clone = v => foundry.utils.deepClone(v);
const newer = (a, b) => {
  const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
  for ( let i = 0; i < 3; i++ ) if ( (pa[i] ?? 0) !== (pb[i] ?? 0) ) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return true;
};
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

async function runGate(K) {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R, "gategroup6-result.json"); }
  const st = game.modules.get(ST)?.api, ow = game.modules.get(OW)?.api, ch = game.modules.get(CH)?.api;
  const saved = {clocks: clone(game.settings.get(ST, "clocks")), log: clone(game.settings.get(ST, "log")), tasks: clone(game.settings.get(ST, "longTasks")), held: !!ch?.isHeld?.()};
  const msgsBefore = new Set(game.messages.map(m => m.id));
  const made = [];
  try {
    const v = id => game.modules.get(id)?.version;
    ok("1. modules", newer(v(ST), "0.41.0") && newer(v(OW), "0.16.0") && newer(v(AC), "3.51.0") && !!st?.clocks && !!st?.night?.pacing && !!ow?.spirits,
      {storyteller: v(ST), otherworlds: v(OW), actions: v(AC)});
    await ch.hold(true);

    const c = await st.clocks.save({id: "gateclock", name: "Gate clock", segments: 4, filled: 2});
    await st.clocks.step(c.id, 1); await st.clocks.step(c.id, 1); await sleep(400);
    const full = game.messages.filter(m => !msgsBefore.has(m.id) && /A clock is full/.test(m.content ?? "") && /Gate clock/.test(m.content ?? ""));
    ok("2. fill by hand", st.clocks.list().find(x => x.id === "gateclock")?.filled === 4 && full.length === 1, {cards: full.length});

    await st.clocks.save({id: "gatefaction", name: "Gate faction plan", segments: 6, tick: "faction"});
    await st.clocks.tick("faction"); await sleep(200);
    ok("3. faction turn tick", st.clocks.list().find(x => x.id === "gatefaction")?.filled === 1);

    await game.settings.set(ST, "longTasks", true);
    const [a] = await Actor.createDocuments([{name: "Gate Clock Worker", type: "Mortal", flags: {[ST]: {tasks: {gt1: {id: "gt1", kind: "craft", name: "Gate work", goal: 6, total: 3, status: "open", started: game.time.worldTime}}}}}]);
    made.push(a.id); await sleep(300);
    const tc = st.clocks.list().find(x => x.id === `task:${a.id}:gt1`);
    const hidden = tc && tc.shown === false;
    await st.clocks.show(tc?.id, [a.id]); await sleep(300);
    const tc2 = st.clocks.list().find(x => x.id === `task:${a.id}:gt1`);
    ok("4. read clock and who sees it", !!tc && tc.filled === 3 && tc.segments === 6 && hidden && st.clocks.rules.canSee(tc2, [a.id]) && !st.clocks.rules.canSee(tc2, ["someoneelse"]), {tc, tc2});

    await st.clocks.open(); await sleep(600);
    const app = [...foundry.applications.instances.values()].find(x => x.rendered && x.element?.classList.contains("wst-clocks-app"));
    const rows = app?.element.querySelectorAll(".wst-clock-row").length ?? 0;
    await app?.close();
    await st.dashboard.open(); await sleep(700);
    const dash = [...foundry.applications.instances.values()].find(x => x.rendered && x.element?.classList.contains("wodx-dashboard-app"));
    const dashOk = !!dash?.element.querySelector(".wstory-dash-progress");
    await dash?.close();
    ok("5. windows", rows >= 3 && dashOk, {rows, dashOk});

    Hooks.callAll("wodxFightStarted", {combat: {scene: canvas.scene}, tokens: []}); await sleep(600);
    const fight = (game.settings.get(ST, "log")?.entries ?? []).find(e => /^A fight began/.test(e.text ?? ""));
    let pace = "error";
    try { const p = st.night.pacing(); pace = p === null ? null : p.text; } catch (e) { pace = `error: ${e.message}`; }
    ok("6. fight in the log, pacing note", !!fight && (pace === null || typeof pace === "string" && !pace.startsWith("error")), {fight: fight?.text, pace});

    const [sh] = await Actor.createDocuments([{name: "Gate Spirit Talker", type: "Mortal"}]);
    made.push(sh.id);
    await ow.spirits.move(sh, "paid", {court: "weaver", why: "gate"});
    const one = ow.spirits.standing(sh, "weaver");
    await ow.spirits.move(sh, "custom", {court: "weaver", by: 3});
    const eff = ow.spirits.effect(sh, "weaver");
    await ow.spirits.move(sh, "custom", {court: "wyrm", by: -9});
    const ref = ow.spirits.effect(sh, "wyrm");
    ok("7. spirit standing", one === 1 && eff.diff === -1 && ref.refuses && ref.diff === 2 && ow.spirits.effect(sh, "").diff === 0, {one, eff, ref});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      if ( made.length ) await Actor.deleteDocuments(made);
      await game.settings.set(ST, "clocks", saved.clocks);
      await game.settings.set(ST, "log", saved.log);
      await game.settings.set(ST, "longTasks", saved.tasks);
      const mine = game.messages.filter(m => !msgsBefore.has(m.id)).map(m => m.id);
      if ( mine.length ) await ChatMessage.deleteDocuments(mine);
      await ch?.hold?.(saved.held);
      await sleep(300);
      const left = st.clocks.list().filter(x => /^gate|Gate/.test(`${x.id} ${x.name}`));
      ok("8. put back", !left.length && !!ch?.isHeld?.() === saved.held, {left: left.map(x => x.id)});
    } catch (err) { ok("8. put back", false, {error: err.message}); }
  }
  return save(R, "gategroup6-result.json");
}

// The gate kit (B3733): its own scratch scene, cleaned up after.
import {kitRun} from "./kit.mjs";
export const run = kitRun("gategroup6", runGate);
