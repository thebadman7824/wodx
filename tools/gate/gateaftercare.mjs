/**
 * Gate: WoDX NPC Aftercare Desk (n1, n2, n4-n7; B5800-B5806). n3 (rivals who back down) is rules and wiring only (the harness).
 *   1. an NPC taken by the law is held at the watch-house, serves its sentence off the maps, and goes home when let go (n1)
 *   2. a hurt NPC goes to be tended when the fight is deleted (the real deleteCombat hook) and mends on the healing clock;
 *      an NPC on an UNLINKED token too (B6173), and a token whose NPC shares its actor with other tokens is left alone (n2)
 *   3. a mortal fed on (wodxFed, as WoDX Actions fires it) is Dazed and rests at home; an UNLINKED passer-by's Daze
 *      lifts once the clock passes its end (B6173) (n4)
 *   4. an NPC who loses someone close mourns by faith (n5)
 *   5. a robber who got money spends the night at the tavern (n6)
 *   6. married NPCs share a home (n7)
 */
import {gate, waitFor} from "./kit.mjs";

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
    const [crook, hurt, vessel, mourner, dead, robber, groom, bride, hurtU, crowd, vesselU] = await G.make(Actor, [
      {name: "Gate AC Crook", type: "Mortal", flags: {[MOD]: {routine: ROUT(R("Home A"))}}},
      {name: "Gate AC Hurt", type: "Mortal", flags: {[MOD]: {routine: ROUT(R("Home A"))}}},
      {name: "Gate AC Vessel", type: "Mortal", flags: {[MOD]: {routine: ROUT(R("Home B"))}}},
      {name: "Gate AC Widow", type: "Mortal", flags: {[MOD]: {routine: ROUT(R("Home B"))}}},
      {name: "Gate AC Fallen", type: "Mortal"},
      {name: "Gate AC Robber", type: "Mortal", flags: {[MOD]: {routine: ROUT(R("Home A"))}}},
      {name: "Gate AC Groom", type: "Mortal", flags: {[MOD]: {routine: ROUT(R("Home A"))}, "wodx-creation": {sex: "male"}}},
      {name: "Gate AC Bride", type: "Mortal", flags: {[MOD]: {routine: ROUT(R("Home B"))}, "wodx-creation": {sex: "female"}}},
      {name: "Gate AC Hurt Unlinked", type: "Mortal", flags: {[MOD]: {routine: ROUT(R("Home B"))}}},
      {name: "Gate AC Crowd", type: "Mortal", flags: {[MOD]: {routine: ROUT(R("Home B"))}}},
      {name: "Gate AC Passer-by", type: "Mortal"}
    ]);
    const [tHurtU, tCrowd1, , tVesselU] = await G.tokens(sc, [{actor: hurtU, x: 9, y: 10, actorLink: false}, {actor: crowd, x: 10, y: 10, actorLink: false},
      {actor: crowd, x: 11, y: 10, actorLink: false}, {actor: vesselU, x: 12, y: 10, actorLink: false}]);
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
      G.ok("1. let go: home first", !crook.getFlag(MOD, "paused") && crook.getFlag(MOD, "duties")?.["home-first"]?.place === R("Home A"),
        {paused: crook.getFlag(MOD, "paused") ?? null, d: crook.getFlag(MOD, "duties") ?? null});
    });

    /** A fight with these tokens in it, deleted: WoDX NPC's deleteCombat hook does the aftercare, as when a fight ends in play. */
    const fightEnds = async toks => {
      const c = await Combat.create({scene: sc.id});
      combats.push(c.id);
      await c.createEmbeddedDocuments("Combatant", toks.map(t => ({tokenId: t.id, sceneId: sc.id, actorId: t.actorId})));
      await c.delete();
    };
    await G.step("2. a hurt NPC is tended and mends", async () => {
      const ta = sc.tokens.find(t => t.actorId === hurt.id);
      await game.wodxCombat.setDamage(ta.actor, {bashing: 0, lethal: 3, aggravated: 0});
      await game.wodxCombat.setDamage(sc.tokens.get(tHurtU.id).actor, {bashing: 0, lethal: 3, aggravated: 0});
      await game.wodxCombat.setDamage(sc.tokens.get(tCrowd1.id).actor, {bashing: 0, lethal: 3, aggravated: 0});
      await fightEnds([ta, sc.tokens.get(tHurtU.id), sc.tokens.get(tCrowd1.id)]);
      await waitFor(() => !!hurt.getFlag(MOD, "duties")?.tend && !!hurtU.getFlag(MOD, "duties")?.tend, 6000);
      G.ok("2. goes to the hospital when the fight ends", hurt.getFlag(MOD, "duties")?.tend?.place === R("Hospital"), {d: hurt.getFlag(MOD, "duties")});
      G.ok("2. an unlinked NPC goes to be tended too", hurtU.getFlag(MOD, "duties")?.tend?.place === R("Hospital"), {d: hurtU.getFlag(MOD, "duties") ?? null});
      G.ok("2. an NPC sharing its actor with other tokens keeps its routine", !crowd.getFlag(MOD, "duties")?.tend, {d: crowd.getFlag(MOD, "duties") ?? null});
      const a = sc.tokens.get(ta.id).actor, au = sc.tokens.get(tHurtU.id).actor;
      await a.setFlag(MOD, "mend", {last: game.time.worldTime - 12 * 86400});
      await au.setFlag(MOD, "mend", {last: game.time.worldTime - 12 * 86400});
      await AC().mendTick();
      const d = a.system.health.damage, du = sc.tokens.get(tHurtU.id).actor.system.health.damage;
      G.ok("2. mends on the clock (linked and unlinked)", (Number(d.lethal) || 0) < 3 && (Number(du.lethal) || 0) < 3, {d, du});
    });

    await G.step("3. after the Kiss", async () => {
      const dazed = x => !!game.modules.get("wodx-chronicle")?.api?.conditions?.hasCondition?.(x, "dazed") || !!x?.statuses?.has?.("wodx-dazed");
      Hooks.callAll("wodxFed", {by: {uuid: groom.uuid, name: groom.name}, vessel: {uuid: vessel.uuid, name: vessel.name}, drunk: 3, willing: false, fought: false});
      const pb = () => sc.tokens.get(tVesselU.id).actor;
      Hooks.callAll("wodxFed", {by: {uuid: groom.uuid, name: groom.name}, vessel: {uuid: pb().uuid, name: pb().name}, drunk: 1, willing: false, fought: false});
      // the wodxFed hook is not awaited: onFed sets the Daze first, then the kissed flag, then the duty, so wait for the end state
      const resting = () => vessel.getFlag(MOD, "duties")?.kissed?.place === R("Home B") && !!vessel.getFlag(MOD, "kissed");
      await waitFor(() => dazed(vessel) && dazed(pb()) && resting() && !!pb().getFlag(MOD, "kissed"), 6000);
      G.ok("3. Dazed", dazed(vessel) && dazed(pb()), {linked: dazed(vessel), unlinked: dazed(pb())});
      G.ok("3. rests at home until morning", resting(), {kissed: vessel.getFlag(MOD, "kissed") ?? null, duty: vessel.getFlag(MOD, "duties")?.kissed ?? null, home: R("Home B")});
      // the clock runs past the Daze (ten minutes for a light drink): WoDX NPC's updateWorldTime hook lifts it
      await game.time.advance(20 * 60);
      // kissTick lifts the Daze, then clears the flag: wait for both
      await waitFor(() => !dazed(pb()) && !pb().getFlag(MOD, "kissed"), 6000);
      G.ok("3. an unlinked passer-by's Daze lifts on the clock", !dazed(pb()) && !pb().getFlag(MOD, "kissed"),
        {stillDazed: dazed(pb()), kissed: pb().getFlag(MOD, "kissed") ?? null, now: game.time.worldTime});
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
      G.ok("5. at the tavern until morning", robber.getFlag(MOD, "duties")?.spree?.place === R("Tavern"), {d: robber.getFlag(MOD, "duties") ?? null});
    });

    await G.step("6. married NPCs share a home", async () => {
      await AC().onMarried({a: groom, b: bride});
      G.ok("6. the bride's home is now the groom's", bride.getFlag(MOD, "routine")?.roles?.home === R("Home A"), {roles: bride.getFlag(MOD, "routine")?.roles});
      await AC().onDivorced({a: groom, b: bride});
      G.ok("6. a divorce moves them back", bride.getFlag(MOD, "routine")?.roles?.home === R("Home B"), {roles: bride.getFlag(MOD, "routine")?.roles});
    });
  } finally {
    for ( const id of combats ) { try { await game.combats.get(id)?.delete(); } catch (e) { /* gone */ } }
    return G.finish();
  }
}
