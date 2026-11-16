/**
 * WoDX Actions (B5793-B5795): a binding holds a player character's token, not only a card (say-or-do audit d19).
 * While a binding effect runs on a character a player moves:
 *   still  Hold and Possess: the player cannot move the token (the one who possesses moves the body)
 *   away   Fear: the token cannot be moved closer to the one feared
 *   ask    Sway and Bind (a command, an oath), and a Kuei-jin's shadow soul: each move goes to the Storyteller, who allows or refuses it
 * The Storyteller moves any token freely. With no Storyteller on (a Lone Chronicle), a command's move stands with a reminder. The world setting "Bindings hold the token" turns it off.
 */
import { cannotAct } from "./limits.js";

const MOD = "wodx-actions";
const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);

export const RULE = {hold: "still", possess: "still", fear: "away", sway: "ask", bind: "ask"};
const KEY_RE = /^wodx-effect-(hold|possess|fear|sway|bind)$/;

/** The bindings an actor is under: [{key, rule, name, by}]. Pure over a plain {effects: [...]} too. */
export function bindingsOn(actor) {
  const out = [];
  for ( const e of actor?.effects ?? [] ) {
    if ( e.disabled ) continue;
    const tk = String(e.flags?.["wodx-chronicle"]?.timed?.key ?? "");
    // B6018: shadow soul (Kindred of the East): the P'o has the body, so each move goes to the Storyteller, as a command's does
    if ( tk === "wodx-kote-soul" && [...(e.statuses ?? [])].some(x => String(x).endsWith("shadow-soul")) ) {
      out.push({key: "shadow", rule: "ask", name: "Shadow soul", by: null, id: e.id ?? null}); continue;
    }
    const m = tk.match(KEY_RE);
    if ( !m ) continue;
    out.push({key: m[1], rule: RULE[m[1]], name: e.name ?? m[1], by: e.flags?.[MOD]?.bindBy ?? null, id: e.id ?? null});
  }
  return out;
}

/** What a binding does to one move. from/to/feared: {x, y}. Returns {ok} or {ok: false, ask, why}. */
export function judgeMove(binds, {from, to, feared = []} = {}) {
  if ( !binds?.length ) return {ok: true};
  const still = binds.find(b => b.rule === "still");
  if ( still ) return {ok: false, why: `${still.name}: the body does not move${still.key === "possess" ? " for you; the one who possesses it moves it" : ""}.`};
  const d = (a, b) => Math.hypot(n(a.x) - n(b.x), n(a.y) - n(b.y));
  const away = binds.find(b => b.rule === "away");
  if ( away && from && to && feared.some(f => d(to, f) < d(from, f) - 1) ) return {ok: false, why: `${away.name}: you cannot make yourself go nearer the one you fear.`};
  const ask = binds.find(b => b.rule === "ask");
  if ( ask ) return {ok: false, ask: true, why: `${ask.name}: the Storyteller decides whether this goes against what binds you.`};
  return {ok: true};
}

const tokenOfActorId = (scene, id) => (id ? [...(scene?.tokens ?? [])].find(t => t.actorId === id || t.actor?.id === id) : null);

function onPreUpdate(tok, change, options, userId) {
  if ( options?.wodxBindAllowed || game.user.id !== userId || game.user.isGM ) return true;
  if ( !("x" in change || "y" in change) ) return true;
  // B6372: a character asleep for the day or out cold (Asleep, torpor, staked...) does not walk; the Storyteller may move it.
  // B6660: nor, in a fight, a Dazed one: the turn is lost, the move with it (VtDA20 p. 333: movement is part of the turn)
  try { const idle = cannotAct(tok.actor); if ( idle ) { ui.notifications?.warn?.(idle); return false; } } catch (e) { /* no rule */ }
  try { if ( game.settings.get(MOD, "bindingsHold") === false ) return true; } catch (e) { return true; }
  const a = tok.actor;
  if ( !a?.hasPlayerOwner ) return true;
  const binds = bindingsOn(a);
  if ( !binds.length ) return true;
  const g = n(tok.parent?.grid?.size) || 100, w = n(tok.width) || 1, h = n(tok.height) || 1;
  const mid = p => ({x: n(p.x) + w * g / 2, y: n(p.y) + h * g / 2});
  const from = mid(tok), to = mid({x: change.x ?? tok.x, y: change.y ?? tok.y});
  const feared = binds.filter(b => b.rule === "away" && b.by).map(b => tokenOfActorId(tok.parent, b.by)).filter(Boolean).map(mid);
  const r = judgeMove(binds, {from, to, feared});
  if ( r.ok ) return true;
  // Lone Chronicle: with no Storyteller on, a command's move stands, with a reminder of what binds the character
  if ( r.ask && !game.users.activeGM ) { ui.notifications?.info?.(`${r.why.split(":")[0]}: play the move as the binding allows.`); return true; }
  ui.notifications?.warn?.(r.why);
  if ( r.ask ) game.socket.emit(`module.${MOD}`, {action: "bindMove", token: tok.uuid, x: change.x ?? tok.x, y: change.y ?? tok.y, user: userId, why: binds.find(b => b.rule === "ask")?.name ?? ""});
  return false;
}

/** The Storyteller's side: a card with Allow and Refuse for a bound character's move. */
export async function onMoveRequest(p) {
  const tok = p?.token ? fromUuidSync(p.token) : null;
  if ( !tok ) return null;
  return ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(), flags: {[MOD]: {bindMove: {token: p.token, x: n(p.x), y: n(p.y), user: p.user, done: false}}},
    content: `<div class="wodx-card wodx-binding"><h3><i class="fa-solid fa-link"></i> ${esc(tok.name)} moves while bound</h3>
      <p>${esc(p.why || "A binding")} holds ${esc(tok.name)}. Does this move go against it?</p>
      <div class="wodx-bind-move"><button type="button" data-bind="allow"><i class="fa-solid fa-check"></i> Allow the move</button>
      <button type="button" data-bind="refuse"><i class="fa-solid fa-xmark"></i> Refuse</button></div></div>`});
}

async function answer(msg, allow) {
  const d = msg.flags?.[MOD]?.bindMove;
  if ( !d || d.done ) return;
  const tok = fromUuidSync(d.token);
  if ( allow && tok ) await tok.update({x: d.x, y: d.y}, {wodxBindAllowed: true});
  await msg.update({[`flags.${MOD}.bindMove.done`]: true, content: msg.content.replace(/<div class="wodx-bind-move">[\s\S]*?<\/div>/, `<p class="wodx-quiet">${allow ? "Allowed: the token moved." : "Refused: the binding holds."}</p>`)});
  if ( d.user ) await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: [d.user, ...gmIds()],
    content: `<div class="wodx-card"><p>${esc(tok?.name ?? "Your character")}: ${allow ? "the Storyteller lets the move stand." : "the binding holds; the move is refused."}</p></div>`});
}

export function setup() {
  game.settings.register(MOD, "bindingsHold", {name: "Bindings hold the token", hint: "While Hold or Possess binds a player's character, its token does not move for the player; Fear keeps it from going nearer the one feared; a command or an oath sends each move to the Storyteller to allow.",
    scope: "world", config: true, type: Boolean, default: true});
  Hooks.on("preUpdateToken", onPreUpdate);
  Hooks.on("renderChatMessageHTML", (msg, el) => {
    if ( !msg.flags?.[MOD]?.bindMove || !game.user.isGM || !el?.querySelectorAll ) return;
    for ( const b of el.querySelectorAll("[data-bind]") ) b.addEventListener("click", ev => { ev.preventDefault(); answer(msg, b.dataset.bind === "allow").catch(e => console.error("WoDX | binding move", e)); });
  });
}
