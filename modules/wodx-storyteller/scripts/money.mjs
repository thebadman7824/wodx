/**
 * WoDX Storyteller 0.14.0: money by era. The rules are in money-rules.mjs.
 * 0.26.0: a real purse. flags.wodx-storyteller.money.purse = {money, year, carried, bank, debt, paidMonth, log}:
 *   amounts in the smallest unit of the money id (pfennig, kreuzer, haléř). system.money.carried / bank (the
 *   sheet's own numbers) get the same amounts in the main unit. Each month of game time Resources pays its
 *   allowance into the bank (before banks: the strongbox at home), first paying off any debt.
 *
 *   Actor flag wodx-storyteller.money {away, neglected, note}: the world time the character left home, or the
 *   world time the fortune stopped being kept up (null when neither).
 * 0.58.0: purse.foreign holds coin of other lands, changed at a money changer abroad (changePurse). Abroad a price
 *   is paid first from coin of the place; a card tells the Storyteller when a character first stands where the
 *   money differs (flag money.abroadIn, the money id there). The Resources rating comes from the sheet.
 *   Once a month of game time (and after a skip), the Storyteller gets one card: how each character lives now,
 *   the coin of the day, and whose way of living drops within the month. Runs on the active Storyteller's client.
 */
import * as R from "./money-rules.mjs";
import * as MK from "./market-rules.mjs";
import {MOD, esc, isActiveGM, setting, isPC, chron, log} from "./core.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";
import * as Own from "./owners.mjs";

const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const now = () => game.time?.worldTime ?? 0;
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const held = () => { try { return !!chron()?.isHeld?.(); } catch (e) { return false; } };
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 0; } catch (e) { return 0; } };
const days = since => (since === null || since === undefined ? null : Math.max(0, Math.floor((now() - num(since)) / R.DAY)));

export function registerMoneySettings() {
  game.settings.register(MOD, "money", {name: "Money by era", hint: "Once a month of game time, tell the Storyteller how each character lives on their Resources, and the coin of the day.",
    scope: "world", config: true, type: Boolean, default: true});
  game.settings.register(MOD, "changers", {name: "Money changers far from home", hint: "On a scene that stands in another region (the Clock, Where this scene stands), prices are charged to the purse in the coin of home with a money changer's cut on top, and the price is also named in the money of the place. Off: prices abroad are the same as at home.",
    scope: "world", config: true, type: Boolean, default: true});
  game.settings.register(MOD, "moneyRegion", {name: "Coins of the day", hint: "Which land's coins to name (a house rule from history; the books name none).",
    scope: "world", config: true, type: String, default: "moravian", choices: Object.fromEntries(Object.entries(R.COINS).map(([k, v]) => [k, v.label]))});
  game.settings.register(MOD, "moneyMonth", {scope: "world", config: false, type: Number, default: -1});
}

/** Resources from the sheet: a background Feature named Resources (or Wealth). */
export function resourcesOf(a) {
  for ( const i of a?.items ?? [] ) {
    if ( i.type === "Feature" && /background/.test(String(i.system?.type ?? "")) && /^(resources|wealth)\b/i.test(i.name ?? "") ) return num(i.system?.value);
  }
  return num(a?.system?.backgrounds?.resources?.value);
}

export const coinsNow = () => R.coinsFor(yearNow(), setting("moneyRegion"));

export function moneyOf(a) {
  const f = a?.flags?.[MOD]?.money ?? {};
  const view = {dots: resourcesOf(a), away: days(f.away), neglected: days(f.neglected)};
  return {...view, living: R.livingAs(view), drop: R.nextDrop(view), note: f.note ?? ""};
}

export async function setAway(a, on) {
  if ( !game.user.isGM || !a ) return;
  const cur = a.flags?.[MOD]?.money ?? {};
  if ( !!on === (cur.away !== null && cur.away !== undefined) ) return;
  await a.update({[`flags.${MOD}.money`]: {...cur, away: on ? now() : null}});
}

export async function setNeglected(a, on) {
  if ( !game.user.isGM || !a ) return;
  const cur = a.flags?.[MOD]?.money ?? {};
  if ( !!on === (cur.neglected !== null && cur.neglected !== undefined) ) return;
  await a.update({[`flags.${MOD}.money`]: {...cur, neglected: on ? now() : null}});
}

const moneyActors = () => game.actors.filter(a => isPC(a) || a.flags?.[MOD]?.money || resourcesOf(a) > 0);

/** Once a month of game time: one card for the Storyteller. */
export async function monthly({force = false} = {}) {
  if ( !isActiveGM() || !setting("money") || held() ) return null;
  const month = Math.floor(now() / (30 * R.DAY));
  if ( !force && month === setting("moneyMonth") ) return null;
  await game.settings.set(MOD, "moneyMonth", month);
  const list = moneyActors();
  if ( !list.length ) return {rows: []};
  const c = coinsNow();
  const rows = list.map(a => ({a, m: moneyOf(a)}));
  for ( const r of rows ) {
    try { r.paid = await payDay(r.a, month); } catch (e) { console.error(`${MOD} | pay day`, e); r.paid = null; }
    // 0.27.0: a holding's upkeep and income come with the allowance
    if ( r.paid?.months ) { try { r.held = await Own.payHoldings(r.a, r.paid.months); } catch (e) { console.error(`${MOD} | holdings`, e); } }
  }
  try { await Own.workshopsMonth(); await Own.factionBuildsMonth(); } catch (e) { console.error(`${MOD} | workshops`, e); }
  const li = rows.map(({a, m, paid, held}) => `<li><b>${esc(a.name)}</b>: Resources ${m.dots}, living as ${esc(m.living.name.toLowerCase())}${m.living.level !== m.dots ? ` (${esc(m.living.why.toLowerCase())})` : ""}.${paid ? ` Allowance ${esc(paid.text)}${paid.toDebt ? " (some went to pay a debt)" : ""}.` : ""}${held ? ` ${esc(held.text.replace(/^./, c => c.toUpperCase()))}.` : ""}${m.drop !== null && m.drop <= 30 ? ` <i>That drops in ${m.drop} day${m.drop === 1 ? "" : "s"}.</i>` : ""}</li>`).join("");
  await ChatMessage.create({content: `<div class="wodx-card wst-money"><h3>The month's allowance</h3><p>${esc(c.label)}: people pay in ${esc(c.coin)}; sums are reckoned in ${esc(c.account)}.</p><ul>${li}</ul>
    <p class="wodx-quiet">V20 Dark Ages (p. 181) pays Resources as a monthly allowance; the sums follow V20 The Wild West's pay by dot (pdf page 86), raised by half, in the money of the place (a house rule).</p></div>`,
    whisper: gmIds(), speaker: {alias: "Money"}});
  for ( const {a, m} of rows ) if ( m.drop !== null && m.drop <= 30 ) await log({kind: "money", actor: isPC(a) ? a.id : null, name: a.name, attention: "Money runs short", text: `${a.name} will be living on less within ${m.drop} days.`});
  return {rows: rows.map(({a, m}) => ({actor: a.id, dots: m.dots, level: m.living.level, drop: m.drop}))};
}

/** The Storyteller's window: each character's Resources and how they live now. */
export async function moneyDialog() {
  if ( !game.user.isGM ) return;
  const list = moneyActors(), c = coinsNow();
  const cur = moneyNow(), unit = cur.units[0], away = awayMoney(), awayM = away ? R.moneyFor(yearNow(), away.region) : null;
  const rows = list.map(a => { const m = moneyOf(a), pu = purseOf(a); return `<tr><td>${esc(a.name)}</td><td>${m.dots}</td>
    <td><input type="number" step="any" min="0" name="${a.id}.carried" value="${R.mainUnits(pu.carried, cur)}" aria-label="Carried, in ${esc(unit[1])}"><br><small>${esc(pu.text.carried)}</small></td>
    <td><input type="number" step="any" min="0" name="${a.id}.bank" value="${R.mainUnits(pu.bank, cur)}" aria-label="Bank, in ${esc(unit[1])}"><br><small>${esc(pu.text.bank)}${pu.debt ? `; owes ${esc(pu.text.debt)}` : ""}</small></td><td>${esc(m.living.name)}${m.living.house ? " *" : ""}<br><small>${esc(m.living.why)}</small></td>
    <td><input type="checkbox" name="${a.id}.away"${m.away !== null ? " checked" : ""}>${m.away !== null ? ` <small>${m.away} d</small>` : ""}</td>
    <td><input type="checkbox" name="${a.id}.neglected"${m.neglected !== null ? " checked" : ""}>${m.neglected !== null ? ` <small>${m.neglected} d</small>` : ""}</td>${changeCell(a, pu, away, cur)}</tr>`; }).join("");
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 640}, window: {title: "Money by era"}, classes: ["wodx-dialog", "wst-money"],
    content: `<p>${esc(c.label)}, ${yearNow() || "this year"}: people pay in ${esc(c.coin)}; sums are reckoned in ${esc(c.account)}. A one-dot allowance is ${esc(R.formatMoney(R.allowance(1, yearNow(), region()), cur))} a month.</p>
      ${list.length > 5 ? searchBox("table.wst-money-t", "Search characters…", "Search characters") : ""}<div class="wst-scroll"><table class="wst-money-t"><thead><tr><th>Character</th><th>Resources</th><th>Carried (${esc(unit[1])})</th><th>${cur.banks ? "Bank" : "At home"} (${esc(unit[1])})</th><th>Living as</th><th>Away</th><th>Neglected</th><th>${away ? `Change into ${esc(awayM.label)}` : "Coin of other lands"}</th></tr></thead><tbody>${rows || "<tr><td colspan='8'>No player characters yet.</td></tr>"}</tbody></table></div>
      ${away ? `<p class="hint">This scene stands in ${esc(away.label)}, where people pay in ${esc(awayM.label)}. A money changer here takes ${Math.round(R.changerCut(yearNow(), {troubled: away.troubled, from: region(), to: away.region}) * 100)} in the hundred each way. Type a sum of home money to change into the coin of the place (${esc(unit[1])}), or a sum of the coin of the place to change back (${esc(awayM.units[0][1])}). Coin of the place pays for things here with no changer.</p>` : ""}
      <p class="hint">Away from home: 2 dots last six months on what they carry, 3 dots live plainly anywhere. A neglected fortune of 4 or 5 dots keeps comfort for a year, then less (V20 p. 116, V20 Dark Ages pp. 181-182). * marks a house rule where the books are silent.
      Raising money fast: ${esc(R.RAISE.pool)}, ${esc(R.RAISE.interval)}, difficulty ${R.RAISE.difficulty}; on a botch ${esc(R.RAISE.botch)} (V20 p. 252). ${esc(R.RAISE.sell)}</p>`,
    buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, {action: "cancel", label: "Cancel"}]});
  if ( !res ) return;
  for ( const a of list ) {
    const pu = rawPurse(a), w = cur.units[0][2];
    const carried = Math.round(num(res[`${a.id}.carried`]) * w), bank = Math.round(num(res[`${a.id}.bank`]) * w);
    if ( carried !== pu.carried || bank !== pu.bank || (pu.money && pu.money !== cur.id) ) await writePurse(a, {...pu, carried, bank}, "Set by the Storyteller");
    const into = num(res[`${a.id}.into`]), back = num(res[`${a.id}.back`]);
    if ( away && into > 0 ) await changePurse(a, Math.round(into * w), {});
    if ( away && back > 0 ) await changePurse(a, Math.round(back * awayM.units[0][2]), {back: true});
    for ( const id of Object.keys(rawPurse(a).foreign) ) if ( res[`${a.id}.home.${id}`] ) await changePurse(a, rawPurse(a).foreign[id]?.amount ?? 0, {back: true, money: id});
    await setAway(a, !!res[`${a.id}.away`]);
    await setNeglected(a, !!res[`${a.id}.neglected`]);
  }
}

/* ---------------------------------------------------------------- the purse (0.26.0) */

const region = () => { try { return setting("moneyRegion") || "moravian"; } catch (e) { return "moravian"; } };
const eraId = () => { try { return chron()?.eras?.activeEra?.()?.profile?.id ?? null; } catch (e) { return null; } };
export const moneyNow = () => R.moneyFor(yearNow(), region());

function rawPurse(a) {
  const p = a?.flags?.[MOD]?.money?.purse ?? {};
  return {money: p.money ?? null, year: p.year ?? null, carried: num(p.carried), bank: num(p.bank), debt: num(p.debt),
    paidMonth: Number.isFinite(p.paidMonth) ? p.paidMonth : null, log: Array.isArray(p.log) ? p.log : [], foreign: R.cleanForeign(p.foreign)};
}

/** Coin of other lands in a purse, with words: [{id, region, amount, text, label}]. */
export function foreignOf(a) {
  return Object.entries(rawPurse(a).foreign).map(([id, f]) => {
    const m = R.moneyFor(yearNow(), f.region), money = m.id === id ? m : (Object.values(R.MONIES).flatMap(r => r.list).find(x => x.id === id) ?? m);
    return {id, region: f.region, amount: f.amount, text: R.formatMoney(f.amount, money), label: money.label};
  });
}

/** The dialog's last cell: change into the coin of the place, change back, and coin of other lands to change home. */
function changeCell(a, pu, away, cur) {
  const held = foreignOf(a), here = away ? R.moneyFor(yearNow(), away.region) : null;
  const mine = here ? held.find(f => f.id === here.id) : null;
  const others = held.filter(f => f !== mine);
  const parts = [];
  if ( away ) {
    parts.push(`<input type="number" step="any" min="0" name="${a.id}.into" value="" placeholder="0" aria-label="Change into ${esc(here.label)}, in ${esc(cur.units[0][1])}">`);
    parts.push(`<small>Holds ${esc(mine?.text ?? "none")}</small>`);
    if ( mine ) parts.push(`<input type="number" step="any" min="0" name="${a.id}.back" value="" placeholder="0" aria-label="Change back, in ${esc(here.units[0][1])}">`);
  }
  if ( !away ) for ( const f of others ) parts.push(`<label><input type="checkbox" name="${a.id}.home.${f.id}"> <small>${esc(f.text)}: change home</small></label>`);
  else if ( others.length ) parts.push(`<small>Also ${others.map(f => esc(f.text)).join(", ")}</small>`);
  return `<td>${parts.join("<br>") || "<small>none</small>"}</td>`;
}

/** What a character or NPC has: amounts in the smallest unit of the money in use, plus words for each. */
export function purseOf(a) {
  const p = rawPurse(a), m = moneyNow();
  const fmt = v => R.formatMoney(v, m);
  return {...p, current: m, stale: !!p.money && p.money !== m.id,
    text: {carried: fmt(p.carried), bank: fmt(p.bank), debt: fmt(p.debt)}, banks: m.banks};
}

/** Remove the purse's whole foreign map (Foundry 14's ForcedDeletion; the old "-=" key where it is missing). */
async function dropForeign(a) {
  const Del = globalThis.foundry?.data?.operators?.ForcedDeletion;
  await a.update(Del ? {[`flags.${MOD}.money.purse.foreign`]: new Del()} : {[`flags.${MOD}.money.purse.-=foreign`]: null});
}

async function writePurse(a, next, note) {
  if ( !a?.update ) return null;
  const old = rawPurse(a), m = moneyNow();
  const entry = {at: now(), carried: next.carried - old.carried, bank: next.bank - old.bank, debt: next.debt - old.debt, note: String(note ?? "").slice(0, 120)};
  const foreign = R.cleanForeign(next.foreign ?? old.foreign), fd = {};
  for ( const id of new Set([...Object.keys(old.foreign), ...Object.keys(foreign)]) ) {
    const d = (foreign[id]?.amount ?? 0) - (old.foreign[id]?.amount ?? 0);
    if ( d ) fd[id] = {region: foreign[id]?.region ?? old.foreign[id].region, delta: d};
  }
  if ( Object.keys(fd).length ) entry.foreign = fd;
  if ( next.paidMonth !== undefined && next.paidMonth !== old.paidMonth ) entry.prevPaid = old.paidMonth;
  const log = [...old.log, entry].slice(-30);
  const purse = {money: m.id, year: yearNow(), carried: Math.max(0, Math.round(next.carried)), bank: Math.max(0, Math.round(next.bank)),
    debt: Math.max(0, Math.round(next.debt)), paidMonth: next.paidMonth ?? old.paidMonth, log, foreign};
  const upd = {[`flags.${MOD}.money.purse`]: purse};
  // A coin of another land spent to nothing must leave the flag, which a merge would keep: clear the map first
  if ( Object.keys(old.foreign).some(id => !foreign[id]) ) await dropForeign(a);
  if ( a.system?.money && typeof a.system.money === "object" ) {
    upd["system.money.carried"] = R.mainUnits(purse.carried, m);
    upd["system.money.bank"] = R.mainUnits(purse.bank, m);
  }
  await a.update(upd);
  return purse;
}

/** Bring a purse into this year's money: savings keep what they buy; coins of the old money become a keepsake item. */
export async function refreshPurse(a) {
  await refreshForeign(a);
  const p = rawPurse(a), m = moneyNow();
  if ( !p.money || p.money === m.id ) return false;
  const old = Object.values(R.MONIES).flatMap(r => r.list).find(x => x.id === p.money);
  if ( p.carried > 0 && old && a.createEmbeddedDocuments ) {
    await a.createEmbeddedDocuments("Item", [{name: `Old money: ${R.formatMoney(p.carried, old)} (${old.label})`, type: "Item"}]);
  }
  const from = p.year ?? yearNow();
  await writePurse(a, {carried: 0, bank: R.convertSavings(p.bank, from, yearNow(), region()), debt: R.convertSavings(p.debt, from, yearNow(), region())},
    `Money changed to ${m.label}`);
  return true;
}

/** Coin of other lands that has gone out of use there becomes a keepsake item, like old money at home. */
async function refreshForeign(a) {
  const p = rawPurse(a), stale = R.staleForeign(p.foreign, yearNow());
  if ( !stale.length ) return false;
  const all = Object.values(R.MONIES).flatMap(r => r.list), items = [], foreign = {...p.foreign};
  for ( const id of stale ) {
    const old = all.find(x => x.id === id);
    if ( old && a.createEmbeddedDocuments ) items.push({name: `Old money: ${R.formatMoney(foreign[id].amount, old)} (${old.label})`, type: "Item"});
    delete foreign[id];
  }
  if ( items.length ) await a.createEmbeddedDocuments("Item", items);
  await writePurse(a, {...p, foreign}, "Coin of other lands out of use");
  return true;
}

/**
 * Change money at a money changer (0.58.0). Into the coin of the place: amount in home money's smallest unit,
 * taken from what is carried. back: amount of the coin of the place (or of money id `money`, anywhere) changed
 * into home money. Returns {ok, got, text} or {ok: false, why}.
 */
export async function changePurse(a, amount, {scene = null, back = false, money = null} = {}) {
  if ( !a ) return {ok: false, why: "No one to change money for."};
  await refreshPurse(a);
  const amt = Math.max(0, Math.round(num(amount))), p = rawPurse(a), y = yearNow(), home = region();
  if ( !amt ) return {ok: false, why: "Nothing to change."};
  const away = awayMoney(scene), foreign = {...p.foreign};
  if ( back ) {
    const id = money ?? (away ? R.moneyFor(y, away.region).id : null), f = id ? foreign[id] : null;
    if ( !f ) return {ok: false, why: "No coin of that land in the purse."};
    const take = Math.min(f.amount, amt);
    const r = R.changeMoney(take, y, f.region, home, {troubled: !!away?.troubled && !money});
    foreign[id] = {region: f.region, amount: f.amount - take};
    await writePurse(a, {...p, carried: p.carried + r.got, foreign}, `Changed ${R.formatMoney(take, id)} back at a money changer`);
    return {ok: true, got: r.got, cut: r.cut, text: R.formatMoney(r.got, moneyNow())};
  }
  if ( !away ) return {ok: false, why: "This scene stands at home: there is nothing to change into."};
  if ( amt > p.carried ) return {ok: false, why: `Only ${R.formatMoney(p.carried, moneyNow())} is carried.`};
  const r = R.changeMoney(amt, y, home, away.region, {troubled: away.troubled});
  const id = r.money.id;
  foreign[id] = {region: away.region, amount: (foreign[id]?.amount ?? 0) + r.got};
  await writePurse(a, {...p, carried: p.carried - amt, foreign}, `Changed into ${r.money.label} at a money changer`);
  return {ok: true, got: r.got, cut: r.cut, text: R.formatMoney(r.got, r.money)};
}

/** Add money. to: "carried" or "bank". */
export async function receive(a, amount, {to = "carried", note = ""} = {}) {
  const amt = Math.max(0, Math.round(num(amount)));
  if ( !amt ) return {ok: true, amount: 0};
  await refreshPurse(a);
  const p = rawPurse(a), next = {...p};
  next[to === "bank" ? "bank" : "carried"] += amt;
  await writePurse(a, next, note || "Received");
  return {ok: true, amount: amt};
}

/**
 * Pay money out: from carried, then the bank where the era has banks (or when paying at home), then on credit when
 * the seller gives it, up to the credit limit. Returns {ok, fromCarried, fromBank, onCredit} or {ok: false, short}.
 */
export async function pay(a, amount, {from = "any", credit = false, atHome = false, note = "", scene = null} = {}) {
  let amt = Math.max(0, Math.round(num(amount)));
  await refreshPurse(a);
  const p = rawPurse(a), m = moneyNow();
  // 0.58.0: abroad, coin of the place pays first, with no changer
  const away = (atHome || from === "bank") ? null : awayMoney(scene);
  const localId = away ? R.moneyFor(yearNow(), away.region).id : null;
  const split = localId && p.foreign[localId] ? R.splitAbroad(amt, p.foreign[localId].amount, yearNow(), region(), away.region, {troubled: away.troubled}) : {local: 0, home: amt};
  amt = split.home;
  const canBank = from !== "carried" && (m.banks || atHome || from === "bank");
  const fromCarried = from === "bank" ? 0 : Math.min(p.carried, amt);
  const fromBank = canBank ? Math.min(p.bank, amt - fromCarried) : 0;
  let short = amt - fromCarried - fromBank, onCredit = 0;
  if ( short > 0 && credit ) {
    const room = Math.max(0, R.creditLimit(resourcesOf(a), yearNow(), region()) - p.debt);
    onCredit = Math.min(room, short); short -= onCredit;
  }
  if ( short > 0 ) return {ok: false, short, text: R.formatMoney(short, m)};
  const foreign = {...p.foreign};
  if ( split.local ) foreign[localId] = {...foreign[localId], amount: foreign[localId].amount - split.local};
  await writePurse(a, {carried: p.carried - fromCarried, bank: p.bank - fromBank, debt: p.debt + onCredit, foreign}, note || "Paid");
  return {ok: true, fromCarried, fromBank, onCredit, fromLocal: split.local, localMoney: localId};
}

/** Move money between two purses (a sale, a bribe, wages, a theft). */
export async function transfer(fromActor, toActor, amount, {credit = false, note = "", to = "carried", atHome = false} = {}) {
  const r = await pay(fromActor, amount, {credit, note, atHome});
  if ( !r.ok ) return r;
  await receive(toActor, Math.max(0, Math.round(num(amount))) - (r.onCredit ?? 0), {to, note});
  return r;
}

/** Undo the last movement in a purse (Storyteller only). */
export async function undoLast(a) {
  if ( !game.user.isGM ) return false;
  const p = rawPurse(a), e = p.log[p.log.length - 1];
  if ( !e ) return false;
  const purse = {...p, carried: p.carried - num(e.carried), bank: p.bank - num(e.bank), debt: p.debt - num(e.debt), log: p.log.slice(0, -1)};
  if ( "prevPaid" in e ) purse.paidMonth = e.prevPaid;
  const foreign = {...p.foreign};
  for ( const [id, f] of Object.entries(e.foreign ?? {}) ) foreign[id] = {region: f.region, amount: (foreign[id]?.amount ?? 0) - num(f.delta)};
  purse.foreign = R.cleanForeign(foreign);
  if ( Object.keys(p.foreign).some(id => !purse.foreign[id]) ) await dropForeign(a);
  await a.update({[`flags.${MOD}.money.purse`]: {...purse, money: p.money, year: p.year}});
  return true;
}

let goodsCache = null;
/** Load the goods list once (WoDX Library); later calls are instant, so stock draws can price lines at once. */
export async function goodsList() {
  if ( goodsCache ) return goodsCache;
  try { goodsCache = (await import("../../wodx-library/data/goods.mjs")).GOODS ?? []; } catch (e) { goodsCache = []; }
  return goodsCache;
}
export const goodsLoaded = () => goodsCache ?? [];

/** A made thing's name without its quality tag: "a sword (fine work)" gives "a sword". */
export const QUALITY_TAG = /\s*\((plain work|good work|fine work|masterwork|weak|strong)\)\s*$/i;
export const stripQuality = name => String(name ?? "").replace(QUALITY_TAG, "").trim();

/** A good by name, "7 bronze coins" (a count and its plural) or "bronze coins (7)" (a stock line). Sync once loaded. */
export function findGoodSync(name) {
  const list = goodsLoaded();
  let s = String(name ?? "").trim();
  const st = /^(.*?)\s*\((\d+)\)\s*$/.exec(s);
  let count = 1;
  if ( st ) { s = st[1].trim(); count = Number(st[2]); }
  // 0.35.0: a made thing's quality tag ("a sword (fine work)", "ale (strong)") names the same good
  s = stripQuality(s);
  const held = /^(.+?)\s*\(in (an?|\d+) [^)]+\)$/.exec(s);
  if ( held ) { s = held[1].trim(); if ( /^\d+$/.test(held[2]) ) count *= Number(held[2]); }
  const m = /^(\d+)\s+(.+)$/.exec(s);
  if ( m ) { const g = list.find(x => x.stack?.plural === m[2] || x.name === m[2]); if ( g ) return {good: g, count: Number(m[1]) * count}; }
  const g = list.find(x => x.name === s || x.was === s || x.former === s || x.stack?.plural === s || x.name.replace(/^(a|an|some) /, "") === s);
  return g ? {good: g, count} : null;
}
export async function findGood(name) { await goodsList(); return findGoodSync(name); }

const marketState = () => { try { return game.settings.get(MOD, "markets") ?? MK.blankState(); } catch (e) { return MK.blankState(); } };
/** The market a price is asked in: given, a trader's shop tile, or the scene in view. */
export function marketFor({market = null, tile = null, scene = null} = {}) {
  const st = marketState();
  if ( market ) return typeof market === "string" ? MK.marketById(st, market) : market;
  if ( tile ) { const m = MK.marketOfTile(st, typeof tile === "string" ? tile : tile.uuid); if ( m ) return m; }
  const sid = scene?.id ?? scene ?? globalThis.canvas?.scene?.id ?? null;
  return sid ? MK.marketOfScene(st, sid) : null;
}

/** The price of a good now, here, in the smallest unit (sync once goods are loaded). */
export function priceSync(good, {place = {}, count = 1, market = null, tile = null, scene = null} = {}) {
  const hit = typeof good === "string" ? findGoodSync(good) : {good, count: 1};
  if ( !hit?.good ) return null;
  const e = eraId(), g = hit.good;
  const tier = g.values?.[e] ?? g.value ?? 0;
  const n = Math.max(1, Math.round(num(count) > 1 ? num(count) : (hit.count || 1)));
  const mk = marketFor({market, tile, scene});
  const idx = mk ? MK.indexOf(mk, g.kind) : 1;
  const home = Math.max(1, Math.round(R.priceOf({...g, value: tier}, yearNow(), region(), {place}) * idx));
  const m = moneyNow();
  // Far from home the purse still pays in the coin of home, and a money changer takes a cut (0.56.0)
  const away = g.kind === "coin" ? null : awayMoney(scene);
  const ab = away ? R.priceAbroad(home, yearNow(), region(), away.region, {troubled: away.troubled}) : null;
  const each = ab ? ab.total : home;
  const out = {each, total: each * n, count: n, index: idx, market: mk?.id ?? null, text: R.formatMoney(each * n, m), sell: R.sellPrice(home * n), fence: R.sellPrice(home * n, {fence: true}), money: m.id};
  if ( ab && ab.cut > 0 ) {
    out.abroad = {region: away.region, label: away.label, share: ab.share, cut: ab.cut * n, local: ab.local * n, localText: R.formatMoney(ab.local * n, ab.localMoney), money: ab.localMoney.id};
    out.text = `${out.text} (${out.abroad.localText} here, and the money changer's ${Math.round(ab.share * 100)} in the hundred)`;
  }
  return out;
}

/**
 * The money of the place when a scene stands abroad and its land uses another money than home: {region (a money
 * region), label, troubled}. Null at home, with the changers switched off, or where the money is the same.
 */
export function awayMoney(scene = null) {
  try {
    if ( setting("changers") === false ) return null;
    const sc = (scene && typeof scene === "object") ? scene : (scene ? game.scenes.get(scene) : globalThis.canvas?.scene) ?? null;
    const w = chron()?.world;
    if ( !sc || !w?.isAbroad?.(sc) ) return null;
    const here = w.here(sc), mr = here?.money;
    if ( !mr || !R.MONIES[mr] || R.sameMoney(yearNow(), region(), mr) ) return null;
    return {region: mr, label: here.label, troubled: sc.getFlag?.(MOD, "troubled") === true};
  } catch (e) { return null; }
}

/** Change a sum from a purse into the coin of the place (or back): what the changer hands over. Changes no purse. */
export function changeQuote(amount, {scene = null, back = false} = {}) {
  const away = awayMoney(scene);
  if ( !away ) return null;
  const [from, to] = back ? [away.region, region()] : [region(), away.region];
  const r = R.changeMoney(amount, yearNow(), from, to, {troubled: away.troubled});
  return {...r, text: R.formatMoney(r.got, r.money), share: r.share};
}

/** The price of a good now, here (loads the goods list first). good: a goods entry or its name. */
export async function priceNow(good, opts = {}) { await goodsList(); return priceSync(good, opts); }

/** Count coins found in play into the purse: an item named like "7 silver pennies" becomes carried money. */
export async function cashIn(a, item) {
  const hit = await findGood(item?.name);
  if ( !hit || hit.good.kind !== "coin" ) return {ok: false, why: "Not money of a kind WoDX knows."};
  const pr = await priceNow(hit.good, {count: hit.count});
  await receive(a, pr.total, {note: `Counted in ${item.name}`});
  await item.delete?.();
  return {ok: true, amount: pr.total, text: pr.text};
}

/** Pay day for one actor: months owed since the last pay, debt first. Returns what was paid. */
export async function payDay(a, month) {
  await refreshPurse(a);
  const p = rawPurse(a), months = R.monthsToPay(p.paidMonth, month);
  if ( !months ) return null;
  const living = moneyOf(a).living;
  const total = R.allowance(living.level, yearNow(), region()) * months;
  const toDebt = Math.min(p.debt, total);
  await writePurse(a, {carried: p.carried, bank: p.bank + total - toDebt, debt: p.debt - toDebt, paidMonth: month},
    `Allowance for ${months} month${months === 1 ? "" : "s"}`);
  return {total, toDebt, months, text: R.formatMoney(total, moneyNow())};
}

/**
 * A character arrives on a scene (0.58.0). The first time they stand where people pay in another money, the
 * Storyteller gets one card: what the purse holds, the coin of the place and the changer's cut. Back where home
 * money is used, the mark clears, and coin of other lands still held is named. Active Storyteller only.
 */
export async function arrival(token) {
  if ( !isActiveGM() || !setting("money") || setting("changers") === false ) return null;
  // The base actor, so an unlinked token (its own synthetic actor) still shares one mark and one purse (0.58.1)
  const a = (token?.actorId ? game.actors?.get?.(token.actorId) : null) ?? token?.actor, scene = token?.parent;
  if ( !a || !isPC(a) || !scene ) return null;
  const f = a.flags?.[MOD]?.money ?? {}, away = awayMoney(scene), y = yearNow();
  const localM = away ? R.moneyFor(y, away.region) : null;
  if ( !away ) {
    if ( !f.abroadIn ) return null;
    await a.update({[`flags.${MOD}.money.abroadIn`]: null});
    const held = foreignOf(a);
    if ( !held.length ) return {home: true};
    await ChatMessage.create({content: `<div class="wodx-card wst-money"><h3>Home money again</h3><p>${esc(a.name)} still carries ${held.map(h => esc(h.text)).join(", ")}. A changer at home will take it back; Money by era in the hand has a box for it.</p></div>`,
      whisper: gmIds(), speaker: {alias: "Money"}});
    return {home: true, held: held.length};
  }
  if ( f.abroadIn === localM.id ) return null;
  await a.update({[`flags.${MOD}.money.abroadIn`]: localM.id});
  const pu = purseOf(a), mine = foreignOf(a).find(h => h.id === localM.id);
  const share = R.changerCut(y, {troubled: away.troubled, from: region(), to: away.region});
  const q = pu.carried > 0 ? R.changeMoney(pu.carried, y, region(), away.region, {troubled: away.troubled}) : null;
  await ChatMessage.create({content: `<div class="wodx-card wst-money"><h3>Another land's money</h3><p>${esc(a.name)} stands in ${esc(away.label)}, where people pay in ${esc(localM.label)}. The purse holds ${esc(pu.text.carried)}${mine ? ` and ${esc(mine.text)} of the coin here` : ""}.</p>
    <p>A money changer here takes ${Math.round(share * 100)} in the hundred.${q ? ` Changing all of it would give ${esc(R.formatMoney(q.got, q.money))}.` : ""} Until it is changed, prices here are charged to home money with the changer's cut. Money by era in the hand changes it.</p></div>`,
    whisper: gmIds(), speaker: {alias: "Money"}});
  return {away: localM.id};
}

export function registerMoneyHooks() {
  Hooks.on("createToken", (doc, options) => { if ( options?.wodxGate ) return; arrival(doc).catch(e => console.error(`${MOD} | arrival`, e)); });
  Hooks.on("wodxSkipEnd", () => { monthly().catch(e => console.error(`${MOD} |`, e)); });
  Hooks.on("updateWorldTime", () => { try { if ( chron()?.isSkipping?.() ) return; } catch (e) { /* no Chronicle */ } monthly().catch(e => console.error(`${MOD} |`, e)); });
}
