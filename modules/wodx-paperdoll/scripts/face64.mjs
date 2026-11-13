import * as P from "./face64-rules.mjs";
import {healthLevel} from "./doll-rules.mjs";

/**
 * WoDX Paperdoll 0.16.0: talking faces (B2790-B2796). When an NPC speaks to a character through WoDX NPC's Talk, the
 * line in chat carries the speaker's face, drawn on a 64 by 64 pixel grid and shown large with hard pixel edges. The face
 * blinks by itself, its mouth moves while the line types out, and it reacts to the character it speaks to (a social
 * roll that swayed it, frenzy, its set mood, its attitude, pain), then settles. Nothing is baked or uploaded: a face is
 * drawn in the browser in a moment from a seed, so each NPC keeps its face and passers-by from one actor still differ.
 *
 *   flags["wodx-paperdoll"].face64 = {fangs: true}   on a Kindred actor: fangs show when the face speaks or snarls (off by default)
 */

const MOD = "wodx-paperdoll";
const NPC = "wodx-npc";
const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return undefined; } };

export function registerFaceSettings() {
  game.settings.register(MOD, "talkingFaces", {scope: "client", config: true, name: "Talking faces",
    hint: "An NPC's face beside each line it speaks to your character. Moving: it blinks, speaks the line and reacts. Still: the face only. Off: no face.",
    type: String, choices: {move: "Moving", still: "Still", off: "Off"}, default: "move"});
}

/* ---- Who the face belongs to ---- */
const kindText = actor => { try { return String(game.modules.get("wodx-combat")?.api?.getKind?.(actor) ?? ""); } catch (e) { return ""; } };
/** The face's lasting look: line from the sheet, seed from the actor (or the token, for unlinked tokens of one actor). */
export function specOf(actor, tokDoc = null) {
  if ( !actor ) return null;
  const s = actor.system ?? {}, own = actor.flags?.[MOD]?.face64 ?? {};
  const line = own.line && P.LINES[own.line] ? own.line : P.lineOf({type: actor.type ?? "", variant: `${s.settings?.variant ?? ""} ${s.settings?.variantsheet ?? ""}`,
    clan: `${s.clan ?? ""} ${s.custom?.clan ?? ""}`, kind: kindText(actor)});
  const seed = own.seed ?? (tokDoc && !tokDoc.actorLink ? tokDoc.id : (actor.isToken ? (game.actors.get(actor.id)?.id ?? actor.id) : actor.id));
  const sex = actor.flags?.[MOD]?.look?.face?.gender || {female: "woman", male: "man"}[actor.flags?.["wodx-creation"]?.people?.sex] || "";
  const kith = s.kith === "custom" ? s.custom?.kith : s.kith;
  return P.roll(seed, line, {sex, fangs: !!own.fangs, kith: kith ?? ""});
}
/** What the viewer may see: the Storyteller sees all; a changeling sees the fae mien; one of the imbued sees a sigil. */
function viewerSees() {
  if ( game.user?.isGM ) return {fae: true, sigil: true};
  const me = game.user?.character, line = me ? P.lineOf({type: me.type ?? "", variant: me.system?.settings?.variant ?? "", kind: kindText(me)}) : "mortal";
  return {fae: line === "changeling", sigil: line === "hunter"};
}

/* ---- Pixels to the page ---- */
const CACHE = new Map();
function frameData(S, opts) {
  const key = JSON.stringify([S.seed, S.line, S.fangs, opts.expr, opts.eyes, opts.mouth, opts.level, opts.sees]);
  let d = CACHE.get(key);
  if ( !d ) {
    d = new ImageData(P.drawFace(S, opts).rgba, P.N, P.N);
    CACHE.set(key, d);
    if ( CACHE.size > 600 ) CACHE.delete(CACHE.keys().next().value);
  }
  return d;
}
/** A 64 by 64 canvas of one actor's face, shown at any size with hard pixel edges. */
export function drawCanvas(actor, {expr = "neutral", eyes = "open", mouth = null, level = null, tokDoc = null, canvas = null} = {}) {
  const S = specOf(actor, tokDoc);
  if ( !S ) return null;
  const c = canvas ?? Object.assign(document.createElement("canvas"), {width: P.N, height: P.N, className: "wodx-face64"});
  const lv = level ?? healthLevel(actor.system?.health);
  c.getContext("2d").putImageData(frameData(S, {expr, eyes, mouth, level: lv, sees: viewerSees()}), 0, 0);
  return c;
}

/* ---- A face that moves ---- */
/**
 * Plays one face in a canvas: blinks now and then, speaks a line, holds a reaction, then settles to rest. Stops by
 * itself once the canvas leaves the page.
 */
class Talker {
  constructor(canvas, S, {level = 0, expr = "neutral", rest = "neutral"} = {}) {
    Object.assign(this, {canvas, S, level, expr, rest, eyes: "open", mouth: null, timers: new Set(), sees: viewerSees()});
    this.paint();
  }
  paint() {
    if ( !this.canvas.isConnected && this.started ) return this.stop();
    this.canvas.getContext("2d").putImageData(frameData(this.S, {expr: this.expr, eyes: this.eyes, mouth: this.mouth, level: this.level, sees: this.sees}), 0, 0);
  }
  later(fn, ms) { const t = setTimeout(() => { this.timers.delete(t); if ( this.alive() ) fn(); }, ms); this.timers.add(t); }
  alive() { if ( this.stopped ) return false; if ( this.started && !this.canvas.isConnected ) { this.stop(); return false; } return true; }
  stop() { this.stopped = true; for ( const t of this.timers ) clearTimeout(t); this.timers.clear(); }
  blinkLoop() {
    if ( this.level >= 7 ) return;
    this.later(() => {
      let at = 0;
      for ( const b of P.BLINK ) { this.later(() => { this.eyes = b.eyes; this.paint(); }, at); at += b.ms; }
      this.later(() => { this.eyes = "open"; this.paint(); this.blinkLoop(); }, at);
    }, P.nextBlink());
  }
  /** Speak a line, then hold the reaction, then rest. onShown(n) is told how much of the line is out. */
  play(text, {onShown = null, hold = 2400} = {}) {
    this.started = true; this.blinkLoop();
    if ( this.level >= 7 ) { onShown?.(Infinity); return; }
    let at = 250;
    for ( const st of P.speechSteps(text) ) { this.later(() => { this.mouth = st.mouth; this.paint(); onShown?.(st.shown); }, at); at += st.ms; }
    this.later(() => { this.mouth = null; this.paint(); onShown?.(Infinity); }, at);
    this.later(() => { this.expr = this.rest; this.paint(); }, at + hold);
    // a face left open on screen keeps blinking for a few minutes, then rests still
    this.later(() => this.stop(), at + hold + 180000);
  }
}

/* ---- Reading the NPC and the one it speaks to ---- */
function reactionOf(npc, pc) {
  const now = game.time?.worldTime ?? 0;
  const sways = Array.isArray(pc?.flags?.["wodx-actions"]?.sways) ? pc.flags["wodx-actions"].sways : [];
  const npcIds = new Set([npc?.id, game.actors.get(npc?.id)?.id].filter(Boolean));
  const live = sways.filter(x => x && npcIds.has(x.npc) && (!Number.isFinite(Number(x.until)) || Number(x.until) >= now)).sort((a, b) => (Number(b.at) || 0) - (Number(a.at) || 0));
  const step = npc?.flags?.[NPC]?.attitude?.[pc?.id]?.step ?? 0;
  return P.reactionFor({sway: live[0]?.kind ?? "", frenzy: !!npc?.system?.conditions?.isfrenzy, mood: npc?.flags?.[NPC]?.behavior?.mood ?? "",
    step, level: healthLevel(npc?.system?.health)});
}
const PLAYED = new Set();
/** A talk line in chat gets its speaker's face; a new line plays once on each screen, older ones show it still. */
function onRender(msg, el) {
  const talk = msg.flags?.[NPC]?.talk;
  const mode = setting("talkingFaces") ?? "move";
  if ( !talk || mode === "off" || !el || el.querySelector?.(".wodx-face64-wrap") ) return;
  const tokDoc = game.scenes.get(msg.speaker?.scene)?.tokens?.get(msg.speaker?.token) ?? null;
  const npc = tokDoc?.actor ?? null;
  if ( !npc ) return;
  const S = specOf(npc, tokDoc);
  const pc = game.actors.get(talk.actor) ?? null;
  const {expr, rest} = reactionOf(npc, pc);
  const level = healthLevel(npc.system?.health);
  const wrap = document.createElement("div");
  wrap.className = "wodx-face64-wrap";
  const c = Object.assign(document.createElement("canvas"), {width: P.N, height: P.N, className: "wodx-face64"});
  c.setAttribute("role", "img"); c.setAttribute("aria-label", `${npc.name ?? "The speaker"}'s face`);
  wrap.append(c);
  const body = el.querySelector(".message-content") ?? el;
  body.prepend(wrap);
  const fresh = Date.now() - (msg.timestamp ?? 0) < 20000 && !PLAYED.has(msg.id);
  const t = new Talker(c, S, {level, expr: fresh && mode === "move" ? expr : rest, rest});
  if ( !(fresh && mode === "move") ) return;
  PLAYED.add(msg.id);
  t.play(talk.said ?? body.textContent ?? "");
}

/* ---- The Storyteller's switch for a Kindred's fangs ---- */
function fangOptions(app, options) {
  const of = li => game.actors.get(li?.dataset?.entryId ?? li?.[0]?.dataset?.entryId);
  const isKin = a => { const S = specOf(a); return !!a && (S?.line === "kindred"); };
  options.push({name: "Talking face: show fangs", icon: '<i class="fa-solid fa-teeth"></i>',
    condition: li => game.user.isGM && isKin(of(li)) && !of(li)?.flags?.[MOD]?.face64?.fangs,
    callback: li => of(li)?.update({[`flags.${MOD}.face64.fangs`]: true})});
  options.push({name: "Talking face: hide fangs", icon: '<i class="fa-solid fa-teeth"></i>',
    condition: li => game.user.isGM && isKin(of(li)) && !!of(li)?.flags?.[MOD]?.face64?.fangs,
    callback: li => of(li)?.update({[`flags.${MOD}.face64.fangs`]: false})});
}

export function startFaces() {
  Hooks.on("renderChatMessageHTML", (msg, el) => { try { onRender(msg, el); } catch (e) { console.error(`${MOD} | talking face`, e); } });
  Hooks.on("getActorContextOptions", fangOptions);
}

/** api.faces: draw a face, read its look, or play one in a canvas of your own. */
export const faceApi = {
  rules: P, spec: specOf, canvas: drawCanvas, reaction: reactionOf,
  play(canvas, actor, text, {expr = "neutral", rest = "neutral", tokDoc = null} = {}) {
    const S = specOf(actor, tokDoc); if ( !S || !canvas ) return null;
    const t = new Talker(canvas, S, {level: healthLevel(actor.system?.health), expr, rest}); t.play(text); return t;
  }
};
