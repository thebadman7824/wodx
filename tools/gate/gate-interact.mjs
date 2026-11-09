/**
 * Interactables gate (WoDX Interactables 0.13.1), in Foundry, in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gate-interact.mjs?${Date.now()}`)).run()
 * Back the world up first. The gate makes its own scene ("Gate Interact"), two characters of its own ("Gate Interact
 * burglar", a player's character, and "Gate Interact watchman", an NPC) and deletes them all at the end. It fixes the
 * dice while it runs (CONFIG.Dice.randomUniform) and puts them back, and puts the clock and the approval queue back.
 *   1. the module, its API and the door-click class
 *   2. the Interact list: within reach, nearest first; a far door and a door on another level left out
 *   3. picking a good lock: unlocked, Undo locks it again
 *   4. a masterwork lock: progress kept on the door, the clock moves five minutes a roll; Undo moves it back
 *   5. a botched force: one lethal, loud, the watchman hears it; Undo heals
 *   6. the window: the pane breaks at once; Undo mends it
 *   7. a wall knocked through waits in the approval queue
 *   8. listening: a whispered card to the player and the Storyteller
 *   9. the wall config window shows the WoDX part, with the bar sides by compass
 *  10. every other WoDX module still loads and answers (Chronicle, Actions, Combat, NPC)
 *  11. a chest on a tile: picked, opened, emptied (a world item of the gate's own goes to the burglar); Undo takes it back
 *  12. the tile config window shows the WoDX container part
 *  13-18. traps (search, spring, disarm), a clue, a lantern, hiding in a wardrobe
 *  19. walking into a fire burns the burglar through WoDX Combat at the fire's heat; putting it out; Undo for both
 *  20. an altar: listed, desecrated (loud) and Undo; a relic on a tile taken (the gate's world item) and Undo
 *  21. a window tied to the watchman's corner: looking out whispers the watchman's name; a wodxMapEvent goes out; Undo
 *  22. a cart: the burglar (no Ride: Dexterity alone) takes the reins; moving the token carries the cart; getting off
 *      leaves it behind; Undo
 *  23. pictures and events: a chest forced swaps to its "forced" picture, one wodxMapEvent goes out; an emptied box with
 *      no picture gets a marker; Undo puts the picture back and sends the event again marked undone
 *  24. a rough wall tied to a ledge tile: climbing it (fixed dice) moves the burglar onto the ledge; Undo brings it back;
 *      a gap: a jump that falls short hangs, losing the grip falls through WoDX Combat; Undo
 * Result: Data/wodx-gate/gate-interact-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOD = "wodx-interactables";
const ix = () => game.modules.get(MOD).api;
const G = 100;

async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
function harness() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 4).join(" | ")}); } };
  return {R, ok, step};
}
/** Wait until a test holds, up to ms (Foundry 14 can take a moment to settle a token move). */
async function until(fn, ms = 5000) {
  const t = Date.now();
  while ( Date.now() - t < ms ) { if ( fn() ) return true; await sleep(100); }
  return !!fn();
}
/** Wait for the Storyteller's side to apply a card. */
async function applied(msg, ms = 8000) {
  const t = Date.now();
  while ( Date.now() - t < ms ) {
    const m = game.messages.get(msg?.id);
    if ( m?.flags?.[MOD]?.done || m?.flags?.[MOD]?.ask?.state ) return m;
    await sleep(100);
  }
  return game.messages.get(msg?.id);
}
/** Fix every d10 to one face. Foundry's mapping from randomUniform to a face has changed between versions, so the
 * gate tries both readings and keeps the one that gives the wanted face. */
const dice = async face => {
  for ( const u of [(face - 0.5) / 10, 1 - (face - 0.5) / 10] ) {
    CONFIG.Dice.randomUniform = () => u;
    if ( (await new Roll("1d10").evaluate()).dice[0].results[0].result === face ) return;
  }
  throw new Error(`could not fix the dice to ${face}`);
};
// The system keeps a stored total beside each attribute's value, and WoDX reads the total
const attrs = (actor, o) => actor.update(Object.fromEntries(Object.entries(o).flatMap(([k, v]) => [[`system.attributes.${k}.value`, v], [`system.attributes.${k}.total`, v]])));

export async function run() {
  if ( game.world.id !== "rothenstein-wodx" ) return "Run this gate in rothenstein-wodx only.";
  const {R, ok, step} = harness();
  const keep = {uniform: CONFIG.Dice.randomUniform, t0: game.time.worldTime, scene: canvas.scene?.id,
    approvals: foundry.utils.deepClone(game.settings.get("wodx-chronicle", "approvals")), messages: new Set(game.messages.map(m => m.id))};
  let scene = null, burglar = null, watchman = null, ledger = null;
  // Errors in the console while the gate runs (the Storyteller side of a card runs in a hook)
  const consoleError = console.error;
  console.error = (...a) => { R.notes.push(`console: ${a.map(x => x?.stack ?? x?.message ?? String(x)).join(" ").slice(0, 400)}`); consoleError(...a); };
  try {
    await step("1. module", async () => {
      const m = game.modules.get(MOD);
      ok("1. WoDX Interactables 0.13.1 is on, with its API, and the door control is the WoDX one", m?.active && m.version === "0.13.1" && typeof ix()?.attempt === "function"
        && !!CONFIG.Canvas.doorControlClass?.wodxInteract, {version: m?.version, doorClass: CONFIG.Canvas.doorControlClass?.name});
    });

    // The scene: a small room around the burglar (each wall one square from the token's centre, within the default reach):
    // a locked door south, a window east, a barred heavy door west, a wattle wall north, and a far door
    scene = await Scene.create({name: "Gate Interact", width: 2000, height: 2000, grid: {size: G, type: 1, distance: 5, units: "ft"}, tokenVision: false, padding: 0});
    await scene.view();
    await sleep(800);
    const W = CONST.WALL_DOOR_STATES;
    // Foundry does not promise the created walls come back in the order given, so each carries a gate tag and is found by it
    await scene.createEmbeddedDocuments("Wall", [
      {c: [520, 800, 680, 800], door: 1, ds: W.LOCKED, flags: {[MOD]: {lock: "good", gate: "door"}}},
      {c: [700, 620, 700, 780], door: 1, ds: W.CLOSED, flags: {[MOD]: {kind: "window", gate: "win"}}},
      {c: [500, 620, 500, 780], door: 1, ds: W.CLOSED, flags: {[MOD]: {material: "heavy", barSide: "b", barred: true, gate: "barred"}}},
      {c: [520, 600, 680, 600], door: 0, flags: {[MOD]: {wall: "wattle", gate: "wattle"}}},
      {c: [1500, 1500, 1700, 1500], door: 1, ds: W.LOCKED, flags: {[MOD]: {gate: "far"}}}
    ]);
    const tagged = tag => scene.walls.find(w => w.flags?.[MOD]?.gate === tag);
    const [door, win, barred, wattle, far] = ["door", "win", "barred", "wattle", "far"].map(tagged);
    if ( [door, win, barred, wattle, far].some(w => !w) ) throw new Error("the gate's walls were not all created");
    const mk = (name, owner) => Actor.create({name, type: "Mortal", ownership: owner ? {default: 0, [game.user.id]: 3} : {default: 0},
      system: {attributes: {strength: {value: 2, total: 2}, dexterity: {value: 3, total: 3}, perception: {value: 3, total: 3}, intelligence: {value: 2, total: 2}},
        abilities: {larceny: {value: 2, isvisible: true}, alertness: {value: 2, isvisible: true}, stealth: {value: 1, isvisible: true}}}});
    burglar = await mk("Gate Interact burglar", true);
    watchman = await mk("Gate Interact watchman", false);
    await burglar.createEmbeddedDocuments("Item", [{name: "Lock picks", type: "Feature", system: {}}]).catch(() => null);
    await scene.createEmbeddedDocuments("Token", [
      {...(await burglar.getTokenDocument({x: 550, y: 650})).toObject(), actorLink: true},
      {...(await watchman.getTokenDocument({x: 550, y: 1100})).toObject(), actorLink: true, hidden: false}
    ]);
    // Found by actor, not by the order Foundry hands the new tokens back in
    const tb = scene.tokens.find(t => t.actorId === burglar.id), tw = scene.tokens.find(t => t.actorId === watchman.id);
    if ( !tb || !tw ) throw new Error("the gate's tokens were not both created");
    await sleep(800);
    const tok = canvas.tokens.get(tb.id);

    await step("2. list", async () => {
      const list = ix().interactablesFor(tok).map(x => x.doc.id);
      const names = {[door.id]: "door", [win.id]: "window", [barred.id]: "barred door", [wattle.id]: "wattle wall", [far.id]: "far door"};
      ok("2. the door, the window, the barred door and the wall are in reach, the far door is not", [door.id, win.id, barred.id, wattle.id].every(id => list.includes(id)) && !list.includes(far.id),
        {list: list.map(id => names[id] ?? id), center: tok.center, distances: ix().interactablesFor(tok).map(x => [names[x.doc.id] ?? x.doc.id, Math.round(x.distance ?? -1)])});
    });

    await step("3. pick", async () => {
      await dice(9);
      const msg = await applied(await ix().attempt(tok, door.id, "pick", {fd: {}}));
      const opened = door.ds === W.CLOSED;
      await ix().undoCard(msg);
      ok("3. a good lock picked (unlocked, still closed), Undo locks it again", opened && door.ds === W.LOCKED && /Undone/.test(game.messages.get(msg.id).content), {done: msg.flags[MOD]?.done?.result});
    });

    await step("4. masterwork", async () => {
      await door.update({[`flags.${MOD}.lock`]: "masterwork"});
      await dice(10);
      const t = game.time.worldTime;
      // Three dice, all 10s: one roll is not enough for 8 successes
      await attrs(burglar, {dexterity: 1});
      const msg = await applied(await ix().attempt(tok, door.id, "pick", {fd: {}}));
      const progress = door.flags[MOD]?.progress?.pick, moved = game.time.worldTime - t;
      await ix().undoCard(msg);
      ok("4. progress kept on the door, five minutes on the clock; Undo puts both back", progress === 3 && moved === 300 && game.time.worldTime === t && !door.flags[MOD]?.progress?.pick, {progress, moved});
      await door.update({[`flags.${MOD}.lock`]: "good"});
      await attrs(burglar, {dexterity: 3});
    });

    await step("5. force", async () => {
      await dice(1);
      const before = burglar.system.health?.damage?.lethal ?? 0;
      const msg = await applied(await ix().attempt(tok, door.id, "force", {fd: {}}));
      const d = msg.flags[MOD]?.done;
      const hurt = (burglar.system.health?.damage?.lethal ?? 0) - before;
      await ix().undoCard(msg);
      await sleep(300);
      ok("5. a botched force: one lethal, loud, the watchman hears; Undo heals", d?.result === "botch" && hurt === 1 && d.lines.some(l => /watchman/.test(l))
        && (burglar.system.health?.damage?.lethal ?? 0) === before, {lines: d?.lines, hurt});
    });

    await step("6. window", async () => {
      const ops = ix().rules.optionsFor(ix().describeWall(win), ix().characterFor(burglar, tok.center, win)).map(o => o.id + (o.disabled ? " (off)" : ""));
      const sent = await ix().attempt(tok, win.id, "smash", {fd: {}});
      const msg = await applied(sent);
      const after = {ds: win.ds, broken: win.flags[MOD]?.broken ?? null, result: msg?.flags?.[MOD]?.done?.result ?? null, lines: msg?.flags?.[MOD]?.done?.lines ?? null};
      const broke = after.ds === W.OPEN && after.broken === true;
      await ix().undoCard(msg);
      ok("6. the pane breaks at once; Undo mends it", broke && win.ds === W.CLOSED && !win.flags[MOD]?.broken,
        {sent: !!sent, ask: msg?.flags?.[MOD]?.ask ?? null, ops, after, undone: {ds: win.ds, broken: win.flags[MOD]?.broken ?? null}, options: ix().interactablesFor(tok).find(x => x.doc.id === win.id) ? "in reach" : "not in reach"});
    });

    await step("7. wall", async () => {
      await attrs(burglar, {strength: 5});
      const msg = await applied(await ix().attempt(tok, wattle.id, "breach", {fd: {}}));
      const q = game.settings.get("wodx-chronicle", "approvals").pending.find(p => p.type === `${MOD}.breach`);
      ok("7. breaking through waits in the queue; the wall stands", !!q && msg?.flags?.[MOD]?.done?.waiting && wattle.move !== CONST.WALL_MOVEMENT_TYPES.NONE,
        {queued: q?.title ?? null, sent: !!msg, ask: msg?.flags?.[MOD]?.ask ?? null, done: msg?.flags?.[MOD]?.done ?? null, move: wattle.move,
         ops: ix().rules.optionsFor(ix().describeWall(wattle), ix().characterFor(burglar, tok.center, wattle)).map(o => o.id + (o.auto ? " (auto)" : ""))});
      await attrs(burglar, {strength: 2});
    });

    await step("8. listen", async () => {
      await dice(9);
      const n = game.messages.size;
      await applied(await ix().attempt(tok, door.id, "listen", {fd: {}}));
      await sleep(500);
      const whisper = game.messages.contents.slice(n).find(m => /listens/.test(m.content) && m.whisper?.length);
      ok("8. listening sends a whispered card", !!whisper, {text: whisper?.content?.replace(/<[^>]+>/g, " ").trim().slice(0, 200)});
    });

    await step("9. wall config", async () => {
      const app = barred.sheet;
      await app.render({force: true});
      await sleep(600);
      const el = app.element;
      const part = el?.querySelector(".wix-config");
      const text = part?.textContent ?? "";
      await app.close();
      ok("9. the wall config shows the WoDX part with the bar sides by compass", !!part && /On the (west|east) side/.test(text), {sample: text.replace(/\s+/g, " ").slice(0, 160)});
    });

    await step("11. chest", async () => {
      ledger = await Item.create({name: "Gate Interact ledger", type: "Feature", system: {}});
      const [made] = await scene.createEmbeddedDocuments("Tile", [{x: 620, y: 640, width: 60, height: 60, texture: {src: "icons/svg/chest.svg"},
        flags: {[MOD]: {container: true, kind: "chest", lock: "good", ds: "locked", items: ledger.uuid, gate: "chest"}}}]);
      const chest = scene.tiles.find(t => t.flags?.[MOD]?.gate === "chest") ?? made;
      await sleep(500);
      const listed = ix().interactablesFor(tok).some(x => x.doc.id === chest.id);
      await dice(9);
      const pick = await applied(await ix().attempt(tok, chest.id, "pick", {fd: {}}));
      const afterPick = chest.flags[MOD]?.ds;
      await applied(await ix().attempt(tok, chest.id, "open"));
      const afterOpen = chest.flags[MOD]?.ds;
      const take = await applied(await ix().attempt(tok, chest.id, "take"));
      const got = burglar.items.some(i => i.name === "Gate Interact ledger");
      await ix().undoCard(take);
      const back = !burglar.items.some(i => i.name === "Gate Interact ledger") && !chest.flags[MOD]?.taken;
      ok("11. a chest: listed, picked, opened, emptied into the burglar's sheet; Undo takes the ledger back",
        listed && pick?.flags?.[MOD]?.done?.result === "done" && afterPick === "closed" && afterOpen === "open" && got && back,
        {listed, pick: pick?.flags?.[MOD]?.done?.result ?? null, afterPick, afterOpen, got, back, lines: take?.flags?.[MOD]?.done?.lines ?? null});
    });

    await step("12. tile config", async () => {
      const chest = scene.tiles.find(t => t.flags?.[MOD]?.gate === "chest");
      const app = chest.sheet;
      await app.render({force: true});
      await sleep(600);
      const part = app.element?.querySelector(".wix-tile");
      const text = part?.textContent ?? "";
      await app.close();
      ok("12. the tile config shows the WoDX container part", !!part && /Container/.test(text) && /Inside/.test(text), {sample: text.replace(/\s+/g, " ").slice(0, 160)});
    });

    // The burglar belongs to the Storyteller, so it counts as an NPC to a trap: the pit is set to go off for NPCs too.
    // Traps: a hidden pit in the room's south-west corner, off the burglar's square; a found snare by the east wall
    const findTile = tag => scene.tiles.find(t => t.flags?.[MOD]?.gate === tag);
    await step("13. search", async () => {
      await scene.createEmbeddedDocuments("Tile", [{x: 515, y: 735, width: 50, height: 50, hidden: true, texture: {src: "icons/svg/trap.svg"},
        flags: {[MOD]: {trap: true, trapKind: "pit", grade: "good", npcs: true, gate: "pit"}}}]);
      await sleep(500);
      const pit = findTile("pit");
      await dice(9);
      const msg = await applied(await ix().attempt(tok, "_search", "search", {fd: {}}));
      const found = pit.hidden === false && pit.flags[MOD]?.found === true;
      await ix().undoCard(msg);
      const back = pit.hidden === true && !pit.flags[MOD]?.found;
      ok("13. searching (Perception + Alertness) finds the hidden pit and shows it; Undo hides it again", !!pit && found && back,
        {result: msg?.flags?.[MOD]?.done?.result ?? null, found, back, lines: msg?.flags?.[MOD]?.done?.lines ?? null});
    });

    await step("14. spring", async () => {
      const pit = findTile("pit");
      const before = foundry.utils.deepClone(burglar.system.health?.damage ?? {});
      const seen = new Set(game.messages.map(m => m.id));
      await dice(2);                  // no success getting clear, and no damage gets through
      const from = {x: tb.x, y: tb.y};
      // The burglar's centre lands in the pit (a jump, so Foundry's movement rules do not stop it short)
      if ( typeof tb.move === "function" ) await tb.move([{x: 490, y: 710, action: "displace"}]);
      else await tb.update({x: 490, y: 710});
      await sleep(300);
      const findCard = () => game.messages.find(m => !seen.has(m.id) && m.flags?.[MOD]?.ask?.op === "spring");
      let card = null;
      for ( let k = 0; k < 40 && !card; k++ ) { await sleep(100); card = findCard(); }
      const hookFired = !!card;
      const diag = {from, to: {x: tb.x, y: tb.y}, pitRect: [pit.x, pit.y, pit.width, pit.height], pit: ix().describeTile(pit),
        onPath: ix().trapsOnPath(scene, {x: from.x + 50, y: from.y + 50}, {x: tb.x + 50, y: tb.y + 50}, {npc: !burglar.hasPlayerOwner}).length,
        activeGM: game.users.activeGM?.id === game.user.id, setting: game.settings.get(MOD, "traps")};
      // Not set off by the move hook: call the same handler directly, to tell a hook problem from a trap problem
      if ( !card ) { await ix().onTokenMoved(tb); for ( let k = 0; k < 20 && !card; k++ ) { await sleep(100); card = findCard(); } }
      const done = card?.flags?.[MOD]?.done;
      const sprung = pit.flags[MOD]?.sprung === true && pit.hidden === false;
      const combatCard = !!done?.damageMsg && !!game.messages.get(done.damageMsg);
      if ( card ) await ix().undoCard(card);
      const back = pit.hidden === true && !pit.flags[MOD]?.sprung && !game.messages.get(done?.damageMsg ?? "");
      const same = JSON.stringify(burglar.system.health?.damage ?? {}) === JSON.stringify(before);
      // Off the pit again without setting it off: the trap goes first
      await pit.delete();
      await tb.update({x: 550, y: 650});
      await sleep(400);
      ok("14. walking into the pit springs it: a WoDX Combat damage card, the pit shown; Undo puts back the pit, the card and the health track",
        hookFired && /falls into the pit/.test(done?.text ?? "") && sprung && combatCard && back && same, {hookFired, direct: !hookFired && !!card, text: done?.text ?? null, lines: done?.lines ?? null, sprung, combatCard, back, same, diag});
    });

    await step("15. disarm", async () => {
      await scene.createEmbeddedDocuments("Tile", [{x: 640, y: 720, width: 50, height: 50, texture: {src: "icons/svg/trap.svg"},
        flags: {[MOD]: {trap: true, trapKind: "snare", grade: "crude", found: true, gate: "snare"}}}]);
      await sleep(500);
      const snare = findTile("snare");
      const listed = ix().interactablesFor(tok).some(x => x.doc.id === snare?.id);
      await dice(9);
      const msg = await applied(await ix().attempt(tok, snare.id, "disarm", {fd: {}}));
      const safe = ix().describeTile(snare)?.armed === false;
      await ix().undoCard(msg);
      const armed = ix().describeTile(snare)?.armed === true;
      ok("15. a found snare is listed and disarmed (Wits + Larceny); Undo arms it again", listed && safe && armed, {listed, safe, armed, result: msg?.flags?.[MOD]?.done?.result ?? null});
    });

    await step("16. clue", async () => {
      await scene.createEmbeddedDocuments("Tile", [{x: 560, y: 610, width: 40, height: 40, texture: {src: "icons/svg/book.svg"},
        flags: {[MOD]: {clue: true, clueKind: "document", title: "Gate Interact letter", text0: "Gate text anyone sees.", text1: "Gate text for one success.", text3: "Gate text for three.", gate: "clue"}}}]);
      await sleep(500);
      const clue = findTile("clue");
      const listed = ix().interactablesFor(tok).some(x => x.doc.id === clue?.id);
      // Investigation is a Knowledge: without it there is only a look, so the burglar gets one dot for the step
      await burglar.update({"system.abilities.investigation.value": 1});
      await dice(9);
      const msg = await applied(await ix().attempt(tok, clue.id, "examine", {fd: {}}));
      const d = msg?.flags?.[MOD]?.done;
      const w = game.messages.get(d?.whisper ?? "");
      const told = !!w && /Gate text anyone sees/.test(w.content) && /one success/.test(w.content) && w.whisper?.includes(game.user.id);
      const quiet = !/Gate text/.test(msg?.content ?? "");
      await ix().undoCard(msg);
      const back = !game.messages.get(d?.whisper ?? "") && !clue.flags[MOD]?.seen;
      await burglar.update({"system.abilities.investigation.value": 0});
      ok("16. a clue: listed, read (Intelligence + Investigation), its text whispered and kept off the public card; Undo takes it back", listed && told && quiet && back,
        {listed, told, quiet, back, result: d?.result ?? null});
    });

    await step("17. light", async () => {
      await scene.createEmbeddedDocuments("AmbientLight", [{x: 650, y: 620, hidden: true, config: {bright: 1, dim: 2}, flags: {[MOD]: {gate: "lamp"}}}]);
      await scene.createEmbeddedDocuments("Tile", [{x: 630, y: 600, width: 40, height: 40, texture: {src: "icons/svg/light.svg"},
        flags: {[MOD]: {light: true, lightKind: "lantern", gate: "lantern"}}}]);
      await sleep(500);
      const lamp = scene.lights.find(l => l.flags?.[MOD]?.gate === "lamp"), lantern = findTile("lantern");
      const tied = ix().lightsOf(lantern).some(l => l.id === lamp?.id);
      const msg = await applied(await ix().attempt(tok, lantern.id, "lightOn"));
      const lit = lamp.hidden === false;
      await ix().undoCard(msg);
      const dark = lamp.hidden === true;
      ok("17. a lantern tied to the light beside it lights it, and Undo puts it out again", tied && lit && dark, {tied, lit, dark, result: msg?.flags?.[MOD]?.done?.result ?? null});
    });

    await step("18. hide", async () => {
      await scene.createEmbeddedDocuments("Tile", [{x: 520, y: 620, width: 60, height: 60, texture: {src: "icons/svg/door-closed.svg"},
        flags: {[MOD]: {hide: true, hideKind: "wardrobe", gate: "wardrobe"}}}]);
      await sleep(500);
      const wardrobe = findTile("wardrobe");
      const listed = ix().interactablesFor(tok).some(x => x.doc.id === wardrobe?.id);
      const seen = () => !!burglar.statuses?.has?.("invisible") || tb.hidden;
      await dice(9);
      const msg = await applied(await ix().attempt(tok, wardrobe.id, "hide", {fd: {}}));
      await sleep(300);
      const inside = (wardrobe.flags[MOD]?.occupants ?? []).some(x => x.a === burglar.id), hidden = seen();
      await ix().undoCard(msg);
      await sleep(300);
      const back = !(wardrobe.flags[MOD]?.occupants ?? []).length && !seen();
      ok("18. hiding in a wardrobe (Dexterity + Stealth) puts the burglar in it and out of sight; Undo brings it back", listed && inside && hidden && back,
        {listed, inside, hidden, back, result: msg?.flags?.[MOD]?.done?.result ?? null, statuses: [...(burglar.statuses ?? [])]});
    });

    await step("19. fire", async () => {
      await scene.createEmbeddedDocuments("Tile", [{x: 700, y: 600, width: 100, height: 100, texture: {src: "icons/svg/fire.svg"},
        flags: {[MOD]: {hazard: true, hazardKind: "fire", size: "small", heat: "bonfire", gate: "fire"}}}]);
      await sleep(500);
      const fire = findTile("fire");
      const before = foundry.utils.deepClone(burglar.system.health?.damage ?? {});
      const seen = new Set(game.messages.map(m => m.id));
      await dice(2);                  // the soak roll gets nothing
      const from = {x: tb.x, y: tb.y};
      if ( typeof tb.move === "function" ) await tb.move([{x: 700, y: 600, action: "displace"}]);
      else await tb.update({x: 700, y: 600});
      await sleep(300);
      const findCard = () => game.messages.find(m => !seen.has(m.id) && m.flags?.[MOD]?.ask?.op === "hazard");
      let card = null;
      for ( let k = 0; k < 40 && !card; k++ ) { await sleep(100); card = findCard(); }
      const hookFired = !!card;
      const diag = {from, to: {x: tb.x, y: tb.y}, onPath: ix().hazardsOnPath(scene, {x: from.x + 50, y: from.y + 50}, {x: tb.x + 50, y: tb.y + 50}).length,
        setting: game.settings.get(MOD, "hazards"), combat: game.modules.get("wodx-combat")?.version};
      if ( !card ) { await ix().onTokenMoved(tb); for ( let k = 0; k < 20 && !card; k++ ) { await sleep(100); card = findCard(); } }
      const done = card?.flags?.[MOD]?.done;
      const cc = game.messages.get(done?.damageMsg ?? "");
      const burned = /is burned/.test(done?.text ?? "") && !!cc && /diff 7/.test(cc.content ?? "");
      if ( card ) await ix().undoCard(card);
      const same = JSON.stringify(burglar.system.health?.damage ?? {}) === JSON.stringify(before) && !game.messages.get(done?.damageMsg ?? "");
      const listed = ix().interactablesFor(tok).some(x => x.doc.id === fire?.id);
      const msg = await applied(await ix().attempt(tok, fire.id, "putOut"));
      const out = ix().describeTile(fire)?.burning === false;
      await ix().undoCard(msg);
      const again = ix().describeTile(fire)?.burning === true;
      // Out of the fire: leaving it does not burn
      await fire.delete();
      await tb.update({x: 550, y: 650});
      await sleep(400);
      ok("19. walking into a fire burns through WoDX Combat, soaked at the fire's heat; it can be put out; Undo for both", hookFired && burned && same && listed && out && again,
        {hookFired, direct: !hookFired && !!card, text: done?.text ?? null, lines: done?.lines ?? null, burned, same, listed, out, again, diag});
    });

    await step("20. altar and relic", async () => {
      // Right beside where the burglar stands now (step 19 moved it), on the east side, away from the scene's walls
      await sleep(800);
      const cx = tb.x + 50, cy = tb.y + 50;
      await scene.createEmbeddedDocuments("Tile", [
        {x: cx + 55, y: cy - 25, width: 50, height: 50, texture: {src: "icons/svg/temple.svg"}, flags: {[MOD]: {sacred: true, sacredKind: "altar", rating: 3, gate: "altar"}}},
        {x: cx + 55, y: cy + 30, width: 50, height: 50, texture: {src: "icons/svg/holy-shield.svg"}, flags: {[MOD]: {sacred: true, sacredKind: "relic", rating: 2, sacredItems: ledger?.uuid ?? "", gate: "relic"}}}]);
      await sleep(500);
      const altar = findTile("altar"), relic = findTile("relic");
      const near = ix().interactablesFor(tok).map(x => x.doc.id);
      const listed = near.includes(altar?.id) && near.includes(relic?.id);
      const holy = ix().rules.holyGround(ix().describeTile(altar));
      const m1 = await applied(await ix().attempt(tok, altar.id, "desecrate"));
      const desecrated = altar.flags[MOD]?.desecrated === true && m1?.flags?.[MOD]?.done?.noise === "loud";
      await ix().undoCard(m1);
      const holyAgain = ix().rules.holyGround(ix().describeTile(altar));
      const had = burglar.items.filter(i => i.name === ledger?.name).length;
      const m2 = await applied(await ix().attempt(tok, relic.id, "take"));
      const taken = burglar.items.filter(i => i.name === ledger?.name).length === had + 1 && relic.flags[MOD]?.taken === true;
      await ix().undoCard(m2);
      const back = burglar.items.filter(i => i.name === ledger?.name).length === had && !relic.flags[MOD]?.taken;
      ok("20. an altar is holy ground, desecrated loudly and put back by Undo; a relic is taken and Undo takes it back", listed && holy && desecrated && holyAgain && taken && back,
        {listed, holy, desecrated, holyAgain, taken, back, near, ids: [altar?.id, relic?.id], tokCenter: tok.center, at: {cx, cy}});
    });

    await step("21. watch point", async () => {
      const cx = tb.x + 50, cy = tb.y + 50;
      await scene.createEmbeddedDocuments("Tile", [
        {x: tw.x - 10, y: tw.y - 10, width: 120, height: 120, texture: {src: "icons/svg/target.svg"}, flags: {[MOD]: {gate: "yard"}}}]);
      await sleep(400);
      const yard = findTile("yard");
      await scene.createEmbeddedDocuments("Tile", [
        {x: cx + 110, y: cy - 25, width: 40, height: 40, texture: {src: "icons/svg/eye.svg"}, flags: {[MOD]: {watch: true, watchKind: "window", target: yard.id, gate: "window"}}}]);
      await sleep(500);
      const win = findTile("window");
      const listed = ix().interactablesFor(tok).some(x => x.doc.id === win?.id);
      const events = [];
      const hid = Hooks.on("wodxMapEvent", e => events.push(e));
      await dice(9);
      const msg = await applied(await ix().attempt(tok, win.id, "watch", {fd: {}}));
      Hooks.off("wodxMapEvent", hid);
      const d = msg?.flags?.[MOD]?.done;
      const w = game.messages.get(d?.whisper ?? "");
      const told = !!w && w.content.includes(watchman.name) && !(msg?.content ?? "").includes(watchman.name);
      const event = events.some(e => e.kind === "watch" && e.object === win?.id);
      await ix().undoCard(msg);
      const back = !game.messages.get(d?.whisper ?? "");
      ok("21. looking out of a window names who is in the area it is tied to, in a whisper; a wodxMapEvent goes out; Undo takes it back", listed && told && event && back,
        {listed, told, event, back, result: d?.result ?? null, watchman: {x: tw.x, y: tw.y}, at: {cx, cy}});
    });

    await step("22. vehicle", async () => {
      const cx = tb.x + 50, cy = tb.y + 50;
      await scene.createEmbeddedDocuments("Tile", [
        {x: cx + 110, y: cy + 30, width: 50, height: 50, texture: {src: "icons/svg/wing.svg"}, flags: {[MOD]: {mount: true, mountKind: "cart", gate: "cart"}}}]);
      await sleep(500);
      const cart = findTile("cart");
      const listed = ix().interactablesFor(tok).some(x => x.doc.id === cart?.id);
      const events = [];
      const hid = Hooks.on("wodxMapEvent", e => events.push(e));
      await dice(9);
      const m1 = await applied(await ix().attempt(tok, cart.id, "mount", {fd: {}}));
      Hooks.off("wodxMapEvent", hid);
      const atReins = cart.flags[MOD]?.driver?.a === burglar.id && events.some(e => e.kind === "mount" && e.object === cart.id);
      // Foundry may snap the token to the grid, so the cart is checked against where the token really went
      const x0 = cart.x, t0 = tb.x, driver = foundry.utils.deepClone(cart.flags[MOD]?.driver ?? null);
      await tb.update({x: tb.x + G});
      await until(() => cart.x !== x0);
      await sleep(300);
      const t1 = tb.x, x1 = cart.x;
      const carried = t1 !== t0 && x1 === x0 + (t1 - t0);
      const m2 = await applied(await ix().attempt(canvas.tokens.get(tb.id), cart.id, "dismount"));
      const off = !cart.flags[MOD]?.driver;
      await tb.update({x: tb.x - G});
      await until(() => tb.x !== t1);
      await sleep(1200);
      const t2 = tb.x, left = cart.x === x1;
      await ix().undoCard(m2);
      await ix().undoCard(m1);
      const back = !cart.flags[MOD]?.driver;
      ok("22. taking the reins of a cart, the cart moves with the token, getting off leaves it behind, Undo puts it back", listed && atReins && carried && off && left && back,
        {listed, atReins, carried, off, left, back, result: m1?.flags?.[MOD]?.done?.result ?? null, cartX: cart.x, x0, x1, t0, t1, t2, driver, at: {cx, cy}});
    });

    await step("23. pictures and events", async () => {
      await sleep(500);
      const cx = tb.x + 50, cy = tb.y + 50;
      await scene.createEmbeddedDocuments("Tile", [
        {x: cx - 105, y: cy - 25, width: 50, height: 50, texture: {src: "icons/svg/chest.svg"}, flags: {[MOD]: {container: true, kind: "chest", lock: "cheap", ds: "locked", art: {forced: "icons/svg/explosion.svg"}, gate: "artchest"}}},
        {x: cx - 105, y: cy + 30, width: 50, height: 50, texture: {src: "icons/svg/chest.svg"}, flags: {[MOD]: {container: true, kind: "box", ds: "open", gate: "plainbox"}}}]);
      await sleep(500);
      const chest = findTile("artchest"), box = findTile("plainbox");
      const events = [];
      const hook = Hooks.on("wodxMapEvent", e => events.push(e));
      try {
        await dice(9);
        let m = null;
        for ( let k = 0; k < 4 && !chest.flags[MOD]?.lockBroken; k++ ) m = await applied(await ix().attempt(tok, chest.id, "force", {fd: {}}));
        for ( let k = 0; k < 30 && chest.texture.src !== "icons/svg/explosion.svg"; k++ ) await sleep(100);
        const swapped = chest.texture.src === "icons/svg/explosion.svg" && chest.flags[MOD]?.artBase === "icons/svg/chest.svg";
        const ev = events.find(e => e.object === chest.id && e.kind === "force" && !e.undone);
        await box.update({[`flags.${MOD}.taken`]: true});
        await sleep(400);
        const look = ix().states.lookOf(box);
        const layer = canvas.interface.children.find(c => c.name === "wodxStateMarkers");
        const marker = look?.look?.marker === "Emptied" && (layer?.children?.length ?? 0) >= 1;
        await ix().undoCard(m);
        for ( let k = 0; k < 30 && chest.texture.src !== "icons/svg/chest.svg"; k++ ) await sleep(100);
        const back = chest.texture.src === "icons/svg/chest.svg" && !chest.flags[MOD]?.lockBroken;
        const undoneEv = events.some(e => e.object === chest.id && e.undone);
        const effects = game.settings.get(MOD, "effects");
        ok("23. a forced chest shows its forced picture, one map event goes out; an emptied box gets a marker; Undo puts the picture back and says so",
          swapped && !!ev && marker && back && undoneEv && !!effects,
          {swapped, ev, marker, markerCount: layer?.children?.length ?? null, back, undoneEv, effects, src: chest.texture.src, result: m?.flags?.[MOD]?.done?.result ?? null});
      } finally { Hooks.off("wodxMapEvent", hook); }
    });

    await step("24. climbing", async () => {
      const cx = tb.x + 50, cy = tb.y + 50;
      await scene.createEmbeddedDocuments("Tile", [
        {x: 1100, y: 1200, width: 100, height: 100, texture: {src: "icons/svg/target.svg"}, flags: {[MOD]: {gate: "ledge"}}}]);
      await sleep(400);
      const ledge = findTile("ledge");
      await scene.createEmbeddedDocuments("Tile", [
        {x: cx + 55, y: cy - 90, width: 50, height: 50, texture: {src: "icons/svg/stoned.svg"}, flags: {[MOD]: {climb: true, climbKind: "wall", height: 9, climbTo: ledge.id, gate: "wallclimb"}}},
        {x: cx + 110, y: cy - 90, width: 50, height: 50, texture: {src: "icons/svg/falling.svg"}, flags: {[MOD]: {climb: true, climbKind: "gap", gap: 3, depth: 20, gate: "gap"}}}]);
      await sleep(500);
      const wallT = findTile("wallclimb"), gap = findTile("gap");
      const near = ix().interactablesFor(tok).map(x => x.doc.id);
      const listed = near.includes(wallT?.id) && near.includes(gap?.id);
      const p0 = {x: tb.x, y: tb.y};
      await dice(9);
      const m1 = await applied(await ix().attempt(tok, wallT.id, "climb", {fd: {}}));
      const lc = {x: ledge.x + 50, y: ledge.y + 50};
      const onLedge = () => Math.abs(tb.x + 50 - lc.x) < 2 && Math.abs(tb.y + 50 - lc.y) < 2;
      const up = m1?.flags?.[MOD]?.done?.result === "done" && await until(onLedge);
      const tUp = {x: tb.x, y: tb.y};
      await ix().undoCard(m1);
      const down = await until(() => tb.x === p0.x && tb.y === p0.y);
      await dice(2);
      const m2 = await applied(await ix().attempt(canvas.tokens.get(tb.id), gap.id, "jump", {fd: {}}));
      const hangs = gap.flags[MOD]?.hanging?.[burglar.id] === true;
      const m3 = await applied(await ix().attempt(canvas.tokens.get(tb.id), gap.id, "letGo"));
      const d3 = m3?.flags?.[MOD]?.done;
      const fell = !!d3?.damageMsg && !!game.messages.get(d3.damageMsg);
      await ix().undoCard(m3);
      const healed = !game.messages.get(d3?.damageMsg ?? "") && gap.flags[MOD]?.hanging?.[burglar.id] === true;
      await ix().undoCard(m2);
      ok("24. climbing a wall moves the burglar onto the ledge and Undo brings it back; a short jump hangs, letting go falls through WoDX Combat, Undo takes it back", listed && up && down && hangs && fell && healed,
        {listed, up, down, hangs, fell, healed, tUp, p0, lines: m1?.flags?.[MOD]?.done?.lines ?? [], results: [m1, m2, m3].map(m => m?.flags?.[MOD]?.done?.result ?? null), tok: {x: tb.x, y: tb.y}, ledge: lc, at: {cx, cy}});
    });

    await step("10. alongside", async () => {
      const c = game.modules.get("wodx-chronicle")?.api, a = game.wodxActions, cb = game.wodxCombat, n = game.modules.get("wodx-npc")?.api;
      ok("10. Chronicle, Actions, Combat and NPC answer", !!c?.propose && !!a?.rules && !!cb?.applyDamage && !!n?.routineRules, {});
    });
  } catch (e) { R.errors.push(String(e?.stack ?? e)); }
  finally {
    CONFIG.Dice.randomUniform = keep.uniform;
    console.error = consoleError;
    try {
      if ( game.time.worldTime !== keep.t0 ) await game.time.advance(keep.t0 - game.time.worldTime);
      await game.settings.set("wodx-chronicle", "approvals", keep.approvals);
      const made = game.messages.filter(m => !keep.messages.has(m.id)).map(m => m.id);
      if ( made.length ) await ChatMessage.deleteDocuments(made);
      if ( keep.scene ) await game.scenes.get(keep.scene)?.view();
      if ( scene ) await scene.delete();
      for ( const a of [burglar, watchman] ) if ( a ) await a.delete();
      if ( ledger ) await ledger.delete();
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gate-interact-result.json");
}
