/**
 * Chases and pursuit gate (WoDX Interactables 0.26.0), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatechase.mjs?${Date.now()}`)).run()
 * Makes a small scene with two actors and a horse tile, views it, runs a chase through the API (no windows), then
 * deletes everything it made and goes back to the scene that was viewed. The clock is not moved.
 *   1. the api is there, and "A chase" is in the Storyteller's hand
 *   2. start: the state sits in the scene flag, the lead turns into the quarry's head start, the rider at the reins starts on the horse
 *   3. the ways offered follow the chronicle's year (no car before 1900, cars from then)
 *   4. a turn: the turn count goes up, a public card in words and a Storyteller card with dice, whispered to the GMs
 *   5. Undo on the Storyteller card puts the state back
 *   6. turns to an end: caught or away within 30 turns; on a catch the card has Start a fight
 *   7. end clears the scene flag
 *   8. every other WoDX module still answers
 * Result: Data/wodx-gate/gatechase-result.json.
 */
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

const createActors = async data => { const made = await Actor.create(data); return data.map(d => made.find(a => a.name === d.name) ?? null); };

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const MOD = "wodx-interactables";
  const api = () => game.modules.get(MOD)?.api?.chase;
  const was = canvas.scene?.id ?? null;
  const t0 = Date.now();
  let scene, actors = [];
  const msgsSince = () => game.messages.contents.filter(m => m.timestamp >= t0);
  try {
    actors = await createActors([{name: "WoDX gate: Runner", type: "Mortal"}, {name: "WoDX gate: Rider", type: "Mortal"}]);
    for ( const a of actors ) await a.update({"system.attributes.dexterity.value": 3, "system.abilities.athletics.value": 2});
    scene = await Scene.create({name: "WoDX gate: chase", width: 2000, height: 1000, grid: {size: 100, distance: 5, units: "ft"}});
    await scene.view();
    await new Promise(r => setTimeout(r, 1500));
    const [qt, pt] = await scene.createEmbeddedDocuments("Token", [
      {name: "Runner", actorId: actors[0].id, x: 1000, y: 400},
      {name: "Rider", actorId: actors[1].id, x: 400, y: 400}]);
    const [horse] = await scene.createEmbeddedDocuments("Tile", [{x: 400, y: 400, width: 100, height: 100, texture: {src: "icons/svg/mystery-man.svg"},
      flags: {[MOD]: {mount: true, mountKind: "horse", driver: {a: actors[1].id, t: pt.uuid, dx: 0, dy: 0}, riders: []}}}]);
    R.notes.push({horseFlags: horse.flags?.[MOD]});

    await step("api and the hand", async () => {
      const hand = game.wodx?.storyteller?.hand;
      const inHand = !hand || !hand.tools ? "unknown" : hand.tools.some?.(t => t.key === "chase");
      ok("api and the hand", typeof api()?.start === "function" && typeof api()?.rollTurn === "function", {inHand});
    });
    let st;
    await step("start", async () => {
      st = await api().start(scene, {quarry: qt.id, pursuers: [pt.id], ground: "open", lead: 30});
      const flag = scene.getFlag(MOD, "chase");
      const p = flag?.pursuers?.[0];
      ok("start", flag?.status === "running" && flag.quarry.total === 15 && ["horse", "foot"].includes(p?.way), {way: p?.way, total: flag?.quarry?.total});
      if ( p?.way !== "horse" ) R.notes.push("the rider did not start on the horse: check the mount tile flags");
    });
    await step("ways by year", async () => {
      const C = api().rules, year = Number(game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.()) || 0;
      const ids = C.waysIn(year).map(w => w.id);
      ok("ways by year", ids.includes("foot") && (year < 1900 ? !ids.includes("car") : ids.includes("car")) && !C.waysIn(1197).some(w => w.id === "car"), {year, ids});
    });
    let gmCard;
    await step("a turn", async () => {
      const before = msgsSince().length;
      const s2 = await api().rollTurn(scene);
      const fresh = msgsSince().slice(before);
      gmCard = fresh.find(m => m.flags?.[MOD]?.chaseTurn);
      const pub = fresh.find(m => !m.flags?.[MOD]?.chaseTurn && /The chase, turn/.test(m.content));
      const gms = game.users.filter(u => u.isGM).map(u => u.id).sort();
      ok("a turn", s2?.turn === 1 && !!pub && !(pub.whisper ?? []).length && !!gmCard && [...gmCard.whisper].sort().join() === gms.join()
        && /\bdice at\b/.test(gmCard.content) && !/\bdice at\b/.test(pub.content), {turn: s2?.turn, status: s2?.status});
    });
    await step("undo", async () => {
      await api().undoTurn(gmCard);
      const flag = scene.getFlag(MOD, "chase");
      ok("undo", flag?.turn === 0 && flag.quarry.total === 15 && !flag.caughtBy, {turn: flag?.turn});
    });
    await step("to an end", async () => {
      let s = scene.getFlag(MOD, "chase"), n = 0;
      while ( s?.status === "running" && n < 30 ) { s = await api().rollTurn(scene); n++; }
      const last = msgsSince().filter(m => m.flags?.[MOD]?.chaseTurn).pop();
      const fightBtn = /wix-chase-fight/.test(last?.content ?? "");
      ok("to an end", ["caught", "away"].includes(s?.status) && (s.status !== "caught" || fightBtn), {status: s?.status, turns: n, fightBtn});
    });
    await step("end", async () => {
      await api().end(scene);
      ok("end", !scene.getFlag(MOD, "chase"));
    });
    await step("other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-library", "wodx-storyteller"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("other modules", !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      for ( const m of msgsSince() ) if ( /chase/i.test(m.content) ) await m.delete();
      if ( was && game.scenes.get(was) ) await game.scenes.get(was).view();
      if ( scene ) await scene.delete();
      for ( const a of actors ) await a.delete();
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatechase-result.json");
}
