/**
 * WoDX Chronicle, Storyteller and Actions gate: lasting damage on the map (B3759), in Foundry, in rothenstein-wodx,
 * as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatescars.mjs?${Date.now()}`)).run()
 * Makes its own scratch scene with one adopted building (a region, a thing, a door, a light) and removes it; adds a
 * scratch town and puts the markets and town settings back; the clock is never moved.
 *   1. Chronicle's api.scars is up, and whether the pack pictures are on this Foundry
 *   2. a fire at the building: its thing is darkened, its light out, a scar record, and ash marks (pictures or blots)
 *   3. Undo: every piece as it stood, the marks gone, no record
 *   4. a town quake (wodxTown, as the town turn sends it) scars the town's scene, with the town as its source
 *   5. the weeks' rebuilding (a thriving town) mends it all, piece by piece
 *   6. Summon Water placed by WoDX Actions floods the spot; the card's Undo takes the damage back
 * Result: Data/wodx-gate/gatescars-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const CH = "wodx-chronicle", ST = "wodx-storyteller", IX = "wodx-interactables";
const wait = ms => new Promise(r => setTimeout(r, ms));

export async function run() {
  const G = gate("gatescars");
  const keep = [];
  try {
    const S = game.modules.get(CH)?.api?.scars;
    const U = game.modules.get(ST)?.api;
    const scene = await G.scene({name: "WoDX gate: scars"});
    let art = {};
    await G.step("1. the scars layer", async () => {
      for ( const [k, list] of Object.entries(S?.rules?.ART ?? {}) ) {
        try { art[k] = (await fetch(`/${list[0]}`, {method: "HEAD"})).ok; } catch { art[k] = false; }
      }
      G.ok("1. the scars layer", !!(S?.scar && S?.undo && S?.heal && U?.townScars?.scarTown), {art});
    });
    if ( !S?.scar ) return;
    // One adopted building: the inn, its hall thing with a light, its door
    await scene.createEmbeddedDocuments("Region", [{name: "Gate inn", shapes: [{type: "rectangle", x: 400, y: 400, width: 600, height: 400, rotation: 0, hole: false}],
      flags: {[IX]: {adoptId: "gateinn"}}}]);
    const [tile] = await scene.createEmbeddedDocuments("Tile", [{texture: {src: "icons/svg/house.svg", tint: "#ffffff"}, x: 600, y: 500, width: 200, height: 200,
      flags: {[IX]: {adoptId: "gateinn-hall-1"}}}]);
    const [door] = await scene.createEmbeddedDocuments("Wall", [{c: [400, 600, 400, 700], door: 1, ds: 0, flags: {[IX]: {adoptId: "gateinn-door-1"}}}]);
    const [light] = await scene.createEmbeddedDocuments("AmbientLight", [{x: 700, y: 600, config: {bright: 2, dim: 4}, hidden: false, flags: {[IX]: {adoptId: `${tile.id}.light`}}}]);
    const tint = () => String(scene.tiles.get(tile.id)?.texture?.tint?.css ?? scene.tiles.get(tile.id)?.texture?.tint ?? "").toLowerCase();
    const asBefore = () => tint() === "#ffffff" && scene.lights.get(light.id)?.hidden === false && Number(scene.walls.get(door.id)?.ds) === 0 && Number(scene.walls.get(door.id)?.move) > 0;
    const marks = id => [...scene.tiles, ...scene.drawings].filter(d => d.flags?.[CH]?.scar === id).length;
    let fire = null;
    await G.step("2. a fire at the building", async () => {
      fire = await S.scar({scene, kind: "fire", severity: 3, at: {x: 700, y: 600, radius: 150}, source: "gatescars"});
      await wait(600);
      const rec = S.list(scene).find(r => r.id === fire);
      G.ok("2. a fire at the building", !!rec && rec.hit.includes("gateinn") && tint() === S.rules.KINDS.fire.tint && scene.lights.get(light.id)?.hidden === true && marks(fire) >= 1,
        {hit: rec?.hit ?? null, tint: tint(), light: scene.lights.get(light.id)?.hidden, marks: marks(fire), pictures: [...scene.tiles].some(t => t.flags?.[CH]?.scar === fire)});
    });
    await G.step("3. Undo puts the building back", async () => {
      const ok = await S.undo(fire, scene);
      await wait(600);
      G.ok("3. Undo puts the building back", ok && asBefore() && marks(fire) === 0 && !S.list(scene).length, {tint: tint(), light: scene.lights.get(light.id)?.hidden, door: scene.walls.get(door.id)?.ds, marks: marks(fire)});
    });
    for ( const k of ["markets", "townScars"] ) keep.push([k, foundry.utils.deepClone(game.settings.get(ST, k))]);
    await game.settings.set(ST, "townScars", true);
    const ms = U.markets.state();
    await game.settings.set(ST, "markets", {...ms, markets: [...(ms.markets ?? []), {id: "gate-scars", name: "WoDX gate scarred town", scenes: [scene.id], links: []}]});
    await wait(400);
    await G.step("4. a town quake scars the town's scene", async () => {
      Hooks.callAll("wodxTown", {town: "gate-scars", kind: "quake", text: "Gate quake.", big: true, name: "WoDX gate scarred town", region: "", prosperity: -1.5});
      await waitFor(() => S.list(scene).some(r => r.source === "town:gate-scars"), 8000);
      const rec = S.list(scene).find(r => r.source === "town:gate-scars");
      G.ok("4. a town quake scars the town's scene", !!rec && rec.kind === "quake" && rec.severity === 3 && rec.changes.length + rec.made.length > 0,
        {kind: rec?.kind ?? null, severity: rec?.severity ?? null, changes: rec?.changes?.length ?? 0, marks: rec?.made?.length ?? 0, hit: rec?.hit ?? null});
    });
    await G.step("5. the weeks' rebuilding mends it", async () => {
      let weeks = 0;
      const partway = [];
      while ( S.list(scene).length && weeks++ < 20 ) { await U.townScars.healTowns({"gate-scars": {prosperity: 5}}); partway.push(S.list(scene)[0]?.changes?.filter(c => c.healed).length ?? null); }
      await wait(400);
      G.ok("5. the weeks' rebuilding mends it", !S.list(scene).length && asBefore() && weeks > 1 && ![...scene.tiles, ...scene.drawings].some(d => d.flags?.[CH]?.scar), {weeks, partway, tint: tint()});
    });
    await G.step("6. Summon Water floods the spot; Undo takes it back", async () => {
      const A = game.modules.get("wodx-actions")?.api;
      const [dv] = await G.make(Actor, [{name: "Gate Scars Defiler", type: "Demon"}]);
      const pl = A.effects.planOf(dv, [], 5, {name: "Summon Water", line: "Demon (DtF)", faith: 5});
      const i = pl.items.findIndex(x => x.key === "world" && x.out?.world === "water");
      const msg = await G.make(ChatMessage, {content: `<div class="wodx-card">Gate: Summon Water</div>${pl.html}`, whisper: [game.user.id],
        flags: {"wodx-actions": {kind: "effects", caster: "Gate", items: pl.items, done: true}}});
      const rec = i >= 0 ? await A.effects.placeItem(msg, i, {x: 700, y: 600}) : null;
      await wait(800);
      const sc = rec?.scar ? S.list(scene).find(r => r.id === rec.scar) : null;
      const flooded = tint() === S.rules.KINDS.flood.tint;
      if ( rec ) await A.effects.undo([rec]);
      await waitFor(() => !S.list(scene).length, 5000);
      G.ok("6. Summon Water floods the spot; Undo takes it back", !!sc && sc.kind === "flood" && flooded && !S.list(scene).length && asBefore(),
        {scar: sc?.kind ?? null, flooded, left: S.list(scene).length, tint: tint()});
    });
  } finally {
    for ( const [k, v] of keep ) await game.settings.set(ST, k, v).catch(() => {});
    return G.finish();
  }
}
