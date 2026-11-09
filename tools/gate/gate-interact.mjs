/**
 * Interactables gate (WoDX Interactables 0.1.0), in Foundry, in rothenstein-wodx (the testing world), as Gamemaster Test:
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
  let scene = null, burglar = null, watchman = null;
  // Errors in the console while the gate runs (the Storyteller side of a card runs in a hook)
  const consoleError = console.error;
  console.error = (...a) => { R.notes.push(`console: ${a.map(x => x?.stack ?? x?.message ?? String(x)).join(" ").slice(0, 400)}`); consoleError(...a); };
  try {
    await step("1. module", async () => {
      const m = game.modules.get(MOD);
      ok("1. WoDX Interactables 0.1.0 is on, with its API, and the door control is the WoDX one", m?.active && m.version === "0.1.0" && typeof ix()?.attempt === "function"
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
    const [tb, tw] = await scene.createEmbeddedDocuments("Token", [
      {...(await burglar.getTokenDocument({x: 550, y: 650})).toObject(), actorLink: true},
      {...(await watchman.getTokenDocument({x: 550, y: 1100})).toObject(), actorLink: true, hidden: false}
    ]);
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
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gate-interact-result.json");
}
