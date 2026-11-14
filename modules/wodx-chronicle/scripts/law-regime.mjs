/**
 * WoDX Chronicle: regime change in the world (B3618-B3619). The rules are in law-regime-rules.mjs.
 *   Dated    on a clock jump, each turn of rule in the homeland's law since the year last seen sends
 *            wodxRegimeTurn {region, year, cause, kinds, chance, note}; WoDX Storyteller's institutions sweep out
 *            holders of those kinds. A new form of government lets the old warrants and outlawries lapse.
 *   Rising   a town's rising (wodxTown kind "rising") asks the Storyteller whether it wins; if it does, the town's
 *            officers are swept out (wodxRegimeTurn with the town)
 *   Election in an age of votes, each player character with a council seat faces the voters at each election year
 *            crossed: a roll the Storyteller calls; lost, the seat goes (wodxRegimeTurn with only that character)
 */
import {MODULE_ID, esc, isActiveGM} from "./util.mjs";
import * as L from "./law-rules.mjs";
import * as R from "./law-regime-rules.mjs";
import * as place from "./place.mjs";
import {amnesty} from "./law-heat.mjs";
import {marksOf} from "./law-punish.mjs";

const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const st = () => game.modules.get("wodx-storyteller")?.api?.upkeep ?? null;
const hand = () => game.modules.get("wodx-storyteller")?.api?.hand ?? null;
const homeRegion = () => { try { return place.homeland() ?? "moravia"; } catch (e) { return "moravia"; } };
const lineHooks = () => [...new Set(game.actors.filter(a => a.hasPlayerOwner).map(a => R.LINE_REGIME[actorLine(a)]).filter(Boolean))];
function actorLine(a) {
  const t = String(a?.type ?? "").toLowerCase(), v = String(a?.system?.settings?.variant ?? "").toLowerCase();
  if ( t === "mortal" && (v === "ghoul" || v === "revenant") ) return v;
  if ( t === "changing breed" || t === "changingbreed" ) return "werewolf";
  if ( t === "pc" ) return "vampire";
  return Object.keys(R.LINE_REGIME).includes(t) ? t : "mortal";
}

/** The new order's amnesty: the heat of the land cools to nothing, and outlawry and banishment there are lifted. */
async function newOrderAmnesty(region) {
  let warrants = 0, lifted = 0;
  try { warrants = await amnesty(region); } catch (e) { warrants = 0; }
  for ( const a of game.actors ?? [] ) {
    const marks = marksOf(a);
    if ( !marks.some(m => m.region === region && !m.pardoned && R.AMNESTY_MARKS.includes(m.kind)) ) continue;
    await a.setFlag(MODULE_ID, "lawMarks", marks.map(m => (m.region === region && R.AMNESTY_MARKS.includes(m.kind) ? (lifted++, {...m, pardoned: true}) : m)));
  }
  return {warrants, lifted};
}

/** Send one turn to the institutions and tell the Storyteller. */
export async function turn({region, year, cause, kinds, chance, note = "", words = "", town = null, only = null, amnestyToo = false} = {}) {
  if ( !game.user.isGM ) return null;
  Hooks.callAll("wodxRegimeTurn", {region, year, cause, kinds, chance, note, town, only});
  const am = amnestyToo ? await newOrderAmnesty(region) : null;
  if ( only ) return am;
  const hooks = lineHooks();
  await ChatMessage.create({speaker: {alias: "The new order"}, whisper: gmIds(),
    content: `<div class="wodx-card wodx-law-regime"><h3>${esc(note || "A turn of rule")}${year ? `, ${esc(year)}` : ""}</h3><p>${esc(words)}</p>
      ${am ? `<p>${esc(`Warrants dropped: ${am.warrants}. Outlawries and banishments lifted: ${am.lifted}.`)}</p>` : ""}
      ${hooks.length ? `<ul>${hooks.map(h => `<li><em>${esc(h)}</em></li>`).join("")}</ul>` : ""}<p class="hint">What a turn does to those under it is a house rule.</p></div>`});
  return am;
}

/** On a clock jump: the homeland's turns of rule and its elections since the year last seen. */
export async function checkTurns(fromYear, toYear) {
  if ( !isActiveGM() || !(toYear > fromYear) ) return [];
  const region = homeRegion(), turns = R.turnsBetween(L.rowsFor(region), fromYear, toYear);
  for ( const t of turns.slice(-6) ) await turn({region, year: t.year, cause: t.cause, kinds: t.kinds, chance: t.chance, note: t.note, words: t.words, amnestyToo: t.amnesty});
  await checkElections(region, fromYear, toYear);
  return turns;
}

/** The councillors among the player characters, with their best council seat. */
function councillors() {
  const out = [];
  for ( const a of game.actors ?? [] ) {
    if ( !a.hasPlayerOwner ) continue;
    let seats = [];
    try { seats = (st()?.institutions?.seatsOf?.(a.id) ?? []).filter(s => s.kind === "council"); } catch (e) { seats = []; }
    if ( seats.length ) out.push({a, rank: Math.max(...seats.map(s => Number(s.rank) || 0))});
  }
  return out;
}

export async function checkElections(region, fromYear, toYear) {
  const family = L.familyOf(region).id;
  const years = R.electionsBetween(y => L.lawOf(region, y), family, fromYear, toYear);
  if ( !years.length ) return [];
  const who = councillors();
  if ( !who.length ) return years;
  const y = years[years.length - 1];
  const btn = ({a, rank}) => `<button type="button" data-action="wodx-law-election" data-actor="${esc(a.id)}" data-rank="${rank}" data-year="${y}">${esc(a.name)}</button>`;
  await ChatMessage.create({speaker: {alias: "The voters"}, whisper: gmIds(), flags: {[MODULE_ID]: {lawElection: {region, year: y}}},
    content: `<div class="wodx-card wodx-law-election"><h3>An election, ${esc(y)}</h3><p>${esc(years.length > 1 ? `${years.length} elections have come and gone; the latest decides.` : "The council's seats are open to the vote.")} Call each councillor's roll to keep the seat:</p>${who.map(btn).join(" ")}</div>`});
  return years;
}

async function election(actorId, rank, year) {
  const a = game.actors.get(actorId), call = hand()?.call;
  if ( !a || !call ) { ui.notifications?.warn?.("An election needs WoDX Storyteller's call for a roll."); return null; }
  const msg = await call({...R.electionRequest({rank, year, name: a.name}), actorIds: [a.id]});
  const ans = msg?.flags?.["wodx-storyteller"]?.call?.answers?.[0];
  if ( !ans ) return null;
  const kept = !!ans.wins && !ans.botch;
  if ( !kept ) await turn({region: homeRegion(), year, cause: "election", kinds: ["council"], chance: 1, only: a.id});
  await ChatMessage.create({speaker: {alias: "The voters"}, content: `<div class="wodx-card"><p>${esc(kept ? `${a.name} keeps the seat.` : `${a.name} loses the seat at the election.`)}</p></div>`});
  return kept;
}

/** A town's rising: does it win? */
async function risingCard({town, region, name = "", text = ""} = {}) {
  if ( !isActiveGM() ) return null;
  name = name || "the town";
  return ChatMessage.create({speaker: {alias: "The new order"}, whisper: gmIds(), flags: {[MODULE_ID]: {lawRising: {town, region: region || homeRegion(), name}}},
    content: `<div class="wodx-card wodx-law-regime"><h3>The rising: does it win?</h3><p>${esc(text)}</p>
      <button type="button" data-action="wodx-law-rising" data-won="1">The rising wins</button> <button type="button" data-action="wodx-law-rising" data-won="0">It is put down</button></div>`});
}

export function registerRegimeHooks() {
  Hooks.on("wodxTown", p => { if ( p?.kind === "rising" ) risingCard(p).catch(e => console.error("WoDX | rising", e)); });
  Hooks.on("renderChatMessageHTML", (message, el) => {
    if ( !game.user.isGM ) return;
    const f = message.flags?.[MODULE_ID] ?? {};
    for ( const b of el.querySelectorAll?.("[data-action='wodx-law-election']") ?? [] ) b.addEventListener("click", () => {
      b.disabled = true; election(b.dataset.actor, Number(b.dataset.rank) || 0, Number(b.dataset.year) || 0).catch(e => console.error("WoDX | election", e));
    });
    if ( f.lawRising ) for ( const b of el.querySelectorAll?.("[data-action='wodx-law-rising']") ?? [] ) b.addEventListener("click", () => {
      for ( const x of el.querySelectorAll("[data-action='wodx-law-rising']") ) x.disabled = true;
      const r = f.lawRising, sw = R.SWEEP.rising;
      if ( b.dataset.won === "1" ) turn({region: r.region, year: null, cause: "rising", kinds: sw.kinds, chance: sw.chance, town: r.town, note: `${r.name} rises`, words: sw.words}).catch(e => console.error("WoDX | rising", e));
      else ChatMessage.create({speaker: {alias: "The new order"}, whisper: gmIds(), content: `<div class="wodx-card"><p>The rising in ${esc(r.name)} is put down; its leaders are hunted.</p></div>`});
    });
  });
}

export {R as rules};
