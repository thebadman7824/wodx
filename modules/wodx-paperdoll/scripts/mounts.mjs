/**
 * Mounts and vehicles as sprites (decision B4970). A mount tile, a vehicle's token or a beast that can be ridden shows
 * the drawn look of its kind for its year, in its colours, turned the way it goes; everyone aboard is drawn in a seat
 * with their own figure. Everything is drawn on each computer: nothing is saved but the Storyteller's picks
 * (flags.wodx-paperdoll.mount {look, style, scheme, off}). Rules in mount-rules.mjs.
 */
import * as MR from "./mount-rules.mjs";
import * as SR from "./sprite-rules.mjs";
import {seated} from "./sprites.mjs";
const MOD = "wodx-paperdoll", IX = "wodx-interactables", VEHICLE = "wodx-interactables.vehicle";
const states = new Map(), sheets = new Map(), frames = new Map(), cuts = new Map(), held = new Map(), shown = new Map();
let started = false, ready = false;
const on = () => { try { return game.settings.get(MOD, "mountLooks") !== false && game.settings.get(MOD, "sprites") !== false; } catch (e) { return true; } };
const crisp = tex => { const b = tex?.baseTexture ?? tex?.source; if ( b ) b.scaleMode = globalThis.PIXI?.SCALE_MODES?.NEAREST ?? "nearest"; return tex; };
const yearNow = () => { try { const y = game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.(); return Number.isFinite(y) ? y : 0; } catch (e) { return 0; } };

export function registerMountSettings() {
  game.settings.register(MOD, "mountLooks", {scope: "world", config: true, name: "Mounts and vehicles are drawn as sprites",
    hint: "Horses, carts, cars, boats, aircraft and the rest show a drawn figure for their year, with everyone aboard in a seat. Off: they keep their own pictures.",
    type: Boolean, default: true, onChange: () => releaseAll()});
}

/** What a thing on the map is as a mount: {kind, year, own, pick, colour} or null. own: it already wears a sprite of its own. */
export function mountOf(doc) {
  if ( !doc ) return null;
  const pick = doc.flags?.[MOD]?.mount ?? {}, f = doc.flags?.[IX] ?? {};
  let kind = null, year = 0, colour = "";
  if ( doc.documentName === "Tile" ) { if ( !f.mount ) return null; kind = f.mountKind || "horse"; year = Number(f.built) || 0; }
  else if ( doc.documentName === "Token" ) {
    const a = doc.actor;
    if ( a?.type === VEHICLE ) { kind = a.system?.kind || "car"; year = Number(a.system?.built) || 0; colour = a.system?.colour ?? ""; }
    else {
      try { kind = game.modules.get(IX)?.api?.beastOf?.(doc) ?? null; } catch (e) { kind = null; }
      if ( !kind && typeof f.mountable === "string" && MR.kindOf(f.mountable) ) kind = f.mountable;
    }
  }
  if ( !kind || !MR.kindOf(kind) ) return null;
  return {kind, year: year || yearNow(), own: !!doc.flags?.[MOD]?.sprite, pick, colour};
}

/** The look and colours a thing shows: {kind, look, scheme} or null. */
export function lookOf(doc) {
  const m = mountOf(doc);
  if ( !m ) return null;
  const seed = doc.actor?.id && doc.documentName === "Token" && doc.actorLink ? doc.actor.id : doc.id;
  const look = MR.lookFor(m.kind, m.year, {look: m.pick.look, style: m.pick.style, seed});
  return look ? {...m, look, scheme: MR.schemeFor(look, {scheme: m.pick.scheme, colour: m.colour, seed})} : null;
}

/* A look's sheet in a scheme's colours: read once, recoloured on a canvas, kept. */
function sheet(kind, look, scheme) {
  const id = `${kind}/${look.id}/${scheme?.id ?? ""}`;
  if ( sheets.has(id) ) return sheets.get(id);
  sheets.set(id, null);
  const img = new Image();
  img.onload = () => {
    try {
      const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext("2d", {willReadFrequently: true}); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height);
      if ( scheme ) { MR.recolour(d.data, scheme); g.putImageData(d, 0, 0); }
      sheets.set(id, crisp(PIXI.Texture.from(c)));
    } catch (e) { console.warn(`${MOD} | mount sheet ${id}`, e); }
  };
  img.onerror = e => console.warn(`${MOD} | mount sheet ${id}`, e);
  img.src = MR.sheetPath(kind, look);
  return null;
}
function frame(kind, look, scheme, facing, col) {
  const b = sheet(kind, look, scheme);
  if ( !b ) return null;
  const key = `${kind}/${look.id}/${scheme?.id ?? ""}:${facing}:${col}`;
  if ( !frames.has(key) ) { const r = MR.rectOf(look, facing, col); frames.set(key, new PIXI.Texture(b.baseTexture ?? b.source ?? b, new PIXI.Rectangle(r.x, r.y, r.width, r.height))); }
  return frames.get(key);
}
/* The top rows of a rider's own frame: the rest is out of sight behind a door or under a saddle cloth. */
function cut(tex, rows) {
  const f = tex?.frame, b = tex?.baseTexture ?? tex?.source;
  if ( !f || !b || rows >= f.height ) return tex;
  const key = `${b.uid ?? b.cacheId ?? ""}:${f.x}:${f.y}:${rows}`;
  if ( !cuts.has(key) ) { if ( cuts.size > 4000 ) cuts.clear(); cuts.set(key, new PIXI.Texture(b, new PIXI.Rectangle(f.x, f.y, f.width, rows))); }
  return cuts.get(key);
}

const tokenByUuid = uuid => { const id = String(uuid ?? "").split(".").pop(); return canvas.tokens?.get(id) ?? null; };
const aboard = doc => { const f = doc.flags?.[IX] ?? {}; return [f.driver, ...(Array.isArray(f.riders) ? f.riders : [])].filter(r => r?.t); };
const centreOf = obj => { const d = obj.document, g = canvas.grid?.size || 100, tile = d.documentName === "Tile";
  const w = tile ? d.width : d.width * g, h = tile ? d.height : d.height * g;
  return {x: obj.position.x + w / 2, y: obj.position.y + h / 2, w, h}; };

/* Give a picture back to Foundry: its own size, place and anchor again. */
function release(obj) {
  const m = obj?.mesh, d = obj?.document;
  if ( !m || m.destroyed ) return;
  m.alpha = d?.alpha ?? 1;
  if ( m.anchor ) m.anchor.set(d?.texture?.anchorX ?? 0.5, d?.texture?.anchorY ?? 0.5);
  seated.delete(obj.id);
  try { obj.renderFlags?.set({refreshMesh: true, refreshPosition: true, refreshSize: true, refreshState: true}); if ( d?.documentName === "Tile" ) obj.renderFlags?.set({refreshShape: true}); if ( d?.documentName === "Tile" ) obj.draw?.(); } catch (e) { /* gone */ }
}
function releaseAll() { for ( const [id, obj] of held ) release(obj); held.clear(); shown.clear(); seated.clear(); }

function tick() {
  if ( !globalThis.canvas?.ready || !ready ) return;
  if ( !on() ) { if ( held.size ) releaseAll(); return; }
  const grid = canvas.grid?.size || 100, k = MR.pixel(grid), now = performance.now(), seen = new Set();
  for ( const obj of [...(canvas.tiles?.placeables ?? []), ...(canvas.tokens?.placeables ?? [])] ) {
    const doc = obj.document, m = obj.mesh;
    if ( !m || m.destroyed ) continue;
    const L = lookOf(doc);
    if ( !L || L.pick.off ) continue;
    const key = doc.uuid, c = centreOf(obj);
    const st = SR.step(states.get(key) ?? SR.start(c, doc.documentName === "Tile" ? "right" : "down"), c, grid, now, 220);
    states.set(key, st); seen.add(key);
    let ground;
    if ( L.own ) {
      // a beast that wears its own figure keeps it; its riders sit by the kind's first look
      ground = {x: m.position.x, y: m.position.y + (SR.FEET - (m.anchor?.y ?? SR.TOKEN.anchorY)) * Math.abs(m.height)};
    } else {
      ground = {x: c.x, y: c.y + c.h / 2 - grid * 0.15};
      const col = MR.spins(L.kind) ? Math.floor(now / 90) % (MR.kindOf(L.kind)?.frames ?? 1) : MR.colOf(L.kind, st, grid);
      const tex = frame(L.kind, L.look, L.scheme, st.facing, col) ?? frame(L.kind, L.look, L.scheme, st.facing, 0);
      if ( tex ) {
        if ( m.texture !== tex ) m.texture = tex;
        m.anchor.set(0.5, L.look.ground / L.look.h);
        m.width = L.look.w * k; m.height = L.look.h * k;
        m.position.set(ground.x, ground.y);
        held.set(key, obj); shown.set(key, {kind: L.kind, look: L.look.id, scheme: L.scheme?.id ?? "", facing: st.facing, col, x: ground.x, y: ground.y, width: m.width, height: m.height});
      } else sheet(L.kind, L.look, L.scheme);
    }
    // everyone aboard, in a seat, facing as the mount faces
    const riders = aboard(doc);
    for ( let i = 0; i < riders.length; i++ ) {
      const tok = tokenByUuid(riders[i].t), rm = tok?.mesh;
      if ( !rm || rm.destroyed ) continue;
      const seat = MR.seatOf(L.look, st.facing, i), p = MR.seatPoint(L.look, seat, ground, k), d = MR.riderDraw(seat, p, k);
      const rk = tok.document.uuid; seen.add(rk); held.set(rk, tok);
      seated.set(tok.id, {facing: st.facing, pose: seat.pose, moving: st.moving});
      shown.set(rk, {seat: i, on: key, hidden: d.hidden, x: d.x, y: d.y, rows: d.rows, pose: seat.pose, facing: st.facing});
      if ( d.hidden ) { rm.alpha = 0; continue; }
      rm.alpha = tok.document.alpha ?? 1;
      if ( tok.document.flags?.[MOD]?.sprite && rm.texture?.frame?.height >= d.rows ) {
        const t = cut(rm.texture, d.rows);
        if ( rm.texture !== t ) rm.texture = t;
        rm.anchor.set(0.5, d.anchorY); rm.width = d.width; rm.height = d.height;
        rm.position.set(d.x, d.y);
      } else rm.position.set(p.x, p.y - Math.abs(rm.height) * 0.3);
      if ( "sort" in rm && Number.isFinite(m.sort) && rm.sort <= m.sort ) rm.sort = m.sort + 1 + i;
    }
  }
  for ( const [key, obj] of held ) if ( !seen.has(key) ) { release(obj); held.delete(key); shown.delete(key); states.delete(key); }
}

/** The Storyteller picks a mount's shape and colours (its own button on the token or the tile). */
export async function pick(doc) {
  doc = doc?.document ?? doc;
  const m = mountOf(doc);
  if ( !m ) return null;
  const cur = m.pick, now = lookOf(doc), esc = s => foundry.utils.escapeHTML ? foundry.utils.escapeHTML(String(s)) : String(s);
  const opt = (v, l, sel) => `<option value="${esc(v)}"${sel ? " selected" : ""}>${esc(l)}</option>`;
  const looks = MR.looksOf(m.kind), schemes = MR.schemesOf(now?.look);
  const content = `<p>${esc(MR.kindOf(m.kind).label)}: now shown as ${esc(now?.look?.label ?? "nothing")}${now?.scheme ? `, ${esc(now.scheme.label.toLowerCase())}` : ""}. Left to its year, the shape changes as the years pass.</p>
    <div class="form-group"><label for="wodx-mount-look">Shape</label><select id="wodx-mount-look" name="look" data-fixed>${opt("", "By its year", !cur.look)}${looks.map(l => opt(l.id, `${l.label} (${l.from ? `from ${l.from}` : "any year"})`, cur.look === l.id)).join("")}</select></div>
    <div class="form-group"><label for="wodx-mount-scheme">Colours</label><select id="wodx-mount-scheme" name="scheme" data-fixed>${opt("", m.colour ? "As its sheet says" : "As it comes", !cur.scheme)}${schemes.map(s => opt(s.id, s.label, cur.scheme === s.id)).join("")}</select></div>
    <div class="form-group"><label for="wodx-mount-off">Keep its own picture</label><input id="wodx-mount-off" type="checkbox" name="off"${cur.off ? " checked" : ""}></div>`;
  const out = await foundry.applications.api.DialogV2.wait({window: {title: `Looks: ${doc.name ?? doc.flags?.[IX]?.title ?? MR.kindOf(m.kind).label}`}, classes: ["wodx-dialog"], content, rejectClose: false,
    buttons: [{action: "ok", label: "Use this", default: true, callback: (ev, btn) => ({look: btn.form?.elements?.look?.value ?? "", scheme: btn.form?.elements?.scheme?.value ?? "", off: !!btn.form?.elements?.off?.checked})}, {action: "cancel", label: "Cancel", callback: () => null}]});
  if ( !out || out === "cancel" ) return null;
  return setLook(doc, out);
}
/** Set a mount's picks: {look, style, scheme, off}; blank values go back to the year and to chance. */
export async function setLook(doc, pickd = {}) {
  doc = doc?.document ?? doc;
  const clean = {look: String(pickd.look ?? ""), style: String(pickd.style ?? ""), scheme: String(pickd.scheme ?? ""), off: !!pickd.off};
  await doc.update({flags: {[MOD]: {mount: clean}}});
  return lookOf(doc);
}

function addHud(hud, html) {
  if ( !game.user?.isGM || !on() ) return;
  const el = html instanceof HTMLElement ? html : html?.[0], col = el?.querySelector?.(".col.right") ?? el, doc = hud?.object?.document ?? hud?.document;
  if ( !col || !mountOf(doc) || col.querySelector(".wodx-mount-pick") ) return;
  const b = document.createElement("button");
  b.type = "button"; b.className = "control-icon wodx-mount-pick"; b.dataset.tooltip = "Shape and colours"; b.setAttribute("aria-label", "Shape and colours");
  b.innerHTML = '<i class="fa-solid fa-palette"></i>';
  b.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); pick(doc); });
  col.append(b);
}

export async function loadMounts() {
  try { const r = await fetch(`${MR.FOLDER}/mounts.json`); ready = r.ok && MR.learn(await r.json()) > 0; }
  catch (e) { console.warn(`${MOD} | mount looks`, e); ready = false; }
  return ready;
}

export function startMounts() {
  if ( started ) return;
  started = true;
  Hooks.on("renderTokenHUD", addHud);
  Hooks.on("renderTileHUD", addHud);
  // after the map has put every picture in its place, before it is drawn
  const add = () => { canvas.app?.ticker?.remove(tick); canvas.app?.ticker?.add(tick, undefined, (globalThis.PIXI?.UPDATE_PRIORITY?.LOW ?? -25) + 1); };
  Hooks.on("canvasReady", () => { states.clear(); held.clear(); shown.clear(); seated.clear(); add(); });
  Hooks.on("canvasTearDown", () => { held.clear(); shown.clear(); seated.clear(); });
  loadMounts().then(() => { if ( globalThis.canvas?.ready ) add(); });
}

/**
 * The seats of a mount on the map as they stand now, for other modules: [{x, y, hidden, pose}] in map pixels (where a
 * rider's feet go), for the way it faces or the facing named.
 */
export function seats(doc, facing = null) {
  doc = doc?.document ?? doc;
  const L = lookOf(doc), obj = doc?.object;
  if ( !L || !obj ) return [];
  const grid = canvas.grid?.size || 100, k = MR.pixel(grid), c = centreOf(obj), f = facing ?? states.get(doc.uuid)?.facing ?? "down";
  const ground = {x: c.x, y: c.y + c.h / 2 - grid * 0.15};
  return (L.look.seats?.[f] ?? []).map((_, i) => { const s = MR.seatOf(L.look, f, i), p = MR.seatPoint(L.look, s, ground, k); return {x: p.x, y: p.y, hidden: s.cut <= 0, pose: s.pose}; });
}

export const mountApi = {rules: MR, mountOf, lookOf, seats, pick, setLook, load: loadMounts, ready: () => ready,
  showing: doc => shown.get((doc?.document ?? doc)?.uuid) ?? null, facing: doc => states.get((doc?.document ?? doc)?.uuid)?.facing ?? null,
  sheetReady: doc => { const L = lookOf(doc?.document ?? doc); return !!(L && sheet(L.kind, L.look, L.scheme)); }};
