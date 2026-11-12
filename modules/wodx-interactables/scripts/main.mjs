/**
 * WoDX Interactables (the version is in module.json): doors, locks, windows and walls that can be broken through, on core Foundry walls; containers, traps, clues, light sources and hiding places on tiles.
 *
 *   Interact   A player selects a token and presses Interact on the token HUD (or the I key). A window lists every door,
 *              window and breakable wall within reach of that token, nearest first, with the options for each: the
 *              pool, difficulty, successes needed, time per roll and noise are shown before anything is rolled.
 *              Clicking a locked door does the same for that door (the door-click shortcut, a world setting).
 *   Rolling    The player's client rolls with the pool rules of WoDX Actions and posts a card. The active Storyteller's
 *              client reads the dice from that card, works out the result (interact-rules.mjs) and applies it at once:
 *              the door opens, the lock jams, the pane breaks. The card gets an Undo for the Storyteller. Only a wall
 *              knocked through waits, in the approval queue.
 *   Noise      Each result makes a noise (silent, quiet, loud). NPCs in earshot roll to hear it; the Storyteller's card
 *              names who heard and what each would likely do, and the hook wodxInteractablesNoise passes it on.
 *   Time       Rolls that take minutes move the Chronicle clock, outside combat.
 *   Containers A tile marked as a container (chest, cabinet, strongbox, safe) is listed the same way: open it, pick
 *              or force its lock, and take what is inside, which hands the items to the character (0.2.0).
 *   Traps      A tile marked as a trap (snare, pit, tripwire, spring blade) goes off when a character walks over it:
 *              a Dexterity roll to get clear, then damage through WoDX Combat, with Undo. Searching the area
 *              (Perception + Alertness or Investigation) finds the traps its successes reach; a found trap can be
 *              disarmed (Wits + Larceny) or set off from a distance, and is safe to walk around (0.3.0).
 *   Clues      A tile marked as a clue (a letter, a bloodstain, writing, a trail) holds the Storyteller's own text in up
 *              to four parts; examining it shows more with more successes, in a whisper to that player (0.4.0).
 *   Lights     A tile marked as a light source (torch, candles, lantern, lamp, switch) lights or puts out the scene's
 *              own lights it is tied to, with no roll; a lantern, lamp or bulb can be broken (0.5.0).
 *   Hiding     A tile marked as a hiding place takes characters who hide there (Dexterity + Stealth) out of sight;
 *              searching it, or the area, finds them by successes; walking out ends the hiding (0.6.0).
 *   Hazards    A tile marked as a hazard (fire, a brazier to knock over, broken glass, a live wire) hurts whoever walks
 *              into it, and in combat whoever starts a turn in it, through WoDX Combat, with Undo; a fire can be put
 *              out or set alight, glass swept aside, the power cut (0.7.0).
 *   Sacred     A tile marked as an altar or shrine is holy ground: pray there with WoDX Actions, desecrate it; a demon
 *              who walks onto it is seared. A relic or fetish on a tile can be taken (0.8.0); a caern stone, fetter or node opens the WoDX actions menu (0.8.1).
 *   Watch      A tile marked as a watch point: a window on the street or a mirror shows who is in the area it is tied
 *              to; a telephone or radio calls the one it is tied to or calls for help; a bell raises the alarm. Each
 *              result is also published as a wodxMapEvent (0.10.0).
 *   Mounts     A tile marked as a mount or vehicle (a horse, a cart, a carriage, a boat, a car, a motorcycle) takes one
 *              character at the reins and passengers; moving the token at the reins carries the tile and everyone
 *              aboard. Keeping control and going flat out roll Dexterity + Ride or Drive; cars appear in their era (0.11.0).
 *   States     A tile shows a picture or a marker for each state, with tied sounds and a floating word, and every result
 *              goes out as one wodxMapEvent in one shape (states.mjs, state-rules.mjs; 0.12.0).
 *   Climbing   A tile marked as a climb (a ladder, a rope, a tree, a rough wall, a cliff) or a gap to jump: Dexterity +
 *              Athletics, extended, up the climb; Strength + Athletics across the gap, with a roll to catch the ledge;
 *              arriving moves the token to the tile it is tied to, and a fall does bashing dice by its height (0.13.0).
 *   Targets    A tile marked as a target (rings, bottles in a row, a practice dummy, something to break): shoot it with
 *              each ranged weapon on the sheet at WoDX Combat's range bands, throw at it, strike or break it within
 *              reach; rings score by successes on a scoreboard on the tile; fragile things break on a hit (0.14.0).
 *   Chases     The Storyteller runs a chase from the Storyteller's hand: the quarry and the pursuers roll each turn, on
 *              foot, mounted or in the vehicles of the year, over the ground the chase crosses; a catch can start a
 *              fight through WoDX Combat (chase.mjs, chase-rules.mjs; 0.26.0).
 * The settings for each wall live in flags.wodx-interactables, set in the WoDX part of the wall's config window; a
 * container's live in the same flags on its tile, set in the WoDX part of the tile's config window.
 * Plain doors need no setup: a locked door with no grade has a good lock, and the build follows the material.
 */
import * as R from "./interact-rules.mjs";
import {countSuccesses, clampDifficulty} from "../../wodx-actions/scripts/core-rules.js";
import {actionPool} from "../../wodx-actions/scripts/rules.js";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";
import {registerStateSettings, setupStates, publish} from "./states.mjs";
import {setupLiving} from "./living.mjs";
import {setupCarry} from "./carry.mjs";
import {setupAdopt} from "./adopt.mjs";
import * as Fill from "./fill.mjs";
import * as FillRules from "./fill-rules.mjs";
import * as Stock from "./stock.mjs";
import {setupChase} from "./chase.mjs";

const MOD = "wodx-interactables";
const SEARCH = "_search";
const VERSION = "0.30.0";
const BREACH = `${MOD}.breach`;
const num = v => Number(v) || 0;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const H3 = "background:none!important;border:0!important;box-shadow:none!important;color:inherit!important";
const chron = () => game.modules.get("wodx-chronicle")?.api;
const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return null; } };
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const isActiveGM = () => game.user.isGM && (game.users.activeGM ? game.users.activeGM.id === game.user.id : true);
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : "";
const unsetKey = path => {
  const Del = globalThis.foundry?.data?.operators?.ForcedDeletion;
  return Del ? {[path]: new Del()} : {[path.replace(/\.([^.]+)$/, ".-=$1")]: null};
};

/* ------------------------------------------------------------------ */
/*  Settings                                                           */
/* ------------------------------------------------------------------ */

function registerSettings() {
  game.settings.register(MOD, "doorClick", {
    name: "Clicking a locked door opens Interact", hint: "A player who clicks a locked door with a token selected gets the Interact window for that door. The Storyteller does the same with Shift held.",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(MOD, "reach", {
    name: "Reach, in grid squares", hint: "How far from the edge of a token a door or window can be used.",
    scope: "world", config: true, type: Number, default: 1, range: {min: 0.5, max: 3, step: 0.5}
  });
  game.settings.register(MOD, "makePlain", {
    name: "Hand over things with no item behind them", hint: "Taking from a container: a line that is only a name (everyday goods, a stock list's own words) becomes a simple item of that name. Off: those lines are left for the Storyteller to describe.",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(MOD, "advanceClock", {
    name: "Long attempts move the clock", hint: "Outside combat, picking a lock for ten minutes moves the Chronicle clock on ten minutes.",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(MOD, "traps", {
    name: "Traps go off", hint: "An armed trap tile goes off when a character walks over it. Off: traps can still be found and disarmed, but never spring by themselves.",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(MOD, "hazards", {
    name: "Hazards hurt", hint: "A live hazard tile (fire, broken glass, a live wire) hurts a character who walks into it, and in combat one who starts a turn in it. Off: hazards can still be put out or cleared, but never hurt by themselves.",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(MOD, "traitTriggers", {
    name: "Flaws go off on the map", hint: "A character with Can't Cross Running Water, Garlic, Crosses, Light-Sensitive or a Phobia who walks into a tile or region named for it gets a card, and a player's move is held where it began when the flaw stops them.",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(MOD, "noise", {
    name: "NPCs hear noise", hint: "NPCs in earshot of a quiet or loud attempt roll to hear it, and the Storyteller's card names them.",
    scope: "world", config: true, type: Boolean, default: true
  });
}

/* ------------------------------------------------------------------ */
/*  Reading walls and characters                                       */
/* ------------------------------------------------------------------ */

const DS = () => CONST.WALL_DOOR_STATES ?? {CLOSED: 0, OPEN: 1, LOCKED: 2};
const dsName = n => n === DS().OPEN ? "open" : n === DS().LOCKED ? "locked" : "closed";
const dsNum = s => s === "open" ? DS().OPEN : s === "locked" ? DS().LOCKED : DS().CLOSED;
/** A token's centre from its document, for a scene that may not be on view. */
const centerOf = (td, scene) => {
  const g = scene?.grid?.size ?? canvas?.grid?.size ?? 100;
  return {x: num(td.x) + num(td.width || 1) * g / 2, y: num(td.y) + num(td.height || 1) * g / 2};
};
const isSecret = doc => doc.door === (CONST.WALL_DOOR_TYPES?.SECRET ?? 2);

/** The interactable a wall is, or null. */
export function describeWall(doc) {
  const f = doc?.flags?.[MOD] ?? {};
  if ( !doc || (!(doc.door > 0) && !R.WALLS[f.wall]) ) return null;
  return R.describe({door: doc.door > 0, secret: isSecret(doc), ds: dsName(doc.ds), flags: f});
}

/** A container on a tile, or null. */
export function describeTile(doc) {
  const f = doc?.flags?.[MOD] ?? {};
  if ( !doc || !(f.container || f.trap || f.clue || f.light || f.hide || f.hazard || f.sacred || f.watch || f.mount || f.climb || f.isTarget) ) return null;
  if ( f.container ) return R.describeContainer(f);
  if ( f.trap ) return R.describeTrap(f);
  if ( f.clue ) return R.describeClue(f);
  if ( f.light ) { const lights = lightsOf(doc); return R.describeLight(f, {on: lights.some(l => !l.hidden), count: lights.length}); }
  if ( f.hide ) return R.describeHide(f);
  if ( f.hazard ) return R.describeHazard(f);
  if ( f.sacred ) return R.describeSacred(f);
  if ( f.watch ) return R.describeWatch(f);
  if ( f.mount ) return R.describeMount(f);
  if ( f.climb ) return R.describeClimb(f);
  return R.describeTarget(f);
}
const isTile = doc => doc?.documentName === "Tile" || (!!doc && !Array.isArray(doc.c) && "texture" in doc) || (!!doc && !Array.isArray(doc.c) && ["container", "trap", "clue", "light", "hide", "hazard", "sacred", "watch", "mount", "climb", "isTarget"].some(k => doc.flags?.[MOD]?.[k] === true));
/** Whatever interactable a wall or tile is. */
export const describeObj = doc => (isTile(doc) ? describeTile(doc) : describeWall(doc));
/** A wall or a tile on a scene, by id. */
const objectIn = (scene, id) => scene?.walls?.get?.(id) ?? scene?.tiles?.get?.(id) ?? null;
/** The tiles of a scene, as an array. */
const tilesOf = scene => scene?.tiles?.contents ?? [...(scene?.tiles?.values?.() ?? [])];
/**
 * The scene lights a light-source tile works: the ids set on it, or else every light inside the tile or within a
 * square of it; with the copies WoDX Otherworlds makes of them on the Penumbra and Shadowlands levels.
 */
export function lightsOf(doc, {onlySet = false} = {}) {
  const scene = doc?.parent ?? canvas?.scene;
  const all = scene?.lights?.contents ?? [...(scene?.lights?.values?.() ?? [])];
  const twinOf = l => l.flags?.["wodx-otherworlds"]?.twinOf ?? null;
  const set = String(doc?.flags?.[MOD]?.lightIds ?? "").split(/[\s,;]+/).filter(Boolean);
  const g = scene?.grid?.size ?? 100, r = rectOf(doc);
  const near = l => l.x >= r.x - g && l.x <= r.x + r.w + g && l.y >= r.y - g && l.y <= r.y + r.h + g;
  if ( onlySet && !set.length ) return [];
  const base = all.filter(l => !twinOf(l) && (set.length ? set.includes(l.id) : near(l)));
  const ids = new Set(base.map(l => l.id));
  return [...base, ...all.filter(l => ids.has(twinOf(l)))];
}
/** A tile's rectangle and centre. */
const rectOf = doc => ({x: num(doc.x), y: num(doc.y), w: num(doc.width), h: num(doc.height)});
const tileCenter = doc => { const r = rectOf(doc); return {x: r.x + r.w / 2, y: r.y + r.h / 2}; };
/** The point of a tile nearest to p, pulled a little toward the tile's centre. */
function nearOnTile(doc, p, by = 4) {
  const r = rectOf(doc), c = tileCenter(doc);
  const q = {x: Math.max(r.x, Math.min(r.x + r.w, p.x)), y: Math.max(r.y, Math.min(r.y + r.h, p.y))};
  const d = Math.hypot(c.x - q.x, c.y - q.y) || 1;
  return {x: q.x + (c.x - q.x) / d * Math.min(by, d), y: q.y + (c.y - q.y) / d * Math.min(by, d)};
}
const distanceToTile = (doc, p) => { const r = rectOf(doc); return Math.hypot(Math.max(r.x - p.x, 0, p.x - r.x - r.w), Math.max(r.y - p.y, 0, p.y - r.y - r.h)); };
/** Where a noise at an object starts, as heard from a point. */

const LOCK_KEYS = ["larceny", "security", "legerdemain", "technology", "computer", "stealth", "alertness", "investigation", "athletics", "dodge", "ride", "drive", "firearms", "archery", "melee", "brawl"];
const TOOLS = /lock ?picks?|picklock|thieves'? tools|skeleton key|bump key|pick gun|lock gun|tension wrench/i;
const POWERS = /^(potence|celerity|protean|obtenebration|matter|forces|correspondence|inhabit|outrage|puppetry|argos|moliate)/i;

function abilitiesOf(actor) {
  const out = {}, meta = {};
  const flat = actor?.system?.abilities ?? {};
  for ( const k of LOCK_KEYS ) {
    const a = flat[k];
    if ( a && typeof a === "object" && (num(a.value) > 0 || a.isvisible) ) { out[k] = num(a.value); meta[k] = {type: a.type ?? "", specialty: a.speciality ?? ""}; }
  }
  for ( const i of actor?.items ?? [] ) {
    if ( i.type !== "Ability" && !(i.type === "Trait" && String(i.system?.type ?? "").includes("secondability")) ) continue;
    const k = String(i.system?.id || i.name || "").trim().toLowerCase();
    if ( LOCK_KEYS.includes(k) && num(i.system?.value) >= (out[k] ?? 0) ) {
      out[k] = num(i.system?.value);
      meta[k] = {type: String(i.system?.type ?? "").includes("talent") ? "talent" : "skill", specialty: i.system?.speciality ?? ""};
    }
  }
  return {abilities: out, meta};
}
const attrOf = (actor, k) => { const a = actor?.system?.attributes?.[k]; return a ? num(a.total ?? a.value) : 0; };
const powerDots = (actor, name) => {
  const it = actor?.items?.find?.(i => i.type === "Power" && String(i.system?.type ?? "").includes("discipline") && i.name.trim().toLowerCase().startsWith(name));
  return it ? num(it.system?.value) : 0;
};
/* 0.27.0: is the sun up now? Read from WoDX Actions' sun (the Chronicle clock), kept fresh as the clock moves. */
let SUN_UP = false;
async function refreshSun() {
  try { const s = await game.wodxActions?.sunNow?.(); SUN_UP = !!s && !s.unknown && s.phase !== "night"; } catch (e) { SUN_UP = false; }
}
export const sunUp = () => SUN_UP;
function eraNow() {
  try {
    const e = chron()?.eras;
    return {eraId: e?.activeEra?.()?.profile?.id ?? "", year: num(e?.currentYear?.())};
  } catch (e) { return {eraId: "", year: 0}; }
}

/** The weapons on a sheet, as WoDX Combat reads them: [{id, name, ranged, attr, ability, range, diff, accuracy}]. */
export function weaponsOf(actor) {
  const out = [];
  for ( const i of actor?.items ?? [] ) {
    if ( i.type !== "Melee Weapon" && i.type !== "Ranged Weapon" ) continue;
    const s = i.system ?? {}, ranged = i.type === "Ranged Weapon";
    if ( s.isnatural ) continue;
    const ab = String(s.attack?.ability || (ranged ? "archery" : "melee")).toLowerCase();
    out.push({id: i.id, name: String(i.name ?? "weapon"), ranged, attr: s.attack?.attribute || "dexterity", ability: ab === "custom" ? "archery" : ab,
      range: num(s.range) || (ranged ? 10 : 0), diff: num(s.difficulty) || 6, accuracy: num(s.attack?.accuracy), equipped: !!s.isequipped});
  }
  return out.sort((a, b) => (b.equipped - a.equipped) || a.name.localeCompare(b.name));
}
/** Yards between two points on a scene, in a straight line. */
export function yardsOn(scene, a, b) {
  const g = scene?.grid ?? canvas?.scene?.grid ?? {};
  const size = num(g.size) || 100, dist = num(g.distance) || 5, units = String(g.units ?? "ft");
  const per = /m|meter|metre|yd|yard/i.test(units) ? dist : dist / 3;
  return Math.hypot(num(a?.x) - num(b?.x), num(a?.y) - num(b?.y)) / size * per;
}
const reachPx = scene => (num(scene?.grid?.size) || canvas?.grid?.size || 100) * (0.5 + (num(setting("reach")) || 1));

/** What WoDX reads from a character for the options. */
export function characterFor(actor, center, doc) {
  const {abilities, meta} = abilitiesOf(actor);
  const o = doc?.flags?.[MOD] ?? {};
  const key = String(o.keyName ?? "").trim().toLowerCase();
  return {
    actorId: actor?.id ?? "", kind: game.wodxActions?.getKind?.(actor) ?? "mortal", ...eraNow(), sunUp: SUN_UP,
    strength: attrOf(actor, "strength"), dexterity: attrOf(actor, "dexterity"), perception: attrOf(actor, "perception"), intelligence: attrOf(actor, "intelligence"), wits: attrOf(actor, "wits"),
    potence: powerDots(actor, "potence"), abilities, meta,
    side: center && Array.isArray(doc?.c) ? R.sideOf(doc.c, center) : null,
    hasKey: !!key && (actor?.items ?? []).some(i => String(i.name ?? "").toLowerCase().includes(key)),
    // 0.23.0: "Opens for": a WoDX Chronicle "Only when" list; whoever fits it can lock and unlock it without a key
    opensFor: !!String(o.opensFor ?? "").trim() && !!chron()?.when?.check?.(o.opensFor, {actor})?.ok,
    hasTools: (actor?.items ?? []).some(i => TOOLS.test(i.name ?? "")),
    powers: [...new Set((actor?.items ?? []).filter(i => i.type === "Power" && POWERS.test(i.name ?? "")).map(i => i.name.trim()))].slice(0, 6),
    woundPenalty: actor?.system?.conditions?.isignoringpain ? 0 : num(actor?.system?.health?.damage?.woundpenalty),
    // A target: how far, whether within reach, and what is on the sheet to shoot or strike with
    ...(o.isTarget && center && doc ? {weapons: weaponsOf(actor), yards: yardsOn(doc.parent, center, tileCenter(doc)),
      inReach: distanceToTile(doc, center) <= reachPx(doc.parent)} : {})
  };
}

const blocked = (type, a, b) => {
  try { return !!CONFIG.Canvas.polygonBackends[type].testCollision(a, b, {type, mode: "any"}); } catch (e) { return false; }
};
const levelOk = (tok, doc) => {
  const lv = tok?.document?.level, set = doc?.levels;
  return !lv || !set?.size || set.has?.(lv);
};

/** Every interactable within reach of a token, nearest first: [{wall, doc, o, distance}]. */
export function interactablesFor(tok) {
  if ( !tok || !canvas?.walls ) return [];
  const grid = canvas.grid?.size ?? 100;
  const reach = Math.max(tok.w ?? grid, tok.h ?? grid) / 2 + grid * (num(setting("reach")) || 1);
  const out = [];
  for ( const wall of canvas.walls.placeables ?? [] ) {
    const doc = wall.document, o = describeWall(doc);
    if ( !o || !levelOk(tok, doc) ) continue;
    const d = R.distanceToWall(doc.c, tok.center);
    if ( d > reach ) continue;
    if ( !game.user.isGM && o.secret && !o.found ) continue;
    const side = R.sideOf(doc.c, tok.center) ?? "a";
    const near = R.besideWall(doc.c, side, 4);
    // Not through another wall, and (for players) only what the token can see
    if ( blocked("move", tok.center, near) ) continue;
    if ( !game.user.isGM && blocked("sight", tok.center, near) ) continue;
    out.push({wall, doc, o, distance: d});
  }
  // Containers on tiles
  for ( const tile of canvas.tiles?.placeables ?? [] ) {
    const doc = tile.document, o = describeTile(doc);
    if ( !o || !levelOk(tok, doc) ) continue;
    // A trap shows only once found (or to the Storyteller); anything else hidden stays hidden from players
    if ( !game.user.isGM && (o.trap ? !o.found : o.clue ? doc.hidden && !o.found : doc.hidden) ) continue;
    const d = distanceToTile(doc, tok.center);
    // A target: listed as far as anything on the sheet can reach it, if the token can see it
    if ( o.isTarget && d > reach ) {
      const far = Math.max(R.THROW_YARDS, ...weaponsOf(tok.actor).filter(w => w.ranged).map(w => w.range)) * 3;
      if ( yardsOn(canvas.scene, tok.center, tileCenter(doc)) > far ) continue;
      if ( blocked("sight", tok.center, nearOnTile(doc, tok.center)) ) continue;
      out.push({wall: tile, doc, o, distance: d});
      continue;
    }
    if ( d > reach ) continue;
    const near = nearOnTile(doc, tok.center);
    if ( blocked("move", tok.center, near) ) continue;
    if ( !game.user.isGM && blocked("sight", tok.center, near) ) continue;
    out.push({wall: tile, doc, o, distance: d});
  }
  return out.sort((a, b) => a.distance - b.distance);
}

/* ------------------------------------------------------------------ */
/*  The Interact window                                                */
/* ------------------------------------------------------------------ */

const NOISE_WORD = {silent: "silent", quiet: "quiet", loud: "loud"};
/**
 * 0.30.0: an attempt's time goes through WoDX Storyteller when it is on: the clock, or the character's own time when
 * they are apart from the group (B1701). Returns {advanced (clock seconds), personal (for Undo), line}.
 */
async function passTime(actor, seconds) {
  const time = game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller")?.api?.time : null;
  if ( time?.spend && actor?.hasPlayerOwner ) {
    try {
      const r = await time.spend({actorIds: [actor.id], seconds, label: "an attempt"});
      if ( r.how === "personal" ) return {advanced: 0, personal: r, line: `${timeWords(seconds)} pass for ${actor.name} alone, apart from the group.`};
      if ( r.how === "clock" ) return {advanced: seconds, personal: null, line: `The clock moves on ${timeWords(seconds)}.`};
    } catch (e) { console.error(`${MOD} | time`, e); }
  }
  await game.time.advance(seconds);
  return {advanced: seconds, personal: null, line: `The clock moves on ${timeWords(seconds)}.`};
}

function timeWords(s) {
  if ( !s ) return "";
  if ( s < 60 ) return s <= R.TURN ? "a turn" : `${s} seconds`;
  const m = Math.round(s / 60);
  return m === 1 ? "a minute" : `${m} minutes`;
}
/** One line saying what an option costs, before the roll. */
export function optionSummary(op) {
  if ( op.disabled ) return op.note ?? "";
  const bits = [];
  if ( op.roll ) {
    const r = op.roll;
    bits.push(`${r.attrLabel}${r.abilityLabel ? ` + ${r.abilityLabel}` : ""}: ${r.dice} dice at ${r.diff}`);
    if ( r.need ) bits.push(`${r.need} successes needed${r.have ? `, ${r.have} so far` : ""}`);
  } else if ( !op.power ) bits.push(op.auto ? "no roll" : "no roll needed");
  if ( op.seconds ) bits.push(`${timeWords(op.seconds)}${op.extended ? " a roll" : ""}`);
  const n = op.noise?.success, nb = op.noise?.botch;
  if ( n ) bits.push(nb && nb !== n ? `${NOISE_WORD[n]} (${NOISE_WORD[nb]} on a botch)` : NOISE_WORD[n]);
  if ( op.waits ) bits.push("the Storyteller decides the result");
  return `${bits.join("; ")}.${op.note ? ` ${op.note}` : ""}`;
}

function pickToken() {
  const c = canvas?.tokens?.controlled ?? [];
  if ( c.length ) return c[0];
  return game.user.character?.getActiveTokens?.()?.[0] ?? null;
}

/** The window. tok: the acting token (default the selected one); onlyWall: a wall id to list alone. */
export async function openInteract(tok = pickToken(), {onlyWall = null, fight = false} = {}) {
  if ( !tok?.actor ) { ui.notifications.warn("Select your token first."); return null; }
  if ( fight ) await refreshSun();
  let list = interactablesFor(tok);
  // 0.27.0: in a fight, only what can be used in a fight
  if ( fight ) list = list.filter(({doc, o}) => R.optionsFor(o, characterFor(tok.actor, tok.center, doc)).some(op => R.FIGHT_OPS.has(op.id) && !op.disabled));
  if ( onlyWall ) list = list.filter(x => x.doc.id === onlyWall);
  if ( !list.length && onlyWall ) {
    ui.notifications.info(`${tok.name} is too far from that door to reach it.`);
    return null;
  }
  const rows = list.map(({doc, o}) => {
    const ch = characterFor(tok.actor, tok.center, doc);
    const ops = R.optionsFor(o, ch).filter(op => !fight || R.FIGHT_OPS.has(op.id));
    let mine = "";
    try { mine = game.modules.get("wodx-storyteller")?.api?.owners?.whose?.(doc, tok.actor) ?? ""; } catch (e) { mine = ""; }
    const bar = o.barred && o.barSide && Array.isArray(doc.c) ? ` (barred on the ${R.sideLabel(doc.c, o.barSide)} side)` : "";
    const opsHtml = ops.map(op => `<li class="wix-op${op.disabled ? " disabled" : ""}">`
      + (op.disabled ? `<b>${esc(op.label)}</b>` : `<button type="button" data-wall="${doc.id}" data-op="${op.id}">${esc(op.label)}</button>`)
      + `<div class="wodx-quiet">${esc(optionSummary(op))}</div></li>`).join("");
    return `<li data-search-text="${esc(R.nameOf(o, ch))}"><h4>${esc(R.nameOf(o, ch))}${esc(bar)}${mine ? ` <small class="wodx-quiet">(${esc(mine)})</small>` : ""}</h4><ul class="wix-ops" data-fixed>${opsHtml || `<li class="wodx-quiet">Nothing to do here.</li>`}</ul></li>`;
  }).join("");
  const search = onlyWall || fight ? null : R.searchOption(characterFor(tok.actor, tok.center, null));
  const searchHtml = search ? `<div class="wix-search wix-op"><button type="button" data-wall="${SEARCH}" data-op="search">${esc(search.label)}</button><div class="wodx-quiet">${esc(optionSummary(search))}</div></div>` : "";
  const content = `<p class="wodx-quiet">${esc(tok.name)}: what is within reach, nearest first. The roll, the difficulty and the time each takes are shown before anything is rolled.</p>
    ${searchHtml}${list.length > 3 ? searchBox("ul.wix-list", "Search…", "Search what is within reach") : ""}${list.length ? `<ul class="wix-list">${rows}</ul>` : `<p class="wodx-quiet">Nothing else within reach.</p>`}`;
  let picked = null;
  await foundry.applications.api.DialogV2.wait({
    window: {title: `${fight ? "Use the room" : "Interact"}: ${tok.name}`, resizable: true}, classes: ["wodx-dialog", "wix-dialog"], position: {width: 500, height: "auto"}, content,
    render: (ev, dlg) => {
      dlg.element.querySelectorAll("button[data-op]").forEach(b => b.addEventListener("click", () => { picked = {wall: b.dataset.wall, op: b.dataset.op}; dlg.close(); }));
    },
    buttons: [{action: "close", label: "Close"}], rejectClose: false
  });
  if ( !picked ) return null;
  return attempt(tok, picked.wall, picked.op);
}

/** Try one option on one wall, from the acting player's client. Returns the card's message, or null. */
export async function attempt(tok, wallId, opId, {fd = null} = {}) {
  const searching = wallId === SEARCH && opId === "search";
  const doc = searching ? null : objectIn(canvas.scene, wallId), o = searching ? null : describeObj(doc);
  if ( !searching && (!doc || !o) ) return null;
  const actor = tok.actor, ch = characterFor(actor, tok.center, doc);
  const op = searching ? R.searchOption(ch) : R.optionsFor(o, ch).find(x => x.id === opId);
  if ( !op || op.disabled ) return null;
  if ( op.power ) return game.wodxActions?.menu?.({actor});
  // Praying and the like: WoDX Actions' own window, on the player's side
  if ( op.opens ) {
    const fn = game.wodxActions?.[op.opens];
    if ( typeof fn !== "function" ) { ui.notifications.warn("WoDX Actions is off, so there is no window for that."); return null; }
    if ( op.note ) ui.notifications.info(op.note);
    return op.opens === "menu" ? fn({actor}) : fn(actor);
  }
  if ( !game.users.activeGM ) ui.notifications.warn("No Storyteller is connected: the card is posted, but nothing changes until one is.");
  const ask = {v: 1, scene: canvas.scene.id, wall: searching ? SEARCH : doc.id, token: tok.document.uuid, op: op.id, label: op.label, user: game.user.id};
  if ( !op.roll ) return postAsk(tok, ask, [], `${esc(tok.name)}: ${esc(op.label)}`, optionSummary(op));
  fd ??= await rollDialog(tok, op, ch);
  if ( !fd ) return null;
  // The pool, by WoDX Actions' rules: wounds, bonus dice, an untrained Skill, a Knowledge one can't use untrained
  const m = op.roll.ability ? ch.meta[op.roll.ability] ?? {} : {};
  const type = String(m.type ?? "").includes("knowledge") ? "knowledge" : String(m.type ?? "").includes("skill") ? "skill" : m.type ? "talent" : op.roll.skill ? "skill" : "talent";
  // A haven's security makes breaking in harder for anyone who does not live there (WoDX Storyteller's record)
  const haven = R.havenSecurity(canvas.scene?.flags?.["wodx-storyteller"]?.haven, actor?.id, op.id);
  const built = actionPool({attribute: ch[op.roll.attr] ?? 0, attributeLabel: op.roll.attrLabel, ability: op.roll.ability ? (ch.abilities[op.roll.ability] ?? 0) : 0,
    abilityLabel: op.roll.abilityLabel, abilityKey: op.roll.ability, abilityType: type, bonusDice: num(fd.bonus),
    extraDiff: num(fd.extraDiff) + haven, baseDifficulty: op.roll.diff, woundPenalty: ch.woundPenalty, retries: 0});
  if ( built.blocked ) { ui.notifications.warn(built.blocked); return null; }
  if ( haven ) built.parts.push(`haven security +${haven}`);
  let wp = !!fd.willpower;
  if ( wp ) {
    const w = actor.system?.advantages?.willpower ?? {};
    if ( num(w.temporary) < 1 ) { ui.notifications.warn(`${actor.name} has no Willpower left to spend.`); wp = false; }
    else await actor.update({"system.advantages.willpower.temporary": num(w.temporary) - 1});
  }
  const many = op.extended && fd.keepGoing && !game.combat?.started ? 10 : 1;
  const rolls = [];
  let have = num(op.roll.have);
  for ( let k = 0; k < many; k++ ) {
    const roll = new Roll(`${Math.max(0, built.dice)}d10`);
    await roll.evaluate();
    rolls.push(roll);
    const faces = roll.dice[0]?.results?.map(x => x.result) ?? [];
    const r = countSuccesses(faces, clampDifficulty(built.difficulty), {specialty: !!fd.specialty, willpower: wp && k === 0, autoSuccesses: num(op.roll.auto)});
    if ( r.botch ) break;
    have += r.successes;
    if ( op.roll.need && have >= op.roll.need ) break;
  }
  Object.assign(ask, {dice: built.dice, diff: clampDifficulty(built.difficulty), specialty: !!fd.specialty, willpower: wp, auto: num(op.roll.auto), parts: built.parts});
  return postAsk(tok, ask, rolls, `${esc(tok.name)}: ${esc(op.label)}`, `${built.parts.join(" · ")}; ${built.dice} dice at ${clampDifficulty(built.difficulty)}`);
}

async function rollDialog(tok, op, ch) {
  const m = op.roll.ability ? ch.meta[op.roll.ability] ?? {} : {};
  const w = num(tok.actor.system?.advantages?.willpower?.temporary);
  const content = `<p>${esc(optionSummary(op))}</p>
    <div class="wodx-field"><label>Bonus dice</label><input type="number" name="bonus" value="0" min="-10" max="10"></div>
    <div class="wodx-field"><label>Extra difficulty</label><input type="number" name="extraDiff" value="0" min="-3" max="5"></div>
    ${m.specialty ? `<label class="wix-check"><input type="checkbox" name="specialty"> Specialty applies (${esc(m.specialty)})</label>` : ""}
    <label class="wix-check"><input type="checkbox" name="willpower"${w ? "" : " disabled"}> Spend Willpower for a success (${w} left)</label>
    ${op.extended && !game.combat?.started ? `<label class="wix-check"><input type="checkbox" name="keepGoing"> Keep going until done (up to ten rolls)</label>` : ""}`;
  return foundry.applications.api.DialogV2.wait({
    window: {title: `${tok.name}: ${op.label}`}, classes: ["wodx-dialog", "wix-dialog"], position: {width: 420, height: "auto"}, content,
    buttons: [{action: "roll", label: "Roll", default: true, callback: (ev, b) => new foundry.applications.ux.FormDataExtended(b.form).object}, {action: "cancel", label: "Cancel"}],
    rejectClose: false
  }).then(r => (r && r !== "cancel" ? r : null));
}

function diceHtml(roll, diff) {
  const faces = roll.dice?.[0]?.results?.map(x => x.result) ?? [];
  return faces.map(f => `<span class="vta-die ${f === 1 ? "one" : f >= diff ? "hit" : "miss"}">${f}</span>`).join("");
}
async function postAsk(tok, ask, rolls, title, line) {
  const dice = rolls.map(r => `<div class="vta-dice">${diceHtml(r, ask.diff)}</div>`).join("");
  return ChatMessage.create({speaker: ChatMessage.getSpeaker({token: tok.document}), rolls, sound: rolls.length ? CONFIG.sounds?.dice : undefined,
    content: cardHtml({title, line, dice, body: `<p class="wodx-quiet">Waiting for the Storyteller's table to apply it.</p>`}),
    flags: {[MOD]: {ask}}});
}
function cardHtml({title, line = "", dice = "", body = "", verdict = ""}) {
  return `<div class="vta-card wodx-x wix"><header class="vta-head"><h3 style="${H3}">${title}</h3>${verdict ? `<span class="vta-verdict">${esc(verdict)}</span>` : ""}</header>`
    + `<div class="vta-body">${line ? `<p class="wodx-quiet">${esc(line)}</p>` : ""}${dice}${body}</div></div>`;
}

/* ------------------------------------------------------------------ */
/*  The Storyteller's side: applying, noise, Undo                      */
/* ------------------------------------------------------------------ */

const listWords = a => (a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a.at(-1)}`);
/** Hand a container's items to a character: copies of each item named (a UUID, or a world item's name). */
async function giveItems(actor, refs) {
  const data = [], names = [], missing = [];
  for ( const line of refs ) {
    // 0.23.0: "silver pennies (7)" from a stock list: the item, with the count kept in its name until sheets count things
    const cm = /^(.+?)\s+\((\d+)\)$/.exec(String(line));
    const ref = cm ? cm[1] : line, count = cm ? Number(cm[2]) : 1;
    let it = null;
    try { it = /^(Compendium|Item|Actor|Scene)\./.test(ref) ? await fromUuid(ref) : game.items?.getName?.(ref) ?? null; } catch (e) { it = null; }
    if ( it && it.documentName && it.documentName !== "Item" ) { missing.push(line); continue; }
    // A plain name with no item behind it (everyday goods, a stock list's own words): a simple item of that name
    const isUuid = /^(Compendium|Item|Actor|Scene)\./.test(ref);
    if ( !it && (isUuid || !setting("makePlain")) ) { missing.push(line); continue; }
    const o = it ? (typeof it.toObject === "function" ? it.toObject() : foundry.utils.deepClone(it)) : {name: ref, type: "Item"};
    delete o._id;
    if ( count > 1 ) o.name = `${o.name} (${count})`;
    o.flags = {...(o.flags ?? {}), [MOD]: {...(o.flags?.[MOD] ?? {}), from: line, ...(it ? {} : {plain: true})}};
    data.push(o); names.push(o.name);
  }
  const made = data.length ? await actor.createEmbeddedDocuments("Item", data) : [];
  return {ids: (made ?? []).map(d => d.id), names, missing};
}

const busy = new Set();
/** Active GM: work out and apply the result of a card. Returns the result, or null. */
/* ------------------------------------------------------------------ */
/*  Using the room in a fight (0.27.0)                                 */
/* ------------------------------------------------------------------ */

/** Canvas pixels in a yard on a scene. */
function pxPerYard(scene) {
  const g = scene?.grid ?? {}, units = String(g.units ?? "ft");
  const dist = num(g.distance) || 5, yards = /yd|yard|m\b|meter|metre/i.test(units) ? dist : dist / 3;
  return (num(g.size) || 100) / (yards || 1);
}
async function roomEffects({out, doc, scene, tokDoc, actor, o, snap}) {
  const res = {lines: [], revealed: [], damage: []};
  const tile = isTile(doc);
  const grid = num(scene.grid?.size) || 100;
  // A fire where a light fell
  const makeFire = async (f, rect) => {
    const n = f.size === "large" ? 2 : 1;
    const c = rect ? {x: rect.x + rect.w / 2, y: rect.y + rect.h / 2} : centerOf(tokDoc, scene);
    const [t] = await scene.createEmbeddedDocuments("Tile", [{x: c.x - n * grid / 2, y: c.y - n * grid / 2, width: n * grid, height: n * grid,
      texture: {src: null}, flags: {[MOD]: {hazard: true, hazardKind: "fire", size: f.size, heat: f.heat, burning: true, title: f.title, roomMade: true}}}]);
    if ( t ) { snap.spawned.tiles.push(t.id); res.lines.push(`${f.title}: a fire (${R.FIRE_SIZES[f.size].levels} level${R.FIRE_SIZES[f.size].levels === 1 ? "" : "s"} a turn, soaked at ${R.FIRE_HEAT[f.heat].diff}).`); }
  };
  if ( out.spawnFire && tile ) await makeFire(out.spawnFire, rectOf(doc));
  // A chandelier: whoever stands under it dodges, then takes what is left
  if ( out.drop && tile ) {
    const r = rectOf(doc);
    const under = (scene.tokens?.contents ?? []).filter(t => { const c = centerOf(t, scene); return c.x >= r.x && c.x <= r.x + r.w && c.y >= r.y && c.y <= r.y + r.h; });
    if ( !under.length ) res.lines.push("Nobody was under it.");
    for ( const t of under ) {
      const a = t.actor;
      if ( !a ) continue;
      const pool = attrOf(a, "dexterity") + num(a.system?.abilities?.dodge?.value);
      let dodge = {successes: 0, botch: false};
      if ( pool > 0 ) {
        const roll = await new Roll(`${pool}d10`).evaluate();
        dodge = countSuccesses(roll.dice[0]?.results?.map(x => x.result) ?? [], out.drop.dodge);
      }
      const left = R.dropLeft(out.drop.dice, dodge);
      res.lines.push(`${a.name} dodges with ${pool} dice at ${out.drop.dodge}: ${dodge.botch ? "a botch" : `${dodge.successes} success${dodge.successes === 1 ? "" : "es"}`}; ${left} of ${out.drop.dice} dice of lethal left.`);
      if ( left > 0 && game.wodxCombat?.soakAndApply ) {
        const before = new Set(game.messages.contents.map(m => m.id));
        try { await game.wodxCombat.soakAndApply(t.object ?? t, {mode: "pool", amount: left, type: "lethal", soak: true}); } catch (e) { res.lines.push(`Roll ${left} dice of lethal for ${a.name} by hand.`); }
        for ( const m of game.messages.contents ) if ( !before.has(m.id) && m.flags?.["wodx-combat"]?.data ) res.damage.push(m.id);
      }
    }
    if ( out.drop.fire ) await makeFire(out.drop.fire, r);
  }
  // The sun let in: a sunlit region on the character's side of the window, or round the curtain
  if ( out.sun ) {
    const depth = R.SUN_YARDS * pxPerYard(scene);
    const me = centerOf(tokDoc, scene);
    const shape = Array.isArray(doc.c) ? {type: "polygon", points: R.sunPatch(doc.c, me, depth), hole: false}
      : (() => { const q = R.sunRect(rectOf(doc), depth); return {type: "rectangle", x: q.x, y: q.y, width: q.w, height: q.h, rotation: 0, hole: false}; })();
    try {
      const [rg] = await scene.createEmbeddedDocuments("Region", [{name: "WoDX: Sunlight let in", color: "#ffd060", shapes: [shape],
        behaviors: [{type: "wodx-actions.sunlight", name: "Sunlight", system: {light: out.sun.light, exposure: out.sun.exposure ?? 3, ignoreSky: false}}],
        flags: {[MOD]: {roomSun: doc.id}}}]);
      if ( rg ) {
        snap.spawned.regions.push(rg.id);
        res.lines.push(`Sunlight (${out.sun.light === "direct" ? "direct, soaked at 10" : "through glass, soaked at 7"}) reaches ${R.SUN_YARDS} yards into the room.`);
        // Cainites in the patch: WoDX Actions' sun works out each one's exposure
        setTimeout(() => { for ( const t of scene.tokens?.contents ?? [] ) game.wodxActions?.sunCheck?.(t)?.catch?.(e => console.error(`${MOD} | sun`, e)); }, 700);
      }
    } catch (e) { console.warn(`${MOD} | the sunlit area could not be made`, e); res.lines.push("Mark the sunlit area by hand: the region could not be made."); }
  }
  // A window closed again: the sun it let in goes
  if ( out.shutSun && !tile ) {
    const ids = (scene.regions?.contents ?? []).filter(r => r.flags?.[MOD]?.roomSun === doc.id).map(r => r.id);
    try { if ( ids.length ) { await scene.deleteEmbeddedDocuments("Region", ids); res.lines.push("The sunlight is shut out again."); } } catch (e) { console.warn(`${MOD} | sun`, e); }
  }
  // Sprinklers: every torch-sized fire and bonfire on the scene goes out
  if ( out.douse ) {
    let n = 0;
    for ( const t of tilesOf(scene) ) {
      const h = describeTile(t);
      if ( !R.douses(h) ) continue;
      const ls = lightsOf(t, {onlySet: true});
      snap.others.push({id: t.id, burning: true, lights: ls.map(l => ({id: l.id, hidden: !!l.hidden}))});
      await t.update({[`flags.${MOD}.burning`]: false});
      for ( const l of ls ) if ( !l.hidden ) await l.update({hidden: true});
      n++;
    }
    res.lines.push(n ? `The water puts out ${n === 1 ? "a fire" : `${n} fires`}.` : "No fire small enough to put out.");
    if ( tilesOf(scene).some(t => { const h = describeTile(t); return h?.hazard && h.burning && h.size === "inferno"; }) ) res.lines.push("An inferno burns on.");
  }
  // A curtain torn down: whoever hid behind it is seen
  if ( out.revealAll && o.hide && o.occupants?.length ) {
    res.revealed = await revealHidden(o.occupants.map(occ => ({doc, occ})));
    if ( res.revealed.length ) res.lines.push(`${listWords(res.revealed.map(x => x.occ.n))} ${res.revealed.length === 1 ? "is" : "are"} seen.`);
  }
  return res;
}

/** The Use the room window (WoDX Combat's fight button): only what can be used in a fight. */
export function useRoom(tok = pickToken()) { return openInteract(tok, {fight: true}); }

export async function applyAsk(msg) {
  const ask = msg?.flags?.[MOD]?.ask;
  if ( !ask || ask.state || !isActiveGM() || busy.has(msg.id) ) return null;
  busy.add(msg.id);
  try {
    const author = msg.author ?? game.users.get(msg.user ?? ask.user);
    const tokDoc = await fromUuid(ask.token);
    const scene = game.scenes.get(ask.scene), doc = objectIn(scene, ask.wall);
    const fail = async why => { await msg.update({[`flags.${MOD}.ask.state`]: "refused", content: cardHtml({title: titleOf(msg), body: `<p>${esc(why)}</p>`, verdict: "Nothing changes"})}); return null; };
    if ( ask.wall === SEARCH && ask.op === "search" ) {
      if ( !tokDoc?.actor || !scene ) return fail("The character is gone.");
      if ( !author?.isGM && !tokDoc.testUserPermission?.(author, "OWNER") ) return fail("Only a character's own player can act for it.");
      return applySearch(msg, ask, tokDoc, scene);
    }
    if ( !tokDoc?.actor || !doc ) return fail("The door or the character is gone.");
    if ( !author?.isGM && !tokDoc.testUserPermission?.(author, "OWNER") ) return fail("Only a character's own player can act for it.");
    const tok = tokDoc.object, actor = tokDoc.actor;
    const o = describeObj(doc), ch = characterFor(actor, centerOf(tokDoc, scene), doc);
    const op = R.optionsFor(o, ch).find(x => x.id === ask.op);
    if ( !op || op.disabled ) return fail("That can't be done any more: the door has changed since.");
    const rolls = (msg.rolls ?? []).map((roll, k) => {
      const faces = roll.dice?.[0]?.results?.map(x => x.result) ?? [];
      return countSuccesses(faces, clampDifficulty(num(ask.diff) || 6), {specialty: !!ask.specialty, willpower: !!ask.willpower && k === 0, autoSuccesses: num(op.roll?.auto)});
    });
    if ( op.roll && !rolls.length ) return fail("The card has no roll.");
    const out = R.resolve(o, op, rolls, {actorId: actor.id, actorName: actor.name, ...eraNow(), sunUp: SUN_UP});
    const tile = isTile(doc);
    const snap = {ds: tile ? null : doc.ds, flags: foundry.utils.deepClone(doc.flags?.[MOD] ?? {}), ...(tile ? {hidden: !!doc.hidden} : {})};
    const lines = [];
    let waiting = false;
    // Only a wall knocked through waits; everything else applies now
    if ( out.waits && out.result === "done" ) {
      waiting = true;
      await chron()?.propose?.({type: BREACH, key: `breach:${doc.id}`, title: `${actor.name} breaks through a wall`,
        detail: `On ${scene.name}. Approve to open the wall (the whole segment; split it first for a smaller hole).`, data: {scene: scene.id, wall: doc.id, actor: actor.name}});
      lines.push("The wall gives way: the Storyteller decides what the hole looks like (approval queue).");
    }
    // A light source: the scene's lights go on or off
    if ( out.lights !== undefined && tile ) {
      const ls = lightsOf(doc);
      snap.lights = ls.map(l => ({id: l.id, hidden: !!l.hidden}));
      for ( const l of ls ) if ( !!l.hidden === out.lights ) await l.update({hidden: !out.lights});
    }
    // A fire tied to scene lights: they burn while it burns
    if ( o.hazard && tile && typeof out.patch.flags?.burning === "boolean" ) {
      const ls = lightsOf(doc, {onlySet: true});
      if ( ls.length ) {
        snap.lights = ls.map(l => ({id: l.id, hidden: !!l.hidden}));
        for ( const l of ls ) if ( !!l.hidden === out.patch.flags.burning ) await l.update({hidden: !out.patch.flags.burning});
      }
    }
    const update = {};
    if ( out.patch.ds && !waiting ) { if ( tile ) update[`flags.${MOD}.ds`] = out.patch.ds; else update.ds = dsNum(out.patch.ds); }
    for ( const [k, v] of Object.entries(out.patch.flags ?? {}) ) update[`flags.${MOD}.${k}`] = v;
    if ( out.patch.flags?.jammed || out.patch.flags?.broken ) update[`flags.${MOD}.found`] = true;
    // A botched disarm or reset: the trap goes off on the one working at it
    let sprung = null;
    if ( out.springs && o.trap ) {
      sprung = await springOn(tokDoc, actor, o);
      for ( const [k, v] of Object.entries(sprung.flags) ) update[`flags.${MOD}.${k}`] = v;
      update.hidden = false;
      out.noise = sprung.noise;
      lines.push(`${actor.name} ${sprung.text}`, ...sprung.lines);
    }
    if ( Object.keys(update).length ) await doc.update(update, tile ? {} : {sound: true});
    // Using the room in a fight (0.27.0): a fire where a light fell, a chandelier on whoever is under it, the sun let in,
    // the sprinklers; everything made here goes on the card's Undo
    snap.spawned = {tiles: [], regions: []};
    snap.others = [];
    const room = await roomEffects({out, doc, scene, tokDoc, actor, o, snap});
    lines.push(...room.lines);
    // A botch fighting a fire: the fire burns the one fighting it
    let burned = null;
    if ( out.burns && o.hazard ) {
      burned = await hazardOn(tokDoc, actor, o);
      lines.push(...burned.lines);
    }
    // Taking what is inside a container: the items go to the character
    let given = [];
    if ( op.id === "take" && out.result === "done" ) {
      const got = await giveItems(actor, o.items);
      given = got.ids;
      lines.push(got.names.length ? `${actor.name} takes ${listWords(got.names)}.` : "There is nothing there that WoDX could hand over: the Storyteller says what was inside.");
      if ( got.missing.length ) lines.push(`Not found, so not handed over: ${got.missing.join(", ")}.`);
      // 0.24.2: WoDX Storyteller marks what was taken as stolen when the container is someone else's
      if ( given.length ) Hooks.callAll("wodxItemsTaken", {actor, items: given, doc, scene: doc.parent});
    }
    // Hiding: into the place and out of sight; coming out; searching the place
    let revealed = [];
    if ( o.hide ) {
      const occ = (doc.flags?.[MOD]?.occupants ?? []);
      if ( op.id === "hide" && out.hides !== undefined ) {
        await doc.update({[`flags.${MOD}.occupants`]: [...occ.filter(x => x.a !== actor.id), {a: actor.id, t: tokDoc.uuid, n: actor.name, s: out.hides}]});
        await setConcealed(tokDoc, true);
        lines.push(out.hides > 0 ? `${actor.name} is out of sight.` : `${actor.name} is out of sight, but easy to find.`);
      } else if ( op.id === "comeOut" ) {
        await doc.update({[`flags.${MOD}.occupants`]: occ.filter(x => x.a !== actor.id)});
        await setConcealed(tokDoc, false);
      } else if ( op.id === "searchHide" ) {
        const hit = R.findHidden(o, out.searchHide, {bonus: 1});
        revealed = await revealHidden(hit.map(x => ({doc, occ: x})));
        lines.push(revealed.length ? `${actor.name} finds ${listWords(revealed.map(r => r.occ.n))}.` : "Nobody there.");
        const missed = o.occupants.filter(x => !hit.includes(x));
        if ( missed.length ) await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(), content: cardHtml({title: `${esc(actor.name)} searches a hiding place`,
          body: `<p>Missed, still hidden there: ${esc(listWords(missed.map(x => x.n)))}.</p>`})});
      }
    }
    // Events from watch points, mounts and climbs wait for the hearing check below, so NPCs who heard can react
    heldEvents.set(doc.id, []);
    // Examining a clue: what the character learns goes to that player and the Storyteller only
    let whisper = null;
    if ( (op.id === "examine" || op.id === "look") && o.clue ) {
      whisper = await clueReport(o, out, author, actor);
      await clueCodex(o, doc, out, actor).catch(e => console.error(`${MOD} | clue codex`, e));
    }
    if ( o.watch ) {
      const w = await watchReport(o, doc, out, op, author, actor, tokDoc);
      if ( w.whisper ) whisper = w.whisper;
      lines.push(...w.lines);
    }
    if ( o.mount ) lines.push(...await mountReport(o, doc, out, op, actor, tokDoc));
    if ( o.isTarget ) lines.push(...targetReport(o, doc, out, actor));
    let climbed = null;
    if ( o.climb ) { climbed = await climbReport(o, doc, out, actor, tokDoc); lines.push(...climbed.lines); }
    if ( whisper ) lines.push("What was learned is in a whisper to the player and the Storyteller.");
    // A botch on forcing: one lethal level
    let hurt = 0;
    if ( out.hurt ) {
      try { await game.wodxCombat?.applyDamage?.(actor, "lethal", out.hurt); hurt = out.hurt; lines.push(`${actor.name} takes ${out.hurt} lethal.`); }
      catch (e) { lines.push(`${actor.name} takes ${out.hurt} lethal (apply it by hand).`); }
    }
    // Time, outside combat
    let advanced = 0, personal = null;
    if ( out.seconds >= R.MINUTE && setting("advanceClock") && !game.combat?.started ) {
      const t = await passTime(actor, out.seconds);
      advanced = t.advanced; personal = t.personal;
      lines.push(t.line);
    } else if ( out.seconds >= R.MINUTE ) lines.push(`It takes ${timeWords(out.seconds)}.`);
    // Listening: what is on the far side
    const here = !!tok && canvas.scene?.id === scene.id;
    if ( op.id === "listen" && !tile ) await listenReport(here ? tok : null, doc, out, author, actor);
    // Noise
    const loudish = out.noise && out.noise !== "silent" && setting("noise") !== false;
    const heard = loudish && here ? hearersOf(tok, doc, out.noise) : [];
    if ( loudish && !here ) lines.push("Nobody's hearing was checked: the Storyteller is viewing another scene.");
    if ( heard.length ) lines.push(`Heard by ${heard.map(h => `${h.name}${h.likely ? ` (likely: ${h.likely})` : ""}`).join(", ")}.`);
    Hooks.callAll("wodxInteractablesNoise", {scene: scene.id, wall: doc.id, token: tokDoc.uuid, noise: out.noise, heard: heard.map(h => h.uuid)});
    releaseEvents(doc.id, heard.map(h => h.uuid));
    const done = {result: out.result, text: out.text, noise: out.noise, snap, hurt, advanced, personal, worldTime: game.time.worldTime, waiting, lines, given,
      heard: heard.map(h => h.uuid), alarm: !!out.alarm || !!out.patch?.flags?.alarm,
      damageMsg: sprung?.damageMsg ?? burned?.damageMsg ?? climbed?.damageMsg ?? null, whisper: whisper?.id ?? null, revealed: [...revealed, ...room.revealed], moved: climbed?.moved ?? null,
      roomDamage: room.damage, undone: false};
    const verdict = waiting ? "Waiting for the Storyteller" : {done: "Done", progress: "Headway", fail: "No luck", botch: "Botch"}[out.result] ?? "";
    await msg.update({[`flags.${MOD}.ask.state`]: "done", [`flags.${MOD}.done`]: done, content: resultHtml(msg, done, verdict)});
    return done;
  } finally { busy.delete(msg.id); releaseEvents(msg?.flags?.[MOD]?.ask ? objectIn(game.scenes.get(msg.flags[MOD].ask.scene), msg.flags[MOD].ask.wall)?.id : null, []); }
}
const titleOf = msg => (String(msg.content).match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1] ?? "WoDX");
function resultHtml(msg, done, verdict) {
  const dice = (String(msg.content).match(/<div class="vta-dice">[\s\S]*?<\/div>/g) ?? []).join("");
  const line = String(msg.content).match(/<p class="wodx-quiet">([^<]*)<\/p>/)?.[1] ?? "";
  const name = msg.speaker?.alias ?? "";
  const body = `<p><b>${esc(name)}</b> ${esc(done.text)}${done.noise && done.noise !== "silent" ? ` <span class="wodx-quiet">(${esc(done.noise)})</span>` : ""}</p>`
    + (done.lines.length ? `<ul class="wix-lines">${done.lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>` : "")
    + `<div class="wix-done">${done.undone ? "<b>Undone.</b>" : `<button type="button" class="wix-undo">Undo</button>`}</div>`;
  return `<div class="vta-card wodx-x wix"><header class="vta-head"><h3 style="${H3}">${titleOf(msg)}</h3><span class="vta-verdict">${esc(verdict)}</span></header>`
    + `<div class="vta-body">${line ? `<p class="wodx-quiet">${line}</p>` : ""}${dice}${body}</div></div>`;
}

const yardsBetween = (a, b) => {
  try {
    const units = canvas.scene?.grid?.units ?? "ft";
    const d = canvas.grid.measurePath([a, b]).distance;
    return /m|meter|metre|yd|yard/i.test(units) ? d : d / 3;
  } catch (e) { return Math.hypot(a.x - b.x, a.y - b.y) / (canvas.grid?.size ?? 100) * 1.67; }
};
const soundWalls = (a, b) => {
  try {
    const hits = CONFIG.Canvas.polygonBackends.sound.testCollision(a, b, {type: "sound", mode: "all"});
    return Array.isArray(hits) ? hits.length : hits ? 1 : 0;
  } catch (e) { return 0; }
};
const asleepNow = actor => {
  const f = actor?.flags?.["wodx-npc"] ?? {};
  return !!f.routine?.on && f.where?.activity === "sleep";
};

/** NPCs who hear a noise at a door: [{name, uuid, likely}]. */
export function hearersOf(tok, doc, noise) {
  const out = [];
  const wallish = Array.isArray(doc.c);
  const mySide = wallish ? R.sideOf(doc.c, tok.center) ?? "a" : "a";
  const npc = game.modules.get("wodx-npc")?.api;
  for ( const t of canvas.tokens?.placeables ?? [] ) {
    if ( !t.actor || t.id === tok.id || t.actor.hasPlayerOwner || t.document.hidden ) continue;
    // The noise is at the door: heard from the listener's own side of it (a container: from the container)
    const from = wallish ? R.besideWall(doc.c, R.sideOf(doc.c, t.center) ?? mySide, 4) : nearOnTile(doc, t.center);
    const yards = yardsBetween(from, t.center);
    const h = R.hears(noise, {yards, walls: soundWalls(from, t.center), asleep: asleepNow(t.actor),
      perception: attrOf(t.actor, "perception"), alertness: num(t.actor.system?.abilities?.alertness?.value)});
    if ( !h.hears ) continue;
    let likely = "";
    try {
      const top = npc?.routineRules?.pickReaction?.(npc.profileFor(t.actor), {night: false, curfew: false, trespass: true, weapon: false, supernatural: false, alliesNear: 0, homeGround: true})?.[0];
      likely = top ? (npc.routineRules.RESPONSES?.[top.action] ?? "").toLowerCase() : "";
    } catch (e) { likely = ""; }
    out.push({name: t.name, uuid: t.document.uuid, likely});
  }
  return out;
}

/**
 * Active Storyteller (0.28.0): a noise with no object behind it, such as a fight or a chase, heard from where a token
 * stands. noise: quiet | loud; kind: "fight" | "chase"; except: token uuids that are part of it and so don't count as
 * hearers. Passed on as a map event like any other, so NPCs who hear it react. Returns the event, or null.
 */
export function noiseAt({token, noise = "loud", kind = "fight", objectName = null, except = []} = {}) {
  const tok = token?.object ?? token;
  const tokDoc = tok?.document ?? token;
  if ( !isActiveGM() || setting("noise") === false || !tok?.center || !R.EARSHOT[noise] || noise === "silent" ) return null;
  if ( canvas.scene?.id !== tokDoc?.parent?.id ) return null;
  const skip = new Set(except);
  const heard = [];
  for ( const t of canvas.tokens?.placeables ?? [] ) {
    if ( !t.actor || t.id === tok.id || t.actor.hasPlayerOwner || t.document.hidden || skip.has(t.document.uuid) ) continue;
    const h = R.hears(noise, {yards: yardsBetween(tok.center, t.center), walls: soundWalls(tok.center, t.center), asleep: asleepNow(t.actor),
      perception: attrOf(t.actor, "perception"), alertness: num(t.actor.system?.abilities?.alertness?.value)});
    if ( h.hears ) heard.push(t.document.uuid);
  }
  return publish(kind, {scene: tokDoc.parent, tokDoc, noise, heard, objectName, at: tok.center});
}

async function listenReport(tok, doc, out, author, actor) {
  if ( !tok ) return ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(), content: cardHtml({title: `${esc(actor.name)} listens`, body: "<p>View the scene to hear what is on the far side.</p>"})});
  const mySide = R.sideOf(doc.c, tok.center) ?? "a", far = mySide === "a" ? "b" : "a";
  const from = R.besideWall(doc.c, far, 4);
  const beyond = (canvas.tokens?.placeables ?? []).filter(t => t.actor && t.id !== tok.id && !t.document.hidden && R.sideOf(doc.c, t.center) === far
    && yardsBetween(from, t.center) <= 10 && soundWalls(from, t.center) === 0).map(t => ({moving: !asleepNow(t.actor)}));
  const awake = beyond.filter(b => b.moving).length;
  beyond.forEach(b => { b.talking = awake >= 2 && b.moving; });
  const text = R.listenText(out.listen ?? 0, beyond);
  const whisper = [...new Set([author?.id, ...gmIds()].filter(Boolean))];
  await ChatMessage.create({speaker: {alias: actor.name}, whisper, content: cardHtml({title: `${esc(actor.name)} listens`, body: `<p>${esc(text)}</p>`})});
  if ( (out.listen ?? 0) < 0 ) await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(),
    content: cardHtml({title: `${esc(actor.name)} botches listening`, body: `<p>The player was told nothing certain. Say what ${esc(actor.name)} wrongly hears, or leave it.</p>`})});
}

/** Storyteller: put a door back as it was before a card. */
export async function undoCard(msg) {
  msg = typeof msg === "string" ? game.messages.get(msg) : msg;
  const done = foundry.utils.deepClone(msg?.flags?.[MOD]?.done);
  if ( !done || done.undone || !game.user.isGM ) return null;
  const ask = msg.flags[MOD].ask, doc = objectIn(game.scenes.get(ask.scene), ask.wall);
  if ( doc ) {
    const update = isTile(doc) || done.snap.ds === null ? {} : {ds: done.snap.ds};
    if ( isTile(doc) && typeof done.snap.hidden === "boolean" ) update.hidden = done.snap.hidden;
    for ( const s0 of done.snap.lights ?? [] ) {
      const l = doc.parent?.lights?.get?.(s0.id);
      if ( l && !!l.hidden !== s0.hidden ) await l.update({hidden: s0.hidden});
    }
    const now = doc.flags?.[MOD] ?? {};
    // The tile's own picture from before any state picture (artBase) stays: the picture is put back from it
    for ( const k of Object.keys(now) ) if ( !(k in done.snap.flags) && k !== "artBase" ) Object.assign(update, unsetKey(`flags.${MOD}.${k}`));
    for ( const [k, v] of Object.entries(done.snap.flags) ) update[`flags.${MOD}.${k}`] = v;
    // Entries added since inside an object flag (a new name on a scoreboard) go too: an update only merges them
    const plain = x => !!x && typeof x === "object" && !Array.isArray(x);
    for ( const [k, v] of Object.entries(done.snap.flags) ) {
      if ( plain(v) && plain(now[k]) ) for ( const sub of Object.keys(now[k]) ) if ( !(sub in v) ) Object.assign(update, unsetKey(`flags.${MOD}.${k}.${sub}`));
    }
    await doc.update(update, isTile(doc) ? {} : {sound: false});
  }
  // 0.27.0: what using the room made goes, and what it changed elsewhere on the scene comes back
  const usc = game.scenes.get(ask.scene);
  if ( usc && done.snap?.spawned ) {
    const tl = (done.snap.spawned.tiles ?? []).filter(id => usc.tiles?.get?.(id));
    const rg = (done.snap.spawned.regions ?? []).filter(id => usc.regions?.get?.(id));
    try { if ( tl.length ) await usc.deleteEmbeddedDocuments("Tile", tl); } catch (e) { console.warn(`${MOD} | undo`, e); }
    try { if ( rg.length ) await usc.deleteEmbeddedDocuments("Region", rg); } catch (e) { console.warn(`${MOD} | undo`, e); }
  }
  for ( const x of done.snap?.others ?? [] ) {
    const t = usc?.tiles?.get?.(x.id);
    if ( t ) await t.update({[`flags.${MOD}.burning`]: x.burning});
    for ( const l0 of x.lights ?? [] ) { const l = usc?.lights?.get?.(l0.id); if ( l && !!l.hidden !== l0.hidden ) await l.update({hidden: l0.hidden}); }
  }
  for ( const id of done.roomDamage ?? [] ) { const m = game.messages?.get?.(id); const d = m?.flags?.["wodx-combat"]?.data; const a = d?.target ? await fromUuid(d.target) : null; if ( a ) await undoDamage(a?.actor ?? a, id); }
  // People found in hiding go back into hiding (their places' occupant lists come back with each tile's flags)
  for ( const r of done.revealed ?? [] ) {
    const t = game.scenes.get(ask.scene)?.tiles?.get?.(r.tile);
    if ( t && r.tile !== ask.wall ) await t.update({[`flags.${MOD}.occupants`]: [...(t.flags?.[MOD]?.occupants ?? []).filter(x => x.a !== r.occ.a), r.occ]});
    const td = await fromUuid(r.occ.t);
    if ( td ) await setConcealed(td, true);
  }
  // A climb or a jump: the token goes back to where it started
  if ( done.moved ) {
    const td = await fromUuid(done.moved.t);
    if ( td ) { lastSeen.set(td.uuid, centerAt(td, done.moved)); await td.update({x: done.moved.x, y: done.moved.y}, STRAIGHT(td)); }
  }
  // Hiding or coming out: the token goes back as it was
  if ( ["hide", "comeOut"].includes(ask.op) && done.snap?.flags?.hide ) {
    const td = await fromUuid(ask.token);
    if ( td ) await setConcealed(td, ask.op === "comeOut");
  }
  // Traps a search found go back to hidden
  for ( const f of done.found ?? [] ) {
    const t = game.scenes.get(ask.scene)?.tiles?.get?.(f.id);
    if ( t ) await t.update({hidden: f.hidden, [`flags.${MOD}.found`]: f.found});
  }
  const actor = (await fromUuid(ask.token))?.actor;
  if ( done.damageMsg ) await undoDamage(actor, done.damageMsg);
  if ( done.whisper ) { try { await game.messages?.get?.(done.whisper)?.delete?.(); } catch (e) { /* already gone */ } }
  // Items handed over from a container go back
  if ( done.given?.length && actor ) {
    const ids = done.given.filter(id => actor.items?.get?.(id));
    if ( ids.length ) { try { await actor.deleteEmbeddedDocuments("Item", ids); } catch (e) { /* by hand */ } }
  }
  if ( done.hurt && actor ) { try { await game.wodxCombat?.healDamage?.(actor, "lethal", done.hurt); } catch (e) { /* by hand */ } }
  // The clock goes back only if nothing else has moved it since
  if ( done.advanced && game.time.worldTime === done.worldTime ) await game.time.advance(-done.advanced);
  if ( done.personal ) { try { await game.modules.get("wodx-storyteller")?.api?.time?.unspend?.(done.personal); } catch (e) { /* by hand */ } }
  if ( done.waiting ) {
    const q = chron()?.approvals?.pending?.() ?? [];
    const entry = q.find(p => p.key === `breach:${ask.wall}`);
    if ( entry ) await chron()?.approvals?.decide?.(entry.id, "reject", "Undone from the chat card.");
  }
  done.undone = true;
  await msg.update({[`flags.${MOD}.done`]: done, content: resultHtml(msg, done, "Undone")});
  return done;
}

/* ------------------------------------------------------------------ */
/*  Traps: searching, springing                                         */
/* ------------------------------------------------------------------ */

const SEARCH_SQUARES = 3;
/** The hidden traps and clues a token could find by searching: within three squares, not behind a wall. */
export function searchableTraps(tokCenter, scene = canvas.scene) {
  const grid = scene?.grid?.size ?? canvas?.grid?.size ?? 100;
  const out = [];
  for ( const doc of tilesOf(scene) ) {
    const o = describeTile(doc);
    if ( !(o?.trap || (o?.clue && doc.hidden)) || o.found ) continue;
    if ( distanceToTile(doc, tokCenter) > grid * SEARCH_SQUARES ) continue;
    if ( scene.id === canvas?.scene?.id && blocked("move", tokCenter, nearOnTile(doc, tokCenter)) ) continue;
    out.push({doc, o});
  }
  return out;
}
/** Hiding places with someone in them, within search range of a point. */
function hidingPlacesNear(p, scene) {
  const grid = scene?.grid?.size ?? canvas?.grid?.size ?? 100;
  return tilesOf(scene).map(doc => ({doc, o: describeTile(doc)})).filter(({doc, o}) => o?.hide && o.occupants.length && distanceToTile(doc, p) <= grid * SEARCH_SQUARES);
}
async function applySearch(msg, ask, tokDoc, scene) {
  const actor = tokDoc.actor, center = centerOf(tokDoc, scene);
  const roll = (msg.rolls ?? []).slice(0, 1).map(r => countSuccesses(r.dice?.[0]?.results?.map(x => x.result) ?? [], clampDifficulty(num(ask.diff) || 6),
    {specialty: !!ask.specialty, willpower: !!ask.willpower}))[0] ?? {successes: 0, botch: false};
  const op = R.searchOption(characterFor(actor, center, null));
  const out = R.resolve({}, op, [roll], {actorId: actor.id});
  const near = searchableTraps(center, scene);
  const finds = new Set(R.searchFinds(near.map(n => n.o), roll));
  const hit = near.filter(n => finds.has(n.o));
  const found = [], lines = [];
  for ( const {doc, o} of hit ) {
    found.push({id: doc.id, hidden: !!doc.hidden, found: !!doc.flags?.[MOD]?.found});
    await doc.update({hidden: false, [`flags.${MOD}.found`]: true});
    lines.push(o.clue ? `${actor.name} notices something: ${R.nameOf(o).toLowerCase()}.` : `${actor.name} finds a ${R.TRAPS[o.kind].label.toLowerCase()}.`);
  }
  // People in hiding places close by
  const places = hidingPlacesNear(center, scene);
  const foundPeople = places.flatMap(({doc, o}) => R.findHidden(o, roll).map(occ => ({doc, occ})));
  const revealed = await revealHidden(foundPeople);
  if ( revealed.length ) lines.push(`${actor.name} finds ${listWords(revealed.map(r => r.occ.n))} in hiding.`);
  const missedPeople = places.flatMap(({o}) => o.occupants.filter(x => !foundPeople.some(f => f.occ.a === x.a)).map(x => x.n));
  if ( roll.successes > 0 && !roll.botch && !hit.length && !revealed.length ) lines.push("Nothing hidden turns up.");
  const missed = near.filter(n => !finds.has(n.o));
  if ( missedPeople.length ) await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(), content: cardHtml({title: `${esc(actor.name)} searches`,
    body: `<p>Still in hiding: ${esc(listWords(missedPeople))}.</p>`})});
  if ( missed.length ) await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(), content: cardHtml({title: `${esc(actor.name)} searches`,
    body: `<p>Missed, still hidden: ${esc(listWords(missed.map(n => R.nameOf(n.o))))}.</p>`})});
  let advanced = 0, personal = null;
  if ( setting("advanceClock") && !game.combat?.started ) { const t = await passTime(actor, op.seconds); advanced = t.advanced; personal = t.personal; lines.push(t.line); }
  const done = {result: out.result, text: out.text, noise: "silent", snap: null, hurt: 0, advanced, personal, worldTime: game.time.worldTime, waiting: false, lines, given: [], found, revealed, undone: false};
  const verdict = hit.length || revealed.length ? "Found" : out.result === "botch" ? "Botch" : "Nothing found";
  await msg.update({[`flags.${MOD}.ask.state`]: "done", [`flags.${MOD}.done`]: done, content: resultHtml(msg, done, verdict)});
  return done;
}

/**
 * Active GM: a trap goes off on a character. Rolls to get clear, then the damage through WoDX Combat (soak and all).
 * Returns {flags, text, lines, noise, damageMsg, dice, type, reflex}; the caller writes the flags to the tile.
 */
export async function springOn(tokDoc, actor, o) {
  const ch = characterFor(actor, null, null);
  const rr = R.reflexRoll(o, ch);
  let reflex = null, lines = [];
  if ( rr ) {
    const roll = new Roll(`${Math.max(1, rr.dice)}d10`);
    await roll.evaluate();
    reflex = countSuccesses(roll.dice[0]?.results?.map(x => x.result) ?? [], rr.diff, {});
    reflex.faces = roll.dice[0]?.results?.map(x => x.result) ?? [];
    lines.push(`Getting clear: Dexterity${rr.ability ? ` + ${cap(rr.ability)}` : ""}, ${Math.max(1, rr.dice)} dice at ${rr.diff}: ${reflex.botch ? "a botch" : `${reflex.successes} success${reflex.successes === 1 ? "" : "es"}`}.`);
  }
  const out = R.springTrap(o, reflex, actor.id);
  let damageMsg = null;
  if ( out.dice > 0 ) {
    const combat = game.wodxCombat;
    if ( combat?.soakAndApply ) {
      try {
        const res = await combat.soakAndApply(tokDoc.object ?? actor, {mode: "pool", amount: out.dice, type: out.type, soak: true, fortBlood: "auto", soakBonus: 0});
        damageMsg = res?.message?.id ?? null;
        lines.push(`${out.dice} ${out.type} dice of damage: soak and the result are on the WoDX Combat card${res?.levels ? ` (${res.levels} ${out.type})` : ""}.`);
      } catch (e) { console.error(`${MOD} |`, e); lines.push(`${out.dice} dice of ${out.type} damage: roll and apply it by hand.`); }
    } else lines.push(`${out.dice} dice of ${out.type} damage: WoDX Combat is off, so roll and apply it by hand.`);
  }
  if ( out.caught ) lines.push(`${actor.name} is held until breaking free (Strength, difficulty 7) or someone cuts the snare.`);
  return {...out, lines, damageMsg, reflex};
}
/** 0.24.0: the first look that reaches the clue's mark puts its journal page in the character's codex (WoDX Storyteller). */
async function clueCodex(o, doc, out, actor) {
  if ( !game.user.isGM || !actor ) return false;
  const best = Math.max(0, out.examine ?? 0, Number(o.seen?.[actor.id]) || 0);
  if ( !R.codexDue(o, actor.id, best) ) return false;
  const st = game.modules.get("wodx-storyteller");
  const page = await fromUuid(o.codexPage).catch(() => null);
  if ( !st?.active || !st.api?.codex?.reveal || !page ) return false;
  await st.api.codex.reveal(page, [actor]);
  await doc.update({[`flags.${MOD}.codexed`]: {...(o.codexed ?? {}), [actor.id]: true}});
  return true;
}
/** Whisper what a character learns from a clue: the texts its successes reach (all it has learned so far). */
async function clueReport(o, out, author, actor) {
  const best = out.examine === undefined ? 0 : Math.max(0, out.examine);
  const texts = R.clueTexts(o, best);
  const whisper = [...new Set([author?.id, ...gmIds()].filter(Boolean))];
  const para = t => `<p>${esc(t).replace(/\r?\n/g, "<br>")}</p>`;
  const body = (texts.length ? texts.map(para).join("") : "<p>Nothing the Storyteller has written down.</p>")
    + (out.examine < 0 ? `<p class="wodx-quiet">A botch: the Storyteller may add something misleading.</p>` : "");
  return ChatMessage.create({speaker: {alias: actor.name}, whisper, content: cardHtml({title: `${esc(actor.name)}: ${esc(R.nameOf(o))}`, body})});
}
/**
 * Hide or show a token. The "invisible" status keeps it in sight of its own player and the Storyteller only; a world
 * without that status falls back on the token's hidden switch. Returns what was used, for Undo.
 */
export async function setConcealed(tokDoc, on) {
  const actor = tokDoc?.actor;
  const has = (CONFIG.statusEffects ?? []).some(e => e.id === "invisible");
  if ( has && typeof actor?.toggleStatusEffect === "function" ) {
    const now = !!actor.statuses?.has?.("invisible");
    // A token placed a moment ago may not be drawn yet; core reads its mesh when the status is applied
    // On the scene in view, a token placed a moment ago may have no placeable yet: wait for it too
    const onView = !!tokDoc.parent && tokDoc.parent === globalThis.canvas?.scene;
    const undrawn = () => (onView && !tokDoc.object) || [tokDoc.object, ...(actor.getActiveTokens?.() ?? [])].some(t => t && !t.mesh);
    for ( let i = 0; i < 20 && undrawn(); i++ ) await new Promise(r => setTimeout(r, 25));
    if ( now !== on ) await actor.toggleStatusEffect("invisible", {active: on});
    return "status";
  }
  if ( !!tokDoc.hidden !== on ) await tokDoc.update({hidden: on});
  return "hidden";
}
/** Reveal people found in hiding places: out of the place, and seen again. found: [{doc, occ}]. */
async function revealHidden(found) {
  const out = [];
  for ( const {doc, occ} of found ) {
    const rest = (doc.flags?.[MOD]?.occupants ?? []).filter(x => x.a !== occ.a);
    await doc.update({[`flags.${MOD}.occupants`]: rest});
    const td = await fromUuid(occ.t);
    if ( td ) await setConcealed(td, false);
    out.push({tile: doc.id, occ});
  }
  return out;
}
/** Take back trap damage: the WoDX Combat card's damage, if applied, and the card itself. */
async function undoDamage(actor, msgId) {
  const m = game.messages?.get?.(msgId);
  const data = m?.flags?.["wodx-combat"]?.data;
  try {
    if ( data?.applied && data.undo?.damage && actor && game.wodxCombat?.setDamage ) await game.wodxCombat.setDamage(actor, data.undo.damage);
    else if ( data?.applied && actor ) await game.wodxCombat?.healDamage?.(actor, data.type, data.levels);
  } catch (e) { console.error(`${MOD} |`, e); }
  try { await m?.delete?.(); } catch (e) { /* already gone */ }
}

/** Where each token stood last, so a move's whole path can be checked for traps. */
const lastSeen = new Map();
const segHitsRect = (a, b, r) => {
  // Liang-Barsky clip of the segment a-b against the rectangle
  let t0 = 0, t1 = 1;
  const dx = b.x - a.x, dy = b.y - a.y;
  for ( const [p, q] of [[-dx, a.x - r.x], [dx, r.x + r.w - a.x], [-dy, a.y - r.y], [dy, r.y + r.h - a.y]] ) {
    if ( p === 0 ) { if ( q < 0 ) return false; continue; }
    const t = q / p;
    if ( p < 0 ) { if ( t > t1 ) return false; if ( t > t0 ) t0 = t; }
    else { if ( t < t0 ) return false; if ( t < t1 ) t1 = t; }
  }
  return true;
};
const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
/** The armed traps a move from a to b sets off: a hidden one anywhere on the path, a found one only where the move ends. */
export function trapsOnPath(scene, a, b, {npc = false} = {}) {
  const out = [];
  for ( const doc of tilesOf(scene) ) {
    const o = describeTile(doc);
    if ( !o?.trap || !o.armed || (npc && !o.npcs) ) continue;
    const r = rectOf(doc);
    if ( o.found ? inRect(b, r) : segHitsRect(a, b, r) ) out.push({doc, o});
  }
  return out;
}
const springing = new Set();
/** Active GM: a token moved. Any trap on its way goes off, with a card and an Undo. */
export async function onTokenMoved(tokDoc, changes = {}, {userId = null, held = false} = {}) {
  const scene = tokDoc.parent, actor = tokDoc.actor;
  // Where the move ends: Foundry 14 can call the hook before the document shows the new place, so the change wins
  const pos = {x: num(changes?.x ?? tokDoc.x), y: num(changes?.y ?? tokDoc.y)};
  const to = centerAt(tokDoc, pos), from = lastSeen.get(tokDoc.uuid) ?? to;
  lastSeen.set(tokDoc.uuid, to);
  if ( !actor || !scene || !isActiveGM() || held ) return [];
  // WoDX Chronicle 0.22.0: a flaw set off by something on the way (running water, garlic, a cross, what a Phobia names)
  const tr = await traitTriggers(tokDoc, actor, scene, from, to, pos, userId);
  if ( tr?.hold ) return [tr.msg];
  await carryAboard(tokDoc, scene, from, to, pos);
  // Walking out of a hiding place ends the hiding
  for ( const doc of tilesOf(scene) ) {
    const occ = doc.flags?.[MOD]?.hide ? (doc.flags[MOD].occupants ?? []) : [];
    if ( occ.some(x => x.a === actor.id) && !inRect(to, rectOf(doc)) ) {
      await doc.update({[`flags.${MOD}.occupants`]: occ.filter(x => x.a !== actor.id)});
      await setConcealed(tokDoc, false);
    }
  }
  const cards = tr?.msg ? [tr.msg] : [];
  if ( setting("hazards") !== false ) {
    for ( const {doc, o} of hazardsOnPath(scene, from, to, {npc: !actor.hasPlayerOwner}) ) cards.push(await hazardCard(tokDoc, actor, doc, o, "enters"));
  }
  if ( isDemonActor(actor) ) {
    for ( const doc of tilesOf(scene) ) {
      const o = describeTile(doc), r = rectOf(doc);
      if ( R.holyGround(o) && !inRect(from, r) && segHitsRect(from, to, r) ) cards.push(await holyCard(tokDoc, actor, doc, o, "enters"));
    }
  }
  if ( setting("traps") === false ) return cards.filter(Boolean);
  for ( const {doc, o} of trapsOnPath(scene, from, to, {npc: !actor.hasPlayerOwner}) ) {
    if ( springing.has(doc.id) ) continue;
    springing.add(doc.id);
    try { cards.push(await springCard(tokDoc, actor, doc, o)); } finally { springing.delete(doc.id); }
  }
  return cards.filter(Boolean);
}
async function springCard(tokDoc, actor, doc, o) {
  const scene = doc.parent;
  const snap = {ds: null, flags: foundry.utils.deepClone(doc.flags?.[MOD] ?? {}), hidden: !!doc.hidden};
  const sp = await springOn(tokDoc, actor, o);
  const update = {hidden: false};
  for ( const [k, v] of Object.entries(sp.flags) ) update[`flags.${MOD}.${k}`] = v;
  await doc.update(update);
  const lines = [...sp.lines];
  const tok = tokDoc.object, here = !!tok && canvas.scene?.id === scene.id;
  const heard = here && setting("noise") !== false && sp.noise !== "silent" ? hearersOf(tok, doc, sp.noise) : [];
  if ( heard.length ) lines.push(`Heard by ${heard.map(h => `${h.name}${h.likely ? ` (likely: ${h.likely})` : ""}`).join(", ")}.`);
  Hooks.callAll("wodxInteractablesNoise", {scene: scene.id, wall: doc.id, token: tokDoc.uuid, noise: sp.noise, heard: heard.map(h => h.uuid)});
  Hooks.callAll("wodxInteractablesTrap", {scene: scene.id, tile: doc.id, token: tokDoc.uuid, kind: o.kind, caught: sp.caught, dice: sp.dice});
  const done = {result: "done", text: sp.text, noise: sp.noise, snap, hurt: 0, advanced: 0, worldTime: game.time.worldTime, waiting: false, lines, given: [],
    damageMsg: sp.damageMsg, heard: heard.map(h => h.uuid), undone: false};
  const ask = {v: 1, scene: scene.id, wall: doc.id, token: tokDoc.uuid, op: "spring", label: "A trap", user: game.user.id, state: "done"};
  const title = `${esc(actor.name)}: ${esc(R.TRAPS[o.kind].label)}`;
  const faces = sp.reflex?.faces ?? [];
  const dice = faces.length ? `<div class="vta-dice">${faces.map(f => `<span class="vta-die ${f === 1 ? "one" : f >= R.TRAP_GRADES[o.grade].diff ? "hit" : "miss"}">${f}</span>`).join("")}</div>` : "";
  const stub = {content: cardHtml({title, dice}), speaker: {alias: actor.name}};
  return ChatMessage.create({speaker: ChatMessage.getSpeaker({token: tokDoc}), content: resultHtml(stub, done, "A trap"), flags: {[MOD]: {ask, done}}});
}

/* ------------------------------------------------------------------ */
/*  Merits and flaws set off on the map (WoDX Chronicle 0.22.0, P4)     */
/* ------------------------------------------------------------------ */

/** The names of what a move from a to b walks into: tile titles and region names, not counting where it began. */
export function labelsOnPath(scene, a, b) {
  const out = [];
  for ( const doc of tilesOf(scene) ) {
    const t = describeTile(doc)?.title || doc.flags?.[MOD]?.title || "";
    const r = rectOf(doc);
    if ( t && !inRect(a, r) && segHitsRect(a, b, r) ) out.push(t);
  }
  const regions = scene?.regions?.contents ?? [...(scene?.regions?.values?.() ?? [])];
  const steps = 12;
  for ( const reg of regions ) {
    const name = String(reg.name ?? "");
    if ( !name || typeof reg.testPoint !== "function" ) continue;
    const at = p => { try { return reg.testPoint({x: p.x, y: p.y, elevation: 0}); } catch (e) { return false; } };
    if ( at(a) ) continue;
    for ( let i = 1; i <= steps; i++ ) {
      const p = {x: a.x + (b.x - a.x) * i / steps, y: a.y + (b.y - a.y) * i / steps};
      if ( at(p) ) { out.push(name); break; }
    }
  }
  return out;
}
async function traitTriggers(tokDoc, actor, scene, from, to, pos, userId) {
  if ( setting("traitTriggers") === false ) return null;
  let list = [];
  try { list = game.modules.get("wodx-chronicle")?.api?.traits?.triggers?.(actor) ?? []; } catch (e) { list = []; }
  if ( !list.length || (from.x === to.x && from.y === to.y) ) return null;
  const R7 = game.modules.get("wodx-chronicle")?.api?.traits?.rules;
  const hit = R7?.triggered?.(list, labelsOnPath(scene, from, to)) ?? [];
  if ( !hit.length ) return null;
  // A player's move is held where it began; the Storyteller's own moves go through, with the card
  const byGM = !!game.users.get(userId)?.isGM;
  const hold = hit.some(t => t.stop) && !byGM;
  if ( hold ) {
    const g = scene.grid?.size ?? 100;
    const back = {x: Math.round(from.x - num(tokDoc.width || 1) * g / 2), y: Math.round(from.y - num(tokDoc.height || 1) * g / 2)};
    await tokDoc.update(back, {wodxHeld: true, animate: false});
  }
  const owners = game.users.filter(u => !u.isGM && actor.testUserPermission?.(u, "OWNER")).map(u => u.id);
  const lines = hit.map(t => `<li><b>${esc(t.name)}</b>: ${esc(actor.name)} ${esc(t.text)}.${t.roll ? ` ${esc(t.roll)}.` : ""} <small>(${esc(t.book)} p. ${t.page})</small></li>`).join("");
  const msg = await ChatMessage.create({speaker: ChatMessage.getSpeaker({token: tokDoc}), whisper: [...gmIds(), ...owners],
    content: `<div class="vta-card"><h3>${esc(actor.name)}${hold ? " stops" : ""}</h3><ul>${lines}</ul>${hold ? "<p class=\"wodx-quiet\">The move is held where it began. The Storyteller can move the token on.</p>" : ""}</div>`});
  return {msg, hold};
}

/* ------------------------------------------------------------------ */
/*  Hazards: fire, glass, live wires                                    */
/* ------------------------------------------------------------------ */

/** The live hazards a move from a to b walks into (from outside them). npc: the mover is not a player's character. */
export function hazardsOnPath(scene, a, b, {npc = false} = {}) {
  const out = [];
  for ( const doc of tilesOf(scene) ) {
    const o = describeTile(doc);
    if ( !o?.hazard || !o.live || (npc && o.pcsOnly) ) continue;
    const r = rectOf(doc);
    if ( !inRect(a, r) && segHitsRect(a, b, r) ) out.push({doc, o});
  }
  return out;
}
/** The live hazards that hurt each turn and a point stands in. */
export function hazardsAt(scene, p) {
  return tilesOf(scene).map(doc => ({doc, o: describeTile(doc)})).filter(({doc, o}) => o?.hazard && o.live && R.HAZARDS[o.kind].hurtsInTurn && inRect(p, rectOf(doc)));
}
/**
 * Active GM: a hazard hurts a character, through WoDX Combat (soak and all). Sharp ground: a Dexterity + Athletics roll
 * first, each success a die fewer. Returns {text, lines, damageMsg, faces, diff}.
 */
export async function hazardOn(tokDoc, actor, o) {
  const ch = {...characterFor(actor, null, null), profile: game.wodxCombat?.getProfile?.(actor) ?? "mortal"};
  const cr = R.carefulRoll(o, ch);
  let careful = null, faces = [];
  const lines = [];
  if ( cr ) {
    const roll = new Roll(`${Math.max(1, cr.dice)}d10`);
    await roll.evaluate();
    faces = roll.dice[0]?.results?.map(x => x.result) ?? [];
    careful = countSuccesses(faces, cr.diff, {});
    lines.push(`Stepping carefully: Dexterity${cr.ability ? ` + ${cap(cr.ability)}` : ""}, ${Math.max(1, cr.dice)} dice at ${cr.diff}: ${careful.botch ? "a botch" : `${careful.successes} success${careful.successes === 1 ? "" : "es"}`}.`);
  }
  const hit = R.hazardHit(o, ch, careful);
  if ( !hit ) return {text: "", lines, damageMsg: null, faces, diff: cr?.diff ?? 6};
  let damageMsg = null;
  if ( hit.amount > 0 ) {
    const what = hit.mode === "pool" ? `${hit.amount} ${hit.type} dice` : `${hit.amount} ${hit.type} level${hit.amount === 1 ? "" : "s"}`;
    const combat = game.wodxCombat;
    if ( combat?.soakAndApply ) {
      try {
        const res = await combat.soakAndApply(tokDoc.object ?? actor, {mode: hit.mode, amount: hit.amount, type: hit.type, fireSun: hit.fireSun, soakDiff: hit.soakDiff,
          soak: true, fortBlood: "auto", soakBonus: 0, ...(hit.botchAggravated ? {botchAggravated: true} : {})});
        damageMsg = res?.message?.id ?? null;
        lines.push(`${cap(what)}: soak and the result are on the WoDX Combat card${res?.levels ? ` (${res.levels} ${res.levels === 1 ? "level" : "levels"} after soak)` : ""}.`);
      } catch (e) { console.error(`${MOD} |`, e); lines.push(`${cap(what)}: roll soak and apply it by hand.`); }
    } else lines.push(`${cap(what)}: WoDX Combat is off, so soak and apply it by hand.`);
  }
  lines.push(...hit.notes);
  return {text: hit.text, lines, damageMsg, faces, diff: cr?.diff ?? 6};
}
const burning = new Set();
/** Active GM: a card for a hazard hurting a character, with Undo. why: "enters" or "turn". */
export async function hazardCard(tokDoc, actor, doc, o, why = "enters") {
  const key = `${doc.id}:${tokDoc.uuid}`;
  if ( burning.has(key) ) return null;
  burning.add(key);
  try {
    const scene = doc.parent;
    const snap = {ds: null, flags: foundry.utils.deepClone(doc.flags?.[MOD] ?? {}), hidden: !!doc.hidden};
    const hz = await hazardOn(tokDoc, actor, o);
    const lines = [why === "turn" ? `${actor.name} starts the turn in it.` : `${actor.name} walks into it.`, ...hz.lines];
    // A live wire holds whoever touches it until they pull free or the power is cut
    if ( o.kind === "shock" && o.live ) {
      if ( !o.caught?.[actor.id] ) await doc.update({[`flags.${MOD}.caught.${actor.id}`]: true});
      lines.push(`${actor.name} is held by the current: Pull free (Strength) or cut the power.`);
    }
    Hooks.callAll("wodxInteractablesHazard", {scene: scene.id, tile: doc.id, token: tokDoc.uuid, kind: o.kind, why});
    const done = {result: "done", text: hz.text, noise: "silent", snap, hurt: 0, advanced: 0, worldTime: game.time.worldTime, waiting: false, lines, given: [],
      damageMsg: hz.damageMsg, undone: false};
    const ask = {v: 1, scene: scene.id, wall: doc.id, token: tokDoc.uuid, op: "hazard", label: "A hazard", user: game.user.id, state: "done"};
    const title = `${esc(actor.name)}: ${esc(R.nameOf(o))}`;
    const dice = hz.faces.length ? `<div class="vta-dice">${hz.faces.map(f => `<span class="vta-die ${f === 1 ? "one" : f >= hz.diff ? "hit" : "miss"}">${f}</span>`).join("")}</div>` : "";
    const stub = {content: cardHtml({title, dice}), speaker: {alias: actor.name}};
    return await ChatMessage.create({speaker: ChatMessage.getSpeaker({token: tokDoc}), content: resultHtml(stub, done, "A hazard"), flags: {[MOD]: {ask, done}}});
  } finally { burning.delete(key); }
}
/** Active GM: a combatant's turn starts. A fire or live wire it stands in hurts it again. */
export async function onTurnStart(combat) {
  const c = combat?.combatant, tokDoc = c?.token, actor = tokDoc?.actor;
  if ( !actor || !isActiveGM() || setting("hazards") === false ) return [];
  const scene = tokDoc.parent, cards = [];
  for ( const {doc, o} of hazardsAt(scene, centerOf(tokDoc, scene)) ) {
    if ( o.pcsOnly && !actor.hasPlayerOwner ) continue;
    cards.push(await hazardCard(tokDoc, actor, doc, o, "turn"));
  }
  if ( isDemonActor(actor) ) {
    const p = centerOf(tokDoc, scene);
    for ( const doc of tilesOf(scene) ) {
      const o = describeTile(doc);
      if ( R.holyGround(o) && inRect(p, rectOf(doc)) ) cards.push(await holyCard(tokDoc, actor, doc, o, "turn"));
    }
  }
  return cards.filter(Boolean);
}

/* ------------------------------------------------------------------ */
/*  Holy ground                                                        */
/* ------------------------------------------------------------------ */

const isDemonActor = actor => (game.wodxActions?.getKind?.(actor) ?? "") === "demon";
const tormentOf = actor => num(game.wodxActions?.demonInfo?.(actor)?.torment?.perm ?? actor?.system?.advantages?.torment?.permanent);
const willpowerOf = actor => num(game.wodxActions?.demonInfo?.(actor)?.willpower?.perm ?? actor?.system?.advantages?.willpower?.permanent);
/**
 * Active GM: holy ground sears a demon. Lethal levels by the ground's rating, then a Willpower roll (difficulty 6) to
 * stay; failing, it flees the holy place. Undo heals the levels. why: "enters" or "turn".
 */
export async function holyCard(tokDoc, actor, doc, o, why = "enters") {
  const key = `holy:${doc.id}:${tokDoc.uuid}`;
  if ( burning.has(key) ) return null;
  burning.add(key);
  try {
    const scene = doc.parent;
    const h = R.holyHarm(o, {kind: "demon", torment: tormentOf(actor)});
    const lines = [why === "turn" ? `${actor.name} starts the turn on holy ground.` : `${actor.name} steps onto holy ground (rating ${o.rating}).`];
    let hurt = 0, faces = [];
    if ( !h?.harmed ) lines.push(`${h?.why ?? "Nothing happens"}.`);
    else {
      try { await game.wodxCombat?.applyDamage?.(actor, "lethal", h.lethal); hurt = h.lethal; lines.push(`${h.lethal} lethal: seared flesh and stigmata.`); }
      catch (e) { lines.push(`${h.lethal} lethal: seared flesh and stigmata (apply it by hand).`); }
      if ( h.stayRoll ) {
        const wp = Math.max(1, willpowerOf(actor));
        const roll = new Roll(`${wp}d10`);
        await roll.evaluate();
        faces = roll.dice[0]?.results?.map(x => x.result) ?? [];
        const r = countSuccesses(faces, 6, {});
        lines.push(`Willpower to stay, ${wp} dice at 6: ${r.botch ? "a botch" : `${r.successes} success${r.successes === 1 ? "" : "es"}`}. ${r.successes > 0 && !r.botch ? "It endures the turn." : "It flees the holy place."}`);
      }
    }
    lines.push("Demon: The Fallen pp. 254-255.");
    const done = {result: "done", text: h?.harmed ? "is seared by holy ground." : "stands on holy ground, unharmed.", noise: "silent",
      snap: {ds: null, flags: foundry.utils.deepClone(doc.flags?.[MOD] ?? {}), hidden: !!doc.hidden}, hurt, advanced: 0, worldTime: game.time.worldTime, waiting: false, lines, given: [], undone: false};
    const ask = {v: 1, scene: scene.id, wall: doc.id, token: tokDoc.uuid, op: "holy", label: "Holy ground", user: game.user.id, state: "done"};
    const dice = faces.length ? `<div class="vta-dice">${faces.map(f => `<span class="vta-die ${f === 1 ? "one" : f >= 6 ? "hit" : "miss"}">${f}</span>`).join("")}</div>` : "";
    const stub = {content: cardHtml({title: `${esc(actor.name)}: ${esc(R.nameOf(o))}`, dice}), speaker: {alias: actor.name}};
    return await ChatMessage.create({speaker: ChatMessage.getSpeaker({token: tokDoc}), content: resultHtml(stub, done, "Holy ground"), flags: {[MOD]: {ask, done}}});
  } finally { burning.delete(key); }
}

/* ------------------------------------------------------------------ */
/*  Watch points                                                       */
/* ------------------------------------------------------------------ */

/** The tile a watch point is tied to: an id on the same scene, or a tile's UUID (another scene). */
export async function watchTarget(o, doc) {
  if ( !o?.target ) return null;
  if ( o.target.includes(".") ) { try { return await fromUuid(o.target); } catch (e) { return null; } }
  return doc?.parent?.tiles?.get?.(o.target) ?? null;
}
const hasStatus = (a, id) => !!a?.statuses?.has?.(id);
/** The people a look shows: tokens in the tied tile's area, leaving out the hidden and the invisible. */
export function peopleIn(target) {
  if ( !target ) return [];
  const scene = target.parent, r = rectOf(target);
  return (scene?.tokens?.contents ?? [...(scene?.tokens?.values?.() ?? [])]).filter(t => !t.hidden && !hasStatus(t.actor, "invisible") && inRect(centerOf(t, scene), r))
    .map(t => ({name: t.name ?? t.actor?.name ?? "Someone", uuid: t.uuid, lasombra: /lasombra/i.test(String(t.actor?.system?.clan ?? ""))}));
}
/** A map event for other modules: the same shape as a card's (states.mjs), with what this result adds. */
/** Map events held while a result is applied: doc id -> the calls waiting for who heard. */
const heldEvents = new Map();
function releaseEvents(docId, heard = []) {
  if ( !docId || !heldEvents.has(docId) ) return;
  const list = heldEvents.get(docId);
  heldEvents.delete(docId);
  for ( const [kind, args] of list ) {
    // Only a loud moment (a crash, a fall, a gallop, a bell) has NPCs react; a quiet one is only passed on
    try { mapEvent(kind, {...args, heard: args.heard?.length ? args.heard : (args.noise === "loud" ? heard : [])}); }
    catch (e) { console.error(`${MOD} |`, e); }
  }
}
export function mapEvent(kind, {scene, doc, tokDoc, noise = "silent", object = "", heard = [], supernatural = false, extra = {}} = {}) {
  if ( doc?.id && heldEvents.has(doc.id) ) { heldEvents.get(doc.id).push([kind, {scene, doc, tokDoc, noise, object, heard, supernatural, extra}]); return null; }
  let objectName = null;
  try { objectName = doc ? R.nameOf(describeTile(doc) ?? {}) || null : null; } catch (e) { objectName = null; }
  return publish(kind, {scene, doc, tokDoc, noise, heard, supernatural, objectName, objectKind: object || null, extra});
}
/** Active GM: a watch point's result. Whispers what a look shows; tells the Storyteller who a call reaches. */
async function watchReport(o, doc, out, op, author, actor, tokDoc) {
  const lines = [];
  let whisper = null;
  const target = await watchTarget(o, doc);
  const to = [...new Set([author?.id, ...gmIds()].filter(Boolean))];
  if ( op.id === "watch" ) {
    const people = peopleIn(target);
    const seen = R.watchSees(o, people, out.watch ?? {successes: 0, botch: false});
    const body = !target ? "<p>The Storyteller describes the view.</p>"
      : out.watch?.botch ? "<p>Nothing stirs (the Storyteller may say otherwise).</p>"
      : seen.names.length ? `<p>${esc(listWords(seen.names))}.</p>` : `<p>${seen.count ? `${seen.count} ${seen.count === 1 ? "person" : "people"}, too far or too dim to make out.` : "Nobody."}</p>`;
    whisper = await ChatMessage.create({speaker: {alias: actor.name}, whisper: to, content: cardHtml({title: `${esc(actor.name)}: ${esc(R.nameOf(o))}`, body})});
    if ( seen.unreflected.length ) await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(), content: cardHtml({title: "No reflection",
      body: `<p>In the area but not in the mirror: ${esc(listWords(seen.unreflected))}.</p>`})});
    mapEvent("watch", {doc, tokDoc, object: o.kind, extra: {target: target?.uuid ?? "", seen: seen.count}});
  } else if ( out.calls ) {
    const where = target ? `${R.nameOf(describeTile(target) ?? {watch: true, kind: o.kind, title: ""})}${target.parent?.id !== doc.parent?.id ? ` on ${target.parent?.name ?? "another scene"}` : ""}` : "nobody";
    lines.push(`The call reaches ${where}: the Storyteller plays the other end.`);
    mapEvent("call", {doc, tokDoc, noise: "quiet", object: o.kind, extra: {target: target?.uuid ?? ""}});
  } else if ( out.raises ) {
    lines.push(out.raises === "help" ? "Help is called: the Storyteller decides who comes, and how soon." : "The alarm is raised.");
    mapEvent("alarm", {doc, tokDoc, noise: out.noise ?? "loud", object: o.kind, extra: {how: out.raises, target: target?.uuid ?? ""}});
  }
  return {whisper, lines};
}

/* ------------------------------------------------------------------ */
/*  Mounts and vehicles                                                */
/* ------------------------------------------------------------------ */

/** Active GM: getting on or off, a throw or a crash. Returns lines for the card. */
async function mountReport(o, doc, out, op, actor, tokDoc) {
  const lines = [], M = R.MOUNTS[o.kind], me = {a: actor.id, t: tokDoc.uuid, n: actor.name};
  const f = doc.flags?.[MOD] ?? {};
  let driver = f.driver?.a ? f.driver : null;
  const riders = (Array.isArray(f.riders) ? f.riders : []).filter(r => r?.a && r.a !== actor.id);
  // Where each one sits, kept as an offset: the driver's from the vehicle, a passenger's from the vehicle
  if ( out.boards === "driver" ) { driver = {...me, dx: num(doc.x) - num(tokDoc.x), dy: num(doc.y) - num(tokDoc.y)}; lines.push(`${actor.name} is ${M.reins}: moving that token moves it and everyone aboard.`); }
  else if ( out.boards === "rider" ) riders.push({...me, dx: num(tokDoc.x) - num(doc.x), dy: num(tokDoc.y) - num(doc.y)});
  if ( out.leaves && driver?.a === actor.id ) driver = null;
  if ( out.boards || out.leaves ) {
    await doc.update({[`flags.${MOD}.driver`]: driver, [`flags.${MOD}.riders`]: riders});
    mapEvent(out.boards ? "mount" : "dismount", {doc, tokDoc, noise: out.noise ?? "silent", object: o.kind, extra: {atReins: out.boards === "driver"}});
  }
  if ( out.mishap === "thrown" ) lines.push(`${actor.name} hits the ground: the Storyteller rolls the fall.`);
  if ( out.mishap === "crash" ) lines.push("A crash: the Storyteller rolls the damage for everyone aboard.");
  if ( out.mishap === "stall" ) lines.push("It won't go this turn.");
  if ( out.mishap === "crash" || out.mishap === "thrown" ) mapEvent("crash", {doc, tokDoc, noise: "loud", object: o.kind, extra: {how: out.mishap}});
  else if ( op.id === "flatOut" ) mapEvent("ride", {doc, tokDoc, noise: "loud", object: o.kind, extra: {flatOut: true}});
  return lines;
}
/* ------------------------------------------------------------------ */
/*  Climbing and jumping                                               */
/* ------------------------------------------------------------------ */

/** Active GM: the lines a target's card gets. */
function targetReport(o, doc, out, actor) {
  const lines = [];
  if ( out.scores ) lines.push(...R.scoreLines(o));
  else if ( out.patch?.flags?.scores ) {
    const now = R.describeTarget({...(doc.flags?.[MOD] ?? {})});
    const me = R.standings(now).find(x => x.a === actor.id);
    if ( me && (o.kind === "mark" || o.kind === "dummy") ) lines.push(`${actor.name}: ${o.kind === "mark" ? `${me.pts} point${me.pts === 1 ? "" : "s"}, ` : ""}${me.hits} of ${me.shots}.`);
  }
  if ( out.wild ) lines.push("A wild shot: the Storyteller says where it lands.");
  if ( out.mishap === "jam" ) lines.push("The gun is jammed until someone clears it (a turn, or the Storyteller's call).");
  return lines;
}

/** Update options for a token put straight somewhere (a climb, a jump, an Undo): no walk along a path, walls ignored. */
const STRAIGHT = td => ({animate: false, teleport: true, movement: {[td.id]: {method: "api", constrainOptions: {ignoreWalls: true, ignoreCost: true}}}});
/** Where a token's centre would be with its corner at {x, y}. */
const centerAt = (td, {x, y}) => { const g = td.parent?.grid?.size ?? canvas?.grid?.size ?? 100; return {x: num(x) + num(td.width || 1) * g / 2, y: num(y) + num(td.height || 1) * g / 2}; };
/** Active GM: a fall of so many feet, through WoDX Combat's soak. Returns {lines, damageMsg}. */
export async function fallOn(tokDoc, actor, feet) {
  const dice = R.fallDice(feet), lines = [];
  let damageMsg = null;
  const what = `${dice} bashing ${dice === 1 ? "die" : "dice"} for ${feet} feet`;
  if ( game.wodxCombat?.soakAndApply ) {
    try {
      const res = await game.wodxCombat.soakAndApply(tokDoc.object ?? actor, {mode: "pool", amount: dice, type: "bashing", fireSun: false, soakDiff: 6, soak: true, fortBlood: "auto", soakBonus: 0});
      damageMsg = res?.message?.id ?? null;
      lines.push(`The fall: ${what}; soak and the result are on the WoDX Combat card.`);
    } catch (e) { console.error(`${MOD} |`, e); lines.push(`The fall: ${what}; roll soak and apply it by hand.`); }
  } else lines.push(`The fall: ${what}; WoDX Combat is off, so roll soak and apply it by hand.`);
  return {lines, damageMsg};
}
/** Active GM: arriving at the top or the far side moves the token there; a fall hurts. */
async function climbReport(o, doc, out, actor, tokDoc) {
  const lines = [];
  let moved = null, damageMsg = null;
  if ( out.arrives ) {
    const to = o.climbTo ? (o.climbTo.includes(".") ? await fromUuid(o.climbTo).catch(() => null) : doc.parent?.tiles?.get?.(o.climbTo)) : null;
    if ( to && to.parent?.id === tokDoc.parent?.id ) {
      const g = tokDoc.parent?.grid?.size ?? 100, c = tileCenter(to);
      const at = {x: Math.round(c.x - num(tokDoc.width || 1) * g / 2), y: Math.round(c.y - num(tokDoc.height || 1) * g / 2)};
      moved = {t: tokDoc.uuid, x: num(tokDoc.x), y: num(tokDoc.y)};
      // Straight there: nothing on the line between is walked over
      lastSeen.set(tokDoc.uuid, centerAt(tokDoc, at));
      await tokDoc.update(at, STRAIGHT(tokDoc));
    } else lines.push(R.CLIMBS[o.kind].jump ? "Move the token to the far side." : "Move the token to the top (or the bottom).");
    mapEvent(R.CLIMBS[o.kind].jump ? "jump" : "climb", {doc, tokDoc, noise: out.noise ?? "quiet", object: o.kind});
  }
  if ( out.falls !== undefined ) {
    const f = await fallOn(tokDoc, actor, out.falls);
    lines.push(...f.lines, "Move the token to where it lands.");
    damageMsg = f.damageMsg;
    mapEvent("fall", {doc, tokDoc, noise: "loud", object: o.kind, extra: {feet: out.falls}});
  }
  return {lines, moved, damageMsg};
}

/** Tokens being carried, with where they are being put: their own move hook then knows not to get them off. */
const carrying = new Map();
/**
 * Active GM: a token moved. At the reins: the mount or vehicle and everyone aboard move with it. A passenger who
 * moves on their own gets off. Returns what happened: "carried", "drove", "off" or null.
 */
export async function carryAboard(tokDoc, scene, from, to, pos = {x: num(tokDoc.x), y: num(tokDoc.y)}) {
  // Our own move of a passenger (Foundry may snap it to the grid, so where it lands is not checked)
  if ( carrying.delete(tokDoc.uuid) ) return "carried";
  const dx = to.x - from.x, dy = to.y - from.y, moved = !!(dx || dy);
  const fixed = p => Number.isFinite(p?.dx) && Number.isFinite(p?.dy);
  let what = null;
  for ( const doc of tilesOf(scene) ) {
    const f = doc.flags?.[MOD];
    if ( !f?.mount ) continue;
    const riders = Array.isArray(f.riders) ? f.riders : [];
    if ( f.driver?.t === tokDoc.uuid ) {
      // The vehicle goes where the driver's token now is, at the offset set when they took the reins (a step from the
      // last known place for older data); the same for each passenger, from the vehicle
      const at = fixed(f.driver) ? {x: pos.x + f.driver.dx, y: pos.y + f.driver.dy} : {x: num(doc.x) + dx, y: num(doc.y) + dy};
      const step = {x: at.x - num(doc.x), y: at.y - num(doc.y)};
      if ( !step.x && !step.y ) continue;
      await doc.update(at);
      for ( const r of riders ) {
        const td = await fromUuid(r.t).catch(() => null);
        if ( !td || td.parent?.id !== scene.id ) continue;
        const go = fixed(r) ? {x: at.x + r.dx, y: at.y + r.dy} : {x: num(td.x) + step.x, y: num(td.y) + step.y};
        carrying.set(td.uuid, go);
        try { await td.update(go); } catch (e) { carrying.delete(td.uuid); }
      }
      what = "drove";
    } else if ( moved && riders.some(r => r.t === tokDoc.uuid) ) {
      await doc.update({[`flags.${MOD}.riders`]: riders.filter(r => r.t !== tokDoc.uuid)});
      what = what ?? "off";
    }
  }
  return what;
}

/** The approval queue: a wall knocked through. */
function registerBreach() {
  chron()?.registerApprovalHandler?.(BREACH, {
    label: "Walls broken through",
    approve: async entry => {
      const doc = game.scenes.get(entry.data?.scene)?.walls?.get(entry.data?.wall);
      if ( !doc ) return;
      const NONE = CONST.EDGE_SENSE_TYPES?.NONE ?? 0, MOVE_NONE = CONST.WALL_MOVEMENT_TYPES?.NONE ?? 0;
      await doc.update({move: MOVE_NONE, sight: NONE, light: NONE, sound: NONE, [`flags.${MOD}.breached`]: true,
        [`flags.${MOD}.before`]: {move: doc.move, sight: doc.sight, light: doc.light, sound: doc.sound}});
    }
  });
}

/* ------------------------------------------------------------------ */
/*  The wall's config window                                           */
/* ------------------------------------------------------------------ */

const opt = (o, v) => Object.entries(o).map(([k, l]) => `<option value="${esc(k)}"${k === v ? " selected" : ""}>${esc(typeof l === "string" ? l : l.label)}</option>`).join("");
/** The WoDX part of a wall's config window. */
export function configHtml(doc) {
  const f = R.cleanSettings(doc?.flags?.[MOD] ?? {});
  const c = doc?.c ?? [0, 0, 100, 0];
  const p = `flags.${MOD}`;
  const sides = {"": "No bar", a: `On the ${R.sideLabel(c, "a")} side`, b: `On the ${R.sideLabel(c, "b")} side`};
  const field = (label, inner, hint = "") => `<div class="form-group"><label>${esc(label)}</label><div class="form-fields">${inner}</div>${hint ? `<p class="hint">${esc(hint)}</p>` : ""}</div>`;
  return `<fieldset class="wix-config"><legend>WoDX</legend>
    <p class="hint">For a door or window: what it is, its lock and what it takes to force it. Left blank, WoDX works it out from the door's state and material.</p>
    ${field("Kind", `<select name="${p}.kind" data-fixed>${opt(R.KINDS, f.kind)}</select>`)}
    ${field("Material", `<select name="${p}.material" data-fixed>${opt({"": "As the kind suggests", ...R.MATERIALS}, f.material)}</select>`)}
    ${field("Build", `<select name="${p}.build" data-fixed>${opt({"": "As the material suggests", ...R.BUILDS}, f.build)}</select>`, "How hard it is to force.")}
    ${field("Lock", `<select name="${p}.lock" data-fixed>${opt({"": "By the door's state (locked: a good lock)", ...R.LOCKS}, f.lock)}</select>`)}
    ${field("Keypad or alarm", `<select name="${p}.electronic" data-fixed>${opt(R.ELECTRONIC, f.electronic)}</select>`, "Only in the modern eras.")}
    ${field("Key", `<input type="text" name="${p}.keyName" value="${esc(f.keyName)}" placeholder="Name of the key item">`, "A character carrying an item with this name can lock and unlock it.")}
    ${field("Opens for", `<input type="text" name="${p}.opensFor" value="${esc(doc?.flags?.[MOD]?.opensFor ?? "")}" placeholder="clan Tremere; before 1493">`, "WoDX Chronicle tests, separated by ;. Whoever fits them can lock and unlock it without a key: a ward that knows its own, a door that opens only by night.")}
    ${field("Bar", `<select name="${p}.barSide" data-fixed>${opt(sides, f.barSide)}</select> <label class="checkbox"><input type="checkbox" name="${p}.barred"${f.barred ? " checked" : ""}> Barred now</label>`)}
    ${field("Secret door found", `<input type="checkbox" name="${p}.found"${f.found ? " checked" : ""}>`, "For a secret door: once found, players see it in their Interact list.")}
    ${field("Stuck", `<input type="checkbox" name="${p}.stuck"${f.stuck ? " checked" : ""}>`, "Painted shut or swollen: Strength to open.")}
    ${field("Breakable wall", `<select name="${p}.wall" data-fixed>${opt({"": "No (a plain wall)", ...R.WALLS}, f.wall)}</select>`, "For a wall that is not a door: it can be broken through, and the Storyteller decides the result.")}
  </fieldset>`;
}
function onRenderWallConfig(app, html) {
  if ( !game.user.isGM ) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  const form = root?.tagName === "FORM" ? root : root?.querySelector("form") ?? app.form;
  if ( !form || form.querySelector(".wix-config") ) return;
  const doc = app.document ?? app.object;
  const wrap = document.createElement("div");
  wrap.innerHTML = configHtml(doc);
  const footer = form.querySelector("footer, .form-footer, .sheet-footer");
  if ( footer ) footer.before(wrap.firstElementChild); else form.appendChild(wrap.firstElementChild);
  app.setPosition?.({height: "auto"});
}
/** The WoDX part of a tile's config window: a container. */
export function tileConfigHtml(doc) {
  const f = R.cleanContainer(doc?.flags?.[MOD] ?? {});
  const p = `flags.${MOD}`;
  const field = (label, inner, hint = "") => `<div class="form-group"><label>${esc(label)}</label><div class="form-fields">${inner}</div>${hint ? `<p class="hint">${esc(hint)}</p>` : ""}</div>`;
  const mats = Object.fromEntries(Object.entries(R.MATERIALS).filter(([k]) => !["glass", "horn"].includes(k)));
  const st = R.describeContainer(doc?.flags?.[MOD] ?? {}).ds;
  const t = R.cleanTrap(doc?.flags?.[MOD] ?? {});
  const c = R.cleanClue(doc?.flags?.[MOD] ?? {});
  const l = R.cleanLight(doc?.flags?.[MOD] ?? {});
  const h = R.cleanHide(doc?.flags?.[MOD] ?? {});
  const hideNow = doc?.flags?.[MOD]?.occupants ?? [];
  const z = R.cleanHazard(doc?.flags?.[MOD] ?? {});
  const a = R.cleanSacred(doc?.flags?.[MOD] ?? {});
  const wch = R.cleanWatch(doc?.flags?.[MOD] ?? {});
  const mnt = R.cleanMount(doc?.flags?.[MOD] ?? {});
  const onNow = R.aboard(R.describeMount(doc?.flags?.[MOD] ?? {}));
  const clb = R.cleanClimb(doc?.flags?.[MOD] ?? {});
  const tgt = R.cleanTarget(doc?.flags?.[MOD] ?? {});
  const board = R.describeTarget(doc?.flags?.[MOD] ?? {});
  return `<fieldset class="wix-config wix-tile"><legend>WoDX</legend>
    <h4 class="wix-sub">Container</h4>
    <p class="hint">A chest, cabinet, strongbox or safe that characters can open, pick, force and take things from. Hide the tile to keep it from players until found.</p>
    ${field("Container", `<input type="checkbox" name="${p}.container"${f.container ? " checked" : ""}>`)}
    ${field("Kind", `<select name="${p}.kind" data-fixed>${opt(R.CONTAINERS, f.kind)}</select>`)}
    ${field("Material", `<select name="${p}.material" data-fixed>${opt({"": "As the kind suggests", ...mats}, f.material)}</select>`, "How hard it is to force.")}
    ${field("Lock", `<select name="${p}.lock" data-fixed>${opt({"": "No lock", ...Object.fromEntries(Object.entries(R.LOCKS).filter(([k]) => k !== "none"))}, f.lock)}</select>`)}
    ${field("State", `<select name="${p}.ds" data-fixed>${opt({closed: "Closed", locked: "Locked", open: "Open"}, st)}</select>`)}
    ${field("Keypad or alarm", `<select name="${p}.electronic" data-fixed>${opt(R.ELECTRONIC, f.electronic)}</select>`, "Only in the modern eras.")}
    ${field("Key", `<input type="text" name="${p}.keyName" value="${esc(f.keyName)}" placeholder="Name of the key item">`)}
    ${field("Opens for", `<input type="text" name="${p}.opensFor" value="${esc(f.opensFor)}" placeholder="faction court; night">`, "WoDX Chronicle tests, separated by ;. Whoever fits them can lock and unlock it without a key.")}
    ${field("Inside", `<textarea name="${p}.items" rows="4" placeholder="One item a line: its UUID, or its name in the Items directory">${esc(f.items)}</textarea>`, "Taking them gives the character a copy of each. Leave it empty and say what is inside yourself.")}
    ${field("Usual contents", `<select name="${p}.fillPlace" data-fixed><option value="">As where it sits</option>${opt(FillRules.PLACES, doc?.flags?.[MOD]?.fillPlace)}</select>`, "The place Fill by place and era starts from. Blank: the place tag of the region or scene it sits in, else a home.")}
    ${field("", `<button type="button" data-wix-fill>Fill by place and era…</button>`, "Draws from Gear by era for the chronicle's era, for you to check before anything goes in.")}
    ${field("Stock list", `<textarea name="${p}.stock" rows="3" placeholder="always: a tallow candle&#10;1 in 3: a ritual book&#10;50%: 3-12 silver pennies&#10;when year >= 1890: 1 in 2: a box of matches">${esc(f.stock)}</textarea>`, "Your own table: a chance (always, 1 in N, or a percentage), a colon, a count or range if more than one, then the item. A line can start with when and WoDX Chronicle tests.")}
    ${field("Draw the stock", `<select name="${p}.restock" data-fixed>${opt(R.RESTOCK, f.restock)}</select> <button type="button" data-wix-stock>Draw now</button><input type="hidden" name="${p}.stockDrawn" value="">`, "A shop's shelf or a herb patch: on the clock, what the last draw left is taken away and the list is drawn again. Draw now puts a draw in Inside for you to check before you save.")}
    <h4 class="wix-sub">Trap</h4>
    <p class="hint">A snare, pit, tripwire or spring blade. Hide the tile: it goes off when a character walks over it, and players see it once a search finds it.</p>
    ${field("Trap", `<input type="checkbox" name="${p}.trap"${t.trap ? " checked" : ""}>`, "A tile is a container or a trap; a container wins if both are ticked.")}
    ${field("Kind of trap", `<select name="${p}.trapKind" data-fixed>${opt(R.TRAPS, t.trapKind)}</select>`)}
    ${field("Grade", `<select name="${p}.grade" data-fixed>${opt(R.TRAP_GRADES, t.grade)}</select>`, "How well hidden, and how hard to disarm or get clear of.")}
    ${field("Damage dice", `<input type="number" name="${p}.dice" value="${esc(t.dice)}" min="0" max="20" placeholder="${R.TRAPS[t.trapKind].dice}">`, "Blank: the kind's own (pit 2, spring blade 5, the others none).")}
    ${field("Damage type", `<select name="${p}.damageType" data-fixed>${opt({"": "As the kind suggests", ...R.DAMAGE_TYPES}, t.damageType)}</select>`, "Spikes in a pit: lethal.")}
    ${field("Armed", `<input type="checkbox" name="${p}.armed"${t.armed ? " checked" : ""}>`)}
    ${field("Found", `<input type="checkbox" name="${p}.found"${t.found ? " checked" : ""}>`, "Players see a found trap and can disarm it; walking around it is safe, stopping on it is not.")}
    ${field("NPCs set it off", `<input type="checkbox" name="${p}.npcs"${t.npcs ? " checked" : ""}>`, "Off: only the players' characters set it off.")}
    <h4 class="wix-sub">Clue</h4>
    <p class="hint">A letter, ledger, bloodstain, writing on a wall or a trail. Write what it shows; examining it reveals more with more successes, in a whisper to that player. Hide the tile to make it something to search for.</p>
    ${field("Clue", `<input type="checkbox" name="${p}.clue"${c.clue ? " checked" : ""}>`, "A container or a trap on the same tile wins.")}
    ${field("Kind of clue", `<select name="${p}.clueKind" data-fixed>${opt(R.CLUES, c.clueKind)}</select>`, "Documents and writing are read with Intelligence, the rest examined with Perception; both with Investigation.")}
    ${field("Name", `<input type="text" name="${p}.title" value="${esc(c.title)}" placeholder="What players see it called">`)}
    ${field("Successes to notice", `<input type="number" name="${p}.need" value="${c.need}" min="1" max="5">`, "For a hidden one, on Search the area.")}
    ${field("Anyone sees", `<textarea name="${p}.text0" rows="2">${esc(c.text0)}</textarea>`)}
    ${field("With 1 success", `<textarea name="${p}.text1" rows="2">${esc(c.text1)}</textarea>`)}
    ${field("With 2 successes", `<textarea name="${p}.text2" rows="2">${esc(c.text2)}</textarea>`)}
    ${field("With 3 or more", `<textarea name="${p}.text3" rows="2">${esc(c.text3)}</textarea>`, "Leave the last three empty and looking at it needs no roll.")}
    ${field("Codex page", `<input type="text" name="${p}.codexPage" value="${esc(c.codexPage)}" placeholder="Drop or paste a journal page's UUID">`, "The first time a character's look reaches the successes below, a copy of this page goes into their codex (WoDX Storyteller). Once a character.")}
    ${field("Successes for the page", `<input type="number" name="${p}.codexAt" value="${c.codexAt}" min="0" max="3">`, "0: any look.")}
    <h4 class="wix-sub">Light source</h4>
    <p class="hint">A torch, candles, a lantern, a lamp or a light switch that characters can light and put out. It works the scene's own lights: the ones named here, or else every light on the tile or within a square of it.</p>
    ${field("Light source", `<input type="checkbox" name="${p}.light"${l.light ? " checked" : ""}>`, "A container, trap or clue on the same tile wins.")}
    ${field("Kind of light", `<select name="${p}.lightKind" data-fixed>${opt(R.LIGHTS, l.lightKind)}</select>`)}
    ${field("Lights it works", `<input type="text" name="${p}.lightIds" value="${esc(l.lightIds)}" placeholder="Light ids, or blank for those nearby">`, "Copy a light's id from its config window's title bar.")}
    ${field("Broken", `<input type="checkbox" name="${p}.broken"${l.broken ? " checked" : ""}>`, "Untick to mend a broken one (a chandelier hangs again).")}
    ${field("Chandelier drop (feet)", `<input type="number" name="${p}.dropFeet" value="${esc(l.dropFeet ?? "")}" min="5" max="60" placeholder="${R.CHANDELIER_FEET}">`, "A chandelier only: how far it falls when brought down. Put the tile over the floor beneath it.")}
    <h4 class="wix-sub">Hiding place</h4>
    <p class="hint">A wardrobe, a space under a bed, a curtain, deep shadows, a crawlspace or a priest hole. Characters hide in it with Dexterity + Stealth and go out of sight; searchers find them by their successes.</p>
    ${field("Hiding place", `<input type="checkbox" name="${p}.hide"${h.hide ? " checked" : ""}>`, "A container, trap, clue or light on the same tile wins.")}
    ${field("Kind of place", `<select name="${p}.hideKind" data-fixed>${opt(R.HIDES, h.hideKind)}</select>`, "How hard it is to find someone there.")}
    ${field("Room for", `<input type="number" name="${p}.room" value="${esc(h.room)}" min="1" max="12" placeholder="${R.HIDES[h.hideKind].room}">`, "Blank: as the kind suggests.")}
    ${hideNow.length ? `<p class="hint">In hiding there now: ${esc(listWords(hideNow.map(x => x.n)))}.</p>` : ""}
    <h4 class="wix-sub">Hazard</h4>
    <p class="hint">A fire, a brazier or lamp that can be knocked over, broken glass or caltrops, or a live wire. A live hazard hurts whoever walks into it; a fire or live wire also hurts, in combat, whoever starts a turn in it. Set the tile to cover the area.</p>
    ${field("Hazard", `<input type="checkbox" name="${p}.hazard"${z.hazard ? " checked" : ""}>`, "Any other kind ticked on the same tile wins.")}
    ${field("Kind of hazard", `<select name="${p}.hazardKind" data-fixed>${opt(R.HAZARDS, z.hazardKind)}</select>`)}
    ${field("Size of fire", `<select name="${p}.size" data-fixed>${opt(R.FIRE_SIZES, z.size)}</select>`, "Health levels a turn: 1, 2 or 3. A brazier burns at this size once knocked over.")}
    ${field("Heat of fire", `<select name="${p}.heat" data-fixed>${opt(R.FIRE_HEAT, z.heat)}</select>`, "The soak difficulty, from 3 for a candle to 10 for molten metal.")}
    ${field("Burning", `<input type="checkbox" name="${p}.burning"${z.burning ? " checked" : ""}>`, "A fire, or a brazier already knocked over. The lights named in the light source part burn while it burns.")}
    ${field("Knocked over", `<input type="checkbox" name="${p}.spilled"${z.spilled ? " checked" : ""}>`, "A brazier only.")}
    ${field("Glass: damage dice", `<input type="number" name="${p}.hazDice" value="${esc(z.hazDice)}" min="0" max="20" placeholder="2">`, "Lethal; each success stepping carefully takes a die off.")}
    ${field("Swept aside", `<input type="checkbox" name="${p}.cleared"${z.cleared ? " checked" : ""}>`)}
    ${field("Current", `<select name="${p}.shock" data-fixed>${opt(R.SHOCKS, z.shock)}</select>`, "Health levels a turn: 2, 4, 6 or 8.")}
    ${field("Power on", `<input type="checkbox" name="${p}.live"${z.live ? " checked" : ""}>`)}
    ${field("Damage type", `<select name="${p}.hazType" data-fixed>${opt({"": "As the kind suggests", ...R.DAMAGE_TYPES}, z.hazType)}</select>`, "Fire: lethal to mortals and ghouls, aggravated to everyone else; glass and current lethal. A vampire always takes fire as aggravated.")}
    ${field("Only player characters", `<input type="checkbox" name="${p}.pcsOnly"${z.pcsOnly ? " checked" : ""}>`, "Off: NPCs are hurt too.")}
    <h4 class="wix-sub">Altar, relic or fetish</h4>
    <p class="hint">An altar or shrine is holy ground: characters pray there, it can be desecrated, and a demon who walks onto it is seared. A relic or a fetish rests on the tile until someone takes it. A caern stone, a fetter or a node opens the WoDX actions menu.</p>
    ${field("Altar, relic or fetish", `<input type="checkbox" name="${p}.sacred"${a.sacred ? " checked" : ""}>`, "Any other kind ticked on the same tile wins.")}
    ${field("Kind", `<select name="${p}.sacredKind" data-fixed>${opt(R.SACRED, a.sacredKind)}</select>`)}
    ${field("Rating", `<input type="number" name="${p}.rating" value="${a.rating}" min="1" max="10">`, "Holy ground's rating, a relic's Faith potential, a caern's level, a fetter's or a node's rating: 1 to 5. A fetish's Gnosis: 1 to 10.")}
    ${field("Desecrated", `<input type="checkbox" name="${p}.desecrated"${a.desecrated ? " checked" : ""}>`, "Untick to consecrate it again.")}
    ${field("The relic or fetish", `<textarea name="${p}.sacredItems" rows="2" placeholder="Its UUID, or its name in the Items directory">${esc(a.sacredItems)}</textarea>`, "Taking it gives the character a copy.")}
    <h4 class="wix-sub">Watch point</h4>
    <p class="hint">A window on the street or a mirror shows who is in the area of the tile it is tied to; a telephone or a radio calls the one it is tied to, or calls for help; a bell, horn or alarm raises the alarm.</p>
    ${field("Watch point", `<input type="checkbox" name="${p}.watch"${wch.watch ? " checked" : ""}>`, "Any other kind ticked on the same tile wins.")}
    ${field("Kind of watch point", `<select name="${p}.watchKind" data-fixed>${opt(R.WATCHES, wch.watchKind)}</select>`, "A telephone from about 1890, a radio from about 1930.")}
    ${field("Tied to", `<input type="text" name="${p}.target" value="${esc(wch.target)}" placeholder="A tile's id on this scene, or its UUID on another">`, "The area a window or mirror shows, or the phone a call reaches.")}
    <h4 class="wix-sub">Mount or vehicle</h4>
    <p class="hint">A horse, a mule, a cart, a carriage, a rowing boat, a car, a motorcycle or a motorboat. One character takes the reins and others ride along; moving the token at the reins moves the tile and everyone aboard.</p>
    ${field("Mount or vehicle", `<input type="checkbox" name="${p}.mount"${mnt.mount ? " checked" : ""}>`, "Any other kind ticked on the same tile wins.")}
    ${field("Kind of mount or vehicle", `<select name="${p}.mountKind" data-fixed>${opt(R.MOUNTS, mnt.mountKind)}</select>`, "A car from about 1900, a motorcycle or motorboat from about 1910.")}
    ${field("Seats", `<input type="number" name="${p}.seats" value="${esc(mnt.seats)}" min="1" max="40" placeholder="${R.MOUNTS[mnt.mountKind].seats}">`, "With the one at the reins. Blank: as the kind suggests.")}
    ${onNow.length ? `<p class="hint">Aboard now: ${esc(listWords(onNow.map(x => x.n)))}.</p>` : ""}
    ${field("Everyone off", `<input type="checkbox" name="${p}.clearAboard">`, "Tick and save to empty it.")}
    <h4 class="wix-sub">Climb or gap</h4>
    <p class="hint">A ladder, a rope, a tree, a rough wall or a cliff to climb, or a gap to jump. Tie it to a tile at the top or on the far side, and a character who makes it is moved there.</p>
    ${field("Climb or gap", `<input type="checkbox" name="${p}.climb"${clb.climb ? " checked" : ""}>`, "Any other kind ticked on the same tile wins.")}
    ${field("Kind of climb", `<select name="${p}.climbKind" data-fixed>${opt(R.CLIMBS, clb.climbKind)}</select>`, "Yards a success: 5 for a rope or tree, 3 for a rough wall, 2 for a cliff; a ladder needs no roll.")}
    ${field("Height in feet", `<input type="number" name="${p}.height" value="${esc(clb.height)}" min="1" max="1000" placeholder="10">`, "A climb only. A slip falls from as high as the climber got.")}
    ${field("Gap in yards", `<input type="number" name="${p}.gap" value="${esc(clb.gap)}" min="1" max="20" placeholder="2">`, "A gap only: a success a yard.")}
    ${field("Drop in feet", `<input type="number" name="${p}.depth" value="${esc(clb.depth)}" min="0" max="1000" placeholder="10">`, "A gap only: how far a character falls who misses.")}
    ${field("Leads to", `<input type="text" name="${p}.climbTo" value="${esc(clb.climbTo)}" placeholder="A tile's id at the top or the far side">`, "Blank: you move the token yourself.")}
    <h4 class="wix-sub">Target</h4>
    <p class="hint">A target to shoot or throw at, bottles in a row, a practice dummy, or something to break. Range is measured from the shooter, with the bands of WoDX Combat.</p>
    ${field("Target", `<input type="checkbox" name="${p}.isTarget"${tgt.isTarget ? " checked" : ""}>`, "Any other kind ticked on the same tile wins.")}
    ${field("Kind of target", `<select name="${p}.targetKind" data-fixed>${opt(R.TARGETS, tgt.targetKind)}</select>`, "A target with rings is an archery butt in the early eras.")}
    ${field("Made of", `<select name="${p}.objBuild" data-fixed>${opt(R.OBJECT_BUILDS, tgt.objBuild)}</select>`, "Something to break only. Fragile things break on any hit.")}
    ${field("Bottles", `<input type="number" name="${p}.bottles" value="${esc(tgt.bottles)}" min="1" max="24" placeholder="6">`, "Bottles or cans only: how many in the row.")}
    ${field("Broken", `<input type="checkbox" name="${p}.smashed"${tgt.smashed ? " checked" : ""}>`, "Something to break only. Untick to mend it.")}
    ${tgt.isTarget && Object.keys(board.scores).length ? `<p class="hint">Scoreboard: ${esc(R.scoreLines(board).join("; "))}.</p>` : ""}
    ${field("Clear the scoreboard", `<input type="checkbox" name="${p}.clearScores">`, "Tick and save to clear it and set the bottles up again.")}
  </fieldset>`;
}
function onRenderTileConfig(app, html) {
  if ( !game.user.isGM ) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  const form = root?.tagName === "FORM" ? root : root?.querySelector("form") ?? app.form;
  if ( !form || form.querySelector(".wix-tile") ) return;
  const wrap = document.createElement("div");
  wrap.innerHTML = tileConfigHtml(app.document ?? app.object);
  const footer = form.querySelector("footer, .form-footer, .sheet-footer");
  if ( footer ) footer.before(wrap.firstElementChild); else form.appendChild(wrap.firstElementChild);
  // 0.23.0: the Fill button is wired here, in the tile's window where it sits (it was looked for in the wall's)
  form.querySelector("[data-wix-fill]")?.addEventListener("click", ev => {
    ev.preventDefault();
    Fill.fillDialog(app.document ?? app.object, form.querySelector(`[name="flags.${MOD}.items"]`)).catch(e => console.error(`${MOD} |`, e));
  });
  form.querySelector("[data-wix-stock]")?.addEventListener("click", ev => {
    ev.preventDefault();
    const field = form.querySelector(`[name="flags.${MOD}.stock"]`), inside = form.querySelector(`[name="flags.${MOD}.items"]`);
    const {lines, problems} = R.parseStock(field?.value ?? "");
    if ( problems.length ) ui.notifications.warn(problems.join(" "));
    const W = chron()?.when;
    const fresh = R.rollStock(lines, {passes: when => (W?.check ? W.check(when, {scene: (app.document ?? app.object)?.parent}).ok : false)});
    if ( inside ) inside.value = R.restockLines(inside.value, (app.document ?? app.object)?.flags?.[MOD]?.stockDrawn ?? [], fresh).join("\n");
    const drawn = form.querySelector(`[name="flags.${MOD}.stockDrawn"]`);
    if ( drawn ) drawn.value = JSON.stringify(fresh);
  });
  app.setPosition?.({height: "auto"});
}
function onPreUpdateTile(doc, changes) {
  const f = changes?.flags?.[MOD];
  if ( !f || typeof f !== "object" ) return;
  for ( const k of ["material", "lock", "keyName", "fillPlace"] ) if ( f[k] === "" ) f[k] = null;
  if ( "items" in f ) f.items = R.parseItems(f.items).join("\n");
  if ( "stockDrawn" in f && typeof f.stockDrawn === "string" ) {
    if ( !f.stockDrawn ) delete f.stockDrawn;
    else { try { f.stockDrawn = JSON.parse(f.stockDrawn); f.stockedAt = game.time.worldTime; } catch (e) { delete f.stockDrawn; } }
  }
  if ( "sacredItems" in f ) f.sacredItems = R.parseItems(f.sacredItems).join("\n");
  // A lock set on a closed container locks it
  if ( f.lock && !f.ds && !doc.flags?.[MOD]?.ds ) f.ds = "locked";
  if ( "dice" in f && (f.dice === "" || f.dice === null) ) f.dice = null;
  if ( f.damageType === "" ) f.damageType = null;
  for ( const k of ["text0", "text1", "text2", "text3"] ) if ( typeof f[k] === "string" ) f[k] = f[k].slice(0, 4000);
  if ( "lightIds" in f ) f.lightIds = R.cleanLight(f).lightIds;
  if ( "room" in f && (f.room === "" || f.room === null) ) f.room = null;
  if ( "hazDice" in f && (f.hazDice === "" || f.hazDice === null) ) f.hazDice = null;
  if ( f.hazType === "" ) f.hazType = null;
  if ( "seats" in f && (f.seats === "" || f.seats === null) ) f.seats = null;
  for ( const k of ["height", "gap", "depth"] ) if ( k in f && (f[k] === "" || f[k] === null) ) f[k] = null;
  if ( typeof f.climbTo === "string" ) f.climbTo = R.cleanClimb({climbTo: f.climbTo}).climbTo;
  // Everyone off, by the Storyteller's hand
  if ( "bottles" in f && (f.bottles === "" || f.bottles === null) ) f.bottles = null;
  if ( "clearScores" in f ) {
    if ( f.clearScores ) {
      const Del = globalThis.foundry?.data?.operators?.ForcedDeletion;
      if ( Del ) f.scores = new Del(); else { delete f.scores; f["-=scores"] = null; }
      f.left = null; f.hits = 0;
    }
    delete f.clearScores;
  }
  if ( "clearAboard" in f ) { if ( f.clearAboard ) { f.driver = null; f.riders = []; } delete f.clearAboard; }
  // Arming a trap again by hand clears what it did last time
  if ( f.armed === true && doc.flags?.[MOD]?.sprung ) { f.sprung = false; f.holding = null; }
}

/** Tidy what the form sends: blank choices are dropped so the defaults apply. */
function onPreUpdateWall(doc, changes) {
  const f = changes?.flags?.[MOD];
  if ( !f || typeof f !== "object" ) return;
  for ( const k of ["material", "build", "lock", "barSide", "wall", "keyName"] ) if ( f[k] === "" ) f[k] = null;
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

/** Clicking a locked door: the Interact window for that door. Core's own click still plays the locked sound. */
function installDoorClick() {
  const Base = CONFIG.Canvas?.doorControlClass;
  if ( !Base || Base.wodxInteract ) return false;
  class WodxDoorControl extends Base {
    static wodxInteract = true;
    _onMouseDown(event) {
      try {
        const locked = this.wall?.document?.ds === DS().LOCKED;
        const want = event?.button === 0 && locked && setting("doorClick") && (!game.user.isGM || game.keyboard?.isModifierActive?.("SHIFT"));
        const tok = want ? pickToken() : null;
        if ( tok ) {
          const r = super._onMouseDown(event);
          openInteract(tok, {onlyWall: this.wall.id}).catch(e => console.error(`${MOD} |`, e));
          return r;
        }
      } catch (e) { console.warn(`${MOD} | door click`, e); }
      return super._onMouseDown(event);
    }
  }
  CONFIG.Canvas.doorControlClass = WodxDoorControl;
  return true;
}

Hooks.once("init", () => {
  registerSettings();
  registerStateSettings();
  game.keybindings?.register?.(MOD, "interact", {
    name: "Interact", hint: "The Interact window for the selected token: doors, windows and walls within reach.",
    editable: [{key: "KeyI"}], onDown: () => { openInteract().catch(e => console.error(`${MOD} |`, e)); return true; }
  });
  if ( !installDoorClick() ) console.warn(`${MOD} | the door-click shortcut is off: this Foundry has no door control class to extend.`);
  game.modules.get(MOD).api = {version: VERSION, rules: R, fill: {open: Fill.fillDialog, draw: Fill.drawFor, index: Fill.gearIndex, guess: Fill.guessFor, rules: FillRules}, describeWall, describeTile, lightsOf, useRoom, sunUp, _roomEffects: roomEffects, setConcealed, describeObj, tileConfigHtml, searchableTraps, springOn, trapsOnPath, onTokenMoved, hazardsOnPath, labelsOnPath, hazardsAt, hazardOn, hazardCard, onTurnStart, holyCard, watchTarget, peopleIn, mapEvent, carryAboard, fallOn, characterFor, interactablesFor, openInteract, attempt, applyAsk, undoCard, hearersOf, noiseAt, optionSummary, configHtml};
  game.modules.get(MOD).api.states = setupStates({describeObj, describeWall, describeTile, objectIn, rules: R});
  game.modules.get(MOD).api.living = setupLiving();
  game.modules.get(MOD).api.carry = setupCarry();
  game.modules.get(MOD).api.adopt = setupAdopt();
  Stock.setupStock();
  game.modules.get(MOD).api.stock = {draw: Stock.drawStock, all: Stock.restockAll};
  game.modules.get(MOD).api.chase = setupChase({describeObj, yardsOn, centerOf, noiseAt});
});
Hooks.once("ready", () => {
  if ( chron()?.registerApprovalHandler ) registerBreach(); else Hooks.once("wodxChronicleReady", registerBreach);
  ensureStyles();
  refreshSun();
});
Hooks.on("updateWorldTime", () => { refreshSun(); });
Hooks.on("createChatMessage", msg => { if ( msg.flags?.[MOD]?.ask && isActiveGM() ) applyAsk(msg).catch(e => console.error(`${MOD} |`, e)); });
Hooks.on("renderChatMessageHTML", (msg, el) => {
  if ( !msg.flags?.[MOD]?.done ) return;
  el.querySelectorAll?.("button.wix-undo").forEach(b => {
    if ( !game.user.isGM ) { b.remove(); return; }
    b.addEventListener("click", ev => { ev.preventDefault(); b.disabled = true; undoCard(msg).catch(e => console.error(`${MOD} |`, e)).finally(() => { b.disabled = false; }); });
  });
});
Hooks.on("updateToken", (doc, changes, options, userId) => { if ( !doc?.flags?.["wodx-npc"]?.passerby && ("x" in (changes ?? {}) || "y" in (changes ?? {})) && isActiveGM() ) onTokenMoved(doc, changes, {userId, held: !!options?.wodxHeld}).catch(e => console.error(`${MOD} |`, e)); });
Hooks.on("updateCombat", (combat, changes) => { if ( ("turn" in (changes ?? {}) || "round" in (changes ?? {})) && combat?.started && isActiveGM() ) onTurnStart(combat).catch(e => console.error(`${MOD} |`, e)); });
Hooks.on("canvasReady", () => { lastSeen.clear(); for ( const t of canvas.scene?.tokens?.contents ?? [] ) lastSeen.set(t.uuid, centerOf(t, canvas.scene)); });
Hooks.on("createToken", doc => lastSeen.set(doc.uuid, centerOf(doc, doc.parent)));
Hooks.on("renderWallConfig", onRenderWallConfig);
Hooks.on("preUpdateWall", onPreUpdateWall);
Hooks.on("renderTileConfig", onRenderTileConfig);
Hooks.on("preUpdateTile", onPreUpdateTile);
Hooks.on("renderTokenHUD", (hud, html) => {
  const root = html instanceof HTMLElement ? html : html?.[0];
  const tok = hud.object, col = root?.querySelector(".col.right");
  if ( !tok?.actor || !col || !tok.document.isOwner ) return;
  const b = document.createElement("div");
  b.className = "control-icon wix-hud";
  b.dataset.tooltip = "Interact: doors, windows, walls, containers, traps, clues, lights, hiding places, hazards, altars, relics, fetishes, watch points, mounts, vehicles, climbs, gaps and targets within reach, and searching";
  b.innerHTML = '<i class="fa-solid fa-door-open"></i>';
  b.addEventListener("click", () => openInteract(tok).catch(e => console.error(`${MOD} |`, e)));
  col.appendChild(b);
});

/** A new module's stylesheet is read at server start; injecting it means a reload is enough. */
function ensureStyles() {
  const href = `modules/${MOD}/styles/wodx-interactables.css`;
  if ( [...document.styleSheets].some(s => s.href?.includes(href)) || document.querySelector(`link[href*="${href}"]`) ) return;
  const l = document.createElement("link");
  l.rel = "stylesheet"; l.href = `${href}?v=${VERSION}`;
  document.head.appendChild(l);
}
