/**
 * Sprite tokens in Foundry (prototype, B2560): a token that carries the flag "sprite" shows a walking figure from
 * its sheet, turned the way it moves. Everything is drawn on each computer from the sheet; nothing is saved but the
 * flag and the still picture on the token. Rules in sprite-rules.mjs.
 */
import * as SR from "./sprite-rules.mjs";
const MOD = "wodx-paperdoll";
const states = new Map(), bases = new Map(), frames = new Map();
let ticking = false;
const on = () => { try { return game.settings.get(MOD, "sprites") !== false; } catch (e) { return true; } };

export function registerSpriteSettings() {
  game.settings.register(MOD, "sprites", {scope: "world", config: true, name: "Sprite tokens walk and turn",
    hint: "Tokens given a sprite face the way they move and step as they go. Off: they show the still figure.", type: Boolean, default: true});
}

const crisp = tex => { const b = tex?.baseTexture ?? tex?.source; if ( b ) b.scaleMode = globalThis.PIXI?.SCALE_MODES?.NEAREST ?? "nearest"; return tex; };

function base(name) {
  if ( bases.has(name) ) return bases.get(name);
  bases.set(name, null);
  const load = foundry.canvas?.loadTexture ?? globalThis.loadTexture;
  Promise.resolve(load(SR.sheetPath(name))).then(t => bases.set(name, crisp(t)), e => console.warn(`${MOD} | sprite sheet ${name}`, e));
  return null;
}

function frame(name, f) {
  const b = base(name);
  if ( !b ) return null;
  const key = `${name}:${f.row}:${f.col}`;
  if ( !frames.has(key) ) {
    const r = SR.rectOf(f);
    frames.set(key, new PIXI.Texture(b.baseTexture ?? b.source ?? b, new PIXI.Rectangle(r.x, r.y, r.width, r.height)));
  }
  return frames.get(key);
}

function tick() {
  if ( !canvas?.ready || !on() ) return;
  const grid = canvas.grid?.size || canvas.dimensions?.size || 100, now = performance.now(), seen = new Set();
  for ( const token of canvas.tokens?.placeables ?? [] ) {
    const name = token.document?.flags?.[MOD]?.sprite;
    if ( !name || !SR.SHEETS[name] || !token.mesh ) continue;
    seen.add(token.id);
    const pos = {x: token.position.x, y: token.position.y};
    const st = SR.step(states.get(token.id) ?? SR.start(pos), pos, grid, now);
    states.set(token.id, st);
    const tex = frame(name, SR.frameOf(st, grid));
    if ( tex && token.mesh.texture !== tex ) token.mesh.texture = tex;
    else if ( !tex ) crisp(token.mesh.texture);
  }
  for ( const id of states.keys() ) if ( !seen.has(id) ) states.delete(id);
}

export function startSprites() {
  if ( ticking ) return;
  ticking = true;
  Hooks.on("renderTokenHUD", addHudButton);
  Hooks.on("canvasReady", () => { states.clear(); canvas.app?.ticker?.remove(tick); canvas.app?.ticker?.add(tick); });
  if ( canvas?.ready ) canvas.app?.ticker?.add(tick);
}

/** Give a placed token a sprite. The token keeps its old picture in a flag, so clear() can put it back. */
export async function give(tokenDoc, name) {
  if ( !SR.SHEETS[name] ) throw new Error(`No sprite sheet called ${name}`);
  const fl = tokenDoc.flags?.[MOD] ?? {};
  const t = tokenDoc.texture ?? {};
  const prev = fl.spritePrev ?? {src: t.src, scaleX: t.scaleX, scaleY: t.scaleY, anchorX: t.anchorX, anchorY: t.anchorY, fit: t.fit};
  return tokenDoc.update({texture: {src: SR.stillPath(name), ...SR.TOKEN}, flags: {[MOD]: {sprite: name, spritePrev: prev}}});
}

/** Take the sprite off again and put the old picture back. */
export async function clear(tokenDoc) {
  const prev = tokenDoc.flags?.[MOD]?.spritePrev;
  if ( prev ) await tokenDoc.update({texture: prev});
  await tokenDoc.unsetFlag(MOD, "sprite");
  await tokenDoc.unsetFlag(MOD, "spritePrev");
  return tokenDoc;
}

/** The Storyteller picks a sprite for a token from the token's own buttons (the figure icon). */
export async function pick(tokenDoc) {
  const cur = tokenDoc.flags?.[MOD]?.sprite ?? "";
  const opts = [["", "None, the token's own picture"], ...Object.entries(SR.SHEETS)].map(([v, l]) => `<option value="${v}"${v === cur ? " selected" : ""}>${l}</option>`).join("");
  const content = `<p>The token shows a whole drawn figure that turns the way it moves and walks as it goes.</p><div class="form-group"><label for="wodx-sprite-pick">Sprite</label><select id="wodx-sprite-pick" name="sprite" data-fixed>${opts}</select></div>`;
  const name = await foundry.applications.api.DialogV2.wait({window: {title: `Sprite token: ${tokenDoc.name}`}, classes: ["wodx-dialog"], content, rejectClose: false,
    buttons: [{action: "ok", label: "Use this", default: true, callback: (ev, btn) => btn.form?.elements?.sprite?.value ?? ""}, {action: "cancel", label: "Cancel", callback: () => null}]});
  if ( name === null || name === undefined || name === "cancel" || name === cur ) return tokenDoc;
  return name ? give(tokenDoc, name) : clear(tokenDoc);
}

export function addHudButton(hud, html) {
  if ( !game.user?.isGM ) return;
  const el = html instanceof HTMLElement ? html : html?.[0];
  const col = el?.querySelector?.(".col.right") ?? el;
  const doc = hud?.object?.document ?? hud?.document;
  if ( !col || !doc || col.querySelector(".wodx-sprite-pick") ) return;
  const b = document.createElement("button");
  b.type = "button"; b.className = "control-icon wodx-sprite-pick"; b.dataset.tooltip = "Sprite token"; b.setAttribute("aria-label", "Sprite token");
  b.innerHTML = '<i class="fa-solid fa-person-walking"></i>';
  b.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); pick(doc); });
  col.append(b);
}

export const spriteApi = {give, clear, pick, names: () => ({...SR.SHEETS}), state: id => states.get(id), rules: SR};
