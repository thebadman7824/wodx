/**
 * Anachronism check gate (WoDX Sheets 0.8.0), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateanachronism.mjs?${Date.now()}`)).run()
 * Makes one actor with three things dated by WoDX Library flags, reads them across a jump, posts the card, keeps one,
 * runs the clock check once with a stored year 200 years back, then puts the stored year back and deletes what it made.
 * The clock itself is not moved.
 *   1. the api and the world setting are there, and the check is on in this world
 *   2. 1500 to 1900: the longsword and the flintlock are antiques; the bread says nothing
 *   3. the card goes to the Storyteller alone, with a Keep button for each
 *   4. Keep marks the item and the next read leaves it out
 *   5. the clock check reads the jump from the stored year and stores the year now
 *   6. every other WoDX module still answers
 * Sheets 0.14.0 with Interactables 0.34.0, on two tiles the gate puts on one scene and takes off again:
 *   7. the maps: back from 2020 to 1850 the motor car and the radio in the chest's company are not made yet; the horse says nothing
 *   8. the card has an "On the maps" part with Keep it and Show me for each
 *   9. Keep it marks the tile, the next read leaves it out, and the kept car can be driven in any year
 *  10. "Out of their time" is in the Storyteller's hand
 * Result: Data/wodx-gate/gateanachronism-result.json.
 */
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
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const MOD = "wodx-sheets";
  const api = () => game.modules.get(MOD)?.api?.anachronism;
  const stored = foundry.utils.deepClone(game.settings.get(MOD, "anachronismAt") ?? {});
  let actor, msgs = [], tiles = [], scene = null;
  const IX = "wodx-interactables";
  const lib = (firstYear, lastYear) => ({"wodx-library": {firstYear, lastYear}});
  try {
    actor = await Actor.create({name: "WoDX gate: Anachronism", type: "Mortal"});
    await actor.createEmbeddedDocuments("Item", [
      {name: "WoDX gate longsword", type: "Item", flags: lib(1100, 1600)},
      {name: "WoDX gate flintlock", type: "Item", flags: lib(1600, 1850)},
      {name: "WoDX gate bread", type: "Item"}]);
    const before = {era: "renaissance", year: 1500}, after = {era: "victorian", year: 1900};

    await step("api and setting", async () => {
      const mode = game.settings.get(MOD, "anachronism");
      ok("api and setting", typeof api()?.scan === "function" && ["auto", "on"].includes(mode), {mode});
    });
    await step("the jump", async () => {
      const found = await api().scan(before, after, [actor]);
      const got = (found[0]?.items ?? []).map(i => `${i.name}:${i.status}`).sort();
      ok("the jump", got.join() === "WoDX gate flintlock:late,WoDX gate longsword:late", {got});
    });
    await step("the card", async () => {
      const m = await api().report(before, after, [actor]);
      if ( m ) msgs.push(m);
      const gms = game.users.filter(u => u.isGM).map(u => u.id).sort();
      const n = (m?.content.match(/data-wodx-keep=/g) ?? []).length;
      ok("the card", !!m && [...(m.whisper ?? [])].sort().join() === gms.join() && n === 2, {buttons: n});
    });
    await step("keep", async () => {
      const sword = actor.items.find(i => i.name === "WoDX gate longsword");
      await api().keep(actor.id, sword.id);
      const found = await api().scan(before, after, [actor]);
      const names = (found[0]?.items ?? []).map(i => i.name);
      ok("keep", !!sword.flags?.[MOD]?.keepOutOfEra && !names.includes("WoDX gate longsword") && names.includes("WoDX gate flintlock"), {names});
    });
    await step("the clock check", async () => {
      const chron = game.modules.get("wodx-chronicle")?.api;
      const now = {era: chron?.eras?.activeEra?.()?.profile?.id ?? null, year: Number(chron?.eras?.currentYear?.()) || 0};
      await game.settings.set(MOD, "anachronismAt", {era: now.era, year: now.year - 200});
      const m = await api().check();
      if ( m ) msgs.push(m);
      const at = game.settings.get(MOD, "anachronismAt");
      ok("the clock check", at.year === now.year && at.era === now.era, {now, at, card: !!m});
    });
    if ( game.modules.get(IX)?.active ) {
      scene = canvas.scene ?? (await K.scene());
      const back = {era: "modern", year: 2020}, then = {era: "victorian", year: 1850};
      await step("the maps", async () => {
        const at = {x: 0, y: 0, width: 100, height: 100, hidden: true, texture: {src: null}};
        tiles = await scene.createEmbeddedDocuments("Tile", [
          {...at, flags: {[IX]: {mount: true, mountKind: "car", title: "WoDX gate car"}}},
          {...at, flags: {[IX]: {watch: true, watchKind: "radio", title: "WoDX gate radio"}}},
          {...at, flags: {[IX]: {mount: true, mountKind: "horse", title: "WoDX gate horse"}}}]);
        const mine = new Set(tiles.map(t => t.id));
        const got = (await api().scanMaps(back, then, [scene])).filter(r => mine.has(r.id)).map(r => `${r.key}:${r.status}`).sort();
        ok("the maps", got.join() === "mount:early,watch:early", {got, scene: scene.name});
      });
      await step("the map card", async () => {
        const mine = new Set(tiles.map(t => t.id));
        const rows = (await api().scanMaps(back, then, [scene])).filter(r => mine.has(r.id));
        const m = await api().report(back, then, [], {maps: rows});
        if ( m ) msgs.push(m);
        const keep = (m?.content.match(/data-wodx-keep-map=/g) ?? []).length, show = (m?.content.match(/data-wodx-show-map=/g) ?? []).length;
        ok("the map card", !!m && /On the maps/.test(m.content) && keep === 2 && show === 2, {keep, show});
      });
      await step("keep on the map", async () => {
        const car = tiles.find(t => t.flags?.[IX]?.mountKind === "car");
        await api().keepThing(scene.id, car.id, false, "mount");
        const left = (await api().scanMaps(back, then, [scene])).filter(r => r.id === car.id).length;
        const ix = game.modules.get(IX).api;
        const kept = ix.characterFor(null, null, car).kept === true, plain = ix.characterFor(null, null, tiles.find(t => t.flags?.[IX]?.watchKind === "radio")).kept === false;
        const ops = ix.rules.optionsFor(ix.describeTile(car), {actorId: "x", year: 1850, kept: true, abilities: {}});
        ok("keep on the map", !!car.flags?.[MOD]?.keepOutOfEra && left === 0 && kept && plain && !ops.some(o => o.id === "eraNote"), {left, kept, plain, ops: ops.map(o => o.id)});
      });
      await step("the hand", async () => {
        const hand = game.wodx?.storyteller?.hand;
        const inHand = !!hand?.tools?.some?.(t => t.key === "anachronism");
        ok("the hand", typeof api().everything === "function" && (inHand || !game.modules.get("wodx-storyteller")?.active), {inHand});
      });
    } else R.notes.push("WoDX Interactables is off: the map steps were skipped.");
    await step("other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-library", "wodx-storyteller"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("other modules", !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      await game.settings.set(MOD, "anachronismAt", stored);
      for ( const m of msgs ) await m.delete();
      if ( actor ) await actor.delete();
      if ( scene && tiles.length ) await scene.deleteEmbeddedDocuments("Tile", tiles.map(t => t.id).filter(id => scene.tiles.has(id)));
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gateanachronism-result.json");
}

// The gate kit (B3733): its own scratch scene, cleaned up after.
import {kitRun} from "./kit.mjs";
export const run = kitRun("gateanachronism", runGate);
