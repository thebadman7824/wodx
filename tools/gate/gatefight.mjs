/**
 * Fight starter gate (WoDX Combat 3.9.0, NPC 0.15.0, Chronicle 0.18.1), in rothenstein-wodx (the testing world), as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gatefight.mjs?${Date.now()}`)).run()
 * Makes its own scene "WoDX gate: Fight" (gridded, 100 px, 5 ft), a wall, a guard NPC and a character owned by the first
 * player user; puts every setting it touches back, deletes what it made and goes back to the scene it started on.
 *   1. api and settings
 *   2. Suggest: a hostile NPC who sees the character whispers a card, and no fight starts yet
 *   3. Start the fight on that card starts it with both
 *   4. Undo takes it back
 *   5. a wall between them: no card
 *   6. Auto: the starter starts it at once, with Undo on the card
 *   7. an attack outside a fight asks for one
 *   8. a door or region outcome "fight" asks for one
 *   9. a frenzy outside a fight asks for one
 *  10. Off: nothing
 *  11. an attack from hiding rolls the ambush first (Combat 3.11.0)
 *  12. every other WoDX module still answers
 * Result: Data/wodx-gate/gatefight-result.json.
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

// Foundry 14 may hand back a batch of new actors out of order: match each one to its data by name
const createActors = async data => { const made = await Actor.create(data); return data.map(d => made.find(a => a.name === d.name) ?? null); };

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const back = canvas.scene;
  const api = () => game.wodxCombat?.fight;
  const was = {mode: game.settings.get("wodx-combat", "fightStart"), yards: game.settings.get("wodx-combat", "fightSightYards")};
  const player = game.users.find(u => !u.isGM);
  let scene, actors = [], npc, pc;
  const cards = t0 => game.messages.contents.filter(m => m.timestamp >= t0 && m.getFlag("wodx-combat", "fightStart"));
  const fightsHere = () => game.combats.contents.filter(c => c.scene?.id === scene?.id);
  const clearFights = async () => { for ( const c of fightsHere() ) await c.delete(); };
  try {
    if ( !player ) R.notes.push("no player user: the character has no player owner, so the sight steps cannot run");
    scene = await Scene.create({name: "WoDX gate: Fight", width: 3000, height: 1500, padding: 0, grid: {type: 1, size: G, distance: 5, units: "ft"}, tokenVision: false});
    await scene.view();
    await until(() => canvas.ready && canvas.scene?.id === scene.id, 10000);
    actors = await createActors([
      {name: "WoDX gate: Fight guard", type: "Mortal", flags: {"wodx-npc": {behavior: {template: "guard"}}}},
      {name: "WoDX gate: Fight character", type: "Mortal", ownership: player ? {default: 0, [player.id]: 3} : {default: 0}}]);
    await game.modules.get("wodx-npc").api.attitude.apply(actors[0], actors[1], {to: -2, why: "gate"});
    await scene.createEmbeddedDocuments("Token", [
      {name: "guard", actorId: actors[0].id, x: G * 2, y: G * 5, actorLink: true}, {name: "character", actorId: actors[1].id, x: G * 25, y: G * 5, actorLink: true}]);
    npc = scene.tokens.find(t => t.actorId === actors[0].id); pc = scene.tokens.find(t => t.actorId === actors[1].id);
    await until(() => npc.object && pc.object);
    await game.settings.set("wodx-combat", "fightSightYards", 30);

    await step("api and settings", async () => {
      ok("api and settings", typeof api()?.start === "function" && typeof api()?.afterAttack === "function"
        && game.settings.settings.has("wodx-combat.fightStart") && typeof game.modules.get("wodx-npc").api.kinNear === "function");
    });
    let card = null;
    await step("suggest on sight", async () => {
      await game.settings.set("wodx-combat", "fightStart", "suggest");
      const t0 = Date.now();
      await pc.update({x: G * 6, y: G * 5});
      await until(() => cards(t0).length, 6000);
      card = cards(t0)[0] ?? null;
      // No card: ask the watcher why, so the result says which check stopped it
      const why = card ? null : await game.modules.get("wodx-npc").api.routines.watchFoes?.(pc);
      if ( why && !card ) card = cards(t0)[0] ?? null;
      const f = card?.getFlag("wodx-combat", "fightStart");
      if ( why ) R.notes.push({sightCheck: why, pcAt: [pc.x, pc.y], npcAt: [npc.x, npc.y]});
      ok("suggest on sight", !!card && f?.source === "sight" && f.tokens.includes(npc.id) && f.tokens.includes(pc.id) && !fightsHere().some(c => c.started),
        {source: f?.source, why: f?.why});
    });
    await step("start the fight", async () => {
      // The chat log may draw the card late, or not at all when hidden: wait for the button, else accept through the api
      await until(() => document.querySelector(`[data-message-id="${card?.id}"] button.vtc-fight-go`), 3000);
      const el = document.querySelector(`[data-message-id="${card?.id}"] button.vtc-fight-go`);
      if ( el ) el.click(); else if ( card ) await api().accept(card);
      await until(() => fightsHere().some(c => c.started), 6000);
      const c = fightsHere().find(x => x.started);
      ok("start the fight", !!c && c.combatants.some(x => x.tokenId === npc.id) && c.combatants.some(x => x.tokenId === pc.id), {button: !!el, byApi: !el});
    });
    await step("undo", async () => {
      if ( !fightsHere().some(c => c.started) ) return ok("undo", false, {note: "no fight to take back"});
      await until(() => document.querySelector(`[data-message-id="${card?.id}"] button.vtc-fight-undo`), 3000);
      const el = document.querySelector(`[data-message-id="${card?.id}"] button.vtc-fight-undo`);
      if ( el ) el.click(); else if ( card ) await api().undo(game.messages.get(card.id));
      await until(() => !fightsHere().length, 5000);
      ok("undo", !fightsHere().length);
    });
    await step("a wall blocks the view", async () => {
      await scene.createEmbeddedDocuments("Wall", [{c: [G * 10, 0, G * 10, G * 15]}]);
      await pc.update({x: G * 14, y: G * 5});
      await sleep(400);
      const t0 = Date.now();
      await pc.update({x: G * 13, y: G * 6});
      await sleep(2500);
      ok("a wall blocks the view", !cards(t0).length);
    });
    await step("auto starts at once", async () => {
      await game.settings.set("wodx-combat", "fightStart", "auto");
      const t0 = Date.now();
      const r = await api().start({scene, tokens: [npc, pc], source: "hand", why: "gate"});
      const c = fightsHere().find(x => x.started);
      await until(() => cards(t0).length, 3000);
      ok("auto starts at once", r.done === "started" && !!c && !!cards(t0)[0]?.getFlag("wodx-combat", "fightStart")?.done, {done: r.done});
      await clearFights();
    });
    await game.settings.set("wodx-combat", "fightStart", "suggest");
    await step("attack outside a fight", async () => {
      const t0 = Date.now();
      const r = await api().afterAttack(pc, npc);
      await until(() => cards(t0).length, 3000);
      ok("attack outside a fight", r?.done === "suggested" && cards(t0)[0]?.getFlag("wodx-combat", "fightStart")?.source === "attack", {done: r?.done});
    });
    await step("outcome fight", async () => {
      const t0 = Date.now();
      const res = await game.modules.get("wodx-chronicle").api.when.run("fight", {token: pc, actor: pc.actor, scene, label: "the gate"});
      await until(() => cards(t0).length, 3000);
      ok("outcome fight", res.done.includes("fight") && cards(t0)[0]?.getFlag("wodx-combat", "fightStart")?.source === "outcome", {res});
    });
    await step("frenzy outside a fight", async () => {
      await pc.update({x: G * 4, y: G * 5});
      await sleep(1500);
      const t0 = Date.now();
      await actors[0].update({"system.conditions.isfrenzy": true});
      await until(() => cards(t0).some(m => m.getFlag("wodx-combat", "fightStart")?.source === "frenzy"), 4000);
      ok("frenzy outside a fight", cards(t0).some(m => m.getFlag("wodx-combat", "fightStart")?.source === "frenzy"));
      await actors[0].update({"system.conditions.isfrenzy": false});
    });
    await step("off does nothing", async () => {
      await game.settings.set("wodx-combat", "fightStart", "off");
      const r = await api().start({scene, tokens: [npc, pc], source: "hand", byHand: true});
      ok("off does nothing", r.done === "off" && !fightsHere().length);
    });
    await step("ambush from hiding", async () => {
      await clearFights();
      await pc.update({hidden: true});
      const t0 = Date.now();
      await game.wodxCombat.quickAttack({attacker: pc.object, target: npc.object});
      await until(() => game.messages.contents.some(m => m.timestamp >= t0 && m.getFlag("wodx-combat", "ambush")), 4000);
      const m = game.messages.contents.find(x => x.timestamp >= t0 && x.getFlag("wodx-combat", "ambush"));
      ok("ambush from hiding", !!m, {result: m?.getFlag("wodx-combat", "ambush")?.result, book: m?.getFlag("wodx-combat", "ambush")?.book});
      await pc.update({hidden: false});
      await actors[0].update({"system.health.damage": {bashing: 0, lethal: 0, aggravated: 0}});
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
      await game.settings.set("wodx-combat", "fightSightYards", was.yards);
      await clearFights();
      if ( back && back.id !== scene?.id ) await back.view();
      if ( scene ) await scene.delete();
      for ( const x of actors ) await game.actors.get(x.id)?.delete();
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatefight-result.json");
}
