/**
 * WoDX Senses 0.4.0: the screen in frenzy and Rötschreck, the character's state on screen, scent trails for a wolf's nose, and hidden tokens that
 * show only to whoever found them. The rules are in perception-rules.mjs; main.mjs passes its helpers in build().
 */
import * as P from "./perception-rules.mjs";
import * as Q from "./quiet-rules.mjs";
import {quietOn} from "./quiet.mjs";
import {resource, detectProfile} from "../../wodx-actions/scripts/profiles.js";

const MOD = "wodx-senses";
const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return null; } };

export function registerPerceptionSettings() {
  game.settings.register(MOD, "screen", {
    name: "Frenzy and Rötschreck on my screen", hint: "A red edge round the screen while my character is in frenzy, and the colour drained from the map in Rötschreck.",
    scope: "client", config: true, type: Boolean, default: true, onChange: () => refreshScreen()
  });
  game.settings.register(MOD, "state", {
    name: "My character's state on my screen", hint: "A quiet edge round the screen and a few words at the top for wounds, the hunger line, high Rage, the Shadow pressing, Paradox, Banality or no Willpower left.",
    scope: "client", config: true, type: Boolean, default: true, onChange: () => refreshScreen()
  });
  game.settings.register(MOD, "trails", {
    name: "Scent trails for a wolf's nose", hint: "While my character is in Crinos, Hispo or Lupus, faint trails show where others walked in the last hour, as far as smell reaches.",
    scope: "client", config: true, type: Boolean, default: true, onChange: () => drawTrails()
  });
  game.settings.register(MOD, "unseen", {
    name: "The unseen show only to those who find them", hint: "A character hidden by Obfuscate, sneaking or the Invisible status, with no player of its own, shows only to the players whose characters found it. The Storyteller rolls for them from the token's HUD (Who sees through it?).",
    scope: "world", config: true, type: Boolean, default: true, onChange: () => refreshVisibility()
  });
}

let H = null; // helpers from main.mjs

/* ------------------------------------------------------------------ */
/*  The screen                                                         */
/* ------------------------------------------------------------------ */

/** The character this player is playing now: the token they control, else their assigned character. */
function myCharacter() {
  const tok = (canvas?.tokens?.controlled ?? []).find(t => t.actor?.isOwner);
  return tok?.actor ?? game.user?.character ?? null;
}
const inFrenzy = a => !!a?.system?.conditions?.isfrenzy || !!a?.statuses?.has?.("wodx-frenzy");
const inRotschreck = a => !!a?.statuses?.has?.("wodx-rotschreck");

/** What the sheet says the character feels, for stateEdges(). */
export function stateOf(a) {
  if ( !a ) return {};
  const n = v => Number(v) || 0;
  let prof = "mortal";
  try { prof = detectProfile(a); } catch (e) { prof = "mortal"; }
  const r = id => { try { return resource(a, id); } catch (e) { return {value: 0, max: 0, perm: 0, ok: false}; } };
  const dmg = a.system?.health?.damage ?? {}, wp = r("willpower"), rage = r("rage");
  return {kindred: prof === "kindred", garou: prof === "lupine", wraith: prof === "wraith", mage: prof === "mage", changeling: prof === "fae",
    blood: r("blood").value, selfcontrol: n(a.system?.advantages?.virtues?.selfcontrol?.permanent),
    woundPenalty: n(dmg.woundpenalty), incapacitated: /incap/i.test(String(dmg.woundlevel ?? "")),
    rage: rage.value, ragePerm: rage.perm || rage.max, angst: r("angst").value, paradox: r("paradox").value, banality: r("banality").value,
    willpower: wp.value, willpowerPerm: wp.perm || n(a.system?.advantages?.willpower?.permanent)};
}

export function refreshScreen() {
  const a = myCharacter();
  const which = setting("screen") === false ? null : P.screenFor({frenzy: inFrenzy(a), rotschreck: inRotschreck(a)});
  const edges = setting("state") === false ? [] : P.stateEdges(stateOf(a));
  // The quiet interface always names the health level, unless a wound already shows
  if ( a && quietOn() && !edges.some(e => /^(wound|incap)/.test(e.id)) ) {
    const lvl = a.system?.health?.damage?.woundlevel;
    edges.push({id: "health", words: Q.healthWord(lvl ? game.i18n.localize(lvl) : "")});
  }
  let el = document.getElementById("wodx-senses-screen"), words = document.getElementById("wodx-senses-state");
  document.body.classList.toggle("wsn-drained", which === "rotschreck");
  if ( !which && !edges.length ) { el?.remove(); words?.remove(); return null; }
  if ( !el ) {
    el = document.createElement("div");
    el.id = "wodx-senses-screen";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
  }
  el.className = which ? `wsn-screen wsn-${which}` : `wsn-screen wsn-state-${edges[0].id}`;
  if ( !which && edges.every(e => e.id === "health") ) el.className = "wsn-screen";
  if ( edges.length ) {
    if ( !words ) {
      words = document.createElement("div");
      words.id = "wodx-senses-state";
      document.body.appendChild(words);
    }
    words.textContent = edges.map(e => e.words).join(" · ");
  } else words?.remove();
  return which ?? edges[0].id;
}

/* ------------------------------------------------------------------ */
/*  Scent trails                                                       */
/* ------------------------------------------------------------------ */

const trails = {}; // token id -> [{x, y, at}], on the scene in view
let trailScene = null, layer = null, pending = null;

function centreOf(doc, changes = {}) {
  const g = doc.parent?.grid?.size ?? canvas?.grid?.size ?? 100;
  const x = Number(changes.x ?? doc.x), y = Number(changes.y ?? doc.y);
  return {x: x + (Number(doc.width) || 1) * g / 2, y: y + (Number(doc.height) || 1) * g / 2};
}
function record(doc, changes) {
  if ( !doc?.parent || doc.parent.id !== canvas?.scene?.id ) return;
  if ( !("x" in (changes ?? {})) && !("y" in (changes ?? {})) ) return;
  if ( doc.flags?.["wodx-npc"]?.passerby ) return; // passers-by leave no trail (WoDX NPC 0.26.0)
  if ( trailScene !== doc.parent.id ) { for ( const k of Object.keys(trails) ) delete trails[k]; trailScene = doc.parent.id; }
  const now = game.time.worldTime;
  trails[doc.id] = P.addStep(trails[doc.id] ?? [], {...centreOf(doc, changes), at: now}, {now});
}
/** The controlled token with a wolf's nose, if any. */
function sniffer() {
  const tok = (canvas?.tokens?.controlled ?? []).find(t => t.actor?.isOwner && ["crinos", "hispo", "lupus"].includes(H?.formOf?.(t.actor)));
  return tok ?? null;
}
export function trailSteps() {
  const me = sniffer();
  if ( !me || setting("trails") === false ) return [];
  const g = canvas.grid?.size ?? 100, dist = Number(canvas.scene?.grid?.distance) || 5, units = canvas.scene?.grid?.units ?? "ft";
  const pxPerYard = /m|meter|metre|yd|yard/i.test(units) ? g / dist : g / (dist / 3);
  const skip = [me.id, ...(canvas.tokens?.placeables ?? []).filter(t => (t.document.hidden && !game.user.isGM) || (concealedFromMe(t) && !seenByMe(t))).map(t => t.id)];
  return P.stepsInReach(trails, me.center, {now: game.time.worldTime, pxPerYard, reachYards: P.smellYards(1), skip});
}
export function drawTrails() {
  if ( pending ) return;
  pending = setTimeout(() => {
    pending = null;
    try {
      if ( !canvas?.ready ) return;
      const parent = canvas.interface ?? canvas.stage;
      if ( !layer || layer.destroyed || layer.parent !== parent ) { layer = new PIXI.Graphics(); layer.eventMode = "none"; layer.zIndex = 50; parent.addChild(layer); }
      layer.clear();
      const r = Math.max(3, (canvas.grid?.size ?? 100) / 14);
      for ( const s of trailSteps() ) { layer.beginFill(0xb89b5e, 0.55 * s.alpha); layer.drawCircle(s.x, s.y, r); layer.endFill(); }
    } catch (e) { console.warn(`${MOD} | trails`, e); }
  }, 150);
}

/* ------------------------------------------------------------------ */
/*  The unseen                                                         */
/* ------------------------------------------------------------------ */

const INVISIBLE = () => CONFIG.specialStatusEffects?.INVISIBLE ?? "invisible";
/** Is this token hidden from sight by its state, and so shown only to those who find it? Player characters never are. */
export function concealed(t) {
  const a = t?.actor;
  if ( !a || a.hasPlayerOwner ) return false;
  const st = a.statuses ?? new Set();
  return st.has(INVISIBLE()) || st.has("wodx-obfuscated") || st.has("wodx-sneaking") || !!t.document?.flags?.["wodx-npc"]?.sneaking;
}
const myActorIds = () => (game.actors?.contents ?? []).filter(a => a.isOwner && a.hasPlayerOwner).map(a => a.id);
const seenBy = t => t?.document?.flags?.[MOD]?.seenBy ?? [];
const concealedFromMe = t => setting("unseen") !== false && !game.user.isGM && concealed(t);
const seenByMe = t => P.showsTo({gmHidden: !!t.document?.hidden, concealed: true, seenBy: seenBy(t), owner: !!t.isOwner}, myActorIds());

/** Wrap the token's isVisible so the unseen stay unseen, and show to whoever found them where light and walls allow. */
export function installVisibility() {
  const T = globalThis.foundry?.canvas?.placeables?.Token ?? globalThis.CONFIG?.Token?.objectClass;
  let proto = T?.prototype, d = null;
  while ( proto && !(d = Object.getOwnPropertyDescriptor(proto, "isVisible")) ) proto = Object.getPrototypeOf(proto);
  if ( !d?.get ) { console.warn(`${MOD} | Token.isVisible not found: the unseen show as Foundry decides`); return false; }
  const base = d.get;
  Object.defineProperty(T.prototype, "isVisible", {configurable: true, get() {
    const v = base.call(this);
    try {
      if ( !concealedFromMe(this) || this.isOwner ) return v;
      if ( !seenByMe(this) ) return false;
      if ( this.document.hidden ) return v;
      if ( !canvas.visibility?.tokenVision ) return true;
      // Found: shown wherever light and walls let this player see the spot, Invisible or not
      return canvas.visibility.testVisibility(this.center, {tolerance: Math.min(this.w, this.h) / 4, object: null});
    } catch (e) { return v; }
  }});
  return true;
}
export function refreshVisibility() {
  for ( const t of canvas?.tokens?.placeables ?? [] ) t.renderFlags?.set?.({refreshVisibility: true});
  try { canvas.perception?.update?.({refreshVision: true}); } catch (e) { /* older canvas */ }
  drawTrails();
}

/** The Storyteller: roll for each player character on the scene to find a hidden token (WoDX NPC's notice()). */
export async function whoSees(token) {
  if ( !game.user.isGM || !token?.actor ) return null;
  let RR = null;
  try { RR = await import("../../wodx-npc/scripts/routine-rules.mjs"); } catch (e) { RR = null; }
  if ( !RR?.notice ) { ui.notifications.warn("WoDX Senses needs WoDX NPC's noticing rules for this."); return null; }
  const scene = token.document.parent;
  const t = token.actor;
  const intruder = {dexterity: H.attrOf(t, "dexterity"), stealth: H.abilityOf(t, "stealth"), manipulation: H.attrOf(t, "manipulation"), subterfuge: H.abilityOf(t, "subterfuge"),
    sneaking: !!t.statuses?.has?.("wodx-sneaking") || !!token.document.flags?.["wodx-npc"]?.sneaking || t.statuses?.has?.(INVISIBLE()),
    obfuscate: t.statuses?.has?.("wodx-obfuscated") ? Math.max(1, H.powerDots(t, /^obfuscate$/i)) : 0};
  const book = (() => { try { return ["dark-ages", "long-night"].includes(game.modules.get("wodx-chronicle")?.api?.eras?.activeEra?.()?.profile?.id) ? "v20da" : "v20"; } catch (e) { return "v20da"; } })();
  const watchers = (canvas.tokens?.placeables ?? []).filter(w => w.actor?.hasPlayerOwner && w.id !== token.id && !w.document.hidden);
  const results = watchers.map(w => {
    const a = w.actor;
    const blocked = H.sightBlocked(w.center, token.center, scene);
    const res = RR.notice({perception: H.attrOf(a, "perception"), alertness: H.abilityOf(a, "alertness"), awareness: H.abilityOf(a, "awareness"),
      auspex: H.powerDots(a, /^(auspex|aura perception)$/i), awake: true, inSight: !blocked}, intruder, {book});
    return {name: w.name, actorId: a.id, noticed: !!res.noticed, why: res.why};
  });
  const before = seenBy(token);
  const after = P.seenAfter(before, results);
  await token.document.update({[`flags.${MOD}.seenBy`]: after});
  const lines = results.map(r => `<li><b>${H.esc(r.name)}</b>: ${r.noticed ? "finds them" : "does not"} (${H.esc(r.why)})</li>`).join("") || "<li>No player character on the scene.</li>";
  await ChatMessage.create({whisper: H.gmIds(), speaker: {alias: "Senses"},
    content: `<div class="vta-card wsn"><h3>Who sees ${H.esc(token.name)}?</h3><ul>${lines}</ul><p class="wodx-quiet">Only those who found them see the token. Clear the list from the token's HUD.</p></div>`});
  for ( const r of results.filter(x => x.noticed && !before.includes(x.actorId)) ) {
    const users = game.users.filter(u => !u.isGM && game.actors.get(r.actorId)?.testUserPermission?.(u, "OWNER")).map(u => u.id);
    if ( users.length ) await ChatMessage.create({whisper: users, speaker: {alias: "Senses"}, content: `<div class="vta-card wsn"><p>${H.esc(r.name)} notices someone who was trying not to be seen.</p></div>`});
  }
  return {results, seenBy: after};
}
export async function forget(token) {
  if ( !game.user.isGM || !token ) return null;
  return token.document.update({[`flags.${MOD}.seenBy`]: []});
}

function onTokenHUD(hud, html) {
  if ( !game.user.isGM || setting("unseen") === false ) return;
  const token = hud.object;
  if ( !concealed(token) ) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  const col = root?.querySelector?.(".col.right") ?? root;
  if ( !col || col.querySelector(".wsn-who") ) return;
  const mk = (cls, icon, title, fn) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = `control-icon ${cls}`; b.title = title; b.dataset.tooltip = title;
    b.innerHTML = `<i class="fa-solid ${icon}"></i>`;
    b.addEventListener("click", ev => { ev.preventDefault(); fn(token).catch(e => console.error(`${MOD} |`, e)); });
    col.appendChild(b);
  };
  mk("wsn-who", "fa-eye-low-vision", "Who sees through it? (roll for the player characters)", whoSees);
  if ( seenBy(token).length ) mk("wsn-forget", "fa-eye-slash", `Forget who found them (${seenBy(token).length})`, forget);
}

/* ------------------------------------------------------------------ */
/*  Set up                                                             */
/* ------------------------------------------------------------------ */

export function setupPerception(helpers) {
  H = helpers;
  Hooks.once("ready", () => { try { installVisibility(); refreshScreen(); } catch (e) { console.warn(`${MOD} | perception`, e); } });
  for ( const h of ["updateActor", "updateItem", "createActiveEffect", "deleteActiveEffect", "updateActiveEffect", "controlToken", "canvasReady"] )
    Hooks.on(h, () => { refreshScreen(); if ( h === "controlToken" || h === "canvasReady" ) drawTrails(); });
  Hooks.on("updateToken", (doc, changes) => {
    record(doc, changes);
    drawTrails();
    if ( changes?.flags?.[MOD] ) refreshVisibility();
  });
  Hooks.on("updateWorldTime", () => drawTrails());
  Hooks.on("canvasReady", () => { layer = null; drawTrails(); });
  for ( const h of ["createActiveEffect", "deleteActiveEffect"] ) Hooks.on(h, () => refreshVisibility());
  Hooks.on("renderTokenHUD", onTokenHUD);
  return {refreshScreen, stateOf, drawTrails, trailSteps, trails, whoSees, forget, concealed, refreshVisibility, rules: P};
}
