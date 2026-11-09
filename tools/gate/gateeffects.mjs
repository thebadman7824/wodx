/**
 * Scene video effects (WoDX Chronicle 0.5.3) and the Garou test pack loaded on demand (WoDX Actions 3.14.1),
 * in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateeffects.mjs?${Date.now()}`)).run()
 * It makes one test scene with a video tile and an image tile, views it, and deletes it afterwards.
 *   1. versions
 *   2. the client setting is there, shown, and set to Show
 *   3. on the test scene the video tile draws and plays
 *   4. Hide: the video tile stops drawing and pauses; the image tile is untouched
 *   5. a tile update (moved 20 px) redraws it, and it stays hidden and paused
 *   6. Show: it draws and plays again
 *   7. the Garou test pack script has not been fetched; makeTestPack is still offered
 *   8. put back (setting, scene in view, test scene deleted)
 * Result: Data/wodx-gate/gateeffects-result.json.
 */
const A = "wodx-actions", CH = "wodx-chronicle";
const VIDEO = "rothenstein-landing/fx/fog-loop.webm";
const IMAGE = "icons/svg/mystery-man.svg";
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const newer = (a, b) => {
  const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
  for ( let i = 0; i < 3; i++ ) if ( (pa[i] ?? 0) !== (pb[i] ?? 0) ) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return true;
};
async function until(fn, ms = 6000) {
  const end = Date.now() + ms;
  while ( Date.now() < end ) { try { if ( fn() ) return true; } catch { /* not yet */ } await sleep(150); }
  return false;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R, "gateeffects-result.json"); }
  const before = game.settings.get(CH, "sceneVideo");
  const viewed = canvas.scene;
  let scene;
  try {
    ok("1. versions", newer(game.modules.get(A)?.version, "3.14.1") && newer(game.modules.get(CH)?.version, "0.5.3"),
      {actions: game.modules.get(A)?.version, chronicle: game.modules.get(CH)?.version});
    const cfg = game.settings.settings.get(`${CH}.sceneVideo`);
    if ( before !== "show" ) await game.settings.set(CH, "sceneVideo", "show");
    ok("2. setting", cfg?.scope === "client" && cfg?.config === true && game.settings.get(CH, "sceneVideo") === "show", {was: before});

    const FX = await import(`/modules/${CH}/scripts/effects.mjs`);
    scene = await Scene.create({name: "Gate effects (delete me)", width: 1200, height: 800, padding: 0, tokenVision: false, navigation: false});
    await scene.createEmbeddedDocuments("Tile", [
      {texture: {src: VIDEO}, x: 100, y: 100, width: 400, height: 300, video: {autoplay: true, loop: true, volume: 0}, flags: {wodxGate: {tag: "video"}}},
      {texture: {src: IMAGE}, x: 600, y: 100, width: 200, height: 200, flags: {wodxGate: {tag: "image"}}}
    ]);
    await scene.view();
    await until(() => canvas.scene?.id === scene.id && canvas.tiles.placeables.length === 2);
    const tileOf = tag => canvas.tiles.placeables.find(t => t.document.flags?.wodxGate?.tag === tag);
    await until(() => FX.videoOf(tileOf("video")) && !FX.videoOf(tileOf("video")).paused);
    let vt = tileOf("video"), it = tileOf("image"), v = FX.videoOf(vt);
    ok("3. video draws and plays", !!vt?.mesh && vt.mesh.renderable !== false && !!v && !v.paused,
      {hasMesh: !!vt?.mesh, hasVideo: !!v, paused: v?.paused, isVideo: vt?.isVideo});

    await game.settings.set(CH, "sceneVideo", "hide");
    await until(() => vt.mesh.renderable === false && v.paused);
    ok("4. Hide", vt.mesh.renderable === false && v.paused && it.mesh?.renderable !== false,
      {renderable: vt.mesh.renderable, paused: v.paused, imageRenderable: it.mesh?.renderable});

    await vt.document.update({x: vt.document.x + 20});
    await sleep(1200);
    vt = tileOf("video"); v = FX.videoOf(vt);
    ok("5. stays hidden after an update", vt.mesh.renderable === false && (!v || v.paused),
      {renderable: vt.mesh.renderable, paused: v?.paused});

    await game.settings.set(CH, "sceneVideo", "show");
    await until(() => vt.mesh.renderable !== false && v && !v.paused);
    ok("6. Show again", vt.mesh.renderable !== false && !!v && !v.paused, {renderable: vt.mesh.renderable, paused: v?.paused});

    const fetched = performance.getEntriesByType("resource").some(e => e.name.includes("garou-testpack.js"));
    const api = game.wodxActions ?? game.modules.get(A)?.api;
    ok("7. test pack on demand", !fetched && typeof api?.makeTestPack === "function", {fetched});
  } catch (e) {
    R.errors.push(String(e?.stack ?? e));
  } finally {
    try {
      await game.settings.set(CH, "sceneVideo", before ?? "show");
      if ( viewed && viewed.id !== scene?.id ) await viewed.view();
      if ( scene ) await scene.delete();
      ok("8. put back", game.settings.get(CH, "sceneVideo") === (before ?? "show") && !game.scenes.get(scene?.id));
    } catch (e) { R.errors.push(String(e?.stack ?? e)); ok("8. put back", false); }
  }
  return save(R, "gateeffects-result.json");
}
