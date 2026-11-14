/**
 * WoDX Chronicle gate: tokens show what grips them (B4632), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatetokenlooks.mjs?${Date.now()}`)).run()
 * Works on a scratch scene and a scratch actor; never moves the clock.
 *   1. Frenzy puts a red glow under the token, tints it and shakes it
 *   2. Rotschreck gives a cold, flickering glow instead
 *   3. a look another module registers shows, and goes when it says so
 *   4. a derangement bout's screen edge is for the character's own player: the Storyteller's screen stays clear
 * Result: Data/wodx-gate/gatetokenlooks-result.json.
 */
import {gate} from "./kit.mjs";

const MOD = "wodx-chronicle";

export async function run() {
  const G = gate("gatetokenlooks");
  const TK = () => game.modules.get(MOD)?.api?.tokenLooks;
  const C = () => game.modules.get(MOD)?.api?.conditions;
  const wait = async (f, ms = 4000) => { for ( let t = 0; t < ms && !f(); t += 100 ) await new Promise(r => setTimeout(r, 100)); return f(); };
  let extra = false;
  try {
    const scene = await G.scene({width: 1500, height: 1000});
    const [a] = await G.make(Actor, [{name: "Gate Beast", type: "Vampire"}]);
    const [td] = await G.tokens(scene, [{actor: a, x: 3, y: 3}]);
    const tok = () => canvas.tokens.get(td.id);

    await G.step("1. frenzy glows and shakes", async () => {
      await C().setCondition(a, "frenzy", true);
      await wait(() => tok()?._wodxLook?.aura);
      const L = TK().looksOf(tok());
      G.ok("1. frenzy glows and shakes", !!L?.aura && L.shake > 0 && !!tok()._wodxLook?.aura && tok().mesh.tint !== 0xffffff, {look: L, tint: tok()?.mesh?.tint});
      await C().setCondition(a, "frenzy", false);
    });

    await G.step("2. Rotschreck flickers cold", async () => {
      await C().setCondition(a, "rotschreck", true);
      await wait(() => TK().looksOf(tok())?.flicker);
      const L = TK().looksOf(tok());
      G.ok("2. Rotschreck flickers cold", !!L?.flicker && L.aura.color === TK().rules.CONDITION_LOOKS.rotschreck.aura.color && !L.shake, {look: L});
      await C().setCondition(a, "rotschreck", false);
      await wait(() => !TK().looksOf(tok()));
    });

    await G.step("3. another module's look", async () => {
      TK().register("gate.test", t => (extra && t.id === td.id ? {aura: {color: 0x00ff00, alpha: 0.2, radius: 0.6}} : null));
      extra = true; TK().refresh();
      const on = TK().looksOf(tok())?.aura?.color === 0x00ff00;
      extra = false; TK().refresh();
      G.ok("3. another module's look", on && !TK().looksOf(tok()) && !tok()._wodxLook?.aura, {on});
    });

    await G.step("4. the bout's edge is the player's own", async () => {
      await C().setCondition(a, "deranged", true);
      await a.setFlag(MOD, "bout", {keys: ["paranoia"], at: game.time.worldTime});
      TK().refresh();
      G.ok("4. the bout's edge is the player's own", TK().edgeNow() === null && !document.getElementById("wodx-derangement-edge") && TK().rules.edgeOf(["paranoia"]) === "dark", {edge: TK().edgeNow()});
      await C().setCondition(a, "deranged", false);
    });
  } finally {
    extra = false;
    return G.finish();
  }
}
