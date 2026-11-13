/**
 * WoDX Storyteller 0.60.0: putting money into a venture (B2740-B2743). Pure rules, no Foundry.
 *
 * A character (or an NPC) puts money into a caravan, a workshop or a trading house on a market. Each weekly market
 * turn the venture pays a share of what it earns into the purse, or loses part of its value: a lost caravan, a glut,
 * a raid, a trader going broke, or a bad week. What a venture is called, how much it earns and how hard it is to get
 * the money out again follow the year and the part of the world its market stands in (Chronicle's ways of life).
 *
 * Backgrounds (V20 Backgrounds, Resources and Influence; V20 Dark Ages pp. 181-182 for the allowance): Resources sets
 * the most a character can put in at once (a year's allowance) and how many ventures they can hold together with
 * Influence; Influence softens a loss (a word in the right ear). Owning a stake never adds a dot by itself.
 * A stake of sixty months of a plain wage or more is large: it shows in the Markets window, a faction with a trade hold
 * on that market takes note of it as a rival, and after eight weeks a holder with Influence may be offered a seat.
 * Everything here is a house rule; the books give no venture rules.
 */
import {allowance, wageAt} from "./money-rules.mjs";

export const STATE_VERSION = 1;
export const KINDS = ["caravan", "workshop", "house"];
export const KIND_LABEL = {caravan: "A caravan", workshop: "A workshop", house: "A trading house"};
export const LOG_CAP = 12;
export const LIST_CAP = 200;
export const WEEK_CAP = 52;
/** Each week a venture earns this share of its value at normal trade, before the age. */
export const BASE = {caravan: 0.006, workshop: 0.003, house: 0.004};
/** A bad week takes this share of the value, before Influence. */
export const BAD_SHARE = {caravan: 0.25, workshop: 0.15, house: 0.2};
/** A caravan of the venture's market lost on the road, a raid on its market, its trader going broke. */
export const LOSS = {caravanLost: 0.3, raid: 0.1, traderBroke: 0.6};
/** A stake this many months of a plain wage or more is large. */
export const LARGE_WAGES = 60;
export const SEAT_WEEKS = 8;
/** Below this share of what was put in, the venture is gone. */
export const GONE_AT = 0.05;

/* ------------------------------------------------------------------ */
/*  The ages and the ways of the world                                  */
/* ------------------------------------------------------------------ */

export const AGES = ["medieval", "renaissance", "early-modern", "industrial", "modern", "future"];
export function ageOf(year, {future = false} = {}) {
  if ( future ) return "future";
  const y = Number(year) || 0;
  return y < 1450 ? "medieval" : y < 1600 ? "renaissance" : y < 1800 ? "early-modern" : y < 1946 ? "industrial" : "modern";
}
/** How much a venture earns, by age: high and risky early, steady and thin later. */
export const AGE_RETURN = {medieval: 1, renaissance: 0.85, "early-modern": 0.7, industrial: 0.5, modern: 0.35, future: 0.4};
/** Chance a week goes badly, by kind and age. */
export const RISK = {
  caravan: {medieval: 0.03, renaissance: 0.025, "early-modern": 0.02, industrial: 0.008, modern: 0.004, future: 0.006},
  workshop: {medieval: 0.008, renaissance: 0.007, "early-modern": 0.006, industrial: 0.004, modern: 0.002, future: 0.003},
  house: {medieval: 0.01, renaissance: 0.009, "early-modern": 0.008, industrial: 0.006, modern: 0.003, future: 0.005}
};
/** What it costs to get money out before its time: a share in a voyage is hard to sell, a modern share is not. */
export const EXIT_CUT = {medieval: 0.25, renaissance: 0.15, "early-modern": 0.1, industrial: 0.04, modern: 0.02, future: 0.01};

const W = (stake, caravan, workshop, house, seat) => ({stake, caravan, workshop, house, seat});
/** Later ages, the whole world: exchanges, companies and boards. */
const LATER = {
  industrial: W("stocks and bonds on the exchange", "a railway or a shipping line", "a mill or a factory", "a trading firm", "a seat on the board"),
  modern: W("shares and funds", "a haulage or freight line", "a factory", "a company", "a seat on the board"),
  future: W("a shell company or a crypto fund", "a drone and freight network", "an automated plant", "a corporation", "a voice on the board through proxies")
};
const ANY = W("a share in a trading venture", "a trading journey", "a workshop", "a trading house", "a voice among the traders");
/** Earlier ages by way of life (Chronicle's spheres). Bands: [from year, words]; the last band that has begun counts. */
export const FORMS = {
  latin: [[-9999, W("a commenda share", "a pack train or a ship's voyage", "a guild workshop", "a merchant house", "a seat on the guild council")],
    [1450, W("a share in a merchant company", "a ship's voyage or a wagon train", "a workshop", "a merchant company with factors abroad", "a seat among the company's partners")],
    [1600, W("shares in a joint-stock company", "a merchant ship or a carrier's wagons", "a manufactory", "a trading company", "a seat on the company's court of directors")]],
  orthodox: [[-9999, W("a share in a merchant's venture", "a river convoy or a sledge train", "a workshop", "a merchant house", "a place in the merchants' hundred")],
    [1600, W("a share in a merchant company", "a river convoy or a carrier's wagons", "a manufactory", "a merchant company", "a seat among the guild's first merchants")]],
  islamic: [[-9999, W("a qirad partnership", "a caravan or a dhow's voyage", "a workshop in the suq", "a merchant house at the khan", "a voice among the merchants of the suq")]],
  indic: [[-9999, W("a share with a banking house on hundi credit", "a banjara pack train or a ship's voyage", "a weavers' workshop", "a banking house", "a voice in the merchants' assembly")]],
  sinic: [[-9999, W("a partnership share", "a junk's voyage or a mule train", "a workshop", "a merchant house", "a voice in the merchant guild")],
    [1450, W("a partnership share", "a junk's voyage or a mule train", "a workshop", "a merchant house with its guildhall", "a voice in the merchants' guildhall")]],
  japanese: [[-9999, W("a stake with a za guild", "a coastal ship or a packhorse train", "a za workshop", "a merchant house", "a place in the za")],
    [1600, W("a stake with a licensed merchant house", "a coastal freighter or a packhorse train", "a workshop", "a merchant house of the licensed guild", "a place in the licensed guild")]],
  malay: [[-9999, W("a share in a junk or a prahu's voyage", "a prahu's voyage", "a workshop", "a merchant house by the harbour", "a voice with the harbour master")]],
  sahel: [[-9999, W("a share in a caravan", "a camel caravan across the desert", "a workshop", "a merchant family's house", "a voice among the merchant families")]],
  swahili: [[-9999, W("a share in a dhow's voyage", "a dhow on the monsoon", "a workshop", "a merchant family's house", "a voice among the merchant families")]],
  mesoamerican: [[-9999, W("a stake with the long-distance traders", "a porters' train", "a workshop", "a traders' house", "a place among the long-distance traders")]]
};
/** The words for a venture of a year, in a way of life. */
export function formFor(year, sphere = "latin", {future = false} = {}) {
  const age = ageOf(year, {future});
  if ( LATER[age] ) {
    // Japan's great family firms take the board seat between the Restoration and the war's end
    if ( sphere === "japanese" && age === "industrial" && Number(year) >= 1868 ) return {...LATER.industrial, seat: "a seat on the board of a great family firm", age};
    if ( age === "industrial" && sphere !== "latin" && FORMS[sphere] && Number(year) < 1850 ) {
      // Before mid-century most of the world still trades the older way
      return {...pick(FORMS[sphere], year), age};
    }
    return {...LATER[age], age};
  }
  return {...(pick(FORMS[sphere] ?? null, year) ?? ANY), age};
}
function pick(rows, year) {
  if ( !rows ) return null;
  let out = rows[0][1];
  for ( const [from, w] of rows ) if ( (Number(year) || 0) >= from ) out = w;
  return out;
}
/** "A trading house: a merchant house at the khan, a qirad partnership". */
export const kindWords = (kind, form) => form?.[kind] ?? KIND_LABEL[kind] ?? kind;

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round2 = v => Math.round(v * 100) / 100;
export const blankState = () => ({v: STATE_VERSION, list: []});
export function normVenture(v = {}) {
  const kind = KINDS.includes(v.kind) ? v.kind : "house";
  const state = ["open", "closed", "lost"].includes(v.state) ? v.state : "open";
  return {id: String(v.id || ""), actor: String(v.actor ?? ""), name: String(v.name ?? "Someone").slice(0, 80), market: String(v.market ?? ""),
    kind, goods: String(v.goods ?? ""), trader: v.trader ? String(v.trader) : "", put: Math.max(0, Math.round(num(v.put))), value: Math.max(0, Math.round(num(v.value))),
    paid: Math.max(0, Math.round(num(v.paid))), since: num(v.since), weeks: Math.max(0, Math.floor(num(v.weeks))), state,
    seat: v.seat === true ? true : v.seat === "offered" ? "offered" : false, rival: v.rival ? String(v.rival).slice(0, 120) : null,
    form: v.form && typeof v.form === "object" ? {stake: String(v.form.stake ?? ""), kind: String(v.form.kind ?? ""), seat: String(v.form.seat ?? "")} : null,
    log: (Array.isArray(v.log) ? v.log : []).slice(-LOG_CAP).map(l => ({t: num(l?.t), text: String(l?.text ?? "").slice(0, 300)}))};
}
export function normState(s) {
  const out = blankState();
  const seen = new Set();
  for ( const v of (s?.list ?? []) ) {
    const n = normVenture(v);
    if ( !n.id || seen.has(n.id) || !n.actor ) continue;
    seen.add(n.id); out.list.push(n);
  }
  // Closed and lost ventures go first when the list is full
  if ( out.list.length > LIST_CAP ) {
    const shut = out.list.filter(v => v.state !== "open");
    const drop = new Set(shut.slice(0, out.list.length - LIST_CAP).map(v => v.id));
    out.list = out.list.filter(v => !drop.has(v.id)).slice(-LIST_CAP);
  }
  return out;
}
export const openOf = (state, actor = null) => (state?.list ?? []).filter(v => v.state === "open" && (!actor || v.actor === actor));
export const stakesIn = (state, marketId) => openOf(state).filter(v => v.market === marketId);
const note = (v, t, text) => { v.log = [...v.log, {t, text}].slice(-LOG_CAP); };

/* ------------------------------------------------------------------ */
/*  Backgrounds                                                        */
/* ------------------------------------------------------------------ */

/** The most a character can put in at once: a year's allowance by Resources, a month's wage with none. */
export function mostAtOnce(dots, year, region = "moravian") {
  const d = Math.round(num(dots));
  return d > 0 ? 12 * allowance(d, year, region) : wageAt(year, region);
}
/** How many ventures a character can hold: Resources plus Influence, one at least. */
export const mostVentures = (resources = 0, influence = 0) => Math.max(1, Math.round(num(resources)) + Math.round(num(influence)));
/** What is left of a loss after Influence and a seat: a tenth less a dot, half at most. */
export const shield = (influence = 0, seat = false) => clamp(1 - 0.1 * Math.max(0, num(influence)) - (seat === true ? 0.1 : 0), 0.5, 1);
export const isLarge = (v, year, region = "moravian") => (v?.value ?? 0) >= LARGE_WAGES * wageAt(year, region);

/**
 * Can this character put this much in? {ok, why}. have: what the purse can pay (carried + bank). held: open ventures.
 */
export function canPut({amount = 0, have = 0, resources = 0, influence = 0, held = 0, year = 1197, region = "moravian"} = {}) {
  const a = Math.round(num(amount));
  if ( a <= 0 ) return {ok: false, why: "Put in a sum of money."};
  if ( a > have ) return {ok: false, why: "The purse does not hold that much."};
  const most = mostAtOnce(resources, year, region);
  if ( a > most ) return {ok: false, why: "That is more than this character's Resources can raise at once (a year's allowance).", most};
  if ( held >= mostVentures(resources, influence) ) return {ok: false, why: "This character already holds as many ventures as Resources and Influence allow."};
  return {ok: true, most};
}

/** A new venture. */
export function openVenture({id, actor, name = "", market, kind = "house", goods = "", trader = "", amount = 0, now = 0, year = 1197, sphere = "latin", future = false} = {}) {
  const f = formFor(year, sphere, {future});
  const v = normVenture({id, actor, name, market, kind, goods, trader, put: amount, value: amount, since: now, form: {stake: f.stake, kind: kindWords(kind, f), seat: f.seat}});
  note(v, now, `Put in ${Math.round(num(amount))} as ${f.stake} in ${kindWords(kind, f)}.`);
  return v;
}
/** Add to a venture. */
export function addTo(v, amount, now = 0) {
  const n = normVenture(v), a = Math.max(0, Math.round(num(amount)));
  n.put += a; n.value += a; note(n, now, `Put in ${a} more.`);
  return n;
}
/** Take money out: what comes back after the age's cut. all closes it. Returns {venture, back, cut}. */
export function takeOut(v, amount, {year = 1197, future = false, all = false, now = 0} = {}) {
  const n = normVenture(v);
  const out = all ? n.value : Math.min(n.value, Math.max(0, Math.round(num(amount))));
  const cut = Math.round(out * EXIT_CUT[ageOf(year, {future})]);
  n.value -= out;
  if ( all || n.value <= 0 ) n.state = "closed";
  note(n, now, `Took out ${out - cut}${cut ? ` (${cut} lost in the selling)` : ""}${n.state === "closed" ? "; the venture is closed" : ""}.`);
  return {venture: n, back: out - cut, cut};
}

/* ------------------------------------------------------------------ */
/*  The week                                                           */
/* ------------------------------------------------------------------ */

/**
 * How trade on the market treats a venture this week: {factor, why: []}. market: the markets state's record, with
 * supply and index by kind of goods; tax and squeeze from the faction moves; closed: every road out is shut or the
 * market is cut off; shut: the venture's trader has shut up shop.
 */
export function tradeOf(v, {supply = "normal", index = 1, tax = 0, monopoly = false, closed = false, shut = false} = {}) {
  const why = [];
  if ( v.kind === "caravan" && closed ) return {factor: 0, why: ["the roads are closed"]};
  if ( v.kind === "house" && shut ) return {factor: 0, why: ["the shop is shut"]};
  let f = 1;
  if ( v.goods ) {
    if ( supply === "plenty" ) { f *= 0.5; why.push("a glut"); }
    else if ( supply === "none" ) { f *= 0.3; why.push("nothing to sell"); }
    else if ( supply === "short" ) { f *= 1.2; why.push("goods in short supply sell dear"); }
    const i = clamp(num(index) || 1, 0.5, 2);
    if ( Math.abs(i - 1) >= 0.1 ) { f *= Math.sqrt(i); why.push(i > 1 ? "high prices" : "low prices"); }
  }
  if ( tax > 0 ) { f *= 1 - clamp(tax, 0, 0.9); why.push("taxes"); }
  if ( monopoly ) { f *= 0.85; why.push("a faction's monopoly"); }
  return {factor: round2(f), why};
}

/**
 * One week for one open venture. trade: from tradeOf. rand: a 0-1 source. caravansOn: with caravans running, a
 * caravan venture's losses come from the real caravans, not from a bad-week roll.
 * Returns {venture, payout, lost, line}.
 */
export function week(v, {trade = {factor: 1, why: []}, year = 1197, future = false, influence = 0, rand = Math.random, caravansOn = true, now = 0} = {}) {
  const n = normVenture(v);
  if ( n.state !== "open" ) return {venture: n, payout: 0, lost: 0, line: ""};
  const age = ageOf(year, {future});
  n.weeks += 1;
  let lost = 0;
  const risky = !(n.kind === "caravan" && caravansOn);
  if ( risky && rand() < RISK[n.kind][age] ) {
    lost = Math.round(n.value * BAD_SHARE[n.kind] * shield(influence, n.seat));
    n.value -= lost;
  }
  const rate = BASE[n.kind] * AGE_RETURN[age] * (n.seat === true ? 1.1 : 1);
  const payout = lost ? 0 : Math.max(0, Math.round(n.value * rate * (trade.factor ?? 1)));
  n.paid += payout;
  const gone = n.value < GONE_AT * Math.max(1, n.put);
  if ( gone ) n.state = "lost";
  const why = trade.why?.length ? ` (${trade.why.join(", ")})` : "";
  const line = lost ? `${badWords(n.kind, age)}: lost ${lost}${gone ? "; nothing is left of it" : ""}.`
    : payout ? `paid ${payout}${why}.` : `paid nothing this week${why}.`;
  if ( lost || gone ) note(n, now, line);
  return {venture: n, payout, lost, line};
}
const BAD = {
  caravan: {medieval: "Bandits or a storm took part of the goods", renaissance: "A ship was lost or a wagon train robbed", "early-modern": "A cargo was lost at sea",
    industrial: "A wreck or a derailment", modern: "A lorry hijacked or a container lost", future: "A shipment hacked and rerouted"},
  workshop: {medieval: "A fire in the workshop", renaissance: "A fire in the workshop", "early-modern": "A fire or a broken wheel", industrial: "A boiler burst",
    modern: "A strike or a breakdown", future: "A plant crash"},
  house: {medieval: "A debtor fled", renaissance: "A factor abroad defaulted", "early-modern": "A partner's bills came back unpaid", industrial: "A panic on the exchange",
    modern: "A market crash", future: "A fund collapse"}
};
export const badWords = (kind, age) => BAD[kind]?.[age] ?? "A bad week";

/** A loss from something that happened on the market (a lost caravan, a raid, a trader gone broke). */
export function hit(v, type, {influence = 0, now = 0, text = ""} = {}) {
  const n = normVenture(v);
  if ( n.state !== "open" || !LOSS[type] ) return {venture: n, lost: 0};
  const lost = Math.round(n.value * LOSS[type] * shield(influence, n.seat));
  n.value -= lost;
  if ( n.value < GONE_AT * Math.max(1, n.put) ) n.state = "lost";
  note(n, now, `${text || type}: lost ${lost}${n.state === "lost" ? "; nothing is left of it" : ""}.`);
  return {venture: n, lost};
}
/** Which open ventures a happening touches. */
export function touched(state, type, {market = "", from = "", to = "", trader = ""} = {}) {
  return openOf(state).filter(v => {
    if ( type === "caravanLost" ) return v.kind === "caravan" && (v.market === from || v.market === to);
    if ( type === "raid" ) return v.market === market && v.kind !== "caravan";
    if ( type === "traderBroke" ) return v.kind === "house" && v.market === market && (!v.trader || v.trader === trader) && !!v.trader;
    return false;
  });
}

/**
 * A large stake draws notice: a rival faction (trade hold on the market, not the holder's own) and, after eight weeks
 * with Influence, a seat offered. views: the faction views (market-moves-rules viewOf). Returns {rival, seat}.
 */
export function notice(v, {views = [], year = 1197, region = "moravian", influence = 0} = {}) {
  const out = {rival: null, seat: false};
  if ( v.state !== "open" || !isLarge(v, year, region) ) return out;
  if ( !v.rival ) {
    const r = views.filter(f => !f.idle && (f.home ?? []).includes(v.market) && (f.trade ?? 0) >= 2 && !(f.members ?? []).includes(v.actor))
      .sort((a, b) => (b.trade - a.trade) || String(a.name).localeCompare(String(b.name)))[0];
    if ( r ) out.rival = r.name;
  }
  if ( v.seat === false && v.weeks >= SEAT_WEEKS && num(influence) >= 1 ) out.seat = true;
  return out;
}

/** One line for a venture: "Ilse: a commenda share in a merchant house (Brno), worth 120". */
export function describe(v, {marketName = "", money = x => String(x)} = {}) {
  const f = v.form ?? {};
  return `${v.name}: ${f.stake || "a share"} in ${f.kind || KIND_LABEL[v.kind].toLowerCase()}${marketName ? ` (${marketName})` : ""}, worth ${money(v.value)}`;
}
