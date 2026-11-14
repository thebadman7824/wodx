/**
 * WoDX Library gate: gambling (B3910), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gategamble.mjs?${Date.now()}`)).run()
 * Makes its own actors and removes them; never moves the clock.
 *   1. a deck of cards offers Gamble
 *   2. against the house: the purse moves by exactly what the card says (won, lost or even)
 *   3. against another character: what one wins the other loses
 * Result: Data/wodx-gate/gategamble-result.json.
 */
import {gate} from "./kit.mjs";

const body = name => ({name, type: "Mortal", system: {attributes: {wits: {value: 3}}, abilities: {streetwise: {value: 2}}}});

export async function run() {
  const G = gate("gategamble");
  try {
    const lib = game.modules.get("wodx-library")?.api;
    const M = game.modules.get("wodx-storyteller")?.api?.upkeep?.money;
    const [a, b] = await G.make(Actor, [body("Gate Gamble Player"), body("Gate Gamble Rival")]);
    const [cards] = await a.createEmbeddedDocuments("Item", [{name: "a worn deck of cards", type: "Item"}]);
    const carried = x => Number(M?.purse?.(x)?.carried) || 0;

    await G.step("1. Gamble", async () => {
      const ab = await lib.use.abilities(cards);
      // the purses are set up inside a step, so a failure shows on the result
      await M.receive(a, 1000, {note: "gate"});
      await M.receive(b, 1000, {note: "gate"});
      G.ok("1. Gamble", ab.includes("gamble") && carried(a) >= 1000 && carried(b) >= 1000, {abilities: ab, money: !!M, a: carried(a), b: carried(b)});
    });

    await G.step("2. against the house", async () => {
      const before = carried(a);
      const GU = await import("/modules/wodx-library/scripts/gamble-use.mjs");
      const r = await GU.gamble(a, cards, {stakeKey: "fair", against: null});
      G.ok("2. against the house", !!M && !!r && r.stake > 0 && r.stake === Math.round(before * 0.2) && carried(a) - before === r.delta, {stake: r?.stake, delta: r?.delta, moved: carried(a) - before});
    });

    await G.step("3. against another character", async () => {
      const [ba, bb] = [carried(a), carried(b)];
      const GU = await import("/modules/wodx-library/scripts/gamble-use.mjs");
      const r = await GU.gamble(a, cards, {stakeKey: "small", against: b});
      const da = carried(a) - ba, db = carried(b) - bb;
      G.ok("3. against another character", !!M && !!r && r.stake > 0 && da === r.delta && db === -r.delta, {delta: r?.delta, a: da, b: db});
    });
  } finally { return G.finish(); }
}
