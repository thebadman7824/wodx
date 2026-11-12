/**
 * WoDX Storyteller 0.48.0: the weekly market turn (rules in market-turn-rules.mjs).
 *
 * Runs on the active Storyteller's client once a week of world time: when the clock passes a week by itself (checked
 * at most once a game hour, never during a skip) and when a time skip ends (up to twelve weeks, the rest settle at
 * once). World setting marketTurn: Off, Auto (small changes apply with one Undo card, big ones where a player
 * character is wait in the approval queue) or Suggest (everything waits in the queue). Linked markets whose prices
 * part far enough start talk of dear and cheap goods in the rumour network, from their traders.
 * Hidden state wodx-storyteller.marketTurnState = {last, told}.
 */
import * as R from "./market-turn-rules.mjs";
import * as MK from "./market-rules.mjs";
import * as Markets from "./markets.mjs";
import * as Own from "./owners.mjs";
import * as Rumours from "./rumours.mjs";
import {MOD, esc, chron, isActiveGM, isPC, gmIds, setting} from "./core.mjs";
import {describeTime} from "../../wodx-chronicle/scripts/calendar.mjs";

export const TYPE = `${MOD}.market`;
let KINDS = {};
const kindIds = () => Object.keys(KINDS);
const label = k => String(KINDS[k] ?? k).toLowerCase();
const all = c => (c ? [...(c.contents ?? c)] : []);
const latitude = () => { try { return Number(game.settings.get("wodx-chronicle", "latitude")) || 50.1; } catch (e) { return 50.1; } };
const dateAt = t => { try { const d = describeTime(t, latitude()); return {month: d.month, year: d.year}; } catch (e) { return {month: 1, year: 1197}; } };
const skipping = () => { try { return !!chron()?.isSkipping?.(); } catch (e) { return false; } };
const mode = () => setting("marketTurn") ?? "auto";
const turnState = () => ({last: null, told: [], ...(setting("marketTurnState") ?? {})});
const saveTurn = patch => game.settings.set(MOD, "marketTurnState", {...turnState(), ...patch});

export function registerMarketTurnSettings() {
  game.settings.register(MOD, "marketTurn", {name: "Markets move each week", scope: "world", config: true, type: String, default: "auto",
    hint: "Once a week of game time every market makes, uses and trades goods, and its prices follow supply and the season. Auto: small changes apply with an Undo card; a market going short or empty where a player character is waits in the approval queue. Suggest: every change waits in the queue. Off: markets change only by hand. Nothing happens until you set up a market.",
    choices: {auto: "Auto", suggest: "Suggest", off: "Off"}});
  game.settings.register(MOD, "marketTurnState", {scope: "world", config: false, type: Object, default: {last: null, told: []}});
}

/** Markets where a player character's token stands now. */
function pcMarkets(st) {
  const ids = new Set();
  for ( const s of all(game.scenes) ) {
    if ( !all(s.tokens).some(t => isPC(t.actor)) ) continue;
    const m = MK.marketOfScene(st, s.id);
    if ( m ) ids.add(m.id);
  }
  return [...ids];
}

const line = c => {
  const parts = [];
  if ( c.from.index !== c.to.index ) parts.push(`price x${c.from.index} to x${c.to.index}`);
  if ( c.from.supply !== c.to.supply ) parts.push(`supply ${MK.SUPPLY[c.from.supply].label.toLowerCase()} to ${MK.SUPPLY[c.to.supply].label.toLowerCase()}`);
  return `${label(c.kind)}: ${parts.join(", ")}${c.why.length ? ` (${c.why.join("; ")})` : ""}`;
};

/** Apply a list of changes (their to values) to the markets. */
async function applyChanges(changes) {
  const by = new Map();
  for ( const c of changes ) {
    const p = by.get(c.id) ?? {index: {}, supply: {}};
    p.index[c.kind] = c.to.index; p.supply[c.kind] = c.to.supply;
    by.set(c.id, p);
  }
  for ( const [id, p] of by ) await Markets.setMarket(id, p);
}

/**
 * Run the turns that are due. force: one turn now whatever the clock says (the Markets window's button).
 * Returns {changes, queued, skipped} or null when nothing ran.
 */
export async function run({force = false, reason = ""} = {}) {
  if ( !isActiveGM() || (mode() === "off" && !force) ) return null;
  const now = game.time.worldTime;
  const ts = turnState();
  const st = Markets.state();
  if ( !st.markets.length ) return null;
  let due = R.turnsDue(ts.last, now);
  if ( due.start && !force ) { await saveTurn({last: now}); return null; }
  if ( force ) due = {due: 1, skipped: 0};
  if ( !due.due ) return null;
  const base = Number.isFinite(Number(ts.last)) && !force ? Number(ts.last) : now - R.WEEK;
  const dates = Array.from({length: due.due}, (_, i) => dateAt(base + (i + 1) * R.WEEK));
  let works = {};
  try { works = Own.workshopCounts(st); } catch (e) { console.error(`${MOD} | market turn works`, e); }
  const pcs = pcMarkets(st);
  const r = R.runTurns(st, {dates, skipped: due.skipped, settleAt: due.skipped ? dateAt(now) : null, kinds: kindIds(), works, pcMarkets: pcs});
  const stamp = force ? (ts.last ?? now) : due.skipped ? now : base + due.due * R.WEEK;
  await saveTurn({last: stamp});
  const when = reason || (due.due > 1 || due.skipped ? `${due.due + due.skipped} weeks` : "a week");
  const suggest = mode() === "suggest";
  const queued = suggest ? [...r.changes, ...r.queued] : r.queued;
  if ( suggest ) {
    // Nothing lands until approved, but the weeks at each level still count
    await Markets.saveState({...st, markets: st.markets.map(m => ({...m, seen: r.state.markets.find(x => x.id === m.id)?.seen ?? m.seen}))});
  } else {
    const snap = R.snapshot(st, st.markets.map(m => m.id));
    await Markets.saveState(r.state);
    if ( r.changes.length ) await card({changes: r.changes, snap, pcs, when, skipped: due.skipped});
  }
  for ( const id of [...new Set(queued.map(c => c.id))] ) {
    const mine = queued.filter(c => c.id === id);
    await chron()?.propose?.({type: TYPE, key: `market-turn:${id}:${stamp}`, title: `${mine[0].name}: the market's week`,
      detail: mine.map(line).join(". "), data: {changes: mine}});
  }
  if ( !suggest ) await talk();
  return {changes: suggest ? [] : r.changes, queued, skipped: due.skipped};
}

async function card({changes, snap, pcs, when, skipped}) {
  const near = changes.filter(c => pcs.includes(c.id));
  const quiet = new Set(changes.filter(c => !pcs.includes(c.id)).map(c => c.id));
  const byMarket = new Map();
  for ( const c of near ) byMarket.set(c.name, [...(byMarket.get(c.name) ?? []), c]);
  const list = [...byMarket].map(([name, cs]) => `<li><b>${esc(name)}</b><ul>${cs.map(c => `<li>${esc(line(c))}</li>`).join("")}</ul></li>`).join("");
  return ChatMessage.create({speaker: {alias: "Markets"}, whisper: gmIds(), flags: {[MOD]: {marketTurn: {snap, applied: true}}},
    content: `<div class="wodx-card wst-markets wst-market-turn"><h3>The markets after ${esc(when)}</h3>
      ${list ? `<ul>${list}</ul>` : ""}${quiet.size ? `<p>${quiet.size} market${quiet.size === 1 ? "" : "s"} with no player character there changed quietly; the Markets window shows them.</p>` : ""}
      ${skipped ? `<p class="wodx-quiet">${skipped} more week${skipped === 1 ? "" : "s"} passed unplayed; their markets settled back to normal and the season's prices.</p>` : ""}
      <p class="wodx-quiet">House rules. Undo puts every market here back as it was before this turn.</p>
      <div class="wodx-buttons"><button type="button" data-action="wst-turn-undo">Undo</button></div></div>`});
}

async function undo(msg) {
  const f = msg?.flags?.[MOD]?.marketTurn;
  if ( !f?.applied || !game.user.isGM ) return;
  await Markets.saveState(R.restore(Markets.state(), f.snap));
  await msg.update({[`flags.${MOD}.marketTurn.applied`]: false});
}

/** Dear here, cheap there: start the talk in the rumour network from the traders of both markets. */
async function talk() {
  const st = Markets.state(), ts = turnState();
  const r = R.rumoursDue(st, ts.told ?? [], {kinds: kindIds()});
  await saveTurn({told: r.told});
  if ( !r.fresh.length || setting("rumourNetwork") === false ) return [];
  const out = [];
  for ( const f of r.fresh ) {
    const tellers = [...(MK.marketById(st, f.dear.id)?.traders ?? []), ...(MK.marketById(st, f.cheap.id)?.traders ?? [])].map(t => t.actor).filter(a => game.actors.get(a));
    const text = `${KINDS[f.kind] ?? f.kind} is dear in ${f.dear.name} and cheap in ${f.cheap.name}.`;
    try { out.push(await Rumours.startRumour({text, tellers: [...new Set(tellers)]})); } catch (e) { console.error(`${MOD} | market talk`, e); }
  }
  return out;
}

/** Chronicle's approval queue. Called from main.mjs on wodxChronicleReady (Chronicle sets its api in its own ready,
 * which may come after ours) and again at setup in case that hook has already passed. */
export function registerApproval() {
  chron()?.registerApprovalHandler?.(TYPE, {label: "Markets", approve: async entry => applyChanges(entry.data?.changes ?? [])});
}

export async function setupMarketTurn() {
  try { KINDS = (await import("../../wodx-library/data/goods.mjs")).KINDS ?? {}; } catch (e) { KINDS = {}; }
  registerApproval();
  let lastHour = -1;
  Hooks.on("updateWorldTime", () => {
    const hour = Math.floor((game.time.worldTime ?? 0) / 3600);
    if ( hour === lastHour || skipping() || !isActiveGM() ) return;
    lastHour = hour;
    run().catch(e => console.error(`${MOD} | market turn`, e));
  });
  Hooks.on("wodxSkipEnd", () => { if ( isActiveGM() ) run().catch(e => console.error(`${MOD} | market turn`, e)); });
  Hooks.on("renderChatMessageHTML", (message, el) => {
    const html = el?.[0] ?? el;
    const f = message.flags?.[MOD]?.marketTurn;
    const b = f && html?.querySelector?.("[data-action=wst-turn-undo]");
    if ( !b ) return;
    if ( !game.user.isGM ) { b.remove(); return; }
    b.disabled = !f.applied;
    b.addEventListener("click", () => { b.disabled = true; undo(message).catch(e => console.error(`${MOD} |`, e)); });
  });
}

export const api = () => ({run, undo, state: turnState, rules: R});
