/**
 * Sprite tokens in Foundry (prototype, B2560): a token that carries the flag "sprite" shows a walking figure from
 * its sheet, turned the way it moves. Everything is drawn on each computer from the sheet; nothing is saved but the
 * flag and the still picture on the token. Rules in sprite-rules.mjs.
 */
import * as SR from "./sprite-rules.mjs";
import * as LR from "./line-rules.mjs";
import * as FG from "./figure-rules.mjs";
import {healthLevel, randomLook} from "./doll-rules.mjs";
import {YEAR} from "../../wodx-chronicle/scripts/terms.mjs";
const MOD = "wodx-paperdoll";
const states = new Map(), bases = new Map(), frames = new Map(), acts = new Map(), glows = new Map(), strides = new Map(), rides = new Map();
/** Who sits on a mount or in a vehicle just now (mounts.mjs keeps it): token id -> {facing, pose, moving}. */
export const seated = new Map();
let ticking = false;
const on = () => { try { return game.settings.get(MOD, "sprites") !== false; } catch (e) { return true; } };

export function registerSpriteSettings() {
  game.settings.register(MOD, "sprites", {scope: "world", config: true, name: "Sprite tokens walk and turn",
    hint: "Tokens given a sprite face the way they move and step as they go. Off: they show the still figure.", type: Boolean, default: true});
  game.settings.register(MOD, "spriteLife", {scope: "world", config: true, name: "Figures live their routine on the map",
    hint: "A character with a routine (WoDX NPC) sleeps lying down, sits at rest, works with the hands, kneels at prayer, drinks seated and carries a load on errands; beasts graze and lie down. They get up when they walk. Off: everyone stands.", type: Boolean, default: true});
}
const lifeOn = () => { try { return game.settings.get(MOD, "spriteLife") !== false; } catch (e) { return true; } };

const crisp = tex => { const b = tex?.baseTexture ?? tex?.source; if ( b ) b.scaleMode = globalThis.PIXI?.SCALE_MODES?.NEAREST ?? "nearest"; return tex; };

/* A power's effect sheet is kept like a move of the figure named FX. */
const FX = "fx";

function base(name, act = null) {
  const id = act ? `${name}.${act}` : name;
  if ( bases.has(id) ) return bases.get(id);
  bases.set(id, null);
  const load = foundry.canvas?.loadTexture ?? globalThis.loadTexture;
  Promise.resolve(load(name === FX ? SR.fxPath(act) : act ? SR.actPath(name, act) : SR.sheetPath(name))).then(t => bases.set(id, crisp(t)), e => console.warn(`${MOD} | sprite sheet ${id}`, e));
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
    const own = token.document?.flags?.[MOD]?.sprite;
    if ( !own || !SR.SHEETS[own] || !token.mesh ) continue;
    const name = seemingFor(own);   // a changeling's mortal seeming for those who cannot see the fae mien (B5819)
    seen.add(token.id);
    const pos = {x: token.position.x, y: token.position.y};
    let st = SR.step(states.get(token.id) ?? SR.start(pos), pos, grid, now);
    let tex = null;
    const a = acts.get(token.id);
    if ( a?.up ) {
      // getting up: the way down, played backwards and quickly, also on the first step of a walk (B5666)
      const col = SR.upFrame(now - a.start);
      if ( col === null ) acts.delete(token.id);
      else { st = {...st, facing: a.facing ?? st.facing}; tex = frame(name, {row: SR.ROW[st.facing] ?? SR.ROW.down, col}, a.act); }
    }
    else if ( a?.held ) {
      // fallen or dead: the last frame stays, wherever the token is dragged, until the figure is helped up
      st = {...st, facing: a.facing ?? st.facing};
      tex = frame(name, {row: SR.ROW[st.facing] ?? SR.ROW.down, col: SR.ACT_FRAMES - 1}, a.act);
    }
    else if ( a ) {
      // a pose that goes round (working, grazing) starts over for as long as the figure stays at it (B5664)
      const col = st.moving ? null : SR.actFrame(a.loop ? (now - a.start) % SR.actTotal(a.act) : now - a.start, a.act);
      if ( col === null && a.hold && !st.moving ) a.held = true;
      else if ( col === null ) acts.delete(token.id);
      else {
        st = {...st, facing: a.facing ?? st.facing};
        const f = {row: SR.ROW[st.facing] ?? SR.ROW.down, col};
        tex = frame(name, f, a.act) ?? frame(name, SR.frameOf(st, grid, SR.hasStand(name)));
        if ( a.fx ) try { glow(token, a.fx, f); } catch (e) { console.warn(`${MOD} | power effect`, e); a.fx = null; }
        else if ( glows.has(token.id) ) glow(token, null);
      }
    }
    if ( !acts.has(token.id) && glows.has(token.id) ) glow(token, null);
    { const c = acts.get(token.id); cover(token, name, c && !c.up && c.act === "sleep" && c.blanket && !st.moving ? {row: SR.ROW[st.facing] ?? SR.ROW.down, col: c.held ? SR.ACT_FRAMES - 1 : SR.actFrame(now - c.start, c.act) ?? SR.ACT_FRAMES - 1} : null, c?.blanket); }
    // aboard a mount or a vehicle (B4970): turned as it is turned, legs folded when the seat is a saddle
    const seat = seated.get(token.id);
    if ( seat ) st = {...st, facing: seat.facing};
    states.set(token.id, st);
    if ( !tex && seat?.pose === "ride" && !a ) { const g = SR.gaitFor(name, {action: "walk", riding: true}); if ( g === "ride" ) tex = frame(name, SR.frameOf(st, grid), g); }
    if ( !tex && st.moving ) {
      const gait = SR.gaitFor(name, {action: token.document.movementAction ?? "walk", squares: strides.get(token.id) ?? 0, riding: rides.get(token.id) === true && seat?.pose !== "sit",
        carrying: token.document.flags?.[MOD]?.carry === true});
      if ( gait ) tex = frame(name, SR.frameOf(st, grid), gait);
    }
    tex ??= frame(name, SR.frameOf(st, grid, SR.hasStand(name)));
    if ( tex && token.mesh.texture !== tex ) token.mesh.texture = tex;
    else if ( !tex ) crisp(token.mesh.texture);
    try { applyLooks(token, now); } catch (e) { console.warn(`${MOD} | line look`, e); }
  }
  for ( const id of states.keys() ) if ( !seen.has(id) ) { states.delete(id); acts.delete(id); const g = glows.get(id); if ( g ) { if ( !g.destroyed ) g.destroy(); glows.delete(id); } const c = covers.get(id); if ( c ) { if ( !c.destroyed ) c.destroy(); covers.delete(id); } }
}

/* A power's effect, laid over the token while its casting move plays: one small picture on the token itself, in step
   with the figure (same frame, same place, same size), taken away when the move ends. */
/* The bed's own blanket laid over a sleeper (B5667): the near-white cover sheet, tinted to the bed's colour. */
const covers = new Map();
function cover(token, name, f, colour) {
  let c = covers.get(token.id);
  const tex = f ? frame(name, f, SR.COVER) : null;
  if ( !tex ) { if ( c ) { if ( !c.destroyed ) c.destroy(); covers.delete(token.id); } return; }
  if ( !c || c.destroyed || c.parent !== token ) {
    if ( c && !c.destroyed ) c.destroy();
    c = new PIXI.Sprite(tex); c.eventMode = "none"; covers.set(token.id, token.addChild(c));
  }
  const m = token.mesh;
  if ( c.texture !== tex ) c.texture = tex;
  c.tint = Number.parseInt(String(colour).slice(1), 16);
  c.anchor.set(m.anchor?.x ?? 0.5, m.anchor?.y ?? 0.5);
  c.position.set(m.position.x - token.position.x, m.position.y - token.position.y);
  c.width = Math.abs(m.width); c.height = Math.abs(m.height); c.scale.x = Math.abs(c.scale.x) * Math.sign(m.scale.x || 1);
}

function glow(token, fx, f) {
  let g = glows.get(token.id);
  const tex = fx ? frame(FX, f, fx) : null;
  if ( !tex ) { if ( g ) { g.destroy(); glows.delete(token.id); } return; }
  if ( !g || g.destroyed || g.parent !== token ) {
    if ( g && !g.destroyed ) g.destroy();
    g = new PIXI.Sprite(tex); g.eventMode = "none"; glows.set(token.id, token.addChild(g));
  }
  const m = token.mesh;
  if ( g.texture !== tex ) g.texture = tex;
  g.anchor.set(m.anchor?.x ?? 0.5, m.anchor?.y ?? 0.5);
  g.position.set(m.position.x - token.position.x, m.position.y - token.position.y);
  g.width = Math.abs(m.width); g.height = Math.abs(m.height);
}

/** Every computer that sees the token starts the attack when the token's flag changes. */
function onTokenUpdate(doc, change) {
  // the change carries only the fields that differ (often just the counter), so the move is read from the token itself
  if ( (change?.x !== undefined || change?.y !== undefined) && on() ) {
    // how far it goes in one stretch decides whether it runs
    const g = canvas.grid?.size || 100, was = doc.object?.position ?? doc._source ?? doc;
    strides.set(doc.id, Math.hypot((change.x ?? doc.x) - (was.x ?? doc.x), (change.y ?? doc.y) - (was.y ?? doc.y)) / g);
    // in the saddle (WoDX Interactables knows who rides what)
    try { const ix = game.modules.get("wodx-interactables"); rides.set(doc.id, !!(ix?.active && ix.api?.rideOf?.(doc)?.saddle)); } catch (e) { rides.delete(doc.id); }
    // whoever sat or knelt gets up to go
    const held = doc.flags?.[MOD]?.act;
    if ( held?.hold && SR.STAY.includes(held.name) && mine() ) rise(doc).catch(() => null);
  }
  const fl = change?.flags?.[MOD];
  if ( fl?.flash && on() ) addLook(doc.id, doc.flags?.[MOD]?.flash?.kind);
  if ( fl && Object.hasOwn(fl, "veil") && on() ) addLook(doc.id, doc.flags?.[MOD]?.veil?.kind === "meld" ? "sink" : doc.flags?.[MOD]?.veil?.kind ? "ripple" : "rise");
  if ( !change?.flags?.[MOD]?.act || !on() ) return;
  const a = doc.flags?.[MOD]?.act;
  if ( !a?.name ) {
    const was = acts.get(doc.id);
    if ( was && (was.held || was.hold) && SR.RISES.includes(was.act) ) acts.set(doc.id, {act: was.act, facing: was.facing, up: true, start: performance.now()});
    else acts.delete(doc.id);
    return;
  }
  const name = doc.flags?.[MOD]?.sprite, act = SR.actOf(name, a.name);
  if ( !act ) return;
  base(name, act);
  const fx = act === "cast" && SR.fxOk(a.fx) ? a.fx : null;
  if ( fx ) base(FX, fx);
  acts.set(doc.id, {act, fx, blanket: SR.hexColour(a.blanket), hold: !!a.hold && SR.HOLD.includes(act), loop: !!a.hold && SR.LOOP.includes(act), facing: SR.ROW[a.facing] !== undefined ? a.facing : null, start: performance.now()});
}

/**
 * Play an attack on a sprite token for everyone looking at the scene. `act` is one of the sprite's own moves (its
 * first when left out or unknown); `toward` is a token, a token document or a point the figure turns to face.
 * Returns the move played, or null when the token has no sprite or the sprite knows no attack.
 */
export async function play(tokenDoc, act = null, toward = null, {fx = null, face = null, by = "", blanket = null, look: hold = null} = {}) {
  tokenDoc = tokenDoc?.document ?? tokenDoc;
  const name = tokenDoc?.flags?.[MOD]?.sprite, move = SR.isOwnMove(act) ? (SR.hasAct(name, act) ? act : null) : SR.actOf(name, act);
  if ( !move ) return null;
  const g = canvas.grid?.size ?? 0, o = toward?.document ?? toward;
  const at = o && Number.isFinite(o.x) && Number.isFinite(o.y) ? {x: o.x + (o.width ?? 0) * g / 2, y: o.y + (o.height ?? 0) * g / 2} : null;
  const me = {x: tokenDoc.x + (tokenDoc.width ?? 1) * g / 2, y: tokenDoc.y + (tokenDoc.height ?? 1) * g / 2};
  const was = states.get(tokenDoc.id)?.facing ?? "down";
  const facing = SR.ROW[face] !== undefined ? face : at ? SR.facingToward(me, at, was) : was;
  const look = move === "cast" ? (SR.fxOk(fx) ? fx : SR.FX_OWN[name] ?? SR.fxFor({})) : "";
  await tokenDoc.update({flags: {[MOD]: {act: {name: move, facing, fx: look, hold: SR.HOLD.includes(move), by, blanket: move === "sleep" ? SR.hexColour(blanket) : null, look: LR.LOOK_HOLD.includes(hold) ? hold : null, n: (tokenDoc.flags?.[MOD]?.act?.n ?? 0) + 1}}}}, {animate: false});
  return move;
}

const lately = new Map();
const mine = () => game.users?.activeGM?.id === game.user?.id;
/* An attack or a power is heard only on the computer that rolled it, so that computer sends the move when it may change the token. */
const may = tok => !!tok?.document?.isOwner;
const spriteTokenOf = (actor, uuid = null) => {
  const toks = canvas.tokens?.placeables ?? [];
  return (uuid ? toks.find(t => t.document.uuid === uuid) : null) ?? toks.find(t => t.actor === actor) ?? toks.find(t => actor?.uuid && t.actor?.uuid === actor.uuid)
    // an unlinked token's own actor is a copy of the sheet's: the sheet's actor still finds it
    ?? toks.find(t => actor?.id && !t.document.actorLink && t.document.actorId === actor.id) ?? null;
};

/** Every attack rolled in a fight, hit or miss, plays the move that fits the weapon. The computer that rolled it sends it. */
function onAttack(attacker, info = {}) {
  // B6150: WoDX Combat fires the attack again on the Storyteller's client for a player's roll; the roller's own client sent the move
  if ( !on() || info.relayed ) return;
  const from = spriteTokenOf(attacker, info.attackerToken), name = from?.document.flags?.[MOD]?.sprite;
  const move = name ? SR.moveFor(name, info) : null;
  if ( !move || !may(from) ) return;
  lately.set(from.id, performance.now());
  const to = info.target ? spriteTokenOf(info.target, info.targetToken) : null;
  play(from.document, move, to?.document ?? null).catch(e => console.warn(`${MOD} | sprite attack`, e));
  // a miss: the one attacked ducks away as the blow comes, where this computer may move that token
  // with the defence that was rolled (a block, a parry), else by ducking (B2615)
  const meet = to ? SR.defenceFor(to.document.flags?.[MOD]?.sprite, info.defense) : null;
  if ( info.hit === false && !info.botch && to && may(to) && meet && !to.document.flags?.[MOD]?.act?.hold )
    setTimeout(() => play(to.document, meet, from.document).catch(e => console.warn(`${MOD} | sprite dodge`, e)), 220);
}

/** A power worked by a character plays its sprite's casting move, for any module that says so: Hooks.callAll("wodxPowerShown", actor, {target, power, group, kind, line}); the effect's look is read from those (SR.fxFor), or named outright as fx. */
function onPower(actor, info = {}) {
  if ( !on() ) return;
  const from = spriteTokenOf(actor, info.token), name = from?.document.flags?.[MOD]?.sprite;
  if ( name && may(from) ) {
    // a power only one line has shows as that line's move, look or veil (B5810 to B5819)
    const lm = LR.powerMove({...info, line: info.line ?? actor?.type ?? ""}, SR.ACTS[name] ?? []);
    if ( lm.veil ) { veil(from.document, from.document.flags?.[MOD]?.veil?.kind === lm.veil ? null : lm.veil).catch(() => null); return; }
    if ( lm.move || lm.look ) {
      if ( lm.move ) play(from.document, lm.move, null, {}).catch(() => null);
      if ( lm.look ) flash(from.document, lm.look).catch(() => null);
      if ( lm.look === "motes" && info.target ) { const to = spriteTokenOf(info.target, info.targetToken); if ( to?.document.flags?.[MOD]?.sprite ) flash(to.document, "motes").catch(() => null); }
      return;
    }
  }
  const move = name ? SR.moveFor(name, {power: true}) : null;
  if ( !move || !may(from) ) return;
  const to = info.target ? spriteTokenOf(info.target, info.targetToken) : null;
  play(from.document, move, to?.document ?? null, {fx: SR.fxFor(info)}).catch(e => console.warn(`${MOD} | sprite power`, e));
}

/** Help a fallen figure up again: the held frame is let go on every screen. */
export async function rise(tokenDoc) {
  tokenDoc = tokenDoc?.document ?? tokenDoc;
  const a = tokenDoc?.flags?.[MOD]?.act;
  if ( !a?.hold ) return false;
  await tokenDoc.update({flags: {[MOD]: {act: {name: "", hold: false, fx: "", by: "", n: (a.n ?? 0) + 1}}}}, {animate: false});
  return true;
}

/* Harm reaches a figure: it takes the blow, falls, or dies, a moment after the attacker strikes. The active Storyteller's computer sends it. */
function reactTo(actor, info, from) {
  if ( !mine() || !(info?.levels > 0) ) return;
  const to = spriteTokenOf(actor), name = to?.document.flags?.[MOD]?.sprite;
  const lying = to?.document.flags?.[MOD]?.act;   // one who only sits or kneels still takes the blow
  if ( !name || lying?.hold && !SR.STAY.includes(lying.name) && info.condition !== "dead" && info.condition !== "finaldeath" ) return;
  const move = SR.reactFor(info.condition ?? null, healthLevel(actor?.system?.health));
  if ( !SR.hasAct(name, move) ) return;
  setTimeout(() => play(to.document, move, from?.document ?? null).catch(e => console.warn(`${MOD} | sprite reaction`, e)), from ? 280 : 0);
}

/* A figure that is no longer out of the fight gets up (the Storyteller's computer): healing, or harm undone. */
function onActorUpdate(actor, change) {
  if ( change?.system ) try { onPools(actor, change); } catch (e) { console.warn(`${MOD} | line look`, e); }
  if ( !on() || !mine() || change?.system?.health === undefined ) return;
  if ( healthLevel(actor.system?.health) >= 7 ) {
    // a health track filled by hand (the sheet, a macro) sends no word of harm: the figure still goes down, a moment later so a real blow's own reaction comes first
    setTimeout(() => { if ( healthLevel(actor.system?.health) < 7 ) return;
      for ( const t of canvas.tokens?.placeables ?? [] ) { const f = t.document.flags?.[MOD] ?? {};
        if ( t.actor === actor && f.sprite && !(f.act?.hold && !SR.STAY.includes(f.act.name)) && SR.hasAct(f.sprite, "fall") ) play(t.document, "fall").catch(() => null); } }, 900);
    return;
  }
  for ( const t of canvas.tokens?.placeables ?? [] ) if ( t.actor === actor && t.document.flags?.[MOD]?.act?.hold && !SR.STAY.includes(t.document.flags[MOD].act.name) ) {
    // a mummy come back from death sits up out of its sarcophagus (B5816); anyone else just gets up
    const sp = t.document.flags[MOD].sprite;
    (actor.type === "Mummy" && SR.hasAct(sp, "situp") ? play(t.document, "situp") : rise(t.document)).catch(() => null);
  }
}

/* Things that happen in the game play their move by themselves (B2612): feeding, a change of form, a line spoken in character. */
function onFed(info = {}) {
  if ( !on() || !mine() ) return;
  const toks = canvas.tokens?.placeables ?? [], by = toks.find(t => t.actor?.uuid === info.by?.uuid && t.document.flags?.[MOD]?.sprite);
  const ves = toks.find(t => t.actor?.uuid === info.vessel?.uuid && t.document.flags?.[MOD]?.sprite);
  if ( by ) {
    // a ghoul given vitae drinks it; a Kindred takes the vessel from behind and the vessel swoons (B5810, B5817)
    const name = by.document.flags[MOD].sprite, has = SR.ACTS[name] ?? [];
    const move = has.includes("quaff") && !ves ? "quaff" : has.includes("embrace") ? "embrace" : "feed";
    play(by.document, move, ves?.document ?? null).catch(() => null);
    if ( by.document.flags?.[MOD]?.need ) by.document.update({flags: {[MOD]: {need: false}}}, {animate: false}).catch(() => null);
  }
  if ( ves && SR.hasAct(ves.document.flags[MOD].sprite, "swoon") && by?.actor?.type === "Vampire" ) play(ves.document, "swoon", by?.document ?? null).catch(() => null);
}
/** Work at a door, a lock or a device plays its move (B2616): Hooks.callAll("wodxInteractableWorked", {token, action, thing, scene, result}). */
function onWorked(info = {}) {
  if ( !on() || !mine() ) return;
  const t = (canvas.tokens?.placeables ?? []).find(t => t.document.uuid === info.token), name = t?.document.flags?.[MOD]?.sprite;
  const move = name ? SR.workFor(name, info.action) : null;
  if ( move && !t.document.flags?.[MOD]?.act?.hold ) play(t.document, move).catch(() => null);
}
function onForm(actor, form) {
  if ( !on() || !mine() ) return;
  const f = LR.formOf(form);
  for ( const t of canvas.tokens?.placeables ?? [] ) if ( (t.actor === actor || (actor?.uuid && t.actor?.uuid === actor.uuid)) && t.document.flags?.[MOD]?.sprite ) {
    // a Garou drawn in every form goes through the forms between, each in turn (B5813); one drawn once only shows the change
    const name = t.document.flags[MOD].sprite;
    if ( f && SR.formShown(name) && SR.formSprite(name, f) ) shiftByStages(t.document, f).catch(e => console.warn(`${MOD} | change of form`, e));
    else play(t.document, "shift").catch(() => null);
  }
}
function onSpoken(msg) {
  if ( !on() || !mine() || msg?.isRoll || msg?.whisper?.length || !msg?.speaker?.token ) return;
  if ( msg.style !== undefined && msg.style !== CONST.CHAT_MESSAGE_STYLES?.IC ) return;
  if ( Object.keys(msg.flags ?? {}).some(k => k.startsWith("wodx-")) ) return;   // a card from a WoDX module is not speech
  const t = canvas.tokens?.get(msg.speaker.token), f = t?.document.flags?.[MOD];
  if ( f?.sprite && !f.act?.hold && !acts.has(t.id) ) play(t.document, "talk").catch(() => null);
}

/** Sit, kneel, look about or stand up: a small window for whoever may move the token. */
export async function pose(tokenDoc) {
  tokenDoc = tokenDoc?.document ?? tokenDoc;
  const name = tokenDoc?.flags?.[MOD]?.sprite, down = !!tokenDoc?.flags?.[MOD]?.act?.hold;
  const can = ["seat", "stool", "sit", "kneel", "sleep", "sup", "work", "tend", "dig", "graze", "lie", "search", "talk", ...Object.keys(LR.LINE_LABELS).filter(m => m !== "swoon" && m !== "embrace")].filter(a => SR.hasAct(name, a));
  if ( !can.length ) return null;
  const buttons = [...can.map(a => ({action: a, label: SR.ACT_LABELS[a]})), ...(down ? [{action: "rise", label: "Stand up"}] : []), {action: "cancel", label: "Cancel"}];
  const a = await foundry.applications.api.DialogV2.wait({window: {title: `What ${tokenDoc.name} does`}, classes: ["wodx-dialog"], rejectClose: false,
    content: "<p>The figure on the map does it for everyone to see. One that sits, kneels, sleeps or works stays at it until it stands up or walks off.</p>", buttons});
  if ( !a || a === "cancel" ) return null;
  if ( a === "rise" ) return rise(tokenDoc);
  if ( down ) await rise(tokenDoc);
  return play(tokenDoc, a);
}

/* ---- everyday life by routine (B5665) ---- */
const animalOf = actor => /^creature$/i.test(actor?.type ?? "");
/** What the routine says this token's character is doing now, and the kind of place it is in: {activity, place} or null. */
function doingOf(tokenDoc) {
  const actor = tokenDoc?.actor, b = actor?.isToken ? actor.baseActor ?? actor : actor;
  const w = b?.flags?.["wodx-npc"]?.where;
  if ( !w?.activity || b.flags?.["wodx-npc"]?.paused ) return null;
  let place = null;
  try { const d = w.place ? fromUuidSync(w.place) : null; place = d?.flags?.["wodx-npc"]?.place?.kind ?? null; } catch (e) { place = null; }
  place ??= tokenDoc.parent?.flags?.["wodx-npc"]?.place?.kind ?? null;
  return {activity: w.activity, place};
}
/** The pose a token should hold just now by its character's routine: {pose, facing, carry}, or null when it has no routine. */
/* The blanket colour read from a bed's picture (B5667), once per picture: null until it has loaded, then the colour. */
const colours = new Map();
function pictureColour(src) {
  if ( !src ) return null;
  if ( colours.has(src) ) return colours.get(src);
  colours.set(src, null);
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    try {
      const w = Math.min(64, img.naturalWidth || 64), h = Math.min(64, img.naturalHeight || 64), c = document.createElement("canvas");
      c.width = w; c.height = h;
      const x = c.getContext("2d", {willReadFrequently: true}); x.drawImage(img, 0, 0, w, h);
      colours.set(src, SR.blanketOf(x.getImageData(0, 0, w, h).data, w, h));
    } catch (e) { console.warn(`${MOD} | bed colour`, e); }
  };
  img.src = src;
  return null;
}

export function lifeOf(tokenDoc) {
  tokenDoc = tokenDoc?.document ?? tokenDoc;
  const name = tokenDoc?.flags?.[MOD]?.sprite, doing = name ? doingOf(tokenDoc) : null;
  if ( !doing ) return null;
  const g = tokenDoc.parent?.grid?.size ?? canvas.grid?.size ?? 100;
  const pt = {x: tokenDoc.x + (tokenDoc.width ?? 1) * g / 2, y: tokenDoc.y + (tokenDoc.height ?? 1) * g / 2};
  const things = [...(tokenDoc.parent?.tiles ?? [])].map(t => ({x: t.x, y: t.y, width: t.width, height: t.height, head: t.flags?.[MOD]?.head ?? null,
    blanket: SR.hexColour(t.flags?.[MOD]?.blanket) ?? pictureColour(t.texture?.src),
    name: `${t.flags?.[MOD]?.furniture ?? ""} ${String(t.texture?.src ?? "").split("/").pop()}`}));
  return SR.poseFor(doing.activity, {animal: animalOf(tokenDoc.actor), has: SR.ACTS[name] ?? [], ...SR.thingsBy(things, pt, g), place: doing.place,
    facing: states.get(tokenDoc.id)?.facing ?? tokenDoc.flags?.[MOD]?.act?.facing ?? "down"});
}
/**
 * Bring every figure of the scene in view to what its routine says (the active Storyteller's computer, every few
 * seconds): one that has come to rest takes its pose, one whose hour has changed gets up or takes the new pose. A pose
 * someone gave by hand, a figure in a fight and one that lies fallen are left alone. Returns how many were changed.
 */
export async function settle() {
  if ( !globalThis.canvas?.ready || !on() || !mine() ) return 0;
  const live = lifeOn(), now = performance.now();
  let n = 0;
  for ( const token of canvas.tokens?.placeables ?? [] ) {
    const doc = token.document, f = doc.flags?.[MOD] ?? {}, a = f.act;
    if ( !f.sprite ) continue;
    const st = states.get(token.id);
    // the character's own state first (B5810 to B5817): day sleep, torpor, frenzy, a ghoul's need; even in a fight
    if ( !["fall", "die"].includes(a?.name) && !(a?.hold && !["routine", "line"].includes(a.by)) && !st?.moving ) {
      const lh = lineWanted(doc);
      if ( lh ) {
        if ( !(a?.by === "line" && a.name === lh.pose && (a.look ?? null) === (lh.look ?? null)) ) { await play(doc, lh.pose, null, {by: "line", look: lh.look}); n++; }
        continue;
      }
      if ( a?.by === "line" && a.hold ) { await rise(doc); n++; continue; }
    }
    const ours = a?.hold && a.by === "routine";
    if ( a?.hold && !ours ) continue;                          // fallen, dead, or posed by hand
    if ( st?.moving || (st && now - st.last < 1200) || token.inCombat || doc.inCombat ) continue;
    const want = live ? lifeOf(doc) : null;
    if ( !!f.carry !== !!want?.carry ) { await doc.update({flags: {[MOD]: {carry: !!want?.carry}}}, {animate: false}); n++; }
    if ( !want?.pose ) { if ( ours ) { await rise(doc); n++; } continue; }
    if ( ours && a.name === want.pose && (a.name !== "sleep" || (a.facing === want.facing && (a.blanket ?? null) === want.blanket)) ) continue;
    await play(doc, want.pose, null, {face: want.facing, by: "routine", blanket: want.blanket}); n++;
  }
  return n;
}

/** Harm that names an attacker but came without an attack roll just before (an older Combat, harm applied by hand) still plays the attack. */
function onDamage(actor, info) {
  if ( !on() || !mine() ) return;
  const toks = canvas.tokens?.placeables ?? [];
  const from = info?.attacker ? toks.find(t => t.actor?.uuid === info.attacker && t.document.flags?.[MOD]?.sprite) : null;
  reactTo(actor, info, from ?? (info?.attacker ? toks.find(t => t.actor?.uuid === info.attacker) : null));
  if ( !from || performance.now() - (lately.get(from.id) ?? -Infinity) < 4000 ) return;
  const to = toks.find(t => t.actor === actor) ?? toks.find(t => t.actor?.uuid === actor?.uuid);
  play(from.document, null, to?.document ?? null).catch(e => console.warn(`${MOD} | sprite attack`, e));
}


/* ---- the moves only one line has (B5810 to B5819) -------------------------------------------------------------------------- */
/* A changeling shows its fae mien to the Storyteller, to changelings and Kinain and to the enchanted; everyone else sees the mortal seeming. */
function seemingFor(name) {
  const m = SR.SEEMING[name];
  if ( !m || !SR.SHEETS[m] ) return name;
  const c = game.user?.character;
  const fae = LR.seesFae({isGM: !!game.user?.isGM, line: c?.type ?? "", enchanted: !!(c?.flags?.["wodx-actions"]?.enchanted || c?.flags?.["wodx-chronicle"]?.enchanted)});
  return fae ? name : m;
}
/* Passing looks on this computer: token id -> [{kind, start}]. */
const looks = new Map(), marked = new Map(), touched = new Set();
function addLook(id, kind) {
  if ( !kind || !(kind in LR.LOOK_MS) ) return;
  const l = looks.get(id) ?? []; l.push({kind, start: performance.now()}); looks.set(id, l);
}
/** Show a passing look on a figure for everyone: halo, ring, motes, smoke, wings, sparks, flush, chill, glyph, ripple. */
export async function flash(tokenDoc, kind) {
  tokenDoc = tokenDoc?.document ?? tokenDoc;
  if ( !tokenDoc || !(kind in LR.LOOK_MS) ) return false;
  await tokenDoc.update({flags: {[MOD]: {flash: {kind, n: (tokenDoc.flags?.[MOD]?.flash?.n ?? 0) + 1}}}}, {animate: false});
  return true;
}
/** Put a veil on a figure or lift it (kind null): sunk into the earth, unseen, or riding another's body. */
export async function veil(tokenDoc, kind = null) {
  tokenDoc = tokenDoc?.document ?? tokenDoc;
  if ( !tokenDoc ) return false;
  await tokenDoc.update({flags: {[MOD]: {veil: LR.VEILS.includes(kind) ? {kind, since: Date.now()} : null}}}, {animate: false});
  return true;
}
function applyLooks(token, now) {
  const doc = token.document, f = doc.flags?.[MOD] ?? {}, m = token.mesh, own = !!(doc.isOwner || game.user?.isGM);
  const passing = (looks.get(token.id) ?? []).filter(l => !LR.lookAt(l.kind, now - l.start).done);
  if ( passing.length ) looks.set(token.id, passing); else looks.delete(token.id);
  const kinds = passing.map(l => [l.kind, now - l.start]);
  if ( f.veil?.kind && LR.VEILS.includes(f.veil.kind) && !passing.some(l => l.kind === "sink" || l.kind === "ripple") ) kinds.push([f.veil.kind, now]);
  if ( f.act?.look && LR.LOOK_HOLD.includes(f.act.look) && f.act.name ) kinds.push([f.act.look, now]);
  if ( token.actor?.type === "Wraith" ) kinds.push(["drift", now]);
  if ( !kinds.length ) {
    if ( touched.has(token.id) ) { touched.delete(token.id); m.pivot?.set?.(0, 0); m.tint = doc.texture?.tint ?? 0xffffff; fade(token, 1); marks(token, [], now); }
    return;
  }
  touched.add(token.id);
  let alpha = 1, tint = null, dy = 0, dx = 0;
  for ( const [k, t] of kinds ) { const o = LR.lookAt(k, t, {own}); alpha *= o.alpha; if ( o.tint !== null ) tint = o.tint; dy += o.dy; dx += o.dx; }
  const h = Math.abs(m.height) || 1, sx = Math.abs(m.scale?.x) || 1, sy = Math.abs(m.scale?.y) || 1;
  fade(token, alpha);   // a filter of its own, as Foundry sets the figure's own alpha again whenever it redraws the token
  m.tint = tint ?? doc.texture?.tint ?? 0xffffff;
  m.pivot?.set?.(-dx / sx, -(dy * h * .55) / sy);   // the figure fills about the lower half of its frame
  marks(token, kinds.map(([k, t]) => [k, t]).filter(([k]) => ["halo", "ring", "motes", "smoke", "wings", "sparks", "glyph"].includes(k)), now);
}
/* How faint a look leaves the figure: an alpha filter on the figure that only this module sets (1 takes it off). */
const fades = new Map();
function fade(token, a) {
  const m = token.mesh; if ( !m ) return;
  let f = fades.get(token.id);
  if ( a >= .999 ) { if ( f ) { m.filters = (m.filters ?? []).filter(x => x !== f); if ( !m.filters.length ) m.filters = null; fades.delete(token.id); } return; }
  if ( !f ) { f = new PIXI.AlphaFilter(a); fades.set(token.id, f); }
  if ( !(m.filters ?? []).includes(f) ) m.filters = [...(m.filters ?? []), f];
  f.alpha = a;
}
/* The drawn marks of a look, on a small canvas child of the token, in step with the figure. */
function marks(token, kinds, now) {
  let g = marked.get(token.id);
  if ( !kinds.length ) { if ( g ) { if ( !g.destroyed ) g.destroy(); marked.delete(token.id); } return; }
  if ( !g || g.destroyed || g.parent !== token ) { g = new PIXI.Graphics(); g.eventMode = "none"; marked.set(token.id, token.addChild(g)); }
  const m = token.mesh, h = Math.abs(m.height), w = Math.abs(m.width);
  const cx = m.position.x - token.position.x, top = m.position.y - token.position.y - (m.anchor?.y ?? .5) * h;
  const head = {x: cx, y: top + h * .3}, chest = {x: cx, y: top + h * .48}, feet = {x: cx, y: top + h * .78}, r = w * .09;
  g.clear();
  for ( const [k, t] of kinds ) {
    const u = Math.min(1, t / (LR.LOOK_MS[k] ?? 1000)), fade = Math.sin(u * Math.PI);
    if ( k === "halo" ) { g.lineStyle(Math.max(1, r * .25), 0xf2d27a, fade); g.drawEllipse(head.x, head.y - r * 1.4, r * 1.3, r * .45); g.lineStyle(0); g.beginFill(0xfff0c0, .25 * fade); g.drawCircle(chest.x, chest.y - r, r * 3); g.endFill(); }
    if ( k === "ring" ) { g.lineStyle(Math.max(1, r * .2), 0x8fd0ff, fade); g.drawCircle(head.x, head.y, r * (1.4 + u * .6)); }
    if ( k === "motes" ) for ( let i = 0; i < 9; i++ ) { const a = i * 2.4 + t / 300, y = chest.y - ((t / 12 + i * 23) % (h * .45)); g.beginFill([0xf5e08a, 0xb8f0d0, 0xf0b8e8][i % 3], fade); g.drawCircle(chest.x + Math.sin(a) * r * 2.6, y, Math.max(1, r * .22)); g.endFill(); }
    if ( k === "smoke" ) for ( let i = 0; i < 6; i++ ) { const y = chest.y + r - ((t / 18 + i * 19) % (h * .5)); g.beginFill(0x1a1620, .45 * fade); g.drawCircle(chest.x + Math.sin(i * 1.7 + t / 500) * r * 1.6, y, r * (1 + ((t / 400 + i) % 1.5))); g.endFill(); }
    if ( k === "wings" ) { g.beginFill(0x120c10, .55 * fade); for ( const s of [-1, 1] ) g.drawPolygon([chest.x, chest.y - r, chest.x + s * r * 6, head.y - r * 3, chest.x + s * r * 4.6, chest.y + r * 2, chest.x + s * r * 1.2, chest.y + r]); g.endFill(); g.beginFill(0xffe8b0, .35 * fade); g.drawCircle(chest.x, chest.y - r, r * 2.4 * (1 + u)); g.endFill(); }
    if ( k === "sparks" ) { g.lineStyle(Math.max(1, r * .18), 0xa8e0ff, fade); for ( let i = 0; i < 6; i++ ) { const a = i * 1.05 + t / 90, x0 = chest.x + Math.cos(a) * r * 2.5, y0 = chest.y + Math.sin(a) * r * 3; g.moveTo(x0, y0); g.lineTo(x0 + r * .6, y0 - r * .5); g.lineTo(x0 + r * .2, y0 - r); } }
    if ( k === "glyph" ) { g.lineStyle(Math.max(1, r * .2), 0xe8c060, fade); for ( let i = 0; i < 8; i++ ) { const a = i / 8 * Math.PI * 2 + t / 700; g.moveTo(feet.x + Math.cos(a) * r * 3.4, head.y + Math.sin(a) * r * 1.2 - r * 2); g.lineTo(feet.x + Math.cos(a) * r * 3.9, head.y + Math.sin(a) * r * 1.4 - r * 2.4); } }
  }
}
/* What a character's own state holds it in (day sleep, torpor, frenzy, a ghoul's need), read off the actor. */
function lineWanted(doc) {
  const actor = doc.actor, name = doc.flags?.[MOD]?.sprite;
  if ( !actor || !name ) return null;
  const fa = actor.flags?.["wodx-actions"] ?? {}, g = doc.parent?.grid?.size ?? canvas.grid?.size ?? 100;
  const near = [...(doc.parent?.tiles ?? [])].filter(t => doc.x + g > t.x - g * .35 && doc.x < t.x + t.width + g * .35 && doc.y + g > t.y - g * .35 && doc.y < t.y + t.height + g * .35);
  const coffin = near.some(t => /coffin|sarcophag|casket|crypt/i.test(`${t.flags?.[MOD]?.furniture ?? ""} ${t.texture?.src ?? ""}`));
  const kind = doc.parent?.flags?.["wodx-npc"]?.place?.kind ?? doingOf(doc)?.place ?? null;
  const corpus = actor.system?.advantages?.corpus?.temporary;   // a Wraith with no Corpus left lies in Slumber (B5817)
  return LR.lineHold({daySleep: !!fa.daySleep, torpor: !!fa.torpor, frenzy: actor.system?.conditions?.isfrenzy === true, need: doc.flags?.[MOD]?.need === true,
    slumber: actor.type === "Wraith" && corpus !== undefined && Number(corpus) <= 0,
    has: SR.ACTS[name] ?? [], coffin, open: SR.OPEN_PLACES.includes(kind)});
}
/* A Garou changes form by stages, each form shown in turn (B5813). */
async function shiftByStages(tokenDoc, form) {
  const name = tokenDoc.flags?.[MOD]?.sprite, from = SR.formShown(name), path = LR.stagesBetween(from ?? "homid", form);
  if ( !from || !path.length ) return false;
  for ( const f of path ) {
    const next = SR.formSprite(name, f);
    if ( !next ) continue;
    await give(tokenDoc, next);
    await play(tokenDoc, "shift").catch(() => null);
    await new Promise(r => setTimeout(r, 260));
  }
  return true;
}
function onMagick(actor, info = {}) {
  if ( !on() ) return;
  const t = spriteTokenOf(actor), name = t?.document.flags?.[MOD]?.sprite;
  if ( !name || !may(t) ) return;
  const move = LR.focusMove(actor?.system?.focus ?? {}, SR.ACTS[name] ?? []);
  play(t.document, move, null, {fx: "spirit-spark"}).catch(() => null);
  if ( info.botch ) flash(t.document, "sparks").catch(() => null);
}
function onCrossing(info = {}) {
  if ( !on() || !mine() ) return;
  for ( const id of info.tokens ?? [] ) { const t = canvas.tokens?.get(id?.id ?? id) ?? (canvas.tokens?.placeables ?? []).find(p => p.document.uuid === id); if ( t?.document.flags?.[MOD]?.sprite ) flash(t.document, "ripple").catch(() => null); }
}
function onCraving(info = {}) {
  if ( !on() || !mine() ) return;
  const t = spriteTokenOf(info.actor);
  if ( t?.document.flags?.[MOD]?.sprite && info.result !== "none" ) t.document.update({flags: {[MOD]: {need: true}}}, {animate: false}).catch(() => null);
}
/* Blood spent, Paradox gained, Banality gained: a short look on the figure. */
const pools = new Map();
function onPools(actor, change) {
  if ( !on() || !mine() ) return;
  const key = actor.uuid ?? actor.id, was = pools.get(key) ?? {};
  const now = {blood: Number(actor.system?.advantages?.bloodpool?.temporary), paradox: Number(actor.system?.paradox?.temporary ?? actor.system?.advantages?.paradox?.temporary), banality: Number(actor.system?.advantages?.banality?.temporary ?? actor.system?.banality?.temporary)};
  pools.set(key, now);
  const t = spriteTokenOf(actor);
  if ( !t?.document.flags?.[MOD]?.sprite ) return;
  if ( Number.isFinite(was.blood) && now.blood < was.blood && actor.type === "Vampire" ) flash(t.document, "flush").catch(() => null);
  if ( Number.isFinite(was.paradox) && now.paradox > was.paradox ) { flash(t.document, "sparks").catch(() => null); if ( !t.document.flags?.[MOD]?.act?.hold ) play(t.document, "hit").catch(() => null); }
  if ( Number.isFinite(was.banality) && now.banality > was.banality ) flash(t.document, "chill").catch(() => null);
}

export function startSprites() {
  if ( ticking ) return;
  ticking = true;
  Hooks.on("renderTokenHUD", addHudButton);
  Hooks.on("updateToken", onTokenUpdate);
  Hooks.on("wodxDamageApplied", onDamage);
  Hooks.on("wodxAttackRolled", onAttack);
  Hooks.on("wodxPowerShown", onPower);
  Hooks.on("updateActor", onActorUpdate);
  Hooks.on("wodxFed", onFed);
  Hooks.on("wodxFormChanged", onForm);
  Hooks.on("wodxMagickWorked", onMagick);
  Hooks.on("wodxShroudCrossing", onCrossing);
  Hooks.on("wodxGhoulCraving", onCraving);
  Hooks.on("wodxInteractableWorked", onWorked);
  Hooks.on("createChatMessage", onSpoken);
  loadOwn();
  const every = globalThis.setInterval?.(() => { settle().catch(e => console.warn(`${MOD} | routine poses`, e)); }, 2500);
  every?.unref?.();   // under Node (the test stand-in) the timer must not keep the process alive
  Hooks.on("canvasReady", () => { states.clear(); glows.clear(); strides.clear(); acts.clear();
    // whoever lay fallen or dead when the scene was last seen still lies there
    for ( const t of canvas.tokens?.placeables ?? [] ) { const a = t.document.flags?.[MOD]?.act, n = t.document.flags?.[MOD]?.sprite;
      if ( a?.hold && SR.HOLD.includes(a.name) && SR.hasAct(n, a.name) ) { base(n, a.name); acts.set(t.id, {act: a.name, fx: null, blanket: SR.hexColour(a.blanket), hold: true, held: !SR.LOOP.includes(a.name), loop: SR.LOOP.includes(a.name), facing: SR.ROW[a.facing] !== undefined ? a.facing : null, start: SR.LOOP.includes(a.name) ? performance.now() : -Infinity}); } } canvas.app?.ticker?.remove(tick); canvas.app?.ticker?.add(tick); });
  if ( globalThis.canvas?.ready ) canvas.app?.ticker?.add(tick);
}

/** Give a placed token a sprite. The token keeps its old picture in a flag, so clear() can put it back. */
export async function give(tokenDoc, name) {
  if ( !SR.SHEETS[name] ) throw new Error(`No sprite sheet called ${name}`);
  const fl = tokenDoc.flags?.[MOD] ?? {};
  const t = tokenDoc.texture ?? {};
  const prev = fl.spritePrev ?? {src: t.src, scaleX: t.scaleX, scaleY: t.scaleY, anchorX: t.anchorX, anchorY: t.anchorY, fit: t.fit};
  // a creature bigger than a person takes the squares its true size needs, and gives them back with clear() (B2618)
  const size = SR.squaresOf(name), prevSize = fl.spritePrevSize ?? (size ? {width: tokenDoc.width, height: tokenDoc.height} : null);
  return tokenDoc.update({texture: {src: SR.stillPath(name), ...SR.TOKEN}, ...(size ?? prevSize ?? {}), flags: {[MOD]: {sprite: name, spritePrev: prev, ...(prevSize ? {spritePrevSize: prevSize} : {})}}});
}

/** Take the sprite off again and put the old picture back. */
export async function clear(tokenDoc) {
  const prev = tokenDoc.flags?.[MOD]?.spritePrev, size = tokenDoc.flags?.[MOD]?.spritePrevSize;
  if ( prev ) await tokenDoc.update({texture: prev, ...(size ?? {})});
  await tokenDoc.unsetFlag(MOD, "spritePrevSize");
  await tokenDoc.unsetFlag(MOD, "sprite");
  await tokenDoc.unsetFlag(MOD, "act");
  await tokenDoc.unsetFlag(MOD, "spritePrev");
  return tokenDoc;
}

/** The Storyteller picks a sprite for a token from the token's own buttons (the figure icon). */
export async function pick(tokenDoc) {
  const cur = tokenDoc.flags?.[MOD]?.sprite ?? "";
  const opts = [["", "None, the token's own picture"], ...SR.offered(tokenDoc.actor?.id ?? tokenDoc.actorId)].map(([v, l]) => `<option value="${v}"${v === cur ? " selected" : ""}>${l}</option>`).join("");
  const content = `<p>The token shows a whole drawn figure that turns the way it moves and walks as it goes.</p><div class="form-group"><label for="wodx-sprite-pick">Sprite</label><select id="wodx-sprite-pick" name="sprite" data-fixed>${opts}</select></div>`;
  const name = await foundry.applications.api.DialogV2.wait({window: {title: `Sprite token: ${tokenDoc.name}`}, classes: ["wodx-dialog"], content, rejectClose: false,
    buttons: [{action: "ok", label: "Use this", default: true, callback: (ev, btn) => btn.form?.elements?.sprite?.value ?? ""}, {action: "cancel", label: "Cancel", callback: () => null}]});
  if ( name === null || name === undefined || name === "cancel" || name === cur ) return tokenDoc;
  return name ? give(tokenDoc, name) : clear(tokenDoc);
}

export function addHudButton(hud, html) {
  const el = html instanceof HTMLElement ? html : html?.[0];
  const col = el?.querySelector?.(".col.right") ?? el;
  const doc = hud?.object?.document ?? hud?.document;
  // what the figure does: for whoever may move the token, when it is a sprite that knows a pose
  if ( col && doc?.isOwner && on() && (SR.hasAct(doc.flags?.[MOD]?.sprite, "sit") || SR.hasAct(doc.flags?.[MOD]?.sprite, "lie")) && !col.querySelector(".wodx-sprite-pose") ) {
    const p = document.createElement("button");
    p.type = "button"; p.className = "control-icon wodx-sprite-pose"; p.dataset.tooltip = "Sit, sleep, work, look about"; p.setAttribute("aria-label", "Sit, sleep, work, look about");
    p.innerHTML = '<i class="fa-solid fa-chair"></i>';
    p.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); pose(doc); });
    col.append(p);
  }
  if ( !game.user?.isGM ) return;
  if ( !col || !doc || col.querySelector(".wodx-sprite-pick") ) return;
  const b = document.createElement("button");
  b.type = "button"; b.className = "control-icon wodx-sprite-pick"; b.dataset.tooltip = "Sprite token"; b.setAttribute("aria-label", "Sprite token");
  b.innerHTML = '<i class="fa-solid fa-person-walking"></i>';
  b.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); pick(doc); });
  col.append(b);
}

/* ---- a sprite for every character (B2586): the roster out, the drawn sheets in ---- */
const ownFolder = () => `worlds/${game.world.id}/wodx-sprites`;

/** Learn the sheets the last batch drew for this world. Quietly nothing when no batch has run yet. */
export async function loadOwn() {
  try {
    const r = await fetch(`${ownFolder()}/manifest.json?t=${Date.now()}`, {cache: "no-store"});
    if ( !r.ok ) return SR.learn(ownFolder(), null);
    const n = SR.learn(ownFolder(), await r.json());
    bases.clear(); frames.clear();
    return n;
  } catch (e) { console.warn(`${MOD} | own sprites`, e); return 0; }
}

/* ---- children (B3480): the age the body shows, and the age floor's mark for a figure drawn as a child ---- */
const YEAR_SECONDS = YEAR;
/**
 * The body's age in years ({age, minor}): from the birth year in the year shown, or, for Kindred and the walking dead,
 * the age at which the body stopped. minor is the age floor's own answer (WoDX Chronicle), or under 18 when it is off.
 */
export function ageOf(actor) {
  const ch = game.modules.get("wodx-chronicle")?.api, now = ch?.eras?.currentYear?.();
  // the year of a world time, counted back from the year shown (whole years, as the Chronicle's own calendar gives)
  const yearOf = t => Number.isFinite(now) && Number.isFinite(Number(t)) ? Math.round(now - ((game.time?.worldTime ?? 0) - Number(t)) / YEAR_SECONDS) : null;
  let age = null, facts = null;
  try {
    facts = ch?.age?.rules?.ageFacts?.(actor, yearOf) ?? null;
    if ( facts ) age = facts.frozenAt ?? (facts.born !== null && Number.isFinite(now) ? now - facts.born : null);
  } catch (e) { facts = null; }
  if ( age !== null ) age = Math.max(0, Math.floor(age));
  // the mark this module set for a figure drawn as a child does not count here, so that "Grown" can be picked again
  const ours = actor?.flags?.[MOD]?.childMark === true;
  let minor = age !== null && age < 18;
  try { if ( facts && ch.age.rules.isMinor ) minor = ch.age.rules.isMinor({...facts, marked: facts.marked && !ours}, now); } catch (e) { /* keep the plain answer */ }
  return {age, minor};
}
/**
 * A figure drawn as a child must count as a minor everywhere (B3210): when one is picked for a character the age floor
 * does not already hold under 18, set the Storyteller's minor mark, and remember that this module set it so that a later
 * pick of "Grown" takes only its own mark away.
 */
export async function markChild(actor, growth) {
  if ( !actor?.isOwner ) return;
  const ours = actor.flags?.[MOD]?.childMark === true, marked = actor.flags?.["wodx-chronicle"]?.minor === true;
  if ( growth ) {
    if ( marked || ageOf(actor).minor ) return;
    await actor.update({"flags.wodx-chronicle.minor": true, [`flags.${MOD}.childMark`]: true});
  } else if ( ours ) {
    await actor.update({"flags.wodx-chronicle.-=minor": null, [`flags.${MOD}.-=childMark`]: null});
  }
}

/** Every character of the world as the batch needs it. */
export function roster() {
  const actors = [], y = game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.();
  for ( const a of game.actors ?? [] ) {
    // a character with no portrait look yet gets the one its portrait would start from (the same seed, the same look)
    const L = a.flags?.[MOD]?.look ?? randomLook(a.id, {type: a.type ?? "", variant: a.system?.settings?.variant ?? ""}), c = L.colors ?? {};
    const ag = ageOf(a), growth = FG.growthOf({age: ag.age, minor: ag.minor, chosen: a.flags?.[MOD]?.figure?.growth ?? ""});
    if ( growth && !ag.minor && a.flags?.["wodx-chronicle"]?.minor !== true ) void markChild(a, growth).catch(e => console.warn(`${MOD} | child mark`, e));
    actors.push(SR.rosterOf({id: a.id, growth, name: a.name, type: a.type, variant: a.system?.settings?.variant ?? "", kith: a.system?.kith === "custom" ? a.system?.custom?.kith : a.system?.kith, skin: c.skin, hair: c.hair, beard: !!L.face?.beard, year: Number.isFinite(y) ? y : undefined, figure: a.flags?.[MOD]?.figure ?? null,
      items: [...(a.items ?? [])].map(i => ({name: i.name, type: i.type, worn: !!(i.system?.isequipped || i.system?.isactive), gear: !!i.flags?.["wodx-library"], natural: !!i.system?.isnatural}))}));
  }
  return {world: game.world.id, made: new Date().toISOString(), actors};
}

/** Write the roster where the batch reads it: the world's wodx-sprites folder. The Storyteller's computer only. */
export async function saveRoster() {
  if ( !game.user?.isGM ) return null;
  const FP = foundry.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker, r = roster();
  try { await FP.createDirectory("data", ownFolder()); } catch (e) { /* already there */ }
  await FP.upload("data", ownFolder(), new File([JSON.stringify(r, null, 1)], "roster.json", {type: "application/json"}), {}, {notify: false});
  return {path: `${ownFolder()}/roster.json`, actors: r.actors.length};
}

/** Give every token of a scene its character's own sprite, where one was drawn and the token has none yet. */
export async function dress(scene = canvas.scene) {
  if ( !game.user?.isGM ) return 0;
  let n = 0;
  for ( const t of scene?.tokens ?? [] ) {
    const name = SR.ownName(t.actorId);
    if ( !SR.isOwn(name) ) continue;
    // a token that already wears its own sprite is given it again only when its size is not the sprite's true size (B2618),
    // which also mends tokens made from an actor whose prototype carried the sprite but not the size
    const want = SR.squaresOf(name) ?? t.flags?.[MOD]?.spritePrevSize ?? null, has = t.flags?.[MOD]?.sprite;
    if ( has && (has !== name || !want || (t.width === want.width && t.height === want.height)) ) continue;
    await give(t, name); n++;
  }
  return n;
}

export const spriteApi = {flash, veil, lineWanted, faded: t => fades.get(t?.id ?? t)?.alpha ?? 1, looksOn: t => [...(looks.get(t?.id ?? t) ?? [])].map(l => l.kind), marked: t => !!marked.get(t?.id ?? t), seemingFor, shiftByStages, covered: t => { const c = covers.get(typeof t === "string" ? t : (t?.object?.id ?? t?.id)); return c && !c.destroyed ? {tint: c.tint, visible: c.visible, width: c.width} : null; }, ageOf, markChild, give, clear, pick, play, pose, rise, settle, lifeOf, roster, saveRoster, loadOwn, dress, own: id => SR.isOwn(SR.ownName(id)) ? SR.ownName(id) : null, squares: name => SR.squaresOf(name), fxFor: SR.fxFor, glowing: id => { const g = glows.get(id); return g && !g.destroyed ? {visible: g.visible, width: g.width, height: g.height, x: g.position.x, y: g.position.y} : null; }, acts: name => [...(SR.ACTS[name] ?? [])], playing: id => acts.get(typeof id === "string" ? id : (id?.document?.id ?? id?.id)), names: () => ({...SR.SHEETS}), state: id => states.get(id), rules: SR};
