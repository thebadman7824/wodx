/**
 * Gate: WoDX NPC Motives Desk part four, the hunters follow through (h1-h5; B5699-B5703).
 *   1. a raid won: the hunters take the body of the Kindred they came for (or burn it), and leave (h1, h2)
 *   2. a raid beaten off: the survivors go, and their file on the quarry rises a level (h2)
 *   3. a raid that found nobody: one hunter stays to watch the place, the rest go (h2)
 *   4. an investigator comes to the town map, keeps a day among the market, tavern and church, and leaves (h3)
 *   5. someone a hunters' faction finds goes into the region's file (h4)
 *   6. a body found drained feeds the hunters (h5)
 *   7. a body WoDX NPC's carrying took as proof (wodxBodyTaken with the token's uuid, as carry-goals.mjs sends it)
 *      eases the region's pressure by two (B6167)
 * Steps 1 and 7 read the region's pressure itself, not only a flag on the body.
 */
import {gate} from "./kit.mjs";

const ST = "wodx-storyteller";
const st = () => game.modules.get(ST).api;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rect = (s, j, i, w, h) => ({type: "rectangle", x: j * s, y: i * s, width: w * s, height: h * s, rotation: 0, hole: false});
const raider = (target) => ({[`flags.${ST}.reach`]: {kind: "raid", target}});

export async function run() {
  const G = gate("gatehuntfollow");
  const was = {state: game.settings.get(ST, "hunterState"), on: game.settings.get(ST, "hunterPressure"), remains: game.settings.get(ST, "remains")};
  const combats = [];
  try {
    await game.settings.set(ST, "hunterPressure", true);
    await game.settings.set(ST, "remains", true);
    const sc = await G.scene({width: 2400, height: 1600});
    const S = sc.grid.size;
    await sc.createEmbeddedDocuments("Region", [
      {name: "Gate HF Market", color: "#aa8833", shapes: [rect(S, 2, 2, 4, 4)], flags: {"wodx-npc": {place: {kind: "market", owner: "", private: false}}}},
      {name: "Gate HF Tavern", color: "#883322", shapes: [rect(S, 10, 2, 4, 4)], flags: {"wodx-npc": {place: {kind: "tavern", owner: "", private: false}}}},
      {name: "Gate HF Church", color: "#3333aa", shapes: [rect(S, 18, 2, 4, 4)], flags: {"wodx-npc": {place: {kind: "church", owner: "", private: false}}}}
    ]);
    const region = st().hunters.regionAt(sc);
    const fol = st().hunters.follow;
    const [kin, kin2, h1, h2, h3, h4, h5, finder, victim] = await G.make(Actor, [
      {name: "Gate HF Kindred", type: "Vampire"}, {name: "Gate HF Elder", type: "Vampire"},
      {name: "Gate HF Hunter A", type: "Mortal"}, {name: "Gate HF Hunter B", type: "Mortal"}, {name: "Gate HF Hunter C", type: "Mortal"},
      {name: "Gate HF Hunter D", type: "Mortal"}, {name: "Gate HF Hunter E", type: "Mortal"},
      {name: "Gate HF Washerwoman", type: "Mortal"}, {name: "Gate HF Victim", type: "Mortal"}
    ]);
    const fight = async toks => {
      const c = await Combat.create({scene: sc.id});
      combats.push(c.id);
      await c.createEmbeddedDocuments("Combatant", toks.map(t => ({tokenId: t.id, sceneId: sc.id, actorId: t.actorId})));
      return c;
    };

    await G.step("1. a raid won: the body is taken as proof", async () => {
      const [tq, ta, tb] = await G.tokens(sc, [{actor: kin, x: 12, y: 10}, {actor: h1, x: 14, y: 10, ...raider(kin.id)}, {actor: h2, x: 15, y: 11, ...raider(kin.id)}]);
      // pressure to ease: the proof takes two off (B6167 checks the effect, not just the flag)
      await st().hunters.add(region, "manual", {n: 6, why: "Gate HF: pressure to ease"});
      const p0 = st().hunters.state().regions[region]?.pressure ?? 0;
      await sleep(300);
      const c = await fight([tq, ta, tb]);
      await sc.tokens.get(tq.id).actor.toggleStatusEffect("dead", {active: true});
      const end = await fol.raidEnded(c);
      await sleep(600);
      const body = sc.tokens.get(tq.id);
      const p = body?.flags?.[ST]?.proof;
      G.ok("1. the raid is won", end === "won", {end});
      // B6167: with WoDX NPC's carrying the hunter really carries the body (orderCarry); else it is hidden with the proof flag
      const carried = sc.tokens.some(t => t.flags?.["wodx-interactables"]?.hauling?.what === body?.uuid) || !!body?.flags?.["wodx-npc"]?.carriedOff;
      G.ok("1. the body is taken or burned as proof", carried || (!!p && (body.hidden || p.to === "burned")), {p, carried, hidden: body?.hidden});
      await sleep(600);
      const p1 = st().hunters.state().regions[region]?.pressure ?? 0;
      G.ok("1. their proof eases the region's pressure", carried || p1 < p0, {p0, p1, carried});
      // gone, or (the one who carried the body off the edge) hidden: WoDX NPC keeps that token for the walk to the place
      const left = id => { const t = sc.tokens.get(id); return !t || t.hidden; };
      const where = id => { const t = sc.tokens.get(id); return t ? {hidden: t.hidden, hauling: t.flags?.["wodx-interactables"]?.hauling?.what ?? null} : "gone"; };
      G.ok("1. the hunters leave the map", left(ta.id) && left(tb.id), {a: where(ta.id), b: where(tb.id)});
    });

    await G.step("2. a raid beaten off: the file rises", async () => {
      const [tq, ta, tb] = await G.tokens(sc, [{actor: kin2, x: 4, y: 12}, {actor: h3, x: 6, y: 12, ...raider(kin2.id)}, {actor: h4, x: 7, y: 13, ...raider(kin2.id)}]);
      const before = st().hunters.state().regions[region]?.files?.[kin2.id]?.level ?? 0;
      const c = await fight([tq, ta, tb]);
      await sc.tokens.get(ta.id).actor.toggleStatusEffect("dead", {active: true});
      await sc.tokens.get(tb.id).actor.toggleStatusEffect("dead", {active: true});
      const end = await fol.raidEnded(c);
      const after = st().hunters.state().regions[region]?.files?.[kin2.id]?.level ?? 0;
      G.ok("2. the raid is beaten off", end === "beaten", {end});
      G.ok("2. the file on the quarry rises", after > before, {before, after});
    });

    await G.step("3. a raid that found nobody leaves a watcher", async () => {
      const toks = await G.tokens(sc, [{actor: h5, x: 20, y: 12, ...raider(kin.id)}, {actor: h1, x: 21, y: 12, ...raider(kin.id)}]);
      const w = await fol.missed(sc, toks, {target: kin.id});
      await sleep(300);
      G.ok("3. one stays to watch for three nights", !!w && sc.tokens.get(w.id)?.flags?.[ST]?.reach?.watchUntil > game.time.worldTime);
      G.ok("3. the rest go", !sc.tokens.get(toks[1].id));
      await sc.deleteEmbeddedDocuments("Token", [w.id]);
    });

    await G.step("4. an investigator walks the town", async () => {
      const tok = await fol.investigator(region);
      await sleep(400);
      const d = tok ? sc.tokens.get(tok.id) : null;
      G.ok("4. the investigator is on the town map", !!d && d.flags?.[ST]?.reach?.kind === "investigator", {made: !!tok});
      const blocks = d?.actor ? (game.actors.get(d.actorId)?.getFlag("wodx-npc", "routine")?.blocks ?? []) : [];
      G.ok("4. they keep a day among the market, the tavern and the church", blocks.length >= 3, {n: blocks.length});
      if ( d ) {
        await d.update({[`flags.${ST}.reach.until`]: game.time.worldTime - 1, [`flags.${ST}.reach.day`]: Math.floor(game.time.worldTime / 86400)});
        await fol.tick();
        await sleep(400);
        G.ok("4. when their days are done they leave", !sc.tokens.get(d.id));
      }
    });

    await G.step("5. someone found goes into the file", async () => {
      await G.tokens(sc, [{actor: kin2, x: 2, y: 14}]);
      const p0 = st().hunters.state().regions[region]?.pressure ?? 0;
      await fol.found(kin2, {by: "Gate HF Watch"});
      const r = st().hunters.state().regions[region];
      G.ok("5. the file holds them and pressure rose", !!r?.files?.[kin2.id] && r.pressure > p0, {p0, p1: r?.pressure});
    });

    await G.step("6. a body found drained feeds the hunters", async () => {
      const [tv, tf] = await G.tokens(sc, [{actor: victim, x: 8, y: 8}, {actor: finder, x: 20, y: 8}]);
      await st().remains.mark(tv, {cause: "drained"});
      const p0 = st().hunters.state().regions[region]?.pressure ?? 0;
      await st().remains.found(sc.tokens.get(tv.id), finder);
      const p1 = st().hunters.state().regions[region]?.pressure ?? 0;
      G.ok("6. pressure rose", p1 > p0, {p0, p1});
      void tf;
    });

    await G.step("7. a body carried off as proof eases the region", async () => {
      const [tb] = await G.tokens(sc, [{actor: kin, x: 16, y: 14}]);
      await st().hunters.add(region, "manual", {n: 6, why: "Gate HF: pressure to ease"});
      const p0 = st().hunters.state().regions[region]?.pressure ?? 0;
      // the hook as WoDX NPC's carry-goals.mjs calls it once the hunter arrives: body is the token's uuid string
      Hooks.callAll("wodxBodyTaken", {body: sc.tokens.get(tb.id).uuid, actor: kin.id, name: kin.name, by: null, intent: "proof", offstage: true});
      let p1 = p0;
      for ( let i = 0; i < 20 && p1 >= p0; i++ ) { await sleep(150); p1 = st().hunters.state().regions[region]?.pressure ?? 0; }
      G.ok("7. the region's pressure eases by two", p1 === Math.max(0, p0 - 2), {p0, p1});
    });
  } finally {
    for ( const id of combats ) { try { await game.combats.get(id)?.delete(); } catch (e) { /* gone */ } }
    try { await game.settings.set(ST, "hunterState", was.state); } catch (e) { /* none */ }
    try { await game.settings.set(ST, "hunterPressure", was.on); } catch (e) { /* none */ }
    try { await game.settings.set(ST, "remains", was.remains); } catch (e) { /* none */ }
    return G.finish();
  }
}
