/**
 * WoDX Combat, Interactables and NPC gate: vehicles in a fight (B4790 to B4799), in rothenstein-wodx, as Gamemaster
 * Test:
 *   await (await import(`/wodx-gate/gatevehicles.mjs?${Date.now()}`)).run()
 * Makes its own scratch scene (a road), car, plane and horse tiles, five actors and their tokens, and removes them;
 * never moves the clock.
 *   1. the api, the setting and the new kinds (lorry to jet) on the tile menu
 *   2. nobody flies an aeroplane without Pilot: the menu says so (the tile kept out of its era, whatever the year)
 *   3. shelter: a passenger in a closed car is shielded under 4 successes, reached at 4
 *   4. damage on the tile: a level past its Durability comes off the car's Structure; the tile darkens
 *   5. wrecked: the car at its Structure goes nowhere; its driver who moves has climbed out
 *   6. mended in the config: the damage and the tint go back
 *   7. the ram on the attack menu: Dexterity + Drive held to the car's Maneuver, its dice from Durability and mass
 *   8. a real ram into a car: the card says the car takes it, and the rammer's own car feels it
 *   9. at the wheel the driver swerves; a passenger sat inside cannot dodge
 *  10. an NPC gets onto a horse by itself: the horse is on its list, and its turn takes the reins
 *  11. B4960-B4964: a bicycle is a tile; a mortal is refused a chimerical steed, a gryphon wants Ride 3, and a
 *      ghouled horse dodges shots for its rider with no +2
 *  12. B4966-B4967: a horse on its own sheet: mounted from its token, it carries its rider, fights with its own
 *      Dexterity, and throws the rider when it goes down
 *  13. B4968-B4969: a vehicle on its own sheet: its sheet opens, someone gets in and drives its token, a blow comes
 *      off its Structure on the sheet, its mounted gun is on the driver's attack menu, its headlights light the token
 * Result: Data/wodx-gate/gatevehicles-result.json.
 */
/** A batch create does not keep its order (kit rule 1): match each made tile to its data by title. */
const byTitle = (docs, data) => data.map(d => docs.find(x => x.flags?.["wodx-interactables"]?.title === d.flags?.["wodx-interactables"]?.title));
import {gate, waitFor} from "./kit.mjs";

const IX = "wodx-interactables";
const body = (name, {str = 2, dex = 3, sta = 2, drive = 0, ride = 0, firearms = 0, athletics = 0} = {}) => ({name, type: "Mortal",
  system: {attributes: {strength: {value: str}, dexterity: {value: dex}, stamina: {value: sta}}, abilities: {drive: {value: drive}, ride: {value: ride}, firearms: {value: firearms}, athletics: {value: athletics}}}});
const seat = (tok, tile) => ({a: tok.actorId, t: tok.uuid, n: tok.name, dx: tile.x - tok.x, dy: tile.y - tok.y});
const rider = (tok, tile) => ({a: tok.actorId, t: tok.uuid, n: tok.name, dx: tok.x - tile.x, dy: tok.y - tile.y});
const text = html => String(html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function run() {
  const G = gate("gatevehicles");
  if ( G.notLive() ) return "Not on the Live world.";
  try {
    const C = game.wodxCombat, V = () => C?.vehicles, ix = game.modules.get(IX)?.api, npc = game.modules.get("wodx-npc")?.api;
    // A fight a step starts must not run its own turns: an NPC at the reins walked the horse to the map edge mid-step (run-gate puts settings back)
    try { await game.settings.set("wodx-combat", "turnConductor", "off"); } catch (e) { G.R.notes.push("no turn conductor setting"); }
    const scene = await G.scene({flags: {[IX]: {ground: "road"}, "wodx-npc": {mode: "suggest"}}});
    // B6210: cars, aeroplanes and rams need a year that has them (the kit puts the clock back after)
    await G.yearAtLeast(1950);
    const [driver, pass, foe, nopilot, runner] = await G.make(Actor, [
      body("Gate Vehicles Driver", {dex: 5, drive: 5, sta: 3}),
      body("Gate Vehicles Passenger", {dex: 3, athletics: 3}),
      body("Gate Vehicles Foe", {dex: 3, drive: 3, firearms: 3}),
      body("Gate Vehicles Groundling", {dex: 3, drive: 4}),
      body("Gate Vehicles Runner", {dex: 3, ride: 2, athletics: 2})]);
    const [td, tp, tf, tn, tr] = await G.tokens(scene, [{actor: driver, x: 2, y: 2, actorLink: true}, {actor: pass, x: 3, y: 2, actorLink: true},
      {actor: foe, x: 5, y: 2, actorLink: true}, {actor: nopilot, x: 10, y: 10, actorLink: true}, {actor: runner, x: 14, y: 4, actorLink: true}]);
    await waitFor(() => td?.object && tp?.object && tf?.object && tn?.object && tr?.object);
    const tileData = [
      {x: 200, y: 200, width: 200, height: 100, texture: {src: "icons/svg/wing.svg"}, flags: {[IX]: {mount: true, mountKind: "car", title: "Gate motor car"}}},
      {x: 500, y: 200, width: 200, height: 100, texture: {src: "icons/svg/wing.svg"}, flags: {[IX]: {mount: true, mountKind: "car", title: "Gate second car"}}},
      {x: 1000, y: 1000, width: 200, height: 200, texture: {src: "icons/svg/wing.svg"}, flags: {[IX]: {mount: true, mountKind: "plane", title: "Gate aeroplane"}, "wodx-sheets": {keepOutOfEra: true}}},
      {x: 1600, y: 400, width: 100, height: 100, texture: {src: "icons/svg/horse.svg"}, flags: {[IX]: {mount: true, mountKind: "horse", title: "Gate horse"}}}];
    const [car, car2, plane, horse] = byTitle(await scene.createEmbeddedDocuments("Tile", tileData), tileData);
    // Every move of the passenger, with the module code that made it (a passenger once left the car mid-fight)
    const passTrail = [];
    const passHook = Hooks.on("preUpdateToken", (doc, ch) => { if ( doc.id === tp.id && ("x" in ch || "y" in ch) && passTrail.length < 6 ) passTrail.push({x: ch.x ?? null, y: ch.y ?? null,
      by: (new Error().stack ?? "").split("\n").slice(2).filter(l => !/foundry\.mjs|gatevehicles/.test(l)).slice(0, 5).map(l => l.trim().replace(/^at /, "").replace(/https?:\/\/[^/]+/, "")).join(" < ")}); });
    await car.update({[`flags.${IX}.driver`]: seat(td, car), [`flags.${IX}.riders`]: [rider(tp, car)]});
    await car2.update({[`flags.${IX}.driver`]: seat(tf, car2)});
    await foe.createEmbeddedDocuments("Item", [{name: "Gate pistol", type: "Ranged Weapon", system: {isequipped: true, difficulty: 6, range: 20,
      damage: {attribute: "", bonus: 4, type: "lethal", isrollable: true}, attack: {attribute: "dexterity", ability: "firearms"}}}]);
    const pistol = {name: "a pistol", type: "lethal", ranged: true, ability: "firearms"};

    await G.step("1. api, setting and kinds", async () => {
      const v = V();
      const kinds = ["truck", "armoured", "tank", "balloon", "plane", "helicopter", "jet"].every(k => ix?.rules?.MOUNTS?.[k]);
      G.ok("1. api, setting and kinds", ["vehicleFor", "ramWeapon", "shelterFor", "afterHit", "strikeHull", "swerveOf"].every(k => typeof v?.[k] === "function")
        && game.settings.get("wodx-combat", "vehicleCombat") === true && kinds && v.vehicleFor(driver, td)?.body?.durability > 0, {ride: v?.vehicleFor?.(driver, td) ?? null});
    });

    await G.step("2. no Pilot, no flying", async () => {
      const o = ix.describeObj(plane), opts = ix.rules.optionsFor(o, ix.characterFor(nopilot, tn.object.center, plane));
      const note = opts.find(x => x.id === "skillNote");
      G.ok("2. no Pilot, no flying", !!note?.disabled && /Pilot/.test(note.label) && !opts.some(x => x.id === "mount"), {opts: opts.map(x => [x.id, x.label])});
    });

    await G.step("3. shelter", async () => {
      const low = V().shelterFor({attacker: foe, attackerTok: tf, target: pass, targetTok: tp, w: pistol, attackSuccesses: 2});
      const high = V().shelterFor({attacker: foe, attackerTok: tf, target: pass, targetTok: tp, w: pistol, attackSuccesses: 4});
      G.ok("3. shelter", low.shielded && !high.shielded && high.through && /Mage 20th p\. 459/.test(high.note), {low: low.note, high: high.note});
    });

    await G.step("4. damage on the tile", async () => {
      const ride = V().vehicleFor(driver, td);
      // the car's figures are the year's (Mage 20th for the modern ones): one level past its Durability
      const r = await V().strikeHull(scene.tiles.get(car.id), ride.body, ride.body.durability + 1);
      const ok = await waitFor(() => Number(scene.tiles.get(car.id)?.flags?.[IX]?.hull?.lost) === 1, 6000);
      const t = scene.tiles.get(car.id), tint = String(t?.texture?.tint?.css ?? t?.texture?.tint ?? "");
      const label = ix.rules.nameOf?.(ix.describeObj(t)) ?? "";
      G.ok("4. damage on the tile", r?.lost === 1 && ok && tint && !/^#?f{6}$/i.test(tint.replace("#", "")) && /damaged|battered/.test(label), {r, tint, label});
    });

    await G.step("5. wrecked", async () => {
      const ride = V().vehicleFor(driver, td);
      await V().strikeHull(scene.tiles.get(car.id), ride.body, ride.body.durability + ride.body.structure);
      await waitFor(() => V().vehicleFor(driver, td)?.wrecked === true, 6000);
      const x0 = scene.tiles.get(car.id).x;
      await td.update({x: td.x, y: td.y + 300});
      const off = await waitFor(() => !scene.tiles.get(car.id)?.flags?.[IX]?.driver, 6000);
      G.ok("5. wrecked", off && scene.tiles.get(car.id).x === x0 && V().ramWeapon(driver, td) === null, {off, x: [x0, scene.tiles.get(car.id).x]});
      await td.update({x: td.x, y: td.y - 300});
    });

    await G.step("6. mended", async () => {
      await scene.tiles.get(car.id).update({[`flags.${IX}.hullLost`]: 0});
      const ok = await waitFor(() => Number(scene.tiles.get(car.id)?.flags?.[IX]?.hull?.lost ?? 0) === 0, 6000);
      const t = scene.tiles.get(car.id), tint = String(t?.texture?.tint?.css ?? t?.texture?.tint ?? "").toLowerCase();
      G.ok("6. mended", ok && /f{6}/.test(tint), {tint, hull: t?.flags?.[IX]?.hull});
      await car.update({[`flags.${IX}.driver`]: seat(td, scene.tiles.get(car.id))});
      await waitFor(() => V().vehicleFor(driver, td)?.role === "reins", 4000);
    });

    await G.step("7. the ram on the menu", async () => {
      const plans = C.bestAttack(driver, foe, {}, {attackerTok: td, targetTok: tf, ignoreDistance: true}).plans;
      const p = plans.find(x => x.w?.id === "vehicle:ram"), ride = V().vehicleFor(driver, td);
      const dice = ride.body.durability + ride.body.mass;
      G.ok("7. the ram on the menu", !!p?.valid && p.atkDice === Math.min(10, ride.maneuver) && new RegExp(`${dice} dice`).test(p.w.name) && new RegExp(`Durability ${ride.body.durability}`).test(p.w.name), {plan: p ? {valid: p.valid, dice: p.atkDice, name: p.w.name, why: p.why} : null, all: plans.map(x => x.w?.name)});
    });

    await G.step("9. swerve and sat inside", async () => {
      const d = C.bestDefense(driver, {}, pistol, {});
      const p = C.bestDefense(pass, {}, pistol, {});
      const dodge = p.plans.find(x => x.type === "dodge");
      const m = V().vehicleFor(driver, td)?.maneuver ?? 10;
      // run before the ram (step 8), whose blows can hurt the driver and the car and change these dice
      G.ok("9. swerve and sat inside", d.best?.type === "swerve" && d.best.dice === Math.min(10, m) && dodge && !dodge.valid && /Sat in/.test(dodge.invalid ?? ""),
        {driver: d.best ? {type: d.best.type, dice: d.best.dice, diff: d.best.diff} : null, maneuver: m, pass: dodge?.invalid, dodge: dodge ? {valid: dodge.valid} : null,
          aboard: (scene.tiles.get(car.id)?.flags?.[IX]?.riders ?? []).map(r => r.n ?? r.t), passAt: {x: tp.x, y: tp.y}, passTrail: passTrail.filter(m => !/carryAboard/.test(m.by))});
      Hooks.off("preUpdateToken", passHook);
    });

    await G.step("8. a real ram", async () => {
      // the second car sits beside the first: ram it until a blow lands
      await car2.update({x: 300, y: 200});
      await tf.update({x: 300, y: 200});
      await waitFor(() => V().vehicleFor(foe, tf)?.role === "reins", 4000);
      let card = "";
      for ( let i = 0; i < 8 && !/takes it/.test(card); i++ ) {
        const [res] = await C.quickAttack({attacker: td.object, target: tf.object, weaponId: "vehicle:ram"}).catch(() => []);
        card = text(res?.message?.content ?? "");
        await sleep(300);
      }
      G.ok("8. a real ram", /Ram with the/.test(card) && /second car takes it/i.test(card) && /that rammed/.test(card), {card: card.slice(0, 700)});
    });

    await G.step("10. an NPC takes a horse", async () => {
      const list = npc.readFight(tr.object).state.vehicles ?? [];
      const h = list.find(v => v.id === horse.id);
      await npc.execute(tr.object, {action: "board", vehicle: horse.id});
      const on = await waitFor(() => scene.tiles.get(horse.id)?.flags?.[IX]?.driver?.t === tr.uuid, 10000);
      G.ok("10. an NPC takes a horse", !!h?.canDrive && on, {listed: h ?? null, list, driver: scene.tiles.get(horse.id)?.flags?.[IX]?.driver ?? null});
    });

    await G.step("11. bicycles and beasts", async () => {
      const beastData = ["bicycle", "chimera", "gryphon", "ghoulhorse"].map((k, i) => ({x: 2000 + i * 150, y: 1500, width: 100, height: 100,
        texture: {src: "icons/svg/horse.svg"}, flags: {[IX]: {mount: true, mountKind: k, title: `Gate ${k}`}, "wodx-sheets": {keepOutOfEra: k === "bicycle"}}}));
      const [bike, fae, gry, gh] = byTitle(await scene.createEmbeddedDocuments("Tile", beastData), beastData);
      const c = ix.characterFor(nopilot, tn.object.center, bike);
      const o = t => ix.rules.optionsFor(ix.describeObj(t), {...c, kept: false});
      const bikeOk = ix.rules.optionsFor(ix.describeObj(bike), c).some(x => x.id === "mount");
      const faeOpts = o(fae), faeNo = faeOpts.some(x => x.id === "onlyNote") && !faeOpts.some(x => x.id === "mount" || x.id === "board"), gryNo = !!o(gry).find(x => x.id === "skillNote")?.disabled;
      const ride = {...(await import("/modules/wodx-interactables/scripts/chase-rules.mjs")).rideInFight("ghoulhorse", 1200, "open"), kind: "ghoulhorse", role: "reins"};
      const MT = await import("/modules/wodx-combat/scripts/mounted-rules.js");
      const dodge = MT.mountDodge(ride, {rideDots: 3, ranged: true});
      G.ok("11. bicycles and beasts", bikeOk && faeNo && gryNo && dodge.valid && dodge.diff === 6, {fae: faeOpts.map(x => x.id), gryOpts: o(gry).map(x => `${x.id}${x.disabled ? "(off)" : ""}`).slice(0, 4), bikeOk, faeNo, gryNo, kind: c.kind, year: c.year, dodge});
    });

    await G.step("12. riding the beast itself", async () => {
      await scene.tiles.get(horse.id).update({[`flags.${IX}.driver`]: null});
      const [steed] = await G.make(Actor, [{...body("Gate Warhorse", {str: 6, dex: 4, sta: 5, athletics: 3}), type: "Mortal"}]);
      const [ts] = await G.tokens(scene, [{actor: steed, x: 14, y: 8, actorLink: true}]);
      await tr.update({x: ts.x + (scene.grid?.size ?? 100), y: ts.y}, {animate: false, teleport: true});
      // the token slides there: wait until it has arrived on the canvas
      await waitFor(() => ts?.object && tr?.object && Math.abs(tr.object.center.x - (tr.x + (scene.grid?.size ?? 100) / 2)) < 2, 6000);
      const near = ix.interactablesFor(tr.object), listed = near.some(x => x.doc?.id === ts.id);
      const seen = {near: near.map(x => [x.doc?.documentName, x.doc?.name, Math.round(x.distance)]), rider: tr.object?.center, beast: ts.object?.center, beastOf: ix.beastOf(ts)};
      // Every move of the beast's token from here, with who made it (a beast once landed at x 0)
      const trail = [];
      const hk = Hooks.on("preUpdateToken", (doc, ch, opt) => { if ( doc.id === ts.id && ("x" in ch || "y" in ch) ) trail.push({x: ch.x ?? null, y: ch.y ?? null, from: [doc.x, doc.y], opt: Object.keys(opt ?? {}).filter(k => !["diff", "recursive", "render", "modifiedTime"].includes(k)),
        by: (new Error().stack ?? "").split("\n").slice(2).filter(l => !/foundry\.mjs|gatevehicles/.test(l)).slice(0, 6).map(l => l.trim().replace(/^at /, "").replace(/https?:\/\/[^/]+/, "")).join(" < ")}); });
      await ix.attempt(tr.object, ts.id, "mount", {fd: {bonus: 0}});
      const on = await waitFor(() => scene.tokens.get(ts.id)?.flags?.[IX]?.driver?.t === tr.uuid, 10000);
      const g = scene.grid?.size ?? 100, x0 = scene.tokens.get(ts.id).x;
      await tr.update({x: tr.x + g * 2, y: tr.y});
      const r0 = tr.x, drv = foundry.utils.deepClone(scene.tokens.get(ts.id)?.flags?.[IX]?.driver ?? null);
      const carried = await waitFor(() => scene.tokens.get(ts.id).x === x0 + g * 2, 8000);
      Hooks.off("preUpdateToken", hk);
      seen.carry = {trail: trail.slice(0, 3), y: scene.tokens.get(ts.id).y, inCombat: !!game.combat?.combatants?.some?.(c => c.tokenId === ts.id), x0, want: x0 + g * 2, beastNow: scene.tokens.get(ts.id).x, riderFrom: r0, riderNow: scene.tokens.get(tr.id)?.x, driver: drv, combat: !!game.combat?.started};
      const ride = ix.rideOf(tr);
      const own = ride?.beast?.dexterity === 4;
      await steed.update({"system.health.damage.lethal": 7});
      const thrown = await waitFor(() => !scene.tokens.get(ts.id)?.flags?.[IX]?.driver, 10000);
      G.ok("12. riding the beast itself", listed && on && carried && own && thrown, {listed, seen, on, carried, own, thrown, beast: ride?.beast ?? null});
    });

    await G.step("13. a vehicle sheet", async () => {
      const VT = "wodx-interactables.vehicle";
      const [van] = await G.make(Actor, [{name: "Gate Sheet Car", type: VT, system: {kind: "car", built: 1990}}]);
      await van.createEmbeddedDocuments("Item", [{name: "Gate mounted gun", type: "Ranged Weapon", system: {isequipped: true, difficulty: 6, range: 100,
        damage: {attribute: "", bonus: 7, type: "lethal", isrollable: true}, attack: {attribute: "dexterity", ability: "firearms"}}}]);
      const [tv] = await G.tokens(scene, [{actor: van, x: 10, y: 12, actorLink: true}]);
      await tn.update({x: tv.x, y: tv.y + (scene.grid?.size ?? 100)}, {animate: false, teleport: true});
      await waitFor(() => tv?.object && tn?.object && Math.abs(tn.object.center.y - (tn.y + (scene.grid?.size ?? 100) / 2)) < 2, 6000);
      await van.sheet.render(true);
      const opened = await waitFor(() => !!van.sheet.element?.querySelector?.(".wvx-track .wvx-box"), 6000);
      await van.sheet.close();
      await ix.attempt(tn.object, tv.id, "mount", {fd: {bonus: 0}});
      const on = await waitFor(() => scene.tokens.get(tv.id)?.flags?.[IX]?.driver?.t === tn.uuid, 10000);
      const g = scene.grid?.size ?? 100, x0 = scene.tokens.get(tv.id).x;
      await tn.update({x: tn.x + g * 2, y: tn.y});
      const drove = await waitFor(() => scene.tokens.get(tv.id).x === x0 + g * 2, 8000);
      const ride = ix.rideOf(tn);
      const r = await V().strikeHull(scene.tokens.get(tv.id), ride.body, ride.body.durability + 1);
      const struck = await waitFor(() => van.system.lost === 1, 6000);
      const plans = C.bestAttack(nopilot, foe, {}, {attackerTok: tn, targetTok: tf, ignoreDistance: true}).plans;
      const gun = plans.some(p => String(p.w?.id ?? "").startsWith("vgun:"));
      await van.update({"system.lights": true});
      const lit = await waitFor(() => Number(scene.tokens.get(tv.id)?.light?.dim) > 0, 6000);
      G.ok("13. a vehicle sheet", opened && on && drove && ride?.vehicleActor === van.uuid && struck && gun && lit,
        {opened, on, drove, vehicleActor: ride?.vehicleActor ?? null, r, lost: van.system.lost, gun, lit, plans: plans.map(p => p.w?.name)});
    });
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally { return G.finish(); }
}
