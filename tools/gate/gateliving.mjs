/**
 * Living maps gate (WoDX Interactables 0.15.0, with WoDX Chronicle 0.6.0), in Foundry, in rothenstein-wodx only, as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gateliving.mjs?${Date.now()}`)).run()
 * Back the world up first.
 *
 * It makes a scene of its own ("WoDX gate: living map") with four tiles, holds the world so moving the clock wakes
 * nothing in Rothenstein, and deletes the scene at the end; the clock, the hold and the viewed scene are put back.
 *   1. the modules: Interactables 0.15.0 or later with api.living, Chronicle 0.6.0 or later
 *   2. the scene and its tiles: snow (shows in winter), lanterns (shows on a night of revel), plague crosses
 *      (shows from 1347 to 1352), the mill (its picture changes after the Black Death)
 *   3. a summer day in 1340: nothing shows, the mill has its usual picture
 *   4. Christmas Eve 1348, at night: snow and lanterns show, the crosses show, the mill is repainted
 *   5. a January night in 1360: snow shows, the lanterns and the crosses do not, the mill stays repainted
 *   6. while the world is held a plain sync changes nothing
 *   7. the tile config has the living map section with a search box over the events
 *   8. clean up
 * Result: Data/wodx-gate/gateliving-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOD = "wodx-interactables";
const newer = (a, b) => !foundry.utils.isNewerVersion(b, a);

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
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R, "gateliving-result.json"); }
  const chron = game.modules.get("wodx-chronicle")?.api;
  const api = game.modules.get(MOD)?.api;
  const t0 = game.time.worldTime, held = !!chron?.isHeld?.(), viewed = canvas.scene?.id;
  const firedBefore = foundry.utils.deepClone(game.settings.get("wodx-chronicle", "eventsFired"));
  let scene = null;
  const {getEngine} = await import(`/modules/wodx-chronicle/scripts/calendar.mjs`);
  const at = (y, m, d, h) => getEngine().dateToTime({year: y, month: m, day: d, hour: h});
  const BASE = "icons/svg/mill.svg", REPAINT = "icons/svg/fire.svg";
  const tile = name => scene.tiles.find(t => t.getFlag(MOD, "gate") === name);
  const look = async (time, fired) => {
    await game.time.set(time); await sleep(300);
    await game.settings.set("wodx-chronicle", "eventsFired", fired); await sleep(300);
    await api.living.sync({force: true}); await sleep(500);
    return {snow: !tile("snow").hidden, lanterns: !tile("lanterns").hidden, crosses: !tile("crosses").hidden, mill: tile("mill").texture.src};
  };
  try {
    const i = game.modules.get(MOD), c = game.modules.get("wodx-chronicle");
    ok("1. modules", i?.active && newer(i.version, "0.15.0") && !!api?.living?.sync && c?.active && newer(c.version, "0.6.0"), {interactables: i?.version, chronicle: c?.version});
    await chron.hold(true);
    scene = await Scene.create({name: "WoDX gate: living map", width: 1200, height: 800, grid: {size: 100}, padding: 0});
    const mk = (gate, x, src, living) => ({x, y: 100, width: 100, height: 100, texture: {src}, hidden: false, flags: {[MOD]: {gate, living}}});
    await scene.createEmbeddedDocuments("Tile", [
      mk("snow", 100, "icons/svg/frozen.svg", {mode: "show", when: ["winter"]}),
      mk("lanterns", 300, "icons/svg/light.svg", {mode: "show", when: ["revel", "night"]}),
      mk("crosses", 500, "icons/svg/skull.svg", {mode: "show", from: 1347, to: 1352}),
      mk("mill", 700, BASE, {mode: "art", event: "black-death", eventWhen: "after", art: REPAINT})
    ]);
    await sleep(500);
    ok("2. scene", scene.tiles.size === 4);

    const summer = await look(at(1340, 7, 6, 12), []);
    ok("3. summer 1340", !summer.snow && !summer.lanterns && !summer.crosses && summer.mill === BASE, summer);

    const xmas = await look(at(1348, 12, 24, 22), ["black-death"]);
    ok("4. Christmas Eve 1348", xmas.snow && xmas.lanterns && xmas.crosses && xmas.mill === REPAINT, xmas);

    const jan = await look(at(1360, 1, 15, 22), ["black-death"]);
    ok("5. January 1360", jan.snow && !jan.lanterns && !jan.crosses && jan.mill === REPAINT, jan);

    await game.time.set(at(1340, 7, 6, 12)); await sleep(300);
    const quiet = await api.living.sync(); await sleep(300);
    ok("6. held", Array.isArray(quiet) && quiet.length === 0 && !tile("snow").hidden, {changes: quiet?.length});

    const app = new (foundry.applications.sheets?.TileConfig ?? CONFIG.Tile.sheetClasses?.base?.["core.TileConfig"]?.cls)({document: tile("mill")});
    await app.render({force: true}); await sleep(800);
    const sec = app.element?.querySelector?.(".wix-living");
    ok("7. tile config", !!sec && !!sec.querySelector("select[name$='living.mode']") && !!sec.querySelector("input.wodx-search"), {found: !!sec});
    await app.close();
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    if ( scene ) await scene.delete();
    await game.settings.set("wodx-chronicle", "eventsFired", firedBefore);
    await game.time.set(t0); await sleep(300);
    await chron?.hold?.(held);
    if ( viewed && game.scenes.get(viewed) && canvas.scene?.id !== viewed ) await game.scenes.get(viewed).view();
    ok("8. clean up", !game.scenes.getName("WoDX gate: living map") && game.time.worldTime === t0 && !!chron?.isHeld?.() === held);
  }
  return save(R, "gateliving-result.json");
}
