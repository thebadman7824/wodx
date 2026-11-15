/**
 * Gate: WoDX NPC Motives Desk part three (e1-e3, g3, g4, g6; B5692-B5696, B5698). g5 is rules only (the harness).
 *   1. a duty lies over an NPC's own hours, gives it a routine if it had none, and can be taken away
 *   2. an NPC's blood cult names its faithful from the place, gives them a night of worship, and is Herd on the sheet (e1, e2)
 *   3. a raid goes to the meeting place (e3)
 *   4. a master's bound servant keeps hours at the master's place (g3)
 *   5. a follower sent to fetch someone who does not mind brings them back (g4)
 *   6. a faction on guard posts one of its people at its place (g6)
 */
import {gate} from "./kit.mjs";

const MOD = "wodx-npc";
const npc = () => game.modules.get(MOD).api;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rect = (s, j, i, w, h) => ({type: "rectangle", x: j * s, y: i * s, width: w * s, height: h * s, rotation: 0, hole: false});

export async function run() {
  const G = gate("gateduties");
  const cultsWas = (() => { try { return game.settings.get(MOD, "cults"); } catch (e) { return null; } })();
  const reachMade = [];
  let facId = null;
  try {
    const sc = await G.scene({width: 2400, height: 1600});
    const S = sc.grid.size;
    await sc.setFlag(MOD, "routineMode", "auto");
    await sc.createEmbeddedDocuments("Region", [
      {name: "Gate Duties Chapel", color: "#aa33aa", shapes: [rect(S, 2, 2, 5, 5)], flags: {[MOD]: {place: {kind: "church", owner: "", private: false}}}},
      {name: "Gate Duties Haven", color: "#333333", shapes: [rect(S, 12, 2, 4, 4)], flags: {[MOD]: {place: {kind: "haven", owner: "", private: false}}}}
    ]);
    const chapel = sc.regions.find(r => r.name === "Gate Duties Chapel"), haven = sc.regions.find(r => r.name === "Gate Duties Haven");
    const [founder, m1, m2, master, servant, fetcher, guest, sentry] = await G.make(Actor, [
      {name: "Gate Duties Setite", type: "Vampire", system: {clan: "Follower of Set"}},
      {name: "Gate Duties Weaver", type: "Mortal"}, {name: "Gate Duties Miller", type: "Mortal"},
      {name: "Gate Duties Master", type: "Vampire", flags: {[MOD]: {routine: {on: true, blocks: [{from: 0, to: 24, place: haven.uuid, activity: "rest", when: "any", days: null, feast: "any", label: ""}], roles: {haven: haven.uuid}}}}},
      {name: "Gate Duties Servant", type: "Mortal"}, {name: "Gate Duties Runner", type: "Mortal"}, {name: "Gate Duties Guest", type: "Mortal"},
      {name: "Gate Duties Sentry", type: "Mortal"}
    ]);
    const [, , , tf, tg] = await G.tokens(sc, [{actor: m1, x: 3, y: 3}, {actor: m2, x: 4, y: 3}, {actor: founder, x: 5, y: 5}, {actor: fetcher, x: 18, y: 10}, {actor: guest, x: 8, y: 12}]);
    await sleep(400);

    await G.step("1. a duty lies over the routine", async () => {
      await npc().routines.setDuty(sentry, "gate", {from: 0, to: 24, place: chapel.uuid, activity: "patrol", label: "Gate duty"});
      const b = npc().routines.blocksFor(sentry);
      G.ok("1. the duty comes first", b[0]?.duty === true && b[0].place === chapel.uuid, {first: b[0]});
      G.ok("1. an NPC with no routine is given one", !!npc().routines.routineOf(sentry)?.on);
      await npc().routines.setDuty(sentry, "gate", null);
      G.ok("1. and the duty can be taken away", !npc().routines.blocksFor(sentry).some(x => x.duty));
    });

    await G.step("2. a blood cult serves its founder and its faithful are seen", async () => {
      const cult = npc().cults.rules.normCult({id: "gateDutiesCult", name: "The Gate Circle", kind: "blood", founder: {id: founder.id, name: founder.name, npc: true},
        place: {key: sc.uuid, name: sc.name}, members: 15, devotion: 3, why: "Setites raise cults wherever they settle"});
      await game.settings.set(MOD, "cults", [...(cultsWas ?? []), cult]);
      const r = await npc().cults.serve(cult);
      G.ok("2. the faithful are named from the place", r.cult.named.some(m => m.id === m1.id) && r.cult.named.some(m => m.id === m2.id), {named: r.cult.named});
      const duty = m1.getFlag(MOD, "duties")?.["cult-gateDutiesCult"];
      G.ok("2. a night of worship at the chapel", duty?.place === chapel.uuid && duty.days?.length === 1, {duty});
      const herd = founder.items.find(i => i.type === "Feature" && i.name === "Herd");
      G.ok("2. the cult is Herd on the founder's sheet", (Number(herd?.system?.value) || 0) >= 1, {herd: herd?.system?.value, lines: r.lines});
      const ord = r.cult.named.find(m => m.rank === "ordained");
      G.ok("2. the ordained drink of the founder", !ord || !!game.actors.get(ord.id)?.flags?.["wodx-creation"]?.lineage?.bonds?.[founder.id], {ord});
    });

    await G.step("3. a raid goes to the meeting place", async () => {
      const before = sc.tokens.size;
      const cult = npc().cults.list().find(c => c.id === "gateDutiesCult");
      const said = await npc().cults.raidPlace(cult);
      await sleep(800);
      for ( const t of sc.tokens ) if ( t.flags?.["wodx-storyteller"]?.reach || t.flags?.["wodx-npc"]?.reach ) reachMade.push(t.id);
      G.ok("3. raiders came to the place", sc.tokens.size > before, {said, before, after: sc.tokens.size});
      if ( game.combat?.scene?.id === sc.id ) await game.combat.delete();
    });

    await G.step("4. a bound servant attends its master", async () => {
      await npc().servants.bind(servant, master, "conditioning", {step: 1, quiet: true, flash: false});
      const made = await npc().servants.world.attendAll([master]);
      const d = servant.getFlag(MOD, "duties")?.[`serve:${master.id}`];
      G.ok("4. the servant keeps hours at the master's haven", d?.place === haven.uuid && d.activity === "attend", {d, made});
    });

    await G.step("5. a fetch brings someone back", async () => {
      const lead = await G.tokens(sc, [{actor: master, x: 20, y: 12}]);
      await fetcher.update({[`flags.${MOD}.order`]: {kind: "fetch", leader: master.id, target: tg.id, by: game.user.id, at: game.time.worldTime}});
      await npc().orders.doFetch(fetcher, sc, tf);
      await sleep(800);
      const o = guest.getFlag(MOD, "order");
      G.ok("5. the guest comes along", o?.kind === "follow" && o.leader === master.id, {o, lead: lead.length});
    });

    await G.step("6. a faction on guard posts a sentry", async () => {
      facId = "gateDutiesFac";
      await npc().factions.mutate(s => { s.factions.push({...npc().factions.rules?.normFaction?.({id: facId, name: "Gate Duties Watch", kind: "mortal", members: [sentry.id], places: [chapel.uuid]}) ?? {id: facId, name: "Gate Duties Watch", kind: "mortal", members: [sentry.id], places: [chapel.uuid], assets: {}}}); return {state: s}; });
      const who = await npc().factions.postGuard({op: "guard", faction: facId, until: 1});
      const d = sentry.getFlag(MOD, "duties")?.[`guard-${facId}`];
      G.ok("6. the sentry keeps watch at the faction's place", who?.id === sentry.id && d?.place === chapel.uuid && d.until > game.time.worldTime, {d});
    });
  } finally {
    try { if ( cultsWas !== null ) await game.settings.set(MOD, "cults", cultsWas); } catch (e) { /* none */ }
    try { if ( facId ) await npc().factions.mutate(s => { s.factions = s.factions.filter(f => f.id !== facId); return {state: s}; }); } catch (e) { /* none */ }
    return G.finish();
  }
}
