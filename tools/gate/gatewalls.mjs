/**
 * Sound through walls (WoDX Atmosphere 0.4.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatewalls.mjs?${Date.now()}`)).run()
 * It makes a scene of its own with two sounds and deletes it at the end. The clock never moves.
 *   1. the module: Atmosphere 0.4.0 or later, api.walls, the setting
 *   2. a sound placed by hand is stopped by walls and muffled (low-pass); one placed with walls off stays as placed
 *   3. Muffle them all: both muffled; the window says 2 of 2
 *   4. Let them all through: walls off on both
 *   5. clean up
 * Result: Data/wodx-gate/gatewalls-result.json.
 */
const MOD = "wodx-atmosphere";
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gatewalls-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const A = game.modules.get(MOD), api = A?.api;
  const viewed = canvas.scene?.id;
  let scene = null;
  try {
    ok("1. module", A?.active && !foundry.utils.isNewerVersion("0.4.0", A.version) && !!api?.walls?.muffle && game.settings.settings.has(`${MOD}.muffleNew`)
      && game.settings.get(MOD, "muffleNew") === true, {version: A?.version});
    scene = await Scene.create({name: "WoDX gate: Walls", width: 1200, height: 900, grid: {size: 100}, padding: 0});
    await sleep(400);
    const [a, b] = await scene.createEmbeddedDocuments("AmbientSound", [{x: 300, y: 300, radius: 10, path: "sounds/notify.wav"},
      {x: 800, y: 300, radius: 10, path: "sounds/notify.wav", walls: false}]);
    const S = id => scene.sounds.get(id);
    const view = s => ({walls: s?.walls, muffled: s?.effects?.muffled?.type, intensity: s?.effects?.muffled?.intensity});
    ok("2. placed by hand", S(a.id).walls === true && S(a.id).effects?.muffled?.type === "lowpass" && S(b.id).walls === false, {a: view(S(a.id)), b: view(S(b.id))});

    await scene.view(); await sleep(1200);
    const n1 = await api.walls.muffle(scene, true); await sleep(300);
    api.open(); await sleep(900);
    const txt = document.getElementById("wodx-atmosphere")?.textContent ?? "";
    ok("3. muffle them all", n1 === 1 && [a, b].every(x => S(x.id).walls === true && S(x.id).effects?.muffled?.type === "lowpass") && /2 of 2 placed sounds/.test(txt), {n1});
    const n2 = await api.walls.muffle(scene, false); await sleep(300);
    ok("4. let them all through", n2 === 2 && [a, b].every(x => S(x.id).walls === false), {n2});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      await foundry.applications.instances?.get?.("wodx-atmosphere")?.close?.();
      if ( viewed && game.scenes.get(viewed) ) await game.scenes.get(viewed).view();
      await sleep(800);
      if ( scene ) await game.scenes.get(scene.id)?.delete();
      ok("5. clean up", !scene || !game.scenes.get(scene.id));
    } catch (err) { ok("5. clean up", false, {error: err.message}); }
  }
  return save(R);
}
