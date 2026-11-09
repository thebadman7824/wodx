/**
 * WoDX Atmosphere 0.2.0: the weather, lighting from the clock, and each era kit's sound, map colour and token frames.
 *
 *   Weather     each night's weather from the chronicle's seed, the climate and the date (weather-rules.mjs). At the
 *               turn of the night the Storyteller's client sets WoDX Actions' sky (which caps sunlight), puts rain,
 *               snow or fog on outdoor scenes, and whispers the Storyteller a card with what the weather does to rolls.
 *               The Storyteller can set any night by hand. The hook wodxWeather carries each new night to other modules
 *               (WoDX Senses reads api.weather.now()).
 *   Light       scenes marked "follow the clock" get their darkness from the sun and moon, clouds included.
 *   Era kit     music moods as playlists (built from the kit folder, or the world's own playlists chosen per mood),
 *               ambience loops picked for the scene's kind of place and the weather, short cues at dawn and dusk and
 *               when something waits for the Storyteller, and a light colour grade on the map.
 *   Handouts    journal pages in the era's style.
 *   Credits     a journal listing every kit file's source, licence and credit.
 * Weather and light are small world changes made on the Storyteller's client; nothing waits in the approval queue.
 */
import * as W from "./weather-rules.mjs";
import * as K from "./kits-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const MOD = "wodx-atmosphere";
const VERSION = "0.3.0";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return null; } };
const setSetting = (k, v) => game.settings.set(MOD, k, v);
const isActiveGM = () => game.user.isGM && (game.users.activeGM ? game.users.activeGM.id === game.user.id : true);
const modOn = id => !!game.modules.get(id)?.active;
const all = c => c?.contents ?? [...(c?.values?.() ?? c ?? [])];
const chron = () => game.modules.get("wodx-chronicle")?.api;
const opt = (map, cur) => Object.entries(map).map(([k, v]) => `<option value="${esc(k)}"${String(k) === String(cur ?? "") ? " selected" : ""}>${esc(v)}</option>`).join("");
const wait = cfg => foundry.applications.api.DialogV2.wait({rejectClose: false, ...cfg, classes: ["wodx-dialog", "watmo-dialog", ...(cfg.classes ?? [])]});
const formData = (ev, b) => new foundry.applications.ux.FormDataExtended(b.form).object;
const SHIPPED = ["dark-ages", "long-night", "renaissance", "victorian", "wild-west", "great-war", "modern", "future-darkness"];
const OUTDOOR_KINDS = ["gate", "market", "street", "wilds", "caern"];
let CAL = null;
let active = false;

/* ------------------------------------------------------------------ */
/*  Settings                                                           */
/* ------------------------------------------------------------------ */

function registerSettings() {
  const world = (key, data) => game.settings.register(MOD, key, {scope: "world", config: true, ...data});
  const hidden = (key, type, def) => game.settings.register(MOD, key, {scope: "world", config: false, type, default: def});
  world("climate", {name: "Climate", hint: "The weather's climate. Follow the region: Central Europe for Europe, Eastern North America for the Americas.",
    type: String, default: "auto", choices: {auto: "Follow the chronicle region", ...Object.fromEntries(Object.entries(W.CLIMATES).map(([k, v]) => [k, v.label]))},
    onChange: () => { clearCache(); AtmosphereApp.refresh(); if ( isActiveGM() ) applyWeather({force: true}); }});
  world("weather", {name: "Weather each night", hint: "Make the weather at the turn of each night and set the sky, the scenes' rain and snow, and the light. Off: nothing changes by itself.",
    type: String, default: "auto", choices: {auto: "Make and apply it", off: "Off"}, onChange: () => { AtmosphereApp.refresh(); if ( isActiveGM() ) applyWeather({force: true}); }});
  world("sceneEffects", {name: "Rain, snow and fog on outdoor scenes", hint: "Uses Foundry's own weather effects. A scene the Storyteller gave its own weather is left alone.", type: Boolean, default: true});
  world("tellPlayers", {name: "Tell the players the weather each night", hint: "Post the night's weather in chat for everyone when the night turns.", type: Boolean, default: false});
  world("lightFromClock", {name: "Light from the clock", hint: "Scenes marked \"Follow the clock\" in the Atmosphere window get their darkness from the sun, the moon and the clouds.", type: Boolean, default: true});
  world("music", {name: "Era music", hint: "When the era changes, stop the old era's music and start the new era's calm playlist; play the combat playlist while a fight runs. Only playlists set in the Atmosphere window are touched.",
    type: Boolean, default: true});
  world("ambience", {name: "Ambience for each scene", hint: "When a scene is shown to the players, play the era kit's loop for its kind of place and, out of doors, for the weather.", type: Boolean, default: true});
  world("kitRoot", {name: "Era kit folder", hint: "Where the kits' files are, in the Data folder: one folder per kit (dark-ages, victorian...), each with music, ambience and sounds inside.", type: String, default: "wodx-kits"});
  game.settings.register(MOD, "grade", {scope: "client", config: true, name: "Era colour on the map", hint: "A light colour grade for the era (sepia gaslight, drained plague years). Turn it off on a slow computer.",
    type: String, default: "full", choices: {full: "Full", light: "Light", off: "Off"}, onChange: () => applyGrade()});
  game.settings.register(MOD, "cues", {scope: "client", config: true, name: "Era sound cues", hint: "A short sound at dawn, at sunset and (for the Storyteller) when something waits in the approval queue.", type: Boolean, default: true});
  game.settings.register(MOD, "dawnDread", {scope: "client", config: true, name: "Dawn dread",
    hint: "In the last half hour before sunrise the edge of the screen pales, birds start up at twenty minutes and a cock crows at ten. Turn it off on this computer.",
    type: Boolean, default: true, onChange: () => applyDread()});
  world("dawnPressure", {name: "Rötschreck pressure before dawn", hint: "House rule: in the last ten minutes before sunrise, Rötschreck rolls are 1 harder.", type: Boolean, default: true});
  game.settings.register(MOD, "cueVolume", {scope: "client", config: true, name: "Cue volume", type: Number, default: 0.5, range: {min: 0, max: 1, step: 0.05}});
  world("frames", {name: "Token frames", hint: "A ring or a square in the era's material round each token (iron, gilt, brass, chrome, neon).",
    type: String, default: "characters", choices: K.FRAME_WHO, onChange: () => redrawFrames()});
  game.settings.register(MOD, "framesHere", {scope: "client", config: true, name: "Show token frames", hint: "Turn the era's token frames off on this computer only.", type: Boolean, default: true, onChange: () => redrawFrames()});
  hidden("overrides", Object, {});
  hidden("applied", Object, {});
  hidden("playlists", Object, {});
  hidden("index", Object, {});
  hidden("mood", String, "calm");
  hidden("lastKit", String, "");
}

/* ------------------------------------------------------------------ */
/*  Time, place and the night's weather                                */
/* ------------------------------------------------------------------ */

const latitude = () => { try { return Number(game.settings.get("wodx-chronicle", "latitude")) || 50.1; } catch (e) { return 50.1; } };
const hoursOf = s => { const m = String(s ?? "").match(/(\d+):(\d+)/); return m ? Number(m[1]) + Number(m[2]) / 60 : null; };
function timeAt(time = game.time.worldTime) {
  try { return CAL?.describeTime(time, latitude()) ?? null; } catch (e) { return null; }
}
/** The night a time belongs to: before sunrise it is still the night that began the evening before. */
export function nightJdn(time = game.time.worldTime) {
  const t = timeAt(time);
  if ( !t ) return null;
  const hours = t.hour + t.minute / 60, rise = hoursOf(t.sunrise);
  return (rise !== null && hours < rise) ? t.jdn - 1 : t.jdn;
}
export function climate() {
  const c = setting("climate");
  if ( c && c !== "auto" && W.CLIMATES[c] ) return c;
  let region = "europe";
  try { region = game.settings.get("wodx-chronicle", "region"); } catch (e) { /* europe */ }
  return W.climateForRegion(region);
}
const seed = () => { try { return chron()?.gen?.seed?.() ?? "unseeded"; } catch (e) { return "unseeded"; } };
const yearNow = () => { try { return timeAt()?.year ?? null; } catch (e) { return null; } };

const cache = new Map();
function clearCache() { cache.clear(); }
/** The weather for a night (a JDN), hand-set or made. */
export function weatherOn(jdn) {
  if ( !Number.isFinite(jdn) ) return null;
  const over = setting("overrides")?.[jdn] ?? null;
  const key = `${seed()}|${climate()}|${jdn}|${over ? JSON.stringify(over) : ""}`;
  if ( cache.has(key) ) return cache.get(key);
  const d = W.weatherFor(seed(), climate(), jdn, {override: over});
  if ( cache.size > 60 ) cache.clear();
  cache.set(key, d);
  return d;
}
/** Tonight's weather, or null when the weather is off. */
export function now() {
  if ( !active || setting("weather") === "off" ) return null;
  return weatherOn(nightJdn());
}

/** Is a scene out of doors, for the weather? The scene's own choice, else WoDX Actions' daylight, else its kind of place. */
export function isOutdoor(scene) {
  const own = scene?.flags?.[MOD]?.outdoors;
  if ( own === "on" ) return true;
  if ( own === "off" ) return false;
  const light = scene?.flags?.["wodx-actions"]?.light;
  if ( light === "outdoors" ) return true;
  if ( light === "indoors" ) return false;
  return OUTDOOR_KINDS.includes(scene?.flags?.["wodx-npc"]?.place?.kind);
}
const viewedScenes = () => {
  const ids = new Set(all(game.users).filter(u => u.active).map(u => u.viewedScene).filter(Boolean));
  if ( game.scenes.active ) ids.add(game.scenes.active.id);
  return [...ids].map(id => game.scenes.get(id)).filter(Boolean);
};

/* ------------------------------------------------------------------ */
/*  Applying the weather and the light                                 */
/* ------------------------------------------------------------------ */

async function applySky(day) {
  if ( !modOn("wodx-actions") || !day ) return;
  try { if ( game.settings.get("wodx-actions", "sky") !== day.sky ) await game.settings.set("wodx-actions", "sky", day.sky); }
  catch (e) { console.warn(`${MOD} | could not set the sky`, e); }
}

async function applySceneEffect(scene, day) {
  if ( !scene || !setting("sceneEffects") ) return;
  const mine = scene.flags?.[MOD]?.effectSet ?? "";
  const cur = scene.weather ?? "";
  // The Storyteller's own choice on a scene is left alone
  if ( cur && cur !== mine ) return;
  let want = (day && isOutdoor(scene)) ? day.effect : "";
  if ( want && !CONFIG.weatherEffects?.[want] ) want = "";
  if ( cur === want && mine === want ) return;
  await scene.update({weather: want, [`flags.${MOD}.effectSet`]: want});
}

async function applyLight(scene, day, time = game.time.worldTime) {
  if ( !scene || !setting("lightFromClock") || !scene.flags?.[MOD]?.followClock ) return;
  const t = timeAt(time);
  if ( !t ) return;
  const alt = W.sunAltitude(t.jdn, t.hour + t.minute / 60, latitude());
  const night = Number(scene.flags[MOD].night);
  const v = W.darknessFor({altitude: alt, moon: Number(t.moon?.illumination) || 0, sky: day?.sky ?? "clear", night: Number.isFinite(night) ? night : 0.9});
  const cur = Number(scene.environment?.darknessLevel ?? scene.darkness ?? 0);
  if ( Math.abs(cur - v) < 0.049 ) return;
  await scene.update({"environment.darknessLevel": v});
}

/** At the turn of the night (or when forced), set the sky and the scenes, and tell the Storyteller. Active GM only. */
let applying = null;
export function applyWeather({force = false, quiet = false} = {}) {
  if ( !isActiveGM() ) return Promise.resolve(null);
  applying = (applying ?? Promise.resolve()).then(() => _applyWeather({force, quiet})).catch(e => console.error(`${MOD} | weather`, e));
  return applying;
}
async function _applyWeather({force, quiet}) {
  if ( chron()?.isSkipping?.() ) return null;
  const day = now();
  if ( !day ) {
    for ( const s of viewedScenes() ) await applySceneEffect(s, null);
    return null;
  }
  const key = `${day.jdn}:${W.weatherKey(day)}`;
  const last = setting("applied") ?? {};
  await applySky(day);
  for ( const s of viewedScenes() ) { await applySceneEffect(s, day); await applyLight(s, day); }
  if ( !force && last.key === key ) return day;
  await setSetting("applied", {key, jdn: day.jdn});
  const newNight = last.jdn !== day.jdn;
  if ( !quiet && newNight ) {
    await postWeather(day, {gm: true});
    if ( setting("tellPlayers") ) await postWeather(day, {gm: false});
  }
  Hooks.callAll("wodxWeather", day);
  ambienceSoon();
  AtmosphereApp.refresh();
  return day;
}

function modifierList(day) {
  const m = W.modifiers(day);
  return m.length ? `<ul>${m.map(x => `<li>${esc(x.label)}: ${x.n > 0 ? "+" : ""}${x.n} difficulty (${esc(x.applies)})</li>`).join("")}</ul>` : "";
}
async function postWeather(day, {gm = true} = {}) {
  const t = timeAt();
  const head = gm ? "Tonight's weather" : "The weather tonight";
  const content = `<div class="wodx-card watmo-card"><h3>${head}</h3><p>${esc(day.label)}</p>
    ${gm ? `${modifierList(day) ? `<p class="wodx-quiet">Out of doors, house rules:</p>${modifierList(day)}` : ""}
    <p class="wodx-quiet">${day.set ? "Set by hand. " : ""}${esc(W.CLIMATES[day.climate]?.label ?? "")}${t ? `, ${esc(t.dateLabel)}` : ""}.</p>
    <button type="button" data-watmo="open"><i class="fa-solid fa-cloud-moon"></i> Weather and atmosphere</button>` : ""}</div>`;
  return ChatMessage.create({content, speaker: {alias: "Weather"}, whisper: gm ? all(game.users).filter(u => u.isGM).map(u => u.id) : [],
    flags: {[MOD]: {weather: day.jdn}}});
}

/** Set a night by hand (or clear it with null). */
export async function setNight(jdn, over) {
  const o = foundry.utils.deepClone(setting("overrides") ?? {});
  if ( over ) o[jdn] = over; else delete o[jdn];
  // Hand-set nights more than a year back are dropped, so the setting stays small
  for ( const k of Object.keys(o) ) if ( Number(k) < jdn - 366 ) delete o[k];
  await setSetting("overrides", o);
  clearCache();
  if ( jdn === nightJdn() ) await applyWeather({force: true, quiet: true});
  AtmosphereApp.refresh();
}

/* ------------------------------------------------------------------ */
/*  The era kit: music, ambience, cues, colour                         */
/* ------------------------------------------------------------------ */

export function currentKit() {
  try { return K.kitFor(chron()?.eras?.activeEra?.()?.profile); } catch (e) { return "dark-ages"; }
}
const playlistMap = () => setting("playlists") ?? {};
/** The playlist for a mood (or "ambience") in the kit or the kits it borrows from. */
function playlistFor(kit, mood) {
  for ( const k of K.kitChain(kit) ) {
    const id = playlistMap()[k]?.[mood];
    const p = id ? game.playlists.get(id) : null;
    if ( p ) return p;
  }
  return null;
}
const moodPlaylists = kit => K.kitChain(kit).flatMap(k => Object.keys(K.MOODS).map(m => playlistFor(k, m))).filter(Boolean);

export async function playMood(mood, {remember = true} = {}) {
  if ( !game.user.isGM ) return false;
  const kit = currentKit();
  const p = playlistFor(kit, mood);
  if ( !p ) { ui.notifications.info(`No ${mood} playlist is set for ${K.KITS[kit]?.name ?? kit}. Set one in the Atmosphere window.`); return false; }
  for ( const q of moodPlaylists(kit) ) if ( q.id !== p.id && q.playing ) await q.stopAll();
  if ( !p.playing ) await p.playAll();
  if ( remember && mood !== "combat" ) await setSetting("mood", mood);
  AtmosphereApp.refresh();
  return true;
}
export async function stopMusic(kit = currentKit()) {
  for ( const q of moodPlaylists(kit) ) if ( q.playing ) await q.stopAll();
  AtmosphereApp.refresh();
}

async function onEraApplied() {
  applyGrade();
  if ( !isActiveGM() ) return;
  const kit = currentKit(), last = setting("lastKit");
  if ( last === kit ) return;
  await setSetting("lastKit", kit);
  if ( !last || !setting("music") ) return;
  await stopMusic(last);
  const amb = playlistFor(last, "ambience");
  if ( amb?.playing ) await amb.stopAll();
  if ( playlistFor(kit, "calm") ) await playMood("calm");
  ambienceSoon();
}

let ambTimer = null;
function ambienceSoon() { clearTimeout(ambTimer); ambTimer = setTimeout(() => applyAmbience().catch(e => console.warn(`${MOD} | ambience`, e)), 500); }
export async function applyAmbience(scene = game.scenes.active) {
  if ( !isActiveGM() || !setting("ambience") || !scene ) return [];
  const p = playlistFor(currentKit(), "ambience");
  if ( !p ) return [];
  const keyOf = s => String(s.name ?? "").toLowerCase().split(/\s+/)[0];
  const have = all(p.sounds).map(keyOf);
  const t = timeAt();
  const want = K.ambienceFor({kind: scene.flags?.["wodx-npc"]?.place?.kind ?? "other", indoor: !isOutdoor(scene), tags: now()?.tags ?? [], night: t ? t.isNight : true}, have);
  for ( const s of all(p.sounds) ) {
    const on = want.includes(keyOf(s));
    if ( on && !s.playing ) await p.playSound(s);
    else if ( !on && s.playing ) await p.stopSound(s);
  }
  return want;
}

/** The file for a cue: the kit folder's own first, else the sound shipped with the module. */
function cueSrc(cue) {
  const idx = setting("index") ?? {};
  for ( const k of K.kitChain(currentKit()) ) if ( idx[k]?.cues?.[cue] ) return idx[k].cues[cue];
  const shipped = K.kitChain(currentKit()).find(k => SHIPPED.includes(k)) ?? (currentKit() === "time-of-judgment" ? "modern" : "dark-ages");
  if ( K.COMMON_CUES.includes(cue) ) return `modules/${MOD}/sounds/common/${cue}.ogg`;
  return `modules/${MOD}/sounds/${shipped}/${cue}.ogg`;
}
export function playCue(cue) {
  if ( !setting("cues") || !K.CUES[cue] ) return null;
  try { return foundry.audio.AudioHelper.play({src: cueSrc(cue), volume: Number(setting("cueVolume")) || 0.5, autoplay: true, loop: false}, false); }
  catch (e) { console.warn(`${MOD} | cue`, e); return null; }
}
function cuesForTime(time, delta) {
  if ( !CAL || !(delta > 0) || delta > 6 * 3600 || chron()?.isSkipping?.() ) return;
  const prev = time - delta, lat = latitude();
  try {
    const toDawn = CAL.secondsToNextDawn(prev, lat) - 1800;
    if ( toDawn > 0 && toDawn <= delta ) playCue("dawn");
    const toDusk = CAL.secondsToNextDusk(prev, lat);
    if ( toDusk > 0 && toDusk <= delta ) playCue("dusk");
    if ( setting("dawnDread") ) for ( const c of K.dreadCuesCrossed(CAL.secondsToNextDawn(time, lat), delta) ) playCue(c);
  } catch (e) { /* no cue */ }
}

/* ------------------------------------------------------------------ */
/*  Dawn dread                                                         */
/* ------------------------------------------------------------------ */

/** The dread now: {strength, minutes, birds, cock, rotschreck} in the last half hour before sunrise, else null. */
export function dread(time = game.time.worldTime) {
  if ( !active || !CAL ) return null;
  try { return K.dawnDread(CAL.secondsToNextDawn(time, latitude())); } catch (e) { return null; }
}
/** The Rötschreck difficulty step dawn adds now (0 or 1); WoDX Actions reads it for its Rötschreck window. */
export function dreadRotschreck(time) { return setting("dawnPressure") === false ? 0 : (dread(time)?.rotschreck ?? 0); }
/** The pale edge on this client's screen, as a CSS variable on the body. */
export function applyDread(time) {
  const d = setting("dawnDread") === false ? null : dread(time);
  const body = document.body;
  if ( !body ) return d;
  body.classList.toggle("wodx-dawn-dread", !!d);
  if ( d ) body.style.setProperty("--wodx-dread", String(d.strength));
  else body.style.removeProperty("--wodx-dread");
  return d;
}
/** One clock move: the cues it crosses, the screen edge, the Storyteller's card. Returns the card's promise. */
export function dreadTick(time, delta) {
  cuesForTime(time, delta);
  applyDread(time);
  return dreadCard(time, delta).catch(e => console.warn(`${MOD} | dread`, e));
}
/** The Storyteller's card when the pressure starts, once a night. */
let dreadCarded = null;
async function dreadCard(time, delta) {
  if ( !isActiveGM() || setting("dawnPressure") === false || !CAL || chron()?.isSkipping?.() ) return;
  const toDawn = CAL.secondsToNextDawn(time, latitude());
  if ( !K.dreadCuesCrossed(toDawn, delta).includes("cock") ) return;
  const night = Math.floor((time + toDawn) / 86400);
  if ( dreadCarded === night ) return;
  dreadCarded = night;
  await ChatMessage.create({speaker: {alias: "The dawn"}, whisper: game.users.filter(u => u.isGM).map(u => u.id),
    content: `<div class="wodx-card"><p><strong>Ten minutes to sunrise.</strong> Until the sun is up, Rötschreck rolls are 1 harder (house rule); the Rötschreck window adds it by itself.</p></div>`});
}

/** The map colour grade, on this client's board. */
export function applyGrade() {
  const board = document.getElementById("board");
  if ( !board ) return "";
  const g = setting("grade");
  const grade = (!active || g === "off") ? "" : K.gradeCss(K.KITS[currentKit()]?.grade, g === "light" ? 0.5 : 1);
  // WoDX Otherworlds' Shadowlands decay joins the grade, so neither overwrites the other
  let decay = "";
  try { decay = game.modules.get("wodx-otherworlds")?.api?.decayCss?.() ?? ""; } catch (e) { decay = ""; }
  const css = [grade, decay].filter(Boolean).join(" ");
  board.style.filter = css;
  return css;
}

/* ------------------------------------------------------------------ */
/*  Token frames                                                       */
/* ------------------------------------------------------------------ */

const FRAME = "wodxFrame";
function frameOn() { try { return active && setting("framesHere") !== false && setting("frames") !== "off"; } catch (e) { return false; } }
/** Draw (or take away) one token's frame. Redrawn only when the kit or the token's size changes. */
export function drawFrame(token) {
  if ( !token || token.destroyed ) return;
  const old = token.children?.find?.(c => c.name === FRAME);
  const actor = token.document?.actor ?? token.actor;
  const want = frameOn() && K.framed(setting("frames"), {hasActor: !!actor, playerOwned: !!actor?.hasPlayerOwner});
  if ( !want ) { if ( old ) { token.removeChild(old); old.destroy(); } token._wodxFrameKey = null; return; }
  const f = K.frameFor(currentKit());
  const w = token.w ?? token.document?.width * (canvas?.grid?.size ?? 100), h = token.h ?? token.document?.height * (canvas?.grid?.size ?? 100);
  const key = `${f.kit}:${w}:${h}`;
  if ( old && token._wodxFrameKey === key ) return;
  if ( old ) { token.removeChild(old); old.destroy(); }
  const gfx = new PIXI.Graphics();
  gfx.name = FRAME;
  for ( const sh of K.frameShapes(f, w, h) ) {
    if ( typeof gfx.lineStyle === "function" ) {
      gfx.lineStyle(sh.width, sh.color, sh.alpha);
      if ( sh.kind === "circle" ) gfx.drawCircle(sh.x, sh.y, sh.r); else gfx.drawRoundedRect(sh.x, sh.y, sh.w, sh.h, sh.r);
    } else {
      if ( sh.kind === "circle" ) gfx.circle(sh.x, sh.y, sh.r); else gfx.roundRect(sh.x, sh.y, sh.w, sh.h, sh.r);
      gfx.stroke({width: sh.width, color: sh.color, alpha: sh.alpha});
    }
  }
  gfx.eventMode = "none";
  token.addChild(gfx);
  token._wodxFrameKey = key;
}
export function redrawFrames() {
  for ( const t of canvas?.tokens?.placeables ?? [] ) { t._wodxFrameKey = null; try { drawFrame(t); } catch (e) { console.warn(`${MOD} | frame`, e); } }
}

/* ------------------------------------------------------------------ */
/*  Building playlists from the kit folder                             */
/* ------------------------------------------------------------------ */

async function browseAll(path, depth = 0) {
  const FP = foundry.applications.apps.FilePicker.implementation;
  let res;
  try { res = await FP.browse("data", path); } catch (e) { return null; }
  const files = [...(res.files ?? [])];
  if ( depth < 3 ) for ( const d of res.dirs ?? [] ) files.push(...((await browseAll(d, depth + 1)) ?? []));
  return files;
}

/** What building a kit's playlists would do, or does when apply is true. Never makes a second playlist for a mood. */
export async function buildPlaylists(kit = currentKit(), {apply = false} = {}) {
  const root = setting("kitRoot") || "wodx-kits";
  const folder = K.kitFolder(kit, root);
  const files = await browseAll(folder);
  if ( files === null ) return {kit, folder, missing: true, plan: []};
  const sorted = K.sortFiles(kit, files, root);
  const plan = [];
  const want = [...Object.entries(sorted.music).map(([mood, list]) => ({mood, name: K.playlistName(kit, mood), tracks: list, repeat: false})),
    ...(Object.keys(sorted.ambience).length ? [{mood: "ambience", name: K.ambienceName(kit), tracks: Object.values(sorted.ambience), repeat: true}] : [])];
  const map = foundry.utils.deepClone(playlistMap());
  for ( const w of want ) {
    let p = all(game.playlists).find(x => x.flags?.[MOD]?.kit === kit && x.flags?.[MOD]?.mood === w.mood);
    const have = new Set(all(p?.sounds).map(s => s.path));
    const add = w.tracks.filter(t => !have.has(t));
    plan.push({mood: w.mood, name: w.name, exists: !!p, add: add.length, total: w.tracks.length, keepsOwn: !!map[kit]?.[w.mood] && map[kit][w.mood] !== p?.id});
    if ( !apply ) continue;
    if ( !p ) {
      let f = all(game.folders).find(x => x.type === "Playlist" && x.name === K.folderName(kit));
      f ??= await Folder.create({name: K.folderName(kit), type: "Playlist"});
      p = await Playlist.create({name: w.name, folder: f.id, mode: w.repeat ? CONST.PLAYLIST_MODES.SIMULTANEOUS : CONST.PLAYLIST_MODES.SEQUENTIAL,
        flags: {[MOD]: {kit, mood: w.mood}}});
    }
    if ( add.length ) await p.createEmbeddedDocuments("PlaylistSound", add.map(path => ({name: K.trackName(path), path, repeat: w.repeat, volume: w.repeat ? 0.4 : 0.6})));
    map[kit] ??= {};
    if ( !map[kit][w.mood] || !game.playlists.get(map[kit][w.mood]) ) map[kit][w.mood] = p.id;
  }
  if ( apply ) {
    await setSetting("playlists", map);
    const idx = foundry.utils.deepClone(setting("index") ?? {});
    idx[kit] = {cues: Object.fromEntries(Object.entries(sorted.cues).map(([k, v]) => [k, v])), at: Date.now()};
    await setSetting("index", idx);
    AtmosphereApp.refresh();
  }
  return {kit, folder, missing: false, plan, cues: Object.keys(sorted.cues), other: sorted.other.length};
}

/* ------------------------------------------------------------------ */
/*  Credits and handouts                                               */
/* ------------------------------------------------------------------ */

export async function writeCredits() {
  if ( !game.user.isGM ) return null;
  const root = setting("kitRoot") || "wodx-kits";
  const rows = [];
  for ( const kit of Object.keys(K.KITS) ) {
    let credits = null;
    try { const r = await fetch(`${root}/${kit}/credits.json`); credits = r.ok ? await r.json() : null; } catch (e) { credits = null; }
    const ps = all(game.playlists).filter(p => Object.values(playlistMap()[kit] ?? {}).includes(p.id));
    for ( const p of ps ) for ( const s of all(p.sounds) ) {
      const file = decodeURIComponent(String(s.path).split("/").pop());
      const c = credits?.[file];
      rows.push(`<tr><td>${esc(K.KITS[kit].name)}</td><td>${esc(p.name)}</td><td>${esc(file)}</td><td>${c ? esc(c.source ?? "") : "<em>No credit recorded</em>"}</td><td>${esc(c?.license ?? "")}</td><td>${esc(c?.credit ?? "")}</td></tr>`);
    }
  }
  const html = `<p>Every sound and picture an era kit uses, with where it came from. Add a credits.json to a kit folder to fill in a row.</p>
    <table><thead><tr><th>Kit</th><th>Playlist</th><th>File</th><th>Source</th><th>Licence</th><th>Credit</th></tr></thead><tbody>${rows.join("") || `<tr><td colspan="6">No kit playlists yet.</td></tr>`}</tbody></table>
    <h3>Made for WoDX</h3><p>The dawn, sunset and notice cues, the birdsong and the cock-crow in the module's sounds folder were made for this project by sound synthesis, with no outside source.</p>
    <p>The fonts and their licences are listed in WoDX Chronicle's fonts/licenses folder.</p>`;
  let j = all(game.journal).find(x => x.flags?.[MOD]?.credits);
  j ??= await JournalEntry.create({name: "WoDX · Asset credits", flags: {[MOD]: {credits: true}}});
  const page = all(j.pages).find(p => p.name === "Era kits");
  if ( page ) await page.update({"text.content": html});
  else await j.createEmbeddedDocuments("JournalEntryPage", [{name: "Era kits", type: "text", text: {content: html, format: 1}}]);
  return j;
}

export async function makeHandout({template, title, body, from, date, show = false} = {}) {
  if ( !game.user.isGM ) return null;
  let folder = all(game.folders).find(f => f.type === "JournalEntry" && f.name === "WoDX handouts");
  folder ??= await Folder.create({name: "WoDX handouts", type: "JournalEntry"});
  const name = title || K.HANDOUTS[template]?.label || "Handout";
  const ownership = {default: show ? CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER : CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE};
  return JournalEntry.create({name, folder: folder.id, ownership, flags: {[MOD]: {handout: template}},
    pages: [{name, type: "text", text: {content: K.renderHandout(template, {title, body, from, date}), format: 1}}]});
}

export async function handoutDialog() {
  const kit = currentKit();
  const choices = Object.fromEntries(K.handoutsFor(kit).map(k => [k, `${K.HANDOUTS[k].label} (${K.HANDOUTS[k].eras})`]));
  const data = await wait({window: {title: "New handout"}, position: {width: 520},
    content: `<div class="form-group"><label>Kind</label><select name="template" data-fixed>${opt(choices, K.handoutsFor(kit)[0])}</select></div>
      <div class="form-group"><label>Title</label><input type="text" name="title"></div>
      <div class="form-group"><label>Text</label><textarea name="body" rows="8" placeholder="A blank line starts a new paragraph."></textarea></div>
      <div class="form-group"><label>Signed or from</label><input type="text" name="from"></div>
      <div class="form-group"><label>Date</label><input type="text" name="date"></div>
      <div class="form-group"><label>Players can read it</label><input type="checkbox" name="show"></div>`,
    buttons: [{action: "ok", label: "Make the handout", default: true, callback: formData}, {action: "cancel", label: "Cancel"}]});
  if ( !data || data === "cancel" ) return null;
  const j = await makeHandout(data);
  j?.sheet?.render(true);
  return j;
}

/* ------------------------------------------------------------------ */
/*  The Atmosphere window                                              */
/* ------------------------------------------------------------------ */

const SKY_WORDS = {clear: "Clear", cloudy: "Cloudy", overcast: "Heavy cloud or rain", storm: "Storm or thick fog"};
const PRECIP_WORDS = {none: "None", drizzle: "Drizzle", rain: "Rain", sleet: "Sleet", snow: "Snow", hail: "Hail"};

export async function setByHandDialog(jdn) {
  const d = weatherOn(jdn) ?? {};
  const data = await wait({window: {title: "Set the night's weather"}, position: {width: 460},
    content: `<div class="form-group"><label>Sky</label><select name="sky" data-fixed>${opt(SKY_WORDS, d.sky)}</select></div>
      <div class="form-group"><label>Rain or snow</label><select name="precip" data-fixed>${opt(PRECIP_WORDS, d.precip)}</select></div>
      <div class="form-group"><label>How heavy</label><select name="intensity" data-fixed>${opt({light: "Light", moderate: "Moderate", heavy: "Heavy"}, d.intensity ?? "moderate")}</select></div>
      <div class="form-group"><label>Fog</label><select name="fog" data-fixed>${opt({none: "None", mist: "Mist", thick: "Thick fog"}, d.fog)}</select></div>
      <div class="form-group"><label>Wind</label><select name="wind" data-fixed>${opt({calm: "Calm", breeze: "Breeze", wind: "Strong wind", gale: "Gale"}, d.wind)}</select></div>
      <div class="form-group"><label>Night temperature (°C)</label><input type="number" name="tempNight" value="${Math.round(d.tempNight ?? 5)}" step="1"></div>
      <div class="form-group"><label>Day temperature (°C)</label><input type="number" name="tempDay" value="${Math.round(d.tempDay ?? 12)}" step="1"></div>
      <div class="form-group"><label>Thunder</label><input type="checkbox" name="thunder"${d.thunder ? " checked" : ""}></div>
      <div class="form-group"><label>Snow on the ground</label><input type="checkbox" name="snowLying"${d.snowLying ? " checked" : ""}></div>`,
    buttons: [{action: "ok", label: "Set it", default: true, callback: formData}, {action: "cancel", label: "Cancel"}]});
  if ( !data || data === "cancel" ) return;
  const over = {sky: data.sky, precip: data.precip, intensity: data.precip === "none" ? null : data.intensity, fog: data.fog, wind: data.wind,
    tempNight: Number(data.tempNight) || 0, tempDay: Number(data.tempDay) || 0, thunder: !!data.thunder, snowLying: !!data.snowLying, leaves: false};
  await setNight(jdn, over);
}

async function buildDialog() {
  const kit = currentKit();
  const r = await buildPlaylists(kit);
  const root = setting("kitRoot") || "wodx-kits";
  if ( r.missing ) {
    return wait({window: {title: "Build the era's playlists"}, position: {width: 520},
      content: `<p>There is no folder <code>${esc(r.folder)}</code> in the Data folder yet.</p>
        <p>Make it, with <code>music/calm</code>, <code>music/tension</code>, <code>music/combat</code>, <code>music/sorrow</code> and <code>music/wonder</code>
        for the moods, <code>ambience</code> for loops named after a kind of place or weather (tavern.ogg, street.ogg, rain.ogg), and
        <code>sounds</code> for dawn.ogg, dusk.ogg, notice.ogg, birds.ogg and cock.ogg. A credits.json there records each file's source and licence.</p>
        <p class="wodx-quiet">Or pick the world's own playlists for each mood in the Atmosphere window. The folder setting is "${esc(root)}".</p>`,
      buttons: [{action: "ok", label: "Close", default: true}]});
  }
  const rows = r.plan.map(p => `<li>${esc(p.name)}: ${p.exists ? "already there" : "new"}, ${p.add} of ${p.total} tracks to add${p.keepsOwn ? " (the playlist you chose for this mood stays in use)" : ""}</li>`).join("");
  const go = await wait({window: {title: "Build the era's playlists"}, position: {width: 520},
    content: `<p>From <code>${esc(r.folder)}</code>:</p><ul>${rows || "<li>No sound files found.</li>"}</ul>
      <p class="wodx-quiet">Cues found: ${r.cues.length ? esc(r.cues.join(", ")) : "none (the module's own are used)"}. ${r.other ? `${r.other} files not in a known place were left out.` : ""}</p>`,
    buttons: [{action: "ok", label: "Build them", default: true}, {action: "cancel", label: "Cancel"}]});
  if ( go !== "ok" ) return;
  await buildPlaylists(kit, {apply: true});
  ui.notifications.info("The era's playlists are built.");
}

let appClass = null;
export function AtmosphereClass() {
  if ( appClass ) return appClass;
  const {ApplicationV2} = foundry.applications.api;
  appClass = class extends ApplicationV2 {
    static DEFAULT_OPTIONS = {
      id: "wodx-atmosphere", classes: ["wodx", "watmo-app"],
      window: {title: "Weather and atmosphere", icon: "fa-solid fa-cloud-moon", resizable: true},
      position: {width: 640, height: 720},
      actions: {
        setNight: (ev, t) => setByHandDialog(Number(t.dataset.jdn)),
        clearNight: (ev, t) => setNight(Number(t.dataset.jdn), null),
        post: () => { const d = now(); return d ? postWeather(d, {gm: false}) : null; },
        apply: () => applyWeather({force: true, quiet: true}),
        mood: (ev, t) => playMood(t.dataset.mood),
        stop: () => stopMusic(),
        build: () => buildDialog(),
        credits: async () => (await writeCredits())?.sheet?.render(true),
        handout: () => handoutDialog(),
        cue: (ev, t) => playCue(t.dataset.cue),
        ambience: () => applyAmbience()
      }
    };
    async _renderHTML() {
      const jdn = nightJdn();
      const days = Number.isFinite(jdn) && setting("weather") !== "off" ? Array.from({length: 7}, (_, i) => weatherOn(jdn + i)) : [];
      const today = days[0];
      const fc = days.map((d, i) => `<tr><td>${i === 0 ? "Tonight" : `In ${i} ${i === 1 ? "night" : "nights"}`}</td><td>${esc(d.label)}</td>
        <td>${d.set ? `<button type="button" data-action="clearNight" data-jdn="${d.jdn}" title="Back to the generator">Unset</button>` : ""}
        <button type="button" data-action="setNight" data-jdn="${d.jdn}">Set</button></td></tr>`).join("");
      const sc = canvas?.scene;
      const f = sc?.flags?.[MOD] ?? {};
      const kit = currentKit(), K0 = K.KITS[kit];
      const pls = all(game.playlists).slice().sort((a, b) => a.name.localeCompare(b.name));
      const plOpts = cur => `<option value="">None</option>` + pls.map(p => `<option value="${p.id}"${p.id === cur ? " selected" : ""}>${esc(p.name)}</option>`).join("");
      const map = playlistMap()[kit] ?? {};
      const moods = [...Object.entries(K.MOODS), ["ambience", "Ambience loops (named after a kind of place or weather)"]].map(([m, label]) => {
        const p = playlistFor(kit, m);
        return `<div class="form-group"><label>${esc(label)}</label><select name="pl-${m}" class="watmo-pl" data-mood="${m}">${plOpts(map[m] ?? "")}</select>
          ${m !== "ambience" ? `<button type="button" data-action="mood" data-mood="${m}"${p ? "" : " disabled"}${p?.playing ? ' class="watmo-on"' : ""}>Play</button>` : `<button type="button" data-action="ambience"${p ? "" : " disabled"}>Play for this scene</button>`}</div>`;
      }).join("");
      const div = document.createElement("div");
      div.className = "watmo-body";
      div.innerHTML = `
        <section><h3>The weather</h3>
          ${today ? `<p><b>${esc(today.label)}</b></p>${modifierList(today) ? `<p class="wodx-quiet">Out of doors (house rules):</p>${modifierList(today)}` : ""}
          <p class="wodx-quiet">Climate: ${esc(W.CLIMATES[climate()]?.label)}. Sunlight's sky: ${esc(SKY_WORDS[today.sky])}.</p>
          <table class="watmo-fc" data-fixed><tbody>${fc}</tbody></table>
          <div class="watmo-row"><button type="button" data-action="post"><i class="fa-solid fa-comment"></i> Tell the players</button>
          <button type="button" data-action="apply"><i class="fa-solid fa-rotate"></i> Apply to the scenes now</button></div>`
          : `<p>The weather is off, or the Chronicle Clock is not ready. Turn it on in Configure Settings, WoDX Atmosphere.</p>`}
        </section>
        <section><h3>This scene${sc ? `: ${esc(sc.navName || sc.name)}` : ""}</h3>
          ${sc ? `<div class="form-group"><label>Weather here</label><select name="outdoors" data-fixed>${opt({auto: `Decide for me (now ${isOutdoor(sc) ? "out of doors" : "indoors"})`, on: "Out of doors: weather shows", off: "Indoors: no weather"}, f.outdoors ?? "auto")}</select></div>
          <div class="form-group"><label>Follow the clock's light</label><input type="checkbox" name="followClock"${f.followClock ? " checked" : ""}></div>
          <div class="form-group"><label>Darkness at night (0 to 1)</label><input type="number" name="night" min="0" max="1" step="0.05" value="${Number.isFinite(Number(f.night)) && f.night !== undefined ? f.night : 0.9}"></div>` : "<p>No scene is being viewed.</p>"}
        </section>
        <section><h3>Era kit: ${esc(K0?.name ?? kit)}</h3>
          <p class="wodx-quiet">${esc(K0?.palette ?? "")}</p>
          ${searchBox("select.watmo-pl", "Search playlists…", "Search playlists")}
          ${moods}
          <div class="watmo-row"><button type="button" data-action="stop"><i class="fa-solid fa-stop"></i> Stop the music</button>
          <button type="button" data-action="build"><i class="fa-solid fa-folder-open"></i> Build playlists from the kit folder</button>
          <button type="button" data-action="credits"><i class="fa-solid fa-list"></i> Credits journal</button></div>
          <div class="watmo-row">${Object.entries(K.CUES).map(([c, l]) => `<button type="button" data-action="cue" data-cue="${c}" title="${esc(l)}">Hear ${esc(c)}</button>`).join("")}</div>
        </section>
        <section><h3>Handouts</h3><p class="wodx-quiet">A journal page in the era's style, in the folder WoDX handouts.</p>
          <button type="button" data-action="handout"><i class="fa-solid fa-scroll"></i> New handout</button></section>`;
      return div;
    }
    _replaceHTML(result, content) { content.replaceChildren(result); }
    _onRender() {
      const el = this.element;
      el.querySelectorAll("select.watmo-pl").forEach(s => s.addEventListener("change", async ev => {
        const m = foundry.utils.deepClone(playlistMap());
        const kit = currentKit();
        m[kit] ??= {};
        if ( ev.target.value ) m[kit][ev.target.dataset.mood] = ev.target.value; else delete m[kit][ev.target.dataset.mood];
        await setSetting("playlists", m);
        this.render();
      }));
      const sc = canvas?.scene;
      if ( !sc ) return;
      const save = async (key, value) => { await sc.update({[`flags.${MOD}.${key}`]: value}); if ( isActiveGM() ) await applyWeather({force: true, quiet: true}); this.render(); };
      el.querySelector("select[name=outdoors]")?.addEventListener("change", ev => save("outdoors", ev.target.value));
      el.querySelector("input[name=followClock]")?.addEventListener("change", ev => save("followClock", ev.target.checked));
      el.querySelector("input[name=night]")?.addEventListener("change", ev => save("night", Math.max(0, Math.min(1, Number(ev.target.value) || 0))));
    }
  };
  return appClass;
}
export const AtmosphereApp = {
  instance: null,
  open() {
    if ( !game.user.isGM ) return null;
    const C = AtmosphereClass();
    const height = Math.max(360, Math.min(760, window.innerHeight - 120));
    this.instance ??= new C({position: {height}});
    return this.instance.render({force: true});
  },
  refresh() { if ( this.instance?.rendered ) this.instance.render(); }
};

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

Hooks.once("init", () => {
  if ( !game.world?.flags?.wodx ) return;
  active = true;
  registerSettings();
});

/** Load the calendar and publish the API (at ready; the harness calls it by itself). */
export async function prime() {
  try { CAL ??= await import("../../wodx-chronicle/scripts/calendar.mjs"); } catch (e) { console.warn(`${MOD} | no calendar`, e); }
  const api = {version: VERSION, open: () => AtmosphereApp.open(),
    weather: {now, on: weatherOn, night: nightJdn, set: setNight, apply: applyWeather, modifiers: d => W.modifiers(d ?? now()), climate, isOutdoor,
      moonHidden: () => !!now()?.moonHidden},
    kit: {current: currentKit, play: playMood, stop: stopMusic, build: buildPlaylists, ambience: applyAmbience, cue: playCue, grade: applyGrade, frame: drawFrame, frames: redrawFrames, frameFor: () => K.frameFor(currentKit())},
    dread: {now: dread, rotschreck: dreadRotschreck, apply: applyDread, tick: dreadTick},
    handout: makeHandout, credits: writeCredits, rules: {W, K}};
  game.modules.get(MOD).api = api;
  return api;
}

Hooks.once("ready", async () => {
  if ( !active ) return;
  const api = await prime();
  applyGrade();
  applyDread();
  if ( isActiveGM() ) {
    if ( !setting("lastKit") ) await setSetting("lastKit", currentKit());
    await applyWeather({quiet: false});
  }
  Hooks.callAll("wodxAtmosphereReady", api);
});

Hooks.on("updateWorldTime", (time, delta) => {
  if ( !active ) return;
  dreadTick(time, delta);
  if ( !isActiveGM() ) return;
  clearTimeout(timeTimer);
  // The clock can tick many times in a row; work once it settles
  timeTimer = setTimeout(() => applyWeather().catch?.(() => null), 250);
});
let timeTimer = null;
Hooks.on("wodxSkipEnd", () => { if ( active && isActiveGM() ) applyWeather({force: true}); });
Hooks.on("wodxEraApplied", () => { if ( active ) { onEraApplied().catch(e => console.warn(`${MOD} | era`, e)); redrawFrames(); } });
Hooks.on("refreshToken", token => { if ( active ) { try { drawFrame(token); } catch (e) { console.warn(`${MOD} | frame`, e); } } });
Hooks.on("canvasReady", () => {
  if ( !active ) return;
  applyGrade();
  if ( isActiveGM() && canvas.scene ) { const d = now(); applySceneEffect(canvas.scene, d).then(() => applyLight(canvas.scene, d)).catch(e => console.warn(`${MOD} | scene`, e)); }
});
Hooks.on("updateScene", (scene, change) => {
  if ( !active || !isActiveGM() ) return;
  if ( change.active ) { const d = now(); applySceneEffect(scene, d).then(() => applyLight(scene, d)).then(() => ambienceSoon()).catch(e => console.warn(`${MOD} | scene`, e)); }
});
let fights = 0;
Hooks.on("combatStart", () => {
  if ( !active || !isActiveGM() || !setting("music") || !playlistFor(currentKit(), "combat") ) return;
  fights++;
  playMood("combat", {remember: false});
});
Hooks.on("deleteCombat", () => {
  if ( !active || !isActiveGM() || !setting("music") || fights <= 0 ) return;
  if ( all(game.combats).some(c => c.started) ) return;
  fights = 0;
  const back = setting("mood") || "calm";
  if ( playlistFor(currentKit(), back) ) playMood(back);
});
// Something new in the approval queue: the Storyteller hears the notice cue
let pending = null;
Hooks.on("updateSetting", s => {
  if ( !active || !game.user.isGM || s?.key !== "wodx-chronicle.approvals" ) return;
  let n = 0;
  try { n = (game.settings.get("wodx-chronicle", "approvals")?.pending ?? []).length; } catch (e) { n = 0; }
  if ( pending !== null && n > pending ) playCue("notice");
  pending = n;
});
Hooks.on("renderChatMessageHTML", (msg, html) => {
  html.querySelector?.("[data-watmo=open]")?.addEventListener("click", () => AtmosphereApp.open());
});
Hooks.on("getSceneControlButtons", controls => {
  if ( !active ) return;
  const tokens = controls.tokens ?? controls.token;
  if ( !tokens?.tools ) return;
  tokens.tools.wodxAtmosphere = {name: "wodxAtmosphere", title: "Weather and atmosphere", icon: "fa-solid fa-cloud-moon", order: 117,
    button: true, visible: game.user.isGM, onChange: () => AtmosphereApp.open()};
});
