/**
 * WoDX Solo: what the world brings the lone player, step 3 of The Lone Chronicle (B5980 to B5985). world-rules.mjs
 * holds the rules; this file does the Foundry side.
 *
 *   Ask the oracle   on the panel: a yes-or-no question and its odds; the seat rolls a d10 that both see, answers on a
 *                    card whispered to the player, and an "and" sends a lead (a foreshadowing through the approval
 *                    queue, which the standing approvals let through to the player)
 *   Leads            on the panel: the seat gathers the character's signs and dreams, open oaths, debts, boons and
 *                    objectives, and the oracle's last answers, into a window; "Let it go" takes one off the page
 *   Night encounters on the seat, as the clock moves at night: each part of the night rolls once for the character's
 *                    scene, and a hit puts the people of one of the night's encounters on the map, a few squares from
 *                    the character and in plain sight, so a wait stops because someone came near
 *
 *   setting wodx-solo.oracle      [{at, q, odds, face, answer, actorId}]  the oracle's record (world-rules.mjs addAsked)
 *   setting wodx-solo.leadsDone   [lead id]  leads the player let go
 *   setting wodx-solo.rolled      ["<night start>:<part>"]  parts of nights already rolled for an encounter
 *   setting wodx-solo.encounters  Boolean  "Night encounters find the lone player" (default on)
 *   scene flag wodx-solo.encounters  "town", "wilds" or "none": which encounters a scene takes (none: never)
 */
import * as W from "./world-rules.mjs";
import * as R from "./solo-rules.mjs";
import {addAsks, addActions, placeOf, tell, ask} from "./panel.mjs";

const MOD = "wodx-solo";
const ST = "wodx-storyteller";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const all = c => c?.contents ?? [...(c?.values?.() ?? c ?? [])];
const stApi = () => (game.modules.get(ST)?.active ? game.modules.get(ST).api ?? null : null);
const {ApplicationV2, DialogV2} = foundry.applications.api;

let H = null; // from main.mjs: {isOn, isSeat, log, get}

/** The character an ask is for: the one the player plays, or one they own that they named. */
function actorFor(userId, actorId = null) {
  const user = game.users.get(userId);
  const named = actorId ? game.actors.get(actorId) : null;
  if ( named && user && (user.isGM || named.testUserPermission?.(user, "OWNER")) ) return named;
  return placeOf(user).actor;
}

/** A foreshadowing for the character, through the approval queue. -> the aid, or null */
async function drawLead(actor) {
  const aid = stApi()?.aid;
  if ( !actor || !aid?.draw ) return null;
  const a = await aid.draw({kind: "foreshadow", actorId: actor.id, nonce: Date.now() % 997}).catch(() => null);
  if ( !a ) return null;
  await aid.propose(a);
  return a;
}

/* ------------------------------------------------------------------ */
/*  The oracle (B5980, B5981)                                          */
/* ------------------------------------------------------------------ */

/** The seat answers a question. -> {q, odds, face, answer, lead} or null */
export async function askOracle(userId, {question = "", odds = "even", actorId = null} = {}) {
  if ( !game.user.isGM || !game.users.get(userId) ) return null;
  const q = W.cleanQuestion(question);
  if ( !q ) { await tell(userId, "<p>The oracle needs a question.</p>"); return null; }
  const o = W.ODDS[odds] ? odds : "even";
  const actor = actorFor(userId, actorId);
  const roll = await new Roll("1d10").evaluate();
  const face = Number(roll.total) || 1;
  const answer = W.oracleAnswer(o, face);
  const A = W.ANSWERS[answer];
  const ids = [...new Set([userId, ...game.users.filter(u => u.isGM).map(u => u.id)])];
  const msg = await ChatMessage.create({whisper: ids, speaker: {alias: "The oracle"}, rolls: [roll], sound: CONFIG.sounds?.dice,
    flags: {[MOD]: {panel: true, oracle: {q, odds: o, face, answer}}},
    content: `<div class="wodx-card wsolo-oracle wsolo-${A.yes ? "yes" : "no"}"><h3>The oracle</h3><p class="wsolo-q">${esc(q)}</p>
      <p class="wodx-quiet">${esc(W.ODDS[o].label)}: a yes on ${W.ODDS[o].at} or more. The die shows ${face}.</p>
      <p class="wsolo-answer"><b>${esc(A.label)}</b></p>${A.lead ? "<p class=\"wodx-quiet\">The night has moved further than you asked. A sign is on its way.</p>" : ""}</div>`});
  await game.settings.set(MOD, "oracle", W.addAsked(H.get("oracle"), {at: game.time.worldTime, q, odds: o, face, answer, actorId: actor?.id ?? null}));
  const lead = A.lead ? await drawLead(actor) : null;
  await H.log({kind: "note", source: MOD, title: "The oracle was asked", note: `${q} (${W.ODDS[o].label}, ${face}): ${A.label}${lead ? "; a lead was drawn" : ""}`});
  return {q, odds: o, face, answer, lead: lead?.label ?? null, messageId: msg?.id ?? null};
}

/* ------------------------------------------------------------------ */
/*  The Leads page (B5982)                                             */
/* ------------------------------------------------------------------ */

/** Signs and dreams WoDX Storyteller whispered to this user. */
function aidsFor(userId) {
  return all(game.messages).filter(m => m.flags?.[ST]?.aid && (m.whisper ?? []).includes(userId)).map(m => {
    const d = new DOMParser().parseFromString(String(m.content ?? ""), "text/html").body;
    return {id: m.id, at: Number(m.timestamp) || 0, title: d.querySelector("h3")?.textContent?.trim() || "A sign",
      text: [...d.querySelectorAll("p")].map(p => p.textContent.trim()).filter(Boolean).join(" ")};
  });
}

/** The seat gathers the leads for one player's character and sends them back. -> the rows */
export async function leadsOf(userId, {actorId = null, send = true} = {}) {
  if ( !game.user.isGM || !game.users.get(userId) ) return null;
  const actor = actorFor(userId, actorId);
  let ledger = [];
  try { ledger = stApi()?.ledger?.state?.()?.entries ?? []; } catch (e) { ledger = []; }
  const rows = W.leadsFor({actorId: actor?.id ?? null, actorName: actor?.name ?? "", aids: aidsFor(userId), ledger,
    asked: H.get("oracle") ?? [], done: H.get("leadsDone") ?? []});
  if ( send ) {
    const payload = {userId, actorName: actor?.name ?? "", rows};
    if ( userId === game.user.id ) showLeads(payload);
    else game.socket.emit(`module.${MOD}`, {type: "leads.rows", payload});
  }
  return rows;
}

/** The player lets a lead go; the seat sends the page again. */
export async function letLeadGo(userId, {id = null, actorId = null} = {}) {
  if ( !game.user.isGM || !id ) return null;
  await game.settings.set(MOD, "leadsDone", W.letGo(H.get("leadsDone"), id));
  await H.log({kind: "note", source: MOD, title: "The player let a lead go", note: String(id)});
  return leadsOf(userId, {actorId});
}

class LeadsApp extends ApplicationV2 {
  static rows = [];
  static actorName = "";
  static DEFAULT_OPTIONS = {
    id: "wodx-solo-leads", classes: ["wodx", "wsolo-leads"],
    window: {title: "Leads", icon: "fa-solid fa-route", resizable: true},
    position: {width: 460, height: "auto"},
    actions: {letgo: (ev, t) => ask("ask.letgo", {id: t.dataset.id}), refresh: () => ask("ask.leads")}
  };
  async _renderHTML() {
    const div = document.createElement("div");
    const rows = LeadsApp.rows;
    const groups = Object.entries(W.LEAD_KINDS).map(([k, label]) => {
      const mine = rows.filter(r => r.kind === k);
      if ( !mine.length ) return "";
      return `<h4>${esc(label)}</h4><ul class="wsolo-lead-list">${mine.map(r => `<li class="wsolo-lead" data-kind="${esc(r.kind)}"><b>${esc(r.title)}</b>${
        r.text ? `<br><span>${esc(r.text)}</span>` : ""}<button type="button" class="wsolo-letgo" data-action="letgo" data-id="${esc(r.id)}" title="Take this off the page">Let it go</button></li>`).join("")}</ul>`;
    }).join("");
    div.innerHTML = `${LeadsApp.actorName ? `<p class="wodx-quiet">What ${esc(LeadsApp.actorName)} could follow up.</p>` : ""}${groups || "<p>Nothing to follow up yet. Ask the oracle, or let time pass and see what the night brings.</p>"}
      <p><button type="button" data-action="refresh"><i class="fa-solid fa-rotate"></i> Look again</button></p>`;
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }
}

function showLeads({rows = [], actorName = ""} = {}) {
  LeadsApp.rows = rows;
  LeadsApp.actorName = actorName;
  const app = foundry.applications.instances?.get?.("wodx-solo-leads") ?? new LeadsApp();
  app.render({force: true});
}

/* ------------------------------------------------------------------ */
/*  Night encounters (B5983 to B5985)                                  */
/* ------------------------------------------------------------------ */

/** The one person playing: an active player, else the first player with a character. */
function thePlayer() {
  const players = all(game.users).filter(u => !u.isGM);
  return players.find(u => u.active) ?? players.find(u => u.character) ?? null;
}

/** Is a straight walk from the token to (x, y) stopped by a wall? Only read when the seat has that scene drawn. */
function wallTest(scene, tok) {
  if ( canvas?.scene?.id !== scene.id ) return () => false;
  const g = scene.grid?.size ?? 100;
  const from = {x: tok.x + (tok.width || 1) * g / 2, y: tok.y + (tok.height || 1) * g / 2};
  return (x, y) => {
    try { return !!CONFIG.Canvas.polygonBackends.move.testCollision(from, {x: x + g / 2, y: y + g / 2}, {type: "move", mode: "any"}); }
    catch (e) { return false; }
  };
}

let ticking = false;
/**
 * One look at the night for the lone player's character. force (the gate): skip the switch and the chance, and roll
 * this part of the night again. -> {key, kind, text, tokens} when people came, else null
 */
export async function nightTick({force = false, actorId = null, sceneId = null, kind: forceKind = null} = {}) {
  if ( ticking ) return null;
  if ( !force && (!H.isSeat() || H.get("encounters") === false) ) return null;
  if ( !game.user.isGM ) return null;
  const night = stApi()?.night;
  if ( !night?.road || !night?.place ) return null;
  ticking = true;
  try {
    let actor, scene, token;
    if ( actorId ) {
      actor = game.actors.get(actorId);
      scene = game.scenes.get(sceneId) ?? canvas?.scene;
      token = scene ? all(scene.tokens).find(t => t.actorId === actorId) : null;
    } else ({actor, scene, token} = placeOf(thePlayer()));
    if ( !actor || !scene || !token ) return null;
    if ( all(game.combats).some(c => c.started && c.scene?.id === scene.id) ) return null;
    const cal = await import("../../wodx-chronicle/scripts/calendar.mjs");
    let lat = 50;
    try { lat = game.modules.get("wodx-chronicle")?.api?.place?.latitudeFor?.(scene) ?? game.settings.get("wodx-chronicle", "latitude"); } catch (e) { lat = 50; }
    const now = game.time.worldTime, toDusk = cal.secondsToNextDusk(now, lat), toDawn = cal.secondsToNextDawn(now, lat);
    const isNight = force || toDawn < toDusk;
    let part = "early";
    try { part = (await night.now?.())?.part ?? "early"; } catch (e) { part = "early"; }
    const key = W.nightKey(R.nightStart(now, toDusk), part);
    const kind = forceKind ?? W.placeKind({flag: scene.flags?.[MOD]?.encounters ?? null, name: scene.navName || scene.name});
    const due = W.encounterDue({night: isNight, key, kind, rolled: force ? [] : (H.get("rolled") ?? []), roll: force ? 0 : Math.random()});
    if ( !due.roll ) return null;
    if ( !force ) await game.settings.set(MOD, "rolled", W.markRolled(H.get("rolled"), key));
    if ( !due.comes ) return null;
    const text = night.road({key: `solo:${key}:${scene.id}`, town: kind === "town"});
    if ( !text ) return null;
    const spot = W.arrivalSpot({x: token.x, y: token.y, width: token.width}, {width: scene.width, height: scene.height, padding: scene.padding, grid: {size: scene.grid?.size}}, wallTest(scene, token));
    if ( !spot ) return null;
    const tokens = await night.place(text, {key: `solo:${key}:${scene.id}`, scene, x: spot.x, y: spot.y, hidden: false});
    await H.log({kind: "note", source: MOD, title: "The night brought someone", note: `${text} (${scene.navName || scene.name})`});
    return {key, kind, text, spot, tokens: (tokens ?? []).map(t => t.id)};
  } finally { ticking = false; }
}

/* ------------------------------------------------------------------ */
/*  The panel's side                                                   */
/* ------------------------------------------------------------------ */

const ACTIONS = {
  async oracle() {
    const opts = W.ODDS_ORDER.map(k => `<option value="${k}"${k === "even" ? " selected" : ""}>${esc(W.ODDS[k].label)}</option>`).join("");
    const pick = await DialogV2.prompt({classes: ["wodx", "wodx-dialog", "wsolo-dialog"], window: {title: "Ask the oracle"},
      content: `<p>Ask what you would ask a Storyteller: a question with a yes or a no. Say how likely you think a yes is.</p>
        <div class="form-group"><label>Your question</label><input type="text" name="q" maxlength="200" placeholder="Is anyone watching the house?" autofocus></div>
        <div class="form-group"><label>How likely</label><select name="odds" data-fixed>${opts}</select></div>`,
      ok: {label: "Ask", callback: (ev, b) => ({question: b.form.elements.q.value, odds: b.form.elements.odds.value})}, rejectClose: false});
    if ( !pick?.question?.trim() ) return;
    ask("ask.oracle", pick);
  },
  leads() { ask("ask.leads"); }
};

export function registerWorldSettings() {
  game.settings.register(MOD, "oracle", {scope: "world", config: false, type: Array, default: []});
  game.settings.register(MOD, "leadsDone", {scope: "world", config: false, type: Array, default: []});
  game.settings.register(MOD, "rolled", {scope: "world", config: false, type: Array, default: []});
  game.settings.register(MOD, "encounters", {name: "Night encounters find the lone player",
    hint: "Each part of the night may bring one of the night's encounters onto the character's scene, a few squares off and in plain sight (a one in three chance). A scene's flag wodx-solo.encounters set to none keeps them away.",
    scope: "world", config: true, type: Boolean, default: true});
}

export function installWorld(helpers) {
  H = helpers;
  addAsks({
    "ask.oracle": p => askOracle(p.userId, p),
    "ask.leads": p => leadsOf(p.userId, p),
    "ask.letgo": p => letLeadGo(p.userId, p)
  }, {"leads.rows": showLeads});
  addActions(ACTIONS);
  // B6169: every move of the clock gets its look at the night, one after another. The old 500 ms throttle dropped
  // moves while the panel's wait steps the clock every 400 ms, and parts of the night went unrolled. A move that comes
  // while one waits to run is folded into it (nightTick reads the clock when it runs).
  let chain = Promise.resolve(), queued = false;
  Hooks.on("updateWorldTime", () => {
    if ( !H.isSeat() || queued ) return;
    queued = true;
    chain = chain.then(() => { queued = false; return nightTick(); }).catch(e => console.error(`${MOD} | night encounter`, e));
  });
}

export const worldApi = {rules: W, oracle: askOracle, leads: leadsOf, letGo: letLeadGo, nightTick, show: showLeads};
