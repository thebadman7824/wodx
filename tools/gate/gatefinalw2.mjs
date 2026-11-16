/**
 * Gate: the final audit's worker w2 fixes (B6730-B6738, B6851), on a testbed lane. Each step goes through the path the
 * menu or the effects card's Apply button takes and reads the game number the fix changes.
 *   1. a Charge on a vampire fills the blood pool, not a Quintessence field (B6730)
 *   2. a Wraith Arcanos with no roll (Smith's Tenacity) puts its Ward on the effects card, and it soaks (B6731)
 *   3. a wraith whose Shadow won Catharsis has each move go to the Storyteller (B6734)
 *   4. Wyrmflesh, woken from Use a fetish, puts a Ward on its wearer that the soak reads (B6737)
 *   5. Malady takes dice from the target's Strength roll, not their Wits roll (B6738)
 *   6. a Dark Ages Rain-Strike takes three dice from the target's next roll (B6739)
 *   7. the apocalyptic form's Lordly Mien eases Charisma rolls and stands after a roll (B6850, B6851)
 *   8. Healing 2 (HH2) takes the wound penalty away while it lasts (B6858)
 *   9. True Faith 3 stops a Sway put on the faithful (B6858)
 * Result: Data/wodx-gate/gatefinalw2-result.json.
 */
import {gate, newestMessage, waitFor} from "./kit.mjs";

const MOD = "wodx-actions";
const keyOf = e => e.flags?.["wodx-chronicle"]?.timed?.key ?? "";

export async function run() {
  const G = gate("gatefinalw2", {stepTimeout: 45000});
  const A = game.modules.get(MOD)?.api;
  try {
    const PW = await import("/modules/wodx-actions/scripts/power-effects.js");
    const PM = await import("/modules/wodx-actions/scripts/power-mods.js");
    const PE = await import("/modules/wodx-actions/scripts/path-effects.js");
    const DC = await import("/modules/wodx-actions/scripts/fae-da-cantrips.js");
    const DE = await import("/modules/wodx-actions/scripts/demon-evocations.js");
    const H = await import("/modules/wodx-actions/scripts/hunter-rules.js");
    const B = await import("/modules/wodx-actions/scripts/binds.js");
    await G.step("0. the api", async () => {
      G.ok("0. the api", typeof A?.effects?.apply === "function" && typeof A?.effects?.powerPlan === "function" && typeof A?.useFetish === "function");
    });
    if ( !A?.effects?.apply ) return G.finish();
    const scene = await G.scene({name: "WoDX gate: final audit w2"});
    const [caster, vamp, wraith, shade, garou, victim, fae, demon] = await G.make(Actor, [
      {name: "Gate W2 Caster", type: "Mortal"}, {name: "Gate W2 Vampire", type: "Vampire"}, {name: "Gate W2 Wraith", type: "Wraith"},
      {name: "Gate W2 Shadow-led", type: "Wraith"}, {name: "Gate W2 Garou", type: "Werewolf"}, {name: "Gate W2 Victim", type: "Mortal"},
      {name: "Gate W2 Rain Target", type: "Mortal"}, {name: "Gate W2 Demon", type: "Mortal"}]);
    const [ct, vt, wt, st, gt, xt, ft, dt] = await G.tokens(scene, [{actor: caster, x: 2, y: 2}, {actor: vamp, x: 4, y: 2}, {actor: wraith, x: 6, y: 2},
      {actor: shade, x: 8, y: 2}, {actor: garou, x: 10, y: 2}, {actor: victim, x: 12, y: 2}, {actor: fae, x: 4, y: 5}, {actor: demon, x: 8, y: 5}]);
    const on = (r, target) => ({key: r.key, target: target.uuid, by: caster.uuid, caster: caster.uuid, out: r.out, name: target.name});
    const apply = (r, target) => A.effects.apply(on(r, target), "Gate W2 Caster");
    const has = (who, key) => who.effects.some(e => keyOf(e) === key || keyOf(e).startsWith(`${key}:`));

    await G.step("1. a Charge on a vampire fills the blood pool (B6730)", async () => {
      const who = vt.actor ?? vamp;
      await who.update({"system.advantages.bloodpool.temporary": 2, "system.advantages.bloodpool.max": 10});
      const r = PW.powerOutcomes({keywords: ["charge"]}, 3, {label: "Gate Charge", hasTarget: true}).results[0];
      await apply(r, who);
      const blood = await waitFor(() => Number(who.system?.advantages?.bloodpool?.temporary) > 2 && Number(who.system.advantages.bloodpool.temporary), 4000);
      G.ok("1. a Charge on a vampire fills the blood pool (B6730)", !!blood && who.system?.quintessence === undefined, {blood, pool: r?.out?.pool});
    });

    await G.step("2. a no-roll Arcanos puts its Ward on the card, and it soaks (B6731)", async () => {
      const who = wt.actor ?? wraith;
      for ( const t of game.user.targets ) t.setTarget(false, {releaseOthers: false});
      const pp = A.effects.powerPlan(who, {set: "wraith", id: "inhabit-smiths-tenacity", name: "Smith's Tenacity", successes: 1, noRoll: true, source: "W20 Wraith"});
      const item = (pp.items ?? []).find(x => x.key === "ward");
      if ( item ) await A.effects.apply(item, who.name);
      await waitFor(() => has(who, PM.KEYS.ward), 4000);
      const dice = A.powerMods.of(who, {soak: true, harm: {type: "lethal"}}).dice;
      G.ok("2. a no-roll Arcanos puts its Ward on the card, and it soaks (B6731)", !!item && dice >= 1, {items: (pp.items ?? []).map(x => x.key), dice});
    });

    await G.step("3. a Shadow-led wraith's moves go to the Storyteller (B6734)", async () => {
      // its own state: no binding left on this wraith by an earlier gate, and the flag read back before judging
      const who = st.actor ?? shade;
      const old = B.bindingsOn(who).map(b => b.id).filter(Boolean);
      if ( old.length ) await who.deleteEmbeddedDocuments("ActiveEffect", old);
      await who.setFlag(MOD, "shadowDominant", true);
      await waitFor(() => who.getFlag(MOD, "shadowDominant") === true, 4000);
      const held = B.bindingsOn(who);
      const g = scene.grid.size;
      const j = B.judgeMove(held, {from: {x: st.x, y: st.y}, to: {x: st.x + g * 2, y: st.y}});
      // cleared the way WoDX Actions clears it when the Psyche takes back control (wraith.js: the flag set to null)
      await who.setFlag(MOD, "shadowDominant", null);
      await waitFor(() => !who.getFlag(MOD, "shadowDominant"), 4000);
      const free = B.bindingsOn(who).filter(b => b.key === "shadow");
      // the real answer: the move is not made (ok false) and goes to the Storyteller (ask), naming the Shadow
      G.ok("3. a Shadow-led wraith's moves go to the Storyteller (B6734)", held.some(b => b.key === "shadow") && j.ask === true && j.ok !== true && !free.length,
        {held: held.map(b => b.key), judged: j, cleared: old.length, after: free.map(b => b.key)});
    });

    await G.step("4. Wyrmflesh woken from Use a fetish wards its wearer (B6737)", async () => {
      const who = gt.actor ?? garou;
      await who.update({"system.advantages.gnosis.temporary": 5, "system.advantages.gnosis.permanent": 5});
      const [it] = await who.createEmbeddedDocuments("Item", [{name: "Wyrmflesh", type: "Fetish", system: {gnosis: 6},
        flags: {"wodx-library": {wonder: {key: "wyrmflesh", line: "garou", kind: "fetish"}}}}]);
      const answer = (app, el) => {
        const root = el instanceof HTMLElement ? el : el?.[0];
        const how = root?.querySelector?.("[name=how]");
        if ( !how || !root.querySelector("[name=item]") ) return;
        root.querySelector("[name=item]").value = it.id;
        how.value = "spend"; how.dispatchEvent(new Event("change", {bubbles: true}));
        setTimeout(() => root.querySelector("button[data-action=ok], button[data-action=use], footer button")?.click(), 150);
      };
      const hk = Hooks.on("renderDialogV2", answer);
      const since = Date.now();
      try { A.useFetish(who); await waitFor(() => newestMessage(since, m => m.flags?.[MOD]?.kind === "effects"), 8000); }
      finally { Hooks.off("renderDialogV2", hk); }
      const msg = newestMessage(since, m => m.flags?.[MOD]?.kind === "effects");
      const item = (msg?.flags?.[MOD]?.items ?? []).find(x => x.key === "ward");
      if ( item ) await A.effects.apply(item, who.name);
      await waitFor(() => has(who, PM.KEYS.ward), 4000);
      const dice = A.powerMods.of(who, {soak: true, harm: {type: "aggravated"}}).dice;
      G.ok("4. Wyrmflesh woken from Use a fetish wards its wearer (B6737)", !!item && dice >= 1, {card: !!msg, dice, gnosis: who.system?.advantages?.gnosis?.temporary});
    });

    await G.step("5. Malady saps the target's Strength roll, not their Wits roll (B6738)", async () => {
      const who = xt.actor ?? victim;
      const [r] = PE.pathOutcomes({id: "thaumaturgy-potestas-exsecrabilis-malady", n: "Malady", p: 300}, 2);
      await apply(r, who);
      await waitFor(() => has(who, PM.KEYS.boost), 4000);
      const str = A.powerMods.of(who, {tags: ["physical", "strength"]}).dice, wits = A.powerMods.of(who, {tags: ["mental", "wits"]}).dice;
      G.ok("5. Malady saps the target's Strength roll, not their Wits roll (B6738)", str === -2 && wits === 0, {str, wits});
    });

    await G.step("6. Rain-Strike takes three dice from the target's next roll (B6739)", async () => {
      const who = ft.actor ?? fae;
      const [r] = DC.presetResults("rain-strike", 3);
      await apply(r, who);
      await waitFor(() => has(who, PM.KEYS.boost), 4000);
      const dice = A.powerMods.of(who, {tags: ["mental", "perception"]}).dice;
      G.ok("6. Rain-Strike takes three dice from the target's next roll (B6739)", dice === -3, {dice, key: r?.out?.key});
    });

    await G.step("7. Lordly Mien eases Charisma rolls and stands after a roll (B6851)", async () => {
      const who = dt.actor ?? demon;
      const [r] = DE.formResults(["Lordly Mien"], "Bel");
      await apply(r, who);
      await waitFor(() => has(who, PM.KEYS.fortune), 4000);
      const cha = A.powerMods.of(who, {tags: ["social", "charisma"]});
      const str = A.powerMods.of(who, {tags: ["physical", "strength"]}).diff;
      await A.powerMods.spend(who, cha.once);
      const stays = has(who, PM.KEYS.fortune);
      G.ok("7. Lordly Mien eases Charisma rolls and stands after a roll (B6851)", cha.diff === -2 && str === 0 && stays, {cha: cha.diff, str, stays});
    });

    await G.step("8. Healing 2 takes the wound penalty away (B6858)", async () => {
      const who = xt.actor ?? victim;
      const [r] = PE.numinaOutcomes("healing", 2, 2, H.NUMINA.healing);
      await apply(r, who);
      const off = await waitFor(() => who.system?.conditions?.isignoringpain === true, 4000);
      G.ok("8. Healing 2 takes the wound penalty away (B6858)", !!off && r?.out?.painless === true, {flag: who.system?.conditions?.isignoringpain});
    });

    await G.step("9. True Faith 3 stops a Sway on the faithful (B6858)", async () => {
      const who = ct.actor ?? caster;
      await who.setFlag(MOD, "trueFaith", 3);
      const r = PW.powerOutcomes({keywords: ["sway"]}, 3, {label: "Gate Sway", hasTarget: true}).results.find(x => x.key === "sway");
      const res = r ? await A.effects.apply({key: r.key, target: who.uuid, by: vamp.uuid, caster: vamp.uuid, out: r.out, name: who.name}, "Gate W2 Vampire") : null;
      const held = who.effects.some(e => keyOf(e).startsWith(PM.KEYS.sway ?? "wodx-effect-sway"));
      await who.unsetFlag(MOD, "trueFaith");
      G.ok("9. True Faith 3 stops a Sway on the faithful (B6858)", !!r && !held, {note: res?.note ?? res, held});
    });
  } catch (e) {
    G.R.errors.push(String(e?.message ?? e));
  }
  return G.finish();
}
