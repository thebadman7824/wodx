/**
 * WoDX Interactables and WoDX Combat gate: carrying the fallen and moving large things (B5070 to B5086), in
 * rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatehaul.mjs?${Date.now()}`)).run()
 * Makes its own scratch scene (with a picture, so a chest drawn into the map can take its piece of it), actors,
 * tokens and tiles, and removes them; never moves the clock.
 *   1. the api and the setting; a strong character next to a fallen one may carry or drag, a weak one only drag
 *   2. carried: the body sits tilted and dimmed on the carrier's square, and comes along when the carrier moves
 *   3. in a fight: half pace on the move ruler, +1 to dodge, and a sword is out of the question with both hands full
 *   4. laid aboard a cart: the body is a passenger, and comes off the carrier's hands
 *   5. dragged and bleeding: the body lies a square behind, a blood trail is drawn and a trail clue is left
 *   6. knocked down while dragging: the body is dropped
 *   7. a chest drawn into the map is pushed: it moves, takes its picture, and the floor shows where it stood
 *   8. a wardrobe pushed into a doorway: a wall blocks the door and shots through it meet good cover
 *   9. a safe will not budge for one: the load says so, and a second pair of hands adds their Strength
 *  10. a carried character who wakes gets Struggle free and Stay on a card
 * Result: Data/wodx-gate/gatehaul-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const IX = "wodx-interactables";
const body = (name, {str = 2, dex = 3, sta = 2, athletics = 0, melee = 0} = {}) => ({name, type: "Mortal",
  system: {attributes: {strength: {value: str, total: str}, dexterity: {value: dex, total: dex}, stamina: {value: sta, total: sta}}, abilities: {athletics: {value: athletics}, melee: {value: melee}}}});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const text = html => String(html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

export async function run() {
  const G = gate("gatehaul");
  if ( G.notLive() ) return "Not on the Live world.";
  try {
    const hx = () => game.modules.get(IX)?.api?.haul, C = game.wodxCombat;
    const scene = await G.scene({background: {src: "icons/svg/mystery-man.svg"}, width: 2000, height: 1500});
    const [ana, bruno, cira, dora, eli] = await G.make(Actor, [
      body("Gate Haul Ana", {str: 3, athletics: 2, melee: 2}), body("Gate Haul Bruno", {str: 2}), body("Gate Haul Cira", {str: 2, athletics: 1}),
      body("Gate Haul Dora", {str: 2}), body("Gate Haul Eli", {str: 4, athletics: 3})]);
    const [ta, tb, tc, td, te] = await G.tokens(scene, [{actor: ana, x: 2, y: 2, actorLink: true}, {actor: bruno, x: 3, y: 2, actorLink: true},
      {actor: cira, x: 2, y: 3, actorLink: true}, {actor: dora, x: 8, y: 8, actorLink: true}, {actor: eli, x: 12, y: 2, actorLink: true}]);
    await waitFor(() => ta?.object && tb?.object && tc?.object && td?.object && te?.object);
    await ana.createEmbeddedDocuments("Item", [{name: "Gate Haul sword", type: "Melee Weapon", system: {isequipped: true, difficulty: 6,
      damage: {attribute: "strength", bonus: 2, type: "lethal"}, attack: {attribute: "dexterity", ability: "melee"}}}]);
    await bruno.toggleStatusEffect("unconscious", {active: true});
    await waitFor(() => hx()?.fallenOf?.(tb)?.down, 4000);

    await G.step("1. who may carry", async () => {
      const a = hx().optionsFor(ta), c = hx().optionsFor(tc);
      const carryA = a.find(o => o.op === "take" && o.want === "carry"), carryC = c.find(o => o.op === "take" && o.want === "carry"), dragC = c.find(o => o.op === "take" && o.want === "drag");
      G.ok("1. who may carry", game.settings.get(IX, "haul") === true && carryA && !carryA.disabled && carryC?.disabled && dragC && !dragC.disabled,
        {ana: a.map(o => [o.label, !!o.disabled]), cira: c.map(o => [o.label, !!o.disabled])});
    });

    await G.step("2. carried on the map", async () => {
      const r = await hx().take(ta, tb, "carry");
      const on = await waitFor(() => Math.round(tb.x) === Math.round(ta.x) && Math.round(tb.y) === Math.round(ta.y), 6000);
      const look = Math.round(Number(tb.rotation)) === 90 && Math.abs(Number(tb.alpha) - 0.6) < 0.01;
      await ta.update({x: ta.x, y: ta.y + 200});
      const along = await waitFor(() => Math.round(tb.y) === Math.round(ta.y) && Math.round(tb.x) === Math.round(ta.x), 8000);
      G.ok("2. carried on the map", r?.ok && on && look && along, {r, look: [tb.rotation, tb.alpha], at: [tb.x, tb.y, ta.x, ta.y]});
    });

    await G.step("3. in a fight", async () => {
      const b = hx().burdenOf(ta);
      const base = C.movementFor(ana);
      const way = C.movement.moveCheck(ta, {x: ta.x + 100, y: ta.y}, base);
      const def = C.movement.defenseMods(ana);
      const plans = C.bestAttack(ana, dora, {}, {attackerTok: ta, targetTok: td, ignoreDistance: true}).plans;
      const sword = plans.find(p => /Gate Haul sword/.test(p.w?.name ?? ""));
      G.ok("3. in a fight", b?.mode === "carry" && b.free === 0 && way.limit === Math.max(1, Math.floor(base.run * 0.5)) && def.diff >= 1 && /dodge/.test(def.notes.join(" "))
        && sword && !sword.valid && /hands/.test(sword.why ?? ""), {b, way, base: base.run, def, sword: sword ? {valid: sword.valid, why: sword.why} : null});
    });

    const cart = (await scene.createEmbeddedDocuments("Tile", [{x: 200, y: 500, width: 200, height: 100, texture: {src: "icons/svg/wing.svg"},
      flags: {[IX]: {mount: true, mountKind: "cart", title: "Gate haul cart"}}}]))[0];
    await G.step("4. laid aboard a cart", async () => {
      await ta.update({x: 200, y: 400});
      await sleep(600);
      const r = await hx().release(ta, {onto: cart.id});
      const aboard = await waitFor(() => (scene.tiles.get(cart.id)?.flags?.[IX]?.riders ?? []).some(x => x.t === tb.uuid), 6000);
      G.ok("4. laid aboard a cart", r?.ok && aboard && !ta.flags?.[IX]?.hauling && !tb.flags?.[IX]?.haul, {r, riders: scene.tiles.get(cart.id)?.flags?.[IX]?.riders});
    });

    await G.step("5. dragged and bleeding", async () => {
      await dora.update({"system.health.damage.lethal": 7});
      await td.update({x: 300, y: 1000});
      await tc.update({x: 400, y: 1000});
      await waitFor(() => hx().fallenOf(td).down, 4000);
      const r = await hx().take(tc, td, "drag");
      await tc.update({x: 800, y: 1000});
      const trail = await waitFor(() => scene.drawings.some(d => d.flags?.[IX]?.trail?.kind === "blood"), 10000);
      const clue = scene.tiles.some(t => t.flags?.[IX]?.clueKind === "trail");
      const behind = Math.round(td.x) === 700 && Math.round(td.y) === 1000;
      G.ok("5. dragged and bleeding", r?.ok && r.mode === "drag" && trail && clue && behind, {r, at: [td.x, td.y], trail, clue});
    });

    await G.step("6. knocked down, it drops", async () => {
      await cira.toggleStatusEffect("wodx-knockdown", {active: true}).catch(() => null);
      const dropped = await waitFor(() => !tc.flags?.[IX]?.hauling && !td.flags?.[IX]?.haul, 8000);
      G.ok("6. knocked down, it drops", dropped, {hauling: tc.flags?.[IX]?.hauling ?? null});
      await cira.toggleStatusEffect("wodx-knockdown", {active: false}).catch(() => null);
    });

    const [chest, wardrobe, safe] = await scene.createEmbeddedDocuments("Tile", [
      {x: 1300, y: 200, width: 100, height: 100, texture: {src: null}, flags: {[IX]: {container: true, kind: "chest", title: "Gate haul chest"}}},
      {x: 1300, y: 700, width: 100, height: 100, texture: {src: "icons/svg/door-exit.svg"}, flags: {[IX]: {hide: true, hideKind: "wardrobe", title: "Gate haul wardrobe"}}},
      {x: 1700, y: 1200, width: 100, height: 100, texture: {src: "icons/svg/padlock.svg"}, flags: {[IX]: {container: true, kind: "safe", title: "Gate haul safe"}}}]);
    await G.step("7. a chest drawn into the map", async () => {
      await te.update({x: 1200, y: 200});
      await sleep(400);
      const r = await hx().take(te, scene.tiles.get(chest.id), "push");
      await te.update({x: 1100, y: 200});
      const moved = await waitFor(() => Math.round(scene.tiles.get(chest.id)?.x) === 1200, 10000);
      const t = scene.tiles.get(chest.id);
      const pic = !!t?.texture?.src && !!t.flags?.[IX]?.haulHome;
      const floor = scene.tiles.some(x => x.flags?.[IX]?.haulFloorOf === chest.id);
      G.ok("7. a chest drawn into the map", r?.ok && moved && pic && floor, {r, x: t?.x, src: t?.texture?.src, home: t?.flags?.[IX]?.haulHome, floor});
      await hx().release(te);
    });

    await G.step("8. a doorway barricaded", async () => {
      const [door] = await scene.createEmbeddedDocuments("Wall", [{c: [1500, 700, 1500, 800], door: 1, ds: 1}]);
      await te.update({x: 1200, y: 700});
      await sleep(400);
      const r = await hx().take(te, scene.tiles.get(wardrobe.id), "push");
      await te.update({x: 1400, y: 700});
      const blocked = await waitFor(() => !!scene.tiles.get(wardrobe.id)?.flags?.[IX]?.barricade, 10000);
      const wall = scene.walls.get(scene.tiles.get(wardrobe.id)?.flags?.[IX]?.barricade?.wall ?? "");
      await hx().release(te);
      await te.update({x: 1100, y: 700});
      const [shooter, mark] = await G.tokens(scene, [{actor: dora, x: 17, y: 7}, {actor: cira, x: 14, y: 7}]);
      await waitFor(() => shooter?.object && mark?.object);
      const cov = game.modules.get(IX).api.coverOnShot(shooter, mark);
      const still = !!scene.tiles.get(wardrobe.id)?.flags?.[IX]?.barricade;
      G.ok("8. a doorway barricaded", r?.ok && blocked && still && !!wall && Number(wall.move) > 0 && door?.id && cov.diff >= 2, {r, wall: wall ? {move: wall.move, c: wall.c} : null, cov, still});
    });

    await G.step("9. a safe will not budge for one", async () => {
      await te.update({x: 1600, y: 1200});
      await td.update({x: 1600, y: 1300});
      await sleep(400);
      await hx().take(te, scene.tiles.get(safe.id), "push");
      const one = hx().loadOf(scene.tiles.get(safe.id));
      await dora.update({"system.health.damage.lethal": 0}).catch(() => null);
      await dora.update({"system.attributes.strength.value": 5, "system.attributes.strength.total": 5});
      await waitFor(() => !hx().fallenOf(td).down, 4000);
      await hx().take(td, scene.tiles.get(safe.id), "push");
      const two = hx().loadOf(scene.tiles.get(safe.id));
      G.ok("9. a safe will not budge for one", one && !one.move.budge && two && two.strength > one.strength && two.team.length === 2, {one: one?.move, two: two ? {move: two.move, strength: two.strength} : null});
      await hx().release(te); await hx().release(td);
    });

    await G.step("10. waking while carried", async () => {
      await tb.update({x: 300, y: 300});
      await ta.update({x: 200, y: 300});
      await sleep(400);
      const r = await hx().take(ta, tb, "carry");
      const since = Date.now();
      await bruno.toggleStatusEffect("unconscious", {active: false});
      const ok = await waitFor(() => game.messages.contents.some(m => m.flags?.[IX]?.wake === tb.uuid && m.timestamp >= since - 1000), 8000);
      const m = game.messages.contents.filter(x => x.flags?.[IX]?.wake === tb.uuid).sort((a, b) => b.timestamp - a.timestamp)[0];
      const opts = hx().optionsFor(tb).map(o => o.label);
      G.ok("10. waking while carried", r?.ok && ok && /Struggle free/.test(text(m?.content)) && opts.includes("Struggle free") && opts.includes("Stay carried"), {r, card: text(m?.content).slice(0, 300), opts});
      await hx().release(ta);
    });
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally { return G.finish(); }
}
