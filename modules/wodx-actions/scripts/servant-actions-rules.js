/**
 * WoDX Actions (Servants and Bonds Desk, B5112-B5119): the pure rules behind the servant actions, so the harness can test them.
 *   Enchantment (C20 Appendix II, pdf p. 461): Glamour poured into a mortal, a point gone a day; the Parted Mists last.
 *   Oaths that cost (C20 pdf pp. 204-205, the oath list pp. 265-267): attacking someone an oath binds you to breaks it.
 *   Pacts (Demon: The Fallen pp. 251-253): Faith potential, the gifts the potential buys, the difficulty to use each.
 *   Names (Demon: The Fallen pp. 132, 171-176): the difficulty an evocation reaches by, read from its own card.
 *   Puppeteers (Wraith 20th): riding the same mortal again and again makes them a consort (house reading: from the third
 *   ride, one easier).
 * Nothing here copies book text.
 */
import {DAY} from "../../wodx-chronicle/scripts/terms.mjs";
export {DAY};
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const low = s => String(s ?? "").trim().toLowerCase();

export const dayOf = t => Math.floor(n(t) / DAY);

/* -- Enchantment -------------------------------------------------- */
/** What is left of a temporary Enchantment: the Glamour poured in, less a point a day since. A lasting one never runs down. */
export function enchantLeft({glamour = 0, day = 0, lasting = false} = {}, today = 0) {
  if ( lasting ) return {glamour: Math.max(1, n(glamour)), ended: false};
  const left = Math.max(0, n(glamour) - Math.max(0, n(today) - n(day)));
  return {glamour: left, ended: left <= 0};
}
/** The step on the one ledger: a lasting Enchantment is the deepest. */
export const enchantStep = ({glamour = 0, lasting = false} = {}) => lasting ? 3 : n(glamour) >= 3 ? 2 : 1;
/** The Parted Mists: every changeling taking part gives Glamour; the book sets no total, so the Storyteller approves it. */
export function partedMists(givers = []) {
  const list = givers.filter(g => n(g.glamour) > 0);
  return {ok: list.length >= 2, total: list.reduce((s, g) => s + n(g.glamour), 0), why: list.length >= 2 ? "" : "the Parted Mists take more than one changeling"};
}

/* -- Oaths that cost ---------------------------------------------- */
/** Oaths an attack on one of the others bound breaks: loyalty, fealty, brotherhood, love and guardianship. */
export const HARM_OATHS = new Set(["clasped", "fealty", "crossedBlades", "trueHearts", "guardianship"]);
/** The first unbroken oath that an attack on this target breaks, as its index in the list, or -1. */
export function oathHarmed(oaths = [], targetName = "") {
  const t = low(targetName);
  if ( !t ) return -1;
  return oaths.findIndex(o => o && !o.broken && HARM_OATHS.has(o.kind) && (o.parties ?? []).some(p => low(p) === t));
}

/* -- Pacts -------------------------------------------------------- */
/** A first guess at a mortal's Faith potential, for the Storyteller to change: True Faith counts, else most people are 2. */
export function potentialGuess({trueFaith = 0, set = null} = {}) {
  if ( set !== null && set !== undefined && set !== "" ) return clamp(n(set), 0, 5);
  return n(trueFaith) > 0 ? clamp(2 + n(trueFaith), 0, 5) : 2;
}
/** The difficulty a thrall rolls Willpower at to use a gift (Demon: The Fallen p. 253). Null for gifts with no roll. */
export const GIFT_DIFF = {innate: 7, enhancement: 6, evocation: 8};
/** What a pact puts on the thrall's sheet, as items. Each item knows its gift, its roll and what it cost. */
export function giftItems(picks = [], {demon = "the demon", demonId = ""} = {}) {
  const LABEL = {heal: "A healed body", freebies: "Ten freebie points", innate: "A demon's innate power", enhancement: "An apocalyptic enhancement", evocation: "A lesser evocation", offering: "A daily Faith offering"};
  return picks.filter(p => LABEL[p.k]).map(p => ({
    name: `Pact gift: ${p.name || LABEL[p.k]}`,
    type: "Feature",
    img: "icons/magic/symbols/runes-star-pentagon-orange.webp",
    system: {type: "wod.types.merit", description: `<p>${LABEL[p.k]}, a gift of ${demon}'s pact${GIFT_DIFF[p.k] ? `: Willpower at ${GIFT_DIFF[p.k]} to use it` : ""}${p.k === "evocation" ? `, level ${clamp(n(p.level), 1, 5)}` : ""}.</p><p><em>Demon: The Fallen p. 253</em></p>`},
    flags: {"wodx-actions": {pactGift: {k: p.k, demonId, level: p.k === "evocation" ? clamp(n(p.level), 1, 5) : 0, points: p.k === "offering" ? n(p.points) : 0, diff: GIFT_DIFF[p.k] ?? 0, demon}}}
  }));
}
/** A thrall entry on the demon, linked to the mortal's actor. */
export function thrallEntry({name, actorId, potential, offered = 0, willpower = 3, terms = "", gifts = []}) {
  const cap = Math.ceil(clamp(n(potential), 0, 5) / 2);
  return {name, actorId, potential: clamp(n(potential), 0, 5), offered: clamp(n(offered), 0, cap), willpower: n(willpower), terms: String(terms ?? "").slice(0, 300), gifts: gifts.map(g => g.k), broken: false};
}
/** Old typed thralls become linked people where a name matches one actor exactly. Returns the list with actorId set. */
export function linkThralls(thralls = [], actors = []) {
  return thralls.map(t => {
    if ( t.actorId ) return t;
    const hits = actors.filter(a => low(a.name) === low(t.name));
    return hits.length === 1 ? {...t, actorId: hits[0].id} : t;
  });
}

/* -- Names -------------------------------------------------------- */
const NUM = "(\\d{1,2})";
/** The difficulties an evocation's own card gives for reaching by a mundane name, the Celestial Name, the True Name or a thrall. */
export function nameDifficulties(text = "") {
  const s = String(text);
  if ( !/True Name/i.test(s) ) return null;
  const pick = (word) => {
    const after = new RegExp(`${word}[^,;.)\\d]*?${NUM}`, "i").exec(s);
    if ( after ) return n(after[1]);
    const before = new RegExp(`${NUM}\\s+${word}`, "i").exec(s);
    return before ? n(before[1]) : 0;
  };
  const out = {mundane: pick("mundane"), celestial: pick("Celestial"), true: pick("True Name"), thrall: pick("own thrall")};
  return out.true ? out : null;
}
/** A name known: {demonId, demonName, kind: "celestial" | "true", at}. The best a character holds for one demon. */
export function bestName(names = [], demonId) {
  const mine = names.filter(x => x.demonId === demonId);
  return mine.find(x => x.kind === "true") ?? mine.find(x => x.kind === "celestial") ?? null;
}
/** Pressing a demon by its True Name (house reading): Willpower against the demon's Willpower, both at 6. */
export const pressResult = (mine, theirs) => n(mine) > n(theirs) ? "yields" : n(mine) === n(theirs) ? "holds" : "refuses";

/* -- Puppeteers --------------------------------------------------- */
export const CONSORT_AT = 3;
/** A ride counted: the rides so far, and whether the mortal is now the Puppeteer's consort. */
export function rideCount(prev = 0) {
  const rides = n(prev) + 1;
  return {rides, consort: rides >= CONSORT_AT, easier: rides > CONSORT_AT ? 1 : 0};
}

/* -- Wraith Thralls ----------------------------------------------- */
/** A Thrall's step: chained in Stygian steel, they cannot flee or refuse; unchained, they serve from fear. */
export const thrallStep = chained => chained ? 3 : 1;
