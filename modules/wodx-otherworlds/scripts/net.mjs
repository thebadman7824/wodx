/**
 * WoDX Otherworlds: running the Net in Foundry (B6590 to B6606). The rules are in net-rules.mjs.
 *
 * The Storyteller draws a data fortress as a scene of its own (folder WoDX Net), tied to a Realspace scene: its art
 * (placeholder SVG), the data wall as walls, its code gates as locked doors, its ICE as tokens. A runner jacks in
 * from the Net window: the body keeps its place with the Jacked in status, and the icon appears at the fortress's
 * long distance link. From the window the runner runs programs at what is targeted: breaks gates, fights ICE, hides,
 * reads and copies files, works the remotes. The ICE acts on its own each Net turn: it moves across the map, attacks,
 * traces and raises the alarm. What it does lands in the world: damage through WoDX Combat, Net statuses, a fire at
 * the body's feet, law heat in WoDX Chronicle. What the runner takes lands too: money in the purse (WoDX Storyteller),
 * secrets and Ledger hooks (WoDX NPC), doors and lights and cameras on the tied Realspace scene.
 */
import {MODULE_ID} from "./ratings.mjs";
import {STATUS} from "./crossing.mjs";
import * as N from "./net-rules.mjs";
import * as T from "./technica.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";
import {DAY, HOUR} from "../../wodx-chronicle/scripts/terms.mjs";

const FOLDER = "WoDX Net";
const ICE_FOLDER = "WoDX Net ICE";
const GRID = 100;
const ASSET_DIR = "wodx-assets/net";
const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const num = v => Number(v) || 0;
const chron = () => game.modules.get("wodx-chronicle")?.api ?? null;
const st = () => game.modules.get("wodx-storyteller")?.api ?? null;
const npc = () => game.modules.get("wodx-npc")?.api ?? null;
const solo = () => game.modules.get("wodx-solo")?.api ?? null;
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const isActiveGM = () => !!game.users.activeGM?.isSelf;
const setting = k => { try { return game.settings.get(MODULE_ID, k); } catch (e) { return undefined; } };
const year = () => { try { return chron()?.eras?.currentYear?.() ?? null; } catch (e) { return null; } };
const future = () => { try { return !!chron()?.rule?.("futureBranch"); } catch (e) { return false; } };
const at = (a, k) => num(a?.system?.attributes?.[k]?.total ?? a?.system?.attributes?.[k]?.value);
const ab = (a, k) => num(a?.system?.abilities?.[k]?.value);
const owners = a => game.users.filter(u => !u.isGM && a?.testUserPermission?.(u, "OWNER")).map(u => u.id);
const whisperFor = a => [...new Set([...owners(a), ...gmIds()])];
const card = (title, body) => `<div class="wodx-card wodx-crossing wodx-net"><h3>${esc(title)}</h3>${body}</div>`;
const diceLine = d => d?.length ? `<span class="wodx-quiet">(${d.join(", ")})</span>` : "";
const PH = "#5fffe6";

async function d10(k) {
  const c = Math.max(0, Math.trunc(num(k)));
  if ( !c ) return {dice: [], roll: null};
  const r = await new Roll(`${c}d10`).evaluate();
  return {dice: r.dice?.[0]?.results?.map(x => x.result) ?? [], roll: r};
}
async function rollFormula(f) {
  if ( !f ) return 0;
  if ( typeof f === "number" ) return f;
  const r = await new Roll(String(f)).evaluate();
  return r.total;
}

export const netKindNow = () => N.netKind(year(), future());
export const isFortress = scene => !!scene?.flags?.[MODULE_ID]?.netFortress;
export const modelOf = scene => scene?.flags?.[MODULE_ID]?.netFortress ?? null;
const stateOf = a => a?.flags?.[MODULE_ID]?.netRun ?? null;
const statusIds = a => [...(a?.statuses ?? [])];

/* ------------------------------------------------------------------ */
/*  Settings and statuses                                             */
/* ------------------------------------------------------------------ */

export function registerNetSettings() {
  game.settings.register(MODULE_ID, "netIce", {name: "ICE acts on its own", hint: "When the ICE of a data fortress takes its Net turn by itself after a runner acts: always, only when a lone player plays (the Lone Chronicle), or never (the Storyteller presses ICE acts in the Net window).",
    scope: "world", config: true, type: String, choices: {solo: "When a lone player plays", always: "Always", off: "Never"}, default: "solo"});
}
export function registerNetStatuses() {
  for ( const [id, s] of Object.entries(N.STATUSES) ) {
    if ( !CONFIG.statusEffects.find(e => e.id === id) ) CONFIG.statusEffects.push({id, name: s.label, img: s.img, hud: true});
  }
}
const iceAuto = () => { const m = setting("netIce") ?? "solo"; return m === "always" || (m === "solo" && !!solo()?.isOn?.()); };

/** Put a Net status on an actor for some Net turns (0: until cleared). Timers are a list, so a write replaces it whole. */
const timersOf = a => (Array.isArray(a?.flags?.[MODULE_ID]?.netTimers) ? a.flags[MODULE_ID].netTimers : []);
async function addStatus(actor, id, turns = 0) {
  if ( !actor ) return;
  if ( !actor.statuses?.has(id) ) await actor.toggleStatusEffect(id, {active: true});
  if ( turns > 0 ) await actor.setFlag(MODULE_ID, "netTimers", [...timersOf(actor).filter(t => t.id !== id), {id, left: turns}]);
}
async function dropStatus(actor, id) {
  if ( actor?.statuses?.has(id) ) await actor.toggleStatusEffect(id, {active: false});
}
/** One Net turn passes: timed statuses count down and end. */
async function tickTimers(actor) {
  const list = timersOf(actor);
  if ( !list.length ) return;
  const next = [];
  for ( const t of list ) { if ( t.left <= 1 ) await dropStatus(actor, t.id); else next.push({id: t.id, left: t.left - 1}); }
  await actor.setFlag(MODULE_ID, "netTimers", next);
}

/* ------------------------------------------------------------------ */
/*  Drawing a data fortress                                           */
/* ------------------------------------------------------------------ */

async function ensureDir(dir) {
  const FP = foundry.applications.apps.FilePicker.implementation;
  let path = "";
  for ( const part of dir.split("/") ) {
    path = path ? `${path}/${part}` : part;
    try { await FP.createDirectory("data", path, {notify: false}); }
    catch (err) { if ( !/exists/i.test(String(err?.message ?? err)) ) throw err; }
  }
  return FP;
}
async function writeArt(model) {
  const FP = await ensureDir(ASSET_DIR);
  const name = `fortress-${model.seed}-${model.cpus}.svg`;
  const file = new File([N.svg(model, GRID)], name, {type: "image/svg+xml"});
  const res = await FP.upload("data", ASSET_DIR, file, {}, {notify: false});
  if ( res === false || res?.status === "error" ) throw new Error("The fortress map could not be written.");
  return `${ASSET_DIR}/${name}`;
}
const firstLevel = scene => [...(scene?.levels ?? [])].sort((a, b) => (a.elevation?.bottom ?? 0) - (b.elevation?.bottom ?? 0))[0] ?? null;
async function setArt(scene, src) {
  const l = firstLevel(scene);
  if ( l ) { if ( l.background?.src !== src ) await l.update({"background.src": src}); }
  else if ( scene.background?.src !== src ) await scene.update({"background.src": src});
}

/** The actor that stands for one kind of ICE on the map (one per program, made once). */
async function iceActor(program) {
  const P = N.PROGRAMS[program];
  const name = `ICE: ${P.label}`;
  let a = game.actors.find(x => x.flags?.[MODULE_ID]?.netIce === program);
  if ( a ) return a;
  const folder = game.folders.find(f => f.type === "Actor" && f.name === ICE_FOLDER) ?? await Folder.create({name: ICE_FOLDER, type: "Actor", color: "#0b3b3b"});
  a = await Actor.create({name, type: CONFIG.worldofdarkness?.sheettype?.creature ?? "Creature", folder: folder?.id ?? null, img: "icons/svg/hazard.svg",
    prototypeToken: {name, actorLink: false, disposition: -1, texture: {src: "icons/svg/hazard.svg", tint: P.cls === "antipersonnel" ? "#ff4040" : P.cls === "detection" ? "#ffd040" : "#40a0ff"}},
    flags: {[MODULE_ID]: {netIce: program}}});
  return a;
}

/**
 * Storyteller: draw a data fortress. opts: {seed, cpus, name, link (a Realspace scene id), owner (an actor id: whose
 * system it is)}. The remotes are tied to real things on the Realspace scene where it has them (B6599).
 */
export async function drawFortress({seed = null, cpus = 0, name = "", link = null, owner = null} = {}) {
  if ( !game.user.isGM ) throw new Error("Only the Storyteller draws a data fortress.");
  const s = Number.isFinite(Number(seed)) && seed !== null && seed !== "" ? Math.trunc(Number(seed)) : Math.floor(Math.random() * 1e6);
  const real = link ? game.scenes.get(link) : null;
  const model = N.fortress({seed: s, cpus: num(cpus), name: name || (real ? `${real.name}: its system` : "")});
  model.link = real?.id ?? null; model.owner = owner || null; model.alarm = false;
  if ( real ) tieRemotes(model, real);
  const src = await writeArt(model);
  const folder = game.folders.find(f => f.type === "Scene" && f.name === FOLDER) ?? await Folder.create({name: FOLDER, type: "Scene", color: "#063333"});
  const scene = await Scene.create({
    name: model.name.slice(0, 120), folder: folder?.id ?? null, navigation: false,
    width: model.cols * GRID, height: model.rows * GRID, padding: 0, backgroundColor: "#03080b", grid: {size: GRID},
    background: {src}, environment: {darknessLevel: 0, globalLight: {enabled: true}}, tokenVision: false,
    flags: {[MODULE_ID]: {netFortress: model, inNet: true}}
  });
  await setArt(scene, src);
  const walls = N.wallSegments(model).map(w => ({c: w.c.map(v => v * GRID), move: 20, sight: 20, light: 20, sound: 0,
    door: w.gate ? 1 : 0, ds: w.gate ? 2 : 0, flags: {[MODULE_ID]: {netWall: true, netGate: w.gate}}}));
  await scene.createEmbeddedDocuments("Wall", walls);
  const toks = [];
  for ( const ice of model.ice ) {
    const a = await iceActor(ice.program);
    const td = (await a.getTokenDocument({x: ice.x * GRID, y: ice.y * GRID})).toObject();
    td.flags = foundry.utils.mergeObject(td.flags ?? {}, {[MODULE_ID]: {netIceId: ice.id}});
    td.name = `${ice.label} (${ice.strength})`;
    toks.push(td);
  }
  if ( toks.length ) await scene.createEmbeddedDocuments("Token", toks);
  await ChatMessage.create({whisper: gmIds(), speaker: {alias: "The Net"}, content: card(`A data fortress: ${model.name}`,
    `<p>${model.cpus} CPU${model.cpus === 1 ? "" : "s"}: Intelligence ${model.intelligence}, Computer 5. Data walls ${model.wall}; ${model.gates.length} code gate${model.gates.length === 1 ? "" : "s"} (${model.gates.map(g => g.strength).join(", ")}).</p>
     <p>${model.memories.length} memories, ${model.memories.reduce((s2, m) => s2 + m.files.length, 0)} files. ICE: ${esc(model.ice.map(i => i.label).join(", "))}.</p>
     <p>Remotes: ${esc(model.remotes.map(r => r.label + (r.link ? " (tied)" : "")).join(", ")) || "none"}.${real ? ` Tied to ${esc(real.name)}.` : ""}</p>
     ${model.mind ? `<p><b>An artificial intelligence.</b> ${esc(model.mind.personality)}; toward runners: ${esc(model.mind.reaction)}; its icon: ${esc(model.mind.icon)}.</p>` : ""}
     ${model.virtual ? `<p>A virtual reality inside: ${esc(model.virtual.kind)}, ${esc(model.virtual.realism)}.</p>` : ""}
     <p class="wodx-quiet">The Fast Fortress tables, Cyberpunk 2020 pdf 168-169, halved into dots.</p>`)});
  return scene;
}

/** Tie each remote to a real thing on the Realspace scene: doors and gates, lights, an alarm, the camera, the rest to the scene. */
function tieRemotes(model, real) {
  const doors = (real.walls?.contents ?? []).filter(w => w.door);
  const elec = doors.filter(w => (w.flags?.["wodx-interactables"]?.electronic ?? "none") !== "none");
  const pool = [...elec, ...doors.filter(w => !elec.includes(w))];
  let di = 0;
  for ( const r of model.remotes ) {
    if ( r.kind === "door" || r.kind === "elevator" ) { const w = pool[di++]; r.link = w ? {scene: real.id, wall: w.id} : null; }
    else r.link = {scene: real.id};
  }
  // every system can work the lights of the building it runs (house rule, B6599)
  if ( (real.lights?.size ?? 0) && !model.remotes.some(r => r.kind === "lights") ) model.remotes.push({id: `rem${model.remotes.length + 1}`, kind: "lights", label: N.REMOTES.lights.label, x: model.box.x1 - 1, y: model.box.y0 + 1, link: {scene: real.id}});
}

/* ------------------------------------------------------------------ */
/*  Jacking in and out                                                */
/* ------------------------------------------------------------------ */

const iconOf = (actor, scene) => (scene?.tokens?.contents ?? []).find(t => t.flags?.[MODULE_ID]?.netIcon === actor.id) ?? null;
const bodyOf = actor => { const s = stateOf(actor)?.body; return s ? fromUuidSync(s) : null; };

/**
 * A runner jacks into a fortress. token: the body's token; scene: the fortress; way: an ACCESS key; deck: a DECKS key
 * (Future Net); programs: program ids carried. Rolls the way in where it needs one; on success the body keeps the
 * Jacked in status and an icon token appears at the fortress's link.
 */
export async function jackInto(token, scene, {way = null, deck = "standard", programs = []} = {}) {
  const a = token?.actor;
  if ( !a ) throw new Error("Select the runner's token first.");
  if ( !isFortress(scene) ) throw new Error("Pick a data fortress.");
  const kind = netKindNow();
  if ( !kind ) throw new Error(`There is no Net to enter before ${N.WEB_FROM}.`);
  const tech = T.technica(a);
  const ways = N.waysFor(kind, tech);
  const w = ways.includes(way) ? way : ways[0];
  if ( a.flags?.[MODULE_ID]?.netRun?.fortress ) throw new Error(`${a.name} is already in the Net.`);
  const spheres = Object.fromEntries((a.items?.contents ?? []).filter(i => /sphere/i.test(i.type) || i.system?.sphere).map(i => [String(i.name).toLowerCase(), num(i.system?.value)]));
  const sph = {...spheres, ...Object.fromEntries(["correspondence", "life", "forces", "prime"].map(k => [k, Math.max(spheres[k] ?? 0, num(a.system?.spheres?.[k]?.value ?? a.system?.spheres?.[k]))]))};
  if ( !N.hasSpheres(w, sph) ) throw new Error(`${N.ACCESS[w].label} needs ${Object.entries(N.ACCESS[w].spheres).map(([k, v]) => `${k} ${v}`).join(", ")}.`);
  const roll = N.accessRoll(w, {dataSphere: false});
  const lines = [];
  if ( roll ) {
    const pool = at(a, "intelligence") + ab(a, "computer");
    let got = 0, tries = 0;
    do {
      const r = await d10(pool); tries++;
      const t = N.tally(r.dice, roll.diff);
      lines.push(`Intelligence + Computer ${pool} at ${roll.diff} ${diceLine(r.dice)}: ${t.successes}${t.botch ? ", a botch" : ""}.`);
      if ( t.botch ) { got = -1; break; }
      got += t.successes;
    } while ( roll.extended && got < roll.need && tries < 10 );
    if ( got < roll.need ) {
      await ChatMessage.create({speaker: ChatMessage.getSpeaker({token}), whisper: whisperFor(a), content: card(`${a.name} fails to get in`, `<p>${lines.join("<br>")}</p><p>${got < 0 ? "A botch: the Web throws the mage back, and Paradox follows a vulgar attempt." : `${Math.max(0, got)} of ${roll.need} successes.`}</p>`)});
      return null;
    }
  }
  // Technica (B6604-B6611): Ghost in the Machine needs no deck (the mind holds what a standard deck would);
  // Technical Touch rolls Perception + Computer, and with no Computer its successes stand in.
  const ghost = !!N.ACCESS[w].ghost;
  if ( ghost ) deck = "standard";
  const D = N.DECKS[deck] ?? N.DECKS.standard;
  const load = kind === "deck" ? N.loadOut(deck, programs) : {loaded: programs.filter(p => N.PROGRAMS[p]), over: [], used: 0};
  const touch = kind === "deck" ? await T.touchRoll(a) : 0;
  if ( tech >= 2 && kind === "deck" ) lines.push(`Technical Touch: ${touch} success${touch === 1 ? "" : "es"}${!ab(a, "computer") && touch ? `, standing in for Computer ${touch}` : ""}.`);
  const m = modelOf(scene);
  const hounded = a.statuses?.has("net-hounded");
  await a.setFlag(MODULE_ID, "netRun", {fortress: scene.id, way: w, deck: kind === "deck" && !ghost ? deck : null, programs: load.loaded, touch, tech, body: token.uuid ?? token.document?.uuid, at: game.time.worldTime, hidden: 0});
  if ( !a.statuses?.has(STATUS.net.id) ) await a.toggleStatusEffect(STATUS.net.id, {active: true});
  // the icon: the character's own token, lit in the Net's phosphor (B2992), at the long distance link
  const src = (token.document ?? token).toObject();
  delete src._id; delete src.level;
  src.x = m.entry.x * GRID; src.y = m.entry.y * GRID; src.hidden = false;
  src.texture = {...(src.texture ?? {}), tint: PH};
  src.light = {dim: 2, bright: 0.5, color: PH, alpha: 0.4};
  src.flags = foundry.utils.mergeObject(src.flags ?? {}, {[MODULE_ID]: {netIcon: a.id}}, {inplace: false});
  const [icon] = await scene.createEmbeddedDocuments("Token", [src]);
  await ChatMessage.create({speaker: {alias: "The Net"}, whisper: whisperFor(a), content: card(`${a.name} jacks in`,
    `${lines.length ? `<p>${lines.join("<br>")}</p>` : ""}<p>${esc(N.ACCESS[w].label)} into <b>${esc(scene.name)}</b>.${N.ACCESS[w].diff ? ` Every roll in the Net is +${N.ACCESS[w].diff} difficulty.` : ""}${N.ACCESS[w].mental ? " Intelligence stands for Strength and Wits for Dexterity." : ""}</p>
     ${ghost ? "<p>No deck: the mind itself is the icon, and the system's machines obey it without a roll.</p>" : ""}
     ${kind === "deck" && !ghost ? `<p>${esc(D.label)}: speed ${D.speed} (${N.deckActions(D.speed)} action${N.deckActions(D.speed) === 1 ? "" : "s"} a turn), ${D.mu} MU, walls ${D.walls}. Loaded: ${esc(load.loaded.map(p => N.PROGRAMS[p]?.label).join(", ")) || "nothing"}${load.over.length ? `; no room for ${esc(load.over.map(p => N.PROGRAMS[p]?.label).join(", "))}` : ""}.</p>` : ""}
     <p class="wodx-quiet">The body lies still where it was, the icon walks the fortress. ${kind === "deck" ? "Cyberpunk 2020 pdf 131-178 by World of Future Darkness." : "Mage 20th printed pp. 466-474."}</p>`)});
  if ( icon && scene.id === canvas?.scene?.id ) canvas.ping?.({x: icon.x + GRID / 2, y: icon.y + GRID / 2}, {color: PH});
  if ( hounded ) await houndStrikes(a, scene, icon);
  return icon;
}

/** A runner jacks out (by choice, or thrown out). force: even when a status forbids it (a cut line, a hard de-rez). */
export async function jackOut(actor, {force = false, why = ""} = {}) {
  const s = stateOf(actor);
  if ( !s ) { if ( actor?.statuses?.has(STATUS.net.id) ) await actor.toggleStatusEffect(STATUS.net.id, {active: false}); return true; }
  if ( !force && !N.canAct(statusIds(actor)).jackOut ) { ui.notifications.warn(`${actor.name} cannot jack out yet.`); return false; }
  const scene = game.scenes.get(s.fortress);
  const icon = iconOf(actor, scene);
  if ( icon ) await icon.delete();
  await actor.unsetFlag(MODULE_ID, "netRun");
  for ( const id of ["net-frozen", "net-trapped", "net-spazzed", "net-deck-down", "net-deck-murphy", "net-deck-slow"] ) await dropStatus(actor, id);
  if ( actor.statuses?.has(STATUS.net.id) ) await actor.toggleStatusEffect(STATUS.net.id, {active: false});
  await ChatMessage.create({speaker: {alias: "The Net"}, whisper: whisperFor(actor), content: card(`${actor.name} jacks out`, `<p>${esc(why || "Back in the body.")}</p>`)});
  return true;
}

/* ------------------------------------------------------------------ */
/*  The runner's actions                                              */
/* ------------------------------------------------------------------ */

const runnerParts = actor => {
  const s = stateOf(actor) ?? {};
  const progs = s.programs ?? [];
  const best = cls => progs.filter(p => N.PROGRAMS[p]?.cls === cls).reduce((m, p) => Math.max(m, N.programDots(p)), 0);
  const D = N.DECKS[s.deck] ?? null;
  return {s, progs, best, D, access: s.way ?? "sensory", extra: N.statusDiff(statusIds(actor))};
};

/** The runner's program against a defence: rolls both sides. defence: dots; label: what it is against. */
async function runContest(actor, program, defence, label) {
  const m = modelOf(game.scenes.get(stateOf(actor)?.fortress));
  const {access, extra} = runnerParts(actor);
  const pd = N.programDots(program);
  const runner = {computer: N.touchComputer(ab(actor, "computer"), stateOf(actor)?.touch), program: pd, access, extra};
  const ra = await d10(runner.computer + runner.program), sa = await d10((m?.intelligence ?? 3) + num(defence));
  const c = N.contest(runner, {intelligence: m?.intelligence ?? 3, defence}, ra.dice, sa.dice);
  return {c, rolls: [ra.roll, sa.roll].filter(Boolean), line: `${esc(N.PROGRAMS[program]?.label ?? program)}: Computer + ${pd} = ${c.runnerPool} dice at ${c.runnerDiff} ${diceLine(ra.dice)}, ${c.runner}; the system's Intelligence + ${num(defence)} = ${c.systemPool} at 6 ${diceLine(sa.dice)}, ${c.system} (${esc(label)}).`};
}

/**
 * Run a program. actor: the runner; program: an id they carry; target: a gate id, an ICE token, a file id, a remote id,
 * or nothing (stealth, detection). Returns what happened.
 */
export async function runProgram(actor, program, target = null, {text = ""} = {}) {
  const s = stateOf(actor);
  if ( !s ) throw new Error(`${actor?.name ?? "That character"} is not in the Net.`);
  const can = N.canAct(statusIds(actor));
  if ( !can.act ) throw new Error(`${actor.name} cannot act.`);
  if ( !can.programs && netKindNow() === "deck" ) throw new Error(`${actor.name}'s deck is down.`);
  let pid = program;
  if ( actor.statuses?.has("net-deck-murphy") ) pid = s.programs[Math.floor(Math.random() * s.programs.length)] ?? program;
  if ( !s.programs.includes(pid) && netKindNow() === "deck" ) throw new Error(`${actor.name} does not carry ${N.PROGRAMS[pid]?.label ?? pid}.`);
  const P = N.PROGRAMS[pid];
  const scene = game.scenes.get(s.fortress), m = modelOf(scene);
  const icon = iconOf(actor, scene);
  const out = {program: pid, lines: [], rolls: []};
  if ( pid !== program ) out.lines.push(`The deck runs wild: ${esc(P.label)} runs instead.`);
  // breaking a gate or the wall
  if ( (P.hit === "wall" || P.hit === "decrypt") && typeof target === "string" && target.startsWith("gate") ) {
    const g = m.gates.find(x => x.id === target);
    if ( !g ) throw new Error("No such gate.");
    const def = P.hit === "decrypt" && P.vsGate ? g.strength : g.strength;
    const {c, rolls, line} = await runContest(actor, pid, def, `gate strength ${g.strength}`);
    out.rolls.push(...rolls); out.lines.push(line);
    if ( c.win ) {
      const b = N.breach(g.strength, c.margin + (P.vsGate ? 1 : 0));
      g.strength = b.left;
      if ( b.open ) { g.open = true; await openGateWall(scene, g.id); out.lines.push(`<b>The gate opens.</b>`); }
      else out.lines.push(`The gate weakens to ${b.left}.`);
    } else out.lines.push(c.botch ? "A botch: the system notices." : "The gate holds.");
    if ( P.hit === "wall" ) { const d = (await d10(1)).dice[0]; if ( N.alarmSounds(pid, d) || c.botch ) await raiseAlarm(scene, actor, `${P.label} was heard`); }
    else if ( c.botch ) await raiseAlarm(scene, actor, "a botched decryption");
    await scene.setFlag(MODULE_ID, "netFortress", m);
  }
  // decrypting a locked file
  else if ( P.hit === "decrypt" && typeof target === "string" && m.memories.some(mm => mm.files.some(f => f.id === target)) ) {
    const f = m.memories.flatMap(x => x.files).find(x => x.id === target);
    if ( !f ) throw new Error("No such file.");
    const {c, rolls, line} = await runContest(actor, pid, f.lock, `file lock ${f.lock}`);
    out.rolls.push(...rolls); out.lines.push(line);
    if ( c.win ) { f.locked = false; out.lines.push(`<b>${esc(f.label)} is open.</b>`); await scene.setFlag(MODULE_ID, "netFortress", m); }
    else out.lines.push("The file stays locked.");
  }
  // fighting ICE
  else if ( P.hit === "antiIce" || ["persona", "body", "mind", "status", "deck"].includes(P.hit) ) {
    const tok = target?.documentName === "Token" ? target : (scene.tokens.get(target) ?? null);
    const ice = tok ? m.ice.find(i => i.id === tok.flags?.[MODULE_ID]?.netIceId) : null;
    if ( !ice ) throw new Error("Target a piece of ICE first.");
    const {c, rolls, line} = await runContest(actor, pid, ice.strength, `${ice.label} strength ${ice.strength}`);
    out.rolls.push(...rolls); out.lines.push(line);
    if ( c.win ) {
      const k = N.antiIce(ice.strength, c.margin);
      ice.strength = k.left;
      if ( k.derezzed ) { ice.up = false; out.lines.push(`<b>${esc(ice.label)} is de-rezzed.</b>`); await tok.update({hidden: true}); }
      else { out.lines.push(`${esc(ice.label)} drops to ${k.left}.`); await tok.update({name: `${ice.label} (${k.left})`}); }
      await scene.setFlag(MODULE_ID, "netFortress", m);
      if ( tok.object ) canvas.ping?.(tok.object.center, {color: "#ff4040"});
    } else out.lines.push(`${esc(ice.label)} holds.`);
    if ( !m.alarm ) await raiseAlarm(scene, actor, "a fight with its ICE");
  }
  // hiding
  else if ( P.hit === "hide" ) {
    const dogs = m.ice.filter(i => i.up && (N.PROGRAMS[i.program]?.hit === "detect" || ["bloodhound", "pitbull"].includes(i.program)));
    const def = dogs.reduce((mx, i) => Math.max(mx, i.strength), 0);
    const {c, rolls, line} = await runContest(actor, pid, def, "its best watchdog");
    out.rolls.push(...rolls); out.lines.push(line);
    await actor.setFlag(MODULE_ID, "netRun", {...s, hidden: c.win ? c.margin : 0});
    if ( icon ) await icon.update({alpha: c.win ? 0.35 : 1});
    out.lines.push(c.win ? `<b>Hidden</b> (by ${c.margin}): the ICE does not see the icon until it acts openly.` : "Seen.");
  }
  // detection the runner carries: what is near
  else if ( P.hit === "detect" ) {
    const seen = m.ice.filter(i => i.up && icon && N.dist(i, {x: icon.x / GRID, y: icon.y / GRID}) <= N.SIGHT);
    out.lines.push(`Within ${N.SIGHT} squares: ${esc(seen.map(i => `${i.label} (${i.strength})`).join(", ")) || "no ICE"}.`);
    for ( const i of seen ) { const t = scene.tokens.find(x => x.flags?.[MODULE_ID]?.netIceId === i.id); if ( t?.hidden && game.user.isGM ) await t.update({hidden: false}); }
  }
  // working a remote
  else if ( P.hit === "control" ) {
    const r = m.remotes.find(x => x.id === target);
    if ( !r ) throw new Error("Pick a remote.");
    if ( !P.works.includes(r.kind) && !(r.kind === "lights" && pid === "genie") && !(r.kind === "alarm" && ["genie", "opensesame"].includes(pid)) ) throw new Error(`${P.label} cannot work a ${r.label.toLowerCase()}.`);
    if ( s.way === "ghost" ) { out.lines.push("The machine obeys the ghost inside it."); out.lines.push(await workRemote(actor, r, scene, text)); }
    else {
      const {c, rolls, line} = await runContest(actor, pid, 0, r.label);
      out.rolls.push(...rolls); out.lines.push(line);
      if ( c.win ) out.lines.push(await workRemote(actor, r, scene, text));
      else out.lines.push("It does not answer.");
    }
  }
  else out.lines.push(`${esc(P.label)} runs.`);
  // acting openly ends hiding
  if ( s.hidden && P.hit !== "hide" ) { await actor.setFlag(MODULE_ID, "netRun", {...stateOf(actor), hidden: 0}); if ( icon ) await icon.update({alpha: 1}); }
  await T.machineUsed(actor);
  await ChatMessage.create({speaker: {alias: actor.name}, rolls: out.rolls, whisper: whisperFor(actor), content: card(`${actor.name} runs ${P.label}`, `<p>${out.lines.join("</p><p>")}</p>`)});
  if ( iceAuto() ) await iceRound(scene);
  return out;
}

async function openGateWall(scene, gateId) {
  const ws = scene.walls.filter(w => w.flags?.[MODULE_ID]?.netGate === gateId);
  if ( ws.length ) await scene.updateEmbeddedDocuments("Wall", ws.map(w => ({_id: w.id, ds: 1})));
}

/** The fortress raises its alarm: every piece of ICE hunts, and the tied building's alarm sounds (B6599). */
async function raiseAlarm(scene, actor, why) {
  const m = modelOf(scene);
  if ( !m || m.alarm ) return;
  m.alarm = true;
  await scene.setFlag(MODULE_ID, "netFortress", m);
  for ( const t of scene.tokens.filter(x => x.flags?.[MODULE_ID]?.netIceId) ) if ( t.object ) canvas.ping?.(t.object.center, {color: "#ffd040"});
  const real = m.link ? game.scenes.get(m.link) : null;
  try { if ( real ) game.modules.get("wodx-interactables")?.api?.mapEvent?.("alarm", {scene: real, noise: "loud", object: "alarm", extra: {how: "the Net"}}); } catch (e) { console.warn("WoDX | Net alarm", e); }
  await ChatMessage.create({speaker: {alias: "The Net"}, whisper: gmIds(), content: card(`${m.name}: the alarm`, `<p>${esc(why)}. Every piece of ICE now hunts${actor ? ` ${esc(actor.name)}` : ""}.${real ? ` The alarm sounds in ${esc(real.name)}.` : ""}</p>`)});
}

/** A remote obeys (B6599): the thing it is tied to changes on the Realspace scene. Returns the line for the card. */
async function workRemote(actor, r, scene, text = "") {
  const real = r.link?.scene ? game.scenes.get(r.link.scene) : null;
  const where = real ? ` in ${esc(real.name)}` : "";
  const does = N.REMOTES[r.kind]?.does;
  if ( does === "door" && real && r.link.wall ) {
    const w = real.walls.get(r.link.wall);
    if ( w ) {
      const open = w.ds !== 1;
      await w.update({ds: open ? 1 : 0, [`flags.wodx-interactables.locked`]: false});
      return `<b>The ${esc(r.label.toLowerCase())}${where} ${open ? "unlocks and opens" : "closes"}.</b>`;
    }
  }
  if ( does === "lights" && real ) {
    const ls = real.lights.contents;
    const off = ls.some(l => !l.hidden);
    await real.updateEmbeddedDocuments("AmbientLight", ls.map(l => ({_id: l.id, hidden: off})));
    return `<b>The lights${where} go ${off ? "out" : "on"}.</b>`;
  }
  if ( does === "camera" && real ) {
    const was = real.flags?.["wodx-chronicle"]?.camera;
    await real.update({"flags.wodx-chronicle.camera": was === false ? null : false});
    return `<b>The cameras${where} ${was === false ? "watch again" : "go blind"}.</b> ${was === false ? "" : "Nothing seen there is recorded while they are off."}`;
  }
  if ( does === "alarm" && real ) {
    const m = modelOf(scene);
    const was = !!m.alarm;
    m.alarm = !was;
    await scene.setFlag(MODULE_ID, "netFortress", m);
    if ( !was ) await raiseAlarm(scene, null, `${actor.name} set off the building's alarm`);
    return was ? "<b>The alarm is silenced.</b> The ICE goes back to its posts." : `<b>The alarm sounds${where}.</b>`;
  }
  if ( does === "message" && real ) {
    if ( text ) {
      await real.createEmbeddedDocuments("Drawing", [{x: Math.round(real.width / 2 - 300), y: GRID, shape: {type: "r", width: 600, height: 120}, fillType: 1, fillColor: "#001010", fillAlpha: 0.8, strokeColor: PH, strokeWidth: 4,
        text: String(text).slice(0, 80), fontSize: 40, textColor: PH, flags: {[MODULE_ID]: {netBoard: true}}}]);
      return `<b>The videoboard${where} shows:</b> ${esc(text)}.`;
    }
    return "The videoboard waits.";
  }
  if ( does === "listen" && real ) {
    const here = real.tokens.filter(t => !t.hidden && t.actor).map(t => t.name);
    return `<b>The microphone${where} picks up:</b> ${esc(here.join(", ")) || "silence"}.`;
  }
  if ( does === "vehicle" && real ) {
    const v = real.tiles.filter(t => t.flags?.["wodx-interactables"]?.mount);
    return v.length ? `<b>${esc(actor.name)} has the controls of ${esc(v.map(t => t.flags["wodx-interactables"].title || "a vehicle").join(", "))}${where}</b>: the Storyteller moves it at the runner's word.` : "No vehicle answers.";
  }
  return `The ${esc(r.label.toLowerCase())}${where} obeys.`;
}

/**
 * Read or copy a file in an adjacent memory (B6598). copy: take it (money moves, a secret is learned); read: only the
 * card. A locked file needs a decryption first.
 */
export async function takeFile(actor, fileId, {copy = true} = {}) {
  const s = stateOf(actor);
  if ( !s ) throw new Error(`${actor?.name} is not in the Net.`);
  const scene = game.scenes.get(s.fortress), m = modelOf(scene);
  const mem = m.memories.find(x => x.files.some(f => f.id === fileId));
  const f = mem?.files.find(x => x.id === fileId);
  if ( !f ) throw new Error("No such file.");
  const icon = iconOf(actor, scene);
  if ( icon && N.dist({x: icon.x / GRID, y: icon.y / GRID}, mem) > 1 ) throw new Error("Stand next to that memory first.");
  if ( f.locked ) throw new Error("That file is locked: run a decryption program at it first.");
  if ( f.taken && copy ) throw new Error("Already taken.");
  const g = N.fileGives(f.kind, (await d10(1)).dice[0]);
  const lines = [`<b>${esc(f.label)}</b>.`];
  const owner = m.owner ? game.actors.get(m.owner) : null;
  const real = m.link ? game.scenes.get(m.link) : null;
  if ( copy && g.gives === "money" ) {
    const money = st()?.upkeep?.money;
    const region = (() => { try { return game.settings.get("wodx-storyteller", "moneyRegion") || "moravian"; } catch (e) { return "moravian"; } })();
    const amount = Math.round(g.wages * num(money?.rules?.wageAt?.(year(), region) ?? 100));
    if ( money?.receive && game.user.isGM ) await money.receive(actor, amount, {note: g.fenced ? `Paydata from ${m.name}, sold to a fence` : `Moved out of ${m.name}`});
    lines.push(`${g.fenced ? "Paydata, sold to a fence" : "A transfer out"}: <b>${esc(money?.format?.(amount) ?? amount)}</b> into ${esc(actor.name)}'s purse.`);
    if ( g.heat ) { try { await chron()?.law?.heat?.add?.(actor, g.heat, {scene: real ?? canvas?.scene, named: false, witnesses: 0}); lines.push("The money is missed: the law looks for a thief."); } catch (e) { console.warn("WoDX | Net heat", e); } }
  }
  if ( copy && (g.gives === "secret" || g.gives === "lead") ) {
    const api = npc()?.secrets;
    let holder = owner;
    if ( g.of === "anyone" && real ) { const ns = real.tokens.filter(t => t.actor && !t.actor.hasPlayerOwner).map(t => t.actor); holder = ns[Math.floor(Math.random() * ns.length)] ?? owner; }
    if ( api && holder && game.user.isGM ) {
      const known = new Set(api.knownBy(actor).map(k => k.secret.id));
      let sec = (api.of(holder) ?? []).find(x => !known.has(x.id));
      if ( !sec && g.gives === "secret" ) sec = await api.add(holder, {kind: g.kind, text: f.kind === "blackops" ? `Black operations kept in ${m.name}` : `Grey operations kept in ${m.name}`, weight: g.weight});
      if ( sec ) { await api.reveal(holder, sec.id, actor, {how: `from ${m.name} in the Net`}); lines.push(`A secret of ${esc(holder.name)}: the Ledger holds a hook for it.`); }
      else lines.push(`Nothing about ${esc(holder.name)} that ${esc(actor.name)} does not know.`);
    } else lines.push(holder ? "The Storyteller tells what it holds." : "Nobody's name stands on it: the Storyteller tells what it holds.");
  }
  if ( copy ) { f.taken = true; await scene.setFlag(MODULE_ID, "netFortress", m); }
  await ChatMessage.create({speaker: {alias: actor.name}, whisper: whisperFor(actor), content: card(`${actor.name} ${copy ? "copies" : "reads"} a file`, `<p>${lines.join("</p><p>")}</p>`)});
  if ( copy && iceAuto() ) await iceRound(scene);
  return g;
}

/* ------------------------------------------------------------------ */
/*  The ICE's turn (B6596, B6597)                                     */
/* ------------------------------------------------------------------ */

/** Runners in a fortress, as the rules want them. */
function runnersIn(scene) {
  return scene.tokens.filter(t => t.flags?.[MODULE_ID]?.netIcon).map(t => {
    const a = game.actors.get(t.flags[MODULE_ID].netIcon);
    return {id: a?.id, x: Math.round(t.x / GRID), y: Math.round(t.y / GRID), hidden: num(stateOf(a)?.hidden) > 0, token: t, actor: a};
  }).filter(r => r.actor);
}

/** One Net turn for the fortress's ICE: each piece sees, moves, attacks. Active GM only. */
export async function iceRound(scene = canvas?.scene) {
  if ( !isActiveGM() || !isFortress(scene) ) return null;
  const m = modelOf(scene);
  const runners = runnersIn(scene);
  for ( const r of runners ) await tickTimers(r.actor);
  const lines = [];
  const reaction = m.mind?.reaction ?? (m.alarm ? "kill" : "neutral");
  for ( const ice of m.ice ) {
    if ( !ice.up ) continue;
    const tok = scene.tokens.find(t => t.flags?.[MODULE_ID]?.netIceId === ice.id);
    // Spiritus ex Machina: a runner the system has made peace with goes unseen while the alarm is quiet
    const live = runnersIn(scene).map(r => !m.alarm && (m.parley ?? []).includes(r.id) ? {...r, hidden: true} : r);
    const plan = N.iceTurn(ice, live, {alarm: m.alarm, reaction: m.alarm ? "kill" : reaction});
    const target = live.find(r => r.id === plan.target);
    if ( plan.act === "move" && tok ) {
      ice.x = plan.to.x; ice.y = plan.to.y;
      await tok.update({x: ice.x * GRID, y: ice.y * GRID});
      lines.push(`${esc(ice.label)} moves toward ${esc(target?.actor?.name)}.`);
    } else if ( plan.act === "alarm" ) {
      await raiseAlarm(scene, target?.actor, `${ice.label} found ${target?.actor?.name}`);
      lines.push(`${esc(ice.label)} finds ${esc(target?.actor?.name)} and raises the alarm.`);
    } else if ( plan.act === "report" ) {
      lines.push(`${esc(ice.label)} reports ${esc(target?.actor?.name)} to the system's owners.`);
      await addStatus(target?.actor, "net-traced");
    } else if ( plan.act === "talk" ) {
      lines.push(`The system speaks to ${esc(target?.actor?.name)} through ${esc(ice.label)}, asking what is wanted.`);
    } else if ( plan.act === "attack" && target ) {
      lines.push(await iceAttack(scene, m, ice, tok, target));
    }
  }
  await scene.setFlag(MODULE_ID, "netFortress", m);
  if ( lines.length ) await ChatMessage.create({speaker: {alias: m.name}, whisper: gmIds().concat(...runners.map(r => owners(r.actor))), content: card(`${m.name}: the ICE acts`, `<p>${lines.join("</p><p>")}</p>`)});
  return lines;
}

/** A piece of ICE attacks a runner: Net combat (WoFD), then what that ICE does. */
async function iceAttack(scene, m, ice, tok, r) {
  const a = r.actor, P = N.PROGRAMS[ice.program];
  const {best, access, s, D} = runnerParts(a);
  const shield = best("protection");
  const sideI = {intelligence: m.intelligence, computer: 5, program: ice.strength};
  const sideR = {intelligence: at(a, "intelligence"), computer: ab(a, "computer"), program: Math.max(best("antiice"), 0)};
  const ri = await d10(sideI.intelligence + sideI.computer), rr = await d10(sideR.intelligence + sideR.computer);
  const iS = N.tally(ri.dice, 6).successes + sideI.program, rS = N.tally(rr.dice, 6 + (N.ACCESS[access]?.diff ?? 0)).successes + sideR.program;
  if ( tok?.object ) canvas.ping?.(tok.object.center, {color: "#ff4040"});
  if ( iS <= rS ) return `${esc(ice.label)} strikes at ${esc(a.name)} and misses (${iS} to ${rS}).`;
  const dmgDice = iS - rS;
  const dr = await d10(dmgDice), sr = await d10(at(a, "wits") + shield + (D?.armor ?? 0));
  const levels = Math.max(0, N.tally(dr.dice, 6).successes - N.tally(sr.dice, 6).successes - (s.programs?.includes("armor") ? 1 : 0));
  const turns = await rollFormula(P.turns ?? P.hours ?? 0);
  const reflected = (s.programs ?? []).includes("reflector") ? N.PROGRAMS.reflector.turns : [];
  const hit = N.iceHit(ice.program, {levels, turns, access, reflected});
  return `${esc(ice.label)} gets through to ${esc(a.name)} (${iS} to ${rS}, ${levels} after soak): ${await applyHit(a, hit, {scene, ice, m})}`;
}

/** What a hit does to a runner (B6597): the world reads each of these. Returns the line. */
export async function applyHit(a, hit, {scene, ice, m} = {}) {
  const C = game.wodxCombat;
  const body = bodyOf(a);
  switch ( hit.kind ) {
    case "reflected": return "the Reflector turns it back.";
    case "none": return hit.why === "keyboard" ? "a keyboard runner is out of its reach." : "nothing.";
    case "persona":
      if ( hit.levels && C?.applyDamage ) await C.applyDamage(a, "bashing", hit.levels);
      return hit.levels ? `<b>${hit.levels} bashing</b> on the icon.` : "soaked.";
    case "body":
      if ( hit.levels && C?.applyDamage ) await C.applyDamage(a, hit.type, hit.levels);
      if ( body?.object ) canvas.ping?.(body.object.center, {color: "#ff2020"});
      if ( hit.hound ) await addStatus(a, "net-hounded");
      if ( hit.trace ) await traceRunner(a, m, ice);
      return `${hit.levels ? `<b>${hit.levels} ${hit.type}</b> through the jack to the body` : "the body holds"}${hit.hound ? "; the Hellhound has the scent and will strike again at the next log-on" : ""}.`;
    case "mind": {
      await a.createEmbeddedDocuments("ActiveEffect", [{name: `Net burn: ${hit.points} Intelligence lost`, img: "icons/svg/degen.svg",
        changes: [{key: "system.attributes.intelligence.value", mode: 2, value: String(-hit.points)}],
        flags: {[MODULE_ID]: {netBurn: true, heals: hit.heals}}}]);
      return `<b>${hit.points} Intelligence</b> burned away, healing as ${hit.heals} damage does.`;
    }
    case "status":
      await addStatus(a, hit.status, hit.turns);
      if ( hit.traceAfter && hit.turns >= hit.traceAfter ) await traceRunner(a, m, ice);
      return `<b>${esc(N.STATUSES[hit.status]?.label ?? hit.status)}</b>${hit.hours ? ` for ${hit.hours} hour${hit.hours === 1 ? "" : "s"}` : hit.turns ? ` for ${hit.turns} turn${hit.turns === 1 ? "" : "s"}` : ""}.`;
    case "deck":
      await addStatus(a, hit.status, hit.turns);
      return `<b>${esc(N.STATUSES[hit.status]?.label ?? hit.status)}</b>${hit.turns ? ` for ${hit.turns} turns` : ""}.`;
    case "fire": return await fireAtBody(a, hit.size);
    case "trace": return await traceRunner(a, m, ice);
    case "cut": { const t = await traceRunner(a, m, ice); await jackOut(a, {force: true, why: "The line is cut."}); return `${t} The line is cut.`; }
    case "detect": await raiseAlarm(scene, a, `${ice?.label} found ${a.name}`); return "found.";
    case "antiIce": {
      // anti-IC against a runner de-rezzes one of the programs the deck carries (a Killer any, a Manticore a demon, an Aardvark a worm)
      const st0 = stateOf(a), progs = st0?.programs ?? [];
      const pick = hit.vs === "worm" ? progs.find(p => p === "worm") : hit.vs === "demon" ? progs.find(p => N.DEMONS[p]) : progs[Math.floor(Math.random() * progs.length)];
      if ( !pick ) return "it finds nothing it can kill.";
      await a.setFlag(MODULE_ID, "netRun", {...st0, programs: progs.filter(p => p !== pick)});
      return `<b>${esc(N.PROGRAMS[pick]?.label ?? N.DEMONS[pick]?.label ?? pick)} is de-rezzed</b> out of the deck.`;
    }
    default: return "nothing.";
  }
}

/** Firestarter (pdf 145): an electrical fire bursts from the gear at the body's feet, as an Interactables fire. */
async function fireAtBody(a, size = "small") {
  const body = bodyOf(a);
  const sc = body?.parent;
  if ( !sc ) return "the gear smokes, far from here.";
  const g = num(sc.grid?.size) || 100, n = size === "large" ? 2 : 1;
  await sc.createEmbeddedDocuments("Tile", [{x: body.x - (n - 1) * g / 2, y: body.y - (n - 1) * g / 2, width: n * g, height: n * g, texture: {src: null},
    flags: {"wodx-interactables": {hazard: true, hazardKind: "fire", size, heat: "torch", burning: true, title: "An electrical fire", roomMade: true}}}]);
  return `<b>the deck bursts into flame</b> at ${esc(a.name)}'s side in ${esc(sc.name)}.`;
}

/** A trace (B6600): the hound's dots + a die against the route's trace + a die; traced, the law knows where the runner sits. */
async function traceRunner(a, m, ice) {
  const route = N.routeTrace(m?.route ?? ["eurotheatre", "sovspace"]);
  const [x, y] = [(await d10(1)).dice[0], (await d10(1)).dice[0]];
  if ( !N.traced(ice?.strength ?? 2, route, x, y) ) return "The trace loses the line in the links.";
  await addStatus(a, "net-traced");
  const body = bodyOf(a);
  try { await chron()?.law?.heat?.add?.(a, "break", {scene: body?.parent ?? canvas?.scene, named: true, witnesses: 1}); } catch (e) { console.warn("WoDX | Net trace", e); }
  return `<b>Traced</b>: the system's owners know where ${esc(a.name)} sits, and the law is told of a break-in.`;
}

/** A Hellhound waits for its runner: at the next log-on it appears beside the icon and strikes. */
async function houndStrikes(a, scene, icon) {
  const m = modelOf(scene);
  const ice = {id: `ice${m.ice.length + 1}`, program: "hellhound", label: "Hellhound", strength: N.programDots("hellhound"), x: Math.round(icon.x / GRID) + 1, y: Math.round(icon.y / GRID), mobile: true, up: true};
  m.ice.push(ice);
  const actor = await iceActor("hellhound");
  const td = (await actor.getTokenDocument({x: ice.x * GRID, y: ice.y * GRID})).toObject();
  td.flags = foundry.utils.mergeObject(td.flags ?? {}, {[MODULE_ID]: {netIceId: ice.id}});
  await scene.createEmbeddedDocuments("Token", [td]);
  await scene.setFlag(MODULE_ID, "netFortress", m);
  await dropStatus(a, "net-hounded");
  const tok = scene.tokens.find(t => t.flags?.[MODULE_ID]?.netIceId === ice.id);
  const line = await iceAttack(scene, m, ice, tok, {actor: a, id: a.id, x: ice.x - 1, y: ice.y, token: icon});
  await ChatMessage.create({speaker: {alias: "The Net"}, whisper: whisperFor(a), content: card("The Hellhound was waiting", `<p>${line}</p>`)});
}

/* ------------------------------------------------------------------ */
/*  Whiteout and de-rez (B6601, B6602)                                */
/* ------------------------------------------------------------------ */

/** Storyteller: a mage's Paradox in the Web brings a Whiteout. pool: the Paradox pool; heavy: Forces or Prime thrown about. */
export async function whiteout(actor, {pool = 5, heavy = false} = {}) {
  const s = stateOf(actor), scene = game.scenes.get(s?.fortress);
  if ( !scene ) throw new Error(`${actor?.name} is not in the Web.`);
  const r = await d10(pool), t = N.tally(r.dice, N.whiteoutDiff({heavy}));
  const sev = N.whiteoutSeverity(t.successes), lasts = N.whiteoutLasts(pool);
  const lines = [`Paradox ${pool} at ${N.whiteoutDiff({heavy})} ${diceLine(r.dice)}: ${t.successes}.`];
  // the white flash over the sector
  try {
    const [flash] = await scene.createEmbeddedDocuments("Drawing", [{x: 0, y: 0, shape: {type: "r", width: scene.width, height: scene.height}, fillType: 1, fillColor: "#ffffff", fillAlpha: 0.85, strokeWidth: 0, flags: {[MODULE_ID]: {netWhiteout: true}}}]);
    if ( flash ) setTimeout(() => flash.delete().catch(() => null), 4000);
  } catch (e) { console.warn("WoDX | Whiteout flash", e); }
  const others = runnersIn(scene).filter(x => x.actor.id !== actor.id);
  const icon = iconOf(actor, scene);
  const near = d => others.filter(o => icon && N.dist(o, {x: icon.x / GRID, y: icon.y / GRID}) * 5 <= d);
  const hitOthers = sev.reach === "sector" ? others : typeof sev.reach === "number" ? near(sev.reach) : [];
  if ( N.lagWarns(pool) && others.length ) lines.push("The sector lags first: everyone else nearby has one action to drop out (Wits + Computer at 8).");
  if ( sev.self ) lines.push(`${esc(actor.name)}: ${await derezNow(actor, sev.self === "soft" ? "soft" : "hard")}`);
  if ( sev.others ) for ( const o of hitOthers ) lines.push(`${esc(o.actor.name)}: ${await derezNow(o.actor, sev.others)}`);
  if ( sev.down ) { await scene.setFlag(MODULE_ID, "netDown", {until: lasts === null ? null : game.time.worldTime + lasts}); lines.push(lasts === null ? "<b>The sector is trashed for good.</b>" : `<b>The sector goes down</b> for ${lasts < 3600 ? `${Math.round(lasts / 60) || 1} minute(s)` : lasts < DAY ? `${Math.round(lasts / HOUR)} hours` : `${Math.round(lasts / DAY)} days`}.`); }
  await ChatMessage.create({speaker: {alias: "The Web"}, rolls: r.roll ? [r.roll] : [], content: card("A Whiteout", `<p>${lines.join("</p><p>")}</p><p class="wodx-quiet">Mage 20th printed pp. 470-473.</p>`)});
  return sev;
}

/** A de-rez now (M20 p. 472-473): soft boots the icon to the link and hurts; hard throws the runner out. */
export async function derezNow(actor, kind = "soft") {
  const s = stateOf(actor);
  const access = s?.way ?? "sensory";
  const C = game.wodxCombat;
  const sev = Math.max(1, Math.ceil(Math.random() * 3));
  const soak = await d10(at(actor, "stamina")), sta = await d10(at(actor, "stamina"));
  const res = N.derez(kind, {access, severity: sev, soakDice: soak.dice, staminaDice: sta.dice});
  if ( res.levels && C?.applyDamage ) await C.applyDamage(actor, res.type, res.levels);
  if ( res.dazed ) await addStatus(actor, "net-dazed", 1200);
  if ( res.mind ) await actor.createEmbeddedDocuments("ActiveEffect", [{name: `Net shock: ${res.mind} Intelligence`, img: "icons/svg/stoned.svg",
    changes: [{key: "system.attributes.intelligence.value", mode: 2, value: String(-res.mind)}], flags: {[MODULE_ID]: {netBurn: true, heals: res.mindHeals}}}]);
  if ( res.out ) await jackOut(actor, {force: true, why: "Thrown out of the Net (a hard de-rez)."});
  else if ( s ) {
    const scene = game.scenes.get(s.fortress), icon = iconOf(actor, scene), m = modelOf(scene);
    if ( icon && m ) await icon.update({x: m.entry.x * GRID, y: m.entry.y * GRID});
  }
  return `${kind === "soft" ? "a soft de-rez" : "a hard de-rez"}: ${res.levels ? `${res.levels} ${res.type}` : "no harm"}${res.mind ? `, ${res.mind} Intelligence lost` : ""}.`;
}

/* ------------------------------------------------------------------ */
/*  The Net window                                                    */
/* ------------------------------------------------------------------ */

const opts = (list, sel) => list.map(([v, l]) => `<option value="${esc(v)}"${v === sel ? " selected" : ""}>${esc(l)}</option>`).join("");

/** The Net window: jack in, run programs, take files, work remotes; the Storyteller draws fortresses and runs the ICE. */
export async function netWindow() {
  const kind = netKindNow();
  if ( !kind ) { ui.notifications.warn(`There is no Net before ${N.WEB_FROM}.`); return null; }
  const tok = canvas?.tokens?.controlled?.[0]?.document ?? null;
  const iconFor = tok?.flags?.[MODULE_ID]?.netIcon;
  const runner = iconFor ? game.actors.get(iconFor) : tok?.actor ?? null;
  const s = stateOf(runner);
  const forts = game.scenes.filter(isFortress);
  const here = s ? game.scenes.get(s.fortress) : null, m = modelOf(here);
  const tgt = [...(game.user.targets ?? [])][0]?.document ?? null;
  const progs = s ? (kind === "deck" ? s.programs : Object.keys(N.PROGRAMS)) : [];
  const files = m ? m.memories.flatMap(mm => mm.files.map(f => [f.id, `${mm.id}: ${f.label}${f.locked ? " (locked)" : ""}${f.taken ? " (taken)" : ""}`])) : [];
  const remotes = m ? m.remotes.map(r => [r.id, `${r.label}${r.link?.wall || r.link?.scene ? " (tied)" : ""}`]) : [];
  const gates = m ? m.gates.map(g => [g.id, `${g.id} on the ${g.side} side: ${g.open ? "open" : `strength ${g.strength}`}`]) : [];
  const scenes = game.scenes.filter(x => !isFortress(x)).map(x => [x.id, x.name]);
  const gm = game.user.isGM;
  const tech = T.technica(runner);
  const techRows = tech && kind === "deck" ? `<fieldset><legend>Technica ${tech}</legend>
      <p class="hint">${esc(Object.entries(N.TECHNICA).filter(([lv]) => Number(lv) <= tech).map(([, t]) => `${t.label}: ${t.gives}`).join(" "))}</p>
      ${!s && tech >= 4 ? `<div class="form-group"><label>Remote Touch works</label><select name="touchwhat" data-fixed>${opts([["door", "the nearest keypad door"], ["lights", "the lights"], ["vehicle", "a vehicle"]])}</select></div>` : ""}
    </fieldset>` : "";
  const content = `<p class="wodx-quiet">${kind === "deck" ? "The Net (Future Darkness): cyberdecks and data fortresses." : "The Digital Web."} ${runner ? `Runner: ${esc(runner.name)}${s ? `, in ${esc(here?.name)}` : ""}.` : "Select the runner's token."}${tgt ? ` Targeted: ${esc(tgt.name)}.` : ""}</p>
    ${!s ? `<fieldset><legend>Jack in</legend>
      <div class="form-group"><label>Data fortress</label>${searchBox("select[name=fort]")}<select name="fort">${opts(forts.map(f => [f.id, f.name]), canvas?.scene?.id)}</select></div>
      <div class="form-group"><label>Way in</label><select name="way" data-fixed>${opts(N.waysFor(kind, tech).map(k => [k, N.ACCESS[k].label]))}</select></div>
      ${kind === "deck" ? `<div class="form-group"><label>Deck</label><select name="deck" data-fixed>${opts(Object.entries(N.DECKS).map(([k, d]) => [k, `${d.label} (speed ${d.speed}, ${d.mu} MU)`]))}</select></div>
      <div class="form-group"><label>Programs</label>${searchBox("select[name=progs]")}<select name="progs" multiple size="8">${opts(Object.entries(N.PROGRAMS).filter(([, p]) => !p.ice || p.cls === "antiice" || p.cls === "antipersonnel").map(([k, p]) => [k, `${p.label} (${N.programDots(k)}, ${p.mu} MU)`]))}</select></div>` : ""}
    </fieldset>` : `<fieldset><legend>In the Net</legend>
      <div class="form-group"><label>Program</label>${searchBox("select[name=prog]")}<select name="prog">${opts(progs.map(p => [p, `${N.PROGRAMS[p]?.label} (${N.programDots(p)})`]))}</select></div>
      <div class="form-group"><label>At a gate</label><select name="gate" data-fixed><option value="">-</option>${opts(gates)}</select></div>
      <div class="form-group"><label>At a file</label>${searchBox("select[name=file]")}<select name="file"><option value="">-</option>${opts(files)}</select></div>
      <div class="form-group"><label>At a remote</label><select name="remote" data-fixed><option value="">-</option>${opts(remotes)}</select></div>
      <div class="form-group"><label>A videoboard shows</label><input type="text" name="text" maxlength="80"></div>
      <p class="hint">Run the program at the targeted ICE, the gate, the file or the remote picked; with none picked, a stealth or detection program runs on its own.</p>
    </fieldset>`}
    ${gm ? `<fieldset><legend>Storyteller</legend>
      <div class="form-group"><label>New fortress: seed, CPUs (0 rolls)</label><input type="number" name="seed" placeholder="random"><input type="number" name="cpus" value="0" min="0" max="7"></div>
      <div class="form-group"><label>Its building</label>${searchBox("select[name=link]")}<select name="link"><option value="">none</option>${opts(scenes, canvas?.scene && !isFortress(canvas.scene) ? canvas.scene.id : "")}</select></div>
      <div class="form-group"><label>Its owner</label>${searchBox("select[name=owner]")}<select name="owner"><option value="">nobody named</option>${opts(game.actors.filter(x => !x.flags?.[MODULE_ID]?.netIce).map(x => [x.id, x.name]))}</select></div>
      <div class="form-group"><label>Whiteout: Paradox pool</label><input type="number" name="paradox" value="5" min="1" max="30"><label><input type="checkbox" name="heavy"> Forces or Prime</label></div>
    </fieldset>` : ""}${techRows}`;
  const buttons = [];
  if ( !s && runner ) buttons.push({action: "jack", label: "Jack in", default: true});
  if ( s ) buttons.push({action: "run", label: "Run program", default: true}, {action: "read", label: "Read file"}, {action: "copy", label: "Copy file"}, {action: "out", label: "Jack out"});
  if ( kind === "deck" && s && tech >= 3 && ["net-deck-dead", "net-deck-down"].some(x => runner.statuses?.has(x)) ) buttons.push({action: "empower", label: "Empower Device"});
  if ( kind === "deck" && s && tech >= 5 ) buttons.push({action: "speak", label: "Speak with the machine"});
  if ( kind === "deck" && !s && tech >= 4 && tok ) buttons.push({action: "remote", label: "Remote Touch"});
  if ( gm ) buttons.push({action: "draw", label: "Draw a fortress"}, {action: "ice", label: "ICE acts"});
  if ( gm && s && kind === "web" ) buttons.push({action: "white", label: "Whiteout"});
  buttons.push({action: "close", label: "Close"});
  const read = (e, b) => { const f = b.form.elements; const o = {}; for ( const x of f ) if ( x.name ) o[x.name] = x.type === "checkbox" ? x.checked : x.multiple ? [...x.selectedOptions].map(q => q.value) : x.value; return o; };
  const r = await foundry.applications.api.DialogV2.wait({classes: ["wodx", "wodx-dialog", "wodx-net"], window: {title: "The Net"}, position: {width: 560}, rejectClose: false, content,
    buttons: buttons.map(b => ({...b, callback: (e, btn) => ({act: b.action, ...read(e, btn)})}))});
  if ( !r || r.act === "close" ) return null;
  try {
    if ( r.act === "jack" ) return await call("jack", {token: tok.uuid, scene: r.fort, way: r.way, deck: r.deck, programs: r.progs ?? []});
    if ( r.act === "out" ) return await call("out", {actor: runner.id});
    if ( r.act === "empower" ) return await call("empower", {actor: runner.id});
    if ( r.act === "speak" ) return await call("speak", {actor: runner.id});
    if ( r.act === "remote" ) return await call("remote", {actor: runner.id, token: tok.uuid, what: r.touchwhat});
    if ( r.act === "run" ) return await call("run", {actor: runner.id, program: r.prog, target: r.gate || r.file || r.remote || tgt?.id || null, text: r.text});
    if ( r.act === "read" || r.act === "copy" ) return await call("file", {actor: runner.id, file: r.file, copy: r.act === "copy"});
    if ( r.act === "draw" ) { const sc = await drawFortress({seed: r.seed, cpus: r.cpus, link: r.link || null, owner: r.owner || null}); await sc.view(); return sc; }
    if ( r.act === "ice" ) return await iceRound(here ?? canvas?.scene);
    if ( r.act === "white" ) return await whiteout(runner, {pool: num(r.paradox), heavy: !!r.heavy});
  } catch (err) { ui.notifications.warn(err.message); }
  return null;
}

/* ------------------------------------------------------------------ */
/*  The Storyteller's hands: a player's Net actions run on the active Storyteller's client */
/* ------------------------------------------------------------------ */

const CHANNEL = `module.${MODULE_ID}`;
async function perform(op, d, userId) {
  const user = game.users.get(userId);
  const actor = d.actor ? game.actors.get(d.actor) : null;
  if ( actor && user && !user.isGM && !actor.testUserPermission(user, "OWNER") ) throw new Error("Not that player's character.");
  if ( op === "jack" ) {
    const t = await fromUuid(d.token);
    if ( user && !user.isGM && !t?.actor?.testUserPermission(user, "OWNER") ) throw new Error("Not that player's character.");
    const icon = await jackInto(t, game.scenes.get(d.scene), d);
    if ( icon && user && !user.isGM ) game.socket.emit("pullToScene", d.scene, user.id);
    return !!icon;
  }
  if ( op === "out" ) return jackOut(actor);
  if ( op === "run" ) return runProgram(actor, d.program, d.target, {text: d.text});
  if ( op === "file" ) return takeFile(actor, d.file, {copy: d.copy});
  if ( op === "empower" ) return T.empower(actor);
  if ( op === "speak" ) { const sc = game.scenes.get(stateOf(actor)?.fortress); return T.speak(actor, sc, modelOf(sc), mm => sc.setFlag(MODULE_ID, "netFortress", mm)); }
  if ( op === "remote" ) { const t = await fromUuid(d.token); if ( t?.actor?.id !== actor?.id ) throw new Error("Not that character's token."); return T.remoteTouch(t, d.what); }
  return null;
}
/** Run an action here when this is the active Storyteller, else ask that client to. */
async function call(op, d) {
  if ( isActiveGM() ) { const r = await perform(op, d, game.user.id); if ( op === "jack" && r?.parent ) await r.parent.view(); return r; }
  if ( !game.users.activeGM ) throw new Error("No Storyteller is here to run the Net.");
  game.socket.emit(CHANNEL, {type: "net", op, d, user: game.user.id});
  return true;
}
/** Active Storyteller: answer a player's Net action. */
export async function onNetMessage(msg) {
  if ( msg?.type !== "net" || !isActiveGM() ) return;
  try { await perform(msg.op, msg.d ?? {}, msg.user); }
  catch (err) { await ChatMessage.create({whisper: [msg.user, ...gmIds()], speaker: {alias: "The Net"}, content: card("The Net", `<p>${esc(err.message)}</p>`)}); }
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                             */
/* ------------------------------------------------------------------ */

export function setupNet() {
  // A runner's icon moving in a fortress gives the ICE its turn (when the ICE acts on its own)
  const soon = (() => { const t = new Map(); return scene => { clearTimeout(t.get(scene.id)); t.set(scene.id, setTimeout(() => iceRound(scene).catch(e => console.error("WoDX | ICE", e)), 400)); }; })();
  Hooks.on("updateToken", (doc, change) => {
    if ( !isActiveGM() || !("x" in change || "y" in change) || !doc.flags?.[MODULE_ID]?.netIcon || !isFortress(doc.parent) ) return;
    if ( iceAuto() ) soon(doc.parent);
  });
  // A combat round in a fortress is a Net turn
  Hooks.on("updateCombat", (combat, change) => {
    if ( !isActiveGM() || !("round" in change) || !isFortress(combat.scene) ) return;
    iceRound(combat.scene).catch(e => console.error("WoDX | ICE", e));
  });
  // Jacking out by the old button (or the status) takes the icon away too
  Hooks.on("deleteActiveEffect", e => {
    if ( !isActiveGM() || !e.statuses?.has?.(STATUS.net.id) ) return;
    const a = e.parent;
    if ( stateOf(a) ) jackOut(a, {force: true, why: "Jacked out."}).catch(err => console.error("WoDX | Net", err));
  });
}
