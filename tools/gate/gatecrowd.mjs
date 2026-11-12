/**
 * The crowd as a resource gate (WoDX NPC 0.40.0, Actions 3.52.0, B2220 to B2226), in rothenstein-wodx, as Gamemaster Test,
 * on a scene being viewed:
 *   await (await import(`/wodx-gate/gatecrowd.mjs?${Date.now()}`)).run()
 * Turns passers-by on for the viewed scene, adds a "Passers-by" door region, steps the street, and makes a test wraith
 * and a test mage. Everything it made is deleted and the scene's crowd setting and the pause are put back. The clock is not moved.
 *   1. versions: NPC 0.40.0 or later, Actions 3.52.0 or later, the crowd rules on both apis
 *   2. passers-by made on the scene (api.passersby.spawnOne, any hour); people carry a feeling and a spark (0 to 3), animals carry neither
 *   3. with a region named "Passers-by" on the scene, new passers-by walk in from inside it
 *   4. the crowd near a wraith lists a passer-by in sight with its feeling
 *   5. a Ravaged mark (flags.wodx-actions.crowdUse) keeps the passer-by on the map, why "ravaged"
 *   6. a Mage's Sleepers in sight include a passer-by person (the Cast's "with witnesses")
 *   7. every other WoDX module still answers
 * Result: Data/wodx-gate/gatecrowd-result.json.
 */
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const ver = (v, min) => { const a = String(v ?? "0").split(".").map(Number), b = min.split(".").map(Number); for ( let i = 0; i < 3; i++ ) { if ( (a[i] || 0) !== b[i] ) return (a[i] || 0) > b[i]; } return true; };
const wait = ms => new Promise(r => setTimeout(r, ms));

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const scene = canvas.scene;
  if ( !scene ) return "View a scene first.";
  const npc = game.modules.get("wodx-npc")?.api, act = game.wodxActions;
  const pb = npc?.passersby;
  const before = foundry.utils.deepClone(scene.getFlag("wodx-npc", "crowd") ?? null);
  const paused = game.paused;
  const made = {actors: [], tokens: [], regions: []};
  const isPB = t => !!t.flags?.["wodx-npc"]?.passerby;
  const g = scene.grid.size;
  const clearPB = async () => { const ids = scene.tokens.filter(isPB).map(t => t.id); if ( ids.length ) await scene.deleteEmbeddedDocuments("Token", ids, {wodxPasserby: true}); };
  const stepStreet = async n => { for ( let i = 0; i < n; i++ ) { await pb.tick(); await wait(150); } };
  // Make them whatever the hour, so the gate never moves the clock
  const spawnSome = async (people, animals) => { for ( let i = 0; i < people; i++ ) await pb.spawnOne(scene); for ( let i = 0; i < animals; i++ ) await pb.spawnOne(scene, {animal: true}); };
  try {
    await step("versions", async () => {
      ok("versions", ver(npc?.version, "0.40.0") && ver(act?.version, "3.52.0") && !!pb?.rules?.feelingFor && typeof act?.crowdNear === "function",
        {npc: npc?.version, actions: act?.version});
    });
    if ( paused ) game.togglePause(false, {broadcast: true});
    await scene.setFlag("wodx-npc", "crowd", {on: true, density: "busy", animals: true, doors: []});
    await clearPB();
    await step("feeling and spark", async () => {
      await spawnSome(3, 2);
      const people = scene.tokens.filter(t => isPB(t) && !t.flags["wodx-npc"].passerby.animal);
      const beasts = scene.tokens.filter(t => isPB(t) && t.flags["wodx-npc"].passerby.animal);
      const F = pb.rules.FEELINGS;
      const good = people.every(t => { const f = t.flags["wodx-npc"].passerby; return !!F[f.feeling] && Number.isInteger(f.spark) && f.spark >= 0 && f.spark <= 3; });
      const clean = beasts.every(t => t.flags["wodx-npc"].passerby.feeling === undefined);
      ok("feeling and spark", people.length > 0 && good && clean, {people: people.length, animals: beasts.length, sample: people.slice(0, 3).map(t => pb.mindOf(t))});
    });
    await step("door region", async () => {
      await clearPB();
      const w = scene.dimensions.sceneWidth, h = scene.dimensions.sceneHeight, x0 = scene.dimensions.sceneX, y0 = scene.dimensions.sceneY;
      const rect = {x: x0 + Math.round(w * 0.45), y: y0 + Math.round(h * 0.45), width: 3 * g, height: 3 * g};
      const [r] = await scene.createEmbeddedDocuments("Region", [{name: "Passers-by", shapes: [{type: "rectangle", ...rect}]}]);
      made.regions.push(r.id);
      const doors = pb.doorsOf(scene);
      await spawnSome(2, 0);
      const fresh = scene.tokens.filter(t => isPB(t));
      const inside = fresh.filter(t => { const c = {x: t.x + t.width * g / 2, y: t.y + t.height * g / 2};
        return c.x >= rect.x - g && c.x <= rect.x + rect.width + g && c.y >= rect.y - g && c.y <= rect.y + rect.height + g; });
      ok("door region", doors.length === 1 && fresh.length > 0 && inside.length >= 1, {doors: doors.length, fresh: fresh.length, inside: inside.length});
    });
    let wraith = null, victim = null;
    await step("crowd near a wraith", async () => {
      wraith = await Actor.create({name: "WoDX gate wraith", type: CONFIG.worldofdarkness?.sheettype?.wraith ?? "Wraith"});
      made.actors.push(wraith.id);
      victim = scene.tokens.find(t => isPB(t) && !t.flags["wodx-npc"].passerby.animal);
      if ( !victim ) throw new Error("no passer-by person on the scene");
      await victim.update({[`flags.wodx-npc.passerby.kept`]: true, [`flags.wodx-npc.passerby.why`]: "held", [`flags.wodx-npc.passerby.keptAt`]: Date.now()}, {wodxPasserby: true});
      const td = await wraith.getTokenDocument({x: victim.x + g, y: victim.y});
      const [tok] = await scene.createEmbeddedDocuments("Token", [td.toObject()]);
      made.tokens.push(tok.id);
      await wait(300);
      const near = act.crowdNear(wraith);
      const hit = near.find(m => m.id === victim.id);
      ok("crowd near a wraith", !!hit && !!hit.feeling && hit.passerby, {near: near.length, hit: hit ? {name: hit.name, feeling: hit.feeling, spark: hit.spark} : null});
    });
    await step("ravaged stays", async () => {
      if ( !victim ) throw new Error("no passer-by");
      await victim.update({[`flags.wodx-npc.passerby.kept`]: false}, {wodxPasserby: true});
      await victim.actor.setFlag("wodx-actions", "crowdUse", pb.rules.markRavaged({}, pb.rules.nightOf(game.time.worldTime)));
      await stepStreet(1);
      const f = scene.tokens.get(victim.id)?.flags?.["wodx-npc"]?.passerby;
      ok("ravaged stays", !!f?.kept && f.why === "ravaged", {kept: f?.kept, why: f?.why});
    });
    await step("mage witnesses", async () => {
      if ( !victim ) throw new Error("no passer-by");
      const mage = await Actor.create({name: "WoDX gate mage", type: CONFIG.worldofdarkness?.sheettype?.mage ?? "Mage"});
      made.actors.push(mage.id);
      const td = await mage.getTokenDocument({x: victim.x, y: victim.y + g});
      const [tok] = await scene.createEmbeddedDocuments("Token", [td.toObject()]);
      made.tokens.push(tok.id);
      await wait(300);
      const o = act.observersOf(tok.object, {secret: "mage", exclude: [mage.id]});
      ok("mage witnesses", (o?.breach ?? []).some(t => t.document?.id === victim.id), {breach: (o?.breach ?? []).map(t => t.name)});
    });
    await step("other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-library", "wodx-storyteller", "wodx-atmosphere", "wodx-senses", "wodx-otherworlds"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("other modules", !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      const toks = made.tokens.filter(id => scene.tokens.get(id));
      if ( toks.length ) await scene.deleteEmbeddedDocuments("Token", toks);
      await clearPB();
      if ( made.regions.length ) await scene.deleteEmbeddedDocuments("Region", made.regions.filter(id => scene.regions.get(id)));
      for ( const id of made.actors ) await game.actors.get(id)?.delete();
      if ( before ) await scene.setFlag("wodx-npc", "crowd", before); else await scene.unsetFlag("wodx-npc", "crowd");
      if ( paused && !game.paused ) game.togglePause(true, {broadcast: true});
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatecrowd-result.json");
}
