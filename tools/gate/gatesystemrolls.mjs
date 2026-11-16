/**
 * Final systems audit, worker 1 (B6720): the system's own power window counts WoDX's modifiers, as the general roll
 * window does. In rothenstein-wodx as a Gamemaster:
 *   await (await import(`/wodx-gate/gatesystemrolls.mjs?${Date.now()}`)).run()
 *   1. modules: WoDX Sheets' sheetRollMods api and setting, Chronicle's conditions
 *   2. a Discipline power (Manipulation + Intimidation, 5 dice) rolled through the system's own power window (its
 *      DialogPower object, getData then the Roll button's handler _rollPower) by a vampire carrying WoDX NPC's
 *      Grieving rolls 4 dice, and the card names Grieving
 *   3. the same power with the world setting wodx-sheets.sheetRollMods off rolls the full 5
 *   4. a Strength + Brawl power (not social) under Grieving rolls its full pool
 *   5. (B6722) a rule setting changed in the menus counts at once: lowestDifficulty set to 3 shows in CONFIG without a
 *      reload, and set back
 * Makes its own actors and removes them; puts the setting back. Result: Data/wodx-gate/gatesystemrolls-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const SH = "wodx-sheets", CH = "wodx-chronicle";
const num = v => Number(v) || 0;

export async function run() {
  const G = gate("gatesystemrolls");
  if ( G.notLive() ) return "gatesystemrolls never runs in the Live world";
  let keep;
  try { keep = game.settings.get(SH, "sheetRollMods"); } catch (e) { keep = undefined; }
  try {
    await waitFor(() => !!game.modules.get(SH)?.api && !!game.modules.get(CH)?.api, 30000);
    const Ch = game.modules.get(CH)?.api;
    await G.step("1. modules", async () => G.ok("1. modules", typeof game.modules.get(SH)?.api?.sheetRollMods === "function" && keep !== undefined && !!Ch?.conditions?.setCondition,
      {api: !!game.modules.get(SH)?.api?.sheetRollMods, setting: keep}));

    const attrs = {strength: 2, dexterity: 2, stamina: 2, charisma: 2, manipulation: 3, appearance: 2, perception: 2, intelligence: 2, wits: 2};
    const [vamp] = await G.make(Actor, [{name: "Gate SystemRolls Mourner", type: "Vampire", system: {
      attributes: Object.fromEntries(Object.entries(attrs).map(([k, v]) => [k, {value: v, total: v}])),
      abilities: {intimidation: {value: 2}, brawl: {value: 1}}}}]);
    const [command, blow] = await vamp.createEmbeddedDocuments("Item", [
      {name: "Gate SystemRolls Command", type: "Power", system: {type: "wod.types.disciplinepower", dice1: "manipulation", dice2: "intimidation", difficulty: 6, level: 1}},
      {name: "Gate SystemRolls Blow", type: "Power", system: {type: "wod.types.disciplinepower", dice1: "strength", dice2: "brawl", difficulty: 6, level: 1}}]);
    await Ch.conditions.setCondition(vamp, "grieving", true);
    await waitFor(() => (Ch.conditions.conditionsOf?.(vamp) ?? []).some(c => c.id === "grieving"), 4000);

    /**
     * B6720 gate fix: the run on #1748 never reached a roll through a click on the rendered window. The gate now builds the
     * system's own power window object and calls its Roll handler (_rollPower, the code the Roll button runs), so the
     * roll goes through DiceRoller exactly as a click does, and reports any error and whether the window rendered.
     */
    const PD = await import("/systems/worldofdarkness/module/dialogs/dialog-power.js");
    const rollPower = async item => {
      const t0 = Date.now(), info = {};
      const errs = [], onErr = e => errs.push(String(e?.reason?.message ?? e?.message ?? e));
      globalThis.addEventListener?.("unhandledrejection", onErr);
      try {
        const dlg = new PD.DialogPower(vamp, new PD.DisciplinePower(foundry.utils.duplicate(vamp.items.get(item.id))));
        await dlg.getData();
        info.attributeValue = dlg.object.attributeValue; info.abilityValue = dlg.object.abilityValue;
        await dlg._rollPower({preventDefault() {}, currentTarget: null});
      } catch (e) { errs.push(e.message); }
      let m = null;
      await waitFor(() => (m = [...game.messages].filter(x => (x.timestamp ?? 0) >= t0 && (x.speaker?.actor === vamp.id || x.speaker?.alias === vamp.name) && (x.rolls?.length ?? 0) > 0).at(-1)), 8000);
      globalThis.removeEventListener?.("unhandledrejection", onErr);
      const W = CONFIG.worldofdarkness, explodes = W?.useexplodingDice && ["always", "nospeciality"].includes(W?.explodingDice);
      const faces = (m?.rolls ?? []).map(r => num(r.total));
      return {rolled: faces.length - (explodes ? faces.filter(f => f === 10).length : 0), named: /Grieving/.test(m?.content ?? ""), card: !!m, ...info, errors: errs.slice(0, 3)};
    };
    const pool = num(vamp.system.attributes.manipulation.total) + num(vamp.system.abilities.intimidation.value);
    try {
      await game.settings.set(SH, "sheetRollMods", true);
      await G.step("2. Grieving takes a die off a social Discipline from the system's power window", async () => {
        const r = await rollPower(command);
        G.ok("2. Grieving takes a die off a social Discipline from the system's power window", r.card && r.rolled === pool - 1 && r.named, {pool, ...r});
      });
      await G.step("4. a physical power under Grieving keeps its pool", async () => {
        const r = await rollPower(blow);
        const p = num(vamp.system.attributes.strength.total) + num(vamp.system.abilities.brawl.value);
        G.ok("4. a physical power under Grieving keeps its pool", r.card && r.rolled === p && !r.named, {pool: p, ...r});
      });
      await game.settings.set(SH, "sheetRollMods", false);
      await G.step("3. with the setting off the power rolls its full pool", async () => {
        const r = await rollPower(command);
        G.ok("3. with the setting off the power rolls its full pool", r.card && r.rolled === pool && !r.named, {pool, ...r});
      });
    } finally {
      await Ch.conditions.setCondition(vamp, "grieving", false)?.catch?.(() => null);
      if ( keep !== undefined ) await game.settings.set(SH, "sheetRollMods", keep);
    }
    await G.step("5. a rule setting counts without a reload", async () => {
      const was = game.settings.get("worldofdarkness", "lowestDifficulty");
      const want = String(was) === "3" ? "4" : "3";
      try {
        await game.settings.set("worldofdarkness", "lowestDifficulty", Number(want));
        await waitFor(() => String(CONFIG.worldofdarkness.lowestDifficulty) === want, 4000).catch(() => null);
        G.ok("5. a rule setting counts without a reload", String(CONFIG.worldofdarkness.lowestDifficulty) === want, {want, config: CONFIG.worldofdarkness.lowestDifficulty});
      } finally { await game.settings.set("worldofdarkness", "lowestDifficulty", was); }
    });
  } catch (e) { G.ok("no error", false, {error: e.message}); }
  return G.finish();
}
