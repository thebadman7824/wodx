/**
 * WoDX Storyteller 0.25.0: bodies left behind. The rules are in remains-rules.mjs.
 *
 *   Token flag wodx-storyteller.remains {since, place, cause, found, heated, shown, note}: a body on the map.
 *   Setting "remains" (off by default, a house rule). When on, an NPC token marked dead becomes a body, and the
 *   active Storyteller's client ages each body as the clock moves: its token takes the stage's tint. When a player's
 *   character first comes within talking distance of a body, the Storyteller gets a card with its stage and what the
 *   era's authorities can learn from it, and a body that still shows how it died adds heat to the hunting ground
 *   (WoDX Storyteller's Hunting grounds and heat, when that is on). The Bodies window (Upkeep) lists and edits them.
 *   Nothing runs on players' machines.
 */
import * as R from "./remains-rules.mjs";
import {MOD, esc, isActiveGM, setting, chron} from "./core.mjs";
import {describeTime} from "../../wodx-chronicle/scripts/calendar.mjs";
import {addHeat} from "./upkeep.mjs";

const now = () => game.time?.worldTime ?? 0;
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 0; } catch (e) { return 0; } };
const remainsOf = tok => (tok?.flags?.[MOD]?.remains ? R.normRemains(tok.flags[MOD].remains, now()) : null);

export function registerRemainsSettings() {
  game.settings.register(MOD, "remains", {name: "Bodies left behind (house rule)", hint: "An NPC marked dead stays as a body that rots as game time passes. When a player's character comes upon it, you get what the era's authorities could learn from it, and a fresh body adds heat to the hunting ground.",
    scope: "world", config: true, type: Boolean, default: false});
}

const means = new Map(); // jdn -> the day's mean temperature, so ageing a body does not work out the weather again
/** The day's mean temperature from WoDX Atmosphere, counted in days from a world time, or null. */
function meanFrom(since) {
  try {
    const A = game.modules.get("wodx-atmosphere");
    if ( !A?.active || !A.api?.weather?.on ) return null;
    const j0 = describeTime(since).jdn;
    return d => {
      const j = j0 + d;
      if ( !means.has(j) ) { const w = A.api.weather.on(j); means.set(j, Number.isFinite(Number(w?.mean)) ? Number(w.mean) : null); if ( means.size > 5000 ) means.clear(); }
      return means.get(j);
    };
  } catch (e) { return null; }
}

/** A body's stage now. */
export function stageOf(tok) {
  const r = remainsOf(tok);
  if ( !r ) return null;
  return R.stageFor(R.warmDays(r.since, now(), r.place, meanFrom(r.since)));
}

/** Is a scene out of doors (WoDX Atmosphere's reading), for where a new body lies? */
function outdoors(scene) {
  try { return game.modules.get("wodx-atmosphere")?.api?.weather?.isOutdoor?.(scene) !== false; } catch (e) { return true; }
}

/** Mark a token as a body. opts: {since, place, cause, note}. */
export async function mark(tok, opts = {}) {
  if ( !game.user.isGM || !tok ) return null;
  const r = R.normRemains({since: now(), place: outdoors(tok.parent) ? "open" : "indoors", ...remainsOf(tok), ...opts}, now());
  await tok.update({[`flags.${MOD}.remains`]: r});
  return r;
}

export async function unmark(tok) {
  if ( !game.user.isGM || !tok?.flags?.[MOD]?.remains ) return null;
  return tok.update({[`flags.${MOD}.remains`]: null, "texture.tint": "#ffffff"});
}

/** Age every body: tint each token for its stage. Only the active Storyteller. */
export async function tick() {
  if ( !isActiveGM() || !setting("remains") ) return 0;
  let n = 0;
  for ( const scene of game.scenes ?? [] ) {
    const ups = [];
    for ( const tok of scene.tokens ) {
      const r = remainsOf(tok);
      if ( !r ) continue;
      const st = stageOf(tok);
      if ( st.id === r.shown ) continue;
      ups.push({_id: tok.id, [`flags.${MOD}.remains.shown`]: st.id, ...(st.tint ? {"texture.tint": st.tint} : {})});
    }
    if ( ups.length ) { await scene.updateEmbeddedDocuments("Token", ups); n += ups.length; }
  }
  return n;
}

const reach = () => { try { return Number(game.settings.get("wodx-npc", "talkReach")) || 2; } catch (e) { return 2; } };
function squares(a, b, scene) {
  const g = scene?.grid?.size ?? 100;
  const gap = (p, q, wp, wq) => Math.abs((p + wp / 2) - (q + wq / 2)) - (wp + wq) / 2;
  const d = Math.max(gap(a.x, b.x, (a.width ?? 1) * g, (b.width ?? 1) * g), gap(a.y, b.y, (a.height ?? 1) * g, (b.height ?? 1) * g));
  return Math.max(0, Math.round(d / g) + 1);
}

/** A player's character moved: any body they come upon for the first time is found. */
export async function onMoved(tok, changes) {
  if ( !isActiveGM() || !setting("remains") || !("x" in (changes ?? {}) || "y" in (changes ?? {})) ) return [];
  const pc = tok.actor;
  if ( !pc?.hasPlayerOwner || tok.hidden ) return [];
  const out = [];
  for ( const body of tok.parent?.tokens ?? [] ) {
    const r = remainsOf(body);
    if ( !r || body.hidden || body.id === tok.id || r.found.includes(pc.id) || squares(tok, body, tok.parent) > reach() ) continue;
    out.push(await found(body, pc));
  }
  return out;
}

/** A character comes upon a body: the Storyteller's card, and heat for a fresh one. */
export async function found(body, pc) {
  const r = remainsOf(body), st = stageOf(body), year = yearNow();
  const f = R.findings(year, st.id, r.cause);
  const heat = setting("heat") && R.heatDue(r, st.id);
  await body.update({[`flags.${MOD}.remains`]: {...r, found: [...r.found, pc.id].slice(-50), heated: r.heated || heat}});
  if ( heat ) await addHeat(body.parent, "body", {who: pc.id}).catch(e => console.error(`${MOD} | remains`, e));
  const first = !r.found.length;
  return ChatMessage.create({whisper: gmIds(), speaker: {alias: "Bodies left behind"}, flags: {[MOD]: {remains: {token: body.uuid}}},
    content: `<div class="wodx-card wst-remains"><h3>${esc(pc.name)} comes upon ${esc(body.name)}</h3>
      <p><strong>${esc(st.label)}.</strong> ${esc(st.note)} ${esc(R.PLACES[r.place].label)}.</p>
      ${first ? `<p>If it is reported, ${esc(f.who)} look into it. ${esc(f.identity)} ${esc(f.cause)} ${esc(f.when)}</p>` : `<p>Others have found it already.</p>`}
      ${f.drained && first ? `<p>${esc(f.drained)}</p>` : ""}<p class="wodx-quiet">${esc(R.EXAMINE)}</p>${heat ? `<p class="wodx-quiet">The hunting ground here grows hotter.</p>` : ""}${r.note ? `<p class="wodx-quiet">${esc(r.note)}</p>` : ""}</div>`});
}

/** An NPC token marked dead becomes a body (when the setting is on). */
function onDead(effect) {
  if ( !isActiveGM() || !setting("remains") ) return;
  const statuses = effect?.statuses ?? new Set();
  if ( !(statuses.has?.("dead") || [...statuses].includes?.("dead")) ) return;
  const actor = effect.parent;
  if ( !actor || actor.documentName !== "Actor" || actor.hasPlayerOwner ) return;
  const toks = actor.isToken ? [actor.token] : (canvas?.scene?.tokens?.contents ?? []).filter(t => t.actorId === actor.id && t.actorLink);
  for ( const t of toks ) if ( t && !t.flags?.[MOD]?.remains ) mark(t).catch(e => console.error(`${MOD} | remains`, e));
}

export function registerRemainsHooks() {
  Hooks.on("createActiveEffect", effect => { try { onDead(effect); } catch (e) { console.error(`${MOD} | remains`, e); } });
  Hooks.on("updateToken", (doc, changes) => { onMoved(doc, changes).catch(e => console.error(`${MOD} | remains`, e)); });
  Hooks.on("wodxSkipEnd", () => { tick().catch(e => console.error(`${MOD} | remains`, e)); });
  Hooks.on("updateWorldTime", () => { try { if ( chron()?.isSkipping?.() ) return; } catch (e) { /* no Chronicle */ } tick().catch(e => console.error(`${MOD} | remains`, e)); });
}

/** The Storyteller's window: the bodies on the scene in view, with their stage, and a way to mark the selected token. */
export async function remainsDialog() {
  if ( !game.user.isGM ) return;
  const scene = canvas?.scene;
  const bodies = (scene?.tokens?.contents ?? []).filter(t => remainsOf(t));
  const sel = (canvas?.tokens?.controlled ?? []).map(t => t.document).filter(t => !t.actor?.hasPlayerOwner);
  const opt = (o, v) => Object.entries(o).map(([k, x]) => `<option value="${k}"${k === v ? " selected" : ""}>${esc(x.label)}</option>`).join("");
  const rows = bodies.map(t => { const r = remainsOf(t), st = stageOf(t); return `<tr><td>${esc(t.name)}</td><td>${esc(st.label)}</td>
    <td><select name="${t.id}.place" data-fixed>${opt(R.PLACES, r.place)}</select></td><td><select name="${t.id}.cause" data-fixed>${opt(R.CAUSES, r.cause)}</select></td>
    <td><input type="checkbox" name="${t.id}.drop"></td></tr>`; }).join("");
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 640}, window: {title: "Bodies left behind"}, classes: ["wodx-dialog", "wst-remains"],
    content: `${setting("remains") ? "" : `<p class="hint">The setting "Bodies left behind" is off: bodies are kept but don't rot or get found.</p>`}
      ${bodies.length ? `<div class="wst-scroll"><table><tr><th>Body</th><th>Now</th><th>Where it lies</th><th>How they died</th><th>Not a body</th></tr>${rows}</table></div>` : `<p>No bodies on ${esc(scene?.navName || scene?.name || "this scene")}.</p>`}
      <p class="hint">An NPC marked dead becomes a body by itself. Select tokens and press "Mark as bodies" to mark others (killed earlier, or found already dead).</p>`,
    buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, ...(sel.length ? [{action: "mark", label: `Mark as bodies (${sel.length})`}] : []), {action: "close", label: "Close"}]});
  if ( res === "mark" ) { for ( const t of sel ) await mark(t); return remainsDialog(); }
  if ( res && typeof res === "object" ) {
    for ( const t of bodies ) {
      if ( res[`${t.id}.drop`] ) { await unmark(t); continue; }
      await mark(t, {place: res[`${t.id}.place`], cause: res[`${t.id}.cause`]});
    }
    await tick();
  }
}
