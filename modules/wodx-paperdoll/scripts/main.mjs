import * as D from "./doll-rules.mjs";
import {registerSpriteSettings, startSprites, spriteApi} from "./sprites.mjs";
import {registerFaceSettings, startFaces, faceApi} from "./face64.mjs";
import {makeFigureApp} from "./figure.mjs";
import * as FG from "./figure-rules.mjs";
import {SKIN_LIST, HAIR} from "./face-rules.mjs";
import {measure, findEyes, checkFeatures, SIZE} from "./fit-rules.mjs";

/**
 * WoDX Paperdoll 0.1.0: a player builds the character's look (face parts, colours, era clothes) in a window on the
 * sheet, and the token shows it as one baked picture of head, shoulders and chest inside the era's ring. The face
 * follows the health track: bruises, cuts and a mood. Pictures are baked on the Storyteller's computer, so players
 * need no upload rights, and each look is baked once (the file is named by what it shows).
 */

const MOD = D.MOD;
export const VERSION = "0.22.0";
const ApplicationV2 = foundry.applications.api.ApplicationV2;
const esc = s => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
let active = false;

/* ---- Settings ---- */
function registerSettings() {
  game.settings.register(MOD, "on", {scope: "world", config: true, name: "Figure builder",
    hint: "A Figure button on each character's sheet builds the walking figure its sprite token is drawn from. Off: no Figure button.", type: Boolean, default: true});
  game.settings.register(MOD, "followHealth", {scope: "world", config: false, name: "Faces show the health track",
    hint: "Bruises, cuts and a pained look as the character goes down the health track, and a snarl in frenzy. Each player can turn it off for one character.", type: Boolean, default: true});
}
const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return undefined; } };
const enabled = () => active && setting("on") !== false;
/**
 * The drawn paperdoll portrait faces are retired for good (Ben, 13 November 2026, B2990): the pixel faces replace them.
 * Their code and every baked picture stay as they are; nothing is deleted. The Figure builder for sprite tokens stays on.
 */
export const DRAWN_FACES_RETIRED = true;
const drawnOn = () => enabled() && !DRAWN_FACES_RETIRED;

/* ---- Lorelei, loaded only when a picture is drawn ---- */
let DB = null;
const dicebear = async () => (DB ??= await import("../vendor/dicebear-lorelei.mjs"));
async function avatar(opts) { const m = await dicebear(); return m.createAvatar(m.lorelei, opts).toString(); }

/* ---- From SVG to pixels, in the browser ---- */
async function toCanvas(svg, size) {
  const url = URL.createObjectURL(new Blob([svg], {type: "image/svg+xml"}));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = c.height = size;
    c.getContext("2d").drawImage(img, 0, 0, size, size);
    return c;
  } finally { URL.revokeObjectURL(url); }
}
const FITS = new Map();
/** The anchors for this look's head: drawn once in key colours and measured, then kept. */
async function measured(look) {
  const c = await toCanvas(D.keySvg(look, await avatar(D.loreleiOptions(look, "own", {key: true}))), SIZE);
  return measure(c.getContext("2d").getImageData(0, 0, SIZE, SIZE), D.buildOf(look));
}
/** The first stage: the head in its build, measured with its hair, and the face outline measured on the bare face. */
export async function anchorsFor(look) {
  const key = D.fitKey(look);
  if ( FITS.has(key) ) return FITS.get(key);
  const A = D.withFace(await measured(look), await measured(D.bareLook(look)));
  if ( !A ) throw new Error("The head could not be measured.");
  FITS.set(key, A);
  return A;
}

const FEATS = new Map();
/**
 * The second stage of the face: the features drawn in their own colours in the build of the face, checked against
 * the measured head, and the pupils found. Kept by what they depend on.
 */
export async function featuresFor(look, mood = "own") {
  const key = D.featureKey(look, mood);
  if ( FEATS.has(key) ) return FEATS.get(key);
  const A = await anchorsFor(look);
  const c = await toCanvas(D.keySvg(look, await avatar(D.loreleiOptions(look, mood, {features: true}))), SIZE);
  const px = c.getContext("2d").getImageData(0, 0, SIZE, SIZE);
  const r = {eyes: findEyes(px, D.buildOf(look)), features: checkFeatures(px, A)};
  FEATS.set(key, r);
  return r;
}

/* ---- What a character shows now ---- */
// The sex WoDX Creation rolled for a person it made, read straight from the flags (the module may be off)
const whoOf = actor => ({type: actor?.type ?? "", variant: actor?.system?.settings?.variant ?? "",
  gender: {female: "woman", male: "man"}[actor?.flags?.["wodx-creation"]?.people?.sex] ?? ""});
const lookOf = actor => actor?.flags?.[MOD]?.look ? D.normalize(actor.flags[MOD].look) : null;
function atmosphere() { const m = game.modules.get("wodx-atmosphere"); return m?.active ? m : null; }
/** The ring: the era kit's frame. When WoDX Atmosphere draws frames round this token, the picture leaves it out. */
function ringFor(actor) {
  const at = atmosphere();
  let frame = D.DEFAULT_FRAME, ring = true;
  try {
    const f = at?.api?.kit?.frameFor?.();
    if ( f ) frame = {...D.DEFAULT_FRAME, ...f};
    const who = game.settings.get("wodx-atmosphere", "frames");
    const drawn = who === "all" ? true : who === "characters" ? !!actor?.hasPlayerOwner : false;
    if ( at && drawn ) ring = false;
  } catch (e) { /* no Atmosphere: the picture draws its own ring */ }
  return {frame, ring};
}
export function stateOf(actor, look = lookOf(actor)) {
  const follow = setting("followHealth") !== false && look?.followHealth !== false;
  const level = follow ? D.healthLevel(actor?.system?.health) : 0;
  const frenzy = !!actor?.system?.conditions?.isfrenzy;
  const mood = D.moodFor(look, {level, frenzy, follow});
  // Lasting changes kept by WoDX Storyteller (read straight from the flags: the module may be off)
  const changes = D.changesToDraw(actor?.flags?.["wodx-storyteller"]?.body);
  return {look, level, mood, changes, style: D.styleFor(look, whoOf(actor)), ...ringFor(actor)};
}
/** The picture as SVG, for a look in a state. */
export async function draw(look, {level = 0, mood = "own", frame = D.DEFAULT_FRAME, ring = true, style = null, changes = []} = {}) {
  const A = await anchorsFor(look);
  const {eyes, features} = await featuresFor(look, mood);
  const head = D.headLayers({look, eyes, mood, anchors: A, head: D.innerSvg(await avatar(D.loreleiOptions(look, mood))), mask: D.innerSvg(await avatar(D.loreleiOptions(look, mood, {mask: true})))});
  const out = D.compose({look, head, anchors: A, frame, ring, level, style, changes});
  out.stages = D.stagesOf({look, anchors: A, features, eyes, crop: out.crop, mood});
  const failed = out.stages.filter(s => !s.ok);
  if ( failed.length ) console.warn(`${MOD} | a stage did not check out`, failed);
  return out;
}

/* ---- Baking: on the Storyteller's computer ---- */
const FP = () => foundry.applications.apps.FilePicker.implementation;
const folder = () => `worlds/${game.world.id}/paperdoll`;
let known = null;
async function knownFiles() {
  if ( known ) return known;
  known = new Set();
  try { (await FP().browse("data", folder())).files.forEach(f => known.add(decodeURIComponent(f.split("/").pop()))); }
  catch (e) { try { await FP().createDirectory("data", folder(), {}); } catch (e2) { /* made by another call */ } }
  return known;
}
const isBaker = () => game.user.isGM && (game.users.activeGM ? game.users.activeGM.isSelf : true);

/** Bake one character's picture and put it on the token (and the portrait, when asked). Returns the file path. */
export async function bake(actor, {force = false} = {}) {
  if ( !game.user.isGM ) throw new Error("Only the Storyteller's computer bakes pictures.");
  const look = lookOf(actor);
  if ( !look ) return null;
  const st = stateOf(actor, look);
  const key = D.bakeKey(st);
  const name = `${key}.webp`, path = `${folder()}/${name}`;
  const files = await knownFiles();
  let drawnStages = null;
  if ( force || !files.has(name) ) {
    const {svg, stages} = await draw(look, st);
    drawnStages = stages;
    const c = await toCanvas(svg, 512);
    const blob = await new Promise(r => c.toBlob(r, "image/webp", 0.9));
    await FP().upload("data", folder(), new File([blob], name, {type: "image/webp"}), {}, {notify: false});
    files.add(name);
  }
  const upd = {[`flags.${MOD}.baked`]: key};
  if ( actor.prototypeToken?.texture?.src !== path ) upd["prototypeToken.texture.src"] = path;
  if ( look.portrait && actor.img !== path ) upd.img = path;
  if ( actor.flags?.[MOD]?.baked !== key || Object.keys(upd).length > 1 ) await actor.update(upd);
  // Placed tokens of this character, on every scene: found by the actor's own list and by a search of the scenes
  const byScene = new Map();
  const add = raw => {
    const t = raw?.document ?? raw, sc = t?.parent;
    if ( t?.documentName !== "Token" || !t.id || sc?.documentName !== "Scene" || !t.actorLink || t.texture?.src === path || t.flags?.[MOD]?.sprite ) return;
    if ( !byScene.has(sc.id) ) byScene.set(sc.id, {scene: sc, ids: new Set()});
    byScene.get(sc.id).ids.add(t.id);
  };
  try { for ( const t of actor.getDependentTokens?.({linked: true}) ?? [] ) add(t); } catch (e) { /* older API */ }
  for ( const scene of game.scenes ?? [] ) for ( const t of scene.tokens ?? [] ) if ( t.actorId === actor.id ) add(t);
  const log = {actor: actor.id, path, found: [], updated: [], errors: [], recheck: [], reset: [], stages: drawnStages};
  // diff: false sends the picture even when this computer's copy already shows it, so every copy ends the same
  const put = async (sceneId, ids) => {
    const scene = game.scenes.get(sceneId);
    if ( !scene || !ids.length ) return;
    try {
      const res = await scene.updateEmbeddedDocuments("Token", ids.map(_id => ({_id, "texture.src": path})), {diff: false});
      log.updated.push(...(res ?? []).map(t => `${scene.id}.${t.id}=${t.texture?.src}`));
    } catch (e) { log.errors.push(e.message); console.warn(`${MOD} | token picture on ${scene.name}`, e); }
  };
  for ( const [sid, {ids}] of byScene ) { log.found.push(...[...ids].map(id => `${sid}.${id}`)); await put(sid, [...ids]); }
  // Foundry 14 can keep showing a new token's old picture on this computer after the server has the new one:
  // the stored data is right, the prepared copy is not. Prepare it again and redraw the token.
  const fresh = async (sid, id) => {
    const t = game.scenes.get(sid)?.tokens?.get(id);
    if ( !t || t._source?.texture?.src !== path || t.texture?.src === path ) return;
    try { t.reset(); log.reset.push(`${sid}.${id}`); if ( t.object && !t.object.destroyed ) await t.object.draw?.(); }
    catch (e) { log.errors.push(`redraw: ${e.message}`); }
  };
  for ( const [sid, {ids}] of byScene ) for ( const id of ids ) await fresh(sid, id);
  lastBake = log;
  // Look again a moment later: a placed token that went back to its old picture gets the new one again
  if ( byScene.size ) setTimeout(async () => {
    for ( const [sid, {ids}] of byScene ) {
      const back = [...ids].filter(id => game.scenes.get(sid)?.tokens?.get(id)?._source?.texture?.src !== path);
      if ( back.length ) { log.recheck.push(...back.map(id => `${sid}.${id}`)); await put(sid, back); }
      for ( const id of ids ) await fresh(sid, id);
    }
  }, 800);
  return path;
}
let lastBake = null;
const timers = new Map();
let chain = Promise.resolve();
/** Bake soon, once, after a burst of changes. */
export function schedule(actor, ms = 400) {
  if ( !drawnOn() || !isBaker() || !lookOf(actor) ) return;
  clearTimeout(timers.get(actor.id));
  timers.set(actor.id, setTimeout(() => {
    timers.delete(actor.id);
    chain = chain.then(() => bake(actor)).catch(e => console.warn(`${MOD} | bake`, e));
  }, ms));
}
export const settled = () => new Promise(r => setTimeout(() => chain.then(r, r), 450));
/** Bake every character whose picture is out of date (at start, or when the era kit changes). */
export function bakeAll() {
  for ( const a of game.actors ?? [] ) if ( lookOf(a) && a.flags[MOD].baked !== D.bakeKey(stateOf(a)) ) schedule(a, 10);
}

/** Save a look for a character. Players save their own; the Storyteller's computer then bakes it. */
export async function saveLook(actor, look) {
  await actor.update({[`flags.${MOD}.look`]: D.normalize(look)});
  if ( isBaker() ) return bake(actor);
  return null;
}

/* ---- The window ---- */
const opt = (table, cur, order = null) => (order ? order.map(k => [k, table[k]]) : Object.entries(table)).map(([k, v]) => `<option value="${esc(k)}"${k === cur ? " selected" : ""}>${esc(typeof v === "string" ? v : v.label)}</option>`).join("");
const swatch = (table, cur) => opt(table, cur, table === D.SKIN ? D.FACE.SKIN_ORDER : table === D.EYES ? D.EYES_ORDER : null);

export class PaperdollApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    classes: ["wodx", "wodx-paperdoll-app"],
    window: {title: "Paperdoll", icon: "fa-solid fa-user-pen", resizable: true},
    position: {width: 720, height: 640},
    actions: {step: PaperdollApp.#onStep, random: PaperdollApp.#onRandom, save: PaperdollApp.#onSave, reset: PaperdollApp.#onReset}
  };
  static #open = new Map();
  static open(actor) {
    let app = this.#open.get(actor.id);
    if ( !app ) { app = new PaperdollApp({id: `wodx-paperdoll-${actor.id}`, actor}); this.#open.set(actor.id, app); }
    return app.render({force: true});
  }
  constructor(options = {}) {
    super(options);
    this.actor = options.actor;
    this.look = lookOf(this.actor) ?? D.randomLook(this.actor?.name ?? "", whoOf(this.actor));
    this.preview = 0;
  }
  get title() { return `Paperdoll: ${this.actor?.name ?? ""}`; }

  async _renderHTML() {
    const L = this.look, f = L.face, cl = L.clothes, fits = D.themeFor(whoOf(this.actor));
    const stepper = part => {
      const list = D.PARTS[part], i = list.indexOf(f[part]), named = D.PART_NAMES[part]?.[f[part]];
      const shown = named ?? (f[part] ? `${i + (list[0] === "" ? 0 : 1)} of ${list.length - (list[0] === "" ? 1 : 0)}` : "None");
      return `<div class="form-group wodx-step"><label>${esc(D.PART_LABELS[part])}</label><div class="form-fields">
        <button type="button" data-action="step" data-part="${part}" data-by="-1" aria-label="${esc(D.PART_LABELS[part])}: back"><i class="fa-solid fa-chevron-left"></i></button>
        <span class="wodx-step-val">${esc(shown)}</span>
        <button type="button" data-action="step" data-part="${part}" data-by="1" aria-label="${esc(D.PART_LABELS[part])}: next"><i class="fa-solid fa-chevron-right"></i></button></div></div>`;
    };
    const sel = (name, label, table, cur) => `<div class="form-group"><label>${esc(label)}</label><div class="form-fields"><select name="${name}" data-fixed aria-label="${esc(label)}">${swatch(table, cur)}</select></div></div>`;
    const chk = (name, label, on) => `<div class="form-group"><label><input type="checkbox" name="${name}"${on ? " checked" : ""}> ${esc(label)}</label></div>`;
    const div = document.createElement("div");
    div.className = "wodx-body wodx-paperdoll";
    const levels = Object.fromEntries(D.LEVEL_LABELS.map((l, i) => [String(i), l]));
    div.innerHTML = `<div class="wodx-paperdoll-cols">
      <div class="wodx-paperdoll-preview"><div class="wodx-paperdoll-pic" aria-label="The look">${await this.#picture()}</div>
        ${sel("preview", "Show it as", levels, String(this.preview))}
        <p class="hint">Head, shoulders and chest, inside the era's ring. Carried things are not drawn.</p></div>
      <div class="wodx-scroll wodx-paperdoll-form">
        <h3>Face</h3>${D.FACE_ORDER.map(stepper).join("")}
        ${chk("freckles", "Freckles", f.freckles)}
        ${sel("skin", "Skin", D.SKIN, L.colors.skin)}${sel("hairColor", "Hair colour", D.HAIR, L.colors.hair)}${sel("eyeColor", "Eyes", D.EYES, L.colors.eyes)}${sel("lips", "Lip colour", D.LIPS, L.colors.lips)}${sel("gender", "Face drawn as", D.GENDERS, f.gender)}
        <h3>Clothes</h3>
        ${sel("gown", "Gown", D.DYES, cl.gown)}
        ${chk("mantle", "A mantle over the shoulders", cl.mantle)}
        ${cl.mantle ? sel("mantleColor", "Mantle", D.DYES, cl.mantleColor) + sel("lining", "Lining", D.DYES, cl.lining) + sel("brooch", "Brooch", D.METALS, cl.brooch) : ""}
        ${sel("headwear", "On the head", D.HEADWEAR, cl.headwear)}
        ${cl.headwear !== "none" ? sel("veil", "Veil", D.DYES, cl.veil) : ""}
        <h3>The picture</h3>
        ${sel("ground", "Background", Object.fromEntries(Object.entries(D.GROUNDS).map(([k, v]) => [k, k ? v.label : `${v.label} (${D.GROUNDS[fits.ground].label})`])), L.style.ground)}
        ${sel("ring", "Inner ring", Object.fromEntries(Object.entries(D.RINGS).map(([k, v]) => [k, k ? v.label : `${v.label} (${D.RINGS[fits.ring].label})`])), L.style.ring)}
        <h3>Mood</h3>
        ${sel("mood", "Face", D.MOODS, L.mood)}
        ${chk("followHealth", "The face shows the health track", L.followHealth)}
        ${chk("portrait", "Use the picture as the character's portrait too", L.portrait)}
      </div></div>
      <footer class="form-footer wodx-footer">
        <button type="button" data-action="random"><i class="fa-solid fa-dice"></i> A new face</button>
        <button type="button" data-action="reset"><i class="fa-solid fa-rotate-left"></i> Back to the saved look</button>
        <button type="button" data-action="save"><i class="fa-solid fa-floppy-disk"></i> Save the look</button></footer>`;
    div.querySelectorAll("select, input[type=checkbox]").forEach(el => el.addEventListener("change", ev => this.#onChange(ev.target)));
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }
  async _onClose(options) { PaperdollApp.#open.delete(this.actor?.id); return super._onClose?.(options); }

  async #picture() {
    try {
      const lvl = this.preview, follow = lvl > 0;
      const mood = D.moodFor(this.look, {level: lvl, follow});
      const {svg, stages} = await draw(this.look, {level: lvl, mood, ...ringFor(this.actor), ring: true, style: D.styleFor(this.look, whoOf(this.actor))});
      const bad = stages.filter(s => !s.ok);
      return `<img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}" alt="${esc(this.actor?.name ?? "")}">`
        + (bad.length ? `<p class="wodx-quiet">This face did not check out: ${esc(bad.map(s => s.why).join("; "))}. Try another part.</p>` : "");
    } catch (e) {
      console.warn(`${MOD} | preview`, e);
      return `<p class="wodx-quiet">The picture could not be drawn here.</p>`;
    }
  }
  #onChange(el) {
    const L = this.look, n = el.name, v = el.type === "checkbox" ? el.checked : el.value;
    if ( n === "preview" ) this.preview = Number(v) || 0;
    else if ( n === "freckles" ) L.face.freckles = v;
    else if ( n === "skin" ) L.colors.skin = v;
    else if ( n === "hairColor" ) L.colors.hair = v;
    else if ( n === "eyeColor" ) L.colors.eyes = v;
    else if ( n === "lips" ) L.colors.lips = v;
    else if ( n === "gender" ) L.face.gender = v;
    else if ( n === "ground" || n === "ring" ) L.style = {...L.style, [n]: v};
    else if ( ["gown", "mantle", "mantleColor", "lining", "brooch", "headwear", "veil"].includes(n) ) L.clothes[n] = v;
    else if ( ["mood", "followHealth", "portrait"].includes(n) ) L[n] = v;
    this.look = D.normalize(L);
    this.render();
  }
  static #onStep(ev, target) { this.look = D.step(this.look, target.dataset.part, Number(target.dataset.by)); this.render(); }
  static #onRandom() { this.look = {...D.randomLook(`${this.actor?.name ?? ""} ${Date.now()}`, whoOf(this.actor)), clothes: this.look.clothes, style: this.look.style, mood: this.look.mood, followHealth: this.look.followHealth, portrait: this.look.portrait}; this.render(); }
  static #onReset() { this.look = lookOf(this.actor) ?? D.randomLook(this.actor?.name ?? "", whoOf(this.actor)); this.render(); }
  static async #onSave() {
    await saveLook(this.actor, this.look);
    ui.notifications.info(game.user.isGM ? "Look saved and put on the token." : "Look saved. The token changes once the Storyteller is here.");
  }
}

/* ---- Hooks ---- */
const canBuild = actor => !!actor?.isOwner && !!actor.system?.health;
/* The figure menu (B2587): the whole figure a token walks as, put together by the character's player. */
let FigureApp = null;
const figureApp = () => (FigureApp ??= makeFigureApp({skin: SKIN_LIST.slice(0, 38), hair: Object.entries(HAIR),
  year: () => { const y = game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.(); return Number.isFinite(y) ? {year: y, label: String(y)} : null; }}));
// a figure belongs to the character, not to one token of it: a token's sheet opens the character's own figure, which is what a batch draws
const openFigure = actor => figureApp().open(actor?.isToken ? (game.actors.get(actor.id) ?? actor) : actor);
Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
  if ( enabled() && canBuild(sheet.actor) && !buttons.some(b => b.class === "wodx-figure") )
    buttons.unshift({label: "Figure", class: "wodx-figure", icon: "fa-solid fa-person", onclick: () => openFigure(sheet.actor)});
});
Hooks.on("getHeaderControlsActorSheetV2", (app, controls) => {
  if ( !enabled() || !canBuild(app.document) || controls.some(c => c.action === "wodxFigure") ) return;
  const go = () => openFigure(app.document);
  if ( app.options?.actions ) app.options.actions.wodxFigure = go;
  controls.push({icon: "fa-solid fa-person", label: "Figure", action: "wodxFigure", onClick: go});
});
Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
  if ( !drawnOn() || !canBuild(sheet.actor) || buttons.some(b => b.class === "wodx-paperdoll") ) return;
  buttons.unshift({label: "Paperdoll", class: "wodx-paperdoll", icon: "fa-solid fa-user-pen", onclick: () => PaperdollApp.open(sheet.actor)});
});
Hooks.on("getHeaderControlsActorSheetV2", (app, controls) => {
  if ( !drawnOn() || !canBuild(app.document) || controls.some(c => c.action === "wodxPaperdoll") ) return;
  const go = () => PaperdollApp.open(app.document);
  if ( app.options?.actions ) app.options.actions.wodxPaperdoll = go;
  controls.push({icon: "fa-solid fa-user-pen", label: "Paperdoll", action: "wodxPaperdoll", onClick: go});
});
Hooks.on("getActorContextOptions", (app, options) => {
  if ( !drawnOn() ) return;
  options.push({name: "Paperdoll", icon: '<i class="fa-solid fa-user-pen"></i>',
    condition: li => canBuild(game.actors.get(li?.dataset?.entryId ?? li?.[0]?.dataset?.entryId)),
    callback: li => PaperdollApp.open(game.actors.get(li?.dataset?.entryId ?? li?.[0]?.dataset?.entryId))});
});
Hooks.on("updateActor", (actor, changes) => {
  if ( !drawnOn() ) return;
  const fl = changes.flags?.[MOD];
  if ( fl?.look !== undefined || changes.system?.health || changes.system?.conditions || changes.flags?.["wodx-storyteller"]?.body !== undefined ) schedule(actor);
});

Hooks.once("init", () => {
  if ( !game.world?.flags?.wodx ) return;
  active = true;
  registerSettings();
  registerSpriteSettings();
  registerFaceSettings();
  startFaces();
});
Hooks.once("ready", () => {
  if ( !active ) return;
  game.modules.get(MOD).api = {version: VERSION, last: () => lastBake, open: a => PaperdollApp.open(a), figure: {open: openFigure, of: a => a?.flags?.[MOD]?.figure ?? null, rules: FG}, bake, bakeAll, schedule, settled, save: saveLook, draw, anchorsFor, state: stateOf, rules: D, sprites: spriteApi, faces: faceApi};
  startSprites();
  if ( drawnOn() && isBaker() ) setTimeout(bakeAll, 1500);
});
