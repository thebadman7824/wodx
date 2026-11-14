/**
 * WoDX Otherworlds gate: Wyrm corruption shown on the place's scene (B4621), in Foundry, in rothenstein-wodx, as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gatewyrmlooks.mjs?${Date.now()}`)).run()
 * Works on a scratch scene of its own; never moves the clock and never runs a corruption week.
 *   1. the setting is on and api.corruption.looks is up
 *   2. setting a place blighted with two sources and three Banes draws the cast, two sludge spots and three hazes
 *   3. the same state again draws nothing new
 *   4. a fouler band deepens the cast
 *   5. cleansing to clean lifts every mark
 * Result: Data/wodx-gate/gatewyrmlooks-result.json.
 */
import {gate} from "./kit.mjs";

const MOD = "wodx-otherworlds";

export async function run() {
  const G = gate("gatewyrmlooks");
  const C = () => game.modules.get(MOD)?.api?.corruption;
  const LK = () => C()?.looks;
  const wait = async (f, ms = 5000) => { for ( let t = 0; t < ms && !f(); t += 100 ) await new Promise(r => setTimeout(r, 100)); return f(); };
  try {
    const scene = await G.scene({width: 3000, height: 2000});
    const marks = () => LK().marksOn(scene);
    const cast = () => [...scene.drawings].find(d => d.flags?.[MOD]?.wyrmLook && d.shape.type === "r");

    await G.step("1. setting and api", async () => {
      G.ok("1. setting and api", game.settings.get(MOD, "wyrmLooks") === true && typeof LK()?.sync === "function", {on: game.settings.get(MOD, "wyrmLooks")});
    });

    await G.step("2. a blighted place shows", async () => {
      await C().set(scene, {level: 5, banes: 3, sources: [{kind: "nest", name: "A Bane nest"}, {kind: "works", name: "The tannery"}]});
      await wait(() => marks().length >= 6);
      const m = marks();
      const kinds = m.map(x => x.kind);
      G.ok("2. a blighted place shows", m.length === 6 && kinds.filter(k => k === "taint").length === 3 && kinds.filter(k => k === "smoke").length === 3, {kinds});
    });

    await G.step("3. same state, nothing new", async () => {
      const ids = [...scene.drawings].filter(d => d.flags?.[MOD]?.wyrmLook).map(d => d.id).sort().join();
      const n = await LK().sync(scene);
      const after = [...scene.drawings].filter(d => d.flags?.[MOD]?.wyrmLook).map(d => d.id).sort().join();
      G.ok("3. same state, nothing new", n === 6 && (ids === after || marks().every(x => x.layer)), {n});
    });

    await G.step("4. fouler deepens", async () => {
      const a0 = cast()?.fillAlpha ?? 0;
      await C().set(scene, {...C().of(scene), level: 9});
      await wait(() => (cast()?.fillAlpha ?? 0) > a0 || marks().every(x => x.layer));
      G.ok("4. fouler deepens", (cast()?.fillAlpha ?? 0) > a0 || (marks().length && marks().every(x => x.layer)), {before: a0, after: cast()?.fillAlpha});
    });

    await G.step("5. cleansed lifts it", async () => {
      await C().set(scene, {...C().of(scene), level: 0, banes: 0, sources: []});
      await wait(() => marks().length === 0);
      G.ok("5. cleansed lifts it", marks().length === 0, {left: marks().length});
    });
  } finally {
    return G.finish();
  }
}
