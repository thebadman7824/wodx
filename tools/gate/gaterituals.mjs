/**
 * Gate: rituals and powers that really work (B6000-B6016), on a testbed lane. Each step casts a book ritual's or a
 * keyword's result through the effects card and checks the game changed, not that a named effect appeared.
 *   1. the api: power mods for rolls, soak, Initiative and actions
 *   2. a Ward (Defense of the Sacred Haven): armour dice on a sunlight soak, none on a plain blow; the soak card names it
 *   3. a Curse (Voice of the Jackal): +difficulty on the next roll, then spent
 *   4. a Boost (Essence of Longing): dice on Social rolls only
 *   5. a Calm on oneself (Blood Rush): resisting frenzy is easier
 *   6. Banish ends the powers on the target; Undo puts them back
 *   7. a place rite (Rite of the Opened Caern) thins the Gauntlet here; Undo puts it back
 *   8. Work opens the nearest door; Undo shuts it
 *   9. Imbue (Enchant Talisman) makes a charged item; Undo takes it away
 *  10. an Illusion stands on the map; Undo takes it away
 *  11. Manifest shows a hidden being; Undo hides it again
 *  12. the token shows the power (a token look for a Ward)
 *  13. a Hekau figurine is a summoning, and a Dark Ages summoning rote calls beings
 * Result: Data/wodx-gate/gaterituals-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-actions";

export async function run() {
  const G = gate("gaterituals", {stepTimeout: 45000});
  const A = game.modules.get(MOD)?.api;
  const C = game.wodxCombat ?? game.modules.get("wodx-combat")?.api;
  try {
    const BR = await import("/modules/wodx-actions/scripts/book-rituals.js");
    const PW = await import("/modules/wodx-actions/scripts/power-effects.js");
    const PM = await import("/modules/wodx-actions/scripts/power-mods.js");
    const MH = await import("/modules/wodx-actions/scripts/mummy-hekau.js");
    const DAE = await import("/modules/wodx-actions/scripts/mage-da-effects.js");
    await G.step("1. the api", async () => {
      G.ok("1. the api", typeof A?.powerMods?.of === "function" && typeof A?.powerMods?.spend === "function" && typeof A?.effects?.apply === "function");
    });
    if ( !A?.powerMods?.of || !A?.effects?.apply ) return;
    const scene = await G.scene({name: "WoDX gate: rituals"});
    const [caster, warded, cursed, charmer, beast, banished, maker, ghost] = await G.make(Actor, [
      {name: "Gate Rite Caster", type: "Vampire"}, {name: "Gate Rite Warded", type: "Vampire"}, {name: "Gate Rite Cursed", type: "Mortal"},
      {name: "Gate Rite Charmer", type: "Mortal"}, {name: "Gate Rite Beast", type: "Vampire"}, {name: "Gate Rite Banished", type: "Mortal"},
      {name: "Gate Rite Maker", type: "Mortal"}, {name: "Gate Rite Ghost", type: "Mortal"}]);
    const [ct, wt, , , , bt, , gt] = await G.tokens(scene, [{actor: caster, x: 3, y: 3}, {actor: warded, x: 5, y: 3}, {actor: cursed, x: 7, y: 3},
      {actor: charmer, x: 9, y: 3}, {actor: beast, x: 11, y: 3}, {actor: banished, x: 4, y: 6}, {actor: maker, x: 8, y: 6}, {actor: ghost, x: 12, y: 6, hidden: true}]);
    const rit = (set, name) => BR.BOOK_RITUALS[set].list.find(r => r.n === name);
    const results = (set, name, s = 3, hasTarget = true) => BR.ritualResults(rit(set, name), s, {hasTarget});
    const on = (r, target) => ({key: r.key, target: target.uuid, by: caster.uuid, caster: caster.uuid, out: r.out, name: target.name});
    const apply = (r, target) => A.effects.apply(on(r, target), "Gate Rite Caster");
    const undo = async rec => { try { await A.effects.undo(rec ? [rec] : []); } catch (e) { /* the gate reads the state */ } };
    const kw = (key, s = 3, o = {}) => PW.powerOutcomes({keywords: [key]}, s, {label: `Gate ${key}`, hasTarget: true, ...o}).results[0];

    await G.step("2. a Ward is armour on a sunlight soak, not on a plain blow; the soak card names it", async () => {
      const r = results("v20", "Defense of the Sacred Haven", 3, false).find(x => x.key === "ward");
      await apply(r, wt.actor ?? warded);
      const who = wt.actor ?? warded;
      await waitFor(() => who.effects.some(e => e.flags?.["wodx-chronicle"]?.timed?.key === PM.KEYS.ward), 4000);
      const sun = A.powerMods.of(who, {soak: true, harm: {type: "aggravated", of: "sunlight", fireSun: true}}).dice;
      const plain = A.powerMods.of(who, {soak: true, harm: {type: "lethal"}}).dice;
      let named = null;
      if ( C?.soakAndApply ) {
        const res = await C.soakAndApply(wt.object ?? wt, {mode: "levels", amount: 1, type: "aggravated", soak: true, fireSun: true});
        named = String(res?.message?.content ?? "").includes("armour");
        try { await C.setDamage?.(who, {bashing: 0, lethal: 0, aggravated: 0}); } catch (e) { /* health put back by hand */ }
      }
      G.ok("2. a Ward is armour on a sunlight soak, not on a plain blow; the soak card names it", sun > 0 && plain === 0 && named !== false, {sun, plain, named});
    });

    await G.step("3. a Curse makes the next roll harder, and is spent on it", async () => {
      const r = results("w20", "Voice of the Jackal").find(x => x.out.name === "Cursed");
      const who = cursed;
      await apply(r, who);
      await waitFor(() => who.effects.some(e => e.flags?.["wodx-chronicle"]?.timed?.key === PM.KEYS.fortune), 4000);
      const m = A.powerMods.of(who, {tags: ["perception"]});
      const spent = await A.powerMods.spend(who, m.once);
      const gone = await waitFor(() => !who.effects.some(e => e.flags?.["wodx-chronicle"]?.timed?.key === PM.KEYS.fortune), 4000);
      G.ok("3. a Curse makes the next roll harder, and is spent on it", m.diff > 0 && spent === 1 && !!gone, {diff: m.diff, spent});
    });

    await G.step("4. a Boost adds dice to Social rolls only", async () => {
      const r = results("mummy", "Essence of Longing", 3, false).find(x => x.key === "boost");
      await apply(r, charmer);
      await waitFor(() => charmer.effects.some(e => e.flags?.["wodx-chronicle"]?.timed?.key === PM.KEYS.boost), 4000);
      const social = A.powerMods.of(charmer, {tags: ["social", "charisma"]}).dice, phys = A.powerMods.of(charmer, {tags: ["dexterity"]}).dice;
      G.ok("4. a Boost adds dice to Social rolls only", social > 0 && phys === 0, {social, phys});
    });

    await G.step("5. Blood Rush calms the caster: resisting frenzy is easier", async () => {
      const r = results("v20", "Blood Rush", 3, false).find(x => x.out.name === "Calmed");
      await apply(r, beast);
      await waitFor(() => beast.effects.some(e => e.flags?.["wodx-chronicle"]?.timed?.key === PM.KEYS.calm), 4000);
      const d = A.powerMods.of(beast, {tags: ["frenzy"], frenzy: true}).diff;
      G.ok("5. Blood Rush calms the caster: resisting frenzy is easier", !!r && d < 0, {diff: d});
    });

    await G.step("6. Banish ends the powers on the target; Undo puts them back", async () => {
      const who = bt.actor ?? banished;
      await apply(kw("boost"), who);
      const has = () => who.effects.some(e => String(e.flags?.["wodx-chronicle"]?.timed?.key ?? "").startsWith("wodx-effect-"));
      await waitFor(has, 4000);
      const rec = await apply(kw("banish"), who);
      const gone = await waitFor(() => !has(), 4000);
      await undo(rec);
      const back = await waitFor(has, 4000);
      G.ok("6. Banish ends the powers on the target; Undo puts them back", !!gone && !!back, {rec: Object.keys(rec ?? {})});
    });

    await G.step("7. a place rite thins the Gauntlet here; Undo puts it back", async () => {
      const OW = game.modules.get("wodx-otherworlds")?.api;
      if ( !OW?.drift?.of ) return G.ok("7. a place rite thins the Gauntlet here; Undo puts it back", false, {why: "WoDX Otherworlds drift api missing"});
      const v0 = Number(OW.drift.of(scene)?.value ?? 0);
      const r = results("w20", "Rite of the Opened Caern").find(x => x.key === "place");
      const rec = await apply(r, ct);
      const moved = await waitFor(() => Number(OW.drift.of(scene)?.value ?? 0) < v0, 4000);
      await undo(rec);
      const back = await waitFor(() => Number(OW.drift.of(scene)?.value ?? 0) === v0, 4000);
      G.ok("7. a place rite thins the Gauntlet here; Undo puts it back", !!moved && !!back, {v0, rec: Object.keys(rec ?? {})});
    });

    await G.step("8. Work opens the nearest door; Undo shuts it", async () => {
      const g = scene.grid.size;
      const [door] = await scene.createEmbeddedDocuments("Wall", [{c: [g * 4, g * 2, g * 4, g * 3], door: 1, ds: 0}]);
      const r = kw("work");
      const rec = await A.effects.apply({...on(r, ct), at: {x: g * 4, y: g * 2.5}}, "Gate Rite Caster");
      const open = await waitFor(() => scene.walls.get(door.id)?.ds === 1, 4000);
      await undo(rec);
      const shut = await waitFor(() => scene.walls.get(door.id)?.ds === 0, 4000);
      G.ok("8. Work opens the nearest door; Undo shuts it", !!open && !!shut, {rec: Object.keys(rec ?? {})});
    });

    await G.step("9. Imbue makes a charged item; Undo takes it away", async () => {
      const r = results("w20", "Rite of the Fetish").find(x => x.key === "imbue") ?? kw("imbue");
      const rec = await A.effects.apply({...on({...r, out: {...r.out, thing: "Gate talisman"}}, maker)}, "Gate Rite Caster");
      const item = await waitFor(() => maker.items.find(i => i.flags?.[MOD]?.imbued), 4000);
      await undo(rec);
      const gone = await waitFor(() => !maker.items.some(i => i.flags?.[MOD]?.imbued), 4000);
      G.ok("9. Imbue makes a charged item; Undo takes it away", !!item && !!gone, {item: item?.name});
    });

    await G.step("10. an Illusion stands on the map; Undo takes it away", async () => {
      const g = scene.grid.size;
      const rec = await A.effects.apply({...on(kw("illusion"), ct), at: {x: g * 14, y: g * 10}}, "Gate Rite Caster");
      const tile = await waitFor(() => [...scene.tiles].find(t => t.flags?.[MOD]?.illusion), 4000);
      await undo(rec);
      const gone = await waitFor(() => ![...scene.tiles].some(t => t.flags?.[MOD]?.illusion), 4000);
      G.ok("10. an Illusion stands on the map; Undo takes it away", !!tile && !!gone);
    });

    await G.step("11. Manifest shows a hidden being; Undo hides it again", async () => {
      const rec = await apply(kw("manifest"), gt);
      const shown = await waitFor(() => scene.tokens.get(gt.id)?.hidden === false, 4000);
      await undo(rec);
      const hid = await waitFor(() => scene.tokens.get(gt.id)?.hidden === true, 4000);
      G.ok("11. Manifest shows a hidden being; Undo hides it again", !!shown && !!hid, {rec: Object.keys(rec ?? {})});
    });

    await G.step("12. the token shows the power", async () => {
      const who = wt.actor ?? warded;
      const looks = PM.looksFrom(PM.effectsOf(who));
      const L = game.modules.get("wodx-chronicle")?.api?.tokenLooks;
      const live = L?.looksOf && wt.object ? L.looksOf(wt.object) : null;
      G.ok("12. the token shows the power", looks.length > 0 && (!L?.looksOf || !wt.object || !!live?.aura), {looks: looks.length, aura: !!live?.aura});
    });

    await G.step("13. a Hekau figurine and a Dark Ages summoning rote call beings", async () => {
      const fig = MH.hekauResults("simple-servitor", 3, {name: "Simple Servitor"});
      const pack = DAE.outcomesOf(DAE.DA_EFFECTS["g-summonpack"], {key: "summon", label: "Summon the Pack"}, 3);
      G.ok("13. a Hekau figurine and a Dark Ages summoning rote call beings", fig.some(r => r.out.kind === "summon") && pack.some(r => r.out.kind === "summon"));
    });
  } catch (e) {
    G.R.errors.push(String(e?.message ?? e));
  }
  return G.finish();
}
