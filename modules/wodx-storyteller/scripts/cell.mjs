/**
 * An inquisitor cell to live in: the Storyteller's cell window and what it changes in play (B7891-B7898).
 *
 *   The daily round: each member's divine office and common meal, marked day by day; chapter three times a week. The
 *   week's reckoning names who broke the Rule, and a player's inquisitor who did is asked for the Piety roll of a sin
 *   at 6 (WoDX Actions' card). Only from 1223, and never for a household of the faithful before the Inquisition.
 *   The rector and officers: set by the Council, elected after a year; the rector's veto; the sub-rector leads while
 *   there is no rector.
 *   The chapter-house: its kind, rent (owed monthly, a line on the reckoning while unpaid), lands, servants, disguise,
 *   and the pooled Chapter-House dots in size, security, Holy Ground and prisons. Its Holy Ground and the cell's Flock
 *   go on each member's sheet, where prayer and waking read them (WoDX Actions).
 *   Sanctification of the Homestead, retreats, confession at chapter, and a household begun from the chronicle's
 *   recipe (a household of the faithful before 1223).
 * Rules: cell-rules.mjs; rolls and the sheet: WoDX Actions hunter.js.
 */
import * as R from "../../wodx-rules/storyteller/cell-rules.mjs";
import {MOD, esc, setting, mutate, gmIds, isPC, chron} from "./core.mjs";
import * as TERMS from "../../wodx-chronicle/scripts/terms.mjs";
import * as Builder from "./builder.mjs";

const AX = "wodx-actions";
const now = () => game.time?.worldTime ?? 0;
const all = c => [...(c ?? [])];
const acts = () => game.modules.get(AX)?.api ?? game.wodxActions ?? null;
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 2000; } catch (e) { return 2000; } };
const isInq = a => !!a?.getFlag?.(AX, "inquisitor");
const nameOf = id => game.actors.get(id)?.name ?? "";
const recipe = () => { try { return Builder.recipe(); } catch (e) { return null; } };

export function registerCellSettings() {
  game.settings.register(MOD, "cells", {scope: "world", config: false, type: Object, default: {}, onChange: () => CellApp.refresh()});
}
export const keys = () => Object.keys(setting("cells") ?? {});
export const state = (key = keys()[0] ?? "cell") => R.normState(setting("cells")?.[key]);
const save = (key, fn) => mutate("cells", cur => {
  const out = fn(R.normState(cur?.[key]));
  return {value: {...(cur ?? {}), [key]: out.value}, result: out.result};
});
const card = (title, html) => ChatMessage.create({speaker: {alias: "The cell"}, whisper: gmIds(), content: `<div class="wodx-card wst-cell"><h3>${esc(title)}</h3>${html}</div>`});

/** Write the cell's chapter-house and Flock onto each inquisitor member's sheet (read by prayer and waking). */
export async function syncLinks(key) {
  const s = state(key), link = R.sheetLink(s, key), ids = new Set(s.members.map(m => m.id));
  for ( const a of all(game.actors).filter(isInq) ) {
    const cur = a.getFlag(AX, "inquisitor")?.cell ?? null;
    if ( ids.has(a.id) ) { if ( JSON.stringify(cur) !== JSON.stringify(link) ) await a.update({[`flags.${AX}.inquisitor.cell`]: link}); }
    else if ( cur?.key === key ) await a.update({[`flags.${AX}.inquisitor.cell`]: null});
  }
  return link;
}

/* ---- Founding and members ---- */

export async function found(key, {name = "", precursor = false, rector = null} = {}) {
  const t = now();
  await save(key, s => ({value: {...s, name: name || s.name || "The cell", precursor: !!precursor, founded: s.founded ?? t,
    rector: precursor ? null : (rector ?? s.rector), rectorSince: precursor ? null : (rector ? t : s.rectorSince)}, result: null}));
  return state(key);
}
export async function setMembers(key, members) {
  const list = members.map(m => ({id: m.id, name: m.name ?? nameOf(m.id), lay: !!m.lay}));
  await save(key, s => ({value: {...s, members: list}, result: list}));
  await syncLinks(key);
  return list;
}

/** Begin the cells the chronicle's recipe names (a household of the faithful before 1223, B7898). */
export async function seed() {
  const r = recipe(), made = [];
  for ( const c of r?.cells ?? [] ) {
    if ( setting("cells")?.[c.key] ) continue;
    const ids = (c.members ?? []).map(m => all(game.actors).find(a => !TERMS.isPC(a) && new RegExp(m, "i").test(a.name))).filter(Boolean);
    await found(c.key, {name: c.name, precursor: !!c.precursor && yearNow() < R.RULE_FROM});
    await save(c.key, s => ({value: {...s, house: R.normHouse({...s.house, ...(c.house ?? {})}), flock: {...s.flock, ...(c.flock ?? {})}}, result: null}));
    await setMembers(c.key, ids.map(a => ({id: a.id, name: a.name, lay: !isInq(a)})));
    made.push(c.key);
  }
  if ( made.length ) await card("The cell", `<p>Begun from the chronicle: ${made.map(k => esc(state(k).name)).join(", ")}.</p>`);
  return made;
}

/* ---- The round, chapter and the week's reckoning ---- */

export async function roundDone(key, actorId, kind, t = now()) {
  return save(key, s => { const r = R.markRound(s, actorId, kind, t); return {value: r.state, result: r.fresh}; });
}
export async function chapter(key, t = now()) {
  const fresh = await save(key, s => { const r = R.holdChapter(s, t); return {value: r.state, result: r.fresh}; });
  if ( fresh ) await card(`${state(key).name}: chapter`, `<p>The cell meets in chapter${R.leader(state(key)) ? `, ${esc(nameOf(R.leader(state(key))))} presiding` : ""}: the week's work and the faults confessed (${R.REF} p. 72).</p>`);
  return fresh;
}
export async function reckon(key, t = now()) {
  const s = state(key), from = s.lastReckon ?? t - TERMS.WEEK;
  const pcs = s.members.filter(m => isPC(game.actors.get(m.id))).map(m => m.id);
  const w = R.reckonWeek(s, from, t, {year: yearNow(), pcs});
  for ( const x of w.sins ) {
    const a = game.actors.get(x.id);
    if ( a && isInq(a) ) await acts()?.pietyPrompt?.(a, "disobey", `Broke the cell's Rule: ${x.why}`, {card: true});
  }
  const owed = R.rentOwed(s.house, t);
  const li = x => `<li>${x}</li>`;
  const html = [
    w.on ? `<p>The week under the Rule (${R.REF} pp. 71-73).</p>` : `<p>${s.precursor || yearNow() < R.RULE_FROM ? "A household of the faithful: no Inquisition yet, and no Rule binds them (" + R.RULE_FROM + ")." : "The Rule is not kept here."}</p>`,
    `<ul>${w.rows.map(r => li(`${esc(r.name)}: the office on ${r.office}, the meal on ${r.meal} of seven days${w.on ? (r.kept ? " (kept)" : " (the Rule broken)") : ""}`)).join("")}</ul>`,
    `<p>Chapter ${w.chapters} time${w.chapters === 1 ? "" : "s"} this week${w.on && !w.chaptersKept ? `: the Rule asks three, and the rector answers for it to the Council of Faith` : ""}.</p>`,
    w.sins.length ? `<p><b>Piety rolls asked</b>: ${esc(w.sins.map(x => x.name).join(", "))} (disobedience, a sin at 6, ${R.REF} p. 73).</p>` : "",
    owed ? `<p class="vta-warn"><b>The rent is owed</b> on ${esc(s.house.name || "the chapter-house")} (${esc(s.house.rent)}); ${esc(R.HOUSES[s.house.kind].owner)} will want it on time (${R.REF} p. 76).</p>` : "",
    R.warded(s.house, t) ? `<p>The house is warded by Sanctification of the Homestead.</p>` : ""
  ].join("");
  await save(key, cur => ({value: {...cur, lastReckon: t, days: {}, reckonings: [...cur.reckonings, {at: t, sins: w.sins.length, chapters: w.chapters}]}, result: null}));
  await card(`${s.name}: the week's reckoning`, html);
  return {...w, owed};
}

/* ---- The rector and officers ---- */

export async function setRector(key, actorId, {election = false} = {}) {
  const s = state(key), t = now();
  if ( election ) { const ok = R.electionOpen(s, t); if ( !ok.ok ) { ui.notifications?.warn?.(ok.why); return ok; } }
  if ( s.precursor ) { ui.notifications?.warn?.("A household of the faithful has no rector."); return {ok: false}; }
  await save(key, cur => ({value: {...cur, rector: actorId, rectorSince: t}, result: null}));
  await card(`${s.name}: a rector`, `<p>${esc(nameOf(actorId))} is rector, ${election ? "elected by the cell (the Council of Faith ratifies it)" : "set over the cell by the Council of Faith"}. The rector rules the chapter-house like the prior of a small monastery (${R.REF} pp. 74-75).</p>`);
  return {ok: true};
}
export async function officer(key, office, actorId, {veto = false} = {}) {
  const r = await save(key, s => { const o = R.setOfficer(s, office, actorId, {veto}); return {value: o.state, result: o}; });
  await card(`${state(key).name}: officers`, `<p>${r.ok ? `${esc(nameOf(actorId))} is voted ${esc(R.OFFICERS[office])}.` : esc(r.why)} (${R.REF} p. 75)</p>`);
  return r;
}
export async function rectorGone(key) {
  const r = await save(key, s => { const o = R.rectorGone(s); return {value: o.state, result: o.acting}; });
  await card(`${state(key).name}: no rector`, `<p>${r ? `${esc(nameOf(r))}, the sub-rector, leads for now` : "There is no sub-rector to lead"}; the cell may elect a new rector (${R.REF} p. 75).</p>`);
  return r;
}

/* ---- The chapter-house, the Flock, the ward ---- */

export async function setHouse(key, patch) {
  const next = R.normHouse({...state(key).house, ...patch});
  const ok = R.houseSpend(next);
  if ( !ok.ok ) { ui.notifications?.warn?.(ok.why); return ok; }
  await save(key, s => ({value: {...s, house: next}, result: null}));
  await syncLinks(key);
  return ok;
}
export async function payRent(key) {
  await save(key, s => ({value: {...s, house: R.payRent(s.house, now())}, result: null}));
  await card(`${state(key).name}: the rent`, `<p>The rent is paid on ${esc(state(key).house.name || "the chapter-house")} for a month.</p>`);
}
export async function setFlock(key, patch) {
  await save(key, s => ({value: {...s, flock: {...s.flock, ...patch}}, result: null}));
  return syncLinks(key);
}
export async function sanctify(key, actorId, {rating = null} = {}) {
  const a = game.actors.get(actorId);
  const r = a ? await acts()?.homestead?.(a, {rating}) : null;
  if ( !r ) return null;
  const out = await save(key, s => { const h = R.homestead(s.house, r, now()); return {value: {...s, house: h.house}, result: h}; });
  await card(`${state(key).name}: the house sanctified`, `<p>${esc(out.line)}</p>`);
  return out;
}
/** Each member wakes in the chapter-house: two Willpower on Holy Ground (WoDX Actions reads the sheet's link). */
export async function morning(key) {
  const s = state(key), woke = [];
  for ( const m of s.members ) { const a = game.actors.get(m.id); if ( a && isInq(a) && (await acts()?.wakeOnHolyGround?.(a, {atHouse: true})) ) woke.push(m.name); }
  return woke;
}

/* ---- Confession and retreats ---- */

export async function sinAtChapter(key, actorId, {what = "", confessed = true} = {}) {
  const out = await save(key, s => { const r = R.sinAtChapter(s, {id: actorId, name: nameOf(actorId), what, confessed}, now()); return {value: r.state, result: r}; });
  if ( out.leaves ) await syncLinks(key);
  await card(`${state(key).name}: a sin at chapter`, `<p>${esc(out.line)}</p>`);
  return out;
}
export const retreat = (actorId, o) => acts()?.retreat?.(game.actors.get(actorId), o);
export const endRetreat = actorId => acts()?.endRetreat?.(game.actors.get(actorId));

export const api = () => ({open: key => CellApp.open(key), state, keys, found, setMembers, seed, roundDone, chapter, reckon, setRector, officer, rectorGone,
  setHouse, payRent, setFlock, sanctify, morning, sinAtChapter, retreat, endRetreat, syncLinks, rules: R});

/* ---- The window ---- */

const {ApplicationV2} = foundry.applications?.api ?? {ApplicationV2: class {}};

export class CellApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-cell", classes: ["wodx-app", "wst-cell"], window: {title: "The inquisitor cell", resizable: true}, position: {width: 720, height: 780},
    actions: {pick: CellApp.#onPick, found: CellApp.#onFound, seed: CellApp.#onSeed, members: CellApp.#onMembers, round: CellApp.#onRound, chapter: CellApp.#onChapter,
      reckon: CellApp.#onReckon, rector: CellApp.#onRector, officer: CellApp.#onOfficer, gone: CellApp.#onGone, house: CellApp.#onHouse, rent: CellApp.#onRent,
      flock: CellApp.#onFlock, sanctify: CellApp.#onSanctify, morning: CellApp.#onMorning, sin: CellApp.#onSin, retreat: CellApp.#onRetreat, back: CellApp.#onBack}
  };
  static #instance;
  static open(key) { this.#instance ??= new CellApp(); if ( key ) this.#instance.key = key; return this.#instance.render({force: true}); }
  static refresh() { if ( this.#instance?.rendered ) this.#instance.render(); }
  key = null;

  async _renderHTML() {
    const ks = keys();
    const key = this.key && ks.includes(this.key) ? this.key : (ks[0] ?? "cell");
    this.key = key;
    const s = state(key), y = yearNow(), t = now(), on = R.ruleOn(s, y), h = s.house, spend = R.houseSpend(h);
    const people = all(game.actors).filter(a => isInq(a) || a.type === "Hunter" || s.members.some(m => m.id === a.id));
    const inCell = new Map(s.members.map(m => [m.id, m]));
    const opt = (v, l, sel) => `<option value="${esc(v)}"${sel ? " selected" : ""}>${esc(l)}</option>`;
    const memberOpts = s.members.map(m => opt(m.id, m.name)).join("");
    const from = s.lastReckon ?? t - TERMS.WEEK, a = R.dayOf(from), b = R.dayOf(t) + 1;
    const count = list => (list ?? []).filter(d => d >= a && d < b).length;
    const elect = R.electionOpen(s, t);
    const ret = id => game.actors.get(id)?.getFlag?.(AX, "inquisitor")?.retreat ?? null;
    const div = document.createElement("div");
    div.className = "wodx-body wodx-scroll";
    div.innerHTML = `
      <section><div class="form-group"><label>Cell</label><select name="cell" data-fixed data-wst-pick>${ks.map(k => opt(k, state(k).name || k, k === key)).join("") || opt("cell", "(none yet)", true)}</select><button type="button" data-action="pick">Show</button></div>
        <form class="wst-cell-found"><div class="form-group"><label>Name</label><input type="text" name="name" value="${esc(s.name)}" placeholder="The cell of ..."><label><input type="checkbox" name="precursor"${s.precursor ? " checked" : ""}> A household of the faithful (before 1223)</label></div>
        <div class="form-group"><label>Key</label><input type="text" name="key" value="${esc(key)}"></div>
        <div class="wodx-buttons"><button type="button" data-action="found">Save the cell</button>${recipe()?.cells?.length ? `<button type="button" data-action="seed">Begin from the chronicle</button>` : ""}</div></form>
        <p class="wodx-quiet">${on ? `The Marzonian Rule binds the cell (${R.REF} pp. 71-73).` : `${y < R.RULE_FROM ? `${y}: the Inquisition is founded in ${R.RULE_FROM}.` : "A household of the faithful."} No Rule, no Council, no rector; the household keeps what faith it keeps.`}</p></section>
      <section><h3>Members</h3><form class="wst-cell-members">
        ${people.map(p => `<div class="form-group"><label><input type="checkbox" name="in_${p.id}"${inCell.has(p.id) ? " checked" : ""}> ${esc(p.name)}</label><label><input type="checkbox" name="lay_${p.id}"${inCell.get(p.id)?.lay ? " checked" : ""}> lay</label></div>`).join("") || `<p class="wodx-quiet">No inquisitors in the world.</p>`}
        <div class="wodx-buttons"><button type="button" data-action="members">Save the members</button></div></form></section>
      <section><h3>The daily round</h3>${s.members.map(m => { const d = s.days[m.id] ?? {}; const r = ret(m.id); return `<div class="wst-round" data-id="${m.id}"><b>${esc(m.name)}</b>: the office ${count(d.office)}, the meal ${count(d.meal)} of 7
          <button type="button" data-action="round" data-id="${m.id}" data-kind="office">Office today</button><button type="button" data-action="round" data-id="${m.id}" data-kind="meal">Meal today</button>${r ? ` <i>on retreat</i> <button type="button" data-action="back" data-id="${m.id}">Back from retreat</button>` : ""}</div>`; }).join("") || `<p class="wodx-quiet">No members yet.</p>`}
        <div class="wodx-buttons"><button type="button" data-action="chapter">Hold chapter</button><button type="button" data-action="reckon">The week's reckoning</button><button type="button" data-action="morning">Morning at the chapter-house</button></div>
        <p class="wodx-quiet">At least one office a day together, a common meal, and chapter three times a week (${R.REF} p. 72). WoDX counts four days of seven as kept; a player's inquisitor who keeps fewer is asked for a Piety roll (a sin at 6). Chapters this week: ${s.chapters.filter(c => R.dayOf(c) >= a).length}.</p></section>
      <section><h3>Rector and officers</h3>${s.precursor ? `<p class="wodx-quiet">A household has no rector.</p>` : `<p>Rector: <b>${esc(nameOf(s.rector) || "none")}</b>${R.leader(s) && !s.rector ? `; ${esc(nameOf(R.leader(s)))} leads as sub-rector` : ""}. Officers: ${Object.entries(s.officers).map(([k, v]) => `${esc(R.OFFICERS[k])} ${esc(nameOf(v))}`).join(", ") || "none"}.</p>
        <form class="wst-cell-rector"><div class="form-group"><select name="who" data-fixed>${memberOpts}</select><button type="button" data-action="rector" data-election="0">Set by the Council</button><button type="button" data-action="rector" data-election="1"${elect.ok ? "" : " disabled"}>Elected by the cell</button><button type="button" data-action="gone">The rector is gone</button></div>
        <div class="form-group"><select name="office" data-fixed>${Object.entries(R.OFFICERS).map(([k, v]) => opt(k, v)).join("")}</select><button type="button" data-action="officer" data-veto="0">Voted in</button><button type="button" data-action="officer" data-veto="1">The rector vetoes</button></div></form>
        <p class="wodx-quiet">${esc(elect.why)}</p>`}</section>
      <section><h3>The chapter-house</h3><form class="wst-cell-house">
        <div class="form-group"><label>Kind</label><select name="kind" data-fixed>${Object.entries(R.HOUSES).map(([k, v]) => opt(k, v.label, h.kind === k)).join("")}</select></div>
        <div class="form-group"><label>Name</label><input type="text" name="name" value="${esc(h.name)}"></div><div class="form-group"><label>Disguised as</label><input type="text" name="disguise" value="${esc(h.disguise)}"></div>
        <div class="form-group"><label>Rent</label><input type="text" name="rent" value="${esc(h.rent)}" placeholder="a month"></div><div class="form-group"><label>Servants</label><input type="text" name="servants" value="${esc(h.servants)}"></div><div class="form-group"><label>Lands</label><input type="text" name="lands" value="${esc(h.lands)}"></div>
        <div class="form-group"><label>Pooled dots</label><input type="number" name="pooled" min="0" max="10" value="${h.pooled}"> size <input type="number" name="size" min="0" max="5" value="${h.size}"> security <input type="number" name="security" min="0" max="10" value="${h.security}"> Holy Ground <input type="number" name="holy" min="0" max="10" value="${h.holy}"> prisons <input type="number" name="prisons" min="0" max="10" value="${h.prisons}"></div>
        <div class="wodx-buttons"><button type="button" data-action="house">Save the house</button><button type="button" data-action="rent"${h.rent ? "" : " disabled"}>Pay a month's rent</button></div></form>
        <p>${spend.ok ? `${esc(spend.sizeLabel)}. Break-in +${spend.breakIn}, Holy Ground ${spend.holy}, room for ${spend.prisoners} prisoners; ${spend.left} dot${spend.left === 1 ? "" : "s"} unspent.` : esc(spend.why)} ${R.rentOwed(h, t) ? `<b>The rent is owed.</b>` : h.paidUntil ? `Paid for ${Math.ceil((h.paidUntil - t) / TERMS.DAY)} more days.` : ""} ${R.warded(h, t) ? "Warded." : ""}</p>
        <p class="wodx-quiet">${esc(R.HOUSES[h.kind].keep)} Owned by ${esc(R.HOUSES[h.kind].owner)}, never by the cell (${R.REF} pp. 75-77; ${R.DAI} p. 155). Its Holy Ground counts in prayer there, and waking on it gives two Willpower (${R.REF} p. 98).</p>
        <form class="wst-cell-ward"><div class="form-group"><label>Sanctification of the Homestead</label><select name="who" data-fixed>${memberOpts}</select><input type="number" name="rating" min="2" max="5" value="2" title="Holy Art"><button type="button" data-action="sanctify">Perform it</button></div></form></section>
      <section><h3>The Flock</h3><form class="wst-cell-flock"><div class="form-group"><label>Name</label><input type="text" name="name" value="${esc(s.flock.name)}" placeholder="the parish of ..."><label>Rating</label><input type="number" name="rating" min="0" max="5" value="${s.flock.rating}"></div>
        <div class="form-group"><label>Who they are</label><input type="text" name="notes" value="${esc(s.flock.notes)}"></div><div class="wodx-buttons"><button type="button" data-action="flock">Save the Flock</button></div></form>
        <p class="wodx-quiet">A congregation that prays with the cell, never sent against the Enemy (${R.DAI} p. 156). A member with no Flock of their own prays with this one.</p></section>
      <section><h3>Chapter business</h3><form class="wst-cell-sin"><div class="form-group"><select name="who" data-fixed>${memberOpts}</select><input type="text" name="what" placeholder="the sin"><button type="button" data-action="sin" data-confessed="1">Confessed</button><button type="button" data-action="sin" data-confessed="0">Hidden, and found out</button></div></form>
        <form class="wst-cell-retreat"><div class="form-group"><select name="who" data-fixed>${memberOpts}</select><select name="kind" data-fixed>${Object.entries(acts()?.curses?.RETREAT?.kinds ?? {cloister: "In cloister"}).map(([k, v]) => opt(k, v)).join("")}</select><input type="number" name="days" min="7" max="30" value="7"><select name="purpose" data-fixed>${opt("bank", "to bank Conviction")}${opt("endowment", "for an Endowment")}</select><button type="button" data-action="retreat">Go on retreat</button></div></form>
        <p class="wodx-quiet">Confessed, the sinner is penanced and stays; hidden and found out, they go to the Council (${R.REF} p. 80). A retreat of a week to a month banks past a point a day; one rushed brings a Curse roll (p. 96).</p></section>`;
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }

  static async #onPick() { this.key = this.element.querySelector("[data-wst-pick]").value; this.render(); }
  static async #onFound(event, target) {
    const f = target.closest("form").elements, key = (f.key.value || "cell").trim().replace(/[^\w-]/g, "-");
    await found(key, {name: f.name.value.trim(), precursor: f.precursor.checked}); this.key = key;
  }
  static async #onSeed() { const made = await seed(); if ( made[0] ) this.key = made[0]; this.render(); }
  static async #onMembers(event, target) {
    const f = target.closest("form").elements;
    const list = all(game.actors).filter(a => f[`in_${a.id}`]?.checked).map(a => ({id: a.id, name: a.name, lay: !!f[`lay_${a.id}`]?.checked}));
    await setMembers(this.key, list);
  }
  static async #onRound(event, target) { await roundDone(this.key, target.dataset.id, target.dataset.kind); }
  static async #onChapter() { await chapter(this.key); }
  static async #onReckon() { await reckon(this.key); }
  static async #onMorning() { await morning(this.key); }
  static async #onRector(event, target) { const f = target.closest("form").elements; if ( f.who.value ) await setRector(this.key, f.who.value, {election: target.dataset.election === "1"}); }
  static async #onGone() { await rectorGone(this.key); }
  static async #onOfficer(event, target) { const f = target.closest("form").elements; if ( f.who.value ) await officer(this.key, f.office.value, f.who.value, {veto: target.dataset.veto === "1"}); }
  static async #onHouse(event, target) {
    const f = target.closest("form").elements;
    await setHouse(this.key, Object.fromEntries(["kind", "name", "disguise", "rent", "servants", "lands", "pooled", "size", "security", "holy", "prisons"].map(k => [k, f[k].value])));
  }
  static async #onRent() { await payRent(this.key); }
  static async #onFlock(event, target) { const f = target.closest("form").elements; await setFlock(this.key, {name: f.name.value.trim(), rating: Number(f.rating.value) || 0, notes: f.notes.value.trim()}); }
  static async #onSanctify(event, target) { const f = target.closest("form").elements; if ( f.who.value ) await sanctify(this.key, f.who.value, {rating: Number(f.rating.value) || 2}); }
  static async #onSin(event, target) { const f = target.closest("form").elements; if ( f.who.value ) await sinAtChapter(this.key, f.who.value, {what: f.what.value.trim(), confessed: target.dataset.confessed === "1"}); }
  static async #onRetreat(event, target) { const f = target.closest("form").elements; if ( f.who.value ) await retreat(f.who.value, {days: Number(f.days.value), kind: f.kind.value, purpose: f.purpose.value}); this.render(); }
  static async #onBack(event, target) { await endRetreat(target.dataset.id); this.render(); }
}
