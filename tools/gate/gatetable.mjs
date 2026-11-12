/**
 * Rolls and fights at the table gate (Actions 3.43.0, Targeting 0.2.0, Combat 3.14.0, Interactables 0.27.0, Senses 0.7.0),
 * in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatetable.mjs?${Date.now()}`)).run()
 * Makes its own scene "WoDX gate: Table" (gridless, 100 px), two actors, two tokens and three tiles; views it, then goes
 * back to the scene it started on and deletes everything it made, chat cards included. The clock is not moved.
 *   1. versions and settings
 *   2. the Action window shows the odds and the modifiers
 *   3. a pinned action shows in the menu, kept on the character
 *   4. an area power's panel lists who stands inside a burst, and draws it
 *   5. a fight started and ended gives the Storyteller an after-action card
 *   6. a lit lamp knocked over makes a fire tile; Undo removes it
 *   7. a chandelier brought down on a token: a damage card
 *   8. the sun let in makes a WoDX: Sunlight region; sprinklers put out the fire
 *   9. the colour-blind settings, and every other WoDX module still answers
 * Result: Data/wodx-gate/gatetable-result.json.
 */
const createActors = async data => { const made = await Actor.create(data); return data.map(d => made.find(a => a.name === d.name) ?? null); };
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
const openDialog = cls => [...document.querySelectorAll(".application, .app, dialog")].find(e => e.querySelector(cls));
const closeAll = () => { for ( const app of [...(foundry.applications.instances?.values?.() ?? [])] ) if ( /Dialog/.test(app.constructor.name) ) app.close?.(); };

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } finally { closeAll(); await sleep(200); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const back = canvas.scene, startMsgs = new Set(game.messages.map(m => m.id)), time0 = game.time.worldTime;
  const IX = () => game.modules.get("wodx-interactables")?.api;
  let scene, actors = [], a, b, combat = null;
  try {
    scene = await Scene.create({name: "WoDX gate: Table", width: 2000, height: 1500, padding: 0, grid: {type: 0, size: G, distance: 5, units: "ft"}, tokenVision: false});
    await scene.view();
    await until(() => canvas.ready && canvas.scene?.id === scene.id, 10000);
    actors = await createActors([{name: "WoDX gate: Table one", type: "Mortal"}, {name: "WoDX gate: Table two", type: "Mortal"}]);
    await scene.createEmbeddedDocuments("Token", [{name: "one", actorId: actors[0].id, actorLink: true, x: G * 2, y: G * 2, disposition: 1},
      {name: "two", actorId: actors[1].id, actorLink: true, x: G * 3, y: G * 2, disposition: -1}]);
    a = scene.tokens.find(t => t.actorId === actors[0].id); b = scene.tokens.find(t => t.actorId === actors[1].id);
    await until(() => a.object && b.object);
    a.object.control({releaseOthers: true});

    await step("versions and settings", async () => {
      const v = id => game.modules.get(id)?.version;
      const atLeast = (x, min) => { const a = String(x ?? "0").split(".").map(Number), b = min.split(".").map(Number); for ( let k = 0; k < 3; k++ ) { if ( (a[k] || 0) !== (b[k] || 0) ) return (a[k] || 0) > (b[k] || 0); } return true; };
      const set = (m, k) => { try { game.settings.get(m, k); return true; } catch (e) { return false; } };
      ok("versions and settings", atLeast(v("wodx-actions"), "3.43.0") && atLeast(v("wodx-targeting"), "0.2.0") && atLeast(v("wodx-combat"), "3.14.0") && atLeast(v("wodx-interactables"), "0.27.0") && atLeast(v("wodx-senses"), "0.7.0")
        && set("wodx-actions", "showOdds") && set("wodx-combat", "afterAction") && set("wodx-senses", "colourSafe"),
        {versions: ["wodx-actions", "wodx-targeting", "wodx-combat", "wodx-interactables", "wodx-senses", "wodx-otherworlds"].map(v)});
    });
    await step("odds in the Action window", async () => {
      game.wodxActions.action({actor: actors[0]});
      await until(() => openDialog(".vta-odds"), 5000);
      const el = openDialog(".vta-odds")?.querySelector(".vta-odds");
      const before = el?.textContent ?? "";
      const diff = el?.closest("form")?.querySelector("[name=diff]");
      if ( diff ) { diff.value = 9; diff.dispatchEvent(new Event("input", {bubbles: true})); }
      await sleep(100);
      const after = el?.textContent ?? "";
      ok("odds in the Action window", /at least one success \d+%/.test(before) && /botch/.test(before) && /at 9/.test(after), {before, after});
    });
    await step("pinned action", async () => {
      await actors[0].setFlag("wodx-actions", "quick", {recent: [], pinned: ["api:hazard"]});
      game.wodxActions.menu({actor: actors[0]});
      await until(() => openDialog(".vta-pinned"), 5000);
      const pin = openDialog(".vta-pinned")?.querySelector('.vta-pinned button[data-k="api:hazard"]');
      ok("pinned action", !!pin, {flag: actors[0].getFlag("wodx-actions", "quick")});
    });
    await step("area burst", async () => {
      const TG = game.modules.get("wodx-targeting")?.api;
      const div = document.createElement("div");
      div.innerHTML = "<form></form>";
      document.body.append(div);
      const h = TG.attach(div, {actor: actors[0], tag: () => "a.v:b3"});
      await sleep(100);
      const txt = div.textContent;
      const listed = [...div.querySelectorAll("ul.wodx-aim-area li")].map(li => li.textContent.trim());
      ok("area burst", !!h && /inside/.test(txt) && listed.some(l => /two/.test(l)) && h.shape()?.size === 3, {txt: txt.slice(0, 200), listed});
      div.remove();
    });
    await step("after-action card", async () => {
      combat = await Combat.create({scene: scene.id, active: true});
      await combat.createEmbeddedDocuments("Combatant", [{tokenId: a.id, sceneId: scene.id, actorId: actors[0].id}, {tokenId: b.id, sceneId: scene.id, actorId: actors[1].id}]);
      await combat.startCombat();
      await until(() => combat.getFlag("wodx-combat", "aar")?.start?.length, 5000);
      await game.wodxCombat.applyDamage(actors[1], "lethal", 2, {status: false});
      await combat.delete(); combat = null;
      await until(() => game.messages.some(m => !startMsgs.has(m.id) && m.getFlag("wodx-combat", "aar")), 6000);
      const card = game.messages.find(m => !startMsgs.has(m.id) && m.getFlag("wodx-combat", "aar"));
      ok("after-action card", !!card && /took 2 levels/.test(card.content) && card.whisper?.length > 0, {content: card?.content?.slice(0, 400)});
    });
    let lamp = null;
    await step("lamp knocked over", async () => {
      const [l] = await scene.createEmbeddedDocuments("AmbientLight", [{x: G * 2.5, y: G * 3.5, config: {bright: 10, dim: 20}}]);
      [lamp] = await scene.createEmbeddedDocuments("Tile", [{x: G * 2, y: G * 3, width: G, height: G, texture: {src: null}, flags: {"wodx-interactables": {light: true, lightKind: "lamp", lightIds: l.id}}}]);
      await sleep(300);
      const n0 = scene.tiles.size;
      const msg = await IX().attempt(a.object, lamp.id, "spillLight");
      await until(() => game.messages.get(msg?.id)?.getFlag("wodx-interactables", "done"), 6000);
      const fire = scene.tiles.find(t => t.flags?.["wodx-interactables"]?.roomMade);
      const lit = !scene.lights.get(l.id)?.hidden;
      await IX().undoCard(game.messages.get(msg.id));
      await sleep(400);
      ok("lamp knocked over", !!fire && fire.flags["wodx-interactables"].size === "large" && !lit && scene.tiles.size === n0 && !scene.lights.get(l.id)?.hidden, {fire: !!fire, lit});
    });
    await step("chandelier", async () => {
      const [ch] = await scene.createEmbeddedDocuments("Tile", [{x: G * 3, y: G * 2, width: G, height: G, texture: {src: null}, flags: {"wodx-interactables": {light: true, lightKind: "chandelier", lightIds: "none0000"}}}]);
      const before = new Set(game.messages.map(m => m.id));
      const op = IX().rules.optionsFor(IX().describeTile(ch), {}).find(o => o.id === "dropChandelier");
      const msg = op ? await IX().attempt(a.object, ch.id, "dropChandelier") : null;
      await until(() => game.messages.get(msg?.id)?.getFlag("wodx-interactables", "done"), 8000);
      const done = game.messages.get(msg?.id)?.getFlag("wodx-interactables", "done");
      const dmg = game.messages.filter(m => !before.has(m.id) && m.getFlag("wodx-combat", "data")?.target === actors[1].uuid);
      ok("chandelier", !!op && /dodges/.test((done?.lines ?? []).join(" ")) && (dmg.length > 0 || /0 of/.test((done?.lines ?? []).join(" "))), {lines: done?.lines, cards: dmg.length});
    });
    await step("sun and sprinklers", async () => {
      const [w] = await scene.createEmbeddedDocuments("Wall", [{c: [G * 5, G * 1, G * 5, G * 3], door: 1, ds: 0, flags: {"wodx-interactables": {kind: "window"}}}]);
      const snap = {spawned: {tiles: [], regions: []}, others: []};
      const r1 = await IX()._roomEffects({out: {sun: {light: "direct", exposure: 3}}, doc: w, scene, tokDoc: a, actor: actors[0], o: IX().describeWall(w), snap});
      const rg = scene.regions.get(snap.spawned.regions[0]);
      const sunlit = rg?.behaviors?.some(x => x.type === "wodx-actions.sunlight" && x.system?.light === "direct");
      const [f] = await scene.createEmbeddedDocuments("Tile", [{x: G * 8, y: G * 8, width: G, height: G, texture: {src: null}, flags: {"wodx-interactables": {hazard: true, hazardKind: "fire", size: "small", burning: true}}}]);
      const r2 = await IX()._roomEffects({out: {douse: true}, doc: f, scene, tokDoc: a, actor: actors[0], o: IX().describeTile(f), snap});
      ok("sun and sprinklers", !!sunlit && scene.tiles.get(f.id)?.flags?.["wodx-interactables"]?.burning === false, {lines: [...r1.lines, ...r2.lines], shape: rg?.shapes?.[0]?.type});
    });
    await step("colours and other modules", async () => {
      const was = game.settings.get("wodx-senses", "colourSafe");
      await game.settings.set("wodx-senses", "colourSafe", true);
      const on = game.modules.get("wodx-senses")?.api?.sight?.colourSafe?.();
      await game.settings.set("wodx-senses", "colourSafe", was);
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-otherworlds", "wodx-senses", "wodx-targeting", "wodx-storyteller", "wodx-library", "wodx-sheets"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("colours and other modules", on === true && !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      closeAll();
      if ( combat ) await combat.delete();
      if ( back && back.id !== scene?.id ) await back.view();
      if ( scene ) await scene.delete();
      for ( const x of actors ) await game.actors.get(x.id)?.delete();
      const made = game.messages.filter(m => !startMsgs.has(m.id)).map(m => m.id);
      if ( made.length ) await ChatMessage.deleteDocuments(made);
      if ( game.time.worldTime !== time0 ) R.notes.push("the clock moved during the gate");
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatetable-result.json");
}
