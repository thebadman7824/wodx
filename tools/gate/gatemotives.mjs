/**
 * Gate: WoDX NPC Motives Desk part two (r1, r2, g1, g2; B5687, B5688, B5690, B5691).
 *   1. a Kindred NPC whose hunt ends with prey on the map leads it aside and feeds (r1)
 *   2. with no prey on the map the hunt is rolled: fed, or hungry (r1)
 *   3. a hungry NPC is bolder until it feeds (r1)
 *   4. a highwayman on the prowl picks a lone character, closes in and demands money; the answer is acted on (r2)
 *   5. a grudge that turns on someone dear: the dear one hears the tale and remembers it (g1)
 *   6. meaning harm waits for a night and a place to find them (g1)
 *   7. a guard who knows a wanted culprit challenges them (g2)
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-npc";
const npc = () => game.modules.get(MOD).api;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rect = (s, j, i, w, h) => ({type: "rectangle", x: j * s, y: i * s, width: w * s, height: h * s, rotation: 0, hole: false});
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const pos = d => ({x: d.x, y: d.y});

export async function run() {
  const G = gate("gatemotives");
  const memWas = (() => { try { return game.settings.get(MOD, "memory"); } catch (e) { return null; } })();
  const combats = [];
  try {
    const sc = await G.scene({width: 2400, height: 1600});
    const S = sc.grid.size;
    await sc.setFlag(MOD, "routineMode", "auto");
    try { await game.settings.set(MOD, "memory", true); } catch (e) { G.R.notes.push("no memory setting"); }
    const player = game.users.find(u => !u.isGM) ?? null;
    const own = player ? {default: 0, [player.id]: 3} : {default: 0};
    const sharp = {attributes: {perception: {value: 5}, wits: {value: 4}}, abilities: {alertness: {value: 5}, streetwise: {value: 4}}};
    const [vamp, vamp2, prey, pc, robber, dear, guard] = await G.make(Actor, [
      {name: "Gate Motives Hunter", type: "Vampire", system: {...sharp, advantages: {bloodpool: {temporary: 2, max: 10}}}},
      {name: "Gate Motives Far Hunter", type: "Vampire", system: {...sharp, advantages: {bloodpool: {temporary: 2, max: 10}}}},
      {name: "Gate Motives Lamplighter", type: "Mortal", system: {advantages: {bloodpool: {temporary: 10, max: 10}}}},
      {name: "Gate Motives Traveller", type: "Mortal", ownership: own},
      {name: "Gate Motives Highwayman", type: "Mortal", flags: {[MOD]: {archetype: "highwayman"}}},
      {name: "Gate Motives Sister", type: "Mortal"},
      {name: "Gate Motives Watchman", type: "Mortal", system: sharp, flags: {[MOD]: {behavior: {template: "guard"}}}}
    ]);
    await sc.createEmbeddedDocuments("Region", [{name: "Gate Motives Lane", color: "#aa3333", shapes: [rect(S, 1, 1, 20, 12)], flags: {[MOD]: {place: {kind: "street", owner: "", private: false}}}}]);
    const lane = sc.regions.find(r => r.name === "Gate Motives Lane");
    const t = game.time.worldTime;

    await G.step("1. prey on the map is led aside and fed on", async () => {
      const [tv, tp] = await G.tokens(sc, [{actor: vamp, x: 2, y: 2}, {actor: prey, x: 12, y: 8}]);
      await sleep(400);
      const before = dist(pos(tv), pos(tp));
      const line = await npc().routines.resolveHunt(vamp, {place: lane.uuid, activity: "hunt", since: t - 3 * 3600}, t);
      await sleep(1200);
      G.ok("1. the hunter walked to the vessel", dist(pos(sc.tokens.get(tv.id)), pos(tp)) < before, {line});
      G.ok("1. its blood rose", vamp.system.advantages.bloodpool.temporary > 2, {blood: vamp.system.advantages.bloodpool.temporary});
      G.ok("1. no hunger left", !vamp.getFlag(MOD, "hungry"));
      await sc.deleteEmbeddedDocuments("Token", [tv.id, tp.id]);
    });

    await G.step("2. with no prey here the hunt is rolled", async () => {
      const line = await npc().routines.resolveHunt(vamp2, {place: "Scene.gateMotivesNowhere", activity: "hunt", since: t - 4 * 3600}, t);
      const fed = vamp2.system.advantages.bloodpool.temporary > 2, hungry = !!vamp2.getFlag(MOD, "hungry");
      G.ok("2. it fed or it went hungry, never neither", fed !== hungry, {line, fed, hungry});
    });

    await G.step("3. a hungry NPC is bolder", async () => {
      const calm = npc().profileFor(vamp).aggression;
      await vamp.setFlag(MOD, "hungry", {since: game.time.worldTime});
      G.ok("3. hunger raises its aggression", npc().profileFor(vamp).aggression > calm);
      await vamp.unsetFlag(MOD, "hungry");
    });

    await G.step("4. a highwayman picks a lone traveller and demands money", async () => {
      if ( !player ) { G.R.notes.push("no player user on this world: the robbery step needs one"); G.ok("4. skipped without a player", true); return; }
      await robber.update({[`flags.${MOD}.routine`]: {on: true, blocks: [{from: 0, to: 24, place: lane.uuid, activity: "hunt", when: "any", days: null, feast: "any", label: "On the high road"}], roles: {}},
        [`flags.${MOD}.where`]: {place: lane.uuid, index: 0, activity: "hunt", label: "", since: 0}});
      const [tr, tc] = await G.tokens(sc, [{actor: robber, x: 3, y: 10}, {actor: pc, x: 14, y: 10}]);
      await sleep(400);
      const before = dist(pos(tr), pos(tc));
      const since = Date.now();
      const cards = await npc().prowl.check(sc);
      await sleep(1200);
      G.ok("4. a demand is made", cards.length === 1 && !!cards[0]?.getFlag(MOD, "prowl"), {n: cards.length});
      G.ok("4. the robber closed in", dist(pos(sc.tokens.get(tr.id)), pos(tc)) < before);
      G.ok("4. not the same mark twice", (await npc().prowl.check(sc)).length === 0);
      const res = await npc().prowl.answer(cards[0], "talk");
      if ( game.combat ) combats.push(game.combat.id);
      G.ok("4. the answer is acted on", !!res && (res.go || res.fight) && cards[0].getFlag(MOD, "prowl")?.done === "talk", {res});
      G.ok("4. the robber remembers it", (robber.getFlag(MOD, "memory")?.[pc.id] ?? []).length > 0);
      void since;
    });

    await G.step("5. a grudge turned on someone dear", async () => {
      await pc.setFlag(MOD, "household", [{id: dear.id, name: dear.name, role: "sibling"}]);
      const said = await npc().memory.act(robber, pc, "kin");
      const notes = dear.getFlag(MOD, "memory")?.[pc.id] ?? [];
      G.ok("5. the dear one heard the tale", notes.some(n => /tale/.test(n.text ?? "")), {said, notes});
    });

    await G.step("6. meaning harm waits for its night", async () => {
      await npc().memory.act(robber, pc, "violence");
      const f = robber.getFlag(MOD, "harm");
      G.ok("6. the harm is waiting, or has come", !!f || [...game.messages].some(m => /Men sent by Gate Motives Highwayman/.test(m.content ?? "")), {f});
      await robber.unsetFlag(MOD, "harm");
    });

    await G.step("7. a watchman who knows a culprit challenges them", async () => {
      const [tg, tc] = await G.tokens(sc, [{actor: guard, x: 5, y: 3}, {actor: pc, x: 9, y: 3}]);
      await sleep(400);
      const before = dist(pos(tg), pos(tc));
      const act = await npc().wanted.knowAndAct(sc.tokens.get(tg.id).object, sc.tokens.get(tc.id).object, guard, pc, {what: "a theft"}, {difficulty: 2, text: "Perception + Alertness, difficulty 2"}, "guard");
      await sleep(1200);
      G.ok("7. the watchman acts by kind", act === "challenge", {act});
      G.ok("7. and goes to them", dist(pos(sc.tokens.get(tg.id)), pos(tc)) < before);
    });
  } finally {
    for ( const id of combats ) { try { await game.combats.get(id)?.delete(); } catch (e) { /* gone */ } }
    try { if ( memWas !== null ) await game.settings.set(MOD, "memory", memWas); } catch (e) { /* none */ }
    return G.finish();
  }
}
