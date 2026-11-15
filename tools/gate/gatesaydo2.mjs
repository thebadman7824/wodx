/**
 * WoDX gate: more systems that used to only say now do (Say or Do Desk, B5820-B5826), in Foundry, in
 * rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatesaydo2.mjs?${Date.now()}`)).run()
 * Makes its own scene and characters and removes them; puts the Avatar Storm and law heat settings back.
 *   1. the Avatar Storm's Shredding Winds put aggravated damage on a mage's health track
 *   2. a court's fine is taken from the purse at once
 *   3. an outlaw sentence puts the character at Wanted in that land
 *   4. a patron who raises a building pays for it
 *   5. a loud noise stuns a heightened-senses character with no Willpower to hold (Dazed)
 *   6. a betrayal that breaks a heart leaves the lover Grieving (one die fewer on social rolls)
 *   7. a prison sentence takes the character's token off the map, and a pardon brings it back
 *   8. a brand shows on the token, and a pardon takes it off
 * Result: Data/wodx-gate/gatesaydo2-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const KEEP = [["wodx-otherworlds", "avatarStorm"], ["wodx-chronicle", "lawHeat"], ["wodx-chronicle", "lawHeatOn"], ["wodx-chronicle", "podCities"]];
const total = a => { const d = a.system?.health?.damage ?? {}; return (Number(d.bashing) || 0) + (Number(d.lethal) || 0) + (Number(d.aggravated) || 0); };

export async function run() {
  const G = gate("gatesaydo2");
  if ( G.notLive() ) return "Not on the Live world.";
  const C = () => game.modules.get("wodx-chronicle")?.api;
  const M = () => game.modules.get("wodx-storyteller")?.api?.upkeep?.money;
  const keep = {};
  for ( const [m, k] of KEEP ) { try { keep[`${m}.${k}`] = foundry.utils.deepClone(game.settings.get(m, k)); } catch (e) { /* not here */ } }
  try {
    for ( const k of ["lawHeatOn", "podCities"] ) { try { await game.settings.set("wodx-chronicle", k, true); } catch (e) { /* not here */ } }
    const scene = await G.scene();
    const [mage, convict, outlaw, patron] = await G.make(Actor, [
      {name: "Gate SayDo Mage", type: "Mage", prototypeToken: {actorLink: true}},
      {name: "Gate SayDo Convict", type: "Mortal", prototypeToken: {actorLink: true}},
      {name: "Gate SayDo Outlaw", type: "Mortal", prototypeToken: {actorLink: true}},
      {name: "Gate SayDo Patron", type: "Mortal", prototypeToken: {actorLink: true}}]);
    const [ear, lover, beloved] = await G.make(Actor, [
      {name: "Gate SayDo Sharp Ears", type: "Mortal", prototypeToken: {actorLink: true}},
      {name: "Gate SayDo Lover", type: "Mortal", prototypeToken: {actorLink: true}},
      {name: "Gate SayDo Beloved", type: "Mortal", prototypeToken: {actorLink: true}}]);
    const [tm, te] = await G.tokens(scene, [{actor: mage, x: 3, y: 3}, {actor: ear, x: 6, y: 3}]);
    const worth = a => { const p = M()?.purse?.(a) ?? {}; return (Number(p.carried) || 0) + (Number(p.bank) || 0) - (Number(p.debt) || 0); };

    await G.step("1 the Storm hurts", async () => {
      await game.settings.set("wodx-otherworlds", "avatarStorm", "on");
      const before = total(mage);
      const r = await game.modules.get("wodx-otherworlds")?.api?.realms?.shreddingWinds?.(tm.document ?? tm, {dice: [8, 7, 3]});
      const after = total(mage);
      G.ok("1 the Storm hurts", r?.levels > 0 && r?.applied === true && after > before, {levels: r?.levels, applied: r?.applied, before, after, damage: mage.system?.health?.damage});
    });

    const region = "moravia";
    await G.step("2 the fine is taken", async () => {
      await M()?.receive?.(convict, 100000, {note: "gate"});
      const before = worth(convict);
      const mark = await C()?.law?.sentence?.pass?.({actorId: convict.id, name: convict.name, region, year: C()?.eras?.currentYear?.() ?? 1197, weight: 3}, "fine");
      const after = worth(convict);
      G.ok("2 the fine is taken", mark?.kind === "fine" && after < before, {kind: mark?.kind, before, after});
    });

    await G.step("3 the outlaw is wanted", async () => {
      await C()?.law?.sentence?.pass?.({actorId: outlaw.id, name: outlaw.name, region, year: C()?.eras?.currentYear?.() ?? 1197, weight: 6}, "outlawry");
      const h = C()?.law?.heat?.of?.(outlaw.id, region);
      G.ok("3 the outlaw is wanted", !!h && ["warrant", "manhunt"].includes(h.stage?.key), {stage: h?.stage?.key ?? null, heat: h?.heat ?? null});
    });

    await G.step("4 the patron pays", async () => {
      await M()?.receive?.(patron, 1000, {note: "gate"});
      const before = worth(patron);
      await C()?.pod?.raiseBuilding?.({patron: patron.id, building: "Gate chapel", faction: "", cost: 50});
      const after = worth(patron);
      G.ok("4 the patron pays", after === before - 50, {before, after, podOn: (() => { try { return game.settings.get("wodx-chronicle", "podCities"); } catch (e) { return null; } })()});
    });

    await G.step("5 senses overwhelmed", async () => {
      await ear.update({"system.advantages.willpower.permanent": 0, "system.advantages.willpower.temporary": 0, "flags.wodx-senses.sight": "heightened"});
      Hooks.callAll("wodxInteractablesNoise", {noise: "loud", scene: canvas.scene.id, heard: [(te.document ?? te).uuid]});
      const dazed = await waitFor(() => ear.statuses?.has?.("wodx-dazed"), 8000);
      const senses = !!game.modules.get("wodx-senses")?.active;
      G.ok("5 senses overwhelmed", !!dazed, {senses, statuses: [...(ear.statuses ?? [])]});
    });

    await G.step("6 grieving", async () => {
      const H = game.modules.get("wodx-npc")?.api?.hearts;
      await lover.update({"system.advantages.willpower.permanent": 1, "system.advantages.willpower.temporary": 1});
      let sick = false, tries = 0, last = null;
      // one Willpower die at 7: it may be borne or botched; try a few times, each a fresh betrayal
      while ( !sick && tries++ < 8 ) {
        await lover.setFlag("wodx-npc", "warmth", {[beloved.id]: {value: 4, at: game.time.worldTime, log: []}});
        last = await H?.court?.(lover, beloved, "betrayal", {why: "the gate"});
        sick = lover.statuses?.has?.("wodx-grieving");
      }
      // what WoDX Actions' social rolls read off the conditions: one die fewer
      const dice = (C()?.conditions?.conditionsOf?.(lover) ?? []).reduce((t, c) => t + (Number(c.mods?.socialDice) || 0), 0);
      const actions = !!game.modules.get("wodx-actions")?.active;
      G.ok("6 grieving", sick && dice === -1, {tries, dice, actions, last: last?.heartbreak ?? last?.why ?? null});
    });

    await G.step("7 time served", async () => {
      const [prisoner] = await G.make(Actor, [{name: "Gate SayDo Prisoner", type: "Mortal", prototypeToken: {actorLink: true}}]);
      const [tp] = await G.tokens(scene, [{actor: prisoner, x: 8, y: 3}]);
      const L = C()?.law?.sentence;
      const mark = await L?.pass?.({actorId: prisoner.id, name: prisoner.name, region, year: C()?.eras?.currentYear?.() ?? 1197, weight: 4}, "prison");
      const gone = (tp.document ?? tp).hidden === true;
      await L?.pardon?.(prisoner, mark?.id);
      const back = (tp.document ?? tp).hidden === false && !prisoner.getFlag("wodx-chronicle", "lawAway");
      G.ok("7 time served", mark?.kind === "time" && gone && back, {kind: mark?.kind, until: mark?.until, gone, back});
    });

    await G.step("8 the brand shows", async () => {
      const L = C()?.law?.sentence;
      const mark = await L?.pass?.({actorId: outlaw.id, name: outlaw.name, region, year: C()?.eras?.currentYear?.() ?? 1197, weight: 4}, "maiming");
      const shown = outlaw.statuses?.has?.("wodx-branded");
      await L?.pardon?.(outlaw, mark?.id);
      const off = !outlaw.statuses?.has?.("wodx-branded");
      G.ok("8 the brand shows", mark?.kind === "brand" && shown && off, {kind: mark?.kind, shown, off});
    });
  } finally {
    for ( const [m, k] of KEEP ) { try { if ( `${m}.${k}` in keep ) await game.settings.set(m, k, keep[`${m}.${k}`]); } catch (e) { /* put back */ } }
    return G.finish();
  }
}
