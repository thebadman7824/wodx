/**
 * The Storyteller's hand (Storyteller 0.18.0, Chronicle 0.10.1, Library 0.4.3), in Foundry, in rothenstein-wodx only,
 * as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatehand.mjs?${Date.now()}`)).run()
 * It makes a scratch scene and actors of its own, and deletes what it made; settings it touches are put back.
 *   1. the modules: versions, the API, the toolbar buttons and the keys
 *   2. rules at a glance: the window opens, with the shared sections and the era's Gauntlet chart
 *   3. call for a roll, open: a card with every character's result, pools from the sheet
 *   4. call for a roll, asked: the player's card and the gathered card; the answer fills it
 *   5. before the players arrive: the window opens; the checks read the world
 *   6. the session timer: start, break, back, stop
 *   7. the next session sheet: a page in the Storyteller's journal
 *   8. scene kits: saved, run (the clock moves, the note), removed
 *   9. quick extras: two hidden unlinked tokens, the traits on the sheet the era has
 *  10. hooks, absent and the recap: Willpower by Nature, absent marked and cleared, the recap draft
 *  11. downtime: a request reaches the queue; rejecting it tells the player and changes nothing
 *  12. clean up: scene, actors, journals, folders, messages, settings, the clock
 * Result: Data/wodx-gate/gatehand-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STEPS = 12;
const MOD = "wodx-storyteller";

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${STEPS} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatehand-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const atLeast = (id, v) => { const m = game.modules.get(id); return !!m?.active && !foundry.utils.isNewerVersion(v, m.version); };
const closeAll = () => { for ( const app of foundry.applications.instances.values() ) if ( /wodx-(glance|preflight|timer)|wst-hand/.test(app.id + " " + [...(app.options?.classes ?? [])].join(" ")) ) app.close(); };

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const t0 = game.time.worldTime, msgStart = Date.now();
  const keep = {};
  for ( const k of ["timer", "kits", "absent", "log"] ) keep[k] = foundry.utils.deepClone(game.settings.get(MOD, k));
  const sceneBefore = canvas.scene;
  const made = {actors: [], journals: [], folders: []};
  let scene = null;
  try {
    const T = game.modules.get(MOD).api, H = T.hand, B = T.between;
    const tools = {};
    Hooks.callAll("getSceneControlButtons", {tokens: {tools}});
    const keys = ["hand", "glance", "call", "preflight", "wrap", "timer", "downtime"].filter(k => game.keybindings.actions.has(`${MOD}.${k}`));
    ok("1. modules", atLeast(MOD, "0.18.0") && atLeast("wodx-chronicle", "0.10.1") && atLeast("wodx-library", "0.4.3") && !!H?.call && !!B?.runKit
      && !!tools.wodxHand && !!tools.wodxDowntime && keys.length === 7 && H.tools.length >= 11,
    {versions: [MOD, "wodx-chronicle", "wodx-library"].map(id => `${id} ${game.modules.get(id)?.version}`), keys, tools: H?.tools?.map(t => t.key)});

    // Rules at a glance
    await H.glance();
    await sleep(500);
    const g = document.querySelector("#wodx-glance");
    ok("2. rules at a glance", !!g && /Difficulties/.test(g.textContent) && /Common checks/.test(g.textContent) && !!g.querySelector("input[type=search], .wodx-search input"),
      {sections: [...(g?.querySelectorAll("h3") ?? [])].map(h => h.textContent)});

    // Two scratch characters, one owned by a player
    scene = await Scene.create({name: "WoDX gate: hand", width: 1000, height: 1000, grid: {size: 100, distance: 5, units: "ft"}});
    await scene.view();
    await sleep(800);
    const player = game.users.find(u => !u.isGM);
    const own = player ? {default: 0, [player.id]: 3} : {default: 0};
    const a1 = await Actor.create({name: "WoDX gate: watcher", type: "Mortal", ownership: own});
    const a2 = await Actor.create({name: "WoDX gate: second", type: "Mortal", ownership: own});
    made.actors.push(a1.id, a2.id);
    await a1.update({"system.attributes.perception.value": 4, "system.abilities.alertness.value": 2});
    const open = await H.call({label: "Gate: notice", pools: [["perception", "alertness"]], diff: 6, mode: "open", actorIds: [a1.id, a2.id]});
    const st = open?.flags?.[MOD]?.call;
    const w = st?.answers?.find(x => x.actorId === a1.id);
    ok("3. call, open", st?.answers?.length === 2 && w?.dice === 6 && w.faces.length === 6 && /Gate: notice/.test(open.content), {dice: w?.dice, summary: open?.content?.match(/<b>([^<]*succeeded[^<]*)<\/b>/)?.[1]});

    const asked = await H.call({label: "Gate: resist", pools: [["wits", ""]], diff: 6, mode: "ask", actorIds: [a1.id]});
    await sleep(500);
    const askMsg = game.messages.contents.filter(m => m.flags?.[MOD]?.callAsk?.msgId === asked.id)[0];
    const before = /still to roll/.test(game.messages.get(asked.id).content);
    await H.answer({askId: askMsg.id, userId: game.user.id});
    await sleep(500);
    const after = game.messages.get(asked.id);
    ok("4. call, asked", !!askMsg && before && !/still to roll/.test(after.content) && !!game.messages.get(askMsg.id).flags[MOD].callAsk.done && asked.whisper?.length > 0,
      {button: !!askMsg?.content?.includes("wst-call-roll")});

    // Before the players arrive
    await H.preflight();
    await sleep(500);
    const pf = document.querySelector("#wodx-preflight");
    const snap = H.snapshot();
    ok("5. before the players arrive", !!pf && pf.querySelectorAll("li").length >= 7 && snap.scene !== undefined && snap.live === false && snap.testWorld === true,
      {checks: pf?.querySelectorAll("li").length, headline: pf?.querySelector("p b")?.textContent});

    // The session timer
    await H.startTimer(120);
    const r1 = H.readTimer();
    await H.pauseTimer();
    const r2 = H.readTimer();
    await H.resumeTimer();
    await H.stopTimer();
    ok("6. the session timer", r1.running && !r1.paused && r2.paused && !H.readTimer().running, {left: r1.left});

    // The next session sheet
    const page = await B.writePrep({notes: "Gate: the mill at midnight"});
    const pj = page?.parent;
    if ( pj && !made.journals.includes(pj.id) ) made.journals.push(pj.id);
    ok("7. next session sheet", !!page && /the mill at midnight/.test(page.text?.content ?? "") && pj?.ownership?.default === 0, {page: page?.name});
    await pj?.sheet?.close?.();

    // Scene kits
    const kit = await B.saveKit({name: "Gate kit", sceneId: scene.id, minutes: 10, pull: "none", opening: false, mood: "", note: "Gate note"});
    const tk = game.time.worldTime;
    const steps = await B.runKit(kit.id);
    const moved = game.time.worldTime - tk;
    await B.removeKit(kit.id);
    ok("8. scene kits", steps?.length === 3 && moved === 600 && !B.kits().some(k => k.id === kit.id), {steps});

    // Quick extras
    const toks = await B.extras("watch", {n: 2, x: 300, y: 300});
    const ex = game.actors.find(a => a.flags?.[MOD]?.extra?.key === "watch");
    if ( ex ) made.actors.push(ex.id);
    const f = ex?.folder;
    if ( f ) made.folders.push(f.id);
    ok("9. quick extras", toks?.length === 2 && toks.every(t => t.hidden && !t.actorLink) && ex?.system?.attributes?.strength?.value === 3,
      {tokens: toks?.length, alertness: ex?.system?.abilities?.alertness?.value});

    // Hooks, absent, recap
    await a1.update({"system.nature": "Survivor", "system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 3});
    const wp = await B.willpowerForNature(a1.id);
    const hooks = B.hooks(a1);
    let absentOk = true;
    if ( player ) {
      await B.setAbsent(player.id, true);
      absentOk = !!B.absent()[player.id];
      await B.setAbsent(player.id, false);
      absentOk = absentOk && !B.absent()[player.id];
    }
    const draft = B.recapDraft();
    ok("10. hooks, absent, recap", wp === 4 && hooks.nature === "Survivor" && absentOk && typeof draft === "string", {wp, player: !!player});

    // Downtime: a request reaches the queue; rejecting it changes nothing but tells the player
    const Q = game.modules.get("wodx-chronicle").api.approvals;
    const n0 = Q.pending().length;
    await B.downtime({actorId: a1.id, kind: "study", nights: 2, what: "Gate: reads the old books"});
    await sleep(800);
    const q = Q.pending().find(e => e.type === `${MOD}.downtime` && /Gate: reads/.test(e.detail));
    if ( q ) await Q.decide(q.id, "reject");
    await sleep(800);
    ok("11. downtime", !!q && Q.pending().length === n0, {queued: !!q});
  } catch (e) {
    R.errors.push(String(e?.stack ?? e));
  } finally {
    try {
      closeAll();
      for ( const id of made.actors ) await game.actors.get(id)?.delete();
      for ( const id of made.journals ) await game.journal.get(id)?.delete();
      for ( const id of made.folders ) { const f = game.folders.get(id); if ( f && !f.contents?.length ) await f.delete(); }
      const mf = game.folders.find(f => f.type === "Macro" && f.name === "WoDX · Storyteller");
      if ( scene ) { await sceneBefore?.view?.(); await scene.delete(); }
      for ( const [k, v] of Object.entries(keep) ) await game.settings.set(MOD, k, v);
      const ids = game.messages.contents.filter(m => m.timestamp >= msgStart).map(m => m.id);
      if ( ids.length ) await ChatMessage.deleteDocuments(ids);
      if ( game.time.worldTime !== t0 ) await game.time.advance(t0 - game.time.worldTime);
      ok("12. clean up", game.time.worldTime === t0 && !game.scenes.getName("WoDX gate: hand") && made.actors.every(id => !game.actors.get(id)), {macroFolder: !!mf});
    } catch (e) { R.errors.push(`cleanup: ${e?.stack ?? e}`); ok("12. clean up", false); }
  }
  return save(R);
}
