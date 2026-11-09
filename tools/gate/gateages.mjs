/**
 * Places that age (WoDX Atmosphere 0.6.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateages.mjs?${Date.now()}`)).run()
 * It makes a scene of its own and deletes it at the end. The clock never moves: years are passed in.
 *   1. the module: Atmosphere 0.6.0 or later, api.ages
 *   2. two years of pictures on the scene: the flag keeps its own map as the base, the years in order
 *   3. the picture for a year: before the first, its own map; then each in turn (applied to the map's level)
 *   4. the window lists the years for the scene in view
 *   5. removing both years puts its own map back and drops the flag
 *   6. clean up
 * Result: Data/wodx-gate/gateages-result.json.
 */
const MOD = "wodx-atmosphere";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = "icons/svg/mystery-man.svg", A1 = "icons/svg/door-closed.svg", A2 = "icons/svg/door-open.svg";

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gateages-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const M = game.modules.get(MOD), G = M?.api?.ages;
  const viewed = canvas.scene?.id;
  let scene = null;
  const pic = () => { const s = game.scenes.get(scene.id); const l = [...(s.levels ?? [])].sort((a, b) => (a.elevation?.bottom ?? 0) - (b.elevation?.bottom ?? 0))[0]; return l ? l.background?.src : s.background?.src; };
  try {
    ok("1. module", M?.active && !foundry.utils.isNewerVersion("0.6.0", M.version) && !!G?.set, {version: M?.version});
    scene = await Scene.create({name: "WoDX gate: Ages", width: 1000, height: 800, padding: 0, background: {src: BASE}});
    await sleep(500);
    R.notes.push(`levels ${scene.levels?.size ?? 0}, map ${pic()}`);
    if ( pic() !== BASE ) { const l = [...(scene.levels ?? [])][0]; if ( l ) await l.update({"background.src": BASE}); await sleep(300); }
    await G.set(scene, 1500, A2); await G.set(scene, 1300, A1); await sleep(300);
    const f = game.scenes.get(scene.id).flags?.[MOD]?.ages;
    ok("2. two years", f?.base === BASE && f.variants?.map(v => v.from).join() === "1300,1500", {f});

    const s = () => [game.scenes.get(scene.id)];
    await G.apply({scenes: s(), year: 1200}); await sleep(300); const p1 = pic();
    await G.apply({scenes: s(), year: 1350}); await sleep(300); const p2 = pic();
    await G.apply({scenes: s(), year: 1900}); await sleep(300); const p3 = pic();
    ok("3. the picture for a year", p1 === BASE && p2 === A1 && p3 === A2 && G.picture(game.scenes.get(scene.id), 1400) === A1, {p1, p2, p3});

    await game.scenes.get(scene.id).view(); await sleep(1500);
    M.api.open(); await sleep(900);
    const rows = [...document.querySelectorAll("#wodx-atmosphere table.watmo-ages tr")].map(tr => tr.textContent.trim());
    ok("4. in the window", rows.some(r => /from 1300/.test(r)) && rows.some(r => /from 1500/.test(r)) && rows.some(r => /before 1300/.test(r)), {rows});

    await G.set(game.scenes.get(scene.id), 1300, ""); await G.set(game.scenes.get(scene.id), 1500, ""); await sleep(400);
    ok("5. removed", pic() === BASE && !game.scenes.get(scene.id).flags?.[MOD]?.ages, {pic: pic()});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      await foundry.applications.instances?.get?.("wodx-atmosphere")?.close?.();
      if ( viewed && game.scenes.get(viewed) ) await game.scenes.get(viewed).view();
      await sleep(800);
      if ( scene ) await game.scenes.get(scene.id)?.delete();
      ok("6. clean up", !scene || !game.scenes.get(scene.id));
    } catch (err) { ok("6. clean up", false, {error: err.message}); }
  }
  return save(R);
}
