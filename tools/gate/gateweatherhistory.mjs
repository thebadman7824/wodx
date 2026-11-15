/**
 * The climate's history by part of the world (B5950 to B5955), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateweatherhistory.mjs?${Date.now()}`)).run()
 * Reads the weather of nights in 1935 and 1690 for scenes it makes in the American West, Moravia and Java; the clock
 * does not move and no setting changes.
 *   1. the Little Ice Age is deep in Bohemia and faint in Java
 *   2. a scene on the Great Plains in the dust years: drier, and the weather names the dust years
 *   3. the same night in Moravia knows nothing of the dust
 *   4. the weather card for the Plains night names the hard year
 *   5. the Weather and atmosphere window names the age or hard year where the active scene stands
 * The scenes, the card and the window are cleared at the end; the kit puts back the active scene.
 * Result: Data/wodx-gate/gateweatherhistory-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

export async function run() {
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const G = gate("gateweatherhistory");
  const AT = "wodx-atmosphere", CH = "wodx-chronicle";
  const msgs0 = new Set(game.messages.map(m => m.id));
  try {
    const api = game.modules.get(AT)?.api?.weather;
    const M = await import(`/modules/${CH}/scripts/calendar-math.mjs`);
    const night = (y, m, d) => M.gregorianToJDN(y, m, d);
    const [plains, home, java] = await G.make(Scene, [
      {name: "WoDX gate: the Plains", width: 1000, height: 1000, padding: 0, flags: {[CH]: {place: {region: "north-america-west"}}}},
      {name: "WoDX gate: at home", width: 1000, height: 1000, padding: 0, flags: {[CH]: {place: {region: "moravia"}}}},
      {name: "WoDX gate: Java", width: 1000, height: 1000, padding: 0, flags: {[CH]: {place: {region: "nusantara"}}}}]);

    await G.step("1. the Little Ice Age, deep in Bohemia and faint in Java", async () => {
      const b = api.history(1690, 1, {region: "moravia", climate: "central-europe"}), j = api.history(1690, 1, {region: "nusantara", climate: "tropical-wet"});
      G.ok("1. the Little Ice Age, deep in Bohemia and faint in Java", b.t <= -0.9 && j.t > -0.4 && j.t < 0, {bohemia: b.t, java: j.t});
    });
    let dust = null;
    await G.step("2. the Plains in the dust years", async () => {
      let wet35 = 0, wet55 = 0;
      for ( let d = 0; d < 120; d++ ) {
        if ( api.on(night(1935, 4, 1) + d, plains)?.precip !== "none" ) wet35++;
        if ( api.on(night(1955, 4, 1) + d, plains)?.precip !== "none" ) wet55++;
      }
      dust = api.on(night(1935, 6, 10), plains);
      G.ok("2. the Plains in the dust years", wet35 < wet55 && /dust/i.test(dust?.eraHard ?? ""), {wet35, wet55, line: dust?.eraHard});
    });
    await G.step("3. the same night in Moravia knows nothing of it", async () => {
      const d = api.on(night(1935, 6, 10), home);
      G.ok("3. the same night in Moravia knows nothing of it", !!d && !/dust/i.test(d.eraHard ?? ""), {line: d?.eraHard, age: d?.eraAge});
    });
    await G.step("4. the weather card names the hard year", async () => {
      await api.post(dust, {gm: true});
      const ok = await waitFor(() => game.messages.some(m => !msgs0.has(m.id) && /watmo-era/.test(m.content ?? "") && /dust/i.test(m.content ?? "")), 8000);
      G.ok("4. the weather card names the hard year", ok, {});
    });
    await G.step("5. the window names the age where the scene stands", async () => {
      await java.activate();
      await waitFor(() => game.scenes.active?.id === java.id && globalThis.canvas?.scene?.id === java.id, 8000);
      const today = api.now(globalThis.canvas?.scene ?? java);
      game.modules.get(AT).api.open();
      const want = today?.eraHard || today?.eraAge || "";
      const found = await waitFor(() => {
        const el = document.querySelector(".watmo-era");
        return want ? !!el && el.textContent.includes(want.slice(0, 20)) : !!document.querySelector(".watmo-card, .window-app, .application");
      }, 8000);
      G.ok("5. the window names the age where the scene stands", !!today && found, {want, viewed: globalThis.canvas?.scene?.name});
      for ( const w of [...(foundry.applications?.instances?.values?.() ?? [])] ) {
        if ( w?.element?.querySelector?.(".watmo-era") ) await w.close?.();
      }
    });
  } finally {
    const mine = game.messages.filter(m => !msgs0.has(m.id) && /watmo-card/.test(m.content ?? "")).map(m => m.id);
    if ( mine.length ) await ChatMessage.deleteDocuments(mine);
    return G.finish();
  }
}
