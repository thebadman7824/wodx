/**
 * WoDX NPC gate: who holds a place shown on its scene (B4631), and a thinned district's empty night (B4630), in
 * Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatefactionbanners.mjs?${Date.now()}`)).run()
 * Works on a scratch scene and a scratch faction; puts the factions back; never moves the clock and never runs a
 * faction turn.
 *   1. a faction holding the scene puts two banners in its colour, with its name, at the scene's gates
 *   2. the place changing hands swaps the banners for the new holder's
 *   3. a secret holder shows none
 *   4. the scene's herd stage, read as the passers-by read it, thins the night streets and not the day's
 * Result: Data/wodx-gate/gatefactionbanners-result.json.
 */
import {gate} from "./kit.mjs";

const MOD = "wodx-npc";

export async function run() {
  const G = gate("gatefactionbanners");
  const before = foundry.utils.deepClone(game.settings.get(MOD, "factions"));
  const TL = () => game.modules.get("wodx-storyteller")?.api?.upkeep?.townLooks;
  const R = await import("/modules/wodx-npc/scripts/faction-look-rules.mjs");
  const PR = await import("/modules/wodx-npc/scripts/passerby-rules.mjs");
  const wait = async (f, ms = 6000) => { for ( let t = 0; t < ms && !f(); t += 100 ) await new Promise(r => setTimeout(r, 100)); return f(); };
  try {
    const scene = await G.scene({width: 3000, height: 2000});
    const marks = () => { const m = TL().marksOf(scene, "factions"); return [...m.layer.map(l => ({kind: l.kind})), ...m.own.map(d => ({text: d.text, color: d.textColor}))]; };
    const hold = async (id, name, secret = false) => {
      const st = foundry.utils.deepClone(game.settings.get(MOD, "factions") ?? {});
      const others = (st.factions ?? []).filter(f => !String(f.id).startsWith("gatefb")).map(f => ({...f, places: (f.places ?? []).filter(p => p !== scene.uuid)}));
      const base = (before.factions ?? [])[0] ?? {};
      await game.settings.set(MOD, "factions", {...st, factions: [...others, {...base, id, name, kind: "guild", secret, dormant: false, members: [], places: [scene.uuid]}]});
    };

    await G.step("1. two banners at the gates", async () => {
      await hold("gatefb1", "Gate Guild One");
      await wait(() => marks().length === 2);
      const m = marks();
      G.ok("1. two banners at the gates", m.length === 2 && (m.every(x => /Gate Guild One/.test(x.text ?? "") && String(x.color).toLowerCase() === R.colourOf("gatefb1")) || m.every(x => x.kind)), {m});
    });

    await G.step("2. changing hands swaps them", async () => {
      await hold("gatefb2", "Gate Guild Two");
      await wait(() => marks().length === 2 && marks().every(x => !x.text || /Two/.test(x.text)));
      const m = marks();
      G.ok("2. changing hands swaps them", m.length === 2 && m.every(x => !x.text || /Gate Guild Two/.test(x.text)), {m});
    });

    await G.step("3. a secret holder shows none", async () => {
      await hold("gatefb3", "Gate Hidden Ones", true);
      await wait(() => marks().length === 0);
      G.ok("3. a secret holder shows none", marks().length === 0, {left: marks().length});
    });

    await G.step("4. a stripped district empties at night", async () => {
      const month = Math.floor(game.time.worldTime / (30 * 86400));
      await scene.update({"flags.wodx-storyteller.herd": {month, fed: {}, feeds: 30, stage: "stripped", log: []}});
      const stage = PR.herdStageAt(scene.flags["wodx-storyteller"].herd, game.time.worldTime);
      G.ok("4. a stripped district empties at night", stage === "stripped" && PR.herdCrowd(stage, 23) < 0.5 && PR.herdCrowd(stage, 12) === 1, {stage, night: PR.herdCrowd(stage, 23)});
    });
  } finally {
    try { await game.settings.set(MOD, "factions", before); } catch (e) { G.R.notes.push(`factions back: ${e?.message ?? e}`); }
    return G.finish();
  }
}
