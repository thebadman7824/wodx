/**
 * WoDX Combat gate: fighting from the saddle after the books (B4770 to B4776), in rothenstein-wodx, as Gamemaster
 * Test:
 *   await (await import(`/wodx-gate/gatemounted.mjs?${Date.now()}`)).run()
 * Makes its own scratch scene (a road), a horse tile, three actors and their tokens, and removes them; never moves
 * the clock.
 *   1. the api and the setting
 *   2. a blow from the saddle: the attack plan's damage counts the horse's Strength 6, not the rider's 2
 *   3. the horse dodges for its rider: the automatic defense is the mount's, Dexterity 2 + Athletics held to Ride 2
 *   4. a sure seat: Stamina 5 + Ride 5 at 3 keeps the saddle, and the rider stays on the horse
 *   5. thrown: a weak rider loses the saddle; the token comes off the horse's seat on the map and lies Knocked down
 *   6. a bow from a trotting horse: +4 in place of the saddle's +1, with the note
 *   7. an untrained lance charge: the jolt runs back to the rider, and the target must stand against it
 *   8. a real attack on a rider: the card carries the saddle roll after a hit
 *   9. a fall into deep snow: on a snow scene the fall rolls 1 die, not the road's 3 (B6072)
 * Result: Data/wodx-gate/gatemounted-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const IX = "wodx-interactables";
const body = (name, {str = 2, dex = 3, sta = 2, ride = 0, melee = 0, athletics = 0, archery = 0} = {}) => ({name, type: "Mortal",
  system: {attributes: {strength: {value: str, total: str}, dexterity: {value: dex, total: dex}, stamina: {value: sta, total: sta}}, abilities: {ride: {value: ride}, melee: {value: melee}, athletics: {value: athletics}, archery: {value: archery}}}});
const seat = (tok, tile) => ({a: tok.actorId, t: tok.uuid, n: tok.name, dx: tile.x - tok.x, dy: tile.y - tok.y});
const text = html => String(html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

export async function run() {
  const G = gate("gatemounted");
  if ( G.notLive() ) return "Not on the Live world.";
  try {
    const C = game.wodxCombat, M = () => C?.mounted;
    const scene = await G.scene({flags: {[IX]: {ground: "road"}}});
    const [rider, foe, weak] = await G.make(Actor, [
      body("Gate Mounted Rider", {str: 2, dex: 3, sta: 5, ride: 2, melee: 2, archery: 3}),
      body("Gate Mounted Foe", {str: 1, dex: 1, sta: 2, athletics: 0}),
      body("Gate Mounted Weak", {str: 1, dex: 1, sta: 1, ride: 0})]);
    const [ta, tb, tc] = await G.tokens(scene, [{actor: rider, x: 2, y: 2, actorLink: true}, {actor: foe, x: 3, y: 2, actorLink: true}, {actor: weak, x: 6, y: 6, actorLink: true}]);
    await waitFor(() => ta?.object && tb?.object && tc?.object);
    // the system recomputes attribute totals only now and then, so each body gives its total too; and one batch of
    // tiles comes back in any order, so each is found by its title (gate rule 1)
    const tileData = [
      {x: 200, y: 200, width: 100, height: 100, texture: {src: "icons/svg/pawprint.svg"}, flags: {[IX]: {mount: true, mountKind: "horse", title: "Gate warhorse"}}},
      {x: 600, y: 600, width: 100, height: 100, texture: {src: "icons/svg/pawprint.svg"}, flags: {[IX]: {mount: true, mountKind: "horse", title: "Gate nag"}}}];
    const made = await scene.createEmbeddedDocuments("Tile", tileData);
    const [horse, nag] = tileData.map(d => made.find(x => x.flags?.[IX]?.title === d.flags[IX].title));
    await horse.update({[`flags.${IX}.driver`]: seat(ta, horse)});
    await nag.update({[`flags.${IX}.driver`]: seat(tc, nag)});
    await rider.createEmbeddedDocuments("Item", [{name: "Gate lance", type: "Melee Weapon", system: {isequipped: true, difficulty: 6,
      damage: {attribute: "strength", bonus: 3, type: "lethal", isrollable: true}, attack: {attribute: "dexterity", ability: "melee"}}}]);

    await G.step("1. api and setting", async () => {
      const m = M();
      G.ok("1. api and setting", ["rideFor", "strikeAttrOf", "mountDodgeOf", "mountedShotOf", "saddleTest", "afterBlow", "unseat"].every(k => typeof m?.[k] === "function")
        && game.settings.get("wodx-combat", "mountedCombat") === true && M().rideFor(rider, ta)?.role === "reins", {ride: M()?.rideFor?.(rider, ta) ?? null});
    });

    await G.step("2. the horse's Strength", async () => {
      const s = M().strikeAttrOf(rider, "strength", 2, {close: true, attackerTok: ta});
      const plans = C.bestAttack(rider, foe, {}, {attackerTok: ta, targetTok: tb, ignoreDistance: true}).plans;
      const p = plans.find(x => x.w?.name === "Gate lance");
      G.ok("2. the horse's Strength", s.value === 6 && s.mount === true && /V20 Dark Ages p\. 399/.test(s.note), {strike: s, plan: p ? {valid: p.valid, dmg: p.dmgDice ?? p.damageDice ?? null, why: p.why} : null});
    });

    await G.step("3. the horse dodges", async () => {
      const w = {name: "a sword", type: "lethal", ranged: false, ability: "melee"};
      const d = C.bestDefense(rider, {}, w, {});
      const m = d.plans.find(p => p.type === "mount");
      G.ok("3. the horse dodges", d.best?.type === "mount" && m?.dice === 4 && m?.diff === 6, {best: d.best?.type, mount: m ? {dice: m.dice, diff: m.diff, notes: m.notes} : null});
    });

    await G.step("4. a sure seat", async () => {
      const r = await M().saddleTest(rider, {diff: 3, riderTok: ta});
      await r?.apply();
      G.ok("4. a sure seat", r && !r.thrown && /Keeping the saddle/.test(text(r.lines.join(" "))) && M().rideFor(rider, ta)?.role === "reins", {lines: r?.lines?.map(text)});
    });

    await G.step("5. thrown", async () => {
      let r = null;
      for ( let i = 0; i < 6 && !(r?.thrown); i++ ) r = await M().saddleTest(weak, {diff: 10, riderTok: tc});
      const x0 = tc.x;
      await r?.apply();
      const off = await waitFor(() => !scene.tiles.get(nag.id)?.flags?.[IX]?.driver && tc.x !== x0, 8000);
      const down = await waitFor(() => !!game.modules.get("wodx-chronicle")?.api?.conditions?.hasCondition?.(weak, "knockdown"), 8000);
      G.ok("5. thrown", !!r?.thrown && off && down && M().rideFor(weak, tc) === null && /The fall/.test(text(r.lines.join(" "))),
        {thrown: !!r?.thrown, off, down, x: [x0, tc.x], lines: r?.lines?.map(text)});
    });

    let combat = null;
    await G.step("6. a bow at a trot", async () => {
      // G.make matches documents by name, and a combat has none
      combat = await Combat.create({scene: scene.id, active: true});
      await combat.createEmbeddedDocuments("Combatant", [{tokenId: ta.id, sceneId: scene.id, actorId: rider.id}, {tokenId: tb.id, sceneId: scene.id, actorId: foe.id}]);
      await combat.startCombat();
      await ta.setFlag("wodx-combat", "moved", {tag: `${combat.id}:${combat.round}`, yards: 30});
      await tb.update({x: 1400, y: 200});
      const far = await waitFor(() => (tb.object?.center?.x ?? 0) > 1000, 4000);
      const s = M().mountedShotOf(rider, {bow: true, specialty: "", attackerTok: ta, targetTok: tb, target: foe});
      const spec = M().mountedShotOf(rider, {bow: true, specialty: "Mounted", attackerTok: ta, targetTok: tb, target: foe});
      G.ok("6. a bow at a trot", s.diff === 3 && /trot or faster/.test(s.note) && spec.diff === -1, {shot: s, specialty: spec, moved: !!far});
      await tb.update({x: 300, y: 200});
    });

    await G.step("7. an untrained lance charge", async () => {
      const w = {name: "Gate lance", ranged: false, type: "lethal"};
      const r = await M().afterBlow({attacker: rider, attackerTok: ta, target: foe, targetTok: tb, w, hit: true, damageSuccesses: 3, charge: 3});
      const t = text(r.lines.join(" "));
      G.ok("7. an untrained lance charge", /no Ride 3 and Melee 3/.test(t) && /The jolt/.test(t) && /Against the lance/.test(t), {lines: r.lines.map(text)});
    });

    await G.step("8. a real attack on a rider", async () => {
      // the foe rides now, and the rider strikes them with the lance until a blow lands
      await horse.update({[`flags.${IX}.driver`]: null});
      await horse.update({x: tb.x, y: tb.y, [`flags.${IX}.driver`]: seat(tb, {x: tb.x, y: tb.y})});
      await waitFor(() => M().rideFor(foe, tb)?.role === "reins", 4000);
      // a sure hand on the lance, so that a blow lands within the tries
      await rider.update({"system.abilities.melee.value": 5, "system.attributes.dexterity.value": 5});
      let card = "";
      for ( let i = 0; i < 15 && !/Keeping the saddle|knocked out of the saddle|unhorsed/.test(card); i++ ) {
        const [res] = await C.quickAttack({attacker: ta.object, target: tb.object}).catch(() => []);
        card = text(res?.message?.content ?? "");
        if ( !M().rideFor(foe, tb) ) break;
      }
      G.ok("8. a real attack on a rider", /Keeping the saddle|unhorsed|knocked out of the saddle/.test(card), {card: card.slice(0, 600)});
    });
    await G.step("9. a fall into deep snow", async () => {
      await scene.update({[`flags.${IX}.ground`]: "snow"});
      await nag.update({x: tc.x, y: tc.y, [`flags.${IX}.driver`]: seat(tc, {x: tc.x, y: tc.y})});
      await waitFor(() => !!M().rideFor(weak, tc), 4000);
      let r = null;
      for ( let i = 0; i < 6 && !(r?.thrown); i++ ) r = await M().saddleTest(weak, {diff: 10, riderTok: tc});
      const t = text((r?.lines ?? []).join(" "));
      await r?.apply();
      G.ok("9. a fall into deep snow", !!r?.thrown && /1 dice on snow/.test(t), {thrown: !!r?.thrown, lines: r?.lines?.map(text)});
    });
    if ( combat ) await combat.delete().catch(() => {});
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally { return G.finish(); }
}
