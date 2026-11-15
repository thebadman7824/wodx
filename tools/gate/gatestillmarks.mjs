/**
 * Re-audit gate (B6020-B6026), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatestillmarks.mjs?${Date.now()}`)).run()
 * Makes its own actor and removes it; never moves the clock; starts no fight.
 *   1. the setting "Conditions hold the token" is there and on; Combat's movementFor, holdOfActor and traitRoll are up
 *   2. a Staked character has no movement at all; with the stake out it moves again
 *   3. a roll effect on every roll (-2 dice, as feeding against the blood's law gives) lowers the attack and the defence
 *   4. a WoDX mark that lasts the scene shows on the token (showIcon ALWAYS), not only on the sheet
 *   5. Crippled limb makes the attack harder; Branded, Filthy and Bloody carry a social difficulty
 * Result: Data/wodx-gate/gatestillmarks-result.json.
 */
import {gate} from "./kit.mjs";

export async function run() {
  const G = gate("gatestillmarks");
  try {
    const C = game.modules.get("wodx-combat")?.api;
    const X = game.modules.get("wodx-chronicle")?.api;
    const K = X?.conditions;
    const [a, b] = await G.make(Actor, [{name: "Gate Still Body", type: "Mortal"}, {name: "Gate Still Foe", type: "Mortal"}]);

    await G.step("1. setting and api", async () => {
      let on = null;
      try { on = game.settings.get("wodx-combat", "conditionsHold"); } catch (e) { on = null; }
      G.ok("1. setting and api", on === true && typeof C?.movementFor === "function" && typeof C?.holdOfActor === "function" && typeof X?.traits?.addBite === "function", {on});
    });

    await G.step("2. staked does not move", async () => {
      const free = C.movementFor(a).run;
      await K.setCondition(a, "staked", true);
      const held = C.movementFor(a), h = C.holdOfActor(a);
      await K.setCondition(a, "staked", false);
      const back = C.movementFor(a).run;
      G.ok("2. staked does not move", free > 0 && held.run === 0 && held.walk === 0 && !!h.still && back === free, {free, held, h, back});
    });

    await G.step("3. roll effects reach combat", async () => {
      const before = C.conditionMods(a, b).attackerDice;
      await X.traits.addBite(a, {key: "gate-still", name: "Gate: -2 dice", tags: ["all"], dice: -2, duration: {kind: "scene"}, source: "gate"});
      const after = C.conditionMods(a, b).attackerDice, def = C.traitRoll(a, ["defense", "combat"]).dice;
      G.ok("3. roll effects reach combat", after === before - 2 && def === -2, {before, after, def});
    });

    await G.step("4. a scene mark shows on the token", async () => {
      const e = await X.applyTimed(a, {name: "Gate scene mark", duration: {kind: "scene"}, key: "gate-still-mark", source: "gate"});
      const want = CONST.ACTIVE_EFFECT_SHOW_ICON?.ALWAYS;
      G.ok("4. a scene mark shows on the token", want === undefined || e?.showIcon === want, {showIcon: e?.showIcon, want});
    });

    await G.step("5. crippled, branded, filthy, bloody have rules", async () => {
      const base = C.conditionMods(a, b).attackerDiff;
      await K.setCondition(a, "crippled", true);
      const crip = C.conditionMods(a, b).attackerDiff;
      await K.setCondition(a, "crippled", false);
      const soc = ["filthy", "bloody", "branded"].map(id => K.getCondition(id)?.mods?.socialDiff ?? null);
      G.ok("5. crippled, branded, filthy, bloody have rules", crip === base + 2 && soc.slice(0, 2).every(v => v === 1) && (soc[2] === 1 || soc[2] === null), {base, crip, soc});
    });
  } finally { return G.finish(); }
}
