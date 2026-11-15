/**
 * WoDX Interactables: carrying and dragging the fallen, and moving large things (B5070 to B5086). The rules are in
 * haul-rules.mjs.
 *
 *   The window  A hand button on the token HUD lists what the character can take hold of within reach: a fallen
 *               character to carry or drag, a piece of furniture to push or pull, a pile to haul, a barricade to shove
 *               aside; or, while they hold something, where to set it down (the ground, a mount or vehicle, a bed or
 *               a table). A character who wakes while carried gets Struggle free or Stay.
 *   On the map  A carried body lies tilted across the carrier's square; a dragged one lies a square behind, leaving
 *               scuffs, or a blood trail and a trail clue if it bleeds. A thing moves with whoever holds it, and a
 *               thing that was only part of the map picture takes its picture with it, leaving the floor behind.
 *               A solid thing left in a doorway blocks it (a wall drawn there) and is good cover.
 *   State       Token flag haul (on whatever is held): {kind, by: [{t, n, dx, dy}], want, before, trail, clue, turn}.
 *               Token flag hauling (on whoever holds it): {what, kind, n}. Tile flags barricade {wall, door} and
 *               haulHome {x, y, w, h} (where a picture-less thing first stood).
 *   Who acts    Every change is made on the active Storyteller's client; a player's choice goes there by the socket.
 */
import * as H from "./haul-rules.mjs";
import {countSuccesses, clampDifficulty} from "../../wodx-actions/scripts/core-rules.js";
import {actionPool} from "../../wodx-actions/scripts/rules.js";

const MOD = "wodx-interactables";
const SOCKET = `module.${MOD}`;
const num = v => Number(v) || 0;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const docOf = x => x?.document ?? x ?? null;
const sizeOf = scene => num(scene?.grid?.size) || num(globalThis.canvas?.grid?.size) || 100;
const tilesOf = scene => scene?.tiles?.contents ?? [...(scene?.tiles?.values?.() ?? [])];
const tokensOf = scene => scene?.tokens?.contents ?? [...(scene?.tokens?.values?.() ?? [])];
const wallsOf = scene => scene?.walls?.contents ?? [...(scene?.walls?.values?.() ?? [])];
const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return null; } };
const combatApi = () => (game.modules.get("wodx-combat")?.active ? game.modules.get("wodx-combat").api : null) ?? game.wodxCombat ?? null;
const chron = () => game.modules.get("wodx-chronicle")?.api;
const unset = path => {
  const Del = globalThis.foundry?.data?.operators?.ForcedDeletion;
  return Del ? {[path]: new Del()} : {[path.replace(/\.([^.]+)$/, ".-=$1")]: null};
};
const MOVE = {wodxMove: false, wodxHaul: true, wodxHeld: true};

let deps = {}; // {characterFor, describeTile, mapEvent, noiseAt, rules}

/* ------------------------------------------------------------------ */
/*  Reading the board                                                  */
/* ------------------------------------------------------------------ */

/** A trace a gate can read (globalThis.wodxHaulTrace = [] turns it on): what the haul code did, in order. */
const trace = (...a) => { const t = globalThis.wodxHaulTrace; if ( Array.isArray(t) ) { t.push(a.map(x => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(" ").slice(0, 160)); if ( t.length > 400 ) t.shift(); } };
/** Where a document stands in the database: a token that is still being animated there reads its old place otherwise. */
const SX = d => num(d?._source?.x ?? d?.x), SY = d => num(d?._source?.y ?? d?.y);
const centreOf = doc => {
  const g = sizeOf(doc?.parent);
  return {x: SX(doc) + num(doc?.width || 1) * g / 2, y: SY(doc) + num(doc?.height || 1) * g / 2};
};
const rectOf = t => ({x: SX(t), y: SY(t), w: num(t.width), h: num(t.height)});
const toRect = (p, r) => Math.hypot(Math.max(r.x - p.x, 0, p.x - (r.x + r.w)), Math.max(r.y - p.y, 0, p.y - (r.y + r.h)));
/** Within reach: next to it (a square and a half, centre to edge, past the character's own half square). */
function inReach(tokDoc, other) {
  const g = sizeOf(tokDoc.parent), c = centreOf(tokDoc), half = num(tokDoc.width || 1) * g / 2;
  if ( other?.documentName === "Token" ) {
    const o = centreOf(other), oh = num(other.width || 1) * g / 2;
    return Math.max(0, Math.hypot(c.x - o.x, c.y - o.y) - half - oh) <= g * 0.6;
  }
  return Math.max(0, toRect(c, rectOf(other)) - half) <= g * 0.6;
}
const woundsOf = actor => {
  try { const ct = combatApi()?.corpusTrack?.(actor); const d = ct?.damage ?? actor?.system?.health?.damage ?? {}; return num(d.bashing) + num(d.lethal) + num(d.aggravated); }
  catch (e) { const d = actor?.system?.health?.damage ?? {}; return num(d.bashing) + num(d.lethal) + num(d.aggravated); }
};
const statusesOf = actor => [...(actor?.statuses ?? [])];
const asleepOf = actor => {
  const base = actor?.isToken ? (actor.baseActor ?? actor) : actor;
  return base?.flags?.["wodx-npc"]?.where?.activity === "sleep";
};
/** Is the character on this token down: {down, why}. */
export function fallenOf(tokDoc) {
  const actor = docOf(tokDoc)?.actor;
  if ( !actor ) return {down: false, why: ""};
  return H.fallenOf({statuses: statusesOf(actor), wounds: woundsOf(actor), asleep: asleepOf(actor)});
}
const ch = actor => { try { return deps.characterFor?.(actor) ?? {}; } catch (e) { return {}; } };
const strengthOf = actor => H.liftStrength(ch(actor));
const athleticsOf = actor => num(ch(actor).abilities?.athletics);
const bodyFor = actor => { try { return combatApi()?.body?.of?.(actor) ?? null; } catch (e) { return null; } };
/** Hands a character can take hold with: a beast holds in its jaws (one). */
export function handsOf(actor) {
  const b = bodyFor(actor);
  if ( !b ) return 2;
  if ( b.intangible ) return 0;
  const mouth = (b.parts ?? []).some(p => p.type === "mouth");
  return Math.max(num(b.hands), mouth && !num(b.hands) ? 1 : 0);
}
const growthOf = actor => {
  const pick = actor?.flags?.["wodx-paperdoll"]?.figure?.growth;
  if ( pick && Object.hasOwn(H.PERSON_KG, pick) ) return pick;
  try {
    const c = chron(), now = c?.eras?.currentYear?.();
    const f = c?.age?.rules?.ageFacts?.(actor, t => t);
    const age = f ? (f.frozenAt ?? (f.born !== null && Number.isFinite(now) ? now - f.born : null)) : null;
    if ( age === null || !Number.isFinite(Number(age)) || age >= 18 ) return "";
    return age < 7 ? "small" : age < 12 ? "child" : age < 15 ? "young" : "youth";
  } catch (e) { return ""; }
};
/** What a body weighs: {kg, can, why}. */
export function bodyWeight(tokDoc) {
  const doc = docOf(tokDoc), actor = doc?.actor, b = bodyFor(actor);
  const shape = b && !["person", "homid"].includes(b.shape) ? b.shape : null;
  return H.bodyKg({creature: /creature/i.test(actor?.type ?? ""), squares: num(doc?.width) || 1, shape, intangible: !!b?.intangible, growth: growthOf(actor)});
}
const itemsIn = f => {
  const raw = f?.items;
  if ( Array.isArray(raw) ) return raw.length;
  return String(raw ?? "").split(/\n|;/).map(s => s.trim()).filter(Boolean).length;
};
/** A tile as a thing to move, or null. */
export function thingOf(tile) {
  const f = tile?.flags?.[MOD] ?? {};
  if ( f.mount && (f.driver || (Array.isArray(f.riders) && f.riders.some(r => !r.laid))) && !f.haul ) return null;
  return H.thingOf(f, itemsIn(f));
}
/** Is the ground at a point rough for wheels: a region named for mud, snow or rubble, or snow lying, or rain out of doors. */
function roughAt(scene, p) {
  for ( const r of scene?.regions ?? [] ) {
    let inside = false;
    try { inside = !!r.testPoint?.({x: p.x, y: p.y, elevation: 0}); } catch (e) { inside = false; }
    if ( inside && H.ROUGH.test(r.name ?? "") ) return true;
  }
  if ( H.ROUGH.test(scene?.flags?.[MOD]?.ground ?? "") ) return true;
  try {
    const a = game.modules.get("wodx-atmosphere");
    if ( a?.active && a.api?.weather?.isOutdoor?.(scene) ) {
      const w = a.api.weather.now?.() ?? {};
      if ( w.snowLying || (w.tags ?? []).some(t => ["snow", "downpour", "thunder"].includes(t)) ) return true;
    }
  } catch (e) { /* no weather */ }
  return false;
}

/* ------------------------------------------------------------------ */
/*  The load and its team                                              */
/* ------------------------------------------------------------------ */

const haulOf = doc => doc?.flags?.[MOD]?.haul ?? null;
const holdingOf = doc => doc?.flags?.[MOD]?.hauling ?? null;
const sync = uuid => { try { return fromUuidSync(uuid); } catch (e) { return null; } };
/** What a load is now: {target, kind, kg, label, strength, team, wheels, move}. */
export function loadOf(target) {
  const h = haulOf(target);
  if ( !target || !h ) return null;
  const team = (h.by ?? []).map(b => sync(b.t)).filter(Boolean);
  const strength = team.reduce((t, d) => t + strengthOf(d.actor), 0);
  let kg = 0, label = target.name ?? "", wheels = false, pile = false;
  if ( h.kind === "body" ) kg = bodyWeight(target).kg;
  else {
    const t = thingOf(target) ?? {kg: 0, label: "thing"};
    label = t.label; wheels = !!t.wheels; pile = !!t.pile;
    // what lies aboard a cart rides on its wheels too (B5082)
    const aboard = (target.flags?.[MOD]?.riders ?? []).map(r => sync(r.t)).filter(Boolean).reduce((s, d) => s + bodyWeight(d).kg, 0);
    kg = H.movingKg({kg: t.kg + aboard, wheels, rough: wheels && roughAt(target.parent, centreOf(target))});
  }
  return {target, kind: h.kind, kg, label, strength, team, wheels, pile, move: H.moveOf({kind: h.kind, kg, strength, want: h.want, pile})};
}
/**
 * What a burden does to the one holding it, for WoDX Combat: {mode, factor, hands, free, dodge, note, budge, label}, or
 * {carried: true, by} for one who is being carried, or null.
 */
export function burdenOf(tok) {
  const doc = docOf(tok);
  if ( !doc ) return null;
  const mine = haulOf(doc);
  if ( mine?.kind === "body" && (mine.by ?? []).length ) return {carried: true, by: mine.by.map(b => b.n).join(" and ")};
  const h = holdingOf(doc);
  if ( !h ) return null;
  const target = sync(h.what), L = loadOf(target);
  if ( !L ) return null;
  const hands = handsOf(doc.actor), mode = L.move.mode === "none" ? "strain" : L.move.mode;
  return {mode: L.move.mode, factor: L.move.factor, hands, free: H.handsFree(hands, mode), dodge: H.DODGE, budge: L.move.budge, roll: L.move.roll,
    label: L.kind === "body" ? target.name : L.label, kind: L.kind,
    note: `${H.WORDS[mode]} ${L.kind === "body" ? target.name : `the ${L.label}`}: ${L.move.note}`};
}

/* ------------------------------------------------------------------ */
/*  Cards and the map                                                  */
/* ------------------------------------------------------------------ */

async function card(tokDoc, title, line, {whisper = null, flags = {}} = {}) {
  return ChatMessage.create({speaker: {alias: tokDoc?.name ?? "WoDX", scene: tokDoc?.parent?.id, token: tokDoc?.id},
    content: `<div class="vta-card wodx-x wix-haul"><header class="vta-head"><h3 style="background:none!important;border:0!important;box-shadow:none!important;color:inherit!important">${esc(title)}</h3></header><div class="vta-body"><p>${line}</p></div></div>`,
    ...(whisper ? {whisper} : {}), flags: {[MOD]: {haulCard: true, ...flags}}});
}
function event(kind, tokDoc, {doc = null, noise = "silent", label = "", extra = {}} = {}) {
  try { return deps.mapEvent?.(kind, {scene: tokDoc?.parent, doc, tokDoc, noise, object: label, extra}); } catch (e) { return null; }
}
function hear(tokDoc, noise, label) {
  if ( noise === "silent" ) return;
  try { const t = tokDoc?.object; if ( t ) deps.noiseAt?.({token: t, noise, kind: "haul", objectName: label}); } catch (e) { /* off the viewed scene */ }
}
function float(doc, text) {
  try {
    if ( doc?.parent?.id !== canvas?.scene?.id ) return;
    const p = doc.documentName === "Token" ? (doc.object?.center ?? centreOf(doc)) : {x: SX(doc) + num(doc.width) / 2, y: SY(doc) + num(doc.height) / 2};
    canvas.interface?.createScrollingText?.(p, text, {anchor: CONST.TEXT_ANCHOR_POINTS?.TOP, fontSize: 22, fill: "#ffe8c0", stroke: 0x000000, strokeThickness: 4, duration: 2200});
  } catch (e) { /* no canvas */ }
}
/** Put a token on a spot: a plain move first; past a wall, a displacement (as WoDX NPC's Undo does). */
async function place(doc, pos) {
  trace("place", doc.name, [SX(doc), SY(doc)], "->", [Math.round(pos.x), Math.round(pos.y)]);
  try { await doc.update({x: Math.round(pos.x), y: Math.round(pos.y)}, MOVE); } catch (e) { trace("place threw", e?.message); }
  trace("placed", doc.name, [SX(doc), SY(doc)], [doc.x, doc.y]);
  if ( (Math.round(SX(doc)) !== Math.round(pos.x) || Math.round(SY(doc)) !== Math.round(pos.y)) && typeof doc.move === "function" && CONFIG.Token?.movement?.actions?.displace ) {
    try { await doc.move([{x: Math.round(pos.x), y: Math.round(pos.y), action: "displace"}], {animate: false, ...MOVE}); } catch (e) { /* stays */ }
  }
  if ( Math.round(SX(doc)) !== Math.round(pos.x) || Math.round(SY(doc)) !== Math.round(pos.y) ) await doc.update({x: Math.round(pos.x), y: Math.round(pos.y)}, {...MOVE, animate: false, teleport: true}).catch(() => null);
}
/** A body's top-left for its centre at p. */
const topLeft = (doc, p) => { const g = sizeOf(doc.parent); return {x: p.x - num(doc.width || 1) * g / 2, y: p.y - num(doc.height || 1) * g / 2}; };

/** The trail a dragged body leaves: one drawing, a line grown at each move; blood for a bleeding body (B5075). */
async function growTrail(body, from, to) {
  const h = haulOf(body), scene = body.parent;
  const d = body.actor?.system?.health?.damage ?? {};
  const kind = H.bleeds({lethal: d.lethal, aggravated: d.aggravated, dead: statusesOf(body.actor).includes("dead")}) ? "blood" : "scuff";
  const T = H.TRAIL[kind];
  let dr = h?.trail ? scene.drawings?.get?.(h.trail) : null;
  const pts = dr ? (dr.shape?.points ?? []).reduce((a, v, i, arr) => (i % 2 ? a : [...a, {x: num(dr.x) + v, y: num(dr.y) + num(arr[i + 1])}]), []) : [from];
  pts.push(to);
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y), x0 = Math.min(...xs), y0 = Math.min(...ys);
  const data = {x: x0, y: y0, shape: {type: "p", width: Math.max(1, Math.max(...xs) - x0), height: Math.max(1, Math.max(...ys) - y0), points: pts.flatMap(p => [p.x - x0, p.y - y0])},
    strokeWidth: T.width, strokeColor: T.color, strokeAlpha: T.alpha, fillType: 0, bezierFactor: 0.2, sort: 0,
    flags: {[MOD]: {trail: {kind, of: body.name, by: (h?.by ?? []).map(b => b.n), since: game.time.worldTime}}}};
  if ( dr ) { await dr.update(data); return {id: dr.id, kind, made: false}; }
  const [made] = await scene.createEmbeddedDocuments("Drawing", [{...data, author: game.user.id}]);
  let clue = null;
  if ( kind === "blood" ) {
    // A tracker can find it: a trail clue where the dragging began (Perception + the clue's own need)
    const g = sizeOf(scene);
    const [c] = await scene.createEmbeddedDocuments("Tile", [{x: from.x - g / 2, y: from.y - g / 2, width: g, height: g, texture: {src: null}, hidden: false,
      flags: {[MOD]: {clue: true, clueKind: "trail", title: "A trail of blood", need: 1,
        text0: "A smear of blood runs across the ground, as if something heavy and bleeding was dragged.",
        text1: `It runs on in one line; whoever dragged it went the way it leads.`,
        text2: `Fresh: it is ${kind === "blood" ? "still wet" : "dry"}. Boots scuffed beside it.`, haulTrail: made.id}}}]);
    clue = c?.id ?? null;
    event("trail", body, {doc: c ?? null, noise: "silent", label: "a trail of blood", extra: {blood: true, of: body.name}});
  }
  return {id: made.id, kind, made: true, clue};
}

/* ------------------------------------------------------------------ */
/*  Pictures for things that were only part of the map (B5075)         */
/* ------------------------------------------------------------------ */

const loaded = new Map();
function imageOf(src) {
  if ( loaded.has(src) ) return loaded.get(src);
  const p = new Promise((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = rej; i.src = src; });
  loaded.set(src, p);
  return p;
}
/** Cut a rectangle of the scene's own picture into a file. -> a path, or null. */
async function cutPicture(scene, rect, name) {
  // Foundry 14 keeps the picture on the scene's levels; older scenes on the scene itself
  const lv = scene?.levels?.contents ?? [...(scene?.levels?.values?.() ?? [])];
  const src = [scene?.initialLevel, ...lv].map(l => l?.background?.src).find(Boolean) || scene?._source?.background?.src || null;
  if ( !src ) return null;
  const img = await imageOf(src);
  const dim = scene.dimensions ?? canvas.dimensions;
  const sx = img.naturalWidth / num(dim.sceneWidth || img.naturalWidth), sy = img.naturalHeight / num(dim.sceneHeight || img.naturalHeight);
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(rect.w)); c.height = Math.max(1, Math.round(rect.h));
  c.getContext("2d").drawImage(img, (rect.x - num(dim.sceneX)) * sx, (rect.y - num(dim.sceneY)) * sy, rect.w * sx, rect.h * sy, 0, 0, c.width, c.height);
  const blob = await new Promise(r => c.toBlob(r, "image/webp", 0.9));
  if ( !blob ) return null;
  const FP = foundry.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
  const dir = `worlds/${game.world.id}/wodx-haul`;
  try { await FP.createDirectory("data", dir, {}); } catch (e) { /* there already */ }
  const file = new File([blob], `${name}.webp`, {type: "image/webp"});
  const r = await FP.upload("data", dir, file, {}, {notify: false});
  return r?.path ?? `${dir}/${name}.webp`;
}
/**
 * A thing with no picture of its own (a chest drawn into the map) moves for the first time: it takes the piece of the
 * map it covered as its picture, and the spot it left shows the floor beside it.
 */
async function liftPicture(tile, to) {
  const f = tile.flags?.[MOD] ?? {};
  if ( tile.texture?.src || f.haulHome ) return false;
  const scene = tile.parent, home = rectOf(tile);
  const dim = scene.dimensions ?? canvas.dimensions;
  const bounds = {x: num(dim.sceneX), y: num(dim.sceneY), w: num(dim.sceneWidth), h: num(dim.sceneHeight)};
  try {
    const pic = await cutPicture(scene, home, `${scene.id}-${tile.id}`);
    const fl = H.floorPatch(home, to, bounds);
    const floor = fl ? await cutPicture(scene, fl, `${scene.id}-${tile.id}-floor`) : null;
    if ( floor ) await scene.createEmbeddedDocuments("Tile", [{x: home.x, y: home.y, width: home.w, height: home.h, rotation: num(tile.rotation), sort: num(tile.sort) - 1,
      texture: {src: floor}, flags: {[MOD]: {haulFloorOf: tile.id}}}]);
    await tile.update({...(pic ? {"texture.src": pic} : {}), [`flags.${MOD}.haulHome`]: home});
    return !!pic;
  } catch (e) {
    console.warn(`${MOD} | haul picture`, e);
    await tile.update({[`flags.${MOD}.haulHome`]: home}).catch(() => null);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Barricades (B5085)                                                 */
/* ------------------------------------------------------------------ */

const isDoor = w => num(w.door) > 0;
/** After a thing comes to rest: a solid thing over a doorway blocks it; one moved off frees it. */
export async function settleBarricade(tile) {
  const scene = tile.parent, f = tile.flags?.[MOD] ?? {}, t = thingOf(tile);
  const r = rectOf(tile), was = f.barricade ?? null;
  const door = t ? wallsOf(scene).find(w => isDoor(w) && H.overDoor(r, w.c, 4)) : null;
  if ( was && (!door || door.id !== was.door) ) {
    const w = scene.walls.get(was.wall);
    if ( w ) await w.delete();
    await tile.update(unset(`flags.${MOD}.barricade`));
  }
  if ( door && (!was || was.door !== door.id) ) {
    const S = CONST.WALL_SENSE_TYPES ?? CONST.EDGE_SENSE_TYPES ?? {NONE: 0, NORMAL: 20};
    const M = CONST.WALL_MOVEMENT_TYPES ?? {NONE: 0, NORMAL: 20};
    const see = H.SEE_THROUGH.has(t.label);
    const [w] = await scene.createEmbeddedDocuments("Wall", [{c: [...door.c], move: M.NORMAL ?? 20, sight: see ? (S.NONE ?? 0) : (S.NORMAL ?? 20),
      light: see ? (S.NONE ?? 0) : (S.NORMAL ?? 20), sound: S.NONE ?? 0, door: 0, flags: {[MOD]: {barricadeOf: tile.id}}}]);
    await tile.update({[`flags.${MOD}.barricade`]: {wall: w.id, door: door.id}});
    float(tile, "Barricaded");
    event("barricade", null, {doc: tile, noise: "quiet", label: t.label, extra: {scene: scene.id}});
    return "blocked";
  }
  return was && !door ? "freed" : null;
}

/* ------------------------------------------------------------------ */
/*  Taking hold and letting go                                         */
/* ------------------------------------------------------------------ */

const turnTag = () => { const c = game.combat; return c?.started ? `${c.id}:${c.round}` : `t${Math.floor((game.time.worldTime ?? 0) / 3)}:${Date.now()}`; };

/** Why a character cannot take hold of anything now, or "". */
function cannotHold(doc) {
  if ( !doc?.actor ) return "no character";
  if ( fallenOf(doc).down ) return `${doc.name} is down`;
  if ( holdingOf(doc) ) return `${doc.name} already holds something`;
  if ( haulOf(doc)?.by?.length ) return `${doc.name} is being carried`;
  if ( !handsOf(doc.actor) ) return `${doc.name} has nothing to take hold with`;
  return "";
}

/*
 * One change at a time: a carrier's move, setting a load down, a status that drops it and a struggle all read and
 * write the same flags, so they run in turn on the active Storyteller. Code already in the queue calls the *Now forms.
 */
let chain = Promise.resolve();
function serial(fn) {
  const run = chain.then(fn);
  chain = run.catch(() => null);
  return run;
}
export const take = (...a) => serial(() => takeNow(...a));
export const release = (...a) => serial(() => releaseNow(...a));
export const struggle = (...a) => serial(() => struggleNow(...a));
export const onMoved = (...a) => serial(() => onMovedNow(...a));
const onActorChanged = (...a) => serial(() => onActorChangedNow(...a));

/**
 * Take hold. doc: the one taking hold; target: a token (a fallen character) or a tile (a thing); want: "carry" or
 * "drag" for a body, "push" or "haul" for a thing. Active Storyteller only. -> {ok, why, mode}
 */
async function takeNow(doc, target, want = "") {
  doc = docOf(doc); target = docOf(target);
  trace("take", doc?.name, target?.name, want, [SX(doc), SY(doc)], [SX(target), SY(target)]);
  if ( !isActiveGM() ) return request("take", {who: doc?.uuid, what: target?.uuid, want});
  const why = cannotHold(doc);
  if ( why ) return {ok: false, why};
  if ( !target || target.parent?.id !== doc.parent?.id ) return {ok: false, why: "it is not here"};
  if ( !inReach(doc, target) ) return {ok: false, why: "it is out of reach"};
  const isBody = target.documentName === "Token";
  if ( isBody ) {
    if ( target.id === doc.id ) return {ok: false, why: "no one carries themselves"};
    if ( !fallenOf(target).down ) return {ok: false, why: `${target.name} is on their feet`};
    const w = bodyWeight(target);
    if ( !w.can ) return {ok: false, why: w.why};
  } else if ( !thingOf(target) ) return {ok: false, why: "it is fixed in place"};
  if ( isBody ) {
    // taken off a cart or a bed where it was laid
    for ( const t of tilesOf(target.parent) ) {
      const r = t.flags?.[MOD]?.riders;
      if ( Array.isArray(r) && r.some(x => x.t === target.uuid) ) await t.update({[`flags.${MOD}.riders`]: r.filter(x => x.t !== target.uuid)});
    }
    if ( target.flags?.[MOD]?.restsOn ) await target.update(unset(`flags.${MOD}.restsOn`), MOVE);
  }
  const prior = haulOf(target);
  const by = [...(prior?.by ?? []), {t: doc.uuid, n: doc.name, dx: SX(target) - SX(doc), dy: SY(target) - SY(doc)}];
  const kind = isBody ? "body" : "thing";
  const before = prior?.before ?? (isBody ? {rotation: num(target.rotation), alpha: target.alpha ?? 1} : null);
  const w = isBody ? (want === "drag" ? "drag" : "carry") : (want === "haul" ? "haul" : "push");
  await target.update({[`flags.${MOD}.haul`]: {kind, by, want: prior?.want ?? w, before, trail: prior?.trail ?? null, clue: prior?.clue ?? null, turn: null}});
  await doc.update({[`flags.${MOD}.hauling`]: {what: target.uuid, kind, n: target.name}});
  const L = loadOf(target);
  if ( isBody ) await lay(target, doc, L.move.mode, null);
  const name = isBody ? target.name : `the ${L.label}`;
  const team = by.length > 1 ? ` With ${by.slice(0, -1).map(b => b.n).join(" and ")} on it too, their Strength adds up (${L.strength}).` : "";
  const how = !L.move.budge ? `${name} will not budge: ${L.move.note}.` : L.move.mode === "carry" ? `lifts ${name} (${L.move.note}).`
    : L.move.mode === "drag" ? `takes hold of ${name} to drag (${L.move.note}${L.move.over ? "; too heavy to lift" : ""}).`
    : `takes hold of ${name} (${H.WORDS[L.move.mode]}, ${L.move.note}).`;
  await card(doc, isBody ? (L.move.mode === "carry" ? "Carrying" : "Dragging") : "Taking hold", `<b>${esc(doc.name)}</b> ${esc(how)}${esc(team)}`);
  float(isBody ? target : target, L.move.budge ? (isBody ? (L.move.mode === "carry" ? "Lifted" : "Dragged") : "Taken hold of") : "Will not budge");
  event(isBody ? "carry" : "grab", doc, {doc: isBody ? null : target, noise: "silent", label: name, extra: {mode: L.move.mode, kg: L.kg}});
  return {ok: true, why: "", mode: L.move.mode};
}

/** Where a held body lies against the one holding it (B5075): on their square, or a square behind. */
async function lay(body, holder, mode, from) {
  const h = haulOf(body);
  trace("lay", body.name, "by", holder.name, mode, [SX(holder), SY(holder)], [holder.x, holder.y]);
  const look = H.LOOK[mode === "carry" ? "carry" : "drag"];
  const hc = centreOf(holder), g = sizeOf(body.parent);
  let at = hc;
  if ( mode !== "carry" ) {
    const bc = centreOf(body), d = Math.hypot(bc.x - hc.x, bc.y - hc.y);
    at = d > 1 ? {x: hc.x + (bc.x - hc.x) / d * g, y: hc.y + (bc.y - hc.y) / d * g} : H.behind(hc, from ?? {x: hc.x, y: hc.y - g}, g);
  }
  const old = centreOf(body);
  await body.update({rotation: look.rotation, alpha: look.alpha}, MOVE);
  await place(body, topLeft(body, at));
  if ( mode !== "carry" && Math.hypot(old.x - at.x, old.y - at.y) > 2 ) {
    const tr = await growTrail(body, old, at).catch(e => { console.warn(`${MOD} | trail`, e); return null; });
    if ( tr ) await body.update({[`flags.${MOD}.haul.trail`]: tr.id, ...(tr.clue ? {[`flags.${MOD}.haul.clue`]: tr.clue} : {})}, MOVE);
  }
  return h;
}

/**
 * Let go. onto: null (the ground), or a tile id (a mount or vehicle: aboard; a bed or a table: on it). drop: it fell
 * (knocked down, dazed). -> {ok, why}
 */
async function releaseNow(doc, {onto = null, drop = false, quiet = false} = {}) {
  doc = docOf(doc);
  trace("release", doc?.name, onto, drop ? "drop" : "");
  if ( !isActiveGM() ) return request("release", {who: doc?.uuid, onto});
  const h = holdingOf(doc);
  if ( !h ) return {ok: false, why: `${doc?.name ?? "They"} hold nothing`};
  const target = sync(h.what);
  await doc.update(unset(`flags.${MOD}.hauling`));
  if ( !target ) return {ok: true, why: ""};
  const rec = haulOf(target) ?? {};
  const by = (rec.by ?? []).filter(b => b.t !== doc.uuid);
  const name = rec.kind === "body" ? target.name : `the ${thingOf(target)?.label ?? "thing"}`;
  if ( by.length ) {
    await target.update({[`flags.${MOD}.haul.by`]: by});
    if ( !quiet ) await card(doc, "Letting go", `<b>${esc(doc.name)}</b> lets go of ${esc(name)}; ${esc(by.map(b => b.n).join(" and "))} still ${by.length === 1 ? "holds" : "hold"} it.`);
    return {ok: true, why: ""};
  }
  let where = "on the ground";
  if ( rec.kind === "body" ) {
    const tile = onto ? target.parent.tiles.get(onto) : null, tf = tile?.flags?.[MOD] ?? {};
    const before = rec.before ?? {rotation: 0, alpha: 1};
    // the mark first, on its own (a deletion sent with other changes was kept on some bodies), then the look
    await target.update(unset(`flags.${MOD}.haul`));
    if ( haulOf(target) ) await target.update({[`flags.${MOD}.haul`]: null});
    await target.update({alpha: before.alpha ?? 1, rotation: tile && !tf.mount ? 90 : num(before.rotation)}, MOVE);
    if ( tile && tf.mount ) {
      // Aboard: a passenger who goes where the mount or vehicle goes (laid: nobody at the reins is kept from pushing it)
      const pos = {x: SX(tile) + num(tile.width) / 2, y: SY(tile) + num(tile.height) / 2};
      await place(target, topLeft(target, pos));
      const riders = (Array.isArray(tf.riders) ? tf.riders : []).filter(r => r.t !== target.uuid);
      riders.push({a: target.actorId, t: target.uuid, n: target.name, dx: SX(target) - SX(tile), dy: SY(target) - SY(tile), laid: true});
      await tile.update({[`flags.${MOD}.riders`]: riders});
      where = `aboard the ${(thingOf(tile)?.label ?? deps.rules?.MOUNTS?.[tf.mountKind]?.label ?? "vehicle").toLowerCase()}`;
    } else if ( tile ) {
      await place(target, topLeft(target, {x: SX(tile) + num(tile.width) / 2, y: SY(tile) + num(tile.height) / 2}));
      await target.update({[`flags.${MOD}.restsOn`]: tile.id}, MOVE);
      where = `on the ${thingOf(tile)?.label ?? "furniture"}`;
    } else if ( Math.hypot(SX(target) - SX(doc), SY(target) - SY(doc)) < 2 ) {
      // set down beside the carrier, not on their square
      const g = sizeOf(target.parent);
      await place(target, {x: SX(doc) + g, y: SY(doc)});
    }
  } else {
    await target.update(unset(`flags.${MOD}.haul`));
    const b = await settleBarricade(target);
    if ( b === "blocked" ) where = "across the doorway, blocking it";
  }
  if ( !quiet ) await card(doc, drop ? "Dropped" : "Setting down", `<b>${esc(doc.name)}</b> ${drop ? "drops" : "sets down"} ${esc(name)} ${esc(where)}.`);
  float(target, drop ? "Dropped" : "Set down");
  event(drop ? "drop" : "setdown", doc, {doc: rec.kind === "body" ? null : target, noise: drop ? "quiet" : "silent", label: name});
  return {ok: true, why: "", where};
}
/** Let everyone go of a load (a Storyteller moved it by hand, it was destroyed). */
async function freeLoad(target, why = "") {
  const rec = haulOf(target);
  for ( const b of rec?.by ?? [] ) { const d = sync(b.t); if ( d ) await releaseNow(d, {quiet: true}); }
  if ( why ) await card(target, "Let go", esc(why));
}

/* ------------------------------------------------------------------ */
/*  Moving with a load                                                 */
/* ------------------------------------------------------------------ */

async function rollFor(actor, attr, ability, diff) {
  const ab = ability ? num(ch(actor).abilities?.[ability]) : 0;
  const a = actor?.system?.attributes?.[attr], dots = a ? num(a.total ?? a.value) : 0;
  const built = actionPool({attribute: dots, attributeLabel: attr[0].toUpperCase() + attr.slice(1), ability: ab, abilityLabel: ability ? ability[0].toUpperCase() + ability.slice(1) : "",
    abilityKey: ability || null, baseDifficulty: diff, woundPenalty: actor?.system?.conditions?.isignoringpain ? 0 : num(actor?.system?.health?.damage?.woundpenalty)});
  const d = clampDifficulty(built.difficulty), n = Math.max(0, built.dice);
  if ( !n ) return {successes: 0, botch: false, dice: 0, diff: d, faces: []};
  const roll = await new Roll(`${n}d10`).evaluate();
  const faces = roll.dice[0]?.results?.map(x => x.result) ?? [];
  return {...countSuccesses(faces, d), dice: n, diff: d, faces, roll};
}
const diceText = r => `${r.dice} dice at ${r.diff}: ${r.faces.join(", ") || "none"} (${r.botch ? "a botch" : `${r.successes} success${r.successes === 1 ? "" : "es"}`})`;

/** A climb tile of stairs or a ladder on the way: wheels go no further (B5082). */
function stairsOnWay(scene, a, b) {
  for ( const t of tilesOf(scene) ) {
    const f = t.flags?.[MOD];
    if ( !f?.climb || (f.climbKind ?? "ladder") !== "ladder" ) continue;
    const r = rectOf(t);
    for ( let k = 0; k <= 10; k++ ) { const p = {x: a.x + (b.x - a.x) * k / 10, y: a.y + (b.y - a.y) * k / 10}; if ( toRect(p, r) <= 0 ) return true; }
  }
  return false;
}

const busy = new Set();
/** Active Storyteller: a token moved. Its load follows; a body that moved on its own struggles or is let go. */
async function onMovedNow(doc, changes, options = {}, userId = null) {
  trace("moved", doc.name, {x: changes?.x, y: changes?.y}, "haul" in (options ?? {}) ? "own" : "", options?.wodxHaul ? "skip" : "", busy.has(doc.uuid) ? "busy" : "", holdingOf(doc)?.n ?? "", haulOf(doc) ? "held" : "");
  if ( options?.wodxHaul || !isActiveGM() ) return;
  if ( !("x" in (changes ?? {}) || "y" in (changes ?? {})) ) return;
  if ( busy.has(doc.uuid) ) return;
  busy.add(doc.uuid);
  try {
    const own = haulOf(doc);
    if ( own?.kind === "body" && (own.by ?? []).length ) return await movedWhileCarried(doc, userId);
    const h = holdingOf(doc);
    if ( !h ) return;
    const target = sync(h.what);
    if ( !target || target.parent?.id !== doc.parent?.id ) { await doc.update(unset(`flags.${MOD}.hauling`)); return; }
    const rec = haulOf(target);
    const me = rec?.by?.find(b => b.t === doc.uuid);
    if ( !me ) { await doc.update(unset(`flags.${MOD}.hauling`)); return; }
    const L = loadOf(target);
    if ( rec.kind === "body" ) {
      if ( !L.move.budge ) { await releaseNow(doc, {quiet: true}); await card(doc, "Too heavy", `<b>${esc(doc.name)}</b> cannot move ${esc(target.name)} (${esc(L.move.note)}) and lets go.`); return; }
      const g = sizeOf(doc.parent);
      const from = {x: num(changes.x ?? doc.x) + g / 2, y: num(changes.y ?? doc.y) + g / 2};
      // only the first of a team leads the body; the others keep beside it
      if ( rec.by[0].t === doc.uuid ) await lay(target, doc, L.move.mode, from);
      const noise = H.noiseOf({kind: "body", mode: L.move.mode});
      if ( rec.turn !== turnTag() ) { hear(doc, noise, target.name); await target.update({[`flags.${MOD}.haul.turn`]: turnTag()}, MOVE); }
      return;
    }
    // A thing: it goes where its holder goes, at the offset it was taken hold at
    const was = {x: SX(target), y: SY(target)}, at = {x: SX(doc) + num(me.dx), y: SY(doc) + num(me.dy)};
    const back = async (why, roll = null) => {
      const g = sizeOf(doc.parent);
      await place(doc, {x: was.x - num(me.dx), y: was.y - num(me.dy)});
      await card(doc, `The ${L.label} stays put`, `<b>${esc(doc.name)}</b> ${esc(why)}${roll ? ` <span class="wodx-quiet">(${esc(diceText(roll))})</span>` : ""}`);
      float(target, "It won't move");
      return g;
    };
    if ( !L.move.budge ) {
      if ( game.users.get(userId)?.isGM ) { await releaseNow(doc, {quiet: true}); return; }
      return back(`strains at it, but it will not budge: ${L.move.note}.`);
    }
    if ( L.wheels && stairsOnWay(doc.parent, {x: was.x + num(target.width) / 2, y: was.y + num(target.height) / 2}, {x: at.x + num(target.width) / 2, y: at.y + num(target.height) / 2}) )
      return back("cannot get its wheels up the stairs or a ladder.");
    const tag = turnTag(), newTurn = rec.turn !== tag;
    if ( L.move.roll && newTurn ) {
      const r = await rollFor(doc.actor, H.ROLL.attr, H.ROLL.ability, H.ROLL.diff);
      await target.update({[`flags.${MOD}.haul.turn`]: tag});
      if ( r.botch || r.successes < 1 ) return back(`heaves at it, but it does not move this turn.`, r);
      await card(doc, `Shifting the ${L.label}`, `<b>${esc(doc.name)}</b> heaves and it moves (Strength + Athletics, <span class="wodx-quiet">${esc(diceText(r))}</span>).`);
    } else if ( newTurn ) await target.update({[`flags.${MOD}.haul.turn`]: tag});
    if ( !target.texture?.src && !target.flags?.[MOD]?.haulHome ) await liftPicture(target, at);
    const step = {x: at.x - was.x, y: at.y - was.y};
    await target.update({x: Math.round(at.x), y: Math.round(at.y)}, {animate: true});
    // the others holding it, and whatever lies aboard a cart, come too
    for ( const b of rec.by ) {
      if ( b.t === doc.uuid ) continue;
      const o = sync(b.t);
      if ( o ) await place(o, {x: SX(o) + step.x, y: SY(o) + step.y});
    }
    for ( const r of target.flags?.[MOD]?.riders ?? [] ) {
      const o = sync(r.t);
      if ( o && o.parent?.id === doc.parent?.id ) await place(o, {x: SX(target) + num(r.dx), y: SY(target) + num(r.dy)});
    }
    if ( newTurn ) {
      const noise = H.noiseOf({kind: "thing", mode: L.move.mode, kg: L.kg, wheels: L.wheels});
      hear(doc, noise, L.label);
      event("drag", doc, {doc: target, noise, label: L.label, extra: {mode: L.move.mode}});
      if ( noise === "loud" ) float(target, "Scrape!");
    }
    await settleBarricade(target);
  } catch (e) { console.error(`${MOD} | haul`, e); }
  finally { busy.delete(doc.uuid); }
}

/** A carried body moved by hand (B5078): a Storyteller's move lets it go; a player's is struggling free. */
async function movedWhileCarried(body, userId) {
  trace("movedWhileCarried", body.name, game.users.get(userId)?.isGM ? "gm" : "player");
  const rec = haulOf(body), lead = sync(rec.by[0]?.t);
  const user = game.users.get(userId);
  if ( !lead || user?.isGM ) return freeLoad(body);
  if ( fallenOf(body).down ) {
    await lay(body, lead, loadOf(body).move.mode, null);
    return card(body, "Still carried", `<b>${esc(body.name)}</b> is ${esc(fallenOf(body).why)} and cannot struggle.`, {whisper: [userId, ...gmIds()]});
  }
  return struggleNow(body, {moved: true});
}
/** Struggle free: Strength + Athletics at 6 against the carrier's Strength at 6 (B5078). */
async function struggleNow(body, {moved = false} = {}) {
  body = docOf(body);
  if ( !isActiveGM() ) return request("struggle", {who: body?.uuid});
  const rec = haulOf(body), lead = sync(rec?.by?.[0]?.t);
  if ( !rec || !lead ) return {ok: false, why: "not held"};
  const mine = await rollFor(body.actor, "strength", "athletics", H.STRUGGLE.diff);
  const theirs = await rollFor(lead.actor, "strength", "", H.STRUGGLE.diff);
  const win = !mine.botch && H.struggleWins(mine.successes, theirs.botch ? 0 : theirs.successes);
  const line = `Strength + Athletics ${esc(diceText(mine))} against ${esc(lead.name)}'s Strength ${esc(diceText(theirs))}.`;
  if ( win ) {
    const pos = {x: SX(body), y: SY(body)};
    await freeLoad(body);
    if ( moved ) await place(body, pos);
    await card(body, "Struggles free", `<b>${esc(body.name)}</b> twists out of ${esc(lead.name)}'s grip. <span class="wodx-quiet">${line}</span>`);
    float(body, "Free!");
    event("struggle", body, {noise: "quiet", label: lead.name, extra: {won: true}});
  } else {
    await lay(body, lead, loadOf(body).move.mode, null);
    await card(body, "Held fast", `<b>${esc(lead.name)}</b> keeps hold of <b>${esc(body.name)}</b>. <span class="wodx-quiet">${line}</span>`);
    float(body, "Held");
  }
  return {ok: true, win};
}

/* ------------------------------------------------------------------ */
/*  Falling and waking (B5074, B5078)                                  */
/* ------------------------------------------------------------------ */

/** An actor's tokens: its own for a token actor, else the linked ones on every scene (Foundry's own index). */
function tokensFor(actor) {
  if ( actor.isToken && actor.token ) return [actor.token];
  try { if ( typeof actor.getDependentTokens === "function" ) return actor.getDependentTokens({linked: true}) ?? []; } catch (e) { /* the walk below */ }
  const out = [];
  for ( const scene of game.scenes ?? [] ) for ( const t of tokensOf(scene) ) if ( t.actorLink && t.actorId === actor.id ) out.push(t);
  return out;
}
const DROPS = ["wodx-knockdown", "wodx-dazed", "stun", "prone"];
const woken = new Set();
/** Active Storyteller: an actor's statuses or health changed. */
async function onActorChangedNow(actor) {
  if ( !isActiveGM() || !actor ) return;
  // Only this actor's own tokens, and only one that holds something or is held: every other change costs nothing
  for ( const t of tokensFor(actor) ) {
    if ( !t.flags?.[MOD]?.hauling && !t.flags?.[MOD]?.haul && !woken.has(t.uuid) ) continue;
    const st = new Set(statusesOf(actor));
    // A carrier knocked down, dazed or stunned, or down themselves, drops the load
    if ( holdingOf(t) && (DROPS.some(s => st.has(s)) || fallenOf(t).down) ) {
      const what = holdingOf(t).n;
      await releaseNow(t, {drop: true, quiet: true});
      await card(t, "Dropped", `<b>${esc(t.name)}</b> ${fallenOf(t).down ? "goes down" : "is knocked off balance"} and drops ${esc(what)}.`);
      continue;
    }
    // A carried body that wakes: the owner chooses
    const rec = haulOf(t);
    if ( rec?.kind === "body" && rec.by?.length && !fallenOf(t).down && !woken.has(t.uuid) ) {
      woken.add(t.uuid);
      const owners = game.users.filter(u => !u.isGM && actor.testUserPermission?.(u, "OWNER")).map(u => u.id);
      await card(t, "Waking while carried", `<b>${esc(t.name)}</b> comes to, held by ${esc(rec.by.map(b => b.n).join(" and "))}. <button type="button" data-wix-haul="struggle" data-who="${esc(t.uuid)}">Struggle free</button> <button type="button" data-wix-haul="stay" data-who="${esc(t.uuid)}">Stay carried</button>`,
        {whisper: [...owners, ...gmIds()], flags: {wake: t.uuid}});
    }
    if ( !rec ) woken.delete(t.uuid);
  }
}

/* ------------------------------------------------------------------ */
/*  What a character can do: the window                               */
/* ------------------------------------------------------------------ */

/** Every choice a token has now: [{op, label, what, want, onto, note, disabled}]. */
export function optionsFor(tok) {
  const doc = docOf(tok);
  if ( !doc?.actor ) return [];
  const scene = doc.parent, out = [];
  const own = haulOf(doc);
  if ( own?.kind === "body" && own.by?.length ) {
    const awake = !fallenOf(doc).down;
    out.push({op: "struggle", label: "Struggle free", note: awake ? `Strength + Athletics at 6 against ${own.by[0].n}'s Strength.` : "Not while down.", disabled: !awake});
    out.push({op: "stay", label: "Stay carried", note: `${own.by.map(b => b.n).join(" and ")} keep${own.by.length === 1 ? "s" : ""} hold.`});
    return out;
  }
  const h = holdingOf(doc);
  if ( h ) {
    const b = burdenOf(doc);
    out.push({op: "release", label: h.kind === "body" ? `Set ${h.n} down here` : `Let go of the ${b?.label ?? "thing"}`, note: b?.note ?? ""});
    if ( h.kind === "body" ) for ( const t of tilesOf(scene) ) {
      const f = t.flags?.[MOD] ?? {};
      if ( !inReach(doc, t) ) continue;
      if ( f.mount ) {
        const seats = num(deps.rules?.MOUNTS?.[f.mountKind]?.seats) || 2, taken = (f.riders ?? []).length + (f.driver ? 1 : 0);
        out.push({op: "release", onto: t.id, label: `Lay ${h.n} aboard the ${(f.title || deps.rules?.MOUNTS?.[f.mountKind]?.label || "vehicle").toLowerCase()}`, note: "Rides with it wherever it goes.", disabled: taken >= seats});
      } else if ( (f.hide && f.hideKind === "bed") || (f.cover && (f.coverKind ?? "table") === "table") ) {
        out.push({op: "release", onto: t.id, label: `Lay ${h.n} on the ${f.hide ? "bed" : "table"}`, note: ""});
      }
    }
    return out;
  }
  const why = cannotHold(doc);
  if ( why ) return [{op: "none", label: why, disabled: true}];
  for ( const t of tokensOf(scene) ) {
    if ( t.id === doc.id || t.hidden || !inReach(doc, t) ) continue;
    const f = fallenOf(t);
    if ( !f.down ) continue;
    const w = bodyWeight(t);
    if ( !w.can ) { out.push({op: "none", label: `${t.name}: ${w.why}`, disabled: true}); continue; }
    const team = [...(haulOf(t)?.by ?? []).map(b => sync(b.t)?.actor).filter(Boolean), doc.actor];
    const m = H.moveOf({kind: "body", kg: w.kg, strength: team.reduce((s, a) => s + strengthOf(a), 0)});
    const help = haulOf(t)?.by?.length ? ` with ${haulOf(t).by.map(b => b.n).join(" and ")}` : "";
    out.push({op: "take", what: t.uuid, want: "carry", label: `Carry ${t.name}${help} (${f.why})`, note: m.mode === "carry" ? `About ${w.kg} kg: half pace, both hands.` : `About ${w.kg} kg: too heavy to lift; drag instead.`, disabled: m.mode !== "carry"});
    out.push({op: "take", what: t.uuid, want: "drag", label: `Drag ${t.name}${help}`, note: m.budge ? "Quarter pace, one hand." : m.note, disabled: false});
  }
  for ( const t of tilesOf(scene) ) {
    if ( t.hidden || !inReach(doc, t) ) continue;
    const th = thingOf(t);
    if ( !th ) continue;
    const prior = haulOf(t), team = [...(prior?.by ?? []).map(b => sync(b.t)?.actor).filter(Boolean), doc.actor];
    const kg = H.movingKg({kg: th.kg, wheels: th.wheels, rough: th.wheels && roughAt(scene, centreOf(t))});
    const m = H.moveOf({kind: "thing", kg, strength: team.reduce((s, a) => s + strengthOf(a), 0), pile: th.pile});
    const help = prior?.by?.length ? ` with ${prior.by.map(b => b.n).join(" and ")}` : "";
    const bar = t.flags?.[MOD]?.barricade;
    out.push({op: "take", what: t.uuid, want: th.pile ? "haul" : "push", label: `${bar ? "Shove aside" : th.pile ? "Haul" : "Push or pull"} the ${th.label}${help}`,
      note: `About ${Math.round(th.kg)} kg${th.wheels ? ", on wheels" : ""}: ${m.note}.`});
  }
  if ( !out.length ) out.push({op: "none", label: "Nobody fallen and nothing to move within reach.", disabled: true});
  return out;
}

/** Do one choice. */
export async function choose(doc, opt) {
  doc = docOf(doc);
  if ( !opt || opt.disabled ) return null;
  if ( opt.op === "take" ) {
    const target = sync(opt.what);
    const r = await take(doc, target, opt.want);
    if ( r && !r.ok && r.why ) ui.notifications?.warn?.(`${doc.name}: ${r.why}.`);
    return r;
  }
  if ( opt.op === "release" ) return release(doc, {onto: opt.onto ?? null});
  if ( opt.op === "struggle" ) return struggle(doc);
  return null;
}

export async function openHaul(tok) {
  const doc = docOf(tok);
  if ( !doc?.isOwner ) return null;
  const opts = optionsFor(doc);
  const b = burdenOf(doc);
  const head = b?.carried ? `Carried by ${b.by}.` : b ? `${b.note[0].toUpperCase()}${b.note.slice(1)}. Hands free: ${b.free} of ${b.hands}. +${b.dodge} to dodge.` : "Take hold of a fallen character or a large thing within reach.";
  const rows = opts.map((o, k) => `<button type="button" data-k="${k}"${o.disabled ? " disabled" : ""} style="display:block;width:100%;text-align:left;margin:2px 0">${esc(o.label)}${o.note ? `<br><span class="hint">${esc(o.note)}</span>` : ""}</button>`).join("");
  let picked = null;
  await foundry.applications.api.DialogV2.wait({rejectClose: false, classes: ["wodx-dialog", "wix-haul"], window: {title: `Carry and drag: ${doc.name}`},
    content: `<p>${esc(head)}</p><div class="wix-haul-opts">${rows}</div>`,
    buttons: [{action: "close", label: "Close", default: true}],
    render: (ev, dlg) => {
      const el = dlg?.element ?? ev?.target?.element;
      el?.querySelectorAll?.("[data-k]")?.forEach(btn => btn.addEventListener("click", () => { picked = opts[Number(btn.dataset.k)]; dlg.close(); }));
    }});
  if ( picked ) return choose(doc, picked);
  return null;
}

/* ------------------------------------------------------------------ */
/*  The socket: a player's choice goes to the active Storyteller       */
/* ------------------------------------------------------------------ */

function request(op, data) {
  game.socket?.emit?.(SOCKET, {action: "haul", op, user: game.user.id, ...data});
  return Promise.resolve({ok: true, why: "", sent: true});
}
async function onSocket(msg) {
  if ( msg?.action !== "haul" || !isActiveGM() ) return;
  const user = game.users.get(msg.user), who = sync(msg.who);
  if ( !who?.actor || !user || !who.actor.testUserPermission?.(user, "OWNER") ) return;
  if ( msg.op === "take" ) return take(who, sync(msg.what), msg.want);
  if ( msg.op === "release" ) return release(who, {onto: msg.onto ?? null});
  if ( msg.op === "struggle" ) return struggle(who);
}

/* ------------------------------------------------------------------ */
/*  Setup                                                              */
/* ------------------------------------------------------------------ */

export function setupHaul(d = {}) {
  deps = d;
  game.settings.register(MOD, "haul", {
    name: "Carrying the fallen and moving large things", hint: "Anyone next to a fallen character can carry or drag them, and anyone can push, pull or haul furniture, carts and stores on the map, by the lifting chart (VtDA20 p. 335). Carried and dragged bodies move with the carrier on the map; a bleeding body leaves a trail; furniture in a doorway blocks it.",
    scope: "world", config: true, type: Boolean, default: true
  });
  const on = () => setting("haul") !== false;
  Hooks.on("updateToken", (doc, changes, options, userId) => { if ( on() ) onMoved(doc, changes, options, userId).catch(e => console.error(`${MOD} | haul`, e)); });
  // A load that will not budge keeps its holder where they are (a Storyteller's move lets go instead)
  Hooks.on("preUpdateToken", (doc, changes, options) => {
    if ( !on() || options?.wodxHaul || game.user.isGM || !("x" in changes || "y" in changes) ) return;
    const b = burdenOf(doc);
    if ( b && !b.carried && b.budge === false ) { ui.notifications?.warn?.(`${doc.name}: it will not budge (${b.note}). Let go, or get help.`); return false; }
  });
  const watch = actor => { if ( on() && actor ) onActorChanged(actor).catch(e => console.error(`${MOD} | haul`, e)); };
  Hooks.on("createActiveEffect", e => { if ( e.parent?.documentName === "Actor" ) watch(e.parent); });
  Hooks.on("deleteActiveEffect", e => { if ( e.parent?.documentName === "Actor" ) watch(e.parent); });
  Hooks.on("updateActor", (actor, ch) => { if ( foundry.utils.hasProperty(ch, "system.health") || foundry.utils.hasProperty(ch, "flags.wodx-npc.where") ) watch(actor); });
  Hooks.on("deleteTile", tile => {
    if ( !isActiveGM() ) return;
    const bar = tile.flags?.[MOD]?.barricade;
    if ( bar ) tile.parent?.walls?.get?.(bar.wall)?.delete?.().catch?.(() => null);
    const rec = haulOf(tile);
    for ( const b of rec?.by ?? [] ) { const d = sync(b.t); if ( d ) d.update(unset(`flags.${MOD}.hauling`)).catch(() => null); }
  });
  Hooks.on("deleteToken", tok => {
    if ( !isActiveGM() ) return;
    const h = holdingOf(tok);
    if ( h ) { const t = sync(h.what); const by = (haulOf(t)?.by ?? []).filter(b => b.t !== tok.uuid); if ( t ) t.update(by.length ? {[`flags.${MOD}.haul.by`]: by} : unset(`flags.${MOD}.haul`)).catch(() => null); }
    const rec = haulOf(tok);
    for ( const b of rec?.by ?? [] ) { const d = sync(b.t); if ( d ) d.update(unset(`flags.${MOD}.hauling`)).catch(() => null); }
  });
  Hooks.on("renderChatMessageHTML", (msg, el) => {
    if ( !msg.flags?.[MOD]?.haulCard ) return;
    el.querySelectorAll?.("[data-wix-haul]").forEach(b => b.addEventListener("click", ev => {
      ev.preventDefault();
      const doc = sync(b.dataset.who);
      if ( !doc?.isOwner ) return;
      if ( b.dataset.wixHaul === "struggle" ) struggle(doc).catch(e => console.error(`${MOD} | haul`, e));
      b.closest(".vta-body")?.querySelectorAll?.("[data-wix-haul]").forEach(x => { x.disabled = true; });
    }));
  });
  Hooks.on("renderTokenHUD", (hud, html) => {
    if ( !on() ) return;
    const root = html instanceof HTMLElement ? html : html?.[0];
    const tok = hud.object, col = root?.querySelector(".col.right");
    if ( !tok?.actor || !col || !tok.document.isOwner ) return;
    const b = document.createElement("div");
    b.className = "control-icon wix-hud wix-haul-hud";
    const bd = burdenOf(tok.document);
    b.dataset.tooltip = bd ? (bd.carried ? `Carried by ${bd.by}` : bd.note) : "Carry or drag a fallen character, or push, pull or haul something heavy";
    b.innerHTML = `<i class="fa-solid fa-people-carry-box"></i>`;
    if ( bd ) b.classList.add("active");
    b.addEventListener("click", () => openHaul(tok).catch(e => console.error(`${MOD} |`, e)));
    col.appendChild(b);
  });
  Hooks.once("ready", () => game.socket?.on?.(SOCKET, msg => { if ( msg?.action === "haul" ) onSocket(msg).catch(e => console.error(`${MOD} | haul`, e)); }));
  return {rules: H, fallenOf, bodyWeight, thingOf, handsOf, strengthOf, loadOf, burdenOf, take, release, struggle, optionsFor, choose, open: openHaul, settleBarricade, onMoved};
}
