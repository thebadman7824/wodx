import * as P from "./face64-rules.mjs";
import {healthLevel} from "./doll-rules.mjs";
import {FEATURES, featuresFor, rollFeatures} from "./face64-features.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

/**
 * WoDX Paperdoll 0.16.0: talking faces (B2790-B2796). When an NPC speaks to a character through WoDX NPC's Talk, the
 * line in chat carries the speaker's face, drawn on a 64 by 64 pixel grid and shown large with hard pixel edges. The face
 * blinks by itself, its mouth moves while the line types out, and it reacts to the character it speaks to (a social
 * roll that swayed it, frenzy, its set mood, its attitude, pain), then settles. Nothing is baked or uploaded: a face is
 * drawn in the browser in a moment from a seed, so each NPC keeps its face and passers-by from one actor still differ.
 *
 *   flags["wodx-paperdoll"].face64 = {fangs: true}   on a Kindred actor: fangs show when the face speaks or snarls (off by default)
 *
 * 0.17.0 (B2800-B2804): 110 extra features (face64-features.mjs). The Storyteller ticks them in the Actors menu
 * ("Talking face: features"); an NPC with none ticked rolls them by seed from what its sheet names (clan, kith, tribe,
 * house). Form and power features show only while that state is on: frenzy, Glabro, a demon's apocalyptic form, and the
 * ticked "showing now" states. Hidden marks keep to who may see them.
 *
 *   flags["wodx-paperdoll"].face64.features = ["v-gangrel-ears", ...]   ticked by the Storyteller (unset or null: rolled)
 *   flags["wodx-paperdoll"].face64.state = {shintai: true, ...}           states with no sheet field
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
  const S = P.roll(seed, line, {sex, fangs: !!own.fangs, kith: kith ?? ""});
  S.features = Array.isArray(own.features) ? own.features.filter(id => FEATURES[id]) : rollFeatures(seed, line, groupText(actor));
  return S;
}
/** What the sheet names that can bring features: its type and kind, clan, kith, tribe, breed, tradition, house and the like. */
const GROUP_KEYS = ["clan", "tribe", "breed", "auspice", "tradition", "affiliation", "faction", "kith", "seeming", "legacy", "house", "creed", "guild", "lineage", "dynasty", "dharma", "variant"];
export function groupText(actor) {
  const s = actor?.system ?? {}, out = [actor?.type ?? "", kindText(actor), s.settings?.variant ?? ""];
  for ( const k of GROUP_KEYS ) for ( const v of [s[k], s.custom?.[k], s[k]?.value, s.settings?.[k]] ) if ( typeof v === "string" && v ) out.push(v);
  return out.join(" ");
}
/** States that bring form and power features: frenzy, Glabro, a demon's risen apocalyptic form, and those ticked by hand. */
export function stateOf(actor) {
  const s = actor?.system ?? {}, own = actor?.flags?.[MOD]?.face64?.state ?? {};
  const demon = actor?.flags?.["wodx-actions"]?.demon ?? {};
  const scene = `${game.scenes?.viewed?.id ?? ""}:${Math.floor((game.time?.worldTime ?? 0) / 3600)}`;
  return {...own, frenzy: !!s.conditions?.isfrenzy || !!own.frenzy, glabro: !!s.shapes?.glabro?.isactive || !!own.glabro,
    visage: (!!demon.formScene && demon.formScene === scene) || !!own.visage};
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
  const key = JSON.stringify([S.seed, S.line, S.fangs, S.features, opts.expr, opts.eyes, opts.mouth, opts.level, opts.sees, opts.state]);
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
  c.getContext("2d").putImageData(frameData(S, {expr, eyes, mouth, level: lv, sees: viewerSees(), state: stateOf(actor)}), 0, 0);
  return c;
}

/* ---- A face that moves ---- */
/**
 * Plays one face: blinks now and then, speaks a line, holds a reaction, then settles to rest. One message can be drawn
 * more than once (the chat log, a pop-up notice, a re-render after an update), so the player paints every canvas it is
 * given, joined or not, and stops by itself a few minutes after the line.
 */
class Talker {
  constructor(canvas, S, {level = 0, expr = "neutral", rest = "neutral", state = {}} = {}) {
    Object.assign(this, {canvases: new Set([canvas]), S, level, expr, rest, state, eyes: "open", mouth: null, timers: new Set(), sees: viewerSees()});
    this.paint();
  }
  get canvas() { return [...this.canvases].at(-1); }
  /** Another drawing of the same message joins the face as it plays. */
  join(canvas) { for ( const c of this.canvases ) if ( this.started && !c.isConnected ) this.canvases.delete(c); this.canvases.add(canvas); this.paint(); }
  paint() {
    const d = frameData(this.S, {expr: this.expr, eyes: this.eyes, mouth: this.mouth, level: this.level, sees: this.sees, state: this.state});
    for ( const c of this.canvases ) c.getContext("2d").putImageData(d, 0, 0);
  }
  later(fn, ms) { const t = setTimeout(() => { this.timers.delete(t); if ( this.alive() ) fn(); }, ms); this.timers.add(t); }
  alive() { return !this.stopped; }
  stop() { this.stopped = true; PLAYING.forEach((v, k) => { if ( v === this ) PLAYING.delete(k); }); for ( const t of this.timers ) clearTimeout(t); this.timers.clear(); }
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
/** Faces now playing, by message: a second drawing of the message joins the one already playing. */
const PLAYING = new Map();
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
  const live = PLAYING.get(msg.id);
  if ( live && !live.stopped ) return live.join(c);
  const fresh = Date.now() - (msg.timestamp ?? 0) < 20000 && !PLAYED.has(msg.id);
  const t = new Talker(c, S, {level, expr: fresh && mode === "move" ? expr : rest, rest, state: stateOf(npc)});
  if ( !(fresh && mode === "move") ) return;
  PLAYED.add(msg.id); PLAYING.set(msg.id, t);
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

/* ---- The Storyteller ticks an NPC's features ---- */
const HAND_STATES = {shintai: "Demon shintai", paradox: "Paradox backlash", catharsis: "Catharsis (the Shadow rules)"};
const escH = s => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
/** A window of every feature the actor's line may show, ticked as the face now has them. Save keeps the ticks; Roll goes back to the seed. */
export async function pickFeatures(actor) {
  if ( !actor || !game.user?.isGM ) return null;
  const S = specOf(actor), have = new Set(S.features), own = actor.flags?.[MOD]?.face64?.state ?? {};
  const list = featuresFor(S.line, groupText(actor)).map(f => `<li><label><input type="checkbox" name="f" value="${f.id}"${have.has(f.id) ? " checked" : ""}>
    ${escH(f.label)} <span class="hint">${escH(f.group === "all" ? "" : f.group)}${f.state ? ` (shows only ${f.state === "tears" ? "in tears" : `in ${f.state}`})` : ""}</span></label></li>`).join("");
  const states = Object.entries(HAND_STATES).map(([k, n]) => `<li><label><input type="checkbox" name="s" value="${k}"${own[k] ? " checked" : ""}> ${n}</label></li>`).join("");
  const content = `<p>Ticked features show on ${escH(actor.name)}'s talking face. Unticked NPCs roll theirs from what the sheet names (clan, kith, tribe, house).</p>
    ${searchBox("ul.wodx-face-feats", "Find a feature…", "Find a feature")}<ul class="wodx-face-feats" style="max-height:340px;overflow:auto;list-style:none;padding:0">${list}</ul>
    <p><b>Showing now</b> (states the sheet does not track):</p><ul data-fixed style="list-style:none;padding:0">${states}</ul>`;
  const read = (b, name) => [...b.form.querySelectorAll(`input[name=${name}]:checked`)].map(i => i.value);
  const out = await foundry.applications.api.DialogV2.wait({window: {title: `Talking face: ${actor.name}`}, classes: ["wodx-dialog"], content, rejectClose: false,
    buttons: [{action: "save", label: "Keep these", default: true, callback: (e, b) => ({f: read(b, "f"), s: read(b, "s")})},
      {action: "roll", label: "Roll them by seed", callback: (e, b) => ({roll: true, s: read(b, "s")})}, {action: "cancel", label: "Cancel"}]});
  if ( !out || out === "cancel" ) return null;
  const state = Object.fromEntries(Object.keys(HAND_STATES).map(k => [k, out.s.includes(k)]));
  if ( out.roll ) return actor.update({[`flags.${MOD}.face64.features`]: null, [`flags.${MOD}.face64.state`]: state});
  return actor.update({[`flags.${MOD}.face64.features`]: out.f, [`flags.${MOD}.face64.state`]: state});
}
function featureOption(app, options) {
  const of = li => game.actors.get(li?.dataset?.entryId ?? li?.[0]?.dataset?.entryId);
  options.push({name: "Talking face: features", icon: '<i class="fa-solid fa-face-grimace"></i>', condition: li => game.user.isGM && !!of(li),
    callback: li => pickFeatures(of(li))});
}

export function startFaces() {
  Hooks.on("getActorContextOptions", featureOption);
  Hooks.on("renderChatMessageHTML", (msg, el) => { try { onRender(msg, el); } catch (e) { console.error(`${MOD} | talking face`, e); } });
  Hooks.on("getActorContextOptions", fangOptions);
}

/** api.faces: draw a face, read its look, or play one in a canvas of your own. */
export const faceApi = {
  rules: P, features: FEATURES, spec: specOf, state: stateOf, canvas: drawCanvas, reaction: reactionOf, pickFeatures,
  play(canvas, actor, text, {expr = "neutral", rest = "neutral", tokDoc = null} = {}) {
    const S = specOf(actor, tokDoc); if ( !S || !canvas ) return null;
    const t = new Talker(canvas, S, {level: healthLevel(actor.system?.health), expr, rest, state: stateOf(actor)}); t.play(text); return t;
  }
};
