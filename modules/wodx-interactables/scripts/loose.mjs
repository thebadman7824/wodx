/**
 * WoDX Interactables: loose gear on the map and what things weigh (B6083 to B6089). Rules in loose-rules.mjs; the
 * weights come from WoDX Library (api.weight). Without the Library, a thing in a container weighs a kilo, as before.
 *
 * A pile is a tile with no picture: flags.wodx-interactables = {container: true, kind: "pile", pile: true, items:
 * [names], loose: [{name, data (the item as it was)}], taken}. Each client draws its heap on a layer of its own.
 */
import * as L from "./loose-rules.mjs";

const MOD = "wodx-interactables", SOCKET = `module.${MOD}`;
const num = v => Number(v) || 0;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const docOf = x => x?.document ?? x ?? null;
const tilesOf = scene => scene?.tiles?.contents ?? [...(scene?.tiles?.values?.() ?? [])];
const sync = uuid => { try { return fromUuidSync(uuid); } catch (e) { return null; } };
const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return null; } };
let deps = {};

/* ------------------------------------------------------------------ */
/*  Weights (B6083, B6084)                                             */
/* ------------------------------------------------------------------ */

/** WoDX Library's weights, or null when it is off or too old. */
export const weights = () => { const m = game.modules.get("wodx-library"); return m?.active && m.api?.weight?.ready ? m.api.weight : null; };

/** What a container's or a pile's contents weigh, in kg. A taken container is empty (B6083). */
export function contentsKg(f = {}) {
  if ( f.taken ) return 0;
  const raw = Array.isArray(f.items) ? f.items : String(f.items ?? "").split(/\n|;/);
  const lines = raw.map(s => String(s ?? "").trim()).filter(Boolean);
  if ( !lines.length ) return 0;
  const W = weights();
  // A thing set down keeps its own item, so its weight is the item's
  if ( W && Array.isArray(f.loose) && f.loose.length ) {
    const pairs = L.matchLoose(lines, f.loose);
    let kg = 0;
    const plain = [];
    for ( const p of pairs ) { if ( p.data ) kg += W.itemKg(p.data); else plain.push(p.line); }
    return kg + (plain.length ? W.linesKg(plain).kg : 0);
  }
  return W ? W.linesKg(lines).kg : lines.length;
}

/** What a character has on them, in kg: {kg, worn, carried}. Zero without WoDX Library. */
export function gearKg(actor) {
  const W = weights();
  if ( !W || !actor ) return {kg: 0, worn: 0, carried: 0, rows: []};
  try { return W.actorKg(actor); } catch (e) { return {kg: 0, worn: 0, carried: 0, rows: []}; }
}

/* ------------------------------------------------------------------ */
/*  Setting gear down (B6086)                                          */
/* ------------------------------------------------------------------ */

/** The things a character could set down: [{id, name, kg}]. */
export function setDownChoices(actor) {
  const W = weights();
  return [...(actor?.items ?? [])].filter(i => {
    const v = W?.viewOf?.(i) ?? {type: i.type, natural: !!i.system?.isnatural, installed: !!i.flags?.["wodx-library"]?.installed};
    return L.canSetDown(v);
  }).map(i => ({id: i.id, name: i.name, kg: W ? W.itemKg(i) : 1}));
}

/** The pile on a token's square, standing or picked up, or null. */
export function pileAt(scene, p) {
  const g = num(scene?.grid?.size) || 100, sq = L.squareOf(p, g);
  return tilesOf(scene).find(t => L.isPile(t.flags?.[MOD]) && Math.abs(num(t.x) - sq.x) < 2 && Math.abs(num(t.y) - sq.y) < 2) ?? null;
}

/**
 * Active Storyteller: put things from a character's sheet down where their token stands. ids: item ids. Returns the
 * pile tile, or null.
 */
export async function setDown(tokDoc, ids = []) {
  tokDoc = docOf(tokDoc);
  const actor = tokDoc?.actor, scene = tokDoc?.parent;
  if ( !actor || !scene || !ids.length ) return null;
  if ( !isActiveGM() ) { game.socket?.emit?.(SOCKET, {action: "loose", op: "setdown", user: game.user.id, who: tokDoc.uuid, ids}); return null; }
  const allowed = new Set(setDownChoices(actor).map(c => c.id));
  const items = ids.map(id => actor.items.get(id)).filter(i => i && allowed.has(i.id));
  if ( !items.length ) return null;
  const loose = items.map(i => { const o = i.toObject(); delete o._id; if ( o.system?.isequipped ) o.system.isequipped = false; return {name: i.name, data: o}; });
  const g = num(scene.grid?.size) || 100;
  const centre = {x: num(tokDoc.x) + num(tokDoc.width || 1) * g / 2, y: num(tokDoc.y) + num(tokDoc.height || 1) * g / 2};
  let tile = pileAt(scene, centre);
  if ( tile ) await tile.update({[`flags.${MOD}`]: L.addToPile(tile.flags?.[MOD] ?? {}, loose), hidden: false});
  else {
    const sq = L.squareOf(centre, g);
    [tile] = await scene.createEmbeddedDocuments("Tile", [{x: sq.x, y: sq.y, width: g, height: g, texture: {src: null}, hidden: false,
      elevation: num(tokDoc.elevation), sort: 0, flags: {[MOD]: L.pileFlags(loose)}}]);
  }
  await actor.deleteEmbeddedDocuments("Item", items.map(i => i.id));
  const names = items.map(i => i.name);
  const kg = contentsKg(tile.flags?.[MOD] ?? {});
  await ChatMessage.create({speaker: {alias: tokDoc.name, scene: scene.id, token: tokDoc.id},
    content: `<div class="vta-card wodx-x wix-loose"><header class="vta-head"><h3 style="background:none!important;border:0!important;box-shadow:none!important;color:inherit!important">Sets gear down</h3></header><div class="vta-body"><p><b>${esc(tokDoc.name)}</b> puts ${esc(listWords(names))} on the ground. The pile there: ${esc(L.pileLabel("", kg).replace(/^Gear on the ground, /, "")) || "light"}.</p></div></div>`,
    flags: {[MOD]: {looseCard: true}}});
  try { deps.mapEvent?.("setdown", {scene, doc: tile, tokDoc, noise: "quiet", object: "gear on the ground", extra: {items: names}}); } catch (e) { /* no map events */ }
  draw();
  return tile;
}
const listWords = a => (a.length <= 1 ? (a[0] ?? "") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);

/** The window: tick what to set down. */
export async function openSetDown(tok) {
  const doc = docOf(tok), actor = doc?.actor;
  if ( !actor || !doc.isOwner ) return null;
  const list = setDownChoices(actor);
  if ( !list.length ) { ui.notifications?.info?.(`${doc.name} has nothing to set down.`); return null; }
  const g = gearKg(actor);
  const rows = list.map(c => `<label style="display:block"><input type="checkbox" name="i" value="${esc(c.id)}"> ${esc(c.name)} <span class="hint">(${esc(weights()?.words?.(c.kg) ?? "")})</span></label>`).join("");
  let ids = null;
  await foundry.applications.api.DialogV2.wait({rejectClose: false, classes: ["wodx-dialog", "wix-loose"], window: {title: `Set gear down: ${doc.name}`},
    content: `<p>${g.kg ? `${esc(doc.name)} carries ${esc(weights()?.words?.(g.kg) ?? "")} in all${g.worn ? `, ${esc(weights()?.words?.(g.worn) ?? "")} of it worn` : ""}.` : ""} What goes on the ground goes in a pile on this square, for anyone to pick up.</p>
      <div class="wix-loose-list" style="max-height:340px;overflow-y:auto">${rows}</div>`,
    buttons: [{action: "ok", label: "Set it down", default: true, callback: (ev, btn) => { ids = [...btn.form.querySelectorAll("input[name=i]:checked")].map(x => x.value); }}, {action: "close", label: "Cancel"}]});
  return ids?.length ? setDown(doc, ids) : null;
}

/** Pick-up: the item data a pile's line came from, for WoDX Interactables' giveItems. */
export const looseFor = (f = {}, lines = []) => L.matchLoose(lines, f.loose ?? []);

/* ------------------------------------------------------------------ */
/*  The heap on the map (B6087)                                        */
/* ------------------------------------------------------------------ */

let layer = null, pending = null;
const sees = p => {
  if ( game.user?.isGM ) return true;
  try { return canvas.visibility?.testVisibility?.(p, {tolerance: (canvas.grid?.size ?? 100) / 4}) ?? true; } catch (e) { return true; }
};
export function draw() {
  if ( pending ) return;
  pending = setTimeout(() => { pending = null; try { redraw(); } catch (e) { console.error(`${MOD} | piles`, e); } }, 60);
}
/** The rows a heap is drawn from: [{name, kind, type, kg}]. */
export function heapRows(f = {}) {
  if ( f.taken ) return [];
  const W = weights();
  const lines = (Array.isArray(f.items) ? f.items : String(f.items ?? "").split(/\r?\n/)).map(s => String(s).trim()).filter(Boolean);
  return L.matchLoose(lines, f.loose ?? []).map(p => {
    const v = p.data ? (W?.viewOf?.(p.data) ?? {name: p.line, type: p.data.type}) : {name: p.line};
    return {name: p.line, kind: v.kind ?? "", type: v.type ?? "", kg: p.data && W ? W.itemKg(p.data) : W ? W.linesKg([p.line]).kg : 1};
  });
}
function redraw() {
  if ( !canvas?.ready || !globalThis.PIXI ) return;
  if ( !layer || layer.destroyed ) {
    layer = new PIXI.Container(); layer.name = "wodxLoosePiles"; layer.eventMode = "none";
    // In the primary group, so the scene's lighting darkens the heaps as it darkens the floor (standing rule 9); just
    // above tiles, under tokens. Where that group will not take it, on the interface instead.
    const SL = foundry.canvas?.groups?.PrimaryCanvasGroup?.SORT_LAYERS ?? globalThis.PrimaryCanvasGroup?.SORT_LAYERS ?? {};
    Object.assign(layer, {elevation: 0, sortLayer: num(SL.TILES ?? 500) + 1, sort: 0});
    try { (canvas.primary ?? canvas.interface).addChild(layer); } catch (e) { canvas.interface?.addChild?.(layer); }
  }
  for ( const c of layer.removeChildren() ) c.destroy({children: true});
  if ( setting("haul") === false ) return;
  const grid = canvas.grid?.size ?? 100;
  for ( const t of tilesOf(canvas.scene) ) {
    const f = t.flags?.[MOD] ?? {};
    if ( !L.isPile(f) || f.taken || (t.hidden && !game.user.isGM) ) continue;
    const size = Math.min(Math.abs(num(t.width) || grid), Math.abs(num(t.height) || grid));
    if ( !sees({x: num(t.x) + size / 2, y: num(t.y) + size / 2}) ) continue;
    const rows = heapRows(f);
    if ( !rows.length ) continue;
    const g = new PIXI.Graphics();
    // a soft shadow under the heap, then the blocks, each with a dark edge so they read as pixels
    g.beginFill?.(0x000000, 0.25); g.drawEllipse?.(size / 2, size - size / 10, size * 0.38, size / 12); g.endFill?.();
    for ( const b of L.heapOf(rows, size) ) {
      g.beginFill?.(b.colour, 1); g.lineStyle?.(1, 0x1a1410, 0.8); g.drawRect?.(b.x, b.y, b.w, b.h); g.endFill?.();
    }
    g.position.set(num(t.x), num(t.y));
    g.zIndex = 5;
    layer.addChild(g);
    if ( game.user.isGM ) {
      const Text = foundry.canvas?.containers?.PreciseText ?? globalThis.PreciseText ?? PIXI.Text;
      const style = CONFIG.canvasTextStyle?.clone?.() ?? new PIXI.TextStyle({fill: 0xffffff, stroke: 0x000000, strokeThickness: 4});
      style.fontSize = Math.max(12, Math.round(grid / 6));
      const label = new Text(L.pileLabel(f.title, rows.reduce((s, r) => s + num(r.kg), 0)), style);
      label.anchor?.set?.(0.5, 0);
      label.position.set(num(t.x) + size / 2, num(t.y) + size + 2);
      label.alpha = 0.85;
      layer.addChild(label);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Setup                                                              */
/* ------------------------------------------------------------------ */

const pileChange = (doc, changes = {}) => L.isPile(doc?.flags?.[MOD]) || !!changes?.flags?.[MOD]?.pile || changes?.flags?.[MOD]?.kind !== undefined;
export function setupLoose(d = {}) {
  deps = d;
  Hooks.on("canvasReady", () => { layer = null; draw(); });
  Hooks.on("createTile", doc => { if ( pileChange(doc) ) draw(); });
  Hooks.on("updateTile", (doc, ch) => { if ( pileChange(doc, ch) ) draw(); });
  Hooks.on("deleteTile", doc => { if ( pileChange(doc) ) draw(); });
  Hooks.on("sightRefresh", () => { if ( !game.user?.isGM && tilesOf(canvas?.scene).some(t => L.isPile(t.flags?.[MOD])) ) draw(); });
  Hooks.once("ready", () => game.socket?.on?.(SOCKET, async msg => {
    if ( msg?.action !== "loose" || !isActiveGM() ) return;
    const user = game.users.get(msg.user), who = sync(msg.who);
    if ( !who?.actor || !user || !who.actor.testUserPermission?.(user, "OWNER") ) return;
    if ( msg.op === "setdown" ) await setDown(who, Array.isArray(msg.ids) ? msg.ids : []).catch(e => console.error(`${MOD} | set down`, e));
  }));
  return {rules: L, contentsKg, gearKg, setDown, openSetDown, setDownChoices, pileAt, heapRows, looseFor, draw};
}
