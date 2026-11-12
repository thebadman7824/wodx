/**
 * The last of the ways of moving (WoDX Combat 3.20.0, Interactables 0.35.0, Senses 0.8.0, NPC 0.45.3), in
 * rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateride.mjs?${Date.now()}`)).run()
 * Makes its own scene "WoDX gate: Riding" (gridless, 100 px), a deep-water region, a horse tile, two actors and two
 * tokens; views the scene, then goes back to the scene it started on and deletes everything it made.
 *   1. the apis and versions
 *   2. at the reins of a horse: the ride, the In the saddle stance, the mount's pace as the limit
 *   3. from the saddle down at someone on foot, and up at the rider
 *   4. a fight turn: 30 yards ridden gives 3 charge dice; a passenger gives none
 *   5. the rider moves: the horse and the passenger go along, and the passenger's own move is not counted
 *   6. off the horse: on foot again
 *   7. a load: armor's penalty and a burden count steps; too much, and deep water takes them under
 *   8. a lighter load swims slower, with the note on the card
 *   9. the senses from the air: easier sight, the stance line first
 *  10. someone prone is left out of the people in view and waits for a closer look
 *  11. every other WoDX module still answers
 * Result: Data/wodx-gate/gateride-result.json.
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
const createActors = async data => { const made = await Actor.create(data); return data.map(d => made.find(a => a.name === d.name) ?? null); };
const atLeast = (v, min) => foundry.utils.isNewerVersion(String(v ?? "0"), min) || String(v) === min;

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const back = canvas.scene, startMsgs = new Set(game.messages.map(m => m.id));
  const M = () => game.wodxCombat?.movement;
  const IX = () => game.modules.get("wodx-interactables")?.api;
  const SN = () => game.modules.get("wodx-senses")?.api;
  const T = () => game.modules.get("wodx-chronicle")?.api;
  const MOD = "wodx-interactables";
  let scene, actors = [], a, b, horse, combat = null;
  try {
    scene = await Scene.create({name: "WoDX gate: Riding", width: 3000, height: 1500, padding: 0, grid: {type: 0, size: G, distance: 5, units: "ft"}, tokenVision: false});
    await scene.view();
    await until(() => canvas.ready && canvas.scene?.id === scene.id, 10000);
    await scene.createEmbeddedDocuments("Region", [{name: "WoDX: Deep water", shapes: [{type: "rectangle", x: G * 20, y: G * 2, width: G * 6, height: G * 6}]}]);
    actors = await createActors([{name: "WoDX gate: Rider", type: "Mortal"}, {name: "WoDX gate: Squire", type: "Mortal"}]);
    await actors[0].update({"prototypeToken.actorLink": true});
    await scene.createEmbeddedDocuments("Token", [{name: "rider", actorId: actors[0].id, actorLink: true, x: G * 2, y: G * 2}, {name: "squire", actorId: actors[1].id, actorLink: false, x: G * 3, y: G * 2}]);
    a = scene.tokens.find(t => t.actorId === actors[0].id); b = scene.tokens.find(t => t.actorId === actors[1].id);
    await until(() => a.object && b.object);
    [horse] = await scene.createEmbeddedDocuments("Tile", [{x: G * 2, y: G * 2, width: G, height: G, texture: {src: "icons/svg/horse.svg"},
      flags: {[MOD]: {mount: true, mountKind: "horse", title: "Gate horse"}}}]);
    const cards = () => game.messages.filter(m => !startMsgs.has(m.id) && m.getFlag("wodx-combat", "movement"));
    const seat = (tok, tile) => ({a: tok.actorId, t: tok.uuid, n: tok.name, dx: tile.x - tok.x, dy: tile.y - tok.y});
    const pass = (tok, tile) => ({a: tok.actorId, t: tok.uuid, n: tok.name, dx: tok.x - tile.x, dy: tok.y - tile.y});

    await step("apis and versions", async () => {
      const v = {combat: game.wodxCombat?.version, ix: IX()?.version, senses: SN()?.version, npc: game.modules.get("wodx-npc")?.api?.version};
      ok("apis and versions", atLeast(v.combat, "3.20.0") && atLeast(v.ix, "0.35.0") && atLeast(v.senses, "0.8.0") && atLeast(v.npc, "0.45.3")
        && ["rideOf", "loadOf", "chargeOf", "setBurden", "burdenDialog"].every(k => typeof M()?.[k] === "function") && typeof IX()?.rideOf === "function"
        && typeof SN()?.rules?.withStance === "function", v);
    });
    await step("at the reins", async () => {
      await horse.update({[`flags.${MOD}.driver`]: seat(a, horse)});
      const ride = M().rideOf(a), stance = M().stanceOf(actors[0], a);
      const way = M().moveCheck(a, {x: a.x + G}, game.wodxCombat.movementFor(actors[0]));
      const want = M().rules.rideMove(ride, {skill: game.wodxCombat.ability(actors[0], "ride")?.value ?? 0}).limit;
      ok("at the reins", ride?.role === "reins" && ride.kind === "horse" && ride.yards === 30 && ride.saddle === true && stance === "mounted" && way.mode === "ride" && way.limit === want && [15, 30].includes(want),
        {ride, stance, way: {mode: way.mode, limit: way.limit, note: way.note}, want});
    });
    await step("saddle against foot", async () => {
      const down = M().attackMods(actors[0], b.actor, {attackerTok: a, targetTok: b}), up = M().attackMods(b.actor, actors[0], {attackerTok: b, targetTok: a});
      ok("saddle against foot", down.diff === -1 && down.notes.some(n => /From the saddle/.test(n)) && up.diff === 1 && up.notes.some(n => /Reaching up/.test(n)), {down, up});
    });
    await step("the charge", async () => {
      [combat] = await Combat.createDocuments([{scene: scene.id}]);
      await combat.createEmbeddedDocuments("Combatant", [{tokenId: a.id, sceneId: scene.id, actorId: actors[0].id}, {tokenId: b.id, sceneId: scene.id, actorId: b.actorId}]);
      await combat.startCombat();
      const tag = `${combat.id}:${combat.round}`;
      await a.setFlag("wodx-combat", "moved", {tag, yards: 30});
      const charge = M().chargeOf(actors[0], {attackerTok: a}), shot = M().chargeOf(actors[0], {attackerTok: a, ranged: true});
      await horse.update({[`flags.${MOD}.riders`]: [pass(b, horse)]});
      await b.setFlag("wodx-combat", "moved", {tag, yards: 30});
      const ride = M().rideOf(b), none = M().chargeOf(b.actor, {attackerTok: b});
      await b.unsetFlag("wodx-combat", "moved");
      ok("the charge", charge.dice === 3 && /V20 Dark Ages p\. 398/.test(charge.note) && shot.dice === 0 && ride?.role === "passenger" && none.dice === 0 && M().stanceOf(b.actor, b) === "mounted",
        {charge, shot, ride, none});
    });
    await step("carried along", async () => {
      const hx = horse.x, bx = b.x;
      await a.update({x: a.x + G * 2}, {animate: false});
      await until(() => horse.x !== hx && b.x !== bx, 6000);
      await sleep(300);
      const moved = b.getFlag("wodx-combat", "moved"), tag = `${combat.id}:${combat.round}`;
      ok("carried along", horse.x === hx + G * 2 && b.x === bx + G * 2 && !(moved?.tag === tag && moved.yards > 0) && M().rideOf(b)?.role === "passenger",
        {horse: [hx, horse.x], squire: [bx, b.x], squireMoved: moved ?? null, riderMoved: a.getFlag("wodx-combat", "moved")});
      await combat.delete(); combat = null;
    });
    await step("off the horse", async () => {
      await horse.update({[`flags.${MOD}.driver`]: null, [`flags.${MOD}.riders`]: []});
      const way = M().moveCheck(a, {x: a.x + G}, game.wodxCombat.movementFor(actors[0]));
      ok("off the horse", M().rideOf(a) === null && M().rideOf(b) === null && M().stanceOf(actors[0], a) === "standing" && way.mode === "walk" && way.limit === null, {way});
    });
    let armor = null;
    await step("too much to swim with", async () => {
      [armor] = await actors[0].createEmbeddedDocuments("Item", [{name: "Gate mail", type: "Armor", system: {isequipped: true, dexpenalty: 2, soak: {bashing: 3, lethal: 3, aggravated: 0}}}]);
      await M().setBurden(actors[0], 3);
      const load = M().loadOf(actors[0]);
      const before = cards().length;
      await a.update({x: G * 22, y: G * 4}, {animate: false});
      await until(() => !!a.getFlag("wodx-combat", "water") && cards().length > before);
      const text = cards().map(m => m.content.replace(/<[^>]+>/g, " ")).join(" | ");
      ok("too much to swim with", load.armor === 2 && load.burden === 3 && load.sinks === true && /too much to swim/.test(text) && M().stanceOf(actors[0], a) === "under",
        {load, stance: M().stanceOf(actors[0], a), cards: text.slice(-300)});
      await a.update({x: G * 6, y: G * 2}, {animate: false});
      await until(() => !a.getFlag("wodx-combat", "water"));
    });
    await step("a lighter load", async () => {
      await M().setBurden(actors[0], 0);
      const load = M().loadOf(actors[0]), base = game.wodxCombat.movementFor(actors[0]);
      const before = cards().length;
      await a.update({x: G * 22, y: G * 4}, {animate: false});
      await until(() => !!a.getFlag("wodx-combat", "water") && cards().length > before);
      const way = M().moveCheck(a, {x: a.x + G}, base);
      const free = M().rules.speedFor("swim", base, {}, {athletics: game.wodxCombat.ability(actors[0], "athletics")?.value ?? 0});
      const text = cards().slice(-1)[0]?.content.replace(/<[^>]+>/g, " ") ?? "";
      ok("a lighter load", load.steps === 2 && load.sinks === false && way.mode === "swim" && way.limit <= Math.max(1, Math.floor(free / 2)) && actors[0].getFlag("wodx-combat", "load") === undefined
        && (free <= 1 || /half speed/.test(text)), {load, way: {mode: way.mode, limit: way.limit, note: way.note}, free, card: text.slice(0, 300)});
      await a.update({x: G * 6, y: G * 2}, {animate: false});
      if ( armor ) await armor.delete();
    });
    await step("the senses from the air", async () => {
      const rise = await T().applyTimed(actors[0], {name: "Risen", key: "wodx-effect-rise", duration: {kind: "scene"}});
      await until(() => a.movementAction === "fly");
      await a.update({elevation: 20});
      await until(() => a.elevation === 20);
      const res = await SN().answer({token: a.uuid, user: game.user.id, sense: "sight", closer: false});
      const sec = res?.sections?.[0], line = SN().rules.STANCE_SENSES.flying.lines.sight;
      const pass = M().stanceOf(actors[0], a) === "flying" && !!sec && (sec.diff.blind || (sec.lines[0] === line && sec.diff.parts.some(p => /From the air -1/.test(p))));
      ok("the senses from the air", pass, {stance: M().stanceOf(actors[0], a), diff: sec?.diff, first: sec?.lines?.[0], blind: !!sec?.diff?.blind});
      await a.update({elevation: 0}); await rise.delete({wodxUndo: true}); await a.update({movementAction: "walk"});
    });
    await step("someone keeping low", async () => {
      await b.update({x: a.x + G * 2, y: a.y}, {animate: false});
      const count = () => { const g = SN().gatherSources(scene, a, actors[0]); return {low: g.sources.filter(s => s.id === `low.${b.id}`).length, people: g.sources.find(s => s.key === "people")?.people?.length ?? 0, need: g.sources.find(s => s.id === `low.${b.id}`)?.lines?.sight?.[0]?.n ?? null}; };
      const up = count();
      await b.update({movementAction: "crawl"});
      const down = count();
      await b.update({movementAction: "walk"});
      ok("someone keeping low", up.low === 0 && up.people === 1 && down.low === 1 && down.people === 0 && down.need === 1, {up, down});
    });
    await step("other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-otherworlds", "wodx-senses", "wodx-storyteller", "wodx-sheets"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("other modules", !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      if ( combat ) await combat.delete();
      if ( back && back.id !== scene?.id ) await back.view();
      if ( scene ) await scene.delete();
      for ( const x of actors ) await game.actors.get(x.id)?.delete();
      const made = game.messages.filter(m => !startMsgs.has(m.id) && (m.getFlag("wodx-combat", "movement") || m.flags?.["wodx-senses"] || /wsn/.test(m.content ?? ""))).map(m => m.id);
      if ( made.length ) await ChatMessage.deleteDocuments(made);
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gateride-result.json");
}
