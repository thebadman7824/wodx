/**
 * Battle deeds and aftermath gate (WoDX Storyteller 0.47.0, Otherworlds 0.18.0, Chronicle 0.45.1), in
 * rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatedeeds.mjs?${Date.now()}`)).run()
 * Fights a battle through the API, then removes the battle, the scene, the Ledger entries, messages and actors it made.
 * The world clock is put back where it was.
 *   1. the api is there (battleDeeds, battleAftermath)
 *   2. offering deeds gives the character one, saved on the battle, with a card to the Storyteller
 *   3. Swap changes the deed, Skip and Offer it again toggle it
 *   4. Roll records the dice from the sheet
 *   5. fighting the phase counts the rolled deed and clears the offers
 *   6. the window shows the deeds section before a phase and the aftermath once the battle is over
 *   7. the aftermath lines: the Legends book line, a Ledger entry and its Undo
 *   8. the Shroud line thins a scene's Shroud through Otherworlds drift, and Undo puts it back
 *   9. Old fields: the battle is felt a century later
 *  10. leaderDeed and deedSuccessesFor work with no sheet
 *  11. every other WoDX module still answers
 * Result: Data/wodx-gate/gatedeeds-result.json.
 */
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const wait = ms => new Promise(r => setTimeout(r, ms));

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const ST = "wodx-storyteller";
  const st = () => game.wodx?.storyteller ?? game.modules.get(ST)?.api;
  const t0 = Date.now(), time0 = game.time.worldTime;
  const msgsSince = () => game.messages.contents.filter(m => m.timestamp >= t0);
  let actor = null, scene = null, b = null, ledgerIds = [];
  try {
    [actor] = await Actor.create([{name: "WoDX gate: Deed fighter", type: "Mortal"}]);
    const upd = {"system.abilities.melee.value": 3, "system.abilities.brawl.value": 2, "system.abilities.athletics.value": 2, "system.abilities.leadership.value": 2};
    for ( const k of ["strength", "dexterity", "stamina", "charisma", "manipulation", "perception", "intelligence", "wits"] ) { upd[`system.attributes.${k}.value`] = 3; upd[`system.attributes.${k}.total`] = 3; }
    await actor.update(upd);
    b = await st().battles.start({name: "WoDX gate: The deeds field", place: "WoDX gate ford", year: 1420, kind: "field",
      sides: [{name: "WoDX gate: Crusaders", men: 20000, quality: 4, commander: {pool: 6}}, {name: "WoDX gate: Hussites", men: 18000, quality: 3, position: "works", defends: true, commander: {pool: 6}}],
      chars: [{actorId: actor.id, name: actor.name, side: 1, stance: "thick"}]});

    await step("api", async () => ok("api", typeof st()?.battleDeeds?.offer === "function" && typeof st()?.battleAftermath?.send === "function"
      && typeof st()?.battleDeeds?.leaderDeed === "function", {battle: !!b}));

    await step("offer", async () => {
      await st().battleDeeds.offer(b.id);
      const o = st().battles.get(b.id).offers;
      const card = msgsSince().some(m => /WoDX gate: The deeds field: In the line/.test(m.content));
      ok("offer", o?.list?.length === 1 && o.list[0].post === "line" && o.phase === 1 && card, {deed: o?.list?.[0]?.deedId, card});
    });

    await step("swap and skip", async () => {
      const before = st().battles.get(b.id).offers.list[0].deedId;
      await st().battleDeeds.swap(b.id, actor.id);
      const mid = st().battles.get(b.id).offers.list[0];
      await st().battleDeeds.skip(b.id, actor.id);
      const skipped = st().battles.get(b.id).offers.list[0].skip;
      await st().battleDeeds.skip(b.id, actor.id);
      const back = st().battles.get(b.id).offers.list[0].skip;
      ok("swap and skip", mid.deedId !== before && mid.shown.length === 2 && skipped === true && back === false, {before, after: mid.deedId});
    });

    await step("roll", async () => {
      await st().battleDeeds.roll(b.id, actor.id);
      const x = st().battles.get(b.id).offers.list[0];
      ok("roll", !!x.rolled && x.rolled.pool >= 4 && x.rolled.faces.length === x.rolled.pool, {rolled: x.rolled});
    });

    await step("fight counts the deed", async () => {
      const x = st().battles.get(b.id).offers.list[0];
      await st().battles.fight(b.id);
      const nb = st().battles.get(b.id), p = nb.phases.at(-1);
      const counted = p.deeds[1].some(d => d.name.includes(actor.name) && d.successes === (x.rolled.botch ? 0 : x.rolled.successes));
      ok("fight counts the deed", counted && nb.offers === null, {deeds: p.deeds});
    });

    await step("window", async () => {
      const app = await st().battles.open(b.id);
      await wait(400);
      const before = /Offer deeds for the next phase/.test(app.element?.innerHTML ?? "");
      await st().battles.draw(b.id);
      await wait(800);
      const after = /What the field leaves behind/.test(app.element?.innerHTML ?? "");
      ok("window", before && after, {before, after});
    });

    await step("aftermath to Legends and the Ledger", async () => {
      const rules = st().battleAftermath.rules;
      const nb = st().battles.get(b.id);
      const lines = rules.aftermathFor(nb, "medieval");
      await st().battleAftermath.send(b.id, "spoils", "legend");
      const legend = rules.legendExtras(st().battles.get(b.id)).length === 1;
      const res = lines.find(l => l.id === "resonance");
      await st().battleAftermath.send(b.id, "resonance", "ledger");
      const id = `field-${b.id}-resonance`.slice(0, 60);
      ledgerIds.push(id);
      const inLedger = st().ledger.state().entries.some(e => e.id === id && e.kind === "consequence");
      await st().battleAftermath.undo(b.id, "resonance", "ledger");
      const gone = !st().ledger.state().entries.some(e => e.id === id);
      ok("aftermath to Legends and the Ledger", lines.length >= 5 && !!res && legend && inLedger && gone, {dead: rules.deadOf(nb), lines: lines.map(l => l.id), legend, inLedger, gone});
    });

    await step("the Shroud thins", async () => {
      const ow = game.modules.get("wodx-otherworlds");
      if ( !ow?.active ) return ok("the Shroud thins", true, {skipped: "WoDX Otherworlds off"});
      scene = await Scene.create({name: "WoDX gate: Deeds field", width: 1000, height: 1000, flags: {"wodx-otherworlds": {ratings: {shroud: 6}}}});
      await st().battleAftermath.send(b.id, "wraiths", "drift", {sceneId: scene.id});
      const thin = ow.api.drift.of(game.scenes.get(scene.id)).shroud;
      await st().battleAftermath.undo(b.id, "wraiths", "drift");
      const back = ow.api.drift.of(game.scenes.get(scene.id)).shroud;
      ok("the Shroud thins", thin < 0 && back === 0, {thin, back});
    });

    await step("old fields", async () => {
      const rules = st().battleAftermath.rules;
      const old = rules.oldFields(st().battles.list(), 1520);
      ok("old fields", old.some(o => o.field.battleId === b.id && /chapel|cross/.test(o.echo.text)), {n: old.length});
    });

    await step("off-screen deeds", async () => {
      const D = st().battleDeeds;
      const l = D.leaderDeed({supernatural: 3, commander: {pool: 5}}, "feudal", {kind: "kindred", seed: "gate"});
      const r = D.deedSuccessesFor(l.pool, l.difficulty);
      ok("off-screen deeds", !!l.deed && r.faces.length === 5, {deed: l.deed.id, r});
    });

    await step("other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-library", "wodx-storyteller", "wodx-otherworlds", "wodx-creation"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("other modules", !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      try { await foundry.applications.instances?.get?.("wodx-battles")?.close?.(); } catch (e) { /* not open */ }
      if ( b ) await st()?.battles?.remove?.(b.id);
      for ( const id of ledgerIds ) await st()?.ledger?.remove?.(id);
      if ( scene ) await scene.delete();
      for ( const m of msgsSince() ) if ( /WoDX gate|Battles|battle/i.test(m.content) || m.speaker?.alias === "Battles" ) await m.delete();
      if ( actor ) await actor.delete();
      if ( game.time.worldTime !== time0 ) await game.time.advance(time0 - game.time.worldTime);
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatedeeds-result.json");
}
