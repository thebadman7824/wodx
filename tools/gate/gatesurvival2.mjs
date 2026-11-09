/**
 * Bodies that change (Storyteller 0.16.0) and filling a container by place and era (Interactables 0.17.0), in
 * Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatesurvival2.mjs?${Date.now()}`)).run()
 * It makes scratch actors and a scratch scene and deletes them; it does not move the clock.
 *   1. the modules, versions and APIs
 *   2. a lasting change lowers Appearance, posts a card; Undo puts it back and clears the record
 *   3. a Nosferatu's Appearance stays at 0; the change is still recorded; only changes that show come back by part
 *   4. a fill draw from Gear by era for the Dark Ages: links that open, nothing too big for a safe
 *   5. kept links land on a container tile
 *   6. clean up
 * Result: Data/wodx-gate/gatesurvival2-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STEPS = 6;

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${STEPS} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatesurvival2-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const atLeast = (id, v) => { const m = game.modules.get(id); return !!m?.active && !foundry.utils.isNewerVersion(v, m.version); };

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const msgStart = Date.now();
  const ST = game.modules.get("wodx-storyteller")?.api, IA = game.modules.get("wodx-interactables")?.api;
  let a = null, nos = null, scene = null;
  try {
    ok("1. modules", atLeast("wodx-storyteller", "0.16.0") && atLeast("wodx-interactables", "0.17.0") && !!ST?.body?.add && !!IA?.fill?.draw,
      {versions: ["wodx-storyteller", "wodx-interactables", "wodx-library"].map(id => `${id} ${game.modules.get(id)?.version}`)});

    // 2. A lasting change and its Undo
    a = await Actor.create({name: "WoDX gate: the reshaped", type: "Mortal"});
    await a.update({"system.attributes.appearance.value": 3});
    const c = await ST.body.add(a, {source: "vicissitude", part: "face", what: "WoDX gate: cheekbones pulled flat", appearance: -1});
    await sleep(300);
    const lowered = game.actors.get(a.id).system.attributes.appearance.value;
    const card = game.messages.contents.find(m => m.timestamp >= msgStart && m.flags?.["wodx-storyteller"]?.body?.actor === a.id);
    const removed = await ST.body.remove(game.actors.get(a.id), c?.id);
    await sleep(300);
    const back = game.actors.get(a.id).system.attributes.appearance.value;
    ok("2. a lasting change", c?.appearance === -1 && lowered === 2 && !!card && !!removed && back === 3 && ST.body.of(game.actors.get(a.id)).length === 0, {lowered, back, card: !!card});

    // 3. Held at 0, and what shows
    nos = await Actor.create({name: "WoDX gate: the hidden one", type: "Vampire"});
    await nos.update({"system.attributes.appearance.value": 0, "system.clan": "Nosferatu"});
    const n1 = await ST.body.add(nos, {source: "vicissitude", part: "mouth", what: "WoDX gate: lips drawn fine", appearance: 2});
    await ST.body.add(nos, {source: "scar", part: "torso", what: "WoDX gate: a brand under the shirt", shows: false});
    const shown = ST.body.shown(game.actors.get(nos.id));
    ok("3. held at 0; what shows", n1?.appearance === 0 && game.actors.get(nos.id).system.attributes.appearance.value === 0 && ST.body.of(game.actors.get(nos.id)).length === 2
      && Object.keys(shown).join() === "mouth", {stored: n1?.appearance, shown: Object.keys(shown), clan: game.actors.get(nos.id).system.clan});

    // 4. A fill draw
    const idx = await IA.fill.index();
    const got = await IA.fill.draw({era: "dark-ages", place: "armory", container: "safe", count: 5, items: idx});
    const docs = await Promise.all(got.map(g => fromUuid(g.uuid)));
    ok("4. fill draw", idx.length > 100 && got.length > 0 && docs.every(d => d?.documentName === "Item") && got.every(g => IA.fill.rules.fits(g, "safe")),
      {index: idx.length, drawn: got.map(g => g.name)});

    // 5. Kept links on a container tile
    scene = await Scene.create({name: "WoDX gate: the strongroom", width: 1000, height: 1000, grid: {size: 100}});
    const [tile] = await scene.createEmbeddedDocuments("Tile", [{x: 100, y: 100, width: 100, height: 100, texture: {src: "icons/svg/chest.svg"}, flags: {"wodx-interactables": {container: true, kind: "chest", items: "Item.old"}}}]);
    const lines = IA.fill.rules.mergeLines(tile.flags["wodx-interactables"].items, got.map(g => g.uuid));
    await tile.update({"flags.wodx-interactables.items": lines});
    const saved = String(scene.tiles.get(tile.id).flags["wodx-interactables"].items).split("\n");
    ok("5. links on a container", saved[0] === "Item.old" && saved.length === 1 + got.length, {saved});
  } catch (e) { R.errors.push(String(e?.stack ?? e)); }
  try {
    const mine = game.messages.contents.filter(m => m.timestamp >= msgStart && m.flags?.["wodx-storyteller"]?.body).map(m => m.id);
    if ( mine.length ) await ChatMessage.deleteDocuments(mine);
    if ( scene ) await scene.delete();
    for ( const x of [a, nos] ) if ( x ) await x.delete();
    ok("6. clean up", !game.actors.getName("WoDX gate: the reshaped") && !game.scenes.getName("WoDX gate: the strongroom"), {});
  } catch (e) { R.errors.push(String(e?.stack ?? e)); ok("6. clean up", false); }
  return save(R);
}
