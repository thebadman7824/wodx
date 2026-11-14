/**
 * WoDX Combat, Interactables and NPC gate: vehicles in a fight (B4790 to B4799), in rothenstein-wodx, as Gamemaster
 * Test:
 *   await (await import(`/wodx-gate/gatevehicles.mjs?${Date.now()}`)).run()
 * Makes its own scratch scene (a road), car, plane and horse tiles, five actors and their tokens, and removes them;
 * never moves the clock.
 *   1. the api, the setting and the new kinds (lorry to jet) on the tile menu
 *   2. nobody flies an aeroplane without Pilot: the menu says so
 *   3. shelter: a passenger in a closed car is shielded under 4 successes, reached at 4
 *   4. damage on the tile: a level past its Durability comes off the car's Structure; the tile darkens
 *   5. wrecked: the car at its Structure goes nowhere; its driver who moves has climbed out
 *   6. mended in the config: the damage and the tint go back
 *   7. the ram on the attack menu: Dexterity + Drive held to the car's Maneuver, its dice from Durability and mass
 *   8. a real ram into a car: the card says the car takes it, and the rammer's own car feels it
 *   9. at the wheel the driver swerves; a passenger sat inside cannot dodge
 *  10. an NPC gets onto a horse by itself: the horse is on its list, and its turn takes the reins
 * Result: Data/wodx-gate/gatevehicles-result.json.
 */
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
    const scene = await G.scene({flags: {[IX]: {ground: "road"}}});
    const [driver, pass, foe, nopilot, runner] = await G.make(Actor, [
      body("Gate Vehicles Driver", {dex: 5, drive: 5, sta: 3}),
      body("Gate Vehicles Passenger", {dex: 3, athletics: 3}),
      body("Gate Vehicles Foe", {dex: 3, drive: 3, firearms: 3}),
      body("Gate Vehicles Groundling", {dex: 3, drive: 4}),
      body("Gate Vehicles Runner", {dex: 3, ride: 2, athletics: 2})]);
    const [td, tp, tf, tn, tr] = await G.tokens(scene, [{actor: driver, x: 2, y: 2, actorLink: true}, {actor: pass, x: 3, y: 2, actorLink: true},
      {actor: foe, x: 5, y: 2, actorLink: true}, {actor: nopilot, x: 10, y: 10, actorLink: true}, {actor: runner, x: 14, y: 4, actorLink: true}]);
    await waitFor(() => td?.object && tp?.object && tf?.object && tn?.object && tr?.object);
    const [car, car2, plane, horse] = await scene.createEmbeddedDocuments("Tile", [
      {x: 200, y: 200, width: 200, height: 100, texture: {src: "icons/svg/wing.svg"}, flags: {[IX]: {mount: true, mountKind: "car", title: "Gate motor car"}}},
      {x: 500, y: 200, width: 200, height: 100, texture: {src: "icons/svg/wing.svg"}, flags: {[IX]: {mount: true, mountKind: "car", title: "Gate second car"}}},
      {x: 1000, y: 1000, width: 200, height: 200, texture: {src: "icons/svg/wing.svg"}, flags: {[IX]: {mount: true, mountKind: "plane", title: "Gate aeroplane"}}},
      {x: 1600, y: 400, width: 100, height: 100, texture: {src: "icons/svg/horse.svg"}, flags: {[IX]: {mount: true, mountKind: "horse", title: "Gate horse"}}}]);
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

    await G.step("9. swerve and sat inside", async () => {
      const d = C.bestDefense(driver, {}, pistol, {});
      const p = C.bestDefense(pass, {}, pistol, {});
      const dodge = p.plans.find(x => x.type === "dodge");
      const m = V().vehicleFor(driver, td)?.maneuver ?? 10;
      G.ok("9. swerve and sat inside", d.best?.type === "swerve" && d.best.dice === Math.min(10, m) && dodge && !dodge.valid && /Sat in/.test(dodge.invalid ?? ""),
        {driver: d.best ? {type: d.best.type, dice: d.best.dice, diff: d.best.diff} : null, pass: dodge?.invalid});
    });

    await G.step("10. an NPC takes a horse", async () => {
      const list = npc.readFight(tr.object).state.vehicles ?? [];
      const h = list.find(v => v.id === horse.id);
      await npc.execute(tr.object, {action: "board", vehicle: horse.id});
      const on = await waitFor(() => scene.tiles.get(horse.id)?.flags?.[IX]?.driver?.t === tr.uuid, 10000);
      G.ok("10. an NPC takes a horse", !!h?.canDrive && on, {listed: h ?? null, list, driver: scene.tiles.get(horse.id)?.flags?.[IX]?.driver ?? null});
    });
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally { return G.finish(); }
}
