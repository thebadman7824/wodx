/**
 * Final systems audit, worker 1 (B6720): the system's own power window counts WoDX's modifiers, as the general roll
 * window does. In rothenstein-wodx as a Gamemaster:
 *   await (await import(`/wodx-gate/gatesystemrolls.mjs?${Date.now()}`)).run()
 *   1. modules: WoDX Sheets' sheetRollMods api and setting, Chronicle's conditions
 *   2. a Discipline power (Manipulation + Intimidation, 5 dice) rolled through the system's own power window (the path a
 *      click on the power takes: ActionHelper.RollDialog, then the window's Roll button) by a vampire carrying WoDX NPC's
 *      Grieving rolls 4 dice, and the card names Grieving
 *   3. the same power with the world setting wodx-sheets.sheetRollMods off rolls the full 5
 *   4. a Strength + Brawl power (not social) under Grieving rolls its full pool
 * Makes its own actors and removes them; puts the setting back. Result: Data/wodx-gate/gatesystemrolls-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const SH = "wodx-sheets", CH = "wodx-chronicle";
const num = v => Number(v) || 0;
const elOf = app => (app?.element instanceof HTMLElement ? app.element : app?.element?.[0]) ?? null;

export async function run() {
  const G = gate("gatesystemrolls");
  if ( G.notLive() ) return "gatesystemrolls never runs in the Live world";
  let keep;
  try { keep = game.settings.get(SH, "sheetRollMods"); } catch (e) { keep = undefined; }
  try {
    await waitFor(() => !!game.modules.get(SH)?.api && !!game.modules.get(CH)?.api, 30000);
    const Ch = game.modules.get(CH)?.api;
    const AH = (await import("/systems/worldofdarkness/module/scripts/action-helpers.js")).default;
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

    /** Click the power as the sheet does, press Roll in the system window, and read the card. */
    const rollPower = async item => {
      const t0 = Date.now();
      await AH.RollDialog({rollitem: "true", itemid: item.id, object: "wod.types.disciplinepower"}, vamp);
      let dlg = null;
      await waitFor(() => (dlg = Object.values(ui.windows).find(w => w.constructor?.name === "DialogPower" && w.actor?.id === vamp.id && w.rendered)), 6000);
      elOf(dlg)?.querySelector?.(".actionbutton")?.click();
      let m = null;
      await waitFor(() => (m = [...game.messages].filter(x => (x.timestamp ?? 0) >= t0 && x.speaker?.actor === vamp.id && (x.rolls?.length ?? 0) > 0).at(-1)), 8000);
      await dlg?.close?.();
      const W = CONFIG.worldofdarkness, explodes = W?.useexplodingDice && ["always", "nospeciality"].includes(W?.explodingDice);
      const faces = (m?.rolls ?? []).map(r => num(r.total));
      return {rolled: faces.length - (explodes ? faces.filter(f => f === 10).length : 0), named: /Grieving/.test(m?.content ?? ""), card: !!m};
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
  } catch (e) { G.ok("no error", false, {error: e.message}); }
  return G.finish();
}
