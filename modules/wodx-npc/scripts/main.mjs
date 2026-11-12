/**
 * WoDX NPC (the version is in module.json): NPC profiles and combat tactics (Phase 7b); routines, places and reactions (Phase 7c, routines.mjs);
 * factions, faction turns, hunting grounds and Masquerade rumours (Phase 7d, factions.mjs); followers who take orders (0.8.0, orders.mjs);
 * the topic menu players talk to NPCs through (0.10.0, talk.mjs), with stock talk by era and regard (0.11.0); each NPC's attitude toward each character (0.12.0, attitude.mjs); more stock talk, remarks and cries (0.14.0); fights that start by themselves on sight, on alarm and when an NPC turns hostile (0.15.0, fight-rules.mjs); natural rivalries between kinds of NPC by line and era (0.18.0, rivalry.mjs); passers-by and animals of the year who walk through a scene (0.25.0, passersby.mjs); relationships, the lineage tree, secrets and why an NPC feels as they do (0.37.0, people.mjs).
 *
 * On each combat turn of an NPC with no player owner, the active Storyteller's client weighs what the NPC could do
 * (npc-rules.mjs) and, by the mode in force (the NPC's own, else the scene's, else the world's):
 *   Suggest: whispers the Storyteller a plan, with an Accept button for each option;
 *   Auto:    carries out the best option it can (move, attack, flee, full defence), then whispers a card with Undo;
 *            an option that needs the Storyteller's roll or choice (frenzy, a power, Willpower, calling for help)
 *            stops it and the card becomes a suggestion;
 *   Off:     nothing.
 * Attacks go through WoDX Combat's quick attack (every automatic choice), so the dice and the rules are Combat's own.
 */
import * as NR from "./npc-rules.mjs";
import * as RR from "./routine-rules.mjs";
import * as AN from "./animal-rules.mjs";
import * as MR from "./mortal-rules.mjs";
import * as SR from "./supernatural-rules.mjs";
import {build as buildRoutines} from "./routines.mjs";
import {build as buildFactions} from "./factions.mjs";
import {build as buildFounding} from "./founding.mjs";
import * as OR from "./order-rules.mjs";
import {build as buildOrders} from "./orders.mjs";
import * as Faces from "./faces.mjs";
import {build as buildTalk} from "./talk.mjs";
import {VOICES} from "../data/stock-talk-more.mjs";
import {build as buildAttitude} from "./attitude.mjs";
import {build as buildRivalry} from "./rivalry.mjs";
import {build as buildPassersby} from "./passersby.mjs";
import {build as buildPeople} from "./people.mjs";
import * as RV from "./rivalry-rules.mjs";
import * as PO from "./politics-rules.mjs";
import * as AR from "./alert-rules.mjs";
import {registerCondition} from "../../wodx-chronicle/scripts/conditions.mjs";

const MOD = "wodx-npc";
const VERSION = "0.40.2";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const num = v => Number(v) || 0;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const C = () => game.wodxCombat;
const A = () => game.wodxActions;
const chron = () => game.modules.get("wodx-chronicle")?.api;
const setting = k => game.settings.get(MOD, k);
const isActiveGM = () => game.user.isGM && (game.users.activeGM ? game.users.activeGM.id === game.user.id : true);

/* ------------------------------------------------------------------ */
/*  Settings and profiles                                              */
/* ------------------------------------------------------------------ */

function registerSettings() {
  game.settings.register(MOD, "mode", {
    name: "NPCs in combat", hint: "What NPCs with no player owner do on their turn, unless the scene or the NPC says otherwise.",
    scope: "world", config: true, type: String, default: "suggest", choices: NR.MODES
  });
  game.settings.register(MOD, "gridless", {
    name: "Move NPCs on gridless scenes", hint: "On a scene with no grid, NPCs walk a square lattice of the scene's grid size, round walls, as on a square grid.",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(MOD, "householdReach", {
    name: "A household's call, in yards", hint: "How far a hurt NPC's cry reaches the rest of their household on the scene. Beyond it, an Alert zone carries the alarm.",
    scope: "world", config: true, type: Number, default: 40, range: {min: 5, max: 200, step: 5}
  });
  game.settings.register(MOD, "options", {
    name: "Options on the card", hint: "How many of the NPC's options the Storyteller's card lists.",
    scope: "world", config: true, type: Number, default: 4, range: {min: 1, max: 8, step: 1}
  });
}

/** The line, generation and fighting Abilities WoDX reads to pick a template. */
function infoOf(actor) {
  const s = actor.system ?? {};
  const ab = k => num(s.abilities?.[k]?.value);
  let sides = [];
  try { sides = rivalry?.sidesOf?.(actor)?.own ?? []; } catch (e) { sides = []; }
  return {kind: C()?.getKind?.(actor) ?? "mortal", generation: num(s.generation) || 13,
    melee: Math.max(ab("brawl"), ab("melee")), ranged: Math.max(ab("firearms"), ab("archery")), sides, animal: animalOf(actor), mortal: mortalOf(actor), where: whereNow()};
}
/**
 * NPC 0.24.0 (B1011): the year, era and region archetypes check. A scene's region is its flag wodx-npc.region,
 * else WoDX Storyteller's money region; Moravia when neither says.
 */
function whereNow() {
  let era = null, region = null;
  try { era = chron()?.eras?.activeEra?.()?.profile?.id ?? null; } catch (e) { era = null; }
  try { region = canvas?.scene?.getFlag?.(MOD, "region") ?? game.settings.get("wodx-storyteller", "moneyRegion") ?? null; } catch (e) { region = null; }
  return {year: yearNow(), era, region: region || "moravian"};
}
/** NPC 0.23.0 (B1008): a mortal's archetype from the actor flag wodx-npc.archetype, else a guess from the name. */
function mortalOf(actor) {
  try {
    const own = actor?.getFlag?.(MOD, "archetype");
    if ( MR.MORTALS[own] ) return own;
    return MR.guessMortal(actor?.token?.name ?? actor?.name);
  } catch (e) { return null; }
}
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 0; } catch (e) { return 0; } };
/**
 * NPC 0.21.0 (B1003): the animal archetype of a beast. A passers-by animal reads its token's flag (they share one
 * hidden actor); else the actor's own flag; else a guess from the name ("Old Mastiff" is a guard dog).
 */
function animalOf(actor) {
  try {
    const pb = actor?.token?.getFlag?.(MOD, "passerby");
    if ( pb?.archetype && AN.ANIMALS[pb.archetype] ) return pb.archetype;
    // passerby.animal is true for an animal and passerby.kind names it (dog, cat, rat, bird, pig, goat, geese, horse, cattle)
    const crowdKind = pb?.animal === true ? pb.kind : typeof pb?.animal === "string" ? pb.animal : null;
    if ( crowdKind ) return AN.forCrowd(crowdKind, {year: yearNow(), kind: canvas?.scene?.getFlag?.(MOD, "place")?.kind ?? null});
    const own = actor?.getFlag?.(MOD, "animal");
    if ( AN.ANIMALS[own] ) return own;
    return AN.guessAnimal(actor?.token?.name ?? actor?.name);
  } catch (e) { return null; }
}
export function savedProfile(actor) { return actor?.getFlag(MOD, "behavior") ?? {}; }
export function profileFor(actor, {phases = true} = {}) {
  const saved = savedProfile(actor);
  const p = NR.profileOf(saved, NR.templateFor(infoOf(actor)));
  if ( !phases || !String(saved.phases ?? "").trim() ) return p;
  const W = chron()?.when;
  if ( !W?.check ) return p;
  return NR.withPhase(p, NR.phaseNow(NR.parsePhases(saved.phases).phases, when => W.check(when, {actor}).ok));
}
export function modeFor(actor, scene = canvas.scene) {
  return NR.modeOf({npc: savedProfile(actor).mode, scene: scene?.getFlag(MOD, "mode"), world: setting("mode")});
}

/* ------------------------------------------------------------------ */
/*  The fight as the NPC sees it                                       */
/* ------------------------------------------------------------------ */

const wounds = actor => {
  const ct = C()?.corpusTrack?.(actor);
  const d = ct?.damage ?? actor?.system?.health?.damage ?? {};
  return num(d.bashing) + num(d.lethal) + num(d.aggravated);
};
const cardsNow = () => (game.messages?.contents ?? []).slice(-400).map(m => m.getFlag?.("wodx-combat", "data")).filter(Boolean);
const hiddenByObfuscate = tok => !!tok.actor?.statuses?.has?.("wodx-obfuscated") || !!chron()?.conditions?.hasCondition?.(tok.actor, "obfuscated");
const hidden = tok => tok.document.hidden || tok.actor?.statuses?.has?.("invisible") || hiddenByObfuscate(tok);
const supernatural = actor => (C()?.getKind?.(actor) ?? "mortal") !== "mortal";
/**
 * 0.33.0 (B1380): a fighter goes for "the monster" only once it can tell one: plainly inhuman, shown by a sense, or
 * seen for what it is. Without the rivalry senses (a load error) it falls back to the sheet's kind.
 */
const canTell = (tok, t) => { try { return !!rivalry.tells(tok, t).tells; } catch (e) { return supernatural(t.actor); } };
/** Plainly inhuman to a mortal eye: a spirit or ghost that shows itself, a war form, or a body twisted by a power. */
const OBVIOUS_EFFECT = /crinos|hispo|glabro|shape of the beast|horrid form|vicissitude|tenebrous form|wings|bestial|monstrous/i;
const obvious = actor => ["spirit", "wraith"].includes(C()?.getKind?.(actor)) || [...(actor?.effects ?? [])].some(e => OBVIOUS_EFFECT.test(e.name ?? ""))
  || !!actor?.getFlag?.(MOD, "obvious");
/** What in an enemy's hands or soul an NPC may fear. */
function fearSources(actor) {
  const out = new Set();
  for ( const i of actor?.items ?? [] ) {
    const n = String(i.name ?? "").toLowerCase();
    if ( /torch|fire|flame|burning|incendiar|molotov/.test(n) ) out.add("fire");
    if ( /silver/.test(n) ) out.add("silver");
    if ( /true faith/.test(n) ) out.add("faith");
  }
  if ( num(actor?.system?.advantages?.faith?.permanent) > 0 ) out.add("faith");
  if ( [...(actor?.effects ?? [])].some(e => /crinos|hispo/i.test(e.name ?? "")) ) out.add("crinos");
  // NPC 0.21.0: animals shy from the restless dead (Ben, 2026-11-12), not from Kindred
  if ( C()?.getKind?.(actor) === "wraith" ) out.add("wraith");
  return [...out];
}
/** Enemies of a token: the other side by disposition; a neutral NPC's enemies are only those who hurt it. */
function sides(tok, combat, harm) {
  const me = tok.document.disposition;
  const D = CONST.TOKEN_DISPOSITIONS;
  const myHarm = harm.get(tok.actor?.uuid) ?? new Map();
  // In a fight, the combatants; outside one (a plan asked for from the token HUD), everyone on the scene
  const fighters = combat?.combatants?.size
    ? combat.combatants.contents.filter(c => c.token?.object && c.tokenId !== tok.id && !c.isDefeated).map(c => c.token.object)
    : canvas.tokens.placeables.filter(t => t.id !== tok.id && t.actor);
  const sideMap = combat?.getFlag?.("wodx-combat", "sides") ?? null;
  const enemy = t => {
    const bySide = RV.enemiesBySide(sideMap, tok.id, t.id);
    if ( bySide !== null ) return bySide;
    const d = t.document.disposition;
    if ( me === D.NEUTRAL || me === D.SECRET ) return myHarm.has(t.actor?.uuid);
    if ( d === D.NEUTRAL || d === D.SECRET ) return myHarm.has(t.actor?.uuid);
    return d !== me;
  };
  const ally = t => (RV.enemiesBySide(sideMap, tok.id, t.id) === false) || (RV.enemiesBySide(sideMap, tok.id, t.id) === null && t.document.disposition === me);
  return {enemies: fighters.filter(enemy), allies: fighters.filter(t => !enemy(t) && ally(t))};
}
const unitsPerYard = () => 1 / (C()?.auto?.toYards?.(1, canvas.scene?.grid?.units ?? "ft") ?? 1 / 3);
const yardsBetween = (a, b) => {
  try { return canvas.grid.measurePath([a.center, b.center]).distance / unitsPerYard(); } catch (e) { return null; }
};

/** NPC 0.18.0: mortals near the fight who are not in it, for the masquerade tactic. */
function witnessesOf(tok, combat) {
  const inFight = new Set((combat?.combatants?.contents ?? []).map(c => c.tokenId));
  return canvas.tokens.placeables.filter(t => t.actor && t.id !== tok.id && !inFight.has(t.id) && !t.document.hidden
    && (C()?.getKind?.(t.actor) ?? "mortal") === "mortal" && (yardsBetween(tok, t) ?? 99) <= 30).length;
}
/** NPC 0.18.0: is the NPC on a place its faction holds (the scene, as WoDX NPC factions hold places)? */
function onOwnGround(actor) {
  try {
    const st = factions?.state?.(), holder = st && canvas?.scene ? st.factions.find(f => (f.places ?? []).includes(canvas.scene.uuid)) : null;
    const id = actor?.isToken ? (actor.baseActor?.id ?? actor.id) : actor?.id;
    return !!holder && ((holder.members ?? []).includes(id) || holder.leader === id);
  } catch (e) { return false; }
}

/** NPC 0.21.0: an animal is on its own ground on the scene (or in a region of it) its routine calls home. */
function animalAtHome(actor) {
  try {
    if ( !AN.ANIMALS[profileFor(actor).template] ) return false;
    const roles = routines.routineOf(actor?.isToken ? (actor.baseActor ?? actor) : actor)?.roles ?? {};
    const here = new Set([canvas.scene?.uuid, ...(canvas.scene?.regions?.contents ?? []).map(r => r.uuid)]);
    return ["home", "yard", "wilds"].some(k => roles[k] && here.has(roles[k]));
  } catch (e) { return false; }
}
const monthNow = () => { try { return routines.describer()(game.time.worldTime)?.month ?? null; } catch (e) { return null; } };

/** state for NR.scoreOptions, and the tokens behind the ids. */
export function readFight(tok, combat = game.combat) {
  const actor = tok.actor, s = actor.system ?? {}, adv = s.advantages ?? {};
  const harm = NR.harmLog(cardsNow(), combat?.id);
  const {enemies, allies} = sides(tok, combat, harm);
  const myHarm = harm.get(actor.uuid) ?? new Map();
  const lineage = actor.flags?.["wodx-creation"]?.lineage;
  const domitorId = lineage?.domitor?.id ?? null;
  // NPC 0.38.0: a follower guards every character it serves (B1800), as a ghoul guards its domitor
  const masters = OR.servesFrom(actor.flags);
  const plans = new Map();
  const E = enemies.map(t => {
    let plan = null;
    try { plan = C().bestAttack(actor, t.actor, {}, {attackerTok: tok, targetTok: t}); } catch (e) { /* no plan */ }
    plans.set(t.id, plan);
    const best = plan?.best;
    return {id: t.id, name: t.name, visible: !hidden(t), distance: yardsBetween(tok, t),
      reach: !!best && !plan.ignoredDistance && !best.w?.ranged, ranged: !!best?.w?.ranged && !plan.ignoredDistance,
      hurtMe: myHarm.get(t.actor?.uuid) ?? 0, wounds: wounds(t.actor), supernatural: canTell(tok, t), obvious: obvious(t.actor),
      fearSources: fearSources(t.actor), attackDice: best?.atkDice ?? 0,
      hurtByAllies: [...(harm.get(t.actor?.uuid)?.keys?.() ?? [])].some(u => allies.some(a => a.actor?.uuid === u)),
      alone: !enemies.some(o => o.id !== t.id && (yardsBetween(t, o) ?? 99) <= 5)};
  });
  const AL = allies.map(t => {
    const hurt = harm.get(t.actor?.uuid) ?? new Map();
    return {id: t.id, name: t.name, hurt: [...hurt.values()].reduce((a, b) => a + b, 0), isDomitor: (!!domitorId && t.actor?.id === domitorId) || masters.includes(t.actor?.id),
      attackerIds: enemies.filter(e => hurt.has(e.actor?.uuid)).map(e => e.id)};
  });
  const inFight = new Set((combat?.combatants?.contents ?? []).map(c => c.tokenId));
  const offstage = canvas.tokens.placeables.filter(t => t.id !== tok.id && !inFight.has(t.id) && t.actor && !t.actor.hasPlayerOwner
    && t.document.disposition === tok.document.disposition && !t.document.hidden);
  const visiblePlans = E.filter(e => e.visible).map(e => plans.get(e.id)?.best).filter(Boolean);
  // NPC 0.23.0: morale reads who of this NPC's own side is down, and whether a leader is among them
  const fallen = (combat?.combatants?.contents ?? []).filter(c => c.isDefeated && c.tokenId !== tok.id && c.token?.object?.actor
    && (RV.enemiesBySide(combat?.getFlag?.("wodx-combat", "sides") ?? null, tok.id, c.tokenId) === false
      || (RV.enemiesBySide(combat?.getFlag?.("wodx-combat", "sides") ?? null, tok.id, c.tokenId) === null && c.token.disposition === tok.document.disposition)));
  const leaderDown = fallen.some(c => (profileFor(c.token.object.actor).tactics ?? []).includes("lead"));
  const sideDown = fallen.length / (fallen.length + allies.length + 1);
  const surrendered = !!combat && tok.document.getFlag(MOD, "surrendered") === combat.id;
  const kind = C()?.getKind?.(actor) ?? "mortal";
  const state = {
    self: {kind, wounds: wounds(actor), willpower: num(adv.willpower?.temporary), blood: num(adv.bloodpool?.temporary), bloodMax: num(adv.bloodpool?.max),
      selfcontrol: num(adv.virtues?.selfcontrol?.permanent) || 3, rage: num(adv.rage?.temporary), rageMax: num(adv.rage?.permanent),
      hasPowers: actor.items.some(i => i.type === "Power"), inFrenzy: !!s.conditions?.isfrenzy || !!chron()?.conditions?.hasCondition?.(actor, "frenzy"),
      rotschreck: !!chron()?.conditions?.hasCondition?.(actor, "rotschreck"),
      // A Fear keyword from WoDX Actions (Traits With Teeth step 5): the NPC keeps away and flees
      afraid: !!(actor?.effects ?? []).find?.(e => !e.disabled && e.flags?.["wodx-chronicle"]?.timed?.key === "wodx-effect-fear" && e.name === "Afraid"),
      delirious: kind === "mortal" && E.some(e => e.visible && e.fearSources.includes("crinos")), onGround: onOwnGround(actor) || animalAtHome(actor),
      hungry: AN.isHungry(profileFor(actor), monthNow()), surrendered},
    leaderDown, sideDown,
    enemies: E, allies: AL, offstageAllies: offstage.length, witnesses: witnessesOf(tok, combat),
    bestAttackDice: Math.max(0, ...visiblePlans.map(p => p.atkDice ?? 0)),
    canRanged: visiblePlans.some(p => p.w?.ranged)
  };
  return {state, plans, enemies, allies, offstage};
}

/** The options for this NPC's turn, best first, with the target filled in for Willpower and named for the card. */
export function planTurn(tok, combat = game.combat) {
  const actor = tok.actor;
  const profile = profileFor(actor);
  const fight = readFight(tok, combat);
  let options = NR.scoreOptions(profile, fight.state);
  // NPC 0.38.0 (B1804): a follower's standing order (attack that one, hold back, guard, wait)
  options = OR.fightShift(options, actor.flags?.[MOD]?.order);
  // NPC 0.24.0: a Marauder's Quiet picks among what it could do
  if ( profile.erratic && !fight.state.self.surrendered ) options = SR.erraticPick(options, (combat?.round ?? 0) + (tok.id ?? "").length);
  if ( fight.state.self.afraid && !fight.state.self.rotschreck ) options.unshift({action: "flee", score: 98, why: "Afraid: a power has filled them with fear of the caster"});
  if ( fight.state.self.rotschreck ) options.unshift({action: "flee", score: 99, why: "Rötschreck: the Red Fear drives them from fire or sunlight"});
  const topAttack = options.find(o => o.action === "attack" || o.action === "shoot");
  options = options.map(o => {
    const target = o.target ?? (o.action === "willpower" ? topAttack?.target : null);
    const t = target ? canvas.tokens.get(target) : null;
    return {...o, target: target ?? null, label: `${NR.ACTION_LABEL[o.action] ?? o.action}${t ? `: ${t.name}` : ""}`};
  });
  // One line per foe at most: the best way to hurt each
  const seen = new Set();
  options = options.filter(o => { const k = `${o.action}:${o.target ?? ""}`; if ( seen.has(k) ) return false; seen.add(k); return true; });
  return {profile, options, fight};
}

/* ------------------------------------------------------------------ */
/*  Moving on the grid                                                 */
/* ------------------------------------------------------------------ */

/* Square grids anchor a token by its top-left cell (a 2x2 token covers that cell and three more); hex grids by the cell
 * under its centre. Gridless scenes are walked as a square lattice of the scene's grid size. */
const gridKind = () => canvas.grid?.isSquare || canvas.grid?.type === CONST.GRID_TYPES.SQUARE ? "square"
  : (canvas.grid?.isHexagonal || [2, 3, 4, 5].includes(canvas.grid?.type)) ? "hex"
  : (() => { try { return setting("gridless"); } catch (e) { return true; } })() === false ? "none" : "lattice";
/* On a gridless scene WoDX walks a square lattice of the scene's grid size laid over it; walls still stop it (NPC 0.6.0) */
let latticeCache = null;
const grid = () => {
  if ( gridKind() !== "lattice" ) return canvas.grid;
  const size = canvas.scene?.grid?.size || canvas.grid?.size || 100;
  if ( latticeCache?.size !== size ) latticeCache = NR.latticeGrid(size);
  return latticeCache;
};
const squareGrid = () => gridKind() !== "none"; // kept name: "a grid WoDX can walk"
const sizeOf = tok => ({w: Math.max(1, Math.round(tok.document.width)), h: Math.max(1, Math.round(tok.document.height))});
const cellOf = tok => gridKind() === "hex" ? grid().getOffset(tok.center) : grid().getOffset({x: tok.document.x + 1, y: tok.document.y + 1});
/** The cells a token would cover with its anchor at cell c. */
function cellsAt(tok, c) {
  const {w, h} = sizeOf(tok);
  if ( gridKind() === "hex" ) {
    if ( w === 1 && h === 1 ) return [c];
    try {
      const p = topLeftFor(tok, c);
      const offs = tok.document.getOccupiedGridSpaceOffsets?.({x: p.x, y: p.y});
      if ( offs?.length ) return offs.map(o => ({i: o.i, j: o.j}));
    } catch (e) { /* fall through */ }
    return [c];
  }
  const out = [];
  for ( let i = c.i; i < c.i + h; i++ ) for ( let j = c.j; j < c.j + w; j++ ) out.push({i, j});
  return out;
}
/** Where a token's top-left goes for its anchor to sit at cell c. */
function topLeftFor(tok, c) {
  if ( gridKind() === "hex" ) { const m = grid().getCenterPoint(c); return {x: Math.round(m.x - tok.w / 2), y: Math.round(m.y - tok.h / 2)}; }
  return {...grid().getTopLeftPoint(c)};
}
/** The token's centre with its anchor at cell c (for wall tests). */
function centreFor(tok, c) { const p = topLeftFor(tok, c); return {x: p.x + tok.w / 2, y: p.y + tok.h / 2}; }
const footprint = tok => ({...cellOf(tok), ...sizeOf(tok)});
function occupied(except) {
  const set = new Set();
  for ( const t of canvas.tokens.placeables ) {
    if ( t.id === except.id || t.document.hidden ) continue;
    for ( const c of cellsAt(t, cellOf(t)) ) set.add(`${c.i},${c.j}`);
  }
  return set;
}
function wallBetween(a, b, tok) {
  const pa = centreFor(tok, a);
  let pb = centreFor(tok, b);
  // On a gridless scene a wall can run through a lattice cell's centre: a step that ends on it counts as blocked,
  // as Foundry's own move does, so the test runs a few pixels past the centre
  if ( gridKind() === "lattice" ) pb = NR.pastPoint(pa, pb, 3);
  try { if ( typeof tok.checkCollision === "function" ) return !!tok.checkCollision(pb, {origin: pa, type: "move", mode: "any"}); }
  catch (e) { /* fall through */ }
  try {
    const backend = CONFIG.Canvas.polygonBackends?.move;
    if ( backend?.testCollision ) return !!backend.testCollision(pa, pb, {type: "move", mode: "any"});
  } catch (e) { /* none */ }
  return false;
}
function passableFor(tok) {
  const busy = occupied(tok);
  const d = canvas.dimensions;
  const inside = c => { const p = grid().getCenterPoint(c); return p.x >= d.sceneX && p.y >= d.sceneY && p.x < d.sceneX + d.sceneWidth && p.y < d.sceneY + d.sceneHeight; };
  // On a gridless lattice a cell whose centre sits on a wall line is closed, so a path never slides along a wall
  const walls = gridKind() === "lattice" ? [...(canvas.scene?.walls ?? [])].map(w => ({c: w.c, move: w.move, door: w.door, ds: w.ds})) : null;
  const clear = b => !walls || !NR.onWall(centreFor(tok, b), walls);
  // Every cell the token would cover is inside the scene and free, and no wall stands between its centres
  return (a, b) => cellsAt(tok, b).every(c => inside(c) && !busy.has(`${c.i},${c.j}`)) && clear(b) && !wallBetween(a, b, tok);
}
/** Neighbours and step costs for this scene's grid. */
const stepsFor = () => gridKind() === "hex"
  ? (c => (canvas.grid.getAdjacentOffsets?.(c) ?? []).map(o => ({c: {i: o.i, j: o.j}, cost: 1})))
  : NR.squareSteps;
const stepCost = () => gridKind() === "hex" ? (() => 1) : NR.squareCost;
const hexHeuristic = goal => c => { try { return canvas.grid.getDistance?.(grid().getCenterPoint(c), grid().getCenterPoint(goal)) / (canvas.scene.grid.distance || 5) || 0; } catch (e) { return 0; } };
const cellsFor = yards => Math.floor((yards * unitsPerYard()) / (canvas.scene.grid.distance || 5) + 1e-6);

async function walk(tok, path) {
  if ( path.length < 2 ) return false;
  const waypoints = path.slice(1).map(c => topLeftFor(tok, c));
  const doc = tok.document;
  if ( typeof doc.move === "function" ) {
    try { await doc.move(waypoints, {autoRotate: true}); }
    catch (e) { for ( const w of waypoints ) await doc.update(w); }
  } else for ( const w of waypoints ) await doc.update(w);
  try { await tok.movementAnimationPromise; } catch (e) { /* none */ }
  await sleep(250);
  return true;
}

/** Cells where a token could stand beside a foe, nearest first. */
function besideFor(tok, target, start) {
  if ( gridKind() === "hex" ) {
    const own = cellsAt(target, cellOf(target)), key = c => `${c.i},${c.j}`, taken = new Set(own.map(key)), out = new Map();
    for ( const c of own ) for ( const {c: n} of stepsFor()(c) ) if ( !taken.has(key(n)) ) out.set(key(n), n);
    const at = grid().getCenterPoint(start);
    return [...out.values()].sort((a, b) => Math.hypot(grid().getCenterPoint(a).x - at.x, grid().getCenterPoint(a).y - at.y)
      - Math.hypot(grid().getCenterPoint(b).x - at.x, grid().getCenterPoint(b).y - at.y));
  }
  // Square: the ring round the foe, widened by the mover's own size so a large mover's anchor can stand there
  const f = footprint(target), {w, h} = sizeOf(tok);
  return NR.besideCells({i: f.i - (h - 1), j: f.j - (w - 1), w: f.w + (w - 1), h: f.h + (h - 1)}, start);
}

/** The way to a cell beside a foe: {path, cost} (cost in grid steps), or {note} when there is none. */
function approach(tok, target) {
  if ( !squareGrid() ) return {note: "this scene is gridless and WoDX is set not to move NPCs there: move the token by hand"};
  const pass = passableFor(tok), start = cellOf(tok), hex = gridKind() === "hex";
  for ( const goal of besideFor(tok, target, start).slice(0, 8) ) {
    const path = NR.findPath(start, goal, pass, {neighbors: stepsFor(), heuristic: hex ? hexHeuristic(goal) : null});
    if ( path ) return {path, cost: NR.pathCost(path, stepCost())};
  }
  return {note: "no way through to them"};
}

/* ------------------------------------------------------------------ */
/*  Doing it                                                           */
/* ------------------------------------------------------------------ */

function snapshot(tokens) {
  return {
    tokens: tokens.map(t => ({uuid: t.document.uuid, x: t.document.x, y: t.document.y, moved: t.document.getFlag("wodx-combat", "moved") ?? null,
      surrendered: t.document.getFlag(MOD, "surrendered") ?? null})),
    actors: tokens.map(t => {
      const a = t.actor, ct = C()?.corpusTrack?.(a), d = ct?.damage ?? a.system?.health?.damage ?? {};
      return {uuid: a.uuid, damage: {bashing: num(d.bashing), lethal: num(d.lethal), aggravated: num(d.aggravated)},
        willpower: num(a.system?.advantages?.willpower?.temporary), blood: num(a.system?.advantages?.bloodpool?.temporary),
        statuses: [...(a.statuses ?? [])]};
    })
  };
}

async function undo(snap) {
  for ( const s of snap.tokens ?? [] ) {
    const doc = await fromUuid(s.uuid);
    if ( !doc ) continue;
    const upd = {x: s.x, y: s.y};
    await doc.update(upd, {animate: false, wodxMove: false});
    if ( s.moved ) await doc.setFlag("wodx-combat", "moved", s.moved); else await doc.unsetFlag("wodx-combat", "moved");
    if ( s.surrendered ) await doc.setFlag(MOD, "surrendered", s.surrendered); else if ( doc.getFlag(MOD, "surrendered") ) await doc.unsetFlag(MOD, "surrendered");
  }
  for ( const s of snap.actors ?? [] ) {
    const a = await fromUuid(s.uuid);
    if ( !a ) continue;
    await C().setDamage(a, s.damage);
    await a.update({"system.advantages.willpower.temporary": s.willpower, "system.advantages.bloodpool.temporary": s.blood});
    for ( const id of ["unconscious", "dead"] ) if ( a.statuses?.has?.(id) && !s.statuses.includes(id) ) {
      try { await a.toggleStatusEffect(id, {active: false}); } catch (e) { /* none */ }
    }
  }
}

/** Carry out one option. Returns {done, text}. */
async function execute(tok, opt) {
  const actor = tok.actor;
  const target = opt.target ? canvas.tokens.get(opt.target) : null;
  const lim = C().movementFor(actor);
  switch ( opt.action ) {
    case "attack": {
      if ( !target ) return {done: false, text: "The foe is gone."};
      const plan = C().bestAttack(actor, target.actor, {}, {attackerTok: tok, targetTok: target});
      let note = "", path = null;
      if ( !plan.best || plan.ignoredDistance || plan.best.w?.ranged ) {
        const way = approach(tok, target);
        if ( !way.path ) return {done: false, text: `${tok.name} cannot reach ${target.name} (${way.note}).`};
        if ( way.cost > cellsFor(lim.attackAfter) ) {
          // Too far to strike this turn (VtDA20: no attack after moving past half the running speed): run at them
          const part = NR.trimPath(way.path, cellsFor(lim.run), stepCost());
          const moved = await walk(tok, part);
          return {done: moved, path: part, text: moved ? `${tok.name} runs at ${target.name}, too far to strike this turn.` : `${tok.name} cannot move (${lim.note || "no movement left"}).`};
        }
        if ( await walk(tok, way.path) ) { note = `${tok.name} moves in (${way.path.length - 1} squares). `; path = way.path; }
      }
      await C().quickAttack({attacker: tok, target});
      return {done: true, text: `${note}${tok.name} attacks ${target.name}.`, path};
    }
    case "shoot":
    case "willpower": {
      if ( !target ) return {done: false, text: "The foe is gone."};
      if ( opt.action === "willpower" ) { await C().attack({attacker: tok, target}); return {done: true, text: `The attack window is open for ${tok.name}: tick Willpower there.`}; }
      await C().quickAttack({attacker: tok, target});
      return {done: true, text: `${tok.name} shoots at ${target.name}.`};
    }
    case "flee": {
      if ( !squareGrid() ) return {done: false, text: "This scene is gridless and WoDX is set not to move NPCs there: move the token by hand."};
      const foes = readFight(tok).enemies.map(cellOf);
      const map = NR.reachable(cellOf(tok), passableFor(tok), cellsFor(lim.run), {neighbors: stepsFor()});
      const px = c => grid().getCenterPoint(c);
      const cell = NR.fleeCell(map, foes, gridKind() === "hex" ? ((a, b) => Math.hypot(px(a).x - px(b).x, px(a).y - px(b).y)) : undefined);
      const path = cell ? NR.pathTo(cell) : null;
      const moved = path ? await walk(tok, path) : false;
      return {done: moved, path, text: moved ? `${tok.name} flees.` : `${tok.name} has nowhere to run.`};
    }
    case "defend":
      await tok.document.setFlag(MOD, "fullDefense", `${game.combat?.id}:${game.combat?.round}`);
      return {done: true, text: `${tok.name} goes on full defence: every action this turn is a dodge, block or parry (the Storyteller rolls them as they come).`};
    case "frenzy":
      if ( C().getKind(actor) === "lupine" ) await A()?.rageRoll?.({actor});
      else await A()?.frenzy?.({actor});
      return {done: true, text: `Frenzy check for ${tok.name}.`};
    case "power": {
      // The target WoDX Targeting picked goes up first, so the power window's own panel starts on it
      const aim = target ?? canvas.tokens.get(rankPower(tok)?.pick?.id ?? "") ?? null;
      if ( aim ) game.modules.get("wodx-targeting")?.api?.setTargets?.([aim.id]);
      await A()?.menu?.({actor});
      return {done: true, text: `The actions menu is open for ${tok.name}: choose the power${aim ? ` (aimed at ${aim.name}; the target panel can change it)` : ""}.`};
    }
    case "call": {
      const {offstage} = readFight(tok);
      const near = offstage.sort((a, b) => (yardsBetween(tok, a) ?? 1e9) - (yardsBetween(tok, b) ?? 1e9)).slice(0, 2);
      if ( !near.length || !game.combat ) return {done: false, text: "No one answers."};
      const made = await game.combat.createEmbeddedDocuments("Combatant", near.map(t => ({tokenId: t.id, sceneId: t.scene.id, actorId: t.actor?.id})));
      return {done: true, text: `${tok.name} calls for help: ${near.map(t => t.name).join(" and ")} join the fight (they roll initiative next turn).`, added: made.map(c => c.id)};
    }
    case "search": return {done: true, text: `${tok.name} searches for the unseen (Perception + Alertness, or Auspex against Obfuscate: the Storyteller rolls).`};
    case "surrender":
      await tok.document.setFlag(MOD, "surrendered", game.combat?.id ?? "yes");
      return {done: true, text: `${tok.name} throws down their arms and yields. They take no more actions in this fight unless the Storyteller says so.`};
    case "hostage": return {done: true, text: `${tok.name} tries to seize a bystander as a shield (the Storyteller decides who and rolls it).`};
    default: return {done: true, text: `${tok.name} waits.`};
  }
}

/* ------------------------------------------------------------------ */
/*  The Storyteller's card                                             */
/* ------------------------------------------------------------------ */

const H3 = "background:none!important;border:0!important;box-shadow:none!important;color:inherit!important";
function cardHtml({tok, profile, options, mode, result = null, chosen = null, undone = false, waiting = null}) {
  const line = C()?.getKind?.(tok.actor) ?? "";
  const rows = options.map((o, k) => `<li class="wnpc-opt${chosen === k ? " chosen" : ""}"><span class="wnpc-score">${o.score}</span> <b>${esc(o.label)}</b>`
    + `<div class="wodx-quiet">${esc(o.why)}</div>`
    + (result || undone ? "" : `<button type="button" class="wnpc-go" data-k="${k}">${k === 0 ? "Accept" : "Do this instead"}</button>`) + `</li>`).join("");
  const head = mode === "auto" ? (waiting ? "Auto, waiting for the Storyteller" : "Auto") : "Suggestion";
  return `<div class="vta-card wodx-x wnpc wodx-line-${esc(line)}" data-line="${esc(line)}">`
    + `<header class="vta-head"><h3 style="${H3}">${esc(tok.name)}'s turn</h3><span class="vta-verdict">${head}</span></header>`
    + `<div class="vta-body"><p class="wodx-quiet">${esc(profile.label)}${profile.template !== savedProfile(tok.actor).template && !profile.phase ? " (chosen by line)" : ""}${profile.phase ? `, now ${esc(profile.phase)}` : ""}. Flees at ${profile.fleeAt} wound levels.</p>`
    + (waiting ? `<p><b>Needs the Storyteller:</b> ${esc(waiting.label)}. ${esc(waiting.why)}.</p>` : "")
    + `<ol class="wnpc-opts">${rows}</ol>`
    + (result ? `<div class="wnpc-done">${esc(result)}${undone ? " <b>Undone.</b>" : ` <button type="button" class="wnpc-undo">Undo</button>`}</div>` : "")
    + `<div class="wnpc-tools"><button type="button" class="wnpc-edit">Behaviour…</button></div></div></div>`;
}

const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
/** Tell WoDX Combat's turn conductor (3.7) how this NPC's turn went. */
const report = (combatId, combatantId, r) => { if ( combatId && combatantId ) Hooks.callAll("wodxNpcTurnDone", {combatId, combatantId, ...r}); };
const phaseKey = combat => { const f = combat?.getFlag?.("wodx-combat", "conductor"); return f?.phase === "extra" && f?.round === combat.round ? "extra" : "main"; };
/** WoDX Targeting's pick for a power plan, when that module is on and not switched off on this computer. */
function rankPower(tok) {
  const TG = game.modules.get("wodx-targeting");
  if ( !TG?.active || !TG.api?.rules || TG.api.mode?.() === "off" ) return null;
  try { return TG.api.rules.rank(NR.POWER_AIM, TG.api.stateFor(tok.actor, tok)); } catch (e) { return null; }
}
async function postPlan(tok, combat, {profile, options}, mode) {
  let ranked;
  const shown = options.slice(0, setting("options")).map(o => (o.action === "power" ? NR.aimPower(o, ranked ??= rankPower(tok)) : o));
  const flags = {plan: {token: tok.document.uuid, combatId: combat?.id ?? null, round: combat?.round ?? 0, combatant: combat?.combatant?.id ?? null, options: shown, mode}};
  let result = null, chosen = null, waiting = null;
  if ( mode === "auto" ) {
    const pick = NR.autoChoice(shown);
    if ( pick.act ) {
      const k = shown.indexOf(pick.act);
      const snap = snapshot([tok, ...(pick.act.target ? [canvas.tokens.get(pick.act.target)].filter(Boolean) : [])]);
      const r = await execute(tok, pick.act);
      result = r.text; chosen = k;
      flags.plan.done = {k, text: r.text, snap, added: r.added ?? [], path: r.path ?? null};
    } else waiting = pick.needsStoryteller;
  }
  const msg = await ChatMessage.create({speaker: ChatMessage.getSpeaker({token: tok.document}), whisper: gmIds(),
    content: cardHtml({tok, profile, options: shown, mode, result, chosen, waiting}), flags: {[MOD]: flags}});
  if ( mode === "auto" ) report(flags.plan.combatId, flags.plan.combatant, flags.plan.done ? {acted: true} : {waiting: true});
  return msg;
}

async function onCardButton(msg, btn) {
  if ( btn.classList.contains("wnpc-edit") ) {
    const tok = (await fromUuid(msg.getFlag(MOD, "plan")?.token))?.object;
    return tok ? editBehavior(tok.actor) : null;
  }
  if ( btn.classList.contains("wnpc-go") ) return acceptCard(msg, Number(btn.dataset.k));
  if ( btn.classList.contains("wnpc-undo") ) return undoCard(msg);
}

/** Carry out option k of a card (the Accept and "Do this instead" buttons). */
export async function acceptCard(msg, k = 0) {
  if ( !game.user.isGM ) return null;
  msg = typeof msg === "string" ? game.messages.get(msg) : msg;
  const plan = foundry.utils.deepClone(msg?.getFlag(MOD, "plan"));
  const tok = (await fromUuid(plan?.token))?.object;
  if ( !tok ) { ui.notifications.warn("WoDX NPC: the token is not on this scene."); return null; }
  if ( plan.done ) return plan.done;
  const opt = plan.options[k];
  if ( !opt ) return null;
  if ( plan.combatant && game.combat?.combatant?.id !== plan.combatant ) ui.notifications.info(`WoDX NPC: it is no longer ${tok.name}'s turn; doing it anyway.`);
  const snap = snapshot([tok, ...(opt.target ? [canvas.tokens.get(opt.target)].filter(Boolean) : [])]);
  plan.done = {k, text: "…", snap};
  await msg.update({[`flags.${MOD}.plan`]: plan});
  const r = await execute(tok, opt);
  plan.done = {k, text: r.text, snap, added: r.added ?? [], path: r.path ?? null};
  await msg.update({[`flags.${MOD}.plan`]: plan, content: cardHtml({tok, profile: profileFor(tok.actor), options: plan.options, mode: plan.mode, result: r.text, chosen: k})});
  report(plan.combatId, plan.combatant, {acted: true});
  return plan.done;
}

/** Put back what a card did: positions, health, Willpower and blood, and anyone it called into the fight. */
export async function undoCard(msg) {
  if ( !game.user.isGM ) return null;
  msg = typeof msg === "string" ? game.messages.get(msg) : msg;
  const plan = foundry.utils.deepClone(msg?.getFlag(MOD, "plan"));
  if ( !plan?.done || plan.done.undone ) return null;
  await undo(plan.done.snap);
  if ( plan.done.added?.length && game.combat?.id === plan.combatId ) {
    const ids = plan.done.added.filter(id => game.combat.combatants.has(id));
    if ( ids.length ) await game.combat.deleteEmbeddedDocuments("Combatant", ids);
  }
  plan.done.undone = true;
  const tok = (await fromUuid(plan.token))?.object;
  const content = tok ? cardHtml({tok, profile: profileFor(tok.actor), options: plan.options, mode: plan.mode, result: plan.done.text, chosen: plan.done.k, undone: true}) : msg.content;
  await msg.update({[`flags.${MOD}.plan`]: plan, content});
  return plan.done;
}

/* ------------------------------------------------------------------ */
/*  Combat turns                                                       */
/* ------------------------------------------------------------------ */

const NO_ACTION = ["dazed", "incapacitated", "torpor", "staked", "immobilized"];
const handled = new Set();
export async function takeTurn(combat = game.combat, {force = false} = {}) {
  const c = combat?.combatant;
  const tok = c?.token?.object;
  if ( !c || !tok?.actor || c.isDefeated ) return null;
  if ( tok.actor.hasPlayerOwner ) return null;
  if ( tok.scene?.id !== canvas.scene?.id ) return null;
  const key = `${combat.id}:${combat.round}:${c.id}:${phaseKey(combat)}`;
  if ( handled.has(key) && !force ) return null;
  handled.add(key);
  const mode = modeFor(tok.actor);
  if ( mode === "off" ) return null;
  const cond = chron()?.conditions;
  const stuck = NO_ACTION.find(id => cond?.hasCondition?.(tok.actor, id)) ?? (wounds(tok.actor) >= 7 ? "incapacitated" : null);
  if ( stuck ) report(combat.id, c.id, {cannotAct: true});
  if ( stuck ) return ChatMessage.create({speaker: ChatMessage.getSpeaker({token: tok.document}), whisper: gmIds(),
    content: `<div class="vta-card wodx-x wnpc"><header class="vta-head"><h3 style="${H3}">${esc(tok.name)}'s turn</h3></header><div class="vta-body">${esc(tok.name)} cannot act (${esc(cond?.getCondition?.(stuck)?.name ?? stuck)}).</div></div>`});
  const planned = planTurn(tok, combat);
  return postPlan(tok, combat, planned, mode);
}
let timer = null;
function soon(combat) {
  clearTimeout(timer);
  // Initiative and the turn order settle first (WoDX Combat rolls them on these same hooks)
  timer = setTimeout(() => {
    // Never while the game is paused (the X-card pauses it): the turn is taken when play resumes
    if ( game.paused ) { Hooks.once("pauseGame", paused => { if ( !paused ) soon(combat); }); return; }
    takeTurn(combat).catch(e => console.error(`${MOD} |`, e));
  }, 900);
}

/* ------------------------------------------------------------------ */
/*  Behaviour editor                                                   */
/* ------------------------------------------------------------------ */

const FEARS = {fire: "Fire", sunlight: "Sunlight", faith: "True Faith", silver: "Silver", supernatural: "The supernatural", violence: "Violence", crinos: "The Crinos form",
  wraith: "Wraiths"};
const TRAITS = {aggression: "Aggression", caution: "Caution", cunning: "Cunning", loyalty: "Loyalty", cowardice: "Cowardice", berserk: "Berserk", power: "Uses powers",
  herd: "Herd (moves and runs with its kind)", territory: "Territory (fights harder on its own patch)", hunger: "Hunger (bolder in the lean months)",
  morale: "Morale (holds when the leader falls)"};

export async function editBehavior(actor) {
  if ( !actor || !game.user.isGM ) return null;
  const saved = savedProfile(actor), p = profileFor(actor, {phases: false}), auto = NR.templateFor(infoOf(actor));
  const opt = (o, v) => Object.entries(o).map(([k, l]) => `<option value="${k}"${k === v ? " selected" : ""}>${esc(l)}</option>`).join("");
  const tpl = Object.fromEntries([["", `By line (${NR.TEMPLATES[auto].label})`], ...Object.entries(NR.TEMPLATES).map(([k, t]) => [k, t.label])]);
  const modes = {"": `As the scene or world says (${NR.MODES[modeFor(actor)].split(" (")[0]})`, ...NR.MODES};
  const content = `<div class="wnpc-edit-form">
    <div class="wodx-field"><label>Template</label><select name="template" data-fixed>${opt(tpl, saved.template ?? "")}</select></div>
    <div class="wodx-field"><label>In combat</label><select name="mode" data-fixed>${opt(modes, saved.mode ?? "")}</select></div>
    <div class="wodx-field"><label>Household</label><input type="text" name="household" value="${esc(saved.household ?? "")}" placeholder="The Kessler farm"/></div>
    <fieldset><legend>Temperament (0 to 2; blank keeps the template's)</legend>
    ${Object.entries(TRAITS).map(([k, l]) => `<div class="wodx-field"><label>${l}</label><input type="number" name="${k}" min="0" max="2" step="0.1" value="${saved[k] ?? ""}" placeholder="${p[k] ?? ""}"/></div>`).join("")}
    <div class="wodx-field"><label>Flees at wound level</label><input type="number" name="fleeAt" min="1" max="7" step="1" value="${saved.fleeAt ?? ""}" placeholder="${p.fleeAt}"/></div>
    </fieldset>
    <fieldset><legend>Tactics and rivals</legend>
    <div class="wodx-field"><label>Tactics</label><input type="text" name="tactics" value="${esc((saved.tactics ?? []).join(", "))}" placeholder="${esc(p.tactics.join(", "))}"/></div>
    <p class="wodx-quiet">Blank keeps the template's. Any of: ${Object.keys(NR.TACTICS).join(", ")}.</p>
    <div class="wodx-field"><label>Sides</label><input type="text" name="sides" value="${esc(saved.sides ?? "")}" placeholder="sect:sabbat, inquisition"/></div>
    <div class="wodx-field"><label>Worn openly</label><input type="text" name="openSides" value="${esc(saved.openSides ?? "")}" placeholder="kind:church"/></div>
    <textarea name="rivals" rows="2" style="width:100%" placeholder="clan:tremere -3">${esc(saved.rivals ?? "")}</textarea>
    <p class="wodx-quiet">Sides add to what the sheet and factions say (clan, sect, tribe, creed and the rest). Worn openly: sides anyone can see (a habit, a uniform, a livery). Rivals, one a line: a side and a step from -3 to 3; it wins over the rivalry table and faction standing (0 for none). ${esc(actor.name)}'s sides now: ${esc((rivalry.sidesOf(actor).own ?? []).join(", ") || "none")}.</p></fieldset>
    <fieldset><legend>Fears</legend>${Object.entries(FEARS).map(([k, l]) => `<label class="wnpc-check"><input type="checkbox" name="fear-${k}"${p.fears.includes(k) ? " checked" : ""}/> ${l}</label>`).join("")}</fieldset>
    <fieldset><legend>Talk sheet (only you see it)</legend>
    <textarea name="talk" rows="4" style="width:100%" placeholder="[the abbot] carries bishop's seal => Opens the archive and names the night porter. | teach the night porter">${esc(saved.talk ?? "")}</textarea>
    <p class="wodx-quiet">One a line. Put WoDX Chronicle tests about the character they talk to before =&gt; to use a line only when it fits. A line that starts with a [topic] is their answer when a player asks about it from Talk; [greet], [none] and [offer] topic, topic are the greeting, the answer when nothing fits, and topics they bring up. After " | ": teach a topic; codex a page; aloud; or a WoDX Chronicle outcome. Lines with no [topic] are your notes only. The HUD's speech button shows the lines for the targeted character.</p>
    <label class="wnpc-check"><input type="checkbox" name="talkAsk"${saved.talkAsk ? " checked" : ""}/> Ask me first: when a player asks them something, you pick the answer</label>
    <label class="wnpc-check"><input type="checkbox" name="noStock"${saved.noStock ? " checked" : ""}/> No stock talk: only the lines you write</label>
    <label class="wnpc-check"><input type="checkbox" name="noBarks"${saved.noBarks ? " checked" : ""}/> Quiet: no cries or remarks while about their routine</label>
    <div class="wodx-field"><label>Voice</label><select name="voice" data-fixed>${opt({"": "From their factions and household", ...Object.fromEntries(Object.entries(VOICES).map(([k, v]) => [k, v.label]))}, saved.voice ?? "")}</select></div></fieldset>
    <fieldset><legend>Phases (first that fits is used)</legend>
    <textarea name="phases" rows="3" style="width:100%" placeholder="Cornered: wounds >= mauled => aggression 2, caution 0, fleeAt 8">${esc(saved.phases ?? "")}</textarea>
    <p class="wodx-quiet">One a line: a name, a colon, WoDX Chronicle tests (; between them), =&gt;, then changes: template, ${Object.keys(TRAITS).join(", ")}, fleeAt, tactics, fears.</p></fieldset>
    <p class="wodx-quiet">With no player owner, ${esc(actor.name)} acts on their combat turns as set here. Blank fields follow the template. NPCs with the same household come when one of them is hurt within call.</p></div>`;
  const data = await foundry.applications.api.DialogV2.wait({
    window: {title: `Behaviour: ${actor.name}`, resizable: true}, classes: ["wodx-dialog", "wodx-npc-dialog"], position: {width: 460, height: "auto"}, content,
    buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => new foundry.applications.ux.FormDataExtended(b.form).object},
      {action: "reset", label: "Back to the template", callback: () => "reset"}, {action: "routine", label: "Routine…", callback: () => "routine"}, {action: "cancel", label: "Cancel"}],
    rejectClose: false
  });
  if ( !data || data === "cancel" ) return null;
  if ( data === "routine" ) return routines.editRoutine(actor);
  if ( data === "reset" ) return actor.unsetFlag(MOD, "behavior");
  const out = {template: data.template || null, mode: data.mode || null, phases: String(data.phases ?? "").trim() || null,
    household: String(data.household ?? "").trim().slice(0, 60) || null, talk: String(data.talk ?? "").trim().slice(0, 8000) || null, talkAsk: data.talkAsk ? true : null, noStock: data.noStock ? true : null,
    noBarks: data.noBarks ? true : null, voice: VOICES[data.voice] ? data.voice : null,
    sides: String(data.sides ?? "").trim().toLowerCase().slice(0, 300) || null, openSides: String(data.openSides ?? "").trim().toLowerCase().slice(0, 200) || null,
    rivals: String(data.rivals ?? "").trim().slice(0, 2000) || null};
  const tacs = String(data.tactics ?? "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  const badTac = tacs.filter(t => !NR.TACTICS[t]);
  if ( badTac.length ) ui.notifications.warn(`Tactics: no tactic called ${badTac.join(", ")}.`);
  out.tactics = tacs.filter(t => NR.TACTICS[t]).length ? tacs.filter(t => NR.TACTICS[t]) : null;
  const rv = RV.parseRivals(out.rivals);
  if ( rv.problems.length ) ui.notifications.warn(`Rivals: ${rv.problems.join(" ")}`);
  const ph = NR.parsePhases(out.phases);
  if ( ph.problems.length ) ui.notifications.warn(`Phases: ${ph.problems.join(" ")}`);
  for ( const k of [...Object.keys(TRAITS), "fleeAt"] ) out[k] = data[k] === "" || data[k] === null || data[k] === undefined ? null : Number(data[k]);
  const fears = Object.keys(FEARS).filter(k => data[`fear-${k}`]);
  const base = NR.TEMPLATES[out.template ?? auto].fears;
  out.fears = (fears.length === base.length && fears.every(f => base.includes(f))) ? null : fears;
  return actor.setFlag(MOD, "behavior", out);
}

/** NPC 0.9.0: the talk sheet's lines for the character the Storyteller has targeted (or every line, with none). */
export async function showTalk(actor) {
  if ( !game.user.isGM || !actor ) return null;
  const target = [...(game.user.targets ?? [])].find(t => t.actor && t.actor.id !== actor.id)?.actor ?? null;
  const W = chron()?.when;
  const lines = NR.talkFor(NR.parseTalk(savedProfile(actor).talk), target && W?.check ? when => W.check(when, {actor: target}).ok : null);
  const body = lines.length ? `<ul>${lines.map(l => `<li>${l.kind && l.kind !== "note" ? `<b>${esc(l.topic ?? l.kind)}:</b> ` : ""}${esc(l.say)}${l.when && l.fits === null ? ` <span class="wodx-quiet">(if ${esc(l.when)})</span>` : ""}</li>`).join("")}</ul>` : "<p>Nothing on the sheet fits.</p>";
  return foundry.applications.api.DialogV2.prompt({window: {title: `Talk sheet: ${actor.name}`}, classes: ["wodx-dialog", "wodx-npc-dialog"], position: {width: 420},
    content: `<p class="wodx-quiet">${target ? `For ${esc(target.name)}.` : "No character is targeted, so every line shows, with what it needs."}</p>${body}`, ok: {label: "Close"}, rejectClose: false});
}

/** The scene's NPCs at a glance, with the world and scene modes. */
export async function openNpcPanel() {
  if ( !game.user.isGM ) return null;
  const npcs = canvas.tokens.placeables.filter(t => t.actor && !t.actor.hasPlayerOwner);
  const sceneMode = canvas.scene?.getFlag(MOD, "mode") ?? "";
  const opt = (o, v) => Object.entries(o).map(([k, l]) => `<option value="${k}"${k === v ? " selected" : ""}>${esc(l)}</option>`).join("");
  const places = routines.listPlaces();
  const now = a => { const w = routines.whereOf(a), r = routines.routineOf(a); if ( !r?.on ) return "No routine";
    const pl = places.find(p => p.id === w?.place)?.name ?? "not placed yet"; return `${pl}${w?.activity ? `, ${RR.ACTIVITIES[w.activity].toLowerCase()}` : ""}`; };
  const rows = npcs.map(t => { const p = profileFor(t.actor); return `<tr><td>${esc(t.name)}</td><td>${esc(p.label)}</td><td>${esc(NR.MODES[modeFor(t.actor)].split(" (")[0])}</td>`
    + `<td>${esc(now(t.actor))}</td><td><button type="button" data-edit="${t.id}">Edit</button> <button type="button" data-routine="${t.id}">Routine</button></td></tr>`; }).join("");
  const content = `<div class="wnpc-panel">
    <div class="wodx-field"><label>The world</label><select name="world" data-fixed>${opt(NR.MODES, setting("mode"))}</select></div>
    <div class="wodx-field"><label>This scene</label><select name="scene" data-fixed>${opt({"": "As the world says", ...NR.MODES}, sceneMode)}</select></div>
    <input type="search" class="wodx-search wnpc-search" data-search=".wnpc-list table" placeholder="Find an NPC…" aria-label="Find an NPC" autocomplete="off" spellcheck="false">
    <div class="wnpc-list"><table><thead><tr><th>NPC</th><th>Template</th><th>In combat</th><th>Routine now</th><th></th></tr></thead><tbody>${rows || `<tr><td colspan="5">No NPCs on this scene.</td></tr>`}</tbody></table></div>
    <div class="wodx-field"><label>Routines on this scene</label><select name="routineScene" data-fixed>${opt({"": "As the world says", ...NR.MODES}, canvas.scene?.getFlag(MOD, "routineMode") ?? "")}</select></div>
    <label class="wnpc-check"><input type="checkbox" name="truce"${canvas.scene?.getFlag(MOD, "truce") ? " checked" : ""}/> Truce ground: rivals here do not come to blows (an Elysium, a moot, a church on a feast day)</label>
    <p class="wodx-quiet">NPCs with a player owner are never moved by WoDX.</p></div>`;
  const data = await foundry.applications.api.DialogV2.wait({
    window: {title: "WoDX NPCs", resizable: true}, classes: ["wodx-dialog", "wodx-npc-dialog"], position: {width: 520, height: "auto"}, content,
    // The search box is WoDX Chronicle's (one listener for every window, rule B24)
    render: (ev, dlg) => {
      dlg.element.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => editBehavior(canvas.tokens.get(b.dataset.edit)?.actor)));
      dlg.element.querySelectorAll("[data-routine]").forEach(b => b.addEventListener("click", () => routines.editRoutine(canvas.tokens.get(b.dataset.routine)?.actor)));
    },
    buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => new foundry.applications.ux.FormDataExtended(b.form).object},
      {action: "places", label: "Places…", callback: () => "places"}, {action: "talk", label: "Shared talk…", callback: () => "talk"},
      {action: "rivals", label: "Rivalries…", callback: () => "rivals"}, {action: "cancel", label: "Close"}],
    rejectClose: false
  });
  if ( !data || data === "cancel" ) return null;
  if ( data === "places" ) return routines.openPlaces();
  if ( data === "talk" ) return talk.editShared();
  if ( data === "rivals" ) return rivalry.editRows();
  await game.settings.set(MOD, "mode", data.world);
  if ( data.scene ) await canvas.scene.setFlag(MOD, "mode", data.scene); else await canvas.scene.unsetFlag(MOD, "mode");
  if ( data.routineScene ) await canvas.scene.setFlag(MOD, "routineMode", data.routineScene); else await canvas.scene.unsetFlag(MOD, "routineMode");
  if ( data.truce ) await canvas.scene.setFlag(MOD, "truce", true); else await canvas.scene.unsetFlag(MOD, "truce");
  return data;
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

/* Phase 7c: routines, places and reactions, built with this module's grid helpers */
const routines = buildRoutines({MOD, esc, gmIds, isActiveGM, C, chron, profileFor, H3, gridKind, grid, cellOf, cellsAt, topLeftFor, passableFor, stepsFor, stepCost,
  hexHeuristic, cellsFor, walk, approach, yardsBetween, obvious, hiddenByObfuscate});
routines.hooks();
/* Phase 7d: factions and domains, on top of 7c's places */
const factions = buildFactions({MOD, esc, gmIds, isActiveGM, chron, routines});
factions.hooks();
/* 0.17.0: founding factions in play, and factions the players run */
const founding = buildFounding({MOD, esc, gmIds, isActiveGM}, factions);
factions.setFounding(founding);
founding.hooks();
/* 0.8.0: followers who take orders */
const orders = buildOrders({MOD, esc, gmIds, isActiveGM, chron, routines, cellOf, cellsAt, besideFor, yardsBetween, obvious, attitude: () => attitude});
orders.hooks();
Faces.registerFaceHooks();
/* 0.10.0: the topic menu */
const talk = buildTalk({MOD, esc, isActiveGM, chron, savedProfile, tells: (a, b) => rivalry.tells(a, b)});
talk.hooks();
/* 0.12.0: each NPC's attitude toward each character */
/* 0.18.0: natural rivalries between kinds of NPC */
const rivalry = buildRivalry({MOD, esc, isActiveGM, chron, C, profileFor, savedProfile, factions, routines, yardsBetween, obvious, hiddenByObfuscate});
rivalry.hooks();
/* 0.27.0: passers-by and animals */
const passersby = buildPassersby({MOD, esc, isActiveGM, chron});
passersby.hooks();
const attitude = buildAttitude({MOD, chron, savedProfile, factions, rivalry, profileFor});
Hooks.on("wodxChronicleReady", () => attitude.registerHandler());
/* 0.30.0: relationships, the family and lineage tree, secrets and hooks, why an NPC feels as they do */
const people = buildPeople({MOD, esc, chron, gmIds, isActiveGM, attitude, rivalry});
people.hooks();

Hooks.once("init", () => {
  registerSettings();
  routines.registerSettings();
  factions.registerSettings();
  orders.registerSettings();
  Faces.registerFaceSettings();
  talk.registerSettings();
  rivalry.registerSettings();
  passersby.registerSettings();
  if ( !routines.registerBehavior() ) console.warn(`${MOD} | region behaviours are not available: WoDX: Reaction is off.`);
  const api = {version: VERSION, rules: NR, routineRules: RR, profileFor, animals: AN.ANIMALS, modeFor, readFight, planTurn, takeTurn, editBehavior, openNpcPanel, execute, undo, snapshot,
    acceptCard, undoCard, approach, wallBetween, cellOf, postPlan, routines, editRoutine: routines.editRoutine, openPlaces: routines.openPlaces, tick: routines.tick,
    factions, founding, openFactions: factions.openFactions, runFactionTurns: factions.runTurns, endSession: factions.endSession, reportBreach: factions.reportBreach, huntingFor: factions.huntingFor,
    faces: {open: Faces.openFaces, apply: Faces.applyName}, nameFor: Faces.nameFor, knowledgeOf: a => rivalry.knowledgeOf(a), orders, showTalk, householdAnswers, kinNear, talk, openTalk: talk.openTalk, attitude, rivalry, openRivalries: rivalry.editRows, passersby, openCrowd: passersby.openCrowd,
    politics: {rules: PO, polities: PO.POLITIES, polityFor: PO.polityFor},
    ties: people.ties, openTree: people.openTree, secrets: people.secrets, openSecrets: people.secrets.open, opinion: people.opinion};
  game.modules.get(MOD).api = api;
});
/* Obfuscate and sneaking as token statuses, for the noticing roll (V20 Dark Ages pp. 169, 195, 224-226) */
Hooks.once("setup", () => {
  try {
    registerCondition({id: "obfuscated", name: "Obfuscated (unseen)", img: "icons/svg/invisible.svg", source: "V20 Dark Ages pp. 195, 224-226", lines: ["vampire"],
      summary: "Hidden by Obfuscate: only Auspex at least equal to the Obfuscate finds them, with Perception + Awareness at 8, less 1 a dot above.", mods: {}});
    registerCondition({id: "sneaking", name: "Sneaking", img: "icons/svg/mystery-man.svg", source: "V20 Dark Ages p. 169",
      summary: "Moving quietly: watchers roll Perception + Alertness against Dexterity + Stealth.", mods: {}});
  } catch (e) { console.warn(`${MOD} | could not register the Obfuscate and sneaking conditions`, e); }
});
Hooks.once("ready", () => {
  if ( !C() ) console.warn(`${MOD} | WoDX Combat is missing: NPCs cannot act.`);
  if ( chron()?.registerApprovalHandler ) { factions.registerHandler(); attitude.registerHandler(); } // else on wodxChronicleReady
  ensureStyles();
});
/**
 * NPC 0.15.0: the rest of an NPC's household within call on the scene being viewed (token ids, nearest first), for
 * WoDX Combat's fight starter. None for a character with a player, or an NPC with no household.
 */
function kinNear(docLike) {
  const doc = docLike?.document ?? docLike;
  const tok = doc?.id ? canvas.tokens?.get(doc.id) : null;
  if ( !tok?.actor || tok.actor.hasPlayerOwner || doc.parent?.id !== canvas.scene?.id ) return [];
  const household = savedProfile(tok.actor).household;
  if ( !household ) return [];
  const others = canvas.tokens.placeables.filter(t => t.actor && t.id !== tok.id).map(t => ({id: t.id, name: t.name, household: savedProfile(t.actor).household,
    yards: yardsBetween(tok, t), pc: !!t.actor.hasPlayerOwner, down: wounds(t.actor) >= 7, inFight: false}));
  return AR.kinToAnswer({id: tok.id, household}, others, {reach: Number(setting("householdReach")) || 40}).map(k => k.id);
}

/** NPC 0.9.0: one of a household is hurt; the others within call come. A card asks the Storyteller to bring them in. */
async function householdAnswers(actor, info = {}) {
  const tot = d => (typeof d === "number" ? d : num(d?.bashing) + num(d?.lethal) + num(d?.aggravated));
  if ( !isActiveGM() || !actor || !(num(info.levels) > 0) || (info.after !== undefined && tot(info.after) <= tot(info.before)) ) return null;
  const household = savedProfile(actor).household;
  if ( !household ) return null;
  const scene = canvas.scene;
  const tok = canvas.tokens?.placeables?.find(t => t.actor?.id === actor.id || t.actor === actor);
  if ( !tok || !scene ) return null;
  const combat = game.combats?.find(c => c.scene?.id === scene.id) ?? null;
  const inFight = new Set((combat?.combatants?.contents ?? []).map(c => c.tokenId));
  const others = canvas.tokens.placeables.filter(t => t.actor && t.id !== tok.id).map(t => ({id: t.id, name: t.name, household: savedProfile(t.actor).household,
    yards: yardsBetween(tok, t), pc: !!t.actor.hasPlayerOwner, down: wounds(t.actor) >= 7, inFight: inFight.has(t.id)}));
  const kin = AR.kinToAnswer({id: tok.id, household}, others, {reach: Number(setting("householdReach")) || 40});
  if ( !kin.length ) return null;
  const names = kin.map(k => esc(k.name)).join(", ");
  return ChatMessage.create({speaker: {alias: "WoDX"}, whisper: game.users.filter(u => u.isGM).map(u => u.id),
    flags: {[MOD]: {kin: {tokens: kin.map(k => k.id), scene: scene.id}}},
    content: `<div class="vta-card wodx-x wnpc"><div class="vta-body"><p>${esc(tok.name)} is hurt, and ${esc(household)} hears it: ${names} ${kin.length > 1 ? "come" : "comes"}.</p>`
      + `${combat ? `<button type="button" class="wnpc-kin">Bring them into the fight</button>` : ""}</div></div>`});
}
Hooks.on("wodxDamageApplied", (actor, info) => { householdAnswers(actor, info).catch(e => console.error(`${MOD} | household`, e)); });
Hooks.on("renderChatMessageHTML", (msg, el) => {
  const kin = msg.getFlag(MOD, "kin");
  if ( !kin ) return;
  el.querySelectorAll("button.wnpc-kin").forEach(b => {
    if ( !game.user.isGM || kin.done ) { b.remove(); return; }
    b.addEventListener("click", async ev => {
      ev.preventDefault(); b.disabled = true;
      const combat = game.combats?.find(c => c.scene?.id === kin.scene);
      const have = new Set((combat?.combatants?.contents ?? []).map(c => c.tokenId));
      const add = kin.tokens.filter(id => !have.has(id)).map(tokenId => ({tokenId, sceneId: kin.scene, actorId: game.scenes.get(kin.scene)?.tokens?.get(tokenId)?.actorId}));
      if ( combat && add.length ) await combat.createEmbeddedDocuments("Combatant", add);
      await msg.setFlag(MOD, "kin", {...kin, done: true});
    });
  });
});
Hooks.on("combatStart", combat => { if ( isActiveGM() ) soon(combat); });
Hooks.on("updateCombat", (combat, changed) => {
  if ( !isActiveGM() || !combat.started || !("turn" in (changed ?? {}) || "round" in (changed ?? {})) ) return;
  soon(combat);
});
Hooks.on("renderChatMessageHTML", (msg, el) => {
  if ( !msg.getFlag(MOD, "plan") ) return;
  el.querySelectorAll("button.wnpc-go, button.wnpc-undo, button.wnpc-edit").forEach(b => {
    if ( !game.user.isGM ) { b.remove(); return; }
    b.addEventListener("click", ev => { ev.preventDefault(); b.disabled = true; onCardButton(msg, b).catch(e => console.error(`${MOD} |`, e)).finally(() => { b.disabled = false; }); });
  });
});
Hooks.on("getSceneControlButtons", controls => {
  const tokens = controls.tokens ?? controls.token;
  if ( !tokens?.tools ) return;
  tokens.tools.wodxTalk = {name: "wodxTalk", title: "Talk to the person you target, or the nearest one in reach", icon: "fa-solid fa-comments", order: 108,
    button: true, visible: true, onChange: () => talk.openTalk()};
  tokens.tools.wodxOrders = {name: "wodxOrders", title: "Give an order (to a follower who serves your character)", icon: "fa-solid fa-bullhorn", order: 109,
    button: true, visible: true, onChange: () => orders.openOrders()};
  tokens.tools.wodxNpcs = {name: "wodxNpcs", title: "WoDX NPCs (how NPCs act in combat)", icon: "fa-solid fa-chess-knight", order: 110,
    button: true, visible: game.user.isGM, onChange: () => openNpcPanel()};
  tokens.tools.wodxPlaces = {name: "wodxPlaces", title: "WoDX places (where routines send NPCs)", icon: "fa-solid fa-map-location-dot", order: 111,
    button: true, visible: game.user.isGM, onChange: () => routines.openPlaces()};
  tokens.tools.wodxFactions = {name: "wodxFactions", title: game.user.isGM ? "WoDX factions (faction turns, hunting grounds, rumours)" : "Your factions (found one, or give orders to one you run)", icon: "fa-solid fa-chess-rook", order: 112,
    button: true, visible: true, onChange: () => factions.openFactions()};
  tokens.tools.wodxCrowd = {name: "wodxCrowd", title: "Passers-by (people and animals walking through this scene)", icon: "fa-solid fa-people-group", order: 113,
    button: true, visible: game.user.isGM, onChange: () => passersby.openCrowd()};
});
Hooks.on("renderTokenHUD", (hud, html) => {
  if ( !game.user.isGM ) return;
  const root = html instanceof HTMLElement ? html : html[0];
  const actor = hud.object?.actor;
  const col = root?.querySelector(".col.right");
  if ( !actor || !col || actor.hasPlayerOwner ) return;
  const b = document.createElement("div");
  b.className = "control-icon wnpc-hud";
  b.title = "WoDX NPC behaviour (right-click: plan this NPC's turn now)";
  b.innerHTML = '<i class="fa-solid fa-chess-knight"></i>';
  b.addEventListener("click", () => editBehavior(actor));
  b.addEventListener("contextmenu", ev => { ev.preventDefault(); const t = hud.object; postPlan(t, game.combat, planTurn(t, game.combat), "suggest").catch(e => console.error(`${MOD} |`, e)); });
  col.appendChild(b);
  passersby.hudButtons(hud, col);
  if ( String(savedProfile(actor).talk ?? "").trim() ) {
    const t = document.createElement("div");
    t.className = "control-icon wnpc-hud";
    t.title = "Talk sheet: your notes for the targeted character";
    t.innerHTML = '<i class="fa-solid fa-comment-dots"></i>';
    t.addEventListener("click", () => showTalk(actor).catch(e => console.error(`${MOD} |`, e)));
    col.appendChild(t);
  }
});

/** A new module's stylesheet is read at server start; injecting it means a reload is enough. */
function ensureStyles() {
  const href = `modules/${MOD}/styles/wodx-npc.css`;
  if ( [...document.styleSheets].some(s => s.href?.includes(href)) || document.querySelector(`link[href*="${href}"]`) ) return;
  const l = document.createElement("link");
  l.rel = "stylesheet"; l.href = `${href}?v=${VERSION}`;
  document.head.appendChild(l);
}
