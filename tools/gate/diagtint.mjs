/**
 * Diagnostic for gatepassing step 3 (a body's token tint stays white), in rothenstein-wodx as Gamemaster Test:
 *   await (await import(`/wodx-gate/diagtint.mjs?${Date.now()}`)).run()
 * Makes a scene, an actor and a token, tries the tint three ways, records every update to that token (who sent which
 * keys), then deletes what it made and puts the "remains" setting back. Result: Data/wodx-gate/diagtint-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
export async function run() {
  const R = {started: new Date().toISOString(), version: game.version, tries: [], updates: [], errors: []};
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const ST = "wodx-storyteller", was = game.settings.get(ST, "remains"), back = canvas.scene;
  let scene, actor, tok;
  const hk = [];
  try {
    scene = await Scene.create({name: "WoDX gate: Tint", width: 1000, height: 1000, padding: 0, grid: {type: 1, size: 100}});
    await scene.view(); await sleep(1500);
    actor = await Actor.create({name: "WoDX gate: Tint", type: "Mortal"});
    [tok] = await scene.createEmbeddedDocuments("Token", [{name: "tint", actorId: actor.id, x: 200, y: 200}]);
    const read = () => ({tint: String(tok.texture?.tint), css: tok.texture?.tint?.css ?? null, raw: tok._source?.texture?.tint ?? null});
    hk.push(["preUpdateToken", Hooks.on("preUpdateToken", (d, ch) => { if ( d.id === tok.id ) R.updates.push({hook: "pre", keys: Object.keys(foundry.utils.flattenObject(ch)), tint: ch.texture?.tint ?? null, stack: String(new Error().stack).split("\n").slice(2, 7).join(" | ")}); })]);
    hk.push(["updateToken", Hooks.on("updateToken", (d, ch) => { if ( d.id === tok.id ) R.updates.push({hook: "post", keys: Object.keys(foundry.utils.flattenObject(ch)), tint: ch.texture?.tint ?? null}); })]);
    R.tries.push({step: "start", ...read(), schema: !!tok.schema?.getField?.("texture.tint")});
    await tok.update({"texture.tint": "#9fa47c"}); await sleep(300);
    R.tries.push({step: "a: tok.update texture.tint", ...read()});
    await tok.update({"texture.tint": "#ffffff"}); await sleep(300);
    await scene.updateEmbeddedDocuments("Token", [{_id: tok.id, "flags.wodx-gate.x": 1, "texture.tint": "#c9d1ae"}]); await sleep(300);
    R.tries.push({step: "b: updateEmbeddedDocuments flag + tint", ...read()});
    await tok.update({"texture.tint": "#ffffff"}); await sleep(300);
    await game.settings.set(ST, "remains", true);
    await game.modules.get(ST).api.remains.mark(tok, {since: game.time.worldTime - 10 * 86400});
    const n = await game.modules.get(ST).api.remains.tick(); await sleep(800);
    R.tries.push({step: "c: remains.mark + tick", ticked: n, shown: tok.flags?.[ST]?.remains?.shown ?? null, ...read()});
  } catch (e) { R.errors.push(`${e.message} | ${String(e.stack).split("\n").slice(1, 4).join(" | ")}`); }
  finally {
    for ( const [h, id] of hk ) Hooks.off(h, id);
    try {
      await game.settings.set(ST, "remains", was);
      if ( back && back.id !== scene?.id ) await back.view();
      if ( scene ) await scene.delete();
      if ( actor ) await actor.delete();
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  R.finished = new Date().toISOString();
  const file = new File([JSON.stringify(R, null, 1)], "diagtint-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.tries.map(t => `${t.step}: ${t.tint}`).join("; ");
}
