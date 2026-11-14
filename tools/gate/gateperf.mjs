/**
 * Performance check, in Foundry, in rothenstein-wodx only, as Gamemaster Test. Changes nothing in the world:
 *   await (await import(`/wodx-gate/gateperf.mjs?${Date.now()}`)).run()
 *   1. a scene with three levels: which level backgrounds the browser has loaded while the first level is in view
 *   2. frame rate (average over 5 s) and animated light count on the busiest lit scene
 * It views each scene, then goes back to the scene that was in view.
 * Result: Data/wodx-gate/gateperf-result.json (a report: "pass" means the measurement ran).
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gateperf-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
async function viewAndSettle(scene) {
  await scene.view();
  const end = Date.now() + 20000;
  while ( Date.now() < end && (canvas.scene?.id !== scene.id || !canvas.ready) ) await sleep(200);
  await sleep(3000);
}
function cached(src) {
  const loader = foundry.canvas?.TextureLoader?.loader ?? globalThis.TextureLoader?.loader;
  const keys = loader?.cache instanceof Map ? [...loader.cache.keys()] : [];
  const inLoader = keys.some(k => String(k).includes(src));
  let inAssets = false;
  try { inAssets = !!globalThis.PIXI?.Assets?.cache?.has?.(src) || !!globalThis.PIXI?.Assets?.cache?.has?.(foundry.utils.getRoute?.(src) ?? src); } catch { /* none */ }
  return {inLoader, inAssets, loaderSize: keys.length};
}
async function fps(ms = 5000) {
  const samples = []; const end = Date.now() + ms;
  while ( Date.now() < end ) { samples.push(canvas.app.ticker.FPS); await sleep(250); }
  return Math.round(samples.reduce((a, b) => a + b, 0) / samples.length * 10) / 10;
}

async function runGate(K) {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], ua: navigator.userAgent};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this check in rothenstein-wodx only"}); return save(R); }
  const viewed = canvas.scene;
  try {
    const three = game.scenes.find(s => (s.levels?.size ?? 0) >= 3 && s.levels.contents.filter(l => l.background?.src).length >= 3);
    if ( three ) {
      await viewAndSettle(three);
      const levels = three.levels.contents.map(l => ({name: l.name, src: l.background?.src, ...cached(l.background?.src)}));
      ok("1. levels loaded", true, {scene: three.name, viewing: canvas.scene?.level?.name ?? canvas.level?.name ?? null, levels,
        maxTexture: canvas.app.renderer?.gl?.getParameter?.(canvas.app.renderer.gl.MAX_TEXTURE_SIZE) ?? null});
    } else ok("1. levels loaded", false, {error: "no scene with three level backgrounds"});

    const lit = game.scenes.contents.map(s => [s, s.lights.size]).sort((a, b) => b[1] - a[1])[0]?.[0];
    if ( lit ) {
      await viewAndSettle(lit);
      const animated = lit.lights.filter(l => l.config?.animation?.type).length;
      ok("2. frame rate", true, {scene: lit.name, lights: lit.lights.size, animated, fps: await fps(),
        maxFPS: game.settings.get("core", "maxFPS"), lightAnimation: (() => { try { return game.settings.get("core", "lightAnimation"); } catch { return "n/a"; } })()});
    } else ok("2. frame rate", false, {error: "no lit scene"});
  } catch (e) {
    R.errors.push(String(e?.stack ?? e));
  } finally {
    try { if ( viewed && canvas.scene?.id !== viewed.id ) await viewed.view(); } catch (e) { R.errors.push(String(e)); }
  }
  return save(R);
}

// The gate kit (B3733): its own scratch scene, cleaned up after.
import {kitRun} from "./kit.mjs";
export const run = kitRun("gateperf", runGate);
