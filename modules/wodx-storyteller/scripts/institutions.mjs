/**
 * Influence over institutions, the Foundry side (B3355-B3360). The rules are in institution-rules.mjs.
 *
 *   Stored    world setting wodx-storyteller.institutionState {list: [institution], last}
 *   Towns     each market (WoDX Storyteller's towns) gets the institutions its year, faith and size allow; they open
 *             and close with the years at each month's turn
 *   Climb     a downtime project of kind "climb" aimed at an institution; finished, it asks the Storyteller (approval
 *             wodx-storyteller.climb) to give the next seat. A pawn (the project's target, a ghoul or retainer) climbs
 *             for its master no higher than the master's Influence
 *   Levers    a seat's holder asks to pull a lever (approval wodx-storyteller.lever); the press prints a tale and the
 *             pulpit denounces one, the rest are told to the Storyteller to play; wodxLever fires for other modules
 *   Month     every 30 days of world time the active Storyteller's client turns every institution: empty seats fill
 *             with the town's NPCs, contests and scandals; one on a player character's seat waits in the queue
 */
import * as I from "./institution-rules.mjs";
import * as Markets from "./markets.mjs";
import * as Towns from "./towns.mjs";
import * as Rumours from "./rumours.mjs";
import {MOD, esc, chron, npc, isActiveGM, isPC, gmIds, setting, log} from "./core.mjs";
import {faithFor} from "../../wodx-chronicle/scripts/faith-rules.mjs";
import {lawOf} from "../../wodx-chronicle/scripts/law-rules.mjs";
import {influenceOf} from "./ventures.mjs";

const T_CLIMB = `${MOD}.climb`, T_LEVER = `${MOD}.lever`;
const MONTH = 30 * 86400;
const now = () => game.time?.worldTime ?? 0;
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 1197; } catch (e) { return 1197; } };
const all = c => (c ? [...(c.contents ?? c)] : []);

export function registerInstitutionSettings() {
  game.settings.register(MOD, "institutionState", {scope: "world", config: false, type: Object, default: {list: [], last: null}});
  game.settings.register(MOD, "institutions", {name: "Towns have institutions to climb", hint: "Each town gets its church, guild, council, watch, press and more as its year and size allow. Characters climb them as downtime projects and pull their levers with the Storyteller's leave.",
    scope: "world", config: true, type: Boolean, default: true});
}
const on = () => setting("institutions") !== false;
export const state = () => { const s = setting("institutionState") ?? {}; return {list: (s.list ?? []).map(I.normInst), last: s.last ?? null}; };
async function save(s) { if ( game.user.isGM ) await game.settings.set(MOD, "institutionState", {list: s.list.map(I.normInst), last: s.last}); }

function townInfo(m) {
  const t = Towns.of(m.id);
  const region = t?.region || (() => { try { const sc = (m.scenes ?? []).map(x => game.scenes.get(x)).find(Boolean); return chron()?.world?.here?.(sc)?.id ?? null; } catch (e) { return null; } })() || "moravia";
  let faith = "western";
  try { faith = faithFor(region, yearNow()) || "western"; } catch (e) { /* western */ }
  let law = "", order = null;
  try { const l = lawOf(region, yearNow()); law = l.family; order = l.order; } catch (e) { /* no law of the land */ }
  return {town: m.id, name: m.name, people: Number(t?.people) || 1000, faith, law, order, year: yearNow()};
}

/** Open what each town should have now, close what has had its day. Returns the events. */
export async function reconcileAll() {
  if ( !game.user.isGM || !on() ) return [];
  const s = state();
  const events = [];
  for ( const m of Markets.state()?.markets ?? [] ) { const r = I.reconcile(s.list, townInfo(m)); s.list = r.list; events.push(...r.events); }
  await save(s);
  return events;
}

export const ofTown = townId => state().list.filter(i => i.town === townId && !i.closed);
export const byId = id => state().list.find(i => i.id === id) ?? null;
/** The seats someone holds anywhere: [{inst, rank, title}]. */
export function seatsOf(id) {
  const out = [];
  for ( const i of state().list ) { if ( i.closed ) continue; const b = I.bestSeat(i, id); if ( b ) out.push({inst: i.id, name: i.name, kind: i.kind, rank: b.rank, title: I.ranksOf(i.kind, yearNow(), i.faith, i.law)[b.rank], pawn: b.pawn}); }
  return out;
}

/* ---- Climbing (B3357) ---- */

/** From the long tasks: a finished climb asks for the next seat. */
export async function onClimbDone(a, t) {
  if ( !isActiveGM() || t?.kind !== "climb" || !t.institution ) return;
  const inst = byId(t.institution);
  if ( !inst ) return;
  const pawn = t.target?.id ? game.actors.get(t.target.id) : null;
  const who = pawn ? {id: pawn.id, name: pawn.name, pawnOf: a.id} : {id: a.id, name: a.name};
  const have = I.bestSeat(inst, a.id);
  const next = I.ranksOf(inst.kind, yearNow(), inst.faith, inst.law)[have ? have.rank + 1 : 0] ?? "the top";
  await chron()?.propose?.({type: T_CLIMB, key: `climb:${inst.id}:${who.id}`, title: `${who.name} rises in ${inst.name}: ${next}`,
    detail: pawn ? `${pawn.name} climbs for ${a.name}, no higher than ${a.name}'s Influence.` : `${a.name}'s climb is done.`, data: {inst: inst.id, who, cap: pawn ? I.pawnCap(influenceOf(a)) : I.RANKS - 1}});
}
async function approveClimb(e) {
  const {inst: id, who, cap} = e?.data ?? {};
  const s = state();
  const k = s.list.findIndex(i => i.id === id);
  if ( k < 0 ) return;
  const r = I.promote(s.list[k], who, {at: now(), cap: Number.isFinite(Number(cap)) ? Number(cap) : I.RANKS - 1});
  if ( r.why ) return ui.notifications?.warn?.(`${who?.name}: ${r.why}.`);
  s.list[k] = r.inst;
  await save(s);
  const title = I.ranksOf(r.inst.kind, yearNow(), r.inst.faith, r.inst.law)[r.to];
  await log({kind: "institution", actor: who.pawnOf || who.id, name: who.name, text: `${who.name} is now ${title} in ${r.inst.name}${r.bumped ? `, in place of ${r.bumped.name}` : ""}.`});
}

/* ---- Levers (B3356) ---- */

export async function askLever(actorLike, instId, key, {target = null, words = ""} = {}) {
  const a = game.actors.get(actorLike?.id ?? actorLike);
  const inst = byId(instId);
  if ( !a || !inst ) return null;
  const b = I.bestSeat(inst, a.id);
  const lever = b ? I.leversFor(inst.kind, b.rank).find(l => l.key === key) : null;
  if ( !lever ) { ui.notifications?.warn?.("That seat does not open that lever."); return null; }
  const tgt = target ? game.actors.get(target) : null;
  return chron()?.propose?.({type: T_LEVER, title: `${a.name} in ${inst.name}: ${lever.words.toLowerCase()}${tgt ? ` (${tgt.name})` : ""}`, detail: words,
    data: {actor: a.id, inst: inst.id, key, target: tgt?.id ?? null, words: String(words ?? "").slice(0, 300)}});
}
async function approveLever(e) {
  const {actor, inst: id, key, target, words} = e?.data ?? {};
  const a = game.actors.get(actor), inst = byId(id), tgt = target ? game.actors.get(target) : null;
  if ( !a || !inst ) return;
  try {
    if ( tgt && inst.kind === "press" && (key === "print" || key === "campaign") ) await Rumours.startTale({about: tgt.id, did: words || "is in the paper", tone: -1, big: true, truth: "half", where: ""});
    if ( tgt && inst.kind === "worship" && key === "denounce" ) await Rumours.startTale({about: tgt.id, did: words || "was denounced from the pulpit", tone: -2, big: true, truth: "half", where: ""});
  } catch (er) { console.error(`${MOD} | lever`, er); }
  await log({kind: "institution", actor: a.id, name: a.name, attention: "A lever was pulled", text: `${a.name}, ${inst.name}: ${(I.leversFor(inst.kind, I.RANKS).find(l => l.key === key)?.words ?? key).toLowerCase()}${tgt ? ` (${tgt.name})` : ""}. ${words}`.trim()});
  Hooks.callAll("wodxLever", {actor: a, institution: inst, key, target: tgt});
}

/* ---- The month (B3358) ---- */

function npcsOf(townId) {
  const m = (Markets.state()?.markets ?? []).find(x => x.id === townId);
  const ids = new Set();
  for ( const sid of m?.scenes ?? [] ) for ( const t of all(game.scenes.get(sid)?.tokens) ) if ( t.actorId ) ids.add(t.actorId);
  const facs = (() => { try { return npc()?.factions?.state?.()?.factions ?? []; } catch (e) { return []; } })();
  return [...ids].map(id => game.actors.get(id)).filter(a => a && !isPC(a) && !/group/i.test(String(a.type ?? "")))
    .map(a => ({id: a.id, name: a.name, faction: facs.find(f => f.leader === a.id || (f.members ?? []).includes(a.id))?.name ?? ""}));
}
const pcIds = () => new Set(all(game.actors).filter(isPC).map(a => a.id));

export async function monthRun({force = false} = {}) {
  if ( !isActiveGM() || !on() ) return [];
  const s0 = state();
  const t = now();
  if ( !force && s0.last !== null && t - s0.last < MONTH ) return [];
  await reconcileAll();
  const s = state();
  s.last = t;
  const pcs = pcIds();
  const out = [];
  s.list = s.list.map(i => {
    if ( i.closed ) return i;
    const r = I.monthTurn(i, {npcs: npcsOf(i.town), isPc: id => pcs.has(id), rand: Math.random, at: t, year: yearNow()});
    out.push(...r.events.map(e => ({...e, inst: i.id, name: i.name})));
    return r.inst;
  });
  await save(s);
  for ( const e of out ) {
    if ( e.pc ) await chron()?.propose?.({type: `${MOD}.institutionEvent`, title: `${e.name}: ${e.text}`, detail: "A player character's seat. Approve to note it; the Storyteller plays what comes of it.", data: {inst: e.inst, seat: e.seat, kind: e.kind}});
    else if ( e.kind !== "filled" ) await log({kind: "institution", text: `${e.name}: ${e.text}`});
  }
  return out;
}

export function registerApproval() {
  const ap = chron()?.approvals;
  ap?.registerHandler?.(T_CLIMB, {label: "A climb in an institution", approve: approveClimb, reject: async () => {}});
  ap?.registerHandler?.(T_LEVER, {label: "A lever in an institution", approve: approveLever, reject: async () => {}});
  ap?.registerHandler?.(`${MOD}.institutionEvent`, {label: "Trouble in an institution", approve: async () => {}, reject: async () => {}});
}

export function registerInstitutionHooks() {
  Hooks.on("updateWorldTime", () => { try { if ( chron()?.isSkipping?.() ) return; } catch (e) { /* no Chronicle */ } monthRun().catch(er => console.error(`${MOD} | institutions`, er)); });
  Hooks.on("wodxSkipEnd", () => { monthRun().catch(er => console.error(`${MOD} | institutions`, er)); });
  Hooks.on("wodxTaskDone", ({actor, task} = {}) => { onClimbDone(actor, task).catch(er => console.error(`${MOD} | institutions`, er)); });
}

/* ---- The window ---- */

export async function institutionsDialog() {
  if ( game.user.isGM ) await reconcileAll();
  const s = state();
  const mine = game.user.isGM ? [] : all(game.actors).filter(a => a.isOwner && isPC(a)).map(a => a.id);
  const year = yearNow();
  const towns = new Map((Markets.state()?.markets ?? []).map(m => [m.id, m.name]));
  const block = i => {
    const ranks = I.ranksOf(i.kind, year, i.faith, i.law);
    const seats = i.seats.filter(x => x.holder).sort((a, b) => b.rank - a.rank).map(x => `<li>${esc(ranks[x.rank])}: ${esc(x.holder.name)}${x.holder.pawnOf ? ` <small>(for ${esc(game.actors.get(x.holder.pawnOf)?.name ?? "someone")})</small>` : ""}</li>`).join("");
    const levers = mine.flatMap(id => { const b = I.bestSeat(i, id); return b ? I.leversFor(i.kind, b.rank).map(l => `<button type="button" data-lever="${esc(l.key)}" data-inst="${esc(i.id)}" data-actor="${esc(id)}">${esc(l.words)}</button>`) : []; }).join("");
    const share = I.control(i).slice(0, 3).map(c => `${esc(game.actors.get(c.who)?.name ?? c.who)} ${c.share}%`).join(", ");
    return `<details data-search-item data-search-text="${esc(`${i.name} ${towns.get(i.town) ?? ""}`)}"><summary><b>${esc(i.name)}</b>${share ? ` <small>(${share})</small>` : ""}</summary>
      ${game.user.isGM && I.KINDS[i.kind]?.hook ? `<p class="wst-hook"><small>${esc(I.KINDS[i.kind].hook)}</small></p>` : ""}<ul data-fixed>${seats || "<li>No seats held yet.</li>"}</ul>${levers ? `<div class="wodx-buttons">${levers}</div>` : ""}</details>`;
  };
  const open = s.list.filter(i => !i.closed);
  const wire = (ev, dlg) => {
    const root = dlg?.element ?? ev?.target?.element;
    for ( const b of root?.querySelectorAll?.("[data-lever]") ?? [] ) b.addEventListener("click", async () => {
      const people = all(game.actors).filter(a => a.testUserPermission?.(game.user, "LIMITED") && a.id !== b.dataset.actor).sort((x, y) => x.name.localeCompare(y.name));
      const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, window: {title: b.textContent}, classes: ["wodx-dialog"],
        content: `<div class="form-group"><label>Aimed at</label><select name="target"><option value="">Nobody</option>${people.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select></div>
          <div class="form-group"><label>What you want</label><input type="text" name="words" maxlength="300"></div>`,
        buttons: [{action: "ask", label: "Ask the Storyteller", default: true, callback: (e, btn) => Object.fromEntries(new FormData(btn.form))}, {action: "cancel", label: "Cancel"}]});
      if ( res && res !== "cancel" ) await askLever(b.dataset.actor, b.dataset.inst, b.dataset.lever, {target: res.target || null, words: res.words});
    });
  };
  return foundry.applications.api.DialogV2.wait({rejectClose: false, render: wire, position: {width: 620}, window: {title: "Institutions"}, classes: ["wodx-dialog", "wst-institutions"],
    content: `<p>The church, the guilds, the council, the watch, the courts, the press and the rest in each town, and who holds their seats. Climb one with a downtime project (Climb an institution); a seat's levers ask the Storyteller first.</p>
      <div class="wst-scroll">${[...towns.entries()].map(([id, name]) => { const l = open.filter(i => i.town === id); return l.length ? `<h4>${esc(name)}</h4>${l.map(block).join("")}` : ""; }).join("") || "<p>No towns yet: towns come from the markets.</p>"}</div>`,
    buttons: [{action: "close", label: "Close", default: true}]});
}

export const api = () => ({open: institutionsDialog, state, ofTown, byId, seatsOf, reconcile: reconcileAll, month: monthRun, askLever, rules: I});
