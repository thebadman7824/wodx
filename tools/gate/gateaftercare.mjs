/**
 * Gate: WoDX NPC Aftercare Desk (n1, n2, n4-n7; B5800-B5806). n3 (rivals who back down) is rules and wiring only (the harness).
 *   1. an NPC taken by the law is held at the watch-house, serves its sentence off the maps, and goes home when let go (n1)
 *   2. a hurt NPC goes to be tended and mends on the healing clock (n2)
 *   3. a mortal fed on is Dazed and rests at home until morning (n4)
 *   4. an NPC who loses someone close mourns by faith (n5)
 *   5. a robber who got money spends the night at the tavern (n6)
 *   6. married NPCs share a home (n7)
 */
import {gate} from "./kit.mjs";

const MOD = "wodx-npc";
const npc = () => game.modules.get(MOD).api;
const rect = (s, j, i, w, h) => ({type: "rectangle", x: j * s, y: i * s, width: w * s, height: h * s, rotation: 0, hole: false});
const ROUT = home => ({on: true, blocks: [{from: 0, to: 24, place: home, activity: "rest", when: "any", days: null, feast: "any", label: ""}], roles: {home}});

export async function run() {
  const G = gate("gateaftercare");
  const combats = [];
  try {
    const sc = await G.scene({width: 2400, height: 1600});
    const S = sc.grid.size;
    const kinds = [["Watch", "gate"], ["Hospital", "hospital"], ["Church", "church"], ["Tavern", "tavern"], ["Home A", "home"], ["Home B", "home"]];
    await sc.createEmbeddedDocuments("Region", kinds.map(([n, k], i) => ({name: `Gate AC ${n}`, color: "#557799", shapes: [rect(S, 1 + (i % 3) * 7, 1 + Math.floor(i / 3) * 7, 5, 5)], flags: {[MOD]: {place: {kind: k, owner: "", private: false}}}})));
    const R = n => sc.regions.find(r => r.name === `Gate AC ${n}`).uuid;
    const [crook, hurt, vessel, mourner, dead, robber, groom, bride] = await G.make(Actor, [
      {name: "Gate AC Crook", type: "Mortal", flags: {[MOD]: {routine: ROUT(R("Home A"))}}},
      {name: "Gate AC Hurt", type: "Mortal", flags: {[MOD]: {routine: ROUT(R("Home A"))}}},
      {name: "Gate AC Vessel", type: "Mortal", flags: {[MOD]: {routine: ROUT(R("Home B"))}}},
      {name: "Gate AC Widow", type: "Mortal", flags: {[MOD]: {routine: ROUT(R("Home B"))}}},
      {name: "Gate AC Fallen", type: "Mortal"},
      {name: "Gate AC Robber", type: "Mortal", flags: {[MOD]: {routine: ROUT(R("Home A"))}}},
      {name: "Gate AC Groom", type: "Mortal", flags: {[MOD]: {routine: ROUT(R("Home A"))}, "wodx-creation": {sex: "male"}}},
      {name: "Gate AC Bride", type: "Mortal", flags: {[MOD]: {routine: ROUT(R("Home B"))}, "wodx-creation": {sex: "female"}}}
    ]);
    await G.tokens(sc, [{actor: crook, x: 2, y: 2}, {actor: hurt, x: 3, y: 2}, {actor: vessel, x: 4, y: 2}, {actor: mourner, x: 2, y: 10}, {actor: robber, x: 3, y: 10}].map(o => ({...o, actorLink: true})));
    const AC = () => npc().aftercare;
    const t0 = game.time.worldTime;

    await G.step("1. the law: held, served, let go", async () => {
      await AC().onArrest({actor: crook.id});
      G.ok("1. held at the watch-house", crook.getFlag(MOD, "duties")?.law?.place === R("Watch"), {d: crook.getFlag(MOD, "duties")});
      await AC().onSentence({actor: crook.id, mark: {kind: "time", year: 1500, until: 1501}});
      const p = crook.getFlag(MOD, "paused");
      G.ok("1. off the maps for the sentence", p?.reason === "sentence" && p.until > t0 + 300 * 86400 && !crook.getFlag(MOD, "duties")?.law, {p});
      await AC().onSentence({actor: crook.id, mercy: true});
      G.ok("1. let go: home first", !crook.getFlag(MOD, "paused") && crook.getFlag(MOD, "duties")?.["home-first"]?.place === R("Home A"));
    });

    await G.step("2. a hurt NPC is tended and mends", async () => {
      const ta = sc.tokens.find(t => t.actorId === hurt.id);
      await game.wodxCombat.setDamage(ta.actor, {bashing: 0, lethal: 3, aggravated: 0});
      const c = await Combat.create({scene: sc.id});
      combats.push(c.id);
      await c.createEmbeddedDocuments("Combatant", [{tokenId: ta.id, sceneId: sc.id, actorId: hurt.id}]);
      await AC().afterFight(c);
      const a = sc.tokens.get(ta.id).actor;
      G.ok("2. goes to the hospital", hurt.getFlag(MOD, "duties")?.tend?.place === R("Hospital"), {d: hurt.getFlag(MOD, "duties")});
      await a.setFlag(MOD, "mend", {last: game.time.worldTime - 12 * 86400});
      await AC().mendTick();
      const d = a.system.health.damage;
      G.ok("2. mends on the clock", (Number(d.lethal) || 0) < 3, {d});
    });

    await G.step("3. after the Kiss", async () => {
      await AC().onFed({by: {uuid: groom.uuid}, vessel: {uuid: vessel.uuid}, drunk: 3, willing: false});
      G.ok("3. Dazed", !!game.modules.get("wodx-chronicle")?.api?.conditions?.hasCondition?.(vessel, "dazed") || vessel.statuses?.has?.("dazed"));
      G.ok("3. rests at home until morning", vessel.getFlag(MOD, "duties")?.kissed?.place === R("Home B") && !!vessel.getFlag(MOD, "kissed"));
    });

    await G.step("4. mourning", async () => {
      await dead.setFlag(MOD, "diedBy", [robber.id]);
      const m = await AC().mourn(mourner, dead);
      const ds = mourner.getFlag(MOD, "duties") ?? {};
      G.ok("4. mourning days at home", ds["mourn-home"]?.place === R("Home B") && m?.days > 0, {m});
      G.ok("4. evenings at a place of worship (where the map has one)", !ds["mourn-prayer"] || [R("Church")].includes(ds["mourn-prayer"].place), {p: ds["mourn-prayer"]});
    });

    await G.step("5. a robber's night out", async () => {
      await AC().spree(robber);
      G.ok("5. at the tavern until morning", robber.getFlag(MOD, "duties")?.spree?.place === R("Tavern"));
    });

    await G.step("6. married NPCs share a home", async () => {
      await AC().onMarried({a: groom, b: bride});
      G.ok("6. the bride's home is now the groom's", bride.getFlag(MOD, "routine")?.roles?.home === R("Home A"), {roles: bride.getFlag(MOD, "routine")?.roles});
      await AC().onDivorced({a: groom, b: bride});
      G.ok("6. a divorce moves them back", bride.getFlag(MOD, "routine")?.roles?.home === R("Home B"));
    });
  } finally {
    for ( const id of combats ) { try { await game.combats.get(id)?.delete(); } catch (e) { /* gone */ } }
    return G.finish();
  }
}
