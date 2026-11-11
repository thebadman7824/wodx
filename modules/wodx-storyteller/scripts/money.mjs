/**
 * WoDX Storyteller 0.14.0: money by era. The rules are in money-rules.mjs.
 * 0.22.0: a real purse. flags.wodx-storyteller.money.purse = {money, year, carried, bank, debt, paidMonth, log}:
 *   amounts in the smallest unit of the money id (pfennig, kreuzer, haléř). system.money.carried / bank (the
 *   sheet's own numbers) get the same amounts in the main unit. Each month of game time Resources pays its
 *   allowance into the bank (before banks: the strongbox at home), first paying off any debt.
 *
 *   Actor flag wodx-storyteller.money {away, neglected, note}: the world time the character left home, or the
 *   world time the fortune stopped being kept up (null when neither). The Resources rating comes from the sheet.
 *   Once a month of game time (and after a skip), the Storyteller gets one card: how each character lives now,
 *   the coin of the day, and whose way of living drops within the month. Runs on the active Storyteller's client.
 */
import * as R from "./money-rules.mjs";
import * as MK from "./market-rules.mjs";
import {MOD, esc, isActiveGM, setting, isPC, chron, log} from "./core.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const now = () => game.time?.worldTime ?? 0;
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const held = () => { try { return !!chron()?.isHeld?.(); } catch (e) { return false; } };
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 0; } catch (e) { return 0; } };
const days = since => (since === null || since === undefined ? null : Math.max(0, Math.floor((now() - num(since)) / R.DAY)));

export function registerMoneySettings() {
  game.settings.register(MOD, "money", {name: "Money by era", hint: "Once a month of game time, tell the Storyteller how each character lives on their Resources, and the coin of the day.",
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
  }
  const li = rows.map(({a, m, paid}) => `<li><b>${esc(a.name)}</b>: Resources ${m.dots}, living as ${esc(m.living.name.toLowerCase())}${m.living.level !== m.dots ? ` (${esc(m.living.why.toLowerCase())})` : ""}.${paid ? ` Allowance ${esc(paid.text)}${paid.toDebt ? " (some went to pay a debt)" : ""}.` : ""}${m.drop !== null && m.drop <= 30 ? ` <i>That drops in ${m.drop} day${m.drop === 1 ? "" : "s"}.</i>` : ""}</li>`).join("");
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
  const cur = moneyNow(), unit = cur.units[0];
  const rows = list.map(a => { const m = moneyOf(a), pu = purseOf(a); return `<tr><td>${esc(a.name)}</td><td>${m.dots}</td>
    <td><input type="number" step="any" min="0" name="${a.id}.carried" value="${R.mainUnits(pu.carried, cur)}" aria-label="Carried, in ${esc(unit[1])}"><br><small>${esc(pu.text.carried)}</small></td>
    <td><input type="number" step="any" min="0" name="${a.id}.bank" value="${R.mainUnits(pu.bank, cur)}" aria-label="Bank, in ${esc(unit[1])}"><br><small>${esc(pu.text.bank)}${pu.debt ? `; owes ${esc(pu.text.debt)}` : ""}</small></td><td>${esc(m.living.name)}${m.living.house ? " *" : ""}<br><small>${esc(m.living.why)}</small></td>
    <td><input type="checkbox" name="${a.id}.away"${m.away !== null ? " checked" : ""}>${m.away !== null ? ` <small>${m.away} d</small>` : ""}</td>
    <td><input type="checkbox" name="${a.id}.neglected"${m.neglected !== null ? " checked" : ""}>${m.neglected !== null ? ` <small>${m.neglected} d</small>` : ""}</td></tr>`; }).join("");
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 640}, window: {title: "Money by era"}, classes: ["wodx-dialog", "wst-money"],
    content: `<p>${esc(c.label)}, ${yearNow() || "this year"}: people pay in ${esc(c.coin)}; sums are reckoned in ${esc(c.account)}. A one-dot allowance is ${esc(R.formatMoney(R.allowance(1, yearNow(), region()), cur))} a month.</p>
      ${list.length > 5 ? searchBox("table.wst-money-t", "Search characters…", "Search characters") : ""}<div class="wst-scroll"><table class="wst-money-t"><thead><tr><th>Character</th><th>Resources</th><th>Carried (${esc(unit[1])})</th><th>${cur.banks ? "Bank" : "At home"} (${esc(unit[1])})</th><th>Living as</th><th>Away</th><th>Neglected</th></tr></thead><tbody>${rows || "<tr><td colspan='7'>No player characters yet.</td></tr>"}</tbody></table></div>
      <p class="hint">Away from home: 2 dots last six months on what they carry, 3 dots live plainly anywhere. A neglected fortune of 4 or 5 dots keeps comfort for a year, then less (V20 p. 116, V20 Dark Ages pp. 181-182). * marks a house rule where the books are silent.
      Raising money fast: ${esc(R.RAISE.pool)}, ${esc(R.RAISE.interval)}, difficulty ${R.RAISE.difficulty}; on a botch ${esc(R.RAISE.botch)} (V20 p. 252). ${esc(R.RAISE.sell)}</p>`,
    buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, {action: "cancel", label: "Cancel"}]});
  if ( !res ) return;
  for ( const a of list ) {
    const pu = rawPurse(a), w = cur.units[0][2];
    const carried = Math.round(num(res[`${a.id}.carried`]) * w), bank = Math.round(num(res[`${a.id}.bank`]) * w);
    if ( carried !== pu.carried || bank !== pu.bank || (pu.money && pu.money !== cur.id) ) await writePurse(a, {...pu, carried, bank}, "Set by the Storyteller");
    await setAway(a, !!res[`${a.id}.away`]);
    await setNeglected(a, !!res[`${a.id}.neglected`]);
  }
}

/* ---------------------------------------------------------------- the purse (0.22.0) */

const region = () => { try { return setting("moneyRegion") || "moravian"; } catch (e) { return "moravian"; } };
const eraId = () => { try { return chron()?.eras?.activeEra?.()?.profile?.id ?? null; } catch (e) { return null; } };
export const moneyNow = () => R.moneyFor(yearNow(), region());

function rawPurse(a) {
  const p = a?.flags?.[MOD]?.money?.purse ?? {};
  return {money: p.money ?? null, year: p.year ?? null, carried: num(p.carried), bank: num(p.bank), debt: num(p.debt),
    paidMonth: Number.isFinite(p.paidMonth) ? p.paidMonth : null, log: Array.isArray(p.log) ? p.log : []};
}

/** What a character or NPC has: amounts in the smallest unit of the money in use, plus words for each. */
export function purseOf(a) {
  const p = rawPurse(a), m = moneyNow();
  const fmt = v => R.formatMoney(v, m);
  return {...p, current: m, stale: !!p.money && p.money !== m.id,
    text: {carried: fmt(p.carried), bank: fmt(p.bank), debt: fmt(p.debt)}, banks: m.banks};
}

async function writePurse(a, next, note) {
  if ( !a?.update ) return null;
  const old = rawPurse(a), m = moneyNow();
  const entry = {at: now(), carried: next.carried - old.carried, bank: next.bank - old.bank, debt: next.debt - old.debt, note: String(note ?? "").slice(0, 120)};
  if ( next.paidMonth !== undefined && next.paidMonth !== old.paidMonth ) entry.prevPaid = old.paidMonth;
  const log = [...old.log, entry].slice(-30);
  const purse = {money: m.id, year: yearNow(), carried: Math.max(0, Math.round(next.carried)), bank: Math.max(0, Math.round(next.bank)),
    debt: Math.max(0, Math.round(next.debt)), paidMonth: next.paidMonth ?? old.paidMonth, log};
  const upd = {[`flags.${MOD}.money.purse`]: purse};
  if ( a.system?.money && typeof a.system.money === "object" ) {
    upd["system.money.carried"] = R.mainUnits(purse.carried, m);
    upd["system.money.bank"] = R.mainUnits(purse.bank, m);
  }
  await a.update(upd);
  return purse;
}

/** Bring a purse into this year's money: savings keep what they buy; coins of the old money become a keepsake item. */
export async function refreshPurse(a) {
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
export async function pay(a, amount, {from = "any", credit = false, atHome = false, note = ""} = {}) {
  const amt = Math.max(0, Math.round(num(amount)));
  await refreshPurse(a);
  const p = rawPurse(a), m = moneyNow();
  const canBank = from !== "carried" && (m.banks || atHome || from === "bank");
  const fromCarried = from === "bank" ? 0 : Math.min(p.carried, amt);
  const fromBank = canBank ? Math.min(p.bank, amt - fromCarried) : 0;
  let short = amt - fromCarried - fromBank, onCredit = 0;
  if ( short > 0 && credit ) {
    const room = Math.max(0, R.creditLimit(resourcesOf(a), yearNow(), region()) - p.debt);
    onCredit = Math.min(room, short); short -= onCredit;
  }
  if ( short > 0 ) return {ok: false, short, text: R.formatMoney(short, m)};
  await writePurse(a, {carried: p.carried - fromCarried, bank: p.bank - fromBank, debt: p.debt + onCredit}, note || "Paid");
  return {ok: true, fromCarried, fromBank, onCredit};
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

/** A good by name, "7 bronze coins" (a count and its plural) or "bronze coins (7)" (a stock line). Sync once loaded. */
export function findGoodSync(name) {
  const list = goodsLoaded();
  let s = String(name ?? "").trim();
  const st = /^(.*?)\s*\((\d+)\)\s*$/.exec(s);
  let count = 1;
  if ( st ) { s = st[1].trim(); count = Number(st[2]); }
  const m = /^(\d+)\s+(.+)$/.exec(s);
  if ( m ) { const g = list.find(x => x.stack?.plural === m[2] || x.name === m[2]); if ( g ) return {good: g, count: Number(m[1]) * count}; }
  const g = list.find(x => x.name === s || x.stack?.plural === s || x.name.replace(/^(a|an|some) /, "") === s);
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
  const each = Math.max(1, Math.round(R.priceOf({...g, value: tier}, yearNow(), region(), {place}) * idx));
  const m = moneyNow();
  return {each, total: each * n, count: n, index: idx, market: mk?.id ?? null, text: R.formatMoney(each * n, m), sell: R.sellPrice(each * n), fence: R.sellPrice(each * n, {fence: true}), money: m.id};
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

export function registerMoneyHooks() {
  Hooks.on("wodxSkipEnd", () => { monthly().catch(e => console.error(`${MOD} |`, e)); });
  Hooks.on("updateWorldTime", () => { try { if ( chron()?.isSkipping?.() ) return; } catch (e) { /* no Chronicle */ } monthly().catch(e => console.error(`${MOD} |`, e)); });
}
