/**
 * WoDX Otherworlds gate: thin places and the Wyrm's haze, for the right eyes only (B4634), in Foundry, in
 * rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateveillooks.mjs?${Date.now()}`)).run()
 * Works on a scratch scene and scratch actors of its own; never moves the clock.
 *   1. api.veil is up
 *   2. on a scene where the Gauntlet and the Shroud are thin, the Storyteller sees the shimmer and the mist drawn
 *   3. a thick scene draws nothing
 *   4. by the ratings where a token stands: a werebeast sees the shimmer, a ghost the mist, a mortal neither
 *   5. a Wyrm-tainted person carries the haze for the Storyteller; a clean one does not
 * Result: Data/wodx-gate/gateveillooks-result.json.
 */
import {gate} from "./kit.mjs";

const MOD = "wodx-otherworlds";

export async function run() {
  const G = gate("gateveillooks");
  const VL = () => game.modules.get(MOD)?.api?.veil;
  const TK = () => game.modules.get("wodx-chronicle")?.api?.tokenLooks;
  const wait = async (f, ms = 4000) => { for ( let t = 0; t < ms && !f(); t += 100 ) await new Promise(r => setTimeout(r, 100)); return f(); };
  const drawn = () => (canvas.interface ?? canvas.stage).children.find(c => c.wodxVeil && !c.destroyed);
  try {
    const scene = await G.scene({width: 1500, height: 1000, flags: {[MOD]: {ratings: {gauntlet: 3, shroud: 4}}}});

    await G.step("1. api", async () => {
      G.ok("1. api", typeof VL()?.veilNow === "function" && typeof VL()?.draw === "function", {});
    });

    await G.step("2. thin scene, the Storyteller sees", async () => {
      canvas.tokens.releaseAll();
      VL().draw();
      const v = VL().veilNow(), d = drawn();
      G.ok("2. thin scene, the Storyteller sees", v.shimmer && v.mist && !!d, {v, drawn: !!d});
    });

    await G.step("3. thick scene, nothing", async () => {
      await scene.update({[`flags.${MOD}.ratings`]: {gauntlet: 7, shroud: 8}});
      VL().draw();
      const v = VL().veilNow();
      G.ok("3. thick scene, nothing", !v.shimmer && !v.mist && !drawn(), {v});
      await scene.update({[`flags.${MOD}.ratings`]: {gauntlet: 3, shroud: 4}});
    });

    const [wolf, ghost, mortal, foul] = await G.make(Actor, [
      {name: "Gate Wolf", type: "Mortal", flags: {[MOD]: {aura: {nature: "werebeast"}}}},
      {name: "Gate Shade", type: "Mortal", flags: {[MOD]: {aura: {nature: "ghost"}}}},
      {name: "Gate Mortal", type: "Mortal"},
      {name: "Gate Fomor", type: "Mortal", flags: {[MOD]: {taint: {level: 2}}}}
    ]);
    const [tw, tg, tm, tf] = await G.tokens(scene, [{actor: wolf, x: 2, y: 2}, {actor: ghost, x: 4, y: 2}, {actor: mortal, x: 6, y: 2}, {actor: foul, x: 8, y: 2}]);

    await G.step("4. each sees by their nature", async () => {
      const O = game.modules.get(MOD).api;
      const rules = VL().rules;
      const at = td => { const r = O.placeOf ? O.placeOf(td) : null; return r ? {gauntlet: r.gauntlet, shroud: r.ratings?.shroud} : {gauntlet: 3, shroud: 4}; };
      const w = rules.veilFor(at(tw), {nature: "werebeast"}), g = rules.veilFor(at(tg), {nature: "ghost"}), m = rules.veilFor(at(tm), {nature: "human"});
      G.ok("4. each sees by their nature", w.shimmer && !w.mist && g.mist && !g.shimmer && !m.shimmer && !m.mist, {w, g, m, at: at(tw)});
    });

    await G.step("5. the Wyrm's haze", async () => {
      TK()?.refresh?.();
      const hazeColor = VL().rules.HAZE.aura.color;
      await wait(() => TK()?.looksOf(canvas.tokens.get(tf.id))?.aura?.color === hazeColor);
      const foulLook = TK()?.looksOf(canvas.tokens.get(tf.id)), cleanLook = TK()?.looksOf(canvas.tokens.get(tm.id));
      G.ok("5. the Wyrm's haze", foulLook?.aura?.color === hazeColor && !cleanLook, {foul: foulLook, clean: cleanLook});
    });
  } finally {
    try { VL()?.draw?.(); } catch (e) { /* the scene is going */ }
    return G.finish();
  }
}
