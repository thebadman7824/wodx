/**
 * WoDX Targeting (the version is in module.json): picks a likely target for a power or an attack.
 *
 * When an action window opens and the user has not targeted anyone by hand, WoDX reads the power's tag (an intent
 * and a range band, data/tags.json) and ranks the tokens on the scene (target-rules.mjs):
 *   hostile  foes by disposition in range: whoever attacked the character last, then whoever is engaged, then the nearest
 *   helpful  allies in range, nearest first; healing ranks by wounds
 *   self     the character
 *   area     everyone in range, allies unticked, for the user to confirm
 *   either   the last target, then the nearest foe
 * Modes (world setting): Off; Suggest (default), where the window names its choice and the next few and the user
 * may switch; Automatic, for the Storyteller only, where the target is set as the window opens. A target set by hand
 * is never replaced. Only tokens the user can see are candidates.
 */
import * as T from "./target-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const MOD = "wodx-targeting";
const VERSION = "0.1.1";
const num = v => Number(v) || 0;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const C = () => game.wodxCombat;
const chron = () => game.modules.get("wodx-chronicle")?.api;

let TABLE = {};
/** The ids the picker set last; a target set any other way counts as set by hand. */
let lastSet = [];
let setting = false;
let lastTargetId = null;

/* ------------------------------------------------------------------ */
/*  Settings                                                           */
/* ------------------------------------------------------------------ */

function registerSettings() {
  game.settings.register(MOD, "mode", {
    name: "Targeting", scope: "world", config: true, type: String, default: "suggest",
    hint: "Suggest: an action window names a likely target and the next few, and the player may switch. Automatic (the Storyteller only; players keep Suggest): the target is set as the window opens. A target set by hand is always kept.",
    choices: {off: "Off", suggest: "Suggest", auto: "Automatic (Storyteller only)"}
  });
  game.settings.register(MOD, "mine", {
    name: "Targeting for me", scope: "client", config: true, type: String, default: "world",
    hint: "Turn target suggestions off on this computer only.",
    choices: {world: "As the Storyteller set it", off: "Off"}
  });
}
function mode() {
  try {
    if ( game.settings.get(MOD, "mine") === "off" ) return "off";
    return T.modeFor(game.settings.get(MOD, "mode"), {isGM: game.user.isGM});
  } catch (e) { return "off"; }
}

/* ------------------------------------------------------------------ */
/*  The scene as the picker sees it                                    */
/* ------------------------------------------------------------------ */

const unitsYards = d => (C()?.auto?.toYards ? C().auto.toYards(d, canvas.scene?.grid?.units ?? "ft") : d / 3);
function measure(a, b) {
  try { return canvas.grid.measurePath([a.center, b.center]).distance; } catch (e) { return null; }
}
function reachOf(a, b, d) {
  if ( d === null ) return null;
  const unit = canvas.scene?.grid?.distance ?? 5;
  const AU = C()?.auto;
  if ( !AU?.reachDistance ) return d <= unit * 1.5;
  const r = AU.reachDistance(d, num(a.document?.width) || 1, num(b.document?.width) || 1, unit);
  return AU.inReach(r, unit);
}
function lineOfSight(a, b) {
  try {
    const backend = CONFIG.Canvas.polygonBackends?.sight;
    if ( !backend?.testCollision ) return null;
    return !backend.testCollision(a.center, b.center, {type: "sight", mode: "any"});
  } catch (e) { return null; }
}
const unseenStatus = tok => !!tok.actor?.statuses?.has?.("invisible") || !!tok.actor?.statuses?.has?.("wodx-obfuscated")
  || !!chron()?.conditions?.hasCondition?.(tok.actor, "obfuscated");
/** May this user pick the token? Hidden by the Storyteller, invisible or Obfuscated: never, unless they own it. */
function canSee(tok) {
  if ( tok.document.hidden ) return false;
  if ( tok.actor?.isOwner && !game.user.isGM ) return true;
  if ( unseenStatus(tok) ) return false;
  return game.user.isGM ? true : tok.visible !== false;
}
function woundsOf(actor) {
  const ct = C()?.corpusTrack?.(actor);
  const d = ct?.damage ?? actor?.system?.health?.damage ?? {};
  return num(d.bashing) + num(d.lethal) + num(d.aggravated);
}
const cards = () => (game.messages?.contents ?? []).slice(-300).map(m => m.getFlag?.("wodx-combat", "data")).filter(Boolean);

/** The token acting for this actor: the one controlled, else its first on the scene. */
export function tokenOf(actor) {
  const ctl = canvas.tokens?.controlled ?? [];
  return ctl.find(t => t.actor === actor || t.actor?.id === actor?.id) ?? actor?.getActiveTokens?.(true)?.[0] ?? null;
}

/** The state target-rules.rank() reads. */
export function stateFor(actor, me = tokenOf(actor)) {
  const all = canvas.tokens?.placeables ?? [];
  const hits = T.lastHits(cards());
  const hitMe = hits.get(actor?.uuid) ?? new Map();
  const myDisp = me?.document?.disposition ?? (actor?.hasPlayerOwner ? T.DISP.FRIENDLY : T.DISP.HOSTILE);
  const tokens = all.filter(t => t.actor && t !== me && t.id !== me?.id).map(t => {
    const hurt = hitMe.has(t.actor.uuid) || (hits.get(t.actor.uuid)?.has(actor?.uuid) ?? false);
    const raw = me ? measure(me, t) : null;
    return {id: t.id, name: t.name, disposition: t.document.disposition, side: T.sideOf(myDisp, t.document.disposition, hurt),
      visible: canSee(t), distance: raw === null ? null : unitsYards(raw), reach: me ? reachOf(me, t, raw) : null, los: me ? lineOfSight(me, t) : null,
      wounds: woundsOf(t.actor), lastHitMe: hitMe.get(t.actor.uuid) ?? null};
  });
  return {self: me ? {id: me.id, name: me.name, wounds: woundsOf(actor)} : (actor ? {id: null, name: actor.name, wounds: woundsOf(actor)} : null),
    tokens, lastTargetId};
}

/* ------------------------------------------------------------------ */
/*  Tags                                                               */
/* ------------------------------------------------------------------ */

/** A power's tag: lib is one of disc, w20, gw, gift, evo, edge, horror; or none, for a sheet's own item. */
export function tagFor(lib, id, power = {}) { return T.tagFor(TABLE, lib, id, power); }

/* ------------------------------------------------------------------ */
/*  Setting targets                                                    */
/* ------------------------------------------------------------------ */

const currentIds = () => [...(game.user.targets ?? [])].map(t => t.id);
export const handSet = () => T.handSet(currentIds(), lastSet);
export function setTargets(ids) {
  setting = true;
  try {
    if ( canvas.tokens?.setTargets ) canvas.tokens.setTargets(ids, {mode: "replace"});
    else {
      for ( const t of [...(game.user.targets ?? [])] ) t.setTarget(false, {releaseOthers: false});
      ids.forEach((id, k) => canvas.tokens.get(id)?.setTarget(true, {releaseOthers: k === 0}));
    }
    lastSet = [...ids];
  } finally { setting = false; }
}

/* ------------------------------------------------------------------ */
/*  The panel in an action window                                      */
/* ------------------------------------------------------------------ */

const SIDE = {foe: "foe", friend: "ally", neutral: "neutral", self: "the character"};
const intentOptions = sel => Object.entries(T.INTENTS).map(([k, v]) => `<option value="${k}"${k === sel ? " selected" : ""}>${esc(v.label)}</option>`).join("");

/**
 * Put the target panel at the top of an action window's form.
 *   actor      who acts
 *   tag()      the tag for what the window has chosen now ({i, r} or "h.s"), or null for none
 *   onPick(a)  the window's own target changes to actor a (or null)
 *   cast       {intent: "h"} or {from: root => "h"}: a casting window with no power list; the panel asks what it
 *              is aimed at, its default read from what the casting uses until the user picks
 * Returns {chosen()} or null when the panel is off.
 */
export function attach(root, {actor, tag = () => null, onPick = () => {}, cast = null} = {}) {
  const m = mode();
  const form = root?.querySelector?.("form") ?? root;
  if ( m === "off" || !form || !actor || !canvas?.ready ) return null;
  const box = document.createElement("div");
  box.className = "wodx-aim";
  box.setAttribute("role", "group");
  box.setAttribute("aria-label", "Target");
  form.prepend(box);
  let chosen = null, area = [], intent = cast?.intent ?? null, lastKey = "", userIntent = false;
  const castDefault = () => { if ( cast?.from && !userIntent ) { try { intent = cast.from(root) || intent || "e"; } catch (e) { intent ??= "e"; } } };

  const pickActor = id => canvas.tokens.get(id)?.actor ?? null;
  const choose = (entry, {apply = m === "auto"} = {}) => {
    chosen = entry;
    if ( apply && entry && !entry.self && entry.id ) setTargets([entry.id]);
    onPick(entry && !entry.self && entry.id ? pickActor(entry.id) : null);
  };
  const currentTag = () => {
    if ( cast ) return T.parseTag(`${intent ?? "e"}.${intent === "s" ? "t" : "s"}`);
    const t = tag();
    return typeof t === "string" ? T.parseTag(t) : t;
  };

  function draw() {
    castDefault();
    const t = currentTag();
    const key = t ? `${t.i}.${t.r}` : "none";
    const castRow = cast ? `<div class="wodx-aim-cast"><label>Aimed at <select class="wodx-aim-intent" data-fixed aria-label="Aimed at">${intentOptions(intent)}</select></label></div>` : "";
    if ( handSet() ) {
      const names = [...game.user.targets].map(x => x.name);
      box.innerHTML = `${castRow}<div class="wodx-aim-line"><i class="fa-solid fa-crosshairs" aria-hidden="true"></i> Target: <b>${esc(names.join(", "))}</b> <small>(set by hand)</small></div>`;
      chosen = null;
      lastKey = key;
      return;
    }
    if ( !t ) { box.innerHTML = castRow; box.hidden = !castRow; return; }
    box.hidden = false;
    const r = T.rank(t, stateFor(actor));
    const head = `<small class="wodx-aim-tag">${esc(T.INTENTS[t.i].label)}, ${esc(T.RANGES[t.r].label)}</small>`;
    if ( t.intent === "area" ) {
      area = r.area.map(a => ({...a}));
      const list = area.length ? `${area.length > 5 ? searchBox("ul.wodx-aim-area", "Search…", "Search the area") : ""}<ul class="wodx-aim-area">${area.map((a, k) =>
        `<li><label><input type="checkbox" data-k="${k}"${a.tick ? " checked" : ""}> ${esc(a.name)} <small>(${esc(SIDE[a.side] ?? a.side)}${a.distance !== null ? `, ${Math.round(a.distance)} yd` : ""})</small></label></li>`).join("")}</ul>
        <button type="button" class="wodx-aim-area-go"><i class="fa-solid fa-crosshairs" aria-hidden="true"></i> Target these</button>` : "";
      box.innerHTML = `${castRow}<div class="wodx-aim-line"><i class="fa-solid fa-burst" aria-hidden="true"></i> In the area: <b>${esc(r.why)}</b> ${head}</div>${list}`;
      chosen = null;
      lastKey = key;
      return;
    }
    // A new power: the picker's own choice comes back; a choice the user made stays while the tag is the same
    if ( key !== lastKey || !chosen ) choose(r.pick);
    lastKey = key;
    const cand = [r.pick, ...r.others].filter(Boolean);
    const alts = cand.filter(c => c.id !== chosen?.id);
    const who = chosen ? `<b>${esc(chosen.name)}</b> <small>(${esc(chosen.why)})</small>` : `<b>none</b> <small>(${esc(r.why ?? "no one in range")})</small>`;
    const warn = chosen && !chosen.self && r.warn === "neutral" && chosen.id === r.pick?.id
      ? `<div class="wodx-aim-warn">A neutral token: check it should be treated as a foe.</div>` : "";
    box.innerHTML = `${castRow}<div class="wodx-aim-line"><i class="fa-solid fa-crosshairs" aria-hidden="true"></i> ${m === "auto" ? "Targeted" : "Suggested"}: ${who} ${head}</div>
      <div class="wodx-aim-alts">${alts.length ? "<span>Or:</span> " : ""}${alts.map(c => `<button type="button" data-aim="${esc(c.id ?? "self")}" title="${esc(c.why)}">${esc(c.name)}</button>`).join("")}${chosen && !chosen.self ? `<button type="button" data-aim="" title="No target">No target</button>` : ""}</div>${warn}`;
    box._cand = cand;
  }

  box.addEventListener("click", ev => {
    const b = ev.target.closest("button");
    if ( !b ) return;
    ev.preventDefault();
    if ( b.classList.contains("wodx-aim-area-go") ) {
      const ids = [...box.querySelectorAll("input[type=checkbox][data-k]")].filter(i => i.checked).map(i => area[num(i.dataset.k)]?.id).filter(Boolean);
      setTargets(ids);
      onPick(ids.length ? pickActor(ids[0]) : null);
      draw();
      return;
    }
    if ( !("aim" in b.dataset) ) return;
    const id = b.dataset.aim;
    const entry = id === "" ? null : (box._cand ?? []).find(c => String(c.id ?? "self") === id) ?? null;
    choose(entry);
    if ( m === "auto" && !entry ) { setTargets([]); }
    draw();
  });
  box.addEventListener("change", ev => {
    if ( ev.target.classList?.contains("wodx-aim-intent") ) { intent = ev.target.value; userIntent = true; chosen = null; draw(); }
    ev.stopPropagation();
  });
  // The window's own choices (another power, another Art) change the tag
  form.addEventListener("change", ev => { if ( !box.contains(ev.target) ) draw(); });
  // On use, the suggestion becomes the user's target, so the chat card and later actions agree
  const commit = () => {
    if ( m !== "suggest" || handSet() || !chosen || chosen.self || !chosen.id ) return;
    if ( currentIds().length === 1 && currentIds()[0] === chosen.id ) return;
    setTargets([chosen.id]);
    if ( !game.user.isGM && canvas.tokens.get(chosen.id)?.document?.disposition === T.DISP.NEUTRAL ) {
      ChatMessage.create({content: `<p>${esc(game.user.name)} aimed ${esc(actor.name)}'s action at ${esc(chosen.name)}, a neutral token.</p>`,
        whisper: game.users.filter(u => u.isGM).map(u => u.id), speaker: {alias: "WoDX Targeting"}});
    }
  };
  const app = root.closest?.(".application, .app, dialog") ?? root;
  app.querySelectorAll?.("button[data-action=ok], button[data-action=attack], button[data-button=ok]").forEach(b => b.addEventListener("click", commit, true));
  form.addEventListener("submit", commit, true);
  draw();
  return {chosen: () => chosen, redraw: draw};
}

/**
 * Before an attack window opens: the target to use when none is set. Suggest and Automatic both open the attack on
 * the picker's choice (the window's panel can switch it); Automatic also sets it as the user's target.
 */
export function preAttack(attacker, {ranged = null} = {}) {
  const m = mode();
  if ( m === "off" || !attacker || !canvas?.ready || handSet() ) return null;
  const r = T.rank({i: "h", r: ranged === false ? "r" : "s", intent: "hostile", range: ranged === false ? "reach" : "sight"}, stateFor(attacker));
  if ( !r.pick?.id ) return null;
  if ( m === "auto" ) setTargets([r.pick.id]);
  return {token: canvas.tokens.get(r.pick.id) ?? null, pick: r.pick, others: r.others, mode: m};
}

/**
 * The panel in the attack window, when preAttack chose the target. reopen(token or null) opens the attack again
 * on another target (null: none).
 */
export function attackPanel(root, pre, reopen) {
  const form = root?.querySelector?.("form") ?? root;
  if ( !pre?.token || !form ) return;
  const box = document.createElement("div");
  box.className = "wodx-aim";
  box.setAttribute("role", "group");
  box.setAttribute("aria-label", "Target");
  box.innerHTML = `<div class="wodx-aim-line"><i class="fa-solid fa-crosshairs" aria-hidden="true"></i> ${pre.mode === "auto" ? "Targeted" : "Suggested"}: <b>${esc(pre.pick.name)}</b> <small>(${esc(pre.pick.why)})</small></div>
    <div class="wodx-aim-alts">${pre.others.length ? "<span>Or:</span> " : ""}${pre.others.map(c => `<button type="button" data-aim="${esc(c.id)}" title="${esc(c.why)}">${esc(c.name)}</button>`).join("")}<button type="button" data-aim="" title="No target">No target</button></div>`;
  form.prepend(box);
  box.addEventListener("click", ev => {
    const b = ev.target.closest("button[data-aim]");
    if ( !b ) return;
    ev.preventDefault();
    const tok = b.dataset.aim ? canvas.tokens.get(b.dataset.aim) : null;
    if ( pre.mode === "auto" ) setTargets(tok ? [tok.id] : []);
    reopen(tok);
  });
  const commit = () => { if ( pre.mode === "suggest" && !handSet() ) setTargets([pre.token.id]); };
  const app = root.closest?.(".application, .app, dialog") ?? root;
  app.querySelectorAll?.("button[data-action=attack]").forEach(b => b.addEventListener("click", commit, true));
  form.addEventListener("submit", commit, true);
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

Hooks.once("init", () => {
  registerSettings();
  game.modules.get(MOD).api = {version: VERSION, rules: T, attach, preAttack, attackPanel, tagFor, stateFor, tokenOf, setTargets, handSet, mode,
    rank: (actor, tag) => T.rank(tag, stateFor(actor)), get table() { return TABLE; }};
});
Hooks.once("ready", async () => {
  try {
    const r = await fetch(`modules/${MOD}/data/tags.json?v=${VERSION}`);
    TABLE = r.ok ? await r.json() : {};
  } catch (e) { console.warn(`${MOD} | the power tags did not load: every power falls back to a guess`, e); }
  ensureStyles();
});
Hooks.on("targetToken", (user, tok, on) => {
  if ( user?.id !== game.user?.id ) return;
  if ( on ) lastTargetId = tok.id;
  if ( !setting ) lastSet = [];
});

function ensureStyles() {
  const href = `modules/${MOD}/styles/wodx-targeting.css`;
  if ( [...document.styleSheets].some(s => s.href?.includes(href)) || document.querySelector(`link[href*="${href}"]`) ) return;
  const l = document.createElement("link");
  l.rel = "stylesheet"; l.href = `${href}?v=${VERSION}`;
  document.head.appendChild(l);
}
