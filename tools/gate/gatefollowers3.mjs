/**
 * The Followers window and descriptions that spread (WoDX NPC 0.41.0, Library 0.16.0, Sheets 0.12.0), in Foundry, in
 * rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatefollowers3.mjs?${Date.now()}`)).run()
 * It makes a scratch scene and actors and deletes them; it does not move the clock. The scene in view is put back,
 * and the world's list of descriptions is put back as it was.
 *   1. the modules, versions and APIs
 *   2. the Followers window: a ghoul, a herd member and a follower of one master, each with its kind; the window draws
 *      a row for each
 *   3. a quick order from the window: Wait here sets the order
 *   4. the sheet: the Relationships tab has a Followers button
 *   5. a description is written from the look, on a Storyteller-only card, heard here and not yet elsewhere
 *   6. NPCs who have heard it and see the culprit test it: a card with the roll (three sharp-eyed watchers, so the
 *      noticing roll is all but sure)
 *   7. the whole town hears it at once from the list; dropping it ends it
 *   8. clean up
 * Result: Data/wodx-gate/gatefollowers3-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STEPS = 8;

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${STEPS} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatefollowers3-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const atLeast = (id, v) => { const m = game.modules.get(id); return !!m?.active && !foundry.utils.isNewerVersion(v, m.version); };

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const msgStart = Date.now(), viewed = canvas.scene, t0 = game.time.worldTime;
  // Library sets api.look late in its ready hook: wait for it (up to 10 s) before step 1
  for ( let i = 0; i < 50 && !game.modules.get("wodx-library")?.api?.look; i++ ) await sleep(200);
  const NPC = game.modules.get("wodx-npc")?.api, LK = game.modules.get("wodx-library")?.api?.look;
  const before = {orders: game.settings.get("wodx-npc", "followerOrders"), on: game.settings.get("wodx-npc", "culpritDescriptions"), list: foundry.utils.deepClone(game.settings.get("wodx-npc", "descriptions"))};
  let scene = null, other = null;
  const actors = [];
  const cards = () => game.messages.contents.filter(m => m.timestamp >= msgStart);
  try {
    ok("1. modules", atLeast("wodx-npc", "0.41.1") && atLeast("wodx-library", "0.16.0") && atLeast("wodx-sheets", "0.12.0")
      && !!NPC?.openFollowers && !!NPC?.followers?.rowsFor && !!NPC?.wanted?.write && !!NPC?.openWanted && !!LK?.describe,
      {versions: ["wodx-npc", "wodx-library", "wodx-sheets", "wodx-chronicle", "wodx-actions", "wodx-storyteller"].map(id => `${id} ${game.modules.get(id)?.version}`)});
    await game.settings.set("wodx-npc", "followerOrders", true);
    await game.settings.set("wodx-npc", "culpritDescriptions", true);

    const pc = await Actor.create({name: "WoDX gate: the master", type: "Mortal", ownership: {default: 3}}); actors.push(pc);
    const ghoul = await Actor.create({name: "WoDX gate: the ghoul", type: "Mortal", ownership: {default: 0},
      flags: {"wodx-creation": {lineage: {domitor: {id: pc.id, name: pc.name}, bonds: {[pc.id]: {drinks: 3}}}}}}); actors.push(ghoul);
    const herd = await Actor.create({name: "WoDX gate: the herd", type: "Mortal", ownership: {default: 0}, flags: {"wodx-chronicle": {bound: {actor: pc.id, bg: "herd", role: "herd"}}}}); actors.push(herd);
    const fol = await Actor.create({name: "WoDX gate: the servant", type: "Mortal", ownership: {default: 0}, flags: {"wodx-npc": {serves: [pc.id]}}}); actors.push(fol);
    const sharp = {attributes: {perception: {value: 5}}, abilities: {alertness: {value: 5}, awareness: {value: 3}}};
    const watchers = [];
    for ( let i = 1; i <= 3; i++ ) { const w = await Actor.create({name: `WoDX gate: watcher ${i}`, type: "Mortal", ownership: {default: 0}, system: sharp}); actors.push(w); watchers.push(w); }
    scene = await Scene.create({name: "WoDX gate: the market", width: 2000, height: 1400, grid: {size: 100}, tokenVision: false});
    other = await Scene.create({name: "WoDX gate: the far gate", width: 1000, height: 1000, grid: {size: 100}, tokenVision: false});
    await scene.view();
    await sleep(800);
    const made = await scene.createEmbeddedDocuments("Token", [
      {name: pc.name, actorId: pc.id, x: 200, y: 200, actorLink: true}, {name: ghoul.name, actorId: ghoul.id, x: 300, y: 200, actorLink: true},
      {name: fol.name, actorId: fol.id, x: 400, y: 200, actorLink: true},
      ...watchers.map((w, i) => ({name: w.name, actorId: w.id, x: 900 + i * 100, y: 600, actorLink: true}))]);
    const tk = a => made.find(k => k.actorId === a.id);
    await sleep(500);

    // 2. The Followers window
    const rows = NPC.followers.rowsFor(game.actors.get(pc.id));
    const kinds = Object.fromEntries(rows.map(r => [r.name, r.kind]));
    const dlg = await NPC.openFollowers(game.actors.get(pc.id));
    await sleep(500);
    const drawn = dlg?.element?.querySelectorAll?.(".wnpc-follower")?.length ?? 0;
    ok("2. followers window", rows.length === 3 && kinds[ghoul.name] === "ghoul" && kinds[herd.name] === "herd" && kinds[fol.name] === "follower" && drawn === 3
      && rows.find(r => r.id === ghoul.id)?.bond?.drinks === 3 && rows[0].sameScene, {kinds, drawn, where: rows.map(r => r.where)});

    // 3. A quick order
    const btn = dlg?.element?.querySelector?.(`.wnpc-follower[data-id="${fol.id}"] [data-order="wait"]`);
    btn?.click();
    await sleep(1500);
    const order = game.actors.get(fol.id).flags?.["wodx-npc"]?.order;
    ok("3. quick order", !!btn && order?.kind === "wait" && order?.leader === pc.id, {order});
    await NPC.orders.clear(game.actors.get(fol.id));
    await dlg?.close?.();

    // 4. The sheet's Followers button
    const sheet = game.actors.get(pc.id).sheet;
    await sheet.render(true);
    await sleep(1500);
    const el = sheet.element?.[0] ?? sheet.element;
    const hasBtn = !!el?.querySelector?.("[data-act=tie-followers]");
    await sheet.close();
    ok("4. sheet button", hasBtn, {});

    // 5. A description is written
    const desc = await NPC.wanted.write(game.actors.get(pc.id), watchers.map(w => game.actors.get(w.id)), {scene, cause: "theft", what: "a purse"});
    await sleep(500);
    const card = cards().find(m => m.flags?.["wodx-npc"]?.wanted?.id === desc?.id);
    const W = NPC.wanted.rules;
    ok("5. description written", !!desc?.text && !!card && card.whisper.length > 0 && card.whisper.every(id => game.users.get(id)?.isGM)
      && W.heardAt(desc, scene.uuid, game.time.worldTime) !== null && W.heardAt(desc, other.uuid, game.time.worldTime) === null
      && NPC.wanted.ofActor(pc.id).length >= 1, {text: desc?.text, means: desc?.means, year: game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.()});

    // 6. Watchers who heard it test it
    let res = [];
    for ( let i = 0; i < 3 && !res.some(r => r.level); i++ ) { res = await NPC.wanted.test(tk(pc), {force: true}); await sleep(300); }
    await sleep(500);
    const testCard = cards().find(m => m.flags?.["wodx-npc"]?.wantedTest?.culprit === pc.id);
    ok("6. tested on sight", res.some(r => r.level) && !!testCard && /Perception \+ Alertness, difficulty/.test(testCard.content) && testCard.whisper.every(id => game.users.get(id)?.isGM),
      {res, notes: "uses the noticing roll: three watchers with Perception 5, Alertness 5"});

    // 7. The whole town hears now; drop it
    await NPC.wanted.spreadNow(desc.id);
    const spread = NPC.wanted.list().find(d => d.id === desc.id);
    const far = W.heardAt(spread, other.uuid, game.time.worldTime) !== null;
    await NPC.wanted.drop(desc.id);
    ok("7. spread and drop", far && !NPC.wanted.list().some(d => d.id === desc.id), {});
  } catch (e) { R.errors.push(String(e?.stack ?? e)); }
  try {
    await game.settings.set("wodx-npc", "followerOrders", before.orders);
    await game.settings.set("wodx-npc", "culpritDescriptions", before.on);
    await game.settings.set("wodx-npc", "descriptions", before.list ?? []);
    const mine = cards().filter(m => /WoDX gate/.test(m.content) || m.flags?.["wodx-npc"]?.order || m.flags?.["wodx-npc"]?.wanted || m.flags?.["wodx-npc"]?.wantedTest).map(m => m.id);
    if ( mine.length ) await ChatMessage.deleteDocuments(mine);
    if ( viewed && viewed.id !== scene?.id ) await viewed.view();
    if ( scene ) await scene.delete();
    if ( other ) await other.delete();
    for ( const a of actors ) await a.delete();
    if ( game.time.worldTime !== t0 ) await game.time.advance(t0 - game.time.worldTime);
    ok("8. clean up", !game.scenes.getName("WoDX gate: the market") && !game.actors.getName("WoDX gate: the ghoul"), {});
  } catch (e) { R.errors.push(String(e?.stack ?? e)); ok("8. clean up", false); }
  return save(R);
}
