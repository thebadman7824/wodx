/**
 * NPC movement on gridless scenes (WoDX NPC 0.6.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gategridless.mjs?${Date.now()}`)).run()
 * It makes a gridless scene of its own with a wall, and two actors, and deletes them at the end. The clock never moves.
 *   1. the module: NPC 0.6.0 or later, the setting on
 *   2. the way to a foe behind a wall: a path on the lattice, no step crosses the wall, it ends beside the foe
 *   3. walking it: the token ends on the path's last cell
 *   4. with the setting off, no path and the card's note says to move by hand
 *   5. clean up
 * Result: Data/wodx-gate/gategridless-result.json.
 */
const MOD = "wodx-npc";
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gategridless-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const M = game.modules.get(MOD), api = M?.api;
  const viewed = canvas.scene?.id, keep = {gridless: game.settings.get(MOD, "gridless")};
  let scene = null; const actors = [];
  try {
    ok("1. module", M?.active && !foundry.utils.isNewerVersion("0.6.0", M.version) && keep.gridless === true, {version: M?.version});
    scene = await Scene.create({name: "WoDX gate: Gridless", width: 1500, height: 1000, padding: 0, grid: {type: CONST.GRID_TYPES.GRIDLESS, size: 100, distance: 5}, tokenVision: false});
    // A wall down the middle with a gap at the bottom
    await scene.createEmbeddedDocuments("Wall", [{c: [750, 0, 750, 700]}]);
    for ( const [name, type] of [["NPC", "Mortal"], ["Foe", "Mortal"]] ) actors.push(await Actor.create({name: `WoDX gate: ${name}`, type}));
    await scene.createEmbeddedDocuments("Token", [
      {...actors[0].prototypeToken.toObject(), actorId: actors[0].id, name: "NPC", x: 437, y: 312, disposition: -1},
      {...actors[1].prototypeToken.toObject(), actorId: actors[1].id, name: "Foe", x: 1020, y: 290, disposition: 1}]);
    await scene.view(); await sleep(1500);
    const npc = canvas.tokens.placeables.find(t => t.name === "NPC"), foe = canvas.tokens.placeables.find(t => t.name === "Foe");
    const way = api.approach(npc, foe);
    const crosses = (way.path ?? []).some((c, k, p) => k > 0 && api.wallBetween(p[k - 1], c, npc));
    const last = way.path?.[way.path.length - 1];
    const fc = api.cellOf(foe);
    const beside = last && Math.max(Math.abs(last.i - fc.i), Math.abs(last.j - fc.j)) === 1;
    ok("2. the way round the wall", !!way.path && !crosses && beside && way.path.some(c => c.i >= 7), {len: way.path?.length, last, foe: fc, note: way.note});

    if ( way.path ) {
      const pts = way.path.slice(1).map(c => ({x: c.j * 100, y: c.i * 100}));
      try { await npc.document.move(pts); } catch (e) { for ( const p of pts ) await npc.document.update(p); }
      // move() returns before the walk ends: wait until the token stands on the last waypoint (at most 8 s)
      const end = pts[pts.length - 1], doc = () => canvas.tokens.get(npc.id)?.document;
      for ( let k = 0; k < 40 && !(doc()?.x === end.x && doc()?.y === end.y); k++ ) await sleep(200);
      await sleep(300);
    }
    const now = api.cellOf(canvas.tokens.get(npc.id));
    ok("3. walking it", last && now.i === last.i && now.j === last.j, {now, last});

    await game.settings.set(MOD, "gridless", false);
    const off = api.approach(canvas.tokens.get(npc.id), foe);
    ok("4. setting off", !off.path && /by hand/.test(off.note ?? ""), {note: off.note});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      await game.settings.set(MOD, "gridless", keep.gridless);
      if ( viewed && game.scenes.get(viewed) ) await game.scenes.get(viewed).view();
      await sleep(800);
      if ( scene ) await game.scenes.get(scene.id)?.delete();
      for ( const a of actors ) await game.actors.get(a.id)?.delete();
      ok("5. clean up", (!scene || !game.scenes.get(scene.id)) && !actors.some(a => game.actors.get(a.id)) && game.settings.get(MOD, "gridless") === keep.gridless);
    } catch (err) { ok("5. clean up", false, {error: err.message}); }
  }
  return save(R);
}
