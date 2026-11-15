/**
 * Gate: Demon evocations that work, and rituals and keywords with a tangible effect (B5780-B5792), on a testbed lane.
 *   1. the api
 *   2. Alter Memory on an NPC: Memory altered lands on the sheet; Undo takes it off
 *   3. Cleanse purges a poison from the sheet; Undo puts it back
 *   4. The Mark of the Celestials puts its mark on the target
 *   5. Lay a Path: two linked regions that carry a token between them; Undo removes them
 *   6. Sense: a detection sense on the caster's token; Undo takes it off
 *   7. Know: a secret the target keeps is found out by the caster
 *   8. Talking to a beast needs a Speak power; with one running, the beast listens
 *   9. A Hekau ritual (Simple Weather Magic) and a book ritual (Voice of the Jackal) give results that change the game
 *  10. A binding holds the token: the hook is on, Hold stops a move, Fear stops going nearer, a command asks
 * Result: Data/wodx-gate/gateevocations-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-actions";

export async function run() {
  const G = gate("gateevocations", {stepTimeout: 45000});
  const A = game.modules.get(MOD)?.api;
  const NPC = game.modules.get("wodx-npc")?.api;
  try {
    const DE = await import("/modules/wodx-actions/scripts/demon-evocations.js");
    const MH = await import("/modules/wodx-actions/scripts/mummy-hekau.js");
    const PW = await import("/modules/wodx-actions/scripts/power-effects.js");
    const BR = await import("/modules/wodx-actions/scripts/book-rituals.js");
    await G.step("1. the api", async () => {
      G.ok("1. the api", typeof A?.effects?.apply === "function" && typeof A?.effects?.undo === "function" && typeof A?.acts?.coverUp === "function");
    });
    if ( !A?.effects?.apply ) return;
    const scene = await G.scene({name: "WoDX gate: evocations"});
    const [demon, witness, sick, marked, beast, talker, keeper] = await G.make(Actor, [
      {name: "Gate Evo Demon", type: "Demon"},
      {name: "Gate Evo Witness", type: "Mortal"},
      {name: "Gate Evo Sick", type: "Mortal"},
      {name: "Gate Evo Marked", type: "Mortal"},
      {name: "Gate Evo Beast", type: "Mortal"},
      {name: "Gate Evo Talker", type: "Mortal"},
      {name: "Gate Evo Keeper", type: "Mortal"}]);
    await witness.update({"system.advantages.willpower.permanent": 0, "system.advantages.willpower.temporary": 0});
    const [dt, wt, st, mt] = await G.tokens(scene, [{actor: demon, x: 3, y: 3}, {actor: witness, x: 4, y: 3}, {actor: sick, x: 5, y: 3}, {actor: marked, x: 6, y: 3}]);
    const evo = (lore, level, s = 4) => DE.evocationResults(lore, level, s, {faith: 4, name: `${lore} ${level}`, source: "gate"})[0];
    const item = (r, target, extra = {}) => ({key: r.key, target: target.uuid, by: demon.uuid, caster: demon.uuid, out: {...r.out, ...extra}});
    const undo = async rec => { try { await A.effects.undo(rec); } catch (e) { /* the gate reads the state */ } };

    await G.step("2. Alter Memory on an NPC; Undo takes it off", async () => {
      const rec = await A.effects.apply(item(evo("humanity", 5), wt.actor ?? witness, {mode: "erase"}), "Gate Evo Demon");
      const on = () => (wt.actor ?? witness).effects.some(e => e.name === "Memory altered");
      const had = await waitFor(on, 4000);
      await undo(rec);
      const gone = await waitFor(() => !on(), 4000);
      G.ok("2. Alter Memory on an NPC; Undo takes it off", !!had && !!gone, {rec: Object.keys(rec ?? {})});
    });

    await G.step("3. Cleanse purges a poison; Undo puts it back", async () => {
      const body = st.actor ?? sick;
      await body.createEmbeddedDocuments("ActiveEffect", [{name: "Poisoned", img: "icons/svg/poison.svg"}]);
      const rec = await A.effects.apply(item(evo("awakening", 2), body), "Gate Evo Demon");
      const has = () => (st.actor ?? sick).effects.some(e => e.name === "Poisoned");
      const gone = await waitFor(() => !has(), 4000);
      await undo(rec);
      const back = await waitFor(has, 4000);
      G.ok("3. Cleanse purges a poison; Undo puts it back", !!gone && !!back, {rec: Object.keys(rec ?? {})});
    });

    await G.step("4. The Mark of the Celestials marks the target", async () => {
      const body = mt.actor ?? marked;
      const rec = await A.effects.apply(item(evo("radiance", 4, 2), body, {say: "Shun this one", tone: "shun"}), "Gate Evo Demon");
      const ok = await waitFor(() => (mt.actor ?? marked).effects.some(e => String(e.name).startsWith("Marked:")), 4000);
      await undo(rec);
      G.ok("4. The Mark of the Celestials marks the target", !!ok);
    });

    await G.step("5. Lay a Path: two linked regions; Undo removes them", async () => {
      const g = scene.grid?.size ?? 100;
      const rec = await A.effects.apply(item(evo("paths", 2), demon, {from: {x: g * 8, y: g * 8}, to: {x: g * 12, y: g * 8}}), "Gate Evo Demon");
      const path = () => [...scene.regions].filter(r => r.flags?.[MOD]?.demonPath);
      const two = await waitFor(() => path().length === 2 && path().every(r => r.behaviors.some(b => b.type === "teleportToken")), 4000);
      await undo(rec);
      const gone = await waitFor(() => path().length === 0, 4000);
      G.ok("5. Lay a Path: two linked regions; Undo removes them", !!two && !!gone, {rec: Object.keys(rec ?? {})});
    });

    await G.step("6. Sense lays a detection sense on the caster's token; Undo takes it off", async () => {
      const [r] = PW.powerOutcomes({keywords: ["sense"]}, 3, {label: "Gate Sense"}).results;
      const rec = await A.effects.apply({key: r.key, target: demon.uuid, by: demon.uuid, caster: demon.uuid, out: r.out}, "Gate Evo Demon");
      const modes = () => { const m = scene.tokens.get(dt.id)?.detectionModes ?? []; return Array.isArray(m) ? m.some(x => x.id === "senseAll" && x.enabled) : !!m.senseAll?.enabled; };
      const on = await waitFor(modes, 4000);
      await undo(rec);
      const off = await waitFor(() => !modes(), 4000);
      G.ok("6. Sense lays a detection sense on the caster's token; Undo takes it off", r.out.kind === "detect" && !!on && !!off, {rec: Object.keys(rec ?? {})});
    });

    await G.step("7. Know: a secret the target keeps is found out", async () => {
      const S = NPC?.secrets;
      if ( !S?.add ) return G.ok("7. Know: a secret the target keeps is found out", false, {why: "WoDX NPC secrets api missing"});
      await S.add(keeper, {kind: "sect", text: "Gate secret: took the silver", weight: 3});
      const [r] = PW.powerOutcomes({keywords: ["know"]}, 2, {label: "Gate Know", hasTarget: true}).results;
      await A.effects.apply({key: r.key, target: keeper.uuid, by: demon.uuid, caster: demon.uuid, out: r.out}, "Gate Evo Demon");
      const found = await waitFor(() => (S.of(keeper) ?? []).some(x => x.found?.[demon.id]), 4000);
      G.ok("7. Know: a secret the target keeps is found out", r.out.kind === "question" && !!found, {secrets: (S.of(keeper) ?? []).length});
    });

    await G.step("8. Talking to a beast needs a Speak power", async () => {
      const gate8 = NPC?.talk?.speechGate;
      if ( !gate8 ) return G.ok("8. Talking to a beast needs a Speak power", false, {why: "speechGate missing"});
      await beast.setFlag("wodx-npc", "passerbyBase", "animal");
      const before = gate8(beast, talker);
      const [r] = PW.powerOutcomes({keywords: ["speak"]}, 2, {label: "Gate Speak"}).results;
      const rec = await A.effects.apply({key: r.key, target: talker.uuid, by: talker.uuid, caster: talker.uuid, out: r.out}, "Gate Evo Talker");
      const after = await waitFor(() => gate8(beast, talker) === "", 4000);
      await undo(rec);
      G.ok("8. Talking to a beast needs a Speak power", !!before && !!after, {before});
    });

    await G.step("9. Hekau and book rituals give results that change the game", async () => {
      const w = MH.hekauResults("simple-weather-magic", 2, {name: "Simple Weather Magic"});
      const v = (BR.BOOK_RITUALS.w20?.list ?? []).find(r => r.n === "Voice of the Jackal");
      const kw = v?.k ?? ["speak", "fortune:curse"];
      const j = PW.powerOutcomes({keywords: kw}, 2, {label: "Voice of the Jackal", hasTarget: true}).results;
      G.ok("9. Hekau and book rituals give results that change the game", w[0]?.out?.kind === "weather" && j.some(x => x.out?.name === "Cursed"),
        {weather: w[0]?.out?.kind, jackal: j.map(x => x.out?.kind)});
    });

    await G.step("10. A binding holds the token", async () => {
      const B = await import("/modules/wodx-actions/scripts/binds.js");
      const fx = key => ({flags: {"wodx-chronicle": {timed: {key: `wodx-effect-${key}`}}}, name: key});
      const from = {x: 0, y: 0}, feared = [{x: 1000, y: 0}];
      const hold = B.judgeMove(B.bindingsOn({effects: [fx("hold")]}), {from, to: {x: 100, y: 0}});
      const fear = B.judgeMove(B.bindingsOn({effects: [fx("fear")]}), {from, to: {x: 500, y: 0}, feared});
      const cmd = B.judgeMove(B.bindingsOn({effects: [fx("sway")]}), {from, to: {x: 100, y: 0}});
      let setting = null;
      try { setting = game.settings.get(MOD, "bindingsHold"); } catch (e) { setting = null; }
      G.ok("10. A binding holds the token", setting === true && !hold.ok && !fear.ok && cmd.ask === true, {setting});
    });
  } catch (e) {
    G.R.errors.push(String(e?.message ?? e));
  }
  return G.finish();
}
