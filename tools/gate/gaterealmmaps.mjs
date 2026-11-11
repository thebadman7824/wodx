/**
 * Realm maps gate (WoDX Otherworlds 0.8.0), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gaterealmmaps.mjs?${Date.now()}`)).run()
 * Makes a scene "WoDX gate: Realm home" with one actor and token, draws realms, sends the token in and back, then
 * goes back to the scene it started on and deletes everything it made (scenes, actor, the art files stay in
 * Data/wodx-assets/realms and are listed in the result).
 *   1. the api and the toolbar button (Storyteller only) are there
 *   2. Stygia (seed 7, 1600) draws: a realm scene in WoDX realms, art loaded, walls and regions made
 *   3. every realm draws without an error (one scene each, 34 in all)
 *   4. the token goes into the Labyrinth and lands on the arrival; it remembers where it came from
 *   5. a wall of the realm stops a move across it
 *   6. bring it back: same scene, same spot
 *   7. redraw with a new seed keeps the scene and replaces the art
 *   8. every other WoDX module still answers
 * Result: Data/wodx-gate/gaterealmmaps-result.json.
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
async function until(fn, ms = 5000) { const t = Date.now(); while ( Date.now() - t < ms ) { if ( fn() ) return true; await sleep(100); } return !!fn(); }

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: [], art: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const back = canvas.scene;
  const api = () => game.modules.get(M)?.api?.realmMaps;
  const made = [];
  let home, actor;
  try {
    home = await Scene.create({name: "WoDX gate: Realm home", width: 2000, height: 1500, padding: 0, grid: {type: 1, size: 100}, tokenVision: false});
    made.push(home);
    actor = await Actor.create({name: "WoDX gate: Realm traveller", type: "Mortal"});
    await home.createEmbeddedDocuments("Token", [{name: "traveller", actorId: actor.id, x: 300, y: 400}]);

    await step("api and button", async () => {
      const ctl = ui.controls?.controls?.tokens?.tools ?? ui.controls?.controls?.token?.tools ?? {};
      ok("api and button", typeof api()?.draw === "function" && !!ctl.wodxRealmMaps && ctl.wodxRealmMaps.visible === true);
    });
    let stygia;
    await step("Stygia draws", async () => {
      stygia = await api().draw({realm: "stygia", seed: 7, year: 1600});
      made.push(stygia);
      R.art.push(api().artOf(stygia));
      const tex = await foundry.canvas.loadTexture(api().artOf(stygia)).catch(e => null);
      const f = stygia.flags[M];
      ok("Stygia draws", f.realmMap.realm === "stygia" && f.realmMap.year === 1600 && stygia.walls.size > 50 && stygia.regions.size >= 4 && !!tex
        && game.folders.get(stygia.folder?.id ?? stygia.folder)?.name === "WoDX realms", {walls: stygia.walls.size, regions: stygia.regions.size, tex: !!tex, w: tex?.width});
    });
    await step("every realm draws", async () => {
      // Each realm has a layout of its own (Otherworlds 0.12.0), so every realm is drawn once
      const R7 = api().rules, all = R7.REALM_ORDER;
      const out = [];
      for ( const id of all ) { const s = await api().draw({realm: id, seed: 3, size: "small"}); made.push(s); R.art.push(api().artOf(s)); out.push([id, s.walls.size, s.regions.size]); }
      ok("every realm draws", out.length === all.length && all.length >= 34 && out.every(([, w, r]) => w > 10 && r >= 3), {out});
    });
    let lab, inside;
    await step("into the Labyrinth", async () => {
      lab = await api().draw({realm: "labyrinth", seed: 9, year: 1999});
      made.push(lab);
      const tok = home.tokens.find(t => t.actorId === actor.id);
      [inside] = await api().send(lab, [tok]);
      const arr = lab.regions.find(r => r.flags[M]?.realmRegion === "arrival");
      const sh = arr.shapes[0];
      const near = Math.abs(inside.x - sh.x) <= 300 && Math.abs(inside.y - sh.y) <= 300;
      ok("into the Labyrinth", !home.tokens.find(t => t.actorId === actor.id) && lab.tokens.size === 1 && near
        && inside.flags[M].cameFrom.scene === home.id && inside.flags[M].cameFrom.x === 300, {x: inside.x, y: inside.y, arrival: [sh.x, sh.y]});
    });
    await step("a realm wall stops a move", async () => {
      await lab.view();
      await until(() => canvas.ready && canvas.scene?.id === lab.id, 10000);
      const t = lab.tokens.contents[0];
      const w = lab.walls.find(x => x.flags[M]?.realmWall === "solid" && x.c[0] === x.c[2] && x.c[1] > 0);
      const [x] = w.c, y = Math.min(w.c[1], w.c[3]) + 50;
      const blocked = CONFIG.Canvas.polygonBackends.move.testCollision({x: x - 50, y}, {x: x + 50, y}, {type: "move", mode: "any"});
      ok("a realm wall stops a move", !!blocked, {wall: w.c});
      void t;
    });
    await step("bring it back", async () => {
      const t = lab.tokens.contents[0];
      const [b] = await api().bringBack([t.document ?? t]);
      ok("bring it back", b?.parent?.id === home.id && b.x === 300 && b.y === 400 && lab.tokens.size === 0, {x: b?.x, y: b?.y});
    });
    await step("redraw", async () => {
      const before = api().artOf(stygia);
      await api().redraw(stygia, {seed: 8});
      R.art.push(api().artOf(stygia));
      ok("redraw", api().artOf(stygia) !== before && stygia.flags[M].realmMap.seed === 8 && stygia.walls.size > 50, {src: api().artOf(stygia)});
    });
    await step("other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-storyteller", "wodx-otherworlds"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("other modules", !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      if ( back && !made.some(s => s.id === back.id) ) await back.view();
      for ( const s of made ) await game.scenes.get(s.id)?.delete();
      if ( actor ) await game.actors.get(actor.id)?.delete();
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gaterealmmaps-result.json");
}
