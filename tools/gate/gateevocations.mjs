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
 *  11. Send Vision (B6379): the target's token shows "Seeing a vision" (a status on the map) and its player's card;
 *      Undo takes it off
 *  12. Lore of Paths 3-5 (B6379) on a laid path: Conceal hides both ends from the players, Close stops the carrying,
 *      Warp turns the start back on itself; each is put back by Undo
 *  13. Hand of Faith (B6379), the evocation window: a demon ready with Hand of Faith turns another demon's Fire of
 *      Heaven back on its user (the user is burned, the one aimed at is not) and the hold is spent (dice forced to 10s)
 *  14. Touch from Afar (B6379), the evocation window: with someone named afar and no one targeted, the next Fire of
 *      Heaven burns the one named, and the reach is spent (dice forced to 10s)
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
    const undo = async rec => { try { await A.effects.undo(rec ? [rec] : []); } catch (e) { /* the gate reads the state */ } };

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
      G.ok("6. Sense lays a detection sense on the caster's token; Undo takes it off", r.out.kind === "detect" && !!on && !!off, {rec: Object.keys(rec ?? {}), on: !!on, off: !!off, modes: scene.tokens.get(dt.id)?.toObject?.().detectionModes});
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
    await G.step("11. Send Vision marks the target's token; Undo takes it off", async () => {
      const body = mt.actor ?? marked;
      const r = evo("celestials", 2, 2);
      const rec = await A.effects.apply(item(r, body, {say: "A burning tower on the hill"}), "Gate Evo Demon");
      const on = () => !!(mt.actor ?? marked).statuses?.has?.("wodx-vision");
      const had = await waitFor(on, 4000);
      await undo(rec);
      const gone = await waitFor(() => !on(), 4000);
      G.ok("11. Send Vision marks the target's token; Undo takes it off", r?.out?.kind === "vision" && !!had && !!gone, {kind: r?.out?.kind, had: !!had, gone: !!gone});
    });

    await G.step("12. Lore of Paths: conceal, close and warp a laid path", async () => {
      const g = scene.grid?.size ?? 100;
      const lay = await A.effects.apply(item(evo("paths", 2), demon, {from: {x: g * 8, y: g * 10}, to: {x: g * 12, y: g * 10}}), "Gate Evo Demon");
      const path = () => [...scene.regions].filter(r => r.flags?.[MOD]?.demonPath);
      await waitFor(() => path().length === 2, 4000);
      // each op asks which path (two ends) and, for Warp, where it leads: the first choice is taken
      const pickHook = Hooks.on("renderDialogV2", (app, el) => {
        const root = el?.querySelector ? el : app.element;
        if ( root?.querySelector?.("select[name=pick]") ) setTimeout(() => root.querySelector("button[data-action=ok]")?.click(), 50);
      });
      const seen = {};
      try {
        const LAYER = CONST.REGION_VISIBILITY?.LAYER ?? 0;
        const c = await A.effects.apply(item(evo("paths", 3), demon), "Gate Evo Demon");
        seen.concealed = await waitFor(() => path().length === 2 && path().every(r => r.visibility === LAYER), 4000);
        await undo(c);
        seen.shown = await waitFor(() => path().every(r => r.visibility !== LAYER), 4000);
        const tps = () => path().flatMap(r => [...r.behaviors].filter(b => b.type === "teleportToken"));
        const cl = await A.effects.apply(item(evo("paths", 4), demon), "Gate Evo Demon");
        seen.closed = await waitFor(() => tps().length === 2 && tps().every(b => b.disabled), 4000);
        await undo(cl);
        seen.open = await waitFor(() => tps().every(b => !b.disabled), 4000);
        const before = tps().map(b => [...(b.system?.destinations ?? [])].join());
        const w = await A.effects.apply(item(evo("paths", 5), demon), "Gate Evo Demon");
        seen.warped = await waitFor(() => tps().some(b => [...(b.system?.destinations ?? [])].includes(b.parent?.uuid)), 4000);
        await undo(w);
        seen.back = await waitFor(() => tps().map(b => [...(b.system?.destinations ?? [])].join()).join("|") === before.join("|"), 4000);
      } finally { Hooks.off("renderDialogV2", pickHook); await undo(lay); }
      G.ok("12. Lore of Paths: conceal, close and warp a laid path", Object.values(seen).length === 6 && Object.values(seen).every(Boolean), seen);
    });

    // 13-14: the evocation window itself, as play runs it (dice forced to 10s while the card applies)
    const dice0 = CONFIG.Dice.randomUniform;
    const tens = async () => {
      for ( const u of [0.05, 0.95] ) { CONFIG.Dice.randomUniform = () => u; if ( (await new Roll("1d10").evaluate()).dice[0].results[0].result === 10 ) return; }
    };
    const evokeAs = async (who, evoKey) => {
      const id = Hooks.on("renderDialogV2", (app, el) => {
        const root = el?.querySelector ? el : app.element;
        const sel = root?.querySelector?.("select[name=evo]");
        if ( !sel ) return;
        Hooks.off("renderDialogV2", id);
        sel.value = evoKey;
        setTimeout(() => root.querySelector("button[data-action=ok]")?.click(), 50);
      });
      try { return await A.demonEvoke({actor: who}); } finally { Hooks.off("renderDialogV2", id); }
    };
    const fiend = name => ({name, type: "Demon", prototypeToken: {actorLink: true}, flags: {[MOD]: {demon: {lores: {celestials: 5}}}}});
    const [d1, d2, aimed, far] = await G.make(Actor, [fiend("Gate Evo Caster"), fiend("Gate Evo Seizer"),
      {name: "Gate Evo Aimed", type: "Mortal", prototypeToken: {actorLink: true}}, {name: "Gate Evo Far", type: "Mortal", prototypeToken: {actorLink: true}}]);
    const demonly = {"system.advantages.faith.permanent": 6, "system.advantages.faith.temporary": 6, "system.advantages.torment.permanent": 3, "system.advantages.torment.temporary": 0,
      "system.attributes.dexterity.value": 4, "system.attributes.dexterity.total": 4};
    for ( const d of [d1, d2] ) await d.update(demonly);
    const [t1, , tA, tFar] = await G.tokens(scene, [{actor: d1, x: 3, y: 6, actorLink: true}, {actor: d2, x: 5, y: 6, actorLink: true},
      {actor: aimed, x: 4, y: 7, actorLink: true}, {actor: far, x: 14, y: 12, actorLink: true}]);
    await waitFor(() => t1?.object && tA?.object && tFar?.object, 6000);
    // B6446: a mortal takes the Fire of Heaven as lethal (Combat: mortals treat aggravated damage as lethal), so the burn is
    // read as lethal and aggravated together
    const hurt = a => (Number(a.system?.health?.damage?.lethal) || 0) + (Number(a.system?.health?.damage?.aggravated) || 0);

    await G.step("13. Hand of Faith turns the Fire of Heaven back on its user", async () => {
      const hold = await A.effects.apply({key: "banish", target: d2.uuid, by: d2.uuid, caster: d2.uuid,
        out: {kind: "seize", label: "Hand of Faith", successes: 20, timed: {kind: "scene"}, source: "gate"}}, "Gate Evo Seizer");
      const ready = () => d2.effects.some(e => e.flags?.["wodx-chronicle"]?.timed?.key === "wodx-act-seize");
      await waitFor(ready, 4000);
      const was = {self: hurt(d1), aimed: hurt(aimed)}, readied = ready();
      tA.object?.setTarget?.(true, {releaseOthers: true, groupSelection: false});
      await A.limits?.clear?.(d1);
      await tens();
      try {
        await evokeAs(d1, "celestials:4");
        await waitFor(() => hurt(d1) > was.self, 8000);
      } finally { CONFIG.Dice.randomUniform = dice0; tA.object?.setTarget?.(false); }
      G.ok("13. Hand of Faith turns the Fire of Heaven back on its user", readied && hurt(d1) > was.self && hurt(aimed) === was.aimed && !ready(),
        {readied, self: [was.self, hurt(d1)], aimed: [was.aimed, hurt(aimed)], spent: !ready(), hold: Object.keys(hold ?? {})});
    });

    await G.step("14. Touch from Afar: the next Fire of Heaven burns the one named", async () => {
      await A.effects.apply({key: "sense", target: d1.uuid, by: d1.uuid, caster: d1.uuid,
        out: {kind: "remote", label: "Touch from Afar", far: {uuid: tFar.uuid, name: far.name}, timed: {kind: "scene"}, source: "gate"}}, "Gate Evo Caster");
      const reach = () => !!d1.getFlag(MOD, "farTarget");
      await waitFor(reach, 4000);
      const was = hurt(far), set = reach();
      for ( const t of [...game.user.targets] ) t.setTarget(false, {releaseOthers: false});
      await A.limits?.clear?.(d1);
      await d1.update({"system.advantages.faith.temporary": 6});
      await tens();
      try {
        await evokeAs(d1, "celestials:4");
        await waitFor(() => hurt(far) > was, 8000);
      } finally { CONFIG.Dice.randomUniform = dice0; }
      G.ok("14. Touch from Afar: the next Fire of Heaven burns the one named", set && hurt(far) > was && !reach(), {set, far: [was, hurt(far)], spent: !reach()});
    });
  } catch (e) {
    G.R.errors.push(String(e?.message ?? e));
  }
  return G.finish();
}
