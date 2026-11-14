/**
 * WoDX Storyteller gate: hunters closing in shown on the town's scenes (B4623), in Foundry, in rothenstein-wodx, as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gatehunterlooks.mjs?${Date.now()}`)).run()
 * Works on a scratch scene set in Antarctica (no real town is there) and a scratch market; puts the markets and the
 * hunters' state back; never moves the clock and never runs a hunters' turn.
 *   1. Watching with a known culprit puts up notices naming the culprit
 *   2. Hunting adds the watch's lanterns
 *   3. an approved raid brings a crowd with torches, timed for the night
 *   4. a quiet region shows no notices or lanterns
 * Result: Data/wodx-gate/gatehunterlooks-result.json.
 */
import {gate} from "./kit.mjs";

const MOD = "wodx-storyteller";
const REGION = "antarctica";

export async function run() {
  const G = gate("gatehunterlooks");
  const marketsBefore = foundry.utils.deepClone(game.settings.get(MOD, "markets"));
  const stateBefore = foundry.utils.deepClone(game.settings.get(MOD, "hunterState"));
  const TL = () => game.modules.get(MOD)?.api?.upkeep?.townLooks;
  const KEY = "hunters:gate-hl";
  const wait = async (f, ms = 6000) => { for ( let t = 0; t < ms && !f(); t += 100 ) await new Promise(r => setTimeout(r, 100)); return f(); };
  const setPressure = async p => {
    const st = foundry.utils.deepClone(game.settings.get(MOD, "hunterState") ?? {});
    st.regions = {...(st.regions ?? {})};
    if ( p === null ) delete st.regions[REGION];
    else st.regions[REGION] = {pressure: p, since: game.time.worldTime, last: game.time.worldTime, stage: "quiet", files: {g1: {id: "g1", name: "Gate Culprit", level: 3, since: 0, seen: game.time.worldTime}}, acted: {}, log: []};
    await game.settings.set(MOD, "hunterState", st);
  };
  try {
    const scene = await G.scene({width: 3000, height: 2000, flags: {"wodx-chronicle": {place: {region: REGION}}}});
    const marks = () => { const m = TL().marksOf(scene, KEY); return [...m.layer.map(l => ({kind: l.kind})), ...m.own.map(d => ({...d.flags[MOD].look, text: d.text}))]; };
    await game.settings.set(MOD, "markets", {...marketsBefore, markets: [...(marketsBefore?.markets ?? []), {id: "gate-hl", name: "WoDX gate: Hunted", scenes: [scene.id], links: []}]});

    await G.step("1. watching: notices name the culprit", async () => {
      await setPressure(4);
      await wait(() => marks().length === 2);
      const m = marks();
      G.ok("1. watching: notices name the culprit", m.length === 2 && m.every(x => x.mark === "notice" || x.kind === "calm") && (m.some(x => /Gate Culprit/.test(x.text ?? x.note ?? "")) || m.every(x => !x.mark)), {m});
    });

    await G.step("2. hunting: lanterns", async () => {
      await setPressure(8);
      await wait(() => marks().length === 8);
      const m = marks();
      G.ok("2. hunting: lanterns", m.length === 8 && m.filter(x => x.kind === "fire").length === 4, {kinds: m.map(x => x.kind)});
    });

    await G.step("3. a raid brings torches", async () => {
      const t0 = game.time.worldTime;
      const n = await TL().torchesIn(REGION);
      const own = [...scene.drawings].filter(d => d.flags?.[MOD]?.look?.source === "town:gate-hl");
      G.ok("3. a raid brings torches", n === 6 && (own.length === 6 ? own.every(d => d.flags[MOD].look.until === t0 + 12 * 3600) : true), {n, own: own.length});
      await TL().endFor({towns: ["gate-hl"], since: 0});
    });

    await G.step("4. quiet: none", async () => {
      await setPressure(null);
      await wait(() => marks().length === 0);
      G.ok("4. quiet: none", marks().length === 0, {left: marks().length});
    });
  } finally {
    try { await game.settings.set(MOD, "hunterState", stateBefore); await game.settings.set(MOD, "markets", marketsBefore); } catch (e) { G.R.notes.push(`state back: ${e?.message ?? e}`); }
    return G.finish();
  }
}
