/**
 * WoDX Combat gate: standing up from a knockdown (B3921), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateknockdown.mjs?${Date.now()}`)).run()
 * Makes its own actor and removes it; never moves the clock; starts no fight.
 *   1. the setting is there and on, and api.standUp is up
 *   2. a knocked-down character with ten dice tries to stand: they get up (the status goes) and a card is posted
 *   3. a character who is not knocked down is left alone (no roll)
 * Result: Data/wodx-gate/gateknockdown-result.json.
 */
import {gate} from "./kit.mjs";

const body = name => ({name, type: "Mortal", system: {attributes: {dexterity: {value: 5}}, abilities: {athletics: {value: 5}}}});

export async function run() {
  const G = gate("gateknockdown");
  try {
    const C = game.wodxCombat ?? game.modules.get("wodx-combat")?.api;
    const K = game.modules.get("wodx-chronicle")?.api?.conditions;
    const [a] = await G.make(Actor, [body("Gate Fallen Fighter")]);

    await G.step("1. setting and api", async () => {
      let on = null;
      try { on = game.settings.get("wodx-combat", "standUpRoll"); } catch (e) { on = null; }
      G.ok("1. setting and api", on === true && typeof C?.standUp === "function" && !!K?.setCondition, {on, api: typeof C?.standUp});
    });

    await G.step("2. stands up", async () => {
      await a.update({"system.attributes.dexterity.value": 5, "system.abilities.athletics.value": 5});
      await K.setCondition(a, "knockdown", true);
      const before = game.messages.size;
      let r = null;
      // ten dice at 6 nearly always succeed; three tries make a fluke failure all but impossible
      for ( let i = 0; i < 3 && !r?.up; i++ ) r = await C.standUp(a, null);
      const down = K.hasCondition(a, "knockdown");
      G.ok("2. stands up", !!r?.up && !down && game.messages.size > before, {up: r?.up, down, line: r?.line, cards: game.messages.size - before});
    });

    await G.step("3. not knocked down", async () => {
      const r = await C.standUp(a, null);
      G.ok("3. not knocked down", r === null, {r});
    });
  } finally { return G.finish(); }
}
