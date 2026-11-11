/**
 * "Only when" lists (WoDX Chronicle 0.14.0) and NPC phases (WoDX NPC 0.9.0), in Foundry, in rothenstein-wodx only,
 * as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatewhen.mjs?${Date.now()}`)).run()
 * It makes one Vampire actor, its token and one region on the scene in view, and deletes them at the end.
 *   1. the modules: Chronicle 0.14.0+ with api.when, NPC 0.9.0+
 *   2. the world: this year and the clock's night pass; the year before does not
 *   3. the character: kind, Blood pool, wounds, carries, not; a list with a mistake never passes
 *   4. a WoDX: Trigger region with "Only when" and "Then also": fires and tells the Storyteller only when the list fits
 *   5. an NPC phase comes in when the NPC is hurt, and goes when healed
 *   6. a stock list on a container draws, and a fresh draw takes away what the last one left (Interactables 0.23.0)
 *   7. a Ledger objective ticks a step from the Trigger region's map event, and is kept when every step is done
 *   8. a faction's regard for the character moves by a Then outcome, and a test reads it (NPC 0.9.0)
 *   9. clean up
 * Result: Data/wodx-gate/gatewhen-result.json.
 */
const CH = "wodx-chronicle", NPC = "wodx-npc";
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gatewhen-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const C = game.modules.get(CH), N = game.modules.get(NPC), W = C?.api?.when;
  const scene = canvas.scene;
  let actor = null, token = null, region = null;
  const marker = `gate-when-${Date.now()}`;
  const started = Date.now(), made = {};
  const whispers = () => game.messages.contents.filter(m => (m.content ?? "").includes(marker));
  try {
    ok("1. modules", C?.active && N?.active && !foundry.utils.isNewerVersion("0.14.0", C.version) && !foundry.utils.isNewerVersion("0.9.0", N.version) && !!W?.check && !!W?.run,
      {chronicle: C?.version, npc: N?.version});
    const ctx = W.context({});
    const y = ctx.year;
    const a = W.check(`year ${y}-${y}`).ok, b = W.check(ctx.night ? "night" : "day").ok, c = W.check(`year ${y - 1}-${y - 1}`).ok;
    ok("2. the world", a && b && !c && !!ctx.era, {year: y, night: ctx.night, era: ctx.era, hour: ctx.hour});

    actor = await Actor.create({name: "WoDX gate: When", type: "Vampire"});
    await sleep(300);
    await actor.update({"system.advantages.bloodpool.temporary": 3});
    await actor.createEmbeddedDocuments("Item", [{name: "Silver crucifix", type: "Item"}]).catch(e => R.notes.push(`item: ${e.message}`));
    const ac = W.context({actor});
    const t1 = W.check("kind kindred; blood <= 3; carries silver; not wounded", {actor});
    const t2 = W.check("blood < 3", {actor});
    const t3 = W.check("blood is low", {actor});
    ok("3. the character", ac.actor?.kind === "kindred" && t1.ok && !t2.ok && !t3.ok && t3.problems.length === 1,
      {kind: ac.actor?.kind, traits: ac.actor?.traits, items: ac.actor?.items, t1, t2: t2.failed, t3: t3.problems});

    const [td] = await scene.createEmbeddedDocuments("Token", [{name: "WoDX gate: When", actorId: actor.id, x: 0, y: 0, hidden: true}]);
    token = td;
    const g = scene.grid?.size ?? 100;
    const TRIG = `${NPC}.trigger`;
    const [rd] = await scene.createEmbeddedDocuments("Region", [{name: "WoDX gate: When region", shapes: [{type: "rectangle", x: 0, y: 0, width: g * 2, height: g * 2}],
      behaviors: [{type: TRIG, name: "gate", system: {label: "the gate's spot", does: "event", who: "anyone", when: "named gate: when; blood <= 3", then: `tell ${marker} {name}`}}]}]);
    region = rd;
    const behavior = region.behaviors.contents[0];
    const fire = () => N.api.routines.onTrigger(behavior.system, {data: {token}, region});
    const before = whispers().length;
    const ev1 = await fire(); await sleep(600);
    const after1 = whispers().length;
    await behavior.update({"system.when": "named nobody at all"});
    await sleep(5200);
    const ev2 = await fire(); await sleep(600);
    const after2 = whispers().length;
    ok("4. a Trigger region with Only when", behavior.type === TRIG && !!ev1 && after1 === before + 1 && !ev2 && after2 === after1,
      {type: behavior.type, ev1: !!ev1, ev2: !!ev2, before, after1, after2, text: whispers()[0]?.content?.slice(0, 160)});

    await actor.setFlag(NPC, "behavior", {phases: "Hurt: wounds >= hurt => aggression 2, fleeAt 8"});
    const p0 = N.api.profileFor(actor);
    await actor.update({"system.health.damage.lethal": 2});
    await sleep(300);
    const p1 = N.api.profileFor(actor);
    await actor.update({"system.health.damage.lethal": 0});
    await sleep(300);
    const p2 = N.api.profileFor(actor);
    ok("5. an NPC phase", !p0.phase && p1.phase === "Hurt" && p1.aggression === 2 && p1.fleeAt === 8 && !p2.phase,
      {p0: p0.phase ?? null, p1: {phase: p1.phase, aggression: p1.aggression, fleeAt: p1.fleeAt}, p2: p2.phase ?? null});

    const IX = game.modules.get("wodx-interactables");
    const [tile] = await scene.createEmbeddedDocuments("Tile", [{x: g * 4, y: 0, width: g, height: g, hidden: true, texture: {src: "icons/svg/chest.svg"},
      flags: {"wodx-interactables": {container: true, kind: "chest", items: "the gate's own ledger", stock: "always: a gate candle\n1 in 1: 2-2 gate pennies\nwhen year < 1000: always: a gate anachronism", restock: "week"}}}]);
    made.tile = tile;
    const d1 = await IX.api.stock.draw(tile);
    const d2 = await IX.api.stock.draw(scene.tiles.get(tile.id));
    ok("6. a stock list", !foundry.utils.isNewerVersion("0.23.0", IX.version) && JSON.stringify(d1) === JSON.stringify(["the gate's own ledger", "a gate candle", "gate pennies (2)"])
      && JSON.stringify(d2) === JSON.stringify(d1), {d1, d2, version: IX.version});

    const ST = game.modules.get("wodx-storyteller")?.api;
    const keepLedger = foundry.utils.deepClone(game.settings.get("wodx-storyteller", "ledger"));
    made.ledger = keepLedger;
    const ent = await ST.ledger.save({kind: "objective", what: `${marker} objective`, from: {id: actor.id, name: actor.name}, steps: "reach the gate's spot"});
    await behavior.update({"system.when": "", "system.then": ""});
    await sleep(5200);
    await fire(); await sleep(1500);
    const after = ST.ledger.state().entries.find(e => e.id === ent.id);
    ok("7. a Ledger objective", after?.steps?.[0]?.done === true && after.status === "kept", {steps: after?.steps, status: after?.status});

    const FX = N.api.factions;
    const keepF = foundry.utils.deepClone(game.settings.get(NPC, "factions"));
    made.factions = keepF;
    await FX.mutate(st => { st.factions.push({id: "gatefx", name: "The gate's own faction", kind: "mortal"}); return {state: st}; });
    await W.run("standing gate's own faction to welcome", {actor});
    const s1 = W.check("standing gate's own faction >= welcome", {actor}).ok;
    await W.run("standing gate's own faction -3", {actor});
    const s2 = W.check("standing gate's own faction <= distrusted", {actor}).ok;
    ok("8. faction standing", s1 && s2, {s1, s2, now: FX.peopleOf(actor.id)});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      if ( made.ledger ) await game.settings.set("wodx-storyteller", "ledger", made.ledger);
      if ( made.factions ) await game.settings.set(NPC, "factions", made.factions);
      if ( made.tile ) await scene.tiles.get(made.tile.id)?.delete();
      for ( const m of game.messages.contents.filter(m => /long tasks|objective|gate's/i.test(m.content ?? "") && m.timestamp > started) ) await m.delete();
      for ( const m of whispers() ) await m.delete();
      if ( region ) await scene.regions.get(region.id)?.delete();
      if ( token ) await scene.tokens.get(token.id)?.delete();
      if ( actor ) await game.actors.get(actor.id)?.delete();
      ok("9. clean up", (!actor || !game.actors.get(actor.id)) && (!region || !scene.regions.get(region.id)) && !whispers().length);
    } catch (err) { ok("9. clean up", false, {error: err.message}); }
  }
  return save(R);
}
