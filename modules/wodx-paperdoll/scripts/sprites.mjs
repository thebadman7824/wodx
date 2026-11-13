/**
 * Sprite tokens in Foundry (prototype, B2560): a token that carries the flag "sprite" shows a walking figure from
 * its sheet, turned the way it moves. Everything is drawn on each computer from the sheet; nothing is saved but the
 * flag and the still picture on the token. Rules in sprite-rules.mjs.
 */
import * as SR from "./sprite-rules.mjs";
const MOD = "wodx-paperdoll";
const states = new Map(), bases = new Map(), frames = new Map(), acts = new Map();
let ticking = false;
const on = () => { try { return game.settings.get(MOD, "sprites") !== false; } catch (e) { return true; } };

export function registerSpriteSettings() {
  game.settings.register(MOD, "sprites", {scope: "world", config: true, name: "Sprite tokens walk and turn",
    hint: "Tokens given a sprite face the way they move and step as they go. Off: they show the still figure.", type: Boolean, default: true});
}

const crisp = tex => { const b = tex?.baseTexture ?? tex?.source; if ( b ) b.scaleMode = globalThis.PIXI?.SCALE_MODES?.NEAREST ?? "nearest"; return tex; };

function base(name, act = null) {
  const id = act ? `${name}.${act}` : name;
  if ( bases.has(id) ) return bases.get(id);
  bases.set(id, null);
  const load = foundry.canvas?.loadTexture ?? globalThis.loadTexture;
  Promise.resolve(load(act ? SR.actPath(name, act) : SR.sheetPath(name))).then(t => bases.set(id, crisp(t)), e => console.warn(`${MOD} | sprite sheet ${id}`, e));
  return null;
}

function frame(name, f, act = null) {
  const b = base(name, act);
  if ( !b ) return null;
  const key = `${name}:${act ?? ""}:${f.row}:${f.col}`;
  if ( !frames.has(key) ) {
    const r = SR.rectOf(f);
    frames.set(key, new PIXI.Texture(b.baseTexture ?? b.source ?? b, new PIXI.Rectangle(r.x, r.y, r.width, r.height)));
  }
  return frames.get(key);
}

function tick() {
  if ( !globalThis.canvas?.ready || !on() ) return;
  const grid = canvas.grid?.size || canvas.dimensions?.size || 100, now = performance.now(), seen = new Set();
  for ( const token of canvas.tokens?.placeables ?? [] ) {
    const name = token.document?.flags?.[MOD]?.sprite;
    if ( !name || !SR.SHEETS[name] || !token.mesh ) continue;
    seen.add(token.id);
    const pos = {x: token.position.x, y: token.position.y};
    let st = SR.step(states.get(token.id) ?? SR.start(pos), pos, grid, now);
    let tex = null;
    const a = acts.get(token.id);
    if ( a ) {
      const col = st.moving ? null : SR.actFrame(now - a.start);
      if ( col === null ) acts.delete(token.id);
      else { st = {...st, facing: a.facing ?? st.facing}; tex = frame(name, {row: SR.ROW[st.facing] ?? SR.ROW.down, col}, a.act) ?? frame(name, SR.frameOf(st, grid)); }
    }
    states.set(token.id, st);
    tex ??= frame(name, SR.frameOf(st, grid));
    if ( tex && token.mesh.texture !== tex ) token.mesh.texture = tex;
    else if ( !tex ) crisp(token.mesh.texture);
  }
  for ( const id of states.keys() ) if ( !seen.has(id) ) { states.delete(id); acts.delete(id); }
}

/** Every computer that sees the token starts the attack when the token's flag changes. */
function onTokenUpdate(doc, change) {
  // the change carries only the fields that differ (often just the counter), so the move is read from the token itself
  if ( !change?.flags?.[MOD]?.act || !on() ) return;
  const a = doc.flags?.[MOD]?.act;
  if ( !a?.name ) return;
  const name = doc.flags?.[MOD]?.sprite, act = SR.actOf(name, a.name);
  if ( !act ) return;
  base(name, act);
  acts.set(doc.id, {act, facing: SR.ROW[a.facing] !== undefined ? a.facing : null, start: performance.now()});
}

/**
 * Play an attack on a sprite token for everyone looking at the scene. `act` is one of the sprite's own moves (its
 * first when left out or unknown); `toward` is a token, a token document or a point the figure turns to face.
 * Returns the move played, or null when the token has no sprite or the sprite knows no attack.
 */
export async function play(tokenDoc, act = null, toward = null) {
  tokenDoc = tokenDoc?.document ?? tokenDoc;
  const name = tokenDoc?.flags?.[MOD]?.sprite, move = SR.actOf(name, act);
  if ( !move ) return null;
  const g = canvas.grid?.size ?? 0, o = toward?.document ?? toward;
  const at = o && Number.isFinite(o.x) && Number.isFinite(o.y) ? {x: o.x + (o.width ?? 0) * g / 2, y: o.y + (o.height ?? 0) * g / 2} : null;
  const me = {x: tokenDoc.x + (tokenDoc.width ?? 1) * g / 2, y: tokenDoc.y + (tokenDoc.height ?? 1) * g / 2};
  const was = states.get(tokenDoc.id)?.facing ?? "down";
  const facing = at ? SR.facingToward(me, at, was) : was;
  await tokenDoc.update({flags: {[MOD]: {act: {name: move, facing, n: (tokenDoc.flags?.[MOD]?.act?.n ?? 0) + 1}}}}, {animate: false});
  return move;
}

const lately = new Map();
const mine = () => game.users?.activeGM?.id === game.user?.id;
const spriteTokenOf = (actor, uuid = null) => {
  const toks = canvas.tokens?.placeables ?? [];
  return (uuid ? toks.find(t => t.document.uuid === uuid) : null) ?? toks.find(t => t.actor === actor) ?? toks.find(t => actor?.uuid && t.actor?.uuid === actor.uuid) ?? null;
};

/** Every attack rolled in a fight, hit or miss, plays the move that fits the weapon. The active Storyteller's computer sends it. */
function onAttack(attacker, info = {}) {
  if ( !on() || !mine() ) return;
  const from = spriteTokenOf(attacker, info.attackerToken), name = from?.document.flags?.[MOD]?.sprite;
  const move = name ? SR.moveFor(name, info) : null;
  if ( !move ) return;
  lately.set(from.id, performance.now());
  const to = info.target ? spriteTokenOf(info.target, info.targetToken) : null;
  play(from.document, move, to?.document ?? null).catch(e => console.warn(`${MOD} | sprite attack`, e));
}

/** A power worked by a character plays its sprite's casting move, for any module that says so: Hooks.callAll("wodxPowerShown", actor, {target}). */
function onPower(actor, info = {}) {
  if ( !on() || !mine() ) return;
  const from = spriteTokenOf(actor, info.token), name = from?.document.flags?.[MOD]?.sprite;
  const move = name ? SR.moveFor(name, {power: true}) : null;
  if ( !move ) return;
  const to = info.target ? spriteTokenOf(info.target, info.targetToken) : null;
  play(from.document, move, to?.document ?? null).catch(e => console.warn(`${MOD} | sprite power`, e));
}

/** Harm that names an attacker but came without an attack roll just before (an older Combat, harm applied by hand) still plays the attack. */
function onDamage(actor, info) {
  if ( !on() || !info?.attacker || !mine() ) return;
  const toks = canvas.tokens?.placeables ?? [];
  const from = toks.find(t => t.actor?.uuid === info.attacker && t.document.flags?.[MOD]?.sprite);
  if ( !from || performance.now() - (lately.get(from.id) ?? -Infinity) < 4000 ) return;
  const to = toks.find(t => t.actor === actor) ?? toks.find(t => t.actor?.uuid === actor?.uuid);
  play(from.document, null, to?.document ?? null).catch(e => console.warn(`${MOD} | sprite attack`, e));
}

export function startSprites() {
  if ( ticking ) return;
  ticking = true;
  Hooks.on("renderTokenHUD", addHudButton);
  Hooks.on("updateToken", onTokenUpdate);
  Hooks.on("wodxDamageApplied", onDamage);
  Hooks.on("wodxAttackRolled", onAttack);
  Hooks.on("wodxPowerShown", onPower);
  Hooks.on("canvasReady", () => { states.clear(); canvas.app?.ticker?.remove(tick); canvas.app?.ticker?.add(tick); });
  if ( globalThis.canvas?.ready ) canvas.app?.ticker?.add(tick);
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
  await tokenDoc.unsetFlag(MOD, "act");
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

export const spriteApi = {give, clear, pick, play, acts: name => [...(SR.ACTS[name] ?? [])], playing: id => acts.get(id), names: () => ({...SR.SHEETS}), state: id => states.get(id), rules: SR};
