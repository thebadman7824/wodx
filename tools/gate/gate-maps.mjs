/**
 * Responsive maps gate (WoDX Interactables 0.12.0 or later with WoDX NPC 0.5.0 and WoDX Storyteller 0.3.0), in Foundry, in rothenstein-wodx only, as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gate-maps.mjs?${Date.now()}`)).run()
 * Back the world up first. The gate makes its own scene ("Gate Maps"), a player's character ("Gate Maps burglar") and an
 * NPC ("Gate Maps watchman"), and deletes them all at the end. It fixes the dice while it runs and puts them back, and
 * puts the clock back.
 *   1. both modules at their versions; the Alert zone behaviour is in the game model
 *   2. forcing a locked door next to the watchman: a map event goes out, naming the watchman among those who heard
 *   3. the watchman's reaction card follows (trigger "heard"), with options from the profile and no words put in the NPC's mouth
 *   4. raising the alarm on the scene lights the Alert zone's lamp
 *   5. an hour and a bit later the alarm dies down: the place is wary, the lamp goes out, the Storyteller gets a note
 *   6. every other WoDX module still answers (Chronicle, Actions, Combat, Storyteller)
 *   7. the forced door left a mark on the scene for later repair; the Storyteller module (when on) is at 0.3.0 with map beats
 *   8. an Alert zone with a bell carries a new alarm to a second scene ("Gate Maps watch house") at once; Undo takes it back
 *   9. a WoDX: Trigger region (anyone, once) fires when the burglar walks in: one map event of kind trigger, and a note
 * Result: Data/wodx-gate/gate-maps-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOD = "wodx-interactables", NPC = "wodx-npc";
const ix = () => game.modules.get(MOD).api;
const rt = () => game.modules.get(NPC).api.routines;
const G = 100;

async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const dice = async face => {
  for ( const u of [(face - 0.5) / 10, 1 - (face - 0.5) / 10] ) {
    CONFIG.Dice.randomUniform = () => u;
    if ( (await new Roll("1d10").evaluate()).dice[0].results[0].result === face ) return;
  }
  throw new Error(`could not fix the dice to ${face}`);
};
async function until(fn, ms = 8000) {
  const t = Date.now();
  while ( Date.now() - t < ms ) { const v = fn(); if ( v ) return v; await sleep(100); }
  return fn();
}

export async function run() {
  if ( game.world.id !== "rothenstein-wodx" ) return "Run this gate in rothenstein-wodx only.";
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 4).join(" | ")}); } };
  const keep = {uniform: CONFIG.Dice.randomUniform, t0: game.time.worldTime, scene: canvas.scene?.id, messages: new Set(game.messages.map(m => m.id))};
  let scene = null, burglar = null, watchman = null, watchHouse = null;
  const events = [];
  const hook = Hooks.on("wodxMapEvent", e => events.push(e));
  try {
    await step("1. modules", async () => {
      const i = game.modules.get(MOD), n = game.modules.get(NPC);
      ok("1. Interactables 0.12.0 or later and NPC 0.5.0 or later are on, with the Alert zone and Trigger behaviours", i?.active && !foundry.utils.isNewerVersion("0.12.0", i.version) && n?.active && !foundry.utils.isNewerVersion("0.5.0", n.version) && !!game.model?.RegionBehavior?.[`${NPC}.trigger`]
        && !!game.model?.RegionBehavior?.[`${NPC}.alertZone`] && typeof rt()?.raiseAlarm === "function", {i: i?.version, n: n?.version});
    });
    scene = await Scene.create({name: "Gate Maps", width: 2000, height: 2000, grid: {size: G, type: 1, distance: 5, units: "ft"}, tokenVision: false, padding: 0});
    await scene.view();
    await sleep(800);
    await scene.createEmbeddedDocuments("Wall", [{c: [520, 800, 680, 800], door: 1, ds: CONST.WALL_DOOR_STATES.LOCKED, flags: {[MOD]: {lock: "cheap", gate: "door"}}}]);
    const door = scene.walls.find(w => w.flags?.[MOD]?.gate === "door");
    const mk = (name, owner) => Actor.create({name, type: "Mortal", ownership: owner ? {default: 0, [game.user.id]: 3} : {default: 0},
      system: {attributes: {strength: {value: 4, total: 4}, dexterity: {value: 3, total: 3}, perception: {value: 3, total: 3}},
        abilities: {larceny: {value: 2, isvisible: true}, alertness: {value: 3, isvisible: true}}}});
    burglar = await mk("Gate Maps burglar", true);
    watchman = await mk("Gate Maps watchman", false);
    await scene.createEmbeddedDocuments("Token", [
      {...(await burglar.getTokenDocument({x: 550, y: 650})).toObject(), actorLink: true},
      {...(await watchman.getTokenDocument({x: 550, y: 900})).toObject(), actorLink: true, hidden: false}]);
    const tb = scene.tokens.find(t => t.actorId === burglar.id), tw = scene.tokens.find(t => t.actorId === watchman.id);
    await sleep(800);
    const tok = canvas.tokens.get(tb.id);

    let ev = null;
    await step("2. event", async () => {
      await dice(9);
      let m = null;
      for ( let k = 0; k < 5 && door.ds !== CONST.WALL_DOOR_STATES.OPEN; k++ ) {
        m = await ix().attempt(tok, door.id, "force", {fd: {}});
        await until(() => game.messages.get(m?.id)?.flags?.[MOD]?.done);
      }
      ev = await until(() => events.find(e => e.object === door.id && !e.undone && e.kind !== "noise") ?? events.find(e => e.object === door.id));
      ok("2. forcing the door sends a map event naming the watchman among those who heard", !!ev && ev.heard.includes(tw.uuid) && ev.noise === "loud",
        {ev, ds: door.ds, result: game.messages.get(m?.id)?.flags?.[MOD]?.done?.result ?? null});
    });

    await step("3. reaction", async () => {
      const card = await until(() => game.messages.find(x => !keep.messages.has(x.id) && x.flags?.[NPC]?.reaction?.trigger === "heard"));
      const data = card?.flags?.[NPC]?.reaction;
      const text = String(card?.content ?? "").replace(/<[^>]+>/g, " ");
      ok("3. the watchman's reaction card follows, with options from the profile and no quoted speech", !!data && data.watcher === tw.uuid && data.options.length > 0 && !/[“"][A-Z][^"”]{3,}[”"]/.test(text),
        {options: data?.options?.map(o => o.action), mode: data?.mode, head: data?.head});
    });

    let lamp = null;
    await step("4. alarm", async () => {
      await scene.createEmbeddedDocuments("AmbientLight", [{x: 600, y: 700, hidden: true, config: {bright: 1, dim: 2}, flags: {[MOD]: {gate: "alarmlamp"}}}]);
      lamp = scene.lights.find(l => l.flags?.[MOD]?.gate === "alarmlamp");
      await scene.createEmbeddedDocuments("Region", [{name: "Gate alert zone", shapes: [{type: "rectangle", x: 400, y: 500, width: 600, height: 600, rotation: 0}],
        behaviors: [{type: `${NPC}.alertZone`, name: "Alert zone", system: {lights: lamp.id, sounds: ""}}]}]);
      await sleep(300);
      await rt().raiseAlarm(scene, "the gate");
      const lit = await until(() => lamp.hidden === false, 3000);
      ok("4. raising the alarm puts the place on alarm and lights the Alert zone's lamp", rt().alertLevel(scene) === "alarm" && lit, {alert: scene.flags?.[NPC]?.alert, hidden: lamp.hidden});
    });

    await step("5. fade", async () => {
      const n = game.messages.size;
      await game.time.advance(3700);
      const wary = await until(() => scene.flags?.[NPC]?.alert?.shown === "wary", 6000);
      const note = game.messages.contents.slice(-5).some(m => /dies down/.test(m.content));
      ok("5. an hour later the alarm dies down: wary, the lamp out, a note for the Storyteller", !!wary && lamp.hidden === true && note && game.messages.size > n,
        {alert: scene.flags?.[NPC]?.alert, hidden: lamp.hidden, note});
    });

    await step("6. alongside", async () => {
      const c = game.modules.get("wodx-chronicle")?.api, a = game.wodxActions, cb = game.wodxCombat, st = game.modules.get("wodx-storyteller");
      ok("6. Chronicle, Actions, Combat and the Storyteller module answer", !!c?.propose && !!a?.rules && !!cb?.applyDamage && (!st?.active || !!st.api), {});
    });

    await step("7. marks", async () => {
      const marks = scene.flags?.[NPC]?.marks ?? [];
      const st = game.modules.get("wodx-storyteller");
      ok("7. the forced door left a mark for repair, and the Storyteller module (if on) is 0.3.0", marks.some(m => m.object === door.id && m.kind === "force")
        && (!st?.active || !foundry.utils.isNewerVersion("0.3.0", st.version)), {marks, st: st?.active ? st.version : "off"});
    });

    await step("8. carriers", async () => {
      watchHouse = await Scene.create({name: "Gate Maps watch house", width: 1000, height: 1000, grid: {size: G, type: 1, distance: 5, units: "ft"}, padding: 0});
      await scene.createEmbeddedDocuments("Region", [{name: "Gate bell zone", shapes: [{type: "rectangle", x: 0, y: 0, width: 200, height: 200, rotation: 0}],
        behaviors: [{type: `${NPC}.alertZone`, name: "Bell", system: {lights: "", sounds: "", carryTo: "Gate Maps watch house", carrier: "bell", minutes: 0}}]}]);
      await sleep(300);
      const before = rt().alertLevel(scene);
      const ev0 = {kind: "alarm", scene: scene.id, noise: "loud", objectName: "Gate bell", heard: [], message: `gate-${Date.now()}`};
      const [card] = await rt().onMapEvent(ev0);
      const reached = rt().alertLevel(watchHouse) === "alarm";
      await rt().undoAlarmCard(card);
      const back = rt().alertLevel(watchHouse) === "calm";
      ok("8. a bell in an Alert zone carries the alarm to the watch house at once; Undo takes it back", !!card && reached && back, {before, reached, back, alert: watchHouse.flags?.[NPC]?.alert ?? null});
    });

    await step("9. trigger", async () => {
      await scene.createEmbeddedDocuments("Region", [{name: "Gate trigger", shapes: [{type: "rectangle", x: 1200, y: 1200, width: 300, height: 300, rotation: 0}],
        behaviors: [{type: `${NPC}.trigger`, name: "Trigger", system: {label: "the gate trigger", does: "note", who: "anyone", once: true, fired: false}}]}]);
      await sleep(400);
      const n = events.length;
      await tb.update({x: 1300, y: 1300}, {animate: false});
      const ev = await until(() => events.slice(n).find(e => e.kind === "trigger"), 5000);
      await sleep(500);
      const note = game.messages.contents.slice(-6).some(m => /reached the gate trigger/.test(m.content));
      const beh = scene.regions.find(r => r.name === "Gate trigger")?.behaviors?.contents?.[0] ?? null;
      ok("9. walking into a WoDX: Trigger region sends one trigger event and a note, and marks it set off", !!ev && note && beh?.system?.fired === true,
        {ev, note, fired: beh?.system?.fired ?? null, count: events.slice(n).filter(e => e.kind === "trigger").length});
    });
  } catch (e) { R.errors.push(String(e?.stack ?? e)); }
  finally {
    Hooks.off("wodxMapEvent", hook);
    CONFIG.Dice.randomUniform = keep.uniform;
    try {
      if ( game.time.worldTime !== keep.t0 ) await game.time.advance(keep.t0 - game.time.worldTime);
      const made = game.messages.filter(m => !keep.messages.has(m.id)).map(m => m.id);
      if ( made.length ) await ChatMessage.deleteDocuments(made);
      if ( keep.scene ) await game.scenes.get(keep.scene)?.view();
      if ( scene ) await scene.delete();
      if ( watchHouse ) await watchHouse.delete();
      for ( const a of [burglar, watchman] ) if ( a ) await a.delete();
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gate-maps-result.json");
}
