/**
 * The looks of the other worlds (WoDX Otherworlds 0.5.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatelooks.mjs?${Date.now()}`)).run()
 * It makes a scene and an actor of its own and deletes them at the end. The clock never moves.
 *   1. the module: Otherworlds 0.5.0 or later, api.lookCss, the client setting "looks"
 *   2. on the physical level: no look
 *   3. on a Near Dreaming level: the shimmer is on the map, and it sways (the hue turns the other way within the period)
 *   4. the setting off: no shimmer, the sway stops
 *   5. jacked into the Net: the map takes the Net's line filter, which is in the page
 *   6. out of the Net and back on the physical level: no look, the sway stopped
 *   7. clean up
 * Result: Data/wodx-gate/gatelooks-result.json.
 */
const MOD = "wodx-otherworlds";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = (m, k) => { try { return game.settings.get(m, k); } catch (e) { return undefined; } };

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gatelooks-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const M = game.modules.get(MOD), O = M?.api;
  const viewed = canvas.scene?.id;
  const keepLooks = get(MOD, "looks");
  let scene = null, actor = null;
  const board = () => document.getElementById("board")?.style?.filter ?? "";
  try {
    ok("1. module", M?.active && !foundry.utils.isNewerVersion("0.5.0", M.version) && typeof O?.lookCss === "function" && game.settings.settings.has(`${MOD}.looks`), {version: M?.version});
    await game.settings.set(MOD, "looks", true);
    scene = await Scene.create({name: "WoDX gate: Looks", width: 1200, height: 900, grid: {size: 100}, padding: 0, tokenVision: false});
    await sleep(400);
    await O.realms.addDreamingLevel(game.scenes.get(scene.id)); await sleep(300);
    const L = O.twins.layersOf(game.scenes.get(scene.id));
    actor = await Actor.create({name: "WoDX gate: Looker", type: "Changeling"});
    const S = game.scenes.get(scene.id);
    await S.createEmbeddedDocuments("Token", [{...actor.prototypeToken.toObject(), actorId: actor.id, actorLink: true, name: "Looker", x: 300, y: 300, level: L.physical.id}]);
    await S.view(); await sleep(1500);
    const tok = () => canvas.tokens.placeables.find(t => t.name === "Looker");
    tok().control({releaseOthers: true}); await sleep(500);
    O.applyDecay();
    ok("2. physical", O.lookCss() === "" && !O.swaying(), {look: O.lookCss()});

    await S.tokens.get(tok().id).update({level: L.dreaming.id}); await sleep(600);
    tok().control({releaseOthers: true}); await sleep(400);
    O.applyDecay();
    const a = O.lookCss(), b1 = board();
    await sleep(3800);
    const b = O.lookCss();
    ok("3. the Dreaming shimmers and sways", /hue-rotate\(28deg\)/.test(a) && /hue-rotate\(-28deg\)/.test(b) && b1.includes("saturate(1.45)") && O.swaying(), {a, b, board: b1});

    await game.settings.set(MOD, "looks", false); await sleep(400);
    ok("4. turned off", O.lookCss() === "" && !O.swaying() && !board().includes("hue-rotate"), {look: O.lookCss(), board: board()});
    await game.settings.set(MOD, "looks", true);

    await S.tokens.get(tok().id).update({level: L.physical.id}); await sleep(400);
    await actor.toggleStatusEffect("wodx-net", {active: true}); await sleep(600);
    tok().control({releaseOthers: true}); await sleep(300);
    O.applyDecay();
    ok("5. the Net", O.lookCss() === "url(#wodx-net-look)" && board().includes("url(") && !!document.getElementById("wodx-net-look") && !O.swaying(), {look: O.lookCss(), board: board()});

    await actor.toggleStatusEffect("wodx-net", {active: false}); await sleep(600);
    O.applyDecay();
    ok("6. back", O.lookCss() === "" && !board().includes("url(") && !O.swaying(), {look: O.lookCss(), board: board()});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      if ( keepLooks !== undefined ) await game.settings.set(MOD, "looks", keepLooks);
      canvas.tokens?.releaseAll?.();
      if ( viewed && game.scenes.get(viewed) ) await game.scenes.get(viewed).view();
      await sleep(800);
      if ( scene ) await game.scenes.get(scene.id)?.delete();
      if ( actor ) await game.actors.get(actor.id)?.delete();
      O?.applyDecay?.();
      ok("7. clean up", (!scene || !game.scenes.get(scene.id)) && (!actor || !game.actors.get(actor.id)));
    } catch (err) { ok("7. clean up", false, {error: err.message}); }
  }
  return save(R);
}
