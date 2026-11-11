/**
 * Teleport gate (WoDX Storyteller 0.21.0), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateteleport.mjs?${Date.now()}`)).run()
 * Makes its own scene "WoDX gate: Teleport" (gridded, 100 px), a wall, two actors and two tokens; views the scene,
 * then goes back to the scene it started on and deletes everything it made.
 *   1. the api, the toolbar button (Storyteller only) and the key are there
 *   2. one token jumps to a point across a wall, centred and snapped
 *   3. two tokens keep their places around the point
 *   4. a point off the scene keeps the token inside it
 *   5. arming: the button arms a click, a second press cancels; with nothing selected it does not arm
 *   6. a click on the map while armed moves the token there
 *   7. every other WoDX module still answers
 * Result: Data/wodx-gate/gateteleport-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const G = 100;
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
async function until(fn, ms = 5000) { const t = Date.now(); while ( Date.now() - t < ms ) { if ( fn() ) return true; await sleep(100); } return !!fn(); }

// Foundry 14 may hand back a batch of new actors out of order: match each one to its data by name
const createActors = async data => { const made = await Actor.create(data); return data.map(d => made.find(a => a.name === d.name) ?? null); };

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const back = canvas.scene;
  const api = () => game.wodx?.storyteller?.teleport;
  let scene, actors = [], a, b;
  try {
    scene = await Scene.create({name: "WoDX gate: Teleport", width: 2000, height: 1500, padding: 0, grid: {type: 1, size: G}, tokenVision: false});
    await scene.view();
    await until(() => canvas.ready && canvas.scene?.id === scene.id, 10000);
    await scene.createEmbeddedDocuments("Wall", [{c: [G * 5, 0, G * 5, G * 15]}]);
    actors = await createActors([{name: "WoDX gate: Teleport one", type: "Mortal"}, {name: "WoDX gate: Teleport two", type: "Mortal"}]);
    const made = await scene.createEmbeddedDocuments("Token", [
      {name: "one", actorId: actors[0].id, x: G, y: G}, {name: "two", actorId: actors[1].id, x: G * 3, y: G}]);
    a = scene.tokens.find(t => t.actorId === actors[0].id); b = scene.tokens.find(t => t.actorId === actors[1].id);
    await until(() => a.object && b.object);
    const sel = (...docs) => { canvas.tokens.releaseAll(); for ( const d of docs ) d.object.control({releaseOthers: false}); };

    await step("api, button and key", async () => {
      const ctl = ui.controls?.controls?.tokens?.tools ?? ui.controls?.controls?.token?.tools ?? {};
      const key = game.keybindings.actions.get("wodx-storyteller.teleport");
      ok("api, button and key", typeof api()?.to === "function" && !!ctl.wodxTeleport && ctl.wodxTeleport.visible === true && !!key?.restricted,
        {button: !!ctl.wodxTeleport, key: key?.editable});
    });
    await step("one token across a wall", async () => {
      sel(a);
      await api().to({x: G * 8 + 50, y: G * 4 + 50});
      await until(() => a.x === G * 8 && a.y === G * 4);
      ok("one token across a wall", a.x === G * 8 && a.y === G * 4, {x: a.x, y: a.y});
    });
    await step("a group keeps its shape", async () => {
      sel(a, b);
      const dx = b.x - a.x, dy = b.y - a.y;
      await api().to({x: G * 12, y: G * 10});
      await until(() => b.x - a.x === dx && a.y >= G * 9);
      ok("a group keeps its shape", b.x - a.x === dx && b.y - a.y === dy && Math.abs((a.x + b.x) / 2 + G / 2 - G * 12) <= G, {a: [a.x, a.y], b: [b.x, b.y]});
    });
    await step("kept inside the scene", async () => {
      sel(a);
      await api().to({x: 99999, y: -500});
      const r = canvas.dimensions.sceneRect;
      await until(() => a.y === r.y);
      ok("kept inside the scene", a.x <= r.x + r.width - G && a.y === r.y, {x: a.x, y: a.y, rect: [r.x, r.y, r.width, r.height]});
    });
    await step("arming", async () => {
      canvas.tokens.releaseAll();
      const none = api().arm();
      sel(a);
      const on = api().arm(), armed = api().armed();
      const off = api().arm();
      ok("arming", none === false && on === true && armed === true && off === false && api().armed() === false);
    });
    await step("a click moves the token", async () => {
      sel(a);
      api().arm();
      const view = canvas.app.view ?? canvas.app.canvas;
      const target = {x: G * 15 + 50, y: G * 7 + 50};
      const gp = canvas.stage.worldTransform.apply(target), rect = view.getBoundingClientRect();
      view.dispatchEvent(new PointerEvent("pointerdown", {bubbles: true, cancelable: true, button: 0, clientX: rect.left + gp.x, clientY: rect.top + gp.y}));
      await until(() => a.x === G * 15 && a.y === G * 7);
      ok("a click moves the token", a.x === G * 15 && a.y === G * 7 && !api().armed(), {x: a.x, y: a.y, stillSelected: a.object?.controlled});
    });
    await step("other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-otherworlds"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("other modules", !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      if ( back && back.id !== scene?.id ) await back.view();
      if ( scene ) await scene.delete();
      for ( const x of actors ) await game.actors.get(x.id)?.delete();
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gateteleport-result.json");
}
