/**
 * WoDX Chronicle and WoDX Actions gate: looks on the map (B3758), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatemapfx.mjs?${Date.now()}`)).run()
 * Makes its own scratch scene and removes it; puts this computer's effects level back; never moves the clock.
 *   1. Chronicle's api.looks is up, and which effect modules are on
 *   2. a fire look at a spot: its record on the scene, its coloured shape for everyone, Token Magic FX's filter on the
 *      shape when that module is on, and the Sequencer animation on this computer when Sequencer and JB2A are on
 *   3. this computer at Light, then Off: fewer animations, then none; the shape stays
 *   4. a storm over the whole scene: FXMaster's rain and lightning when it is on, else Foundry's own storm; ended, the
 *      scene's weather is as it was
 *   5. the fire look ended: record, shape and animations gone
 *   6. Summon Water placed by WoDX Actions gets its look; the area undone takes the look with it
 *   7. a quake look lasts a minute and is ended by the clock
 * Result: Data/wodx-gate/gatemapfx-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const CH = "wodx-chronicle";
const wait = ms => new Promise(r => setTimeout(r, ms));
const seqOf = name => (globalThis.Sequencer?.EffectManager?.getEffects?.({name}) ?? []).length;

export async function run() {
  const G = gate("gatemapfx");
  const lvBefore = game.settings.get(CH, "fxLevel");
  try {
    const L = game.modules.get(CH)?.api?.looks;
    const scene = await G.scene({name: "WoDX gate: map fx"});
    const M = L?.mods?.() ?? {};
    await G.step("1. the looks layer", async () => G.ok("1. the looks layer", !!(L?.show && L?.end && L?.weather), {mods: M, level: lvBefore}));
    if ( !L?.show ) return;
    await game.settings.set(CH, "fxLevel", "full");
    let fire = null;
    await G.step("2. a fire look at a spot", async () => {
      fire = await L.show({scene, kind: "fire", at: {x: 600, y: 500, radius: 200}, source: "gatemapfx"});
      await wait(1500);
      const rec = L.list(scene).find(l => l.id === fire);
      const d = rec?.drawing ? scene.drawings.get(rec.drawing) : null;
      const tm = d?.flags?.tokenmagic?.filters ?? [];
      const seq = seqOf(`wodx-look-${fire}`);
      const anim = M.sequencer && M.jb2a;
      G.ok("2. a fire look at a spot", !!rec && !!d && d.fillColor?.css?.toLowerCase?.() === "#c8501e" && (!M.tokenmagic || tm.length > 0) && (!anim || seq >= 1),
        {rec: !!rec, drawing: !!d, fill: d?.fillColor?.css ?? null, tokenmagic: tm.length, sequencer: seq});
    });
    await G.step("3. Light, then Off, on this computer", async () => {
      const full = seqOf(`wodx-look-${fire}`);
      await game.settings.set(CH, "fxLevel", "light"); await L.render(); await wait(1200);
      // a level change starts afresh: the old animations go and the fainter ones start
      await globalThis.Sequencer?.EffectManager?.endEffects?.({name: `wodx-look-${fire}`}); await L.render(); await wait(1200);
      const light = seqOf(`wodx-look-${fire}`);
      await game.settings.set(CH, "fxLevel", "off"); await L.render(); await wait(1200);
      const off = seqOf(`wodx-look-${fire}`);
      const rec = L.list(scene).find(l => l.id === fire), shape = !!(rec?.drawing && scene.drawings.get(rec.drawing));
      const anim = M.sequencer && M.jb2a;
      G.ok("3. Light, then Off, on this computer", shape && off === 0 && (!anim || (light >= 1 && light < full)), {full, light, off, shape});
      await game.settings.set(CH, "fxLevel", "full");
    });
    await G.step("4. a storm over the whole scene", async () => {
      const before = scene.weather ?? "";
      const id = await L.weather({scene, kind: "storm", source: "gatemapfx"});
      await wait(1200);
      const fx = scene.flags?.fxmaster?.effects ?? {};
      const on = M.fxmaster ? Object.keys(fx).length > 0 : scene.weather === "rainStorm";
      await L.end(id, scene); await wait(1000);
      const fxAfter = Object.keys(scene.flags?.fxmaster?.effects ?? {}).length;
      const back = (scene.weather ?? "") === before && (!M.fxmaster || fxAfter < Object.keys(fx).length);
      G.ok("4. a storm over the whole scene", !!id && on && back, {fxmaster: M.fxmaster, effects: Object.keys(fx), weather: scene.weather ?? "", back});
    });
    await G.step("5. the fire look ended", async () => {
      const rec = L.list(scene).find(l => l.id === fire);
      await L.end(fire, scene); await wait(1200);
      const gone = !L.list(scene).some(l => l.id === fire) && !(rec?.drawing && scene.drawings.get(rec.drawing)) && seqOf(`wodx-look-${fire}`) === 0;
      G.ok("5. the fire look ended", gone, {gone});
    });
    await G.step("6. Summon Water's area gets its look, and loses it when undone", async () => {
      const A = game.modules.get("wodx-actions")?.api;
      const [dv] = await G.make(Actor, [{name: "Gate Looks Defiler", type: "Demon"}]);
      const pl = A.effects.planOf(dv, [], 4, {name: "Summon Water", line: "Demon (DtF)", faith: 4});
      const i = pl.items.findIndex(x => x.key === "world" && x.out?.world === "water");
      const msg = await G.make(ChatMessage, {content: `<div class="wodx-card">Gate: Summon Water</div>${pl.html}`, whisper: [game.user.id],
        flags: {"wodx-actions": {kind: "effects", caster: "Gate", items: pl.items, done: true}}});
      const rec = i >= 0 ? await A.effects.placeItem(msg, i, {x: 400, y: 400}) : null;
      await wait(1200);
      const region = rec?.region ? fromUuidSync(rec.region) : null;
      const look = region ? L.list(scene).find(l => l.id === `area-${region.id}`) : null;
      if ( rec ) await A.effects.undo([rec]);
      await waitFor(() => !L.list(scene).some(l => l.id === look?.id), 5000);
      const gone = !L.list(scene).some(l => l.id === look?.id);
      G.ok("6. Summon Water's area gets its look, and loses it when undone", !!look && look.kind === "water" && gone, {look: look?.kind ?? null, gone});
    });
    await G.step("7. a quake ends by the clock", async () => {
      const id = await L.show({scene, kind: "quake", until: {seconds: 60}, source: "gatemapfx"});
      const t0 = game.time.worldTime;
      await game.time.advance(61);
      await waitFor(() => !L.list(scene).some(l => l.id === id), 5000);
      const gone = !L.list(scene).some(l => l.id === id);
      await game.time.advance(t0 - game.time.worldTime);
      G.ok("7. a quake ends by the clock", !!id && gone, {gone});
    });
  } finally {
    try { await game.settings.set(CH, "fxLevel", lvBefore); } catch {}
    return G.finish();
  }
}
