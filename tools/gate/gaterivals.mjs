/**
 * Rivalries gate (WoDX NPC 0.17.0, Combat 3.10.0), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gaterivals.mjs?${Date.now()}`)).run()
 * Makes its own scene "WoDX gate: Rivals" (gridded, 100 px, 5 ft), a Garou NPC and a Kindred NPC (both Hostile
 * disposition), and puts every setting it touches back, deletes what it made and goes back to the scene it started on.
 *   1. api and settings
 *   2. the Garou can tell the Kindred for a Leech when it is obvious, and regards it Hostile
 *   3. Hunts (a Rivals line) and a sure roll: a Suggest card with source rivalry and the two sides
 *   4. Start the fight: both in it, the sides on the fight, and the Garou counts the Kindred an enemy
 *   5. truce ground: no card
 *   6. Tense: no card, a stand-off note instead
 *   7. Rivalries off: nothing
 *   8. the behaviour window and the Rivalries window open and close
 *   9. every other WoDX module still answers
 * Result: Data/wodx-gate/gaterivals-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const G = 100;
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
async function until(fn, ms = 5000) { const t = Date.now(); while ( Date.now() - t < ms ) { if ( fn() ) return true; await sleep(100); } return !!fn(); }

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const back = canvas.scene;
  const npcApi = () => game.modules.get("wodx-npc").api;
  const was = {mode: game.settings.get("wodx-combat", "fightStart"), riv: game.settings.get("wodx-npc", "rivalries")};
  let scene, actors = [], wolf, leech;
  const cards = t0 => game.messages.contents.filter(m => m.timestamp >= t0 && m.getFlag("wodx-combat", "fightStart"));
  const notes = t0 => game.messages.contents.filter(m => m.timestamp >= t0 && m.speaker?.alias === "WoDX NPC");
  const fightsHere = () => game.combats.contents.filter(c => c.scene?.id === scene?.id);
  const clearFights = async () => { for ( const c of fightsHere() ) await c.delete(); };
  const sure = {rng: () => 0};
  try {
    scene = await Scene.create({name: "WoDX gate: Rivals", width: 3000, height: 1500, padding: 0, grid: {type: 1, size: G, distance: 5, units: "ft"}, tokenVision: false});
    await scene.view();
    await until(() => canvas.ready && canvas.scene?.id === scene.id, 10000);
    actors = await Actor.create([
      {name: "WoDX gate: Rival wolf", type: "Mortal", flags: {"wodx-npc": {behavior: {template: "garou", aggression: 2, sides: "tribe:shadow lords"}}}},
      {name: "WoDX gate: Rival leech", type: "Mortal", flags: {"wodx-npc": {behavior: {template: "neonate", aggression: 1}, obvious: true}}}]);
    await game.wodxCombat.setKind(actors[0], "lupine");
    await game.wodxCombat.setKind(actors[1], "kindred");
    await scene.createEmbeddedDocuments("Token", [
      {name: "wolf", actorId: actors[0].id, x: G * 2, y: G * 5, actorLink: true, disposition: -1},
      {name: "leech", actorId: actors[1].id, x: G * 6, y: G * 5, actorLink: true, disposition: -1}]);
    wolf = scene.tokens.find(t => t.actorId === actors[0].id); leech = scene.tokens.find(t => t.actorId === actors[1].id);
    await until(() => wolf.object && leech.object);
    await game.settings.set("wodx-combat", "fightStart", "suggest");
    await game.settings.set("wodx-npc", "rivalries", true);

    await step("api and settings", async () => {
      const r = npcApi()?.rivalry;
      ok("api and settings", typeof r?.checkPair === "function" && typeof r?.regardOf === "function" && game.settings.settings.has("wodx-npc.rivalries")
        && !!game.wodxCombat?.fight?.rules?.SOURCES?.rivalry);
    });
    await step("regard", async () => {
      const r = npcApi().rivalry.regardOf(wolf.object, leech.object);
      const known = npcApi().rivalry.knownTo(wolf.object, leech.object);
      ok("regard", r.step === -2 && known.includes("line:kindred"), {step: r.step, why: r.why, known});
    });
    let card = null;
    await step("hunts: a card", async () => {
      await actors[0].setFlag("wodx-npc", "behavior", {...actors[0].getFlag("wodx-npc", "behavior"), rivals: "line:kindred -3"});
      const t0 = Date.now();
      const res = await npcApi().rivalry.checkPair(wolf.object, leech.object, scene, sure);
      await until(() => cards(t0).length, 4000);
      card = cards(t0)[0] ?? null;
      const f = card?.getFlag("wodx-combat", "fightStart");
      ok("hunts: a card", res?.done === "suggested" && f?.source === "rivalry" && f?.sides?.[wolf.id] && f.sides[wolf.id] !== f.sides[leech.id], {done: res?.done, why: f?.why, sides: f?.sides});
    });
    await step("start the fight", async () => {
      const el = document.querySelector(`[data-message-id="${card?.id}"] button.vtc-fight-go`);
      if ( el ) el.click();
      await until(() => fightsHere().some(c => c.started), 6000);
      const c = fightsHere().find(x => x.started);
      const sides = c?.getFlag("wodx-combat", "sides") ?? {};
      const foes = c ? npcApi().readFight(wolf.object, c).enemies.map(t => t.id) : [];
      ok("start the fight", !!c && sides[wolf.id] !== sides[leech.id] && foes.includes(leech.id), {button: !!el, sides, foes});
      await clearFights();
    });
    await step("truce ground", async () => {
      await scene.setFlag("wodx-npc", "truce", true);
      const fresh = (await scene.createEmbeddedDocuments("Token", [{name: "leech 3", actorId: actors[1].id, x: G * 4, y: G * 3, actorLink: true, disposition: -1}]))[0];
      await until(() => fresh.object);
      const t0 = Date.now();
      const res = await npcApi().rivalry.checkPair(wolf.object, fresh.object, scene, sure);
      await sleep(800);
      ok("truce ground", !cards(t0).length && res?.done !== "suggested", {done: res?.done ?? null});
      await scene.unsetFlag("wodx-npc", "truce");
    });
    await step("tense: words only", async () => {
      await actors[0].setFlag("wodx-npc", "behavior", {...actors[0].getFlag("wodx-npc", "behavior"), rivals: "line:kindred -1"});
      const fresh = (await scene.createEmbeddedDocuments("Token", [{name: "leech 2", actorId: actors[1].id, x: G * 4, y: G * 7, actorLink: true, disposition: -1}]))[0];
      await until(() => fresh.object);
      const t0 = Date.now();
      await npcApi().rivalry.checkPair(wolf.object, fresh.object, scene, sure);
      await sleep(800);
      ok("tense: words only", !cards(t0).length && notes(t0).length >= 1, {notes: notes(t0).length});
    });
    await step("rivalries off", async () => {
      await game.settings.set("wodx-npc", "rivalries", false);
      await actors[0].setFlag("wodx-npc", "behavior", {...actors[0].getFlag("wodx-npc", "behavior"), rivals: "line:kindred -3"});
      const t0 = Date.now();
      await npcApi().rivalry.watchRivals(wolf);
      await sleep(800);
      ok("rivalries off", !cards(t0).length);
      await game.settings.set("wodx-npc", "rivalries", true);
    });
    await step("windows", async () => {
      const p1 = npcApi().editBehavior(actors[0]);
      await until(() => document.querySelector(".wodx-npc-dialog input[name='rivals'], .wodx-npc-dialog textarea[name='rivals']"), 4000);
      const b = !!document.querySelector(".wodx-npc-dialog textarea[name='rivals']");
      document.querySelector(".wodx-npc-dialog button[data-action='cancel']")?.click();
      await p1;
      const p2 = npcApi().openRivalries();
      await until(() => document.querySelector(".wnpc-rivals"), 4000);
      const r = document.querySelectorAll(".wnpc-rivals input[type='checkbox']").length;
      document.querySelector(".wodx-npc-dialog button[data-action='cancel']")?.click();
      await p2;
      ok("windows", b && r >= 60, {behaviour: b, rows: r});
    });
    await step("other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-otherworlds", "wodx-storyteller"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("other modules", !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      await game.settings.set("wodx-combat", "fightStart", was.mode);
      await game.settings.set("wodx-npc", "rivalries", was.riv);
      await clearFights();
      if ( back && back.id !== scene?.id ) await back.view();
      if ( scene ) await scene.delete();
      for ( const x of actors ) await game.actors.get(x.id)?.delete();
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gaterivals-result.json");
}
