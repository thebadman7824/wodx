/**
 * WoDX Storyteller 0.49.0: faction moves on markets and traders going broke (rules in market-moves-rules.mjs).
 *
 * Runs with the weekly market turn on the active Storyteller's client. Before the turn, standing moves age a week,
 * closed roads count down and moves whose faction has lost its hold lapse. After it, every trader's week is reckoned
 * against the till, shops shut or open again (a shop about to shut where a player character stands waits in the
 * approval queue), and each faction that runs itself may make one move.
 * World settings: marketMoves (Auto: a move applies with an Undo card, but waits in the approval queue where a player
 * character stands or belongs; Suggest: every move waits; Off: moves only by hand) and tradersBroke (on or off).
 * Factions are read from WoDX NPC and never changed here: a tax or a raid moves no dots and no standing by itself.
 */
import * as MV from "./market-moves-rules.mjs";
import * as MK from "./market-rules.mjs";
import * as CR from "./caravan-rules.mjs";
import * as Markets from "./markets.mjs";
import * as Money from "./money.mjs";
import * as Caravans from "./caravans.mjs";
import * as Rumours from "./rumours.mjs";
import {MOD, esc, chron, npc, isActiveGM, isPC, gmIds, setting, tripContext, wageNow, moneyWords} from "./core.mjs";

export const TYPE = `${MOD}.marketMove`;
let KINDS = {};
const kindIds = () => Object.keys(KINDS);
const label = k => String(KINDS[k] ?? k).toLowerCase();
const now = () => game.time?.worldTime ?? 0;
const mode = () => setting("marketMoves") ?? "auto";
const era = () => tripContext(now());
const words = mv => { const e = era(); return MV.describe(mv, {year: e.year, future: e.future, kindLabel: label}); };

export function registerMoveSettings() {
  game.settings.register(MOD, "marketMoves", {name: "Factions act on markets", scope: "world", config: true, type: String, default: "auto",
    hint: "With the weekly market turn, a faction that runs itself may tax a market it holds, corner a kind of goods, smuggle past a rival's tax or raid a rival's market. Auto: a move applies with an Undo card, and waits in the approval queue where a player character stands or belongs to the faction. Suggest: every move waits in the queue. Off: only the moves you set by hand in the Markets window. Nothing happens until a market and a faction share a place.",
    choices: {auto: "Auto", suggest: "Suggest", off: "Off"}});
  game.settings.register(MOD, "tradersBroke", {name: "Traders can go broke", scope: "world", config: true, type: Boolean, default: true,
    hint: "Each week a trader's takings follow the supply of what the shop sells, less taxes, against the keep of the shop. Four weeks the till cannot cover and the shop shuts until trade has been good for eight weeks. Off: tills change only when a shop restocks or sells."});
}

/** Every faction as the market rules read it. */
export function views(st = Markets.state()) {
  let fs = [];
  try { fs = npc()?.factions?.state?.()?.factions ?? []; } catch (e) { fs = []; }
  return fs.map(f => MV.viewOf(f, st.markets));
}
const pcFactions = vs => vs.filter(v => v.members.some(id => isPC(game.actors.get(id)))).map(v => v.id);

/** The week for what already stands, before the market turn. Pure: the turn runner saves the state. */
export function before(st, {weeks = 1} = {}) {
  return MV.weekMoves(st, views(st), {weeks});
}
export const shift = (m, k) => MV.priceShift(m, k);
export const blocked = (a, b) => MV.closed(a, b);

/** The kinds of goods a trader's shop sells, from its stock list. */
function sellsOf(t) {
  let tile = null;
  try { tile = fromUuidSync(t.tile); } catch (e) { tile = null; }
  const stock = String(tile?.flags?.["wodx-interactables"]?.stock ?? "");
  const kinds = new Set();
  for ( const line of stock.split(/[\n;,]+/) ) {
    const k = Money.findGoodSync(MK.splitLine(line).name)?.good?.kind;
    if ( k ) kinds.add(k);
  }
  return [...kinds];
}

/** The traders' weeks. Returns {state, tills: [{actor, delta}], shut: [{market, actor}], opened: [...]}; purses are written. */
async function tradersWeek(st, vs, weeks, pcMarkets = []) {
  const next = foundry.utils.deepClone(st), tills = [], shut = [], opened = [], waiting = [];
  if ( setting("tradersBroke") === false ) return {state: next, tills, shut, opened, waiting};
  const wage = wageNow(era().year);
  if ( !(wage > 0) ) return {state: next, tills, shut, opened, waiting};
  const memberOf = new Map(vs.map(v => [v.id, new Set(v.members)]));
  for ( const m of next.markets ) {
    if ( m.cut ) continue;
    for ( const t of m.traders ) {
      const actor = game.actors.get(t.actor);
      if ( !actor ) continue;
      const factor = MV.tradeFactor(m, {sells: sellsOf(t), kinds: kindIds(), member: f => !!memberOf.get(f)?.has(t.actor)});
      const purse = Money.purseOf(actor);
      const r = MV.traderWeeks(t, {wage, factor, till: purse.carried + purse.bank, weeks});
      // Where a player character stands, a shop about to shut waits for the Storyteller's word, a week short of it
      if ( r.shutNow && pcMarkets.includes(m.id) ) {
        r.trader.shut = false; r.trader.behind = MV.BROKE_AT - 1; r.shutNow = false;
        waiting.push({market: m.id, name: m.name, actor: t.actor, who: actor.name});
      }
      if ( r.trader.behind ) t.behind = r.trader.behind; else delete t.behind;
      if ( r.trader.shut ) { t.shut = true; t.shutWeeks = r.trader.shutWeeks; } else { delete t.shut; delete t.shutWeeks; }
      if ( r.shutNow ) shut.push({market: m.id, name: m.name, actor: t.actor, who: actor.name});
      if ( r.openNow ) {
        const backer = vs.find(v => !v.idle && v.home.includes(m.id) && v.trade >= 2);
        if ( backer ) t.backer = backer.name; else delete t.backer;
        opened.push({market: m.id, name: m.name, actor: t.actor, who: actor.name, backer: backer?.name ?? null});
      }
      if ( r.till ) {
        try {
          if ( r.till > 0 ) await Money.receive(actor, r.till, {note: "The shop's week"});
          else await Money.pay(actor, -r.till, {atHome: true, note: "The shop's keep"});
          tills.push({actor: t.actor, delta: r.till});
        } catch (e) { console.error(`${MOD} | trader till`, e); }
      }
    }
  }
  return {state: next, tills, shut, opened, waiting};
}

/** A raid, rolled and carried out. Returns {text, state (markets, when changed), tills}. */
async function raid(mv, st, vs) {
  const v = vs.find(x => x.id === mv.faction), m = MK.marketById(st, mv.market), e = era();
  if ( !v || !m ) return {text: "", state: st, tills: []};
  const who = `${MV.wordFor("raid", e.year, {future: e.future})} of ${v.name}`;
  const prey = CR.onRoadAt(Caravans.state(), m.id)[0] ?? null;
  const guard = prey ? prey.guard : MV.guardOf(m, vs);
  const rand = chron()?.gen?.random?.(`market-raid:${mv.faction}:${mv.market}:${Math.floor(now())}`) ?? Math.random;
  const roll = MV.rollRaid(v.force, guard, rand);
  const dice = `${roll.dice.join(", ")}: ${roll.successes} against a guard of ${guard}`;
  if ( roll.net < 1 ) return {text: `${v.name} sends ${MV.wordFor("raid", e.year, {future: e.future})} against ${m.name} and they are driven off (${dice}${roll.botch ? ", a botch" : ""}).`, state: st, tills: []};
  if ( prey ) {
    await Caravans.loseCaravan(prey.id, {by: `taken by ${who}`, quiet: true});
    return {text: `${v.name}: ${who} take ${CR.describe(prey, {kindLabel: label}).replace(/^A/, "a")} on the road (${dice}).`, state: Markets.state(), tills: [], rumour: `${who[0].toUpperCase()}${who.slice(1)} took the goods bound for ${prey.toName}.`};
  }
  const r = MV.raidMarket(st, m.id, roll.net, {kinds: kindIds(), rand});
  const parts = [], tills = [];
  if ( r.kind ) parts.push(`${label(r.kind)} ${MK.SUPPLY[r.from].label.toLowerCase()} to ${MK.SUPPLY[r.to].label.toLowerCase()}`);
  const victim = r.trader ? game.actors.get(r.trader) : null;
  if ( victim && r.share > 0 ) {
    const take = Math.floor(Money.purseOf(victim).carried * r.share);
    if ( take > 0 ) {
      try { await Money.pay(victim, take, {from: "carried", note: "Robbed in a raid"}); tills.push({actor: victim.id, delta: -take}); parts.push(`${victim.name} robbed of ${moneyWords(take, e.year)}`); }
      catch (err) { console.error(`${MOD} | raid till`, err); }
    }
  }
  if ( r.road ) parts.push(`the road to ${MK.marketById(st, r.road)?.name ?? "the next market"} closed for ${r.weeks} ${r.weeks === 1 ? "week" : "weeks"}`);
  return {text: `${v.name}: ${who} strike ${m.name} (${dice})${parts.length ? `: ${parts.join("; ")}` : ""}.`, state: r.state, tills,
    rumour: `${who[0].toUpperCase()}${who.slice(1)} struck ${m.name}.`};
}

/** Carry out one move on a markets state. Returns {state, text, tills, rumour}. */
async function carryOut(mv, st, vs) {
  if ( mv.type === "raid" ) return raid(mv, st, vs);
  const r = MV.addMove(st, mv, kindIds());
  const m = MK.marketById(st, mv.market);
  return {state: r.state, text: r.move ? `${m?.name ?? "A market"}: ${words(mv)}.` : "", tills: [], rumour: null};
}

async function tell(text, marketId) {
  if ( !text || setting("rumourNetwork") === false ) return;
  const tellers = (MK.marketById(Markets.state(), marketId)?.traders ?? []).map(t => t.actor).filter(a => game.actors.get(a));
  try { await Rumours.startRumour({text, tellers}); } catch (e) { console.error(`${MOD} | market talk`, e); }
}

/**
 * After the market turn. pre: what before() found; weeks: weeks played; live: a single week played as it happens
 * (new moves are made only then); pcMarkets: markets where a player character stands; stamp: the turn's time.
 */
export async function after({pre = null, weeks = 1, live = true, pcMarkets = [], stamp = now()} = {}) {
  if ( !isActiveGM() ) return null;
  const start = Markets.state(), startCaravans = Caravans.state();
  const vs = views(start);
  const lines = [], tills = [];
  for ( const l of pre?.lapsed ?? [] ) lines.push(`${l.name}: ${l.move.name}'s ${l.move.type === "tax" ? "tax" : l.move.type === "monopoly" ? `hold on ${label(l.move.goods)}` : "smuggling"} ends (${l.why}).`);
  for ( const o of pre?.opened ?? [] ) lines.push(`The road between ${MK.marketById(start, o.a)?.name ?? "a market"} and ${MK.marketById(start, o.b)?.name ?? "a market"} is safe again.`);
  // Traders
  const tw = await tradersWeek(start, vs, weeks, pcMarkets);
  for ( const w of tw.waiting ) await chron()?.propose?.({type: TYPE, key: `market-shut:${w.market}:${w.actor}`, title: `${w.name}: ${w.who}'s shop is about to shut`,
    detail: `${w.who} is four weeks behind with the shop's keep and the till is empty. Approve and the shop shuts: it draws no new stock until it has stood shut eight weeks and trade is good. House rules.`, data: {shut: {market: w.market, actor: w.actor}}});
  let st = tw.state;
  tills.push(...tw.tills);
  for ( const s of tw.shut ) { lines.push(`${s.name}: ${s.who} cannot pay the shop's keep and shuts up shop.`); Hooks.callAll("wodxTraderBroke", {market: s.market, actor: s.actor}); }
  for ( const o of tw.opened ) lines.push(`${o.name}: ${o.who} opens the shop again${o.backer ? `, backed by ${o.backer}` : ""}.`);
  // New moves
  const talk = [];
  for ( const g of pre?.grumbles ?? [] ) talk.push({market: g.market, text: `People in ${g.name} grumble at what ${g.move.name} takes from every sale.`});
  for ( const s of tw.shut ) talk.push({market: s.market, text: `${s.who} has shut up shop in ${s.name}.`});
  if ( live && mode() !== "off" ) {
    const plan = MV.planMoves(st, vs, {kinds: kindIds(), pcMarkets, pcFactions: pcFactions(vs),
      randFor: id => chron()?.gen?.random?.(`market-move:${Math.floor(stamp)}:${id}`) ?? Math.random});
    for ( const mv of plan ) {
      if ( mv.queue || mode() === "suggest" ) {
        await chron()?.propose?.({type: TYPE, key: `market-move:${mv.faction}:${mv.market}:${Math.floor(stamp)}`, title: `${MK.marketById(st, mv.market)?.name ?? "A market"}: ${mv.name} moves on the market`,
          detail: `${words(mv)}. House rules.`, data: {move: mv}});
        continue;
      }
      // A raid may take a caravan, which writes the markets itself: what is in hand is saved first
      if ( mv.type === "raid" ) await Markets.saveState(st);
      const r = await carryOut(mv, st, vs);
      st = r.state; tills.push(...r.tills);
      if ( r.text ) lines.push(r.text);
      if ( r.rumour ) talk.push({market: mv.market, text: r.rumour});
      Hooks.callAll("wodxMarketMove", {move: mv, market: mv.market});
    }
  }
  await Markets.saveState(st);
  if ( lines.length ) await ChatMessage.create({speaker: {alias: "Markets"}, whisper: gmIds(),
    flags: {[MOD]: {marketMoves: {markets: start, caravans: startCaravans, tills, applied: true}}},
    content: `<div class="wodx-card wst-markets wst-market-moves"><h3>Factions and traders this week</h3><ul>${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>
      <p class="wodx-quiet">House rules. Undo puts the markets, their shops and the caravans back as they were before these lines, and gives back what the tills gained or lost.</p>
      <div class="wodx-buttons"><button type="button" data-action="wst-moves-undo">Undo</button></div></div>`});
  for ( const t of talk ) await tell(t.text, t.market);
  return {lines, tills};
}

async function undo(msg) {
  const f = msg?.flags?.[MOD]?.marketMoves;
  if ( !f?.applied || !game.user.isGM ) return;
  await Markets.saveState(f.markets);
  await game.settings.set(MOD, "caravanState", CR.normState(f.caravans));
  for ( const t of f.tills ?? [] ) {
    const a = game.actors.get(t.actor);
    if ( !a ) continue;
    if ( t.delta > 0 ) await Money.pay(a, t.delta, {atHome: true, note: "Undo: the shop's week"});
    else await Money.receive(a, -t.delta, {note: "Undo: the shop's week"});
  }
  await msg.update({[`flags.${MOD}.marketMoves.applied`]: false});
}

/* ---------------------------------------------------------------- by hand */

/** Put a move on a market by hand. The Storyteller's word stands whatever the faction's dots; why says what it lacks. */
export async function setMove({market, faction, type, goods = "", rate = MK.TAX_RATES[0]} = {}) {
  if ( !isActiveGM() ) return null;
  const st = Markets.state(), vs = views(st), v = vs.find(x => x.id === faction), m = MK.marketById(st, market);
  if ( !v || !m ) return null;
  const mv = {type, market, faction, name: v.name, goods, rate: Number(rate), hand: true};
  const why = MV.can(v, type, m, vs, {goods}).why;
  const r = await carryOut(mv, st, vs);
  await Markets.saveState(r.state);
  if ( r.text ) await ChatMessage.create({speaker: {alias: "Markets"}, whisper: gmIds(),
    content: `<div class="wodx-card wst-markets wst-market-moves"><h3>A move on the market</h3><p>${esc(r.text)}</p>${why ? `<p class="wodx-quiet">By your word. Left to itself the faction could not: ${esc(why)}</p>` : ""}<p class="wodx-quiet">House rules.</p></div>`});
  if ( r.rumour ) await tell(r.rumour, market);
  Hooks.callAll("wodxMarketMove", {move: mv, market});
  return {...r, why};
}
export async function endMove(market, moveId) {
  if ( !isActiveGM() ) return;
  await Markets.saveState(MV.dropMove(Markets.state(), market, moveId));
}

export function registerApproval() {
  // Small (B2453): a move the Auto mode would have made itself; a shop shutting or a move near a character waits
  chron()?.registerApprovalHandler?.(TYPE, {label: "Markets", small: entry => !!entry.data?.move && !entry.data.move.queue && !entry.data?.shut, approve: async entry => {
    const sh = entry.data?.shut;
    if ( sh ) {
      const cur = Markets.state(), t = MK.marketById(cur, sh.market)?.traders.find(x => x.actor === sh.actor);
      if ( !t || t.shut ) return;
      Object.assign(t, {shut: true, shutWeeks: 0, behind: MV.BROKE_AT});
      await Markets.saveState(cur);
      Hooks.callAll("wodxTraderBroke", {market: sh.market, actor: sh.actor});
      await tell(`${game.actors.get(sh.actor)?.name ?? "A trader"} has shut up shop in ${MK.marketById(cur, sh.market)?.name ?? "the market"}.`, sh.market);
      return;
    }
    const mv = entry.data?.move;
    if ( !mv ) return;
    const st = Markets.state(), vs = views(st);
    const r = await carryOut(mv, st, vs);
    await Markets.saveState(r.state);
    if ( r.text ) await ChatMessage.create({speaker: {alias: "Markets"}, whisper: gmIds(), content: `<div class="wodx-card wst-markets wst-market-moves"><h3>A move on the market</h3><p>${esc(r.text)}</p><p class="wodx-quiet">House rules.</p></div>`});
    if ( r.rumour ) await tell(r.rumour, mv.market);
    Hooks.callAll("wodxMarketMove", {move: mv, market: mv.market});
  }});
}

export async function setupMoves() {
  try { KINDS = (await import("../../wodx-library/data/goods.mjs")).KINDS ?? {}; } catch (e) { KINDS = {}; }
  registerApproval();
  Hooks.on("renderChatMessageHTML", (message, el) => {
    const html = el?.[0] ?? el;
    const f = message.flags?.[MOD]?.marketMoves;
    const b = f && html?.querySelector?.("[data-action=wst-moves-undo]");
    if ( !b ) return;
    if ( !game.user.isGM ) { b.remove(); return; }
    b.disabled = !f.applied;
    b.addEventListener("click", () => { b.disabled = true; undo(message).catch(e => console.error(`${MOD} |`, e)); });
  });
}

export const api = () => ({views, set: setMove, end: endMove, after, before, undo, words, rules: MV});
