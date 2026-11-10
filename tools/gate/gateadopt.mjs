/**
 * Adopt a generated map (WoDX Interactables 0.19.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateadopt.mjs?${Date.now()}`)).run()
 * Needs Data/wodx-gate/kessler-steading.wodx.json (copy of tools/mapgen/samples/kessler-steading.wodx.json).
 * It makes a scene of its own the farmstead's size, with a door wall where the import would put each door and
 * shutter, and deletes the scene at the end. It does not switch the Storyteller's view.
 *   1. the module: Interactables 0.19.0 or later, api.adopt
 *   2. the plan: 10 doors and shutters found, none new, 8 things, 1 light, the regions (4 with WoDX NPC on, else 2)
 *   3. applied: tiles, the light, regions and walls are real Foundry documents that Interactables reads
 *   4. the oven tile works its light; the house region is a home place; the track trigger is a WoDX: Trigger;
 *      the chest's fill starts from a home (Interactables 0.20.0)
 *   5. the Scenes sidebar menu has Adopt a generated map and, once adopted, Undo the map adoption
 *   6. adopting again finds nothing new
 *   7. Undo removes what was made and puts the door walls back
 *   8. clean up
 * Result: Data/wodx-gate/gateadopt-result.json.
 */
const MOD = "wodx-interactables";
const N = 8;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${N} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gateadopt-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const M = game.modules.get(MOD), X = M?.api?.adopt, npcOn = !!game.modules.get("wodx-npc")?.active;
  let scene = null;
  try {
    ok("1. module", M?.active && !foundry.utils.isNewerVersion("0.19.0", M.version) && typeof X?.apply === "function", {version: M?.version});
    const text = await (await fetch(`/wodx-gate/kessler-steading.wodx.json?${Date.now()}`, {cache: "no-store"})).text();
    const sc = X.rules.parseSidecar(text).data;
    scene = await Scene.create({name: "WoDX gate: Steading", width: sc.cells[0] * 100, height: sc.cells[1] * 100, padding: 0.25, grid: {size: 100, distance: 5}});
    const fr = X.rules.frameOf(scene);
    const walls = sc.openings.map(o => ({c: [...X.rules.px(fr, o.c[0], o.c[1]), ...X.rules.px(fr, o.c[2], o.c[3])].map(v => Math.round(v) + 4), door: 1}));
    walls.push({c: [...X.rules.px(fr, 13, 15), ...X.rules.px(fr, 25, 15)].map(Math.round), door: 0});
    const made = await scene.createEmbeddedDocuments("Wall", walls);
    const firstDoor = made[0];
    await firstDoor.update({[`flags.${MOD}.material`]: "glass"});

    const got = await X.plan(scene, text);
    const p = got.p;
    ok("2. plan", p.wallUpdates.length === 10 && p.wallCreates.length === 0 && p.tiles.length === 8 && p.lights.length === 1 && p.regions.length === (npcOn ? 4 : 2),
      {lines: X.rules.summary(p), notes: p.notes, errors: got.errors, npcOn});

    const rec = await X.apply(scene, p); await sleep(400);
    const api = M.api;
    const tiles = scene.tiles.contents, described = tiles.map(t => api.describeTile(t));
    const shutter = scene.walls.contents.find(w => w.flags?.[MOD]?.kind === "shutter");
    ok("3. applied", tiles.length === 8 && described.every(Boolean) && scene.lights.size === 1 && scene.regions.size === p.regions.length
      && api.describeWall(shutter)?.kind === "shutter" && !!scene.flags?.[MOD]?.adopted,
      {tiles: tiles.length, kinds: described.map(d => d && (d.container ? "container" : d.light ? "light" : d.hide ? "hide" : d.climb ? "climb" : "?")), regions: scene.regions.size, made: rec.made});

    const oven = tiles.find(t => t.flags?.[MOD]?.light);
    const home = scene.regions.find(r => r.name === "Longhouse");
    const trig = scene.regions.find(r => r.name === "Track into the steading");
    ok("4. oven, place, trigger", api.describeTile(oven)?.on === true && api.lightsOf(oven).length === 1 && home?.flags?.["wodx-npc"]?.place?.kind === "home"
      && (!npcOn || trig?.behaviors?.contents?.[0]?.type === "wodx-npc.trigger") && api.fill.guess?.(tiles.find(t => t.flags?.[MOD]?.container))?.place === "home",
      {ovenOn: api.describeTile(oven)?.on, place: home?.flags?.["wodx-npc"]?.place, trig: trig?.behaviors?.contents?.map(b => b.type), shapes: home?.shapes?.map(s => s.type), fill: api.fill.guess?.(tiles.find(t => t.flags?.[MOD]?.container))});

    const opts = [];
    Hooks.callAll("getSceneContextOptions", ui.scenes, opts);
    const li = {dataset: {entryId: scene.id}};
    const adoptOpt = opts.find(o => o.name === "Adopt a generated map"), undoOpt = opts.find(o => o.name === "Undo the map adoption");
    ok("5. menu", !!adoptOpt && !!undoOpt && undoOpt.condition(li) === true, {names: opts.map(o => o.name)});

    const again = await X.plan(scene, text);
    ok("6. again", X.rules.summary(again.p).length === 0, {lines: X.rules.summary(again.p), notes: again.p.notes});

    await X.undo(scene); await sleep(400);
    ok("7. undo", scene.tiles.size === 0 && scene.lights.size === 0 && scene.regions.size === 0 && scene.walls.size === walls.length
      && scene.walls.get(firstDoor.id)?.flags?.[MOD]?.material === "glass" && !scene.walls.get(firstDoor.id)?.flags?.[MOD]?.kind && !scene.flags?.[MOD]?.adopted,
      {walls: scene.walls.size, first: scene.walls.get(firstDoor.id)?.flags?.[MOD]});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      if ( scene ) await game.scenes.get(scene.id)?.delete();
      ok("8. clean up", !scene || !game.scenes.get(scene.id));
    } catch (err) { ok("8. clean up", false, {error: err.message}); }
  }
  return save(R);
}
