/**
 * Umbral reflection gate (WoDX Otherworlds 0.9.0), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatereflect.mjs?${Date.now()}`)).run()
 * Needs Data/wodx-gate/reflecttown.wodx.json (copied from tools/mapgen/samples by the deploy job). Makes a scene
 * "WoDX gate: Reflect town" with no twin levels, reflects it, checks, reflects again, takes it off, then goes back to
 * the scene it started on and deletes the scene. The overlay files stay in Data/wodx-assets/twins/reflect.
 *   1. the api and the toolbar button (Storyteller only) are there
 *   2. reflect for 1960: plain Penumbra and Shadowlands levels made, one overlay tile on each, regions on the twins
 *   3. both overlays load as textures
 *   4. relics of what was pulled down are regions on the Shadowlands level only
 *   5. a second run replaces, not doubles
 *   6. a looming region holds its own middle on the Penumbra level
 *   7. take it off: no tiles or regions left, the flag cleared
 *   8. every other WoDX module still answers
 * Result: Data/wodx-gate/gatereflect-result.json.
 */
const M = "wodx-otherworlds";
const SIDE = "wodx-gate/reflecttown.wodx.json";
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const back = canvas.scene;
  const api = () => game.modules.get(M)?.api?.reflect;
  let scene;
  const twinLevel = layer => scene.levels.find(l => l.flags?.[M]?.layer === layer);
  try {
    const side = await (await fetch(SIDE, {cache: "no-store"})).json();
    const [cw, ch] = side.cells;
    scene = await Scene.create({name: "WoDX gate: Reflect town", width: cw * 100, height: ch * 100, padding: 0, grid: {type: 1, size: 100}, tokenVision: false});
    if ( !scene.levels.size ) await scene.createEmbeddedDocuments("Level", [{name: "Ground", elevation: {bottom: 0, top: 20}}]);
    R.notes.push(`levels at start: ${scene.levels.size}`);

    await step("api and button", async () => {
      const ctl = ui.controls?.controls?.tokens?.tools ?? ui.controls?.controls?.token?.tools ?? {};
      ok("api and button", typeof api()?.scene === "function" && !!ctl.wodxReflect && ctl.wodxReflect.visible === true);
    });
    let out;
    await step("reflect 1960", async () => {
      out = await api().scene(scene, {path: SIDE, year: 1960});
      const pen = twinLevel("penumbra"), sha = twinLevel("shadowlands");
      const tiles = scene.tiles.filter(t => t.flags?.[M]?.reflection);
      const onTwins = scene.regions.filter(r => r.flags?.[M]?.reflection).every(r => [pen?.id, sha?.id].includes([...(r.levels ?? [])][0]));
      ok("reflect 1960", !!pen && !!sha && tiles.length === 2 && onTwins && scene.flags[M].reflection.year === 1960,
        {tiles: tiles.length, regions: scene.regions.size, pen: out.penumbra.length, sha: out.shadowlands.length});
    });
    await step("overlays load", async () => {
      const srcs = scene.tiles.filter(t => t.flags?.[M]?.reflection).map(t => t.texture.src);
      const tex = await Promise.all(srcs.map(s => foundry.canvas.loadTexture(s).catch(() => null)));
      ok("overlays load", tex.length === 2 && tex.every(Boolean), {srcs});
    });
    await step("relics on the Shadowlands", async () => {
      const sha = twinLevel("shadowlands");
      const rel = scene.regions.filter(r => r.flags?.[M]?.reflection === "relic");
      ok("relics on the Shadowlands", rel.length >= side.umbral.gone.length && rel.every(r => [...r.levels][0] === sha.id), {relics: rel.length, gone: side.umbral.gone.length});
    });
    await step("second run replaces", async () => {
      const n = [scene.tiles.size, scene.regions.size, scene.levels.size];
      await api().scene(scene, {path: SIDE, year: 1960});
      const m = [scene.tiles.size, scene.regions.size, scene.levels.size];
      ok("second run replaces", n.every((v, i) => v === m[i]), {before: n, after: m});
    });
    await step("a looming region holds its middle", async () => {
      const pen = twinLevel("penumbra");
      const loom = scene.regions.find(r => r.flags?.[M]?.reflection === "loom");
      const s = loom.shapes[0];
      const pts = s.type === "polygon" ? s.points : [s.x, s.y, s.x + s.width, s.y + s.height];
      let cx = 0, cy = 0; const k = pts.length / 2;
      for ( let i = 0; i < pts.length; i += 2 ) { cx += pts[i] / k; cy += pts[i + 1] / k; }
      const inside = loom.testPoint({x: cx, y: cy, elevation: pen.elevation.bottom + 1});
      ok("a looming region holds its middle", !!inside, {region: loom.name, at: [Math.round(cx), Math.round(cy)]});
    });
    await step("take it off", async () => {
      const n = await api().undo(scene);
      ok("take it off", n > 2 && !scene.tiles.filter(t => t.flags?.[M]?.reflection).length && !scene.regions.filter(r => r.flags?.[M]?.reflection).length
        && !scene.flags?.[M]?.reflection, {removed: n});
    });
    await step("other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-storyteller", "wodx-otherworlds"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("other modules", !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      if ( back && back.id !== scene?.id ) await back.view();
      if ( scene ) await game.scenes.get(scene.id)?.delete();
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatereflect-result.json");
}
