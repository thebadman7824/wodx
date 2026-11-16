/**
 * WoDX Interactables, Paperdoll and Storyteller gate: flying cars and flight for every aircraft (B6620 to B6629, desk
 * picks 2026-11-16), in
 * rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateflight.mjs?${Date.now()}`)).run()
 * Makes its own scratch scene, aerodyne and hover bike tiles, four actors and their tokens, and removes them; never
 * moves the clock (the tiles are kept out of their era, so any year will do).
 *   1. the api and the four new kinds, each with its drawn looks
 *   2. the pilot climbs: the aerodyne and its passenger rise with the pilot's token; on the map its picture lifts and
 *      its shadow stays on the ground
 *   3. a hover bike: Drive alone keeps it on the ground; with Pilot it flies, but no higher than 20 metres
 *   4. the passenger steps off in the air and falls: on the ground again, with a card
 *   5. the pilot leaves: an AV does not glide, it drops; everyone aboard comes down with a crash card
 *   6. wrecked in the air: the hover bike falls when its Structure is gone
 *   7. a chase: flying low over a crowd is harder than flying above it (rules as deployed)
 *   8. travel: an aerodyne trip flies over water when asked for or owned, faster flat out (Storyteller rules as deployed)
 *   9. a loaded hover bike (a vehicle sheet with cargo in its hold) will not lift; unloaded, it flies
 * Result: Data/wodx-gate/gateflight-result.json.
 */
import {gate, waitFor, newestMessage} from "./kit.mjs";

const IX = "wodx-interactables";
const body = (name, {dex = 3, drive = 0, pilot = 0} = {}) => ({name, type: "Mortal",
  system: {attributes: {strength: {value: 2}, dexterity: {value: dex}, stamina: {value: 2}}, abilities: {drive: {value: drive}, pilot: {value: pilot}}}});
const seat = (tok, tile) => ({a: tok.actorId, t: tok.uuid, n: tok.name, dx: tile.x - tok.x, dy: tile.y - tok.y});
const rider = (tok, tile) => ({a: tok.actorId, t: tok.uuid, n: tok.name, dx: tok.x - tile.x, dy: tok.y - tile.y});
const text = html => String(html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const el = (scene, doc) => Number(scene.tokens.get(doc.id)?.elevation ?? scene.tiles.get(doc.id)?.elevation) || 0;

export async function run() {
  const G = gate("gateflight");
  if ( G.notLive() ) return "Not on the Live world.";
  try {
    const ix = game.modules.get(IX)?.api, fl = ix?.flight, pd = game.modules.get("wodx-paperdoll")?.api;
    const scene = await G.scene({flags: {[IX]: {ground: "streets"}}});
    const ft = v => fl.fromFeet(scene, v);
    const [pilot, pass, biker, flyer] = await G.make(Actor, [
      body("Gate Flight Pilot", {dex: 4, pilot: 3}), body("Gate Flight Passenger"),
      body("Gate Flight Biker", {dex: 3, drive: 3}), body("Gate Flight Flyer", {dex: 3, drive: 2, pilot: 2})]);
    const [tp, tq, tb, tf] = await G.tokens(scene, [{actor: pilot, x: 2, y: 2, actorLink: true}, {actor: pass, x: 3, y: 2, actorLink: true},
      {actor: biker, x: 10, y: 8, actorLink: true}, {actor: flyer, x: 14, y: 8, actorLink: true}]);
    await waitFor(() => tp?.object && tq?.object && tb?.object && tf?.object);
    const keep = {"wodx-sheets": {keepOutOfEra: true}};
    const [av, bike, bike2] = await scene.createEmbeddedDocuments("Tile", [
      {x: 200, y: 200, width: 200, height: 100, texture: {src: "icons/svg/wing.svg"}, flags: {[IX]: {mount: true, mountKind: "aerodyne", title: "Gate aerodyne"}, ...keep}},
      {x: 1000, y: 800, width: 100, height: 100, texture: {src: "icons/svg/wing.svg"}, flags: {[IX]: {mount: true, mountKind: "hoverbike", title: "Gate hover bike"}, ...keep}},
      {x: 1400, y: 800, width: 100, height: 100, texture: {src: "icons/svg/wing.svg"}, flags: {[IX]: {mount: true, mountKind: "hoverbike", title: "Gate second hover bike"}, ...keep}}]);
    await av.update({[`flags.${IX}.driver`]: seat(tp, av), [`flags.${IX}.riders`]: [rider(tq, av)]});
    await bike.update({[`flags.${IX}.driver`]: seat(tb, bike)});
    await bike2.update({[`flags.${IX}.driver`]: seat(tf, bike2)});
    await new Promise(r => setTimeout(r, 300));

    await G.step("1. api and kinds", async () => {
      const kinds = ["aerodyne", "aerocab", "assaultav", "hoverbike"];
      const ok = typeof fl?.onPilotHeight === "function" && kinds.every(k => ix.rules.MOUNTS[k]) && (!pd?.sprites?.mounts || kinds.every(k => pd.sprites.mounts.rules.looksOf(k).length >= 3));
      G.ok("1. api and kinds", ok, {flight: Object.keys(fl ?? {}), looks: kinds.map(k => pd?.sprites?.mounts?.rules?.looksOf?.(k)?.length ?? null)});
    });

    await G.step("2. the pilot climbs", async () => {
      await tp.update({elevation: ft(60)});
      const up = await waitFor(() => Math.abs(el(scene, av) - ft(60)) < 0.01 && Math.abs(el(scene, tq) - ft(60)) < 0.01, 8000);
      const alt = fl.altOf(scene.tiles.get(av.id));
      const shown = await waitFor(() => !pd?.sprites?.mounts || (pd.sprites.mounts.showing(scene.tiles.get(av.id))?.lift > 0 && pd.sprites.mounts.showing(scene.tiles.get(av.id))?.shadow), 6000);
      G.ok("2. the pilot climbs", up && Math.round(alt) === 60 && shown, {up, alt, showing: pd?.sprites?.mounts?.showing?.(scene.tiles.get(av.id)) ?? null});
    });

    await G.step("3. hover bike: Pilot to fly, 20 metres at most", async () => {
      const t0 = Date.now();
      await tb.update({elevation: ft(30)});
      const held = await waitFor(() => el(scene, tb) === 0 && el(scene, bike) === 0, 6000);
      const card = await waitFor(() => newestMessage(t0, m => /Pilot, not Drive/.test(text(m.content))), 6000);
      await tf.update({elevation: ft(200)});
      const capped = await waitFor(() => Math.abs(el(scene, bike2) - ft(66)) < 0.6 && Math.abs(el(scene, tf) - ft(66)) < 0.6, 8000);
      G.ok("3. hover bike: Pilot to fly, 20 metres at most", held && !!card && capped, {held, card: !!card, bike2: el(scene, bike2), flyer: el(scene, tf)});
    });

    await G.step("4. stepping off in the air", async () => {
      const t0 = Date.now();
      await scene.tiles.get(av.id).update({[`flags.${IX}.riders`]: []});
      const fell = await waitFor(() => el(scene, tq) === 0, 8000);
      const card = await waitFor(() => newestMessage(t0, m => /goes over the side/.test(text(m.content))), 8000);
      G.ok("4. stepping off in the air", fell && !!card, {fell, passenger: el(scene, tq)});
    });

    await G.step("5. nobody at the controls: an AV drops", async () => {
      const t0 = Date.now();
      await scene.tiles.get(av.id).update({[`flags.${IX}.driver`]: null});
      const down = await waitFor(() => el(scene, av) === 0, 8000);
      const card = await waitFor(() => newestMessage(t0, m => /comes down/.test(text(m.content)) && /does not glide/.test(text(m.content))), 8000);
      G.ok("5. nobody at the controls: an AV drops", down && !!card, {down, tile: el(scene, av)});
    });

    await G.step("6. wrecked in the air", async () => {
      const t0 = Date.now();
      await scene.tiles.get(bike2.id).update({[`flags.${IX}.hullLost`]: 4});
      const down = await waitFor(() => el(scene, bike2) === 0 && el(scene, tf) === 0, 8000);
      const card = await waitFor(() => newestMessage(t0, m => /wrecked in the air/.test(text(m.content))), 8000);
      G.ok("6. wrecked in the air", down && !!card, {down, bike: el(scene, bike2), rider: el(scene, tf)});
    });

    await G.step("7. a chase: low and fast is harder", async () => {
      const C = ix.chase?.rules;
      const low = C.rollFor({way: "aerodyne", alt: 20, flatOut: true}, "crowd", {year: 2030}), high = C.rollFor({way: "aerodyne", alt: 200, flatOut: true}, "crowd", {year: 2030});
      G.ok("7. a chase: low and fast is harder", low.diff > high.diff && low.parts.some(p => /low/.test(p)), {low, high});
    });

    await G.step("8. travel by aerodyne", async () => {
      const R = await import(`/modules/wodx-storyteller/scripts/road-rules.mjs?${Date.now()}`);
      const asked = R.tripByDistance({km: 60, road: "water", year: 2030, future: true, want: "aerodyne"});
      const not = R.tripByDistance({km: 60, road: "road", year: 2030, future: true});
      const owned = R.tripByDistance({km: 60, road: "road", year: 2030, future: true, owns: ["aerodyne"]});
      const flat = R.tripByDistance({km: 60, road: "road", year: 2030, future: true, owns: ["aerodyne"], cruise: "flat"});
      G.ok("8. travel by aerodyne", asked?.mode === "aerodyne" && not?.mode !== "aerodyne" && owned?.mode === "aerodyne" && flat?.minutes < owned?.minutes, {asked, not, owned, flat});
    });

    await G.step("9. a loaded hover bike stays down", async () => {
      const t0 = Date.now();
      const [hb] = await G.make(Actor, [{name: "Gate Hover Bike", type: "wodx-interactables.vehicle", system: {kind: "hoverbike", built: 2030}}]);
      const [crate] = await hb.createEmbeddedDocuments("Item", [{name: "Gate crate", type: "Item"}]);
      const [tv] = await G.tokens(scene, [{actor: hb, x: 6, y: 12, actorLink: true}]);
      await tp.update({x: tv.x, y: tv.y + (scene.grid?.size ?? 100), elevation: 0}, {animate: false, teleport: true});
      await waitFor(() => tv?.object && tp?.object, 6000);
      await scene.tokens.get(tv.id).update({[`flags.${IX}.driver`]: seat(tp, scene.tokens.get(tv.id))});
      const on = await waitFor(() => scene.tokens.get(tv.id)?.flags?.[IX]?.driver?.t === tp.uuid, 10000);
      await tp.update({elevation: ft(30)});
      const held = await waitFor(() => el(scene, tv) === 0 && el(scene, tp) === 0, 6000);
      const card = await waitFor(() => newestMessage(t0, m => /unload the hover bike/.test(text(m.content))), 6000);
      await hb.deleteEmbeddedDocuments("Item", [crate.id]);
      await tp.update({elevation: ft(30)});
      const up = await waitFor(() => Math.abs(el(scene, tv) - ft(30)) < 0.6, 8000);
      G.ok("9. a loaded hover bike stays down", on && held && !!card && up, {on, held, card: !!card, up, bike: el(scene, tv)});
      await tp.update({elevation: 0});
    });
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally { return G.finish(); }
}
