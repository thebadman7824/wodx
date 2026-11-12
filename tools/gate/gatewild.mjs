/**
 * Wild land and underground gate (WoDX Otherworlds 0.17.0), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatewild.mjs?${Date.now()}`)).run()
 * Makes a scene "WoDX gate: Wild home" with one actor and token, draws pieces of wild land, walks the token on and
 * brings it home, reads an underground map with Reflect, then goes back to the scene it started on and deletes every
 * scene and actor it made (the art files stay in Data/wodx-assets/realms and are listed in the result).
 *   1. the api is there (drawWild, walkOn, wildRules)
 *   2. a piece of the open Umbra draws (seed 42): a scene in WoDX realms, art loaded, walls and regions made
 *   3. drawing it again finds the same scene; redrawing it is refused
 *   4. the token is sent in, walks on off a side and stands on the piece beside it, at that piece's way in
 *   5. walking back finds the first piece again; bring it back returns the token to its own spot
 *   6. a piece of the Tempest draws, mostly water, and its Byway or rock can be stood on
 *   7. the two pieces of Umbra meet square for square along their shared side
 *   8. Reflect reads an underground map: sewer runs sour and web, a fall stands as a relic
 *   9. every other WoDX module still answers
 * Result: Data/wodx-gate/gatewild-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const M = "wodx-otherworlds";
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: [], art: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const back = canvas.scene;
  const api = () => game.modules.get(M)?.api?.realmMaps;
  const before = new Set(game.scenes.map(s => s.id));
  let home, actor;
  try {
    home = await Scene.create({name: "WoDX gate: Wild home", width: 2000, height: 1500, padding: 0, grid: {type: 1, size: 100}, tokenVision: false});
    actor = await Actor.create({name: "WoDX gate: Wild traveller", type: "Mortal"});
    await home.createEmbeddedDocuments("Token", [{name: "traveller", actorId: actor.id, x: 300, y: 400}]);
    const WR = api()?.wildRules;

    await step("api", async () => ok("api", typeof api()?.drawWild === "function" && typeof api()?.walkOn === "function" && typeof WR?.wildTile === "function"));
    let first;
    await step("the open Umbra draws", async () => {
      first = await api().drawWild({wild: "umbra", seed: 42, year: 1999});
      R.art.push(api().artOf(first));
      const tex = await foundry.canvas.loadTexture(api().artOf(first)).catch(() => null);
      const f = first.flags[M].realmMap;
      ok("the open Umbra draws", f.wild === "umbra" && f.x === 0 && f.y === 0 && f.seed === 42 && first.walls.size > 10 && first.regions.size >= 2 && !!tex
        && game.folders.get(first.folder?.id ?? first.folder)?.name === "WoDX realms", {walls: first.walls.size, regions: first.regions.size, tex: !!tex});
    });
    await step("found again, not redrawn", async () => {
      const again = await api().drawWild({wild: "umbra", seed: 42, year: 1999});
      let refused = "";
      try { await api().redraw(first, {seed: 1}); } catch (e) { refused = e.message; }
      ok("found again, not redrawn", again.id === first.id && /fixed by its seed/.test(refused), {refused});
    });
    let side, next, moved;
    await step("walk on", async () => {
      const tok = home.tokens.find(t => t.actorId === actor.id);
      const [inside] = await api().send(first, [tok]);
      side = WR.waysOn(api().modelOf(first))[0];
      const r = await api().walkOn(first, side, [inside], {follow: false});
      next = r.scene; moved = r.tokens[0];
      R.art.push(api().artOf(next));
      const to = WR.beside(0, 0, side), f = next.flags[M].realmMap;
      const spot = WR.entrySpots(api().modelOf(next), side, 1)[0];
      ok("walk on", next.id !== first.id && f.x === to.x && f.y === to.y && first.tokens.size === 0 && next.tokens.size === 1
        && moved.x === spot.x * 100 && moved.y === spot.y * 100 && moved.flags[M].cameFrom.scene === home.id, {side, to, x: moved.x, y: moved.y});
    });
    await step("back and home", async () => {
      const r = await api().walkOn(next, WR.OPPOSITE[side], [next.tokens.contents[0]], {follow: false});
      const [b] = await api().bringBack([r.tokens[0]]);
      ok("back and home", r.scene.id === first.id && b?.parent?.id === home.id && b.x === 300 && b.y === 400, {x: b?.x, y: b?.y});
    });
    await step("the Tempest draws", async () => {
      const t = await api().drawWild({wild: "tempest", seed: 42, x: 2, y: 1, year: 1999});
      R.art.push(api().artOf(t));
      const m = api().modelOf(t), T = api().rules.T;
      const water = m.cells.flat().filter(c => c === T.water).length / (m.cols * m.rows);
      const arr = m.regions.find(r => r.kind === "arrival");
      ok("the Tempest draws", water > 0.4 && api().rules.walkable(m.cells[arr.at.y][arr.at.x]) && t.regions.size === m.regions.length, {water: Math.round(water * 100)});
    });
    await step("pieces meet", async () => {
      const a = WR.wildTile({wild: "umbra", seed: 42, x: 0, y: 0, year: 1999}), b = WR.wildTile({wild: "umbra", seed: 42, x: 1, y: 0, year: 1999});
      const at = WR.groundAt("umbra", 42, 1999), T = api().rules.T;
      let off = 0;
      for ( let y = 0; y < a.rows; y++ ) for ( const [m, x, wx] of [[a, a.cols - 1, a.cols - 1], [b, 0, a.cols]] ) if ( m.cells[y][x] !== at(wx, y) && m.cells[y][x] !== T.path && m.cells[y][x] !== T.hazard ) off++;
      ok("pieces meet", off <= 4, {off});
    });
    await step("Reflect underground", async () => {
      const rules = await import(`/modules/${M}/scripts/reflect-rules.mjs`);
      const reg = (id, area) => ({id, label: id, rect: [2, 2, 4, 4], place: {kind: "sewer"}, area});
      const sc = {format: "wodx-map", version: 1, cells: [40, 30], underground: true, dress: "sewers", umbral: {year: 1930, places: {}, gone: []},
        regions: [reg("main-sewer-1", "main-sewer"), reg("outfall-1", "outfall"), reg("collapse-1", "collapse")]};
      const pen = rules.reflect(sc, "penumbra").map(m => m.kind), dead = rules.reflect(sc, "shadowlands").map(m => m.kind);
      ok("Reflect underground", pen.includes("web") && pen.includes("blight") && dead.includes("relic") && dead.includes("rot"), {pen, dead});
    });
    await step("other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-storyteller", "wodx-otherworlds"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("other modules", !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      if ( back && game.scenes.get(back.id) ) await back.view();
      await sleep(300);
      for ( const s of [...game.scenes].filter(s => !before.has(s.id)) ) await s.delete();
      if ( actor ) await game.actors.get(actor.id)?.delete();
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatewild-result.json");
}
