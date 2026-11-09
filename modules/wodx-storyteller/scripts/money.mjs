/**
 * WoDX Storyteller 0.14.0: money by era. The rules are in money-rules.mjs.
 *
 *   Actor flag wodx-storyteller.money {away, neglected, note}: the world time the character left home, or the
 *   world time the fortune stopped being kept up (null when neither). The Resources rating comes from the sheet.
 *   Once a month of game time (and after a skip), the Storyteller gets one card: how each character lives now,
 *   the coin of the day, and whose way of living drops within the month. Runs on the active Storyteller's client.
 */
import * as R from "./money-rules.mjs";
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
    scope: "world", config: true, type: String, default: "german", choices: Object.fromEntries(Object.entries(R.COINS).map(([k, v]) => [k, v.label]))});
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

const moneyActors = () => game.actors.filter(a => isPC(a) || a.flags?.[MOD]?.money);

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
  const li = rows.map(({a, m}) => `<li><b>${esc(a.name)}</b>: Resources ${m.dots}, living as ${esc(m.living.name.toLowerCase())}${m.living.level !== m.dots ? ` (${esc(m.living.why.toLowerCase())})` : ""}.${m.drop !== null && m.drop <= 30 ? ` <i>That drops in ${m.drop} day${m.drop === 1 ? "" : "s"}.</i>` : ""}</li>`).join("");
  await ChatMessage.create({content: `<div class="wodx-card wst-money"><h3>The month's allowance</h3><p>${esc(c.label)}: people pay in ${esc(c.coin)}; sums are reckoned in ${esc(c.account)}.</p><ul>${li}</ul>
    <p class="wodx-quiet">The books set the allowance by the way a character lives, not a sum (V20 p. 115, V20 Dark Ages p. 181). The coins are a house rule.</p></div>`,
    whisper: gmIds(), speaker: {alias: "Money"}});
  for ( const {a, m} of rows ) if ( m.drop !== null && m.drop <= 30 ) await log({kind: "money", actor: isPC(a) ? a.id : null, name: a.name, attention: "Money runs short", text: `${a.name} will be living on less within ${m.drop} days.`});
  return {rows: rows.map(({a, m}) => ({actor: a.id, dots: m.dots, level: m.living.level, drop: m.drop}))};
}

/** The Storyteller's window: each character's Resources and how they live now. */
export async function moneyDialog() {
  if ( !game.user.isGM ) return;
  const list = moneyActors(), c = coinsNow();
  const rows = list.map(a => { const m = moneyOf(a); return `<tr><td>${esc(a.name)}</td><td>${m.dots}</td><td>${esc(m.living.name)}${m.living.house ? " *" : ""}<br><small>${esc(m.living.why)}</small></td>
    <td><input type="checkbox" name="${a.id}.away"${m.away !== null ? " checked" : ""}>${m.away !== null ? ` <small>${m.away} d</small>` : ""}</td>
    <td><input type="checkbox" name="${a.id}.neglected"${m.neglected !== null ? " checked" : ""}>${m.neglected !== null ? ` <small>${m.neglected} d</small>` : ""}</td></tr>`; }).join("");
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 640}, window: {title: "Money by era"}, classes: ["wodx-dialog", "wst-money"],
    content: `<p>${esc(c.label)}, ${yearNow() || "this year"}: people pay in ${esc(c.coin)}; sums are reckoned in ${esc(c.account)}.</p>
      ${list.length > 5 ? searchBox("table.wst-money-t", "Search characters…", "Search characters") : ""}<div class="wst-scroll"><table class="wst-money-t"><thead><tr><th>Character</th><th>Resources</th><th>Living as</th><th>Away</th><th>Neglected</th></tr></thead><tbody>${rows || "<tr><td colspan='5'>No player characters yet.</td></tr>"}</tbody></table></div>
      <p class="hint">Away from home: 2 dots last six months on what they carry, 3 dots live plainly anywhere. A neglected fortune of 4 or 5 dots keeps comfort for a year, then less (V20 p. 116, V20 Dark Ages pp. 181-182). * marks a house rule where the books are silent.
      Raising money fast: ${esc(R.RAISE.pool)}, ${esc(R.RAISE.interval)}, difficulty ${R.RAISE.difficulty}; on a botch ${esc(R.RAISE.botch)} (V20 p. 252). ${esc(R.RAISE.sell)}</p>`,
    buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, {action: "cancel", label: "Cancel"}]});
  if ( !res ) return;
  for ( const a of list ) {
    await setAway(a, !!res[`${a.id}.away`]);
    await setNeglected(a, !!res[`${a.id}.neglected`]);
  }
}

export function registerMoneyHooks() {
  Hooks.on("wodxSkipEnd", () => { monthly().catch(e => console.error(`${MOD} |`, e)); });
  Hooks.on("updateWorldTime", () => { try { if ( chron()?.isSkipping?.() ) return; } catch (e) { /* no Chronicle */ } monthly().catch(e => console.error(`${MOD} |`, e)); });
}
