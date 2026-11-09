/**
 * WoDX Interactables 0.3.0: doors, locks, windows and walls that can be broken through, on core Foundry walls; containers and traps on tiles.
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
 * The settings for each wall live in flags.wodx-interactables, set in the WoDX part of the wall's config window; a
 * container's live in the same flags on its tile, set in the WoDX part of the tile's config window.
 * Plain doors need no setup: a locked door with no grade has a good lock, and the build follows the material.
 */
import * as R from "./interact-rules.mjs";
import {countSuccesses, clampDifficulty} from "../../wodx-actions/scripts/core-rules.js";
import {actionPool} from "../../wodx-actions/scripts/rules.js";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const MOD = "wodx-interactables";
const SEARCH = "_search";
const VERSION = "0.3.0";
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
  game.settings.register(MOD, "advanceClock", {
    name: "Long attempts move the clock", hint: "Outside combat, picking a lock for ten minutes moves the Chronicle clock on ten minutes.",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(MOD, "traps", {
    name: "Traps go off", hint: "An armed trap tile goes off when a character walks over it. Off: traps can still be found and disarmed, but never spring by themselves.",
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
  if ( !doc || !(f.container || f.trap) ) return null;
  return f.container ? R.describeContainer(f) : R.describeTrap(f);
}
const isTile = doc => doc?.documentName === "Tile" || (!!doc && !Array.isArray(doc.c) && "texture" in doc) || (!!doc && !Array.isArray(doc.c) && (doc.flags?.[MOD]?.container === true || doc.flags?.[MOD]?.trap === true));
/** Whatever interactable a wall or tile is. */
export const describeObj = doc => (isTile(doc) ? describeTile(doc) : describeWall(doc));
/** A wall or a tile on a scene, by id. */
const objectIn = (scene, id) => scene?.walls?.get?.(id) ?? scene?.tiles?.get?.(id) ?? null;
/** The tiles of a scene, as an array. */
const tilesOf = scene => scene?.tiles?.contents ?? [...(scene?.tiles?.values?.() ?? [])];
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
const noiseFrom = (doc, p) => (Array.isArray(doc?.c) ? R.besideWall(doc.c, R.sideOf(doc.c, p) ?? "a", 4) : nearOnTile(doc, p));

const LOCK_KEYS = ["larceny", "security", "legerdemain", "technology", "computer", "stealth", "alertness", "investigation", "athletics", "dodge"];
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
function eraNow() {
  try {
    const e = chron()?.eras;
    return {eraId: e?.activeEra?.()?.profile?.id ?? "", year: num(e?.currentYear?.())};
  } catch (e) { return {eraId: "", year: 0}; }
}

/** What WoDX reads from a character for the options. */
export function characterFor(actor, center, doc) {
  const {abilities, meta} = abilitiesOf(actor);
  const o = doc?.flags?.[MOD] ?? {};
  const key = String(o.keyName ?? "").trim().toLowerCase();
  return {
    actorId: actor?.id ?? "", kind: game.wodxActions?.getKind?.(actor) ?? "mortal", ...eraNow(),
    strength: attrOf(actor, "strength"), dexterity: attrOf(actor, "dexterity"), perception: attrOf(actor, "perception"), intelligence: attrOf(actor, "intelligence"), wits: attrOf(actor, "wits"),
    potence: powerDots(actor, "potence"), abilities, meta,
    side: center && Array.isArray(doc?.c) ? R.sideOf(doc.c, center) : null,
    hasKey: !!key && (actor?.items ?? []).some(i => String(i.name ?? "").toLowerCase().includes(key)),
    hasTools: (actor?.items ?? []).some(i => TOOLS.test(i.name ?? "")),
    powers: [...new Set((actor?.items ?? []).filter(i => i.type === "Power" && POWERS.test(i.name ?? "")).map(i => i.name.trim()))].slice(0, 6),
    woundPenalty: actor?.system?.conditions?.isignoringpain ? 0 : num(actor?.system?.health?.damage?.woundpenalty)
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
    if ( !game.user.isGM && (o.trap ? !o.found : doc.hidden) ) continue;
    const d = distanceToTile(doc, tok.center);
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
export async function openInteract(tok = pickToken(), {onlyWall = null} = {}) {
  if ( !tok?.actor ) { ui.notifications.warn("Select your token first."); return null; }
  let list = interactablesFor(tok);
  if ( onlyWall ) list = list.filter(x => x.doc.id === onlyWall);
  if ( !list.length && onlyWall ) {
    ui.notifications.info(`${tok.name} is too far from that door to reach it.`);
    return null;
  }
  const rows = list.map(({doc, o}) => {
    const ch = characterFor(tok.actor, tok.center, doc);
    const ops = R.optionsFor(o, ch);
    const bar = o.barred && o.barSide && Array.isArray(doc.c) ? ` (barred on the ${R.sideLabel(doc.c, o.barSide)} side)` : "";
    const opsHtml = ops.map(op => `<li class="wix-op${op.disabled ? " disabled" : ""}">`
      + (op.disabled ? `<b>${esc(op.label)}</b>` : `<button type="button" data-wall="${doc.id}" data-op="${op.id}">${esc(op.label)}</button>`)
      + `<div class="wodx-quiet">${esc(optionSummary(op))}</div></li>`).join("");
    return `<li data-search-text="${esc(R.nameOf(o))}"><h4>${esc(R.nameOf(o))}${esc(bar)}</h4><ul class="wix-ops" data-fixed>${opsHtml || `<li class="wodx-quiet">Nothing to do here.</li>`}</ul></li>`;
  }).join("");
  const search = onlyWall ? null : R.searchOption(characterFor(tok.actor, tok.center, null));
  const searchHtml = search ? `<div class="wix-search wix-op"><button type="button" data-wall="${SEARCH}" data-op="search">${esc(search.label)}</button><div class="wodx-quiet">${esc(optionSummary(search))}</div></div>` : "";
  const content = `<p class="wodx-quiet">${esc(tok.name)}: what is within reach, nearest first. The roll, the difficulty and the time each takes are shown before anything is rolled.</p>
    ${searchHtml}${list.length > 3 ? searchBox("ul.wix-list", "Search…", "Search what is within reach") : ""}${list.length ? `<ul class="wix-list">${rows}</ul>` : `<p class="wodx-quiet">Nothing else within reach.</p>`}`;
  let picked = null;
  await foundry.applications.api.DialogV2.wait({
    window: {title: `Interact: ${tok.name}`, resizable: true}, classes: ["wodx-dialog", "wix-dialog"], position: {width: 500, height: "auto"}, content,
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
  if ( !game.users.activeGM ) ui.notifications.warn("No Storyteller is connected: the card is posted, but nothing changes until one is.");
  const ask = {v: 1, scene: canvas.scene.id, wall: searching ? SEARCH : doc.id, token: tok.document.uuid, op: op.id, label: op.label, user: game.user.id};
  if ( !op.roll ) return postAsk(tok, ask, [], `${esc(tok.name)}: ${esc(op.label)}`, optionSummary(op));
  fd ??= await rollDialog(tok, op, ch);
  if ( !fd ) return null;
  // The pool, by WoDX Actions' rules: wounds, bonus dice, an untrained Skill, a Knowledge one can't use untrained
  const m = op.roll.ability ? ch.meta[op.roll.ability] ?? {} : {};
  const type = String(m.type ?? "").includes("knowledge") ? "knowledge" : String(m.type ?? "").includes("skill") ? "skill" : "talent";
  const built = actionPool({attribute: ch[op.roll.attr] ?? 0, attributeLabel: op.roll.attrLabel, ability: op.roll.ability ? (ch.abilities[op.roll.ability] ?? 0) : 0,
    abilityLabel: op.roll.abilityLabel, abilityKey: op.roll.ability, abilityType: type, bonusDice: num(fd.bonus),
    extraDiff: num(fd.extraDiff), baseDifficulty: op.roll.diff, woundPenalty: ch.woundPenalty, retries: 0});
  if ( built.blocked ) { ui.notifications.warn(built.blocked); return null; }
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
  for ( const ref of refs ) {
    let it = null;
    try { it = /^(Compendium|Item|Actor|Scene)\./.test(ref) ? await fromUuid(ref) : game.items?.getName?.(ref) ?? null; } catch (e) { it = null; }
    if ( !it || it.documentName && it.documentName !== "Item" ) { missing.push(ref); continue; }
    const o = typeof it.toObject === "function" ? it.toObject() : foundry.utils.deepClone(it);
    delete o._id;
    o.flags = {...(o.flags ?? {}), [MOD]: {...(o.flags?.[MOD] ?? {}), from: ref}};
    data.push(o); names.push(it.name);
  }
  const made = data.length ? await actor.createEmbeddedDocuments("Item", data) : [];
  return {ids: (made ?? []).map(d => d.id), names, missing};
}

const busy = new Set();
/** Active GM: work out and apply the result of a card. Returns the result, or null. */
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
    const out = R.resolve(o, op, rolls, {actorId: actor.id, ...eraNow()});
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
    // Taking what is inside a container: the items go to the character
    let given = [];
    if ( op.id === "take" && out.result === "done" ) {
      const got = await giveItems(actor, o.items);
      given = got.ids;
      lines.push(got.names.length ? `${actor.name} takes ${listWords(got.names)}.` : "There is nothing there that WoDX could hand over: the Storyteller says what was inside.");
      if ( got.missing.length ) lines.push(`Not found, so not handed over: ${got.missing.join(", ")}.`);
    }
    // A botch on forcing: one lethal level
    let hurt = 0;
    if ( out.hurt ) {
      try { await game.wodxCombat?.applyDamage?.(actor, "lethal", out.hurt); hurt = out.hurt; lines.push(`${actor.name} takes ${out.hurt} lethal.`); }
      catch (e) { lines.push(`${actor.name} takes ${out.hurt} lethal (apply it by hand).`); }
    }
    // Time, outside combat
    let advanced = 0;
    if ( out.seconds >= R.MINUTE && setting("advanceClock") && !game.combat?.started ) {
      await game.time.advance(out.seconds);
      advanced = out.seconds;
      lines.push(`The clock moves on ${timeWords(out.seconds)}.`);
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
    const done = {result: out.result, text: out.text, noise: out.noise, snap, hurt, advanced, worldTime: game.time.worldTime, waiting, lines, given,
      damageMsg: sprung?.damageMsg ?? null, undone: false};
    const verdict = waiting ? "Waiting for the Storyteller" : {done: "Done", progress: "Headway", fail: "No luck", botch: "Botch"}[out.result] ?? "";
    await msg.update({[`flags.${MOD}.ask.state`]: "done", [`flags.${MOD}.done`]: done, content: resultHtml(msg, done, verdict)});
    return done;
  } finally { busy.delete(msg.id); }
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
    const now = doc.flags?.[MOD] ?? {};
    for ( const k of Object.keys(now) ) if ( !(k in done.snap.flags) ) Object.assign(update, unsetKey(`flags.${MOD}.${k}`));
    for ( const [k, v] of Object.entries(done.snap.flags) ) update[`flags.${MOD}.${k}`] = v;
    await doc.update(update, isTile(doc) ? {} : {sound: false});
  }
  // Traps a search found go back to hidden
  for ( const f of done.found ?? [] ) {
    const t = game.scenes.get(ask.scene)?.tiles?.get?.(f.id);
    if ( t ) await t.update({hidden: f.hidden, [`flags.${MOD}.found`]: f.found});
  }
  const actor = (await fromUuid(ask.token))?.actor;
  if ( done.damageMsg ) await undoDamage(actor, done.damageMsg);
  // Items handed over from a container go back
  if ( done.given?.length && actor ) {
    const ids = done.given.filter(id => actor.items?.get?.(id));
    if ( ids.length ) { try { await actor.deleteEmbeddedDocuments("Item", ids); } catch (e) { /* by hand */ } }
  }
  if ( done.hurt && actor ) { try { await game.wodxCombat?.healDamage?.(actor, "lethal", done.hurt); } catch (e) { /* by hand */ } }
  // The clock goes back only if nothing else has moved it since
  if ( done.advanced && game.time.worldTime === done.worldTime ) await game.time.advance(-done.advanced);
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
/** The hidden traps a token could find by searching: within three squares, not behind a wall. */
export function searchableTraps(tokCenter, scene = canvas.scene) {
  const grid = scene?.grid?.size ?? canvas?.grid?.size ?? 100;
  const out = [];
  for ( const doc of tilesOf(scene) ) {
    const o = describeTile(doc);
    if ( !o?.trap || o.found ) continue;
    if ( distanceToTile(doc, tokCenter) > grid * SEARCH_SQUARES ) continue;
    if ( scene.id === canvas?.scene?.id && blocked("move", tokCenter, nearOnTile(doc, tokCenter)) ) continue;
    out.push({doc, o});
  }
  return out;
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
    lines.push(`${actor.name} finds a ${R.TRAPS[o.kind].label.toLowerCase()}.`);
  }
  if ( roll.successes > 0 && !roll.botch && !hit.length ) lines.push("Nothing hidden turns up.");
  const missed = near.filter(n => !finds.has(n.o));
  if ( missed.length ) await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(), content: cardHtml({title: `${esc(actor.name)} searches`,
    body: `<p>Missed, still hidden: ${esc(listWords(missed.map(n => R.nameOf(n.o))))}.</p>`})});
  let advanced = 0;
  if ( setting("advanceClock") && !game.combat?.started ) { await game.time.advance(op.seconds); advanced = op.seconds; lines.push(`The clock moves on ${timeWords(op.seconds)}.`); }
  const done = {result: out.result, text: out.text, noise: "silent", snap: null, hurt: 0, advanced, worldTime: game.time.worldTime, waiting: false, lines, given: [], found, undone: false};
  const verdict = hit.length ? "Found" : out.result === "botch" ? "Botch" : "Nothing found";
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
export async function onTokenMoved(tokDoc) {
  const scene = tokDoc.parent, actor = tokDoc.actor;
  const to = centerOf(tokDoc, scene), from = lastSeen.get(tokDoc.uuid) ?? to;
  lastSeen.set(tokDoc.uuid, to);
  if ( !actor || !scene || !isActiveGM() || setting("traps") === false ) return [];
  const cards = [];
  for ( const {doc, o} of trapsOnPath(scene, from, to, {npc: !actor.hasPlayerOwner}) ) {
    if ( springing.has(doc.id) ) continue;
    springing.add(doc.id);
    try { cards.push(await springCard(tokDoc, actor, doc, o)); } finally { springing.delete(doc.id); }
  }
  return cards;
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
    damageMsg: sp.damageMsg, undone: false};
  const ask = {v: 1, scene: scene.id, wall: doc.id, token: tokDoc.uuid, op: "spring", label: "A trap", user: game.user.id, state: "done"};
  const title = `${esc(actor.name)}: ${esc(R.TRAPS[o.kind].label)}`;
  const faces = sp.reflex?.faces ?? [];
  const dice = faces.length ? `<div class="vta-dice">${faces.map(f => `<span class="vta-die ${f === 1 ? "one" : f >= R.TRAP_GRADES[o.grade].diff ? "hit" : "miss"}">${f}</span>`).join("")}</div>` : "";
  const stub = {content: cardHtml({title, dice}), speaker: {alias: actor.name}};
  return ChatMessage.create({speaker: ChatMessage.getSpeaker({token: tokDoc}), content: resultHtml(stub, done, "A trap"), flags: {[MOD]: {ask, done}}});
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
    ${field("Inside", `<textarea name="${p}.items" rows="4" placeholder="One item a line: its UUID, or its name in the Items directory">${esc(f.items)}</textarea>`, "Taking them gives the character a copy of each. Leave it empty and say what is inside yourself.")}
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
  app.setPosition?.({height: "auto"});
}
function onPreUpdateTile(doc, changes) {
  const f = changes?.flags?.[MOD];
  if ( !f || typeof f !== "object" ) return;
  for ( const k of ["material", "lock", "keyName"] ) if ( f[k] === "" ) f[k] = null;
  if ( "items" in f ) f.items = R.parseItems(f.items).join("\n");
  // A lock set on a closed container locks it
  if ( f.lock && !f.ds && !doc.flags?.[MOD]?.ds ) f.ds = "locked";
  if ( "dice" in f && (f.dice === "" || f.dice === null) ) f.dice = null;
  if ( f.damageType === "" ) f.damageType = null;
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
  game.keybindings?.register?.(MOD, "interact", {
    name: "Interact", hint: "The Interact window for the selected token: doors, windows and walls within reach.",
    editable: [{key: "KeyI"}], onDown: () => { openInteract().catch(e => console.error(`${MOD} |`, e)); return true; }
  });
  if ( !installDoorClick() ) console.warn(`${MOD} | the door-click shortcut is off: this Foundry has no door control class to extend.`);
  game.modules.get(MOD).api = {version: VERSION, rules: R, describeWall, describeTile, describeObj, tileConfigHtml, searchableTraps, springOn, trapsOnPath, onTokenMoved, characterFor, interactablesFor, openInteract, attempt, applyAsk, undoCard, hearersOf, optionSummary, configHtml};
});
Hooks.once("ready", () => {
  if ( chron()?.registerApprovalHandler ) registerBreach(); else Hooks.once("wodxChronicleReady", registerBreach);
  ensureStyles();
});
Hooks.on("createChatMessage", msg => { if ( msg.flags?.[MOD]?.ask && isActiveGM() ) applyAsk(msg).catch(e => console.error(`${MOD} |`, e)); });
Hooks.on("renderChatMessageHTML", (msg, el) => {
  if ( !msg.flags?.[MOD]?.done ) return;
  el.querySelectorAll?.("button.wix-undo").forEach(b => {
    if ( !game.user.isGM ) { b.remove(); return; }
    b.addEventListener("click", ev => { ev.preventDefault(); b.disabled = true; undoCard(msg).catch(e => console.error(`${MOD} |`, e)).finally(() => { b.disabled = false; }); });
  });
});
Hooks.on("updateToken", (doc, changes) => { if ( ("x" in (changes ?? {}) || "y" in (changes ?? {})) && isActiveGM() ) onTokenMoved(doc).catch(e => console.error(`${MOD} |`, e)); });
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
  b.dataset.tooltip = "Interact: doors, windows, walls, containers and traps within reach, and searching";
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
