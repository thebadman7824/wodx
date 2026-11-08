/**
 * Phase 7c gate (routines on the clock and region reactions), in Foundry, in rothenstein-wodx (Ben's testing world,
 * 2026-11-08), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gate7c.mjs?${Date.now()}`)).run()
 * Back the world up first: the gate moves the clock, and other WoDX modules act on the clock for every character.
 *
 * The cast is four of Rothenstein's own NPCs: a guard (Sergeant Heinz Volker), a merchant (Ludwig of Regensburg), a
 * priest (Father Ludovic) and a Kindred (Voivode Bogdan Ursu). The gate copies them (with their items) into a folder
 * "Gate 7c", names the copies "(Gate 7c)", and makes a player's character for the reactions (an unlinked token, so its
 * statuses stay on the token). The originals are never changed.
 *
 * It builds (or reuses) a "Gate 7c town" scene: a square grid, a wall with a gap at the bottom, a way in, and regions
 * tagged as places: a lane, the church, the keep hall, the watch-house, the market, the tavern and the homes, plus a
 * haven, and a WoDX: Reaction region over the church close (curfew, the guard watching). Then:
 *   1. the clock from 06:00 to 23:00, hour by hour, in Auto: each NPC's place at every hour against the rules, and
 *      every NPC's token inside the region its routine names; a walk into the market goes round the wall
 *   2. one hour in Suggest: a card, nothing moved until Accept
 *   3. after curfew the player's character enters the church close: the guard notices and challenges (Auto), Undo
 *   4. the same under Obfuscate: unseen
 *   5. a fight pauses the guard's routine; when it ends the guard walks back
 *   6. opening the scene offers every NPC out of place, without walking (Suggest), then Accept
 *   7. a one-week time skip puts everyone where the routines say
 *   8. Undo on every routine card, newest first, takes the town back to how it started
 * The days used are the next Monday, Tuesday and Wednesday (and the Wednesday after) that are not feast days, in the
 * world's own year and era.
 *   9. clean up: the clock goes back; every character, unlinked token and WoDX setting the clock work changed while the
 *      gate ran is put back as it was; the gate's scenes, folder, cast copies and chat cards are deleted. Nothing it did
 *      not make is deleted, except items and effects the clock work added to characters during the run.
 * Result: Data/wodx-gate/gate7c-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOD = "wodx-npc";
const npc = () => game.modules.get(MOD).api, RT = () => npc().routines, RR = () => npc().routineRules;
const chron = () => game.modules.get("wodx-chronicle").api;
const TOWN = "Gate 7c town", ELSEWHERE = "Gate 7c elsewhere";
const G = 100;
const unset = k => { const Del = foundry.data?.operators?.ForcedDeletion; return Del ? {[`flags.${MOD}.${k}`]: new Del()} : {[`flags.${MOD}.-=${k}`]: null}; };

async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
function harness() {
  const R = {started: new Date().toISOString(), steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 4).join(" | ")}); } };
  return {R, ok, step};
}

/* ---- the cast ---- */
const CAST = [
  {role: "guard", name: /Heinz Volker/i, template: "guard", preset: "night-watch"},
  {role: "merchant", name: /Ludwig of Regensburg/i, template: "civilian", preset: "merchant"},
  {role: "priest", name: /Father Ludovic/i, template: "civilian", preset: "priest"},
  {role: "kindred", name: /Bogdan/i, template: "elder", preset: "elder"}
];
async function cast(R) {
  let folder = game.folders.find(f => f.type === "Actor" && f.name === "Gate 7c");
  folder ??= await Folder.create({name: "Gate 7c", type: "Actor"});
  const out = {};
  for ( const c of CAST ) {
    let a = game.actors.find(x => x.flags?.[MOD]?.gateRole === c.role);
    if ( !a ) {
      const src = game.actors.find(x => c.name.test(x.name) && !x.flags?.[MOD]?.gateRole);
      if ( !src ) throw new Error(`Rothenstein has no actor for the ${c.role}`);
      const data = src.toObject();
      delete data._id; delete data._stats; delete data.folder;
      data.name = `${src.name} (Gate 7c)`;
      data.folder = folder.id;
      data.ownership = {default: 0};
      data.flags = {...(data.flags ?? {}), [MOD]: {gateRole: c.role}};
      a = await Actor.create(data);
      R.notes.push(`Copied ${src.name}`);
    }
    out[c.role] = a;
  }
  let hero = game.actors.find(x => x.flags?.[MOD]?.gateRole === "hero");
  hero ??= await Actor.create({name: "Gate 7c wanderer", type: "Mortal", folder: folder.id, ownership: {default: 3}, flags: {[MOD]: {gateRole: "hero"}}});
  out.hero = hero;
  return out;
}

/* ---- the town ---- */
const rect = (j, i, w, h) => ({type: "rectangle", x: j * G, y: i * G, width: w * G, height: h * G, rotation: 0, hole: false});
const REGIONS = [
  // name, cells (col, row, width, height), place kind, colour
  ["West door", [0, 7, 1, 2], null, "#888888"],
  ["The lane", [1, 6, 10, 4], "street", "#806040"],
  ["St. Aegidius", [1, 1, 5, 3], "church", "#d0c080"],
  ["Church close", [1, 4, 5, 2], null, "#c08040"],
  ["The keep hall", [7, 1, 4, 4], "castle", "#a0a0c0"],
  ["The homes", [3, 11, 7, 4], "home", "#608060"],
  ["The watch-house", [13, 2, 4, 4], "gate", "#4060a0"],
  ["Market stalls", [13, 8, 10, 4], "market", "#a06060"],
  ["The tavern", [18, 1, 5, 4], "tavern", "#a08040"],
  ["Bogdan's haven", [19, 13, 4, 3], "haven", "#602040"]
];
async function town(R) {
  let sc = game.scenes.find(s => s.getFlag(MOD, "gateTown"));
  if ( !sc ) {
    sc = await Scene.create({name: TOWN, width: 24 * G, height: 16 * G, padding: 0, grid: {type: CONST.GRID_TYPES.SQUARE, size: G, distance: 5, units: "ft"},
      tokenVision: false, fog: {exploration: false}, flags: {[MOD]: {gateTown: true}}});
    // A wall from the top down to row 13, west of the watch-house and the market: the way round is the gap at the bottom
    await sc.createEmbeddedDocuments("Wall", [{c: [12 * G, 0, 12 * G, 13 * G], move: CONST.WALL_MOVEMENT_TYPES.NORMAL, sight: (CONST.EDGE_SENSE_TYPES ?? CONST.WALL_SENSE_TYPES).NORMAL}]);
    await sc.createEmbeddedDocuments("Region", REGIONS.map(([name, [j, i, w, h], kind, color]) => ({name, color, shapes: [rect(j, i, w, h)],
      flags: kind ? {[MOD]: {place: {kind, owner: "", private: false}}} : {}})));
    R.notes.push("Built the Gate 7c town");
  }
  let other = game.scenes.find(s => s.getFlag(MOD, "gateElsewhere"));
  other ??= await Scene.create({name: ELSEWHERE, width: 10 * G, height: 10 * G, padding: 0, grid: {type: CONST.GRID_TYPES.SQUARE, size: G, distance: 5, units: "ft"},
    flags: {[MOD]: {gateElsewhere: true, place: {kind: "home", owner: "", private: false}}}});
  const reg = name => sc.regions.find(r => r.name === name);
  // The Reaction over the church close: the curfew, the guard watching, player characters only
  const close = reg("Church close");
  const type = RT().reactionType();
  if ( !close.behaviors.find(b => b.type === type) ) {
    await close.createEmbeddedDocuments("RegionBehavior", [{name: "WoDX: Reaction", type, system: {watchers: "listed", names: "Heinz Volker", triggers: ["enter"],
      conditions: ["curfew"], match: "any", who: "pcs", response: "profile"}}]);
  }
  return {sc, other, reg};
}

/* ---- checks ---- */
const tokensOf = (sc, a) => sc.tokens.filter(t => t.actorId === a.id);
function expected(a, t) {
  const r = RT(), w = a.getFlag(MOD, "routine") ?? {};
  return RR().placeAt(r.blocksFor(a), t, r.describer(), {places: r.listPlaces(), roles: w.roles ?? {}, seed: a.id}).place;
}
function check(sc, cast, t, label) {
  const bad = [];
  const places = RT().listPlaces();
  for ( const role of ["guard", "merchant", "priest", "kindred"] ) {
    const a = game.actors.get(cast[role].id), want = expected(a, t), got = a.getFlag(MOD, "where")?.place ?? null;
    if ( want !== got ) { bad.push(`${role}: routine says ${places.find(p => p.id === want)?.name ?? want}, record says ${places.find(p => p.id === got)?.name ?? got}`); continue; }
    const p = places.find(x => x.id === want);
    const toks = tokensOf(sc, a);
    if ( p?.region && p.scene.id === sc.id ) {
      if ( toks.length !== 1 ) bad.push(`${role}: ${toks.length} tokens on the town (want 1 in ${p.region.name})`);
      else if ( !toks[0].regions?.has(p.region) ) bad.push(`${role}: token not inside ${p.region.name} (at column ${Math.round(toks[0].x / G)}, row ${Math.round(toks[0].y / G)}; in ${[...(toks[0].regions ?? [])].map(r => r.name).join(", ") || "no region"}${a.flags?.[MOD]?.paused ? `; paused: ${a.flags[MOD].paused.reason}` : ""})`);
    } else if ( toks.length ) bad.push(`${role}: should have left the town (${p?.name ?? "nowhere"}) but has a token`);
  }
  return {label, pass: !bad.length, bad};
}
const routineCards = after => game.messages.contents.filter(m => m.getFlag(MOD, "routine") && m.timestamp >= after);
const reactionCards = after => game.messages.contents.filter(m => m.getFlag(MOD, "reaction") && m.timestamp >= after);

/* ---- Rothenstein is a real world: what the clock work changes is put back, and the gate's own things go ---- */
const isGate = a => !!a?.flags?.[MOD]?.gateRole;
const json = o => JSON.stringify(o ?? null);
/** The registered world settings of the WoDX modules (the routine mode is the gate's own, put back by itself). */
const wodxSettings = () => [...game.settings.settings.values()].filter(c => /^wodx-/.test(c.namespace) && c.scope === "world" && `${c.namespace}.${c.key}` !== "wodx-npc.routineMode").map(c => `${c.namespace}.${c.key}`);
const getSetting = k => { const [ns, ...rest] = k.split("."); try { return game.settings.get(ns, rest.join(".")); } catch (e) { return null; } };
/** Every character (not the gate's), every unlinked token's changes, every WoDX world setting, as they stand. */
function snapWorld() {
  const actors = new Map(game.actors.filter(a => !isGate(a)).map(a => [a.id, a.toObject()]));
  const tokens = new Map();
  for ( const sc of game.scenes ) for ( const t of sc.tokens ) if ( !t.actorLink ) tokens.set(t.uuid, json(t.toObject().delta));
  const settings = new Map(wodxSettings().map(k => [k, json(getSetting(k))]));
  return {actors, tokens, settings};
}
async function restoreWorld(b) {
  const out = {actors: [], tokens: [], settings: [], itemsRemoved: [], itemsBack: []};
  for ( const [id, old] of b.actors ) {
    const a = game.actors.get(id);
    if ( !a ) { out.actors.push(`${old.name}: gone (not put back)`); continue; }
    const now = a.toObject();
    if ( json(now.system) !== json(old.system) || json(now.flags) !== json(old.flags) ) {
      await a.update({system: old.system, flags: old.flags}, {diff: false, recursive: false, wodxGate: true});
      out.actors.push(a.name);
    }
    for ( const kind of ["Item", "ActiveEffect"] ) {
      const key = kind === "Item" ? "items" : "effects";
      const was = new Map(old[key].map(x => [x._id, x])), is = new Map(now[key].map(x => [x._id, x]));
      const added = [...is.keys()].filter(k => !was.has(k));
      const lost = [...was.values()].filter(x => !is.has(x._id));
      const changed = [...was.values()].filter(x => is.has(x._id) && json(x) !== json(is.get(x._id)));
      if ( added.length ) { await a.deleteEmbeddedDocuments(kind, added); out.itemsRemoved.push(`${a.name}: ${added.map(k => is.get(k).name).join(", ")}`); }
      if ( lost.length ) { await a.createEmbeddedDocuments(kind, lost, {keepId: true}); out.itemsBack.push(`${a.name}: ${lost.map(x => x.name).join(", ")}`); }
      if ( changed.length ) { await a.updateEmbeddedDocuments(kind, changed, {diff: false, recursive: false}); out.itemsBack.push(`${a.name}: ${changed.map(x => x.name).join(", ")} (changed back)`); }
    }
  }
  for ( const [uuid, delta] of b.tokens ) {
    const t = await fromUuid(uuid);
    if ( t && json(t.toObject().delta) !== delta ) { await t.update({delta: JSON.parse(delta)}, {diff: false, recursive: false}); out.tokens.push(t.name); }
  }
  for ( const [k, v] of b.settings ) {
    if ( json(getSetting(k)) === v ) continue;
    const [ns, ...rest] = k.split(".");
    await game.settings.set(ns, rest.join("."), JSON.parse(v));
    out.settings.push(k);
  }
  return out;
}
/** The gate's scenes, cast copies, wanderer, folder and chat cards (only cards from this run, from this user). */
async function removeGate(start) {
  const out = {};
  for ( const c of game.combats.filter(c => c.scene && (c.scene.flags?.[MOD]?.gateTown || c.scene.flags?.[MOD]?.gateElsewhere)) ) await c.delete();
  const scenes = game.scenes.filter(x => x.flags?.[MOD]?.gateTown || x.flags?.[MOD]?.gateElsewhere);
  out.scenes = scenes.map(x => x.name);
  if ( scenes.length ) await Scene.deleteDocuments(scenes.map(x => x.id));
  const actors = game.actors.filter(isGate);
  out.actors = actors.map(a => a.name);
  if ( actors.length ) await Actor.deleteDocuments(actors.map(a => a.id));
  const folders = game.folders.filter(f => f.type === "Actor" && f.name === "Gate 7c" && !f.contents?.length);
  out.folders = folders.length;
  if ( folders.length ) await Folder.deleteDocuments(folders.map(f => f.id));
  const msgs = game.messages.filter(m => m.timestamp >= start && (m.author?.id ?? m.user?.id) === game.user.id);
  out.chat = msgs.length;
  if ( msgs.length ) await ChatMessage.deleteDocuments(msgs.map(m => m.id));
  return out;
}

export async function run() {
  const {R, ok, step} = harness();
  const start = Date.now(), startTime = game.time.worldTime, startScene = canvas.scene;
  const before = snapWorld();
  const keepMode = game.settings.get(MOD, "routineMode");
  let cs, T, hero;
  await step("setup", async () => {
    cs = await cast(R);
    T = await town(R);
    if ( canvas.scene?.id !== T.sc.id ) { const ready = new Promise(r => Hooks.once("canvasReady", r)); await T.sc.view(); await ready; }
    await sleep(800);
    await T.sc.setFlag(MOD, "routineMode", "auto");
    const r = T.reg;
    const roles = {
      guard: {home: r("The homes").uuid, post: r("The watch-house").uuid, street: r("The lane").uuid, tavern: r("The tavern").uuid},
      merchant: {work: r("Market stalls").uuid, home: T.other.uuid, church: r("St. Aegidius").uuid, tavern: r("The tavern").uuid},
      priest: {church: r("St. Aegidius").uuid, home: r("The homes").uuid, street: r("The lane").uuid},
      kindred: {haven: r("Bogdan's haven").uuid, court: r("The keep hall").uuid, street: r("The lane").uuid}
    };
    for ( const c of CAST ) {
      const a = cs[c.role];
      await a.update({[`flags.${MOD}.behavior`]: {template: c.template}, [`flags.${MOD}.routine`]: {on: true, preset: c.preset, roles: roles[c.role], blocks: null, mode: null},
        ...unset("where"), ...unset("paused")});
    }
    // No NPC tokens of the cast on the town to begin with; the wanderer stands in the far corner, outside every region
    for ( const c of CAST ) for ( const d of tokensOf(T.sc, cs[c.role]) ) await d.update({x: 23 * G, y: 0}, {animate: false});
    hero = T.sc.tokens.find(t => t.actorId === cs.hero.id);
    if ( !hero ) [hero] = await T.sc.createEmbeddedDocuments("Token", [(await cs.hero.getTokenDocument({x: 0, y: 15 * G, actorLink: false, disposition: 1})).toObject()]);
    else await hero.update({x: 0, y: 15 * G}, {animate: false});
    ok("setup", true, {cast: Object.fromEntries(Object.entries(cs).map(([k, a]) => [k, a.name]))});
  });
  if ( !T ) return save(R, "gate7c-result.json");

  // The next Monday after today whose Monday, Tuesday and Wednesday, and the Wednesday after, are not feast days
  const engine = (await import("/modules/wodx-chronicle/scripts/calendar.mjs")).getEngine();
  await RT().loadCalendar();
  const describe = RT().describer();
  const today = engine.timeToDate(startTime);
  let mon = engine.dateToTime({year: today.year, month: today.month, day: today.day, hour: 0, minute: 0});
  const plain = t => !describe(t + 12 * 3600).feast;
  for ( let k = 0; k < 400; k++ ) {
    mon += 86400;
    if ( describe(mon + 12 * 3600).dayOfWeek === 0 && [0, 1, 2, 9].every(d => plain(mon + d * 86400)) ) break;
  }
  const at = (d, h, m = 0) => mon + d * 86400 + h * 3600 + m * 60;
  R.days = {monday: describe(mon + 12 * 3600).dateLabel ?? engine.timeToDate(mon)};
  const set = async t => { await game.time.set(t); await RT().idle(); await sleep(300); };
  const leftOver = [];
  for ( const c of CAST ) leftOver.push(...tokensOf(T.sc, cs[c.role]).map(d => d.id));

  // At noon the merchant is at work in the market, having walked in from the door
  const marketWalk = () => step("1b. a walk into the market goes round the wall", async () => {
    const a = cs.merchant, d = tokensOf(T.sc, a)[0];
    const NR = npc().rules, api = npc();
    const tok = d?.object;
    if ( !tok ) return ok("1b. the merchant's token is on the town", false);
    const from = {i: 7, j: 1}, goal = api.cellOf(tok);
    const path = NR.findPath(from, goal, (p, q) => !api.wallBetween(p, q, tok), {maxNodes: 40000});
    const crossing = path?.find(c => c.j === 12);
    ok("1b. the path from the door to the market crosses the wall's line only through the gap", !!crossing && crossing.i >= 13, {steps: path?.length ?? 0, crossing});
    ok("1b. the merchant stands in the market", d.regions.has(T.reg("Market stalls")));
  });

  await step("1. the clock, 06:00 to 23:00, in Auto", async () => {
    await set(at(0, 5));
    const fails = [];
    for ( let h = 6; h <= 23; h++ ) {
      await set(at(0, h));
      const c = check(T.sc, cs, at(0, h), `${h}:00`);
      if ( !c.pass ) fails.push(c);
      if ( h === 12 ) await marketWalk();
    }
    ok("1. every NPC's place at every hour, and every token in its region", !fails.length, {fails});
    const cards = routineCards(start);
    ok("1. Auto posted cards with Undo", cards.length > 0 && cards.every(m => m.getFlag(MOD, "routine").mode === "auto"), {cards: cards.length});
    const notes = cards.flatMap(m => m.getFlag(MOD, "routine").notes ?? []);
    ok("1. every walk found a way (no 'no way through')", !notes.some(n => /no way through/.test(n)), {notes});
  });


  await step("2. one hour in Suggest: a card, and nothing moves until Accept", async () => {
    await T.sc.setFlag(MOD, "routineMode", "suggest");
    const before = Date.now();
    const pos = new Map(T.sc.tokens.map(t => [t.id, `${t.x},${t.y}`]));
    await set(at(1, 0)); // midnight: the guard to the watch-house, the Kindred to the lane
    const card = routineCards(before).at(-1);
    const plan = card?.getFlag(MOD, "routine");
    const moved = T.sc.tokens.filter(t => pos.has(t.id) && pos.get(t.id) !== `${t.x},${t.y}`).map(t => t.name);
    ok("2. a Suggestion card, and no token moved", plan?.mode === "suggest" && plan.items.length > 0 && !moved.length, {items: plan?.items?.map(i => i.type), moved});
    await RT().acceptRoutineCard(card);
    await sleep(500);
    const c = check(T.sc, cs, at(1, 0), "00:00 after Accept");
    ok("2. after Accept everyone is where the routine says", c.pass, c);
    await T.sc.setFlag(MOD, "routineMode", "auto");
  });

  await step("3. after curfew, the wanderer enters the church close: the guard challenges", async () => {
    await set(at(1, 23, 30)); // Tuesday 23:30: the guard is on rounds in the lane
    const c = check(T.sc, cs, game.time.worldTime, "23:30 Tuesday");
    ok("3. the guard is in the lane", c.pass, c);
    const before = Date.now();
    await hero.update({x: 3 * G, y: 4 * G}, {animate: false});
    await RT().idle(); await sleep(500);
    const card = reactionCards(before).at(-1), data = card?.getFlag(MOD, "reaction");
    ok("3. a reaction card: the guard notices and challenges (Auto)", data?.options?.[0]?.action === "challenge" && /challenges/.test(data?.done?.text ?? ""), {head: data?.head, options: data?.options?.map(o => o.action), done: data?.done?.text, lines: data?.lines});
    const g = tokensOf(T.sc, cs.guard)[0];
    ok("3. the guard's routine is paused by the reaction", game.actors.get(cs.guard.id).getFlag(MOD, "paused")?.reason === "reaction");
    const gPos = data?.done?.snap?.moved?.[0];
    await RT().undoReactionCard(card);
    await sleep(400);
    ok("3. Undo puts the guard back and lifts the pause", (!gPos || (g.x === gPos.x && g.y === gPos.y)) && !game.actors.get(cs.guard.id).getFlag(MOD, "paused"));
    await hero.update({x: 0, y: 15 * G}, {animate: false});
  });

  await step("4. under Obfuscate the wanderer goes unseen", async () => {
    await sleep(5500); // a token re-entering the same region is heard once in five seconds
    const ta = hero.actor;
    if ( !ta.items.find(i => i.type === "Power" && /^obfuscate/i.test(i.name)) ) await ta.createEmbeddedDocuments("Item", [{name: "Obfuscate", type: "Power", system: {type: "wod.types.discipline", value: 2}}]);
    await ta.toggleStatusEffect("wodx-obfuscated", {active: true});
    const before = Date.now();
    await hero.update({x: 3 * G, y: 4 * G}, {animate: false});
    await RT().idle(); await sleep(500);
    const card = game.messages.contents.filter(m => m.timestamp >= before && /Unseen/.test(m.content)).at(-1);
    ok("4. an Unseen card naming Obfuscate", !!card && /Obfuscate 2 against Auspex 0/.test(card.content), {content: card?.content?.replace(/<[^>]+>/g, " ").slice(0, 300)});
    ok("4. no reaction was carried out", !reactionCards(before).length);
    await ta.toggleStatusEffect("wodx-obfuscated", {active: false});
    await hero.update({x: 0, y: 15 * G}, {animate: false});
  });

  await step("5. a fight pauses the guard's routine; when it ends the guard walks back", async () => {
    const g = tokensOf(T.sc, cs.guard)[0];
    const combat = await Combat.create({scene: T.sc.id, active: true});
    await combat.createEmbeddedDocuments("Combatant", [{tokenId: g.id, sceneId: T.sc.id, actorId: cs.guard.id}]);
    await sleep(500);
    ok("5. the guard's routine is paused by the fight", game.actors.get(cs.guard.id).getFlag(MOD, "paused")?.reason === "fight");
    const pos = `${g.x},${g.y}`;
    await set(at(2, 0, 30)); // Wednesday 00:30: the post
    ok("5. paused: the guard stays put", `${g.x},${g.y}` === pos);
    await combat.delete();
    await RT().idle(); await sleep(800);
    const c = check(T.sc, cs, game.time.worldTime, "after the fight");
    ok("5. after the fight the guard is back on the routine, in the watch-house", !game.actors.get(cs.guard.id).getFlag(MOD, "paused") && g.regions.has(T.reg("The watch-house")), c);
  });

  await step("6. opening the scene offers everyone out of place, without walking", async () => {
    await T.sc.setFlag(MOD, "routineMode", "suggest");
    for ( const c of CAST ) for ( const d of tokensOf(T.sc, cs[c.role]) ) await d.update({x: (12 + CAST.indexOf(c)) * G, y: 15 * G}, {animate: false});
    const before = Date.now();
    { const ready = new Promise(r => Hooks.once("canvasReady", r)); await T.other.view(); await ready; }
    { const ready = new Promise(r => Hooks.once("canvasReady", r)); await T.sc.view(); await ready; }
    await RT().idle(); await sleep(800);
    const card = routineCards(before).at(-1), plan = card?.getFlag(MOD, "routine");
    const onTown = CAST.filter(c => tokensOf(T.sc, cs[c.role]).length).length;
    ok("6. a card with a jump for every NPC on the town", plan?.how === "open" && plan.items.filter(i => i.type === "jump").length === onTown, {items: plan?.items?.map(i => i.type), onTown});
    await RT().acceptRoutineCard(card);
    await sleep(500);
    const c = check(T.sc, cs, game.time.worldTime, "after opening");
    ok("6. after Accept everyone is in place", c.pass, c);
    await T.sc.setFlag(MOD, "routineMode", "auto");
  });

  await step("7. a week's time skip puts everyone where the routines say", async () => {
    const to = game.time.worldTime + 7 * 86400 + 11 * 3600; // the next Wednesday, 11:30
    await chron().timeSkip(to, {label: "Gate 7c"});
    await RT().idle(); await sleep(800);
    const c = check(T.sc, cs, to, "after the skip");
    ok("7. after the skip everyone is where the routine says", c.pass, c);
  });

  await step("8. Undo on every routine card takes the town back to how it started", async () => {
    const cards = routineCards(start).filter(m => m.getFlag(MOD, "routine").snap).reverse();
    for ( const m of cards ) { await RT().undoRoutineCard(m); await sleep(150); }
    const left = CAST.flatMap(c => tokensOf(T.sc, cs[c.role]).map(d => d.id)).filter(id => !leftOver.includes(id));
    ok("8. no token WoDX placed is left", !left.length, {cards: cards.length, left});
  });

  // 9. Put things back: the clock, the view, the world's mode; then everything the clock work changed; then the gate's own things
  try {
    for ( const c of CAST ) if ( cs?.[c.role] ) await cs[c.role].update({[`flags.${MOD}.routine.on`]: false});
    await game.settings.set(MOD, "routineMode", keepMode);
    if ( game.time.worldTime !== startTime ) await game.time.set(startTime);
    await RT().idle(); await sleep(2000);
    if ( startScene && startScene.id !== canvas.scene?.id ) { const ready = new Promise(r => Hooks.once("canvasReady", r)); await startScene.view(); await ready; await sleep(1000); }
  } catch (e) { R.errors.push(`restore clock: ${e.message}`); }
  try { R.restored = await restoreWorld(before); } catch (e) { R.errors.push(`restore world: ${e.message}`); }
  try { R.removed = await removeGate(start); } catch (e) { R.errors.push(`clean up: ${e.message}`); }
  ok("9. the clock is back", game.time.worldTime === startTime);
  ok("9. nothing of the gate is left", !game.scenes.some(x => x.flags?.[MOD]?.gateTown || x.flags?.[MOD]?.gateElsewhere)
    && !game.actors.some(a => a.flags?.[MOD]?.gateRole) && !game.folders.some(f => f.type === "Actor" && f.name === "Gate 7c"), R.removed);
  return save(R, "gate7c-result.json");
}
