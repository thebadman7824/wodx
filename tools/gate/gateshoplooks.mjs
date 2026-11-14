/**
 * WoDX Storyteller gate: a shut shop boarded up on the map (B4625), in Foundry, in rothenstein-wodx, as Gamemaster
 * Test:
 *   await (await import(`/wodx-gate/gateshoplooks.mjs?${Date.now()}`)).run()
 * Works on a scratch scene with a scratch shop tile, a scratch trader and a scratch market; puts the markets back; never
 * moves the clock and never runs a market turn.
 *   1. a shut trader's shop tile gets boards over it
 *   2. the boards sit over the tile
 *   3. the shop open again, the boards go
 * Result: Data/wodx-gate/gateshoplooks-result.json.
 */
import {gate} from "./kit.mjs";

const MOD = "wodx-storyteller";

export async function run() {
  const G = gate("gateshoplooks");
  const marketsBefore = foundry.utils.deepClone(game.settings.get(MOD, "markets"));
  const TL = () => game.modules.get(MOD)?.api?.upkeep?.townLooks;
  const KEY = "shops:gate-sh";
  const wait = async (f, ms = 6000) => { for ( let t = 0; t < ms && !f(); t += 100 ) await new Promise(r => setTimeout(r, 100)); return f(); };
  try {
    const scene = await G.scene({width: 3000, height: 2000});
    const [a] = await G.make(Actor, [{name: "Gate Shop Trader", type: "Mortal"}]);
    const [tile] = await scene.createEmbeddedDocuments("Tile", [{x: 800, y: 600, width: 200, height: 200, texture: {src: "icons/svg/house.svg"}}]);
    const setShut = async shut => game.settings.set(MOD, "markets", {...marketsBefore, markets: [...(marketsBefore?.markets ?? []).filter(m => m.id !== "gate-sh"),
      {id: "gate-sh", name: "WoDX gate: Shops", scenes: [scene.id], links: [], traders: [{actor: a.id, tile: tile.id, ...(shut ? {shut: true, shutWeeks: 1} : {})}]}]});
    const marks = () => { const m = TL().marksOf(scene, KEY); return [...m.layer.map(l => ({kind: l.kind, at: l.at})), ...m.own.map(d => ({...d.flags[MOD].look, d}))]; };

    await G.step("1. shut: boarded up", async () => {
      await setShut(true);
      await wait(() => marks().length === 1);
      const m = marks();
      G.ok("1. shut: boarded up", m.length === 1 && (m[0].mark === "boards" || m[0].kind === "rubble"), {m: m.map(x => ({kind: x.kind, mark: x.mark, note: x.note}))});
    });

    await G.step("2. over the tile", async () => {
      const m = marks()[0];
      const cx = m?.d ? m.d.x + m.d.shape.width / 2 : m?.at?.x, cy = m?.d ? m.d.y + m.d.shape.height / 2 : m?.at?.y;
      G.ok("2. over the tile", Math.abs(cx - 900) < 2 && Math.abs(cy - 700) < 2, {cx, cy});
    });

    await G.step("3. open: boards gone", async () => {
      await setShut(false);
      await wait(() => marks().length === 0);
      G.ok("3. open: boards gone", marks().length === 0, {left: marks().length});
    });
  } finally {
    try { await game.settings.set(MOD, "markets", marketsBefore); } catch (e) { G.R.notes.push(`markets back: ${e?.message ?? e}`); }
    return G.finish();
  }
}
