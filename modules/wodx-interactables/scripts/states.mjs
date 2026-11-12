/**
 * WoDX Interactables 0.12.0: maps that show what changed, and the event that tells the world.
 *
 *   Pictures  A tile can carry a picture for each state of the object it is (a chest open, forced, emptied), or follow
 *             a door or window by its wall id. When the flags change, the active Storyteller's client swaps the tile's
 *             picture, so every player sees it and it stays after a reload. Undo puts the flags back, and the picture
 *             follows. With no picture set, each client draws a small marker with the state's word.
 *   Sounds    Ambient sounds tied to a tile play while its object is active (a fire burning, a wire live, an alarm
 *             ringing). A tile's own change sound plays once, as far as the noise carries, on clients that can hear it.
 *   The moment A floating word over the object, and for loud events a short flash, on clients that can see it. Each
 *             player picks Full, Light or Off in Configure Settings ("Map effects").
 *   Events    Every applied card becomes one map event, passed on by the hook wodxMapEvent (and again with undone: true
 *             when the Storyteller presses Undo). The active Storyteller's client sends it; nothing here acts on it.
 */
import * as S from "./state-rules.mjs";

const MOD = "wodx-interactables";
const SOCKET = `module.${MOD}`;
const RECENT = 50;

let api = null; // {describeObj, describeWall, describeTile, objectIn}
const recent = [];
const sent = new Map(); // message id -> "done" | "undone"

const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return null; } };
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const flagsOf = doc => doc?.flags?.[MOD] ?? {};
const tilesOf = scene => scene?.tiles?.contents ?? [...(scene?.tiles?.values?.() ?? [])];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);

export function registerStateSettings() {
  game.settings.register(MOD, "effects", {
    name: "Map effects", hint: "What this computer shows when something on the map changes: a floating word, a short flash for loud events, and the object's sound. The change itself always shows.",
    scope: "client", config: true, type: String, default: "full", choices: S.EFFECTS
  });
  game.settings.register(MOD, "markers", {
    name: "State markers", hint: "A tile with no picture for its new state (a chest forced, an altar desecrated) shows a small marker with the state's word. Off: only tiles with their own pictures change.",
    scope: "world", config: true, type: Boolean, default: true, onChange: () => drawMarkers()
  });
}

/* ------------------------------------------------------------------ */
/*  What a tile shows                                                  */
/* ------------------------------------------------------------------ */

/** The object a tile shows: its own, or the door or window it follows. Returns {o, f, follows} or null. */
export function shownBy(tile) {
  const tf = flagsOf(tile);
  if ( tf.follows ) {
    const wall = tile.parent?.walls?.get?.(tf.follows);
    if ( wall ) { const o = api.describeWall(wall); return o ? {o, f: flagsOf(wall), follows: wall} : null; }
    return null;
  }
  const o = api.describeTile(tile);
  return o ? {o, f: tf, follows: null} : null;
}
/** A tile's group, state and look now. */
export function lookOf(tile, {markers = setting("markers") !== false} = {}) {
  const s = shownBy(tile);
  if ( !s ) return null;
  const g = S.groupOf(s.o), state = S.stateOf(s.o, s.f), tf = flagsOf(tile);
  const look = S.lookFor(g, state, {art: tf.art ?? {}, base: tf.artBase ?? null, current: tile.texture?.src ?? null, markers: markers && !tf.noMarker});
  return {g, state, look, o: s.o};
}

/** Active Storyteller: bring a tile's picture and sounds in line with its object's state. */
export async function syncTile(tile) {
  if ( !isActiveGM() || !tile ) return null;
  const L = lookOf(tile);
  if ( !L ) return null;
  const tf = flagsOf(tile), update = {};
  if ( L.look.src ) {
    update["texture.src"] = L.look.src;
    if ( !tf.artBase && tile.texture?.src ) update[`flags.${MOD}.artBase`] = tile.texture.src;
  }
  if ( Object.keys(update).length ) await tile.update(update, {wodxArt: true});
  // Ambient sounds tied to the tile
  const ids = Array.isArray(tf.soundIds) ? tf.soundIds : [];
  if ( ids.length ) {
    const on = S.soundOn(L.g, L.state, {alarm: !!L.o.alarm});
    for ( const id of ids ) {
      const snd = tile.parent?.sounds?.get?.(id);
      if ( snd && !!snd.hidden === on ) await snd.update({hidden: !on});
    }
  }
  return L;
}
const syncFollowers = async wall => { for ( const t of tilesOf(wall.parent) ) if ( flagsOf(t).follows === wall.id ) await syncTile(t); };

/** Load every state picture on the scene in view, so a swap does not stall. */
async function preload() {
  const paths = new Set();
  for ( const t of tilesOf(canvas?.scene) ) for ( const p of Object.values(flagsOf(t).art ?? {}) ) if ( p ) paths.add(p);
  if ( !paths.size ) return;
  const TL = foundry.canvas?.TextureLoader ?? globalThis.TextureLoader;
  try { await TL?.loader?.load?.([...paths], {message: null}); } catch (e) { console.warn(`${MOD} | preload`, e); }
}

/* ------------------------------------------------------------------ */
/*  Markers (drawn on each client, never saved)                        */
/* ------------------------------------------------------------------ */

let layer = null, pending = null, candidates = 1;
const sees = (p, scene = canvas?.scene) => {
  if ( game.user?.isGM ) return true;
  if ( !p || scene?.id !== canvas?.scene?.id ) return false;
  try { return canvas.visibility?.testVisibility?.(p, {tolerance: (canvas.grid?.size ?? 100) / 4}) ?? true; } catch (e) { return true; }
};
export function drawMarkers() {
  if ( pending ) return;
  pending = setTimeout(() => { pending = null; try { redraw(); } catch (e) { console.error(`${MOD} | markers`, e); } }, 50);
}
function redraw() {
  if ( !canvas?.ready || !canvas.interface || !globalThis.PIXI ) return;
  if ( !layer || layer.destroyed ) { layer = new PIXI.Container(); layer.name = "wodxStateMarkers"; layer.eventMode = "none"; canvas.interface.addChild(layer); }
  for ( const c of layer.removeChildren() ) c.destroy({children: true});
  candidates = 0;
  const grid = canvas.grid?.size ?? 100;
  for ( const t of tilesOf(canvas.scene) ) {
    if ( t.hidden && !game.user.isGM ) continue;
    const L = lookOf(t);
    if ( !L?.look.marker ) continue;
    candidates++;
    const w = Math.abs(Number(t.width) || grid), h = Math.abs(Number(t.height) || grid), cx = (Number(t.x) || 0) + w / 2, cy = (Number(t.y) || 0) + h / 2;
    if ( !sees({x: cx, y: cy}) ) continue;
    const m = new PIXI.Container();
    const r = Math.max(grid * 0.3, Math.min(w, h) / 2);
    const ring = new PIXI.Graphics();
    ring.lineStyle?.(3, 0xd8c08a, 0.85);
    ring.drawCircle?.(0, 0, r);
    m.addChild(ring);
    const Text = foundry.canvas?.containers?.PreciseText ?? globalThis.PreciseText ?? PIXI.Text;
    const style = (CONFIG.canvasTextStyle?.clone?.() ?? new PIXI.TextStyle({fill: 0xffffff, stroke: 0x000000, strokeThickness: 4}));
    style.fontSize = Math.max(14, Math.round(grid / 5));
    const label = new Text(L.look.marker, style);
    label.anchor?.set?.(0.5, 0);
    label.position.set(0, r + 4);
    m.addChild(label);
    m.position.set(cx, cy);
    m.alpha = 0.9;
    layer.addChild(m);
  }
}

/* ------------------------------------------------------------------ */
/*  Map events                                                         */
/* ------------------------------------------------------------------ */

/** A stand-in for an object as it was in a card's snapshot, enough for describe*(). */
function asItWas(doc, snap) {
  const tile = doc.documentName === "Tile";
  return {documentName: doc.documentName, id: doc.id, parent: doc.parent, c: doc.c, door: doc.door, texture: doc.texture,
    ds: tile || snap?.ds === null || snap?.ds === undefined ? doc.ds : snap.ds, hidden: snap?.hidden ?? doc.hidden,
    x: doc.x, y: doc.y, width: doc.width, height: doc.height, flags: {[MOD]: snap?.flags ?? flagsOf(doc)}};
}
const centreOf = doc => {
  if ( Array.isArray(doc?.c) ) return {x: (doc.c[0] + doc.c[2]) / 2, y: (doc.c[1] + doc.c[3]) / 2};
  return {x: (Number(doc?.x) || 0) + Math.abs(Number(doc?.width) || 0) / 2, y: (Number(doc?.y) || 0) + Math.abs(Number(doc?.height) || 0) / 2};
};
/** The NPC place a point is in: a tagged region first, then the scene. */
function placeAt(scene, p) {
  const tag = d => d?.flags?.["wodx-npc"]?.place;
  for ( const r of scene?.regions?.contents ?? [...(scene?.regions?.values?.() ?? [])] ) {
    if ( !tag(r)?.kind ) continue;
    let inside = false;
    try { inside = !!r.testPoint?.({x: p.x, y: p.y, elevation: 0}) || !!r.object?.testPoint?.({x: p.x, y: p.y}, 0); } catch (e) { inside = false; }
    if ( inside ) return {id: r.uuid, kind: tag(r).kind, owner: tag(r).owner ?? null};
  }
  const s = tag(scene);
  return s?.kind ? {id: scene.uuid, kind: s.kind, owner: s.owner ?? null} : {id: scene?.uuid ?? null, kind: null, owner: null};
}

/** The map event a WoDX card makes, or null. */
export function eventFromCard(msg) {
  const ask = msg?.flags?.[MOD]?.ask, done = msg?.flags?.[MOD]?.done;
  if ( !ask || !done ) return null;
  const scene = game.scenes?.get?.(ask.scene), doc = ask.wall === "_search" ? null : api.objectIn(scene, ask.wall);
  // A watch point, a mount or a climb sends its own event, with what it saw, who is aboard or how far a fall was
  if ( doc && (flagsOf(doc).watch || flagsOf(doc).mount || flagsOf(doc).climb) ) return null;
  const found = (done.found?.length ?? 0) + (done.revealed?.length ?? 0);
  let before = null, after = null, g = "plain", name = null;
  if ( doc ) {
    const now = api.describeObj(doc), was = api.describeObj(asItWas(doc, done.snap));
    g = S.groupOf(now);
    after = S.stateOf(now, flagsOf(doc));
    before = was ? S.stateOf(was, done.snap?.flags ?? {}) : after;
    if ( g === "light" && Array.isArray(done.snap?.lights) && !was?.broken ) before = done.snap.lights.some(l => !l.hidden) ? "lit" : "dark";
    try { name = api.rules?.nameOf?.(now) ?? null; } catch (e) { name = null; }
  }
  const kind = S.eventKind(ask.op, done.result, before, after, {alarm: !!done.alarm, waiting: !!done.waiting, noise: done.noise, found});
  if ( !kind ) return null;
  const p = doc ? centreOf(doc) : null, place = scene ? placeAt(scene, p ?? {x: 0, y: 0}) : {};
  const tok = ask.token ? (() => { try { return fromUuidSync?.(ask.token); } catch (e) { return null; } })() : null;
  return S.mapEvent({kind, scene: scene?.id, place: place.id, at: done.worldTime ?? game.time?.worldTime, noise: done.noise,
    who: ask.token, whoName: tok?.name ?? msg.speaker?.alias, object: doc?.id ?? null, objectName: name, objectType: doc?.documentName,
    state: after, before, x: p?.x, y: p?.y, owner: place.owner ?? null, heard: done.heard ?? [],
    supernatural: S.isSupernatural(kind), message: msg.id, undone: !!done.undone, placeKind: place.kind});
}

/** Active Storyteller: a card was made or changed. Passes the event on once, and once more if it is undone. */
export function onCard(msg) {
  if ( !isActiveGM() || !msg?.flags?.[MOD]?.done ) return null;
  const done = msg.flags[MOD].done, mark = done.undone ? "undone" : "done";
  if ( sent.get(msg.id) === mark ) return null;
  const ev = eventFromCard(msg);
  sent.set(msg.id, mark);
  if ( sent.size > 500 ) sent.delete(sent.keys().next().value);
  if ( !ev ) return null;
  recent.push(ev);
  if ( recent.length > RECENT ) recent.shift();
  Hooks.callAll("wodxMapEvent", ev);
  if ( !ev.undone ) {
    const doc = api.objectIn(game.scenes.get(ev.scene), ev.object);
    const src = flagsOf(doc).fxSound ?? (doc?.documentName === "Wall" ? followerSound(doc) : "");
    const payload = {type: "fx", ev, src: S.cleanPath(src)};
    try { game.socket?.emit?.(SOCKET, payload); } catch (e) { /* alone */ }
    play(payload);
  }
  return ev;
}
/**
 * Active Storyteller: an event a result sends by itself (a look out of a window, a call, getting on a horse, a crash),
 * in the same shape as a card's. extra: fields of its own (target, seen, how, atReins), which never replace the shape's.
 */
export function publish(kind, {scene, doc, tokDoc, noise = "silent", heard = [], supernatural = false, objectName = null, objectKind = null, message = null, extra = {}, at = null} = {}) {
  const sc = scene ?? doc?.parent ?? null;
  // at (0.28.0): a spot on the map for an event with no object (a fight, a chase)
  const p = doc ? centreOf(doc) : (at && Number.isFinite(Number(at.x)) ? {x: Number(at.x), y: Number(at.y)} : null), place = sc ? placeAt(sc, p ?? {x: 0, y: 0}) : {};
  const ev = {...extra, ...S.mapEvent({kind, scene: sc?.id, place: place.id, at: game.time?.worldTime, noise, who: tokDoc?.uuid, whoName: tokDoc?.name ?? tokDoc?.actor?.name,
    object: doc?.id ?? null, objectName, objectKind, objectType: doc?.documentName, x: p?.x, y: p?.y, owner: place.owner ?? null, placeKind: place.kind,
    heard, supernatural: supernatural || S.isSupernatural(kind), message})};
  recent.push(ev);
  if ( recent.length > RECENT ) recent.shift();
  Hooks.callAll("wodxMapEvent", ev);
  if ( S.EVENT_WORDS[ev.kind] || ev.noise === "loud" ) {
    const payload = {type: "fx", ev, src: S.cleanPath(flagsOf(doc).fxSound ?? "")};
    try { game.socket?.emit?.(SOCKET, payload); } catch (e) { /* alone */ }
    try { play(payload); } catch (e) { /* no canvas */ }
  }
  return ev;
}
const followerSound = wall => tilesOf(wall.parent).find(t => flagsOf(t).follows === wall.id && flagsOf(t).fxSound)?.flags?.[MOD]?.fxSound ?? "";

/* ------------------------------------------------------------------ */
/*  The moment, on each client                                         */
/* ------------------------------------------------------------------ */

export function play({ev, src} = {}) {
  if ( !ev || ev.scene !== canvas?.scene?.id || !canvas?.ready ) return null;
  const p = {x: ev.x, y: ev.y};
  if ( !Number.isFinite(p.x) || !Number.isFinite(p.y) ) return null;
  const fb = S.feedbackFor(ev, {effects: setting("effects") ?? "full", sees: sees(p), src});
  try {
    if ( fb.word ) {
      const A = CONST.TEXT_ANCHOR_POINTS ?? {};
      canvas.interface?.createScrollingText?.(p, fb.word, {anchor: A.CENTER, direction: A.TOP, distance: (canvas.grid?.size ?? 100), fontSize: 28,
        fill: 0xf0e6c8, stroke: 0x000000, strokeThickness: 4, jitter: 0.2});
    }
    if ( fb.flash ) flash(p);
    if ( fb.sound ) {
      const d = canvas.scene?.grid?.distance ?? canvas.dimensions?.distance ?? 5, units = canvas.scene?.grid?.units ?? "ft";
      const perYard = /m|meter|metre|yd|yard/i.test(units) ? 1 : 3;
      const radius = fb.sound.yards * perYard / d * (canvas.grid?.size ?? 100);
      const layerS = canvas.sounds;
      if ( layerS?.playAtPosition ) layerS.playAtPosition(fb.sound.src, p, radius, {walls: true, easing: true, volume: 0.8});
      else if ( sees(p) ) (foundry.audio?.AudioHelper ?? globalThis.AudioHelper)?.play?.({src: fb.sound.src, volume: 0.6, loop: false, autoplay: true}, false);
    }
  } catch (e) { console.warn(`${MOD} | effect`, e); }
  return fb;
}
function flash(p) {
  if ( !globalThis.PIXI || !canvas.interface ) return;
  const g = new PIXI.Graphics();
  const r = (canvas.grid?.size ?? 100) * 0.8;
  g.beginFill?.(0xfff1c2, 0.5); g.drawCircle?.(0, 0, r); g.endFill?.();
  g.position.set(p.x, p.y);
  canvas.interface.addChild(g);
  const start = performance.now(), ms = 250;
  const tick = () => {
    const k = (performance.now() - start) / ms;
    if ( k >= 1 || g.destroyed ) { canvas.app?.ticker?.remove?.(tick); if ( !g.destroyed ) g.destroy(); return; }
    g.alpha = 1 - k; g.scale.set(1 + k * 0.5);
  };
  canvas.app?.ticker?.add?.(tick);
}

/* ------------------------------------------------------------------ */
/*  The tile config: pictures and sounds                               */
/* ------------------------------------------------------------------ */

export function statesConfigHtml(tile) {
  const tf = flagsOf(tile), p = `flags.${MOD}`;
  const s = shownBy(tile), g = s ? S.groupOf(s.o) : "plain";
  const field = (label, inner, hint = "") => `<div class="form-group"><label>${esc(label)}</label><div class="form-fields">${inner}</div>${hint ? `<p class="hint">${esc(hint)}</p>` : ""}</div>`;
  const pick = (name, value, type = "image") => `<input type="text" name="${name}" value="${esc(value ?? "")}" placeholder="Path to a file"><button type="button" class="wix-pick" data-target="${name}" data-type="${type}" title="Browse"><i class="fa-solid fa-file-import"></i></button>`;
  const rows = g === "plain"
    ? `<p class="hint">Pick what this tile is in a section above (or a door or window for it to follow) and save, then its states appear here.</p>`
    : Object.entries(S.STATES[g]).map(([k, label], i) => field(`${label}${i === 0 ? " (usual)" : ""}`, pick(`${p}.art.${k}`, tf.art?.[k]))).join("");
  return `<fieldset class="wix-config wix-states"><legend>WoDX: pictures and sounds</legend>
    <p class="hint">The tile's picture changes with its state, for every player. Leave a state blank to keep the usual picture; a small marker then shows the change. Night pictures for night maps.</p>
    ${field("Follows a door or window", `<input type="text" name="${p}.follows" value="${esc(tf.follows ?? "")}" placeholder="The wall's id">`, "Draw this tile over a door or window and paste the wall's id: the tile then shows that door's state (open, forced, broken).")}
    ${rows}
    ${field("No marker", `<input type="checkbox" name="${p}.noMarker"${tf.noMarker ? " checked" : ""}>`)}
    ${field("Sound when it changes", pick(`${p}.fxSound`, tf.fxSound, "audio"), "Played once, as far as the noise carries, to players who can hear it.")}
    ${field("Sounds tied to it", `<input type="text" name="${p}.soundIds" value="${esc((tf.soundIds ?? []).join(", "))}" placeholder="Ambient sound ids, separated by commas">`, "They play while it is active: a fire burning, a wire live, a light lit, an alarm ringing.")}
  </fieldset>`;
}
function onRenderTileConfig(app, html) {
  if ( !game.user.isGM ) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  const form = root?.tagName === "FORM" ? root : root?.querySelector("form") ?? app.form;
  if ( !form || form.querySelector(".wix-states") ) return;
  const wrap = document.createElement("div");
  wrap.innerHTML = statesConfigHtml(app.document ?? app.object);
  const el = wrap.firstElementChild;
  const footer = form.querySelector("footer, .form-footer, .sheet-footer");
  if ( footer ) footer.before(el); else form.appendChild(el);
  el.querySelectorAll("button.wix-pick").forEach(b => b.addEventListener("click", ev => {
    ev.preventDefault();
    const input = form.querySelector(`[name="${b.dataset.target}"]`);
    const FP = foundry.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
    if ( !FP || !input ) return;
    new FP({type: b.dataset.type, current: input.value, callback: path => { input.value = path; }}).render(true);
  }));
  app.setPosition?.({height: "auto"});
}
function onPreUpdateTile(doc, changes, options) {
  const f = changes?.flags?.[MOD];
  if ( !f || typeof f !== "object" ) return;
  if ( "follows" in f ) f.follows = String(f.follows ?? "").trim().replace(/[^A-Za-z0-9]/g, "").slice(0, 32) || null;
  if ( "fxSound" in f ) f.fxSound = S.cleanPath(f.fxSound) || null;
  if ( "soundIds" in f && !Array.isArray(f.soundIds) ) f.soundIds = String(f.soundIds ?? "").split(/[\s,]+/).map(x => x.replace(/[^A-Za-z0-9]/g, "")).filter(Boolean).slice(0, 12);
  if ( f.art && typeof f.art === "object" ) for ( const k of Object.keys(f.art) ) f.art[k] = S.cleanPath(f.art[k]) || null;
}

/* ------------------------------------------------------------------ */
/*  Set up                                                             */
/* ------------------------------------------------------------------ */

const touchesFlags = changes => !!changes?.flags?.[MOD] || "ds" in (changes ?? {}) || "hidden" in (changes ?? {}) || "texture" in (changes ?? {});
export function setupStates(fns) {
  api = fns;
  Hooks.on("updateTile", (doc, changes, options) => {
    if ( touchesFlags(changes) ) drawMarkers();
    if ( options?.wodxArt || !isActiveGM() ) return;
    if ( changes?.flags?.[MOD] || "hidden" in (changes ?? {}) ) syncTile(doc).catch(e => console.error(`${MOD} |`, e));
  });
  Hooks.on("updateWall", (doc, changes) => {
    if ( !touchesFlags(changes) ) return;
    drawMarkers();
    if ( isActiveGM() ) syncFollowers(doc).catch(e => console.error(`${MOD} |`, e));
  });
  Hooks.on("updateAmbientLight", () => drawMarkers());
  Hooks.on("createTile", () => drawMarkers());
  Hooks.on("deleteTile", () => drawMarkers());
  Hooks.on("canvasReady", () => { layer = null; drawMarkers(); preload(); });
  // Vision changes often: only redraw when some tile has a marker to show or hide
  Hooks.on("sightRefresh", () => { if ( candidates && !game.user?.isGM ) drawMarkers(); });
  Hooks.on("createChatMessage", msg => { try { onCard(msg); } catch (e) { console.error(`${MOD} |`, e); } });
  Hooks.on("updateChatMessage", (msg, changes) => { if ( !changes?.flags?.[MOD]?.done ) return; try { onCard(msg); } catch (e) { console.error(`${MOD} |`, e); } });
  Hooks.on("renderTileConfig", onRenderTileConfig);
  Hooks.on("preUpdateTile", onPreUpdateTile);
  Hooks.once("ready", () => game.socket?.on?.(SOCKET, data => { if ( data?.type === "fx" ) play(data); }));
  return {syncTile, lookOf, shownBy, eventFromCard, onCard, play, drawMarkers, statesConfigHtml, recent: () => [...recent], stateRules: S};
}
