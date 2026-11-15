/**
 * Market goods by region (B5930 to B5936, the Market Goods Desk, built at its recommended picks). Pure rules.
 *
 * WoDX Library says where each everyday good is at home (goods-ways.mjs: a region id, a way of life, or "*"). Here
 * that makes a price: a good brought from far off costs more, the land's own goods cost less, and each way of life
 * has a few kinds of goods it has cheap and a few it pays dear for. Every number is a house rule; the books give none.
 */
import {partOf} from "../../wodx-chronicle/scripts/events-rules.mjs";

/** B5930: an import from the same part of the world, and from another part. */
export const IMPORT = {near: 2, far: 3};
/** B5931: the land's own goods. */
export const OWN = 0.75;
/** The part of the world each way of life (WoDX Chronicle sphereFor) belongs to, for "near" and "far". */
export const WAY_PART = {latin: "EU", orthodox: "EU", islamic: "ME", indic: "AS", sinic: "AS", japanese: "AS", theravada: "AS", tibetan: "AS",
  malay: "AS", sahel: "AF", swahili: "AF", bantu: "AF", mesoamerican: "AM", andean: "AM", polynesian: "OC", northern: "AM"};
const partOfKey = k => WAY_PART[k] ?? (k === "*" ? null : partOf(k));
/** A Moravian market is in Europe for this purpose. */
const near = (a, b) => a === b || (["MO", "EU"].includes(a) && ["MO", "EU"].includes(b));

/** Does one rule of a good's WAYS entry let it be found in this year? (null, a year, [from, to], false) */
function ruleOpen(rule, good, year) {
  const y = Number(year), to = Number(good?.to ?? 9999);
  if ( rule === false ) return false;
  if ( Array.isArray(rule) ) return y >= rule[0] && y <= Math.min(rule[1], to);
  const from = rule === null || rule === undefined ? Number(good?.from ?? -9999) : Number(rule);
  return y >= from && y <= to;
}

/**
 * Where a good stands in this market: {factor, why}. why: "own" (the land's own good, B5931), "near" or "far" (an import,
 * B5930), or null. inUse(good, year): is it at home here (Library inUseAt with this land's way and region).
 * here: {region, way, part}. Goods found everywhere, coins and goods out of their time keep their price.
 */
export function placeOf(good, year, inUse, here = {}) {
  const ways = good?.ways;
  if ( !ways || good.kind === "coin" || typeof inUse !== "function" ) return {factor: 1, why: null};
  if ( inUse(good, year) ) {
    const own = [here.region, here.way].some(k => k && k in ways && ways[k] !== false);
    return own ? {factor: OWN, why: "own"} : {factor: 1, why: null};
  }
  const homes = Object.entries(ways).filter(([k, r]) => k !== "*" && ruleOpen(r, good, year)).map(([k]) => partOfKey(k)).filter(Boolean);
  if ( !homes.length ) return {factor: 1, why: null};
  const part = here.part ?? partOfKey(here.region ?? "") ?? partOfKey(here.way ?? "");
  return homes.some(p => near(p, part)) ? {factor: IMPORT.near, why: "near"} : {factor: IMPORT.far, why: "far"};
}

/** B5935: the words a price carries. */
export const WHY_WORDS = {own: "the land's own", near: "brought from nearby lands", far: "brought from far off"};

/**
 * B5932: each way of life's trade, the kinds of goods it has cheap and the kinds it pays dear for. A house reading
 * of history, rounded for play: silk and paper in China, cloth in India, furs and timber in the north, salt dear in the
 * Sahel (food), iron dear where it was rare.
 */
export const CHEAP = 0.85, DEAR = 1.25;
export const LAND_TRADE = {
  latin: {cheap: ["drink", "tools"], dear: ["valuables"]},
  orthodox: {cheap: ["fuel", "materials"], dear: ["cloth"]},
  islamic: {cheap: ["cloth", "hygiene", "papers"], dear: ["fuel", "materials"]},
  indic: {cheap: ["cloth", "food", "hygiene"], dear: ["arms"]},
  sinic: {cheap: ["papers", "kitchen", "cloth"], dear: ["valuables"]},
  japanese: {cheap: ["papers", "kitchen"], dear: ["materials"]},
  theravada: {cheap: ["food", "faith"], dear: ["tools"]},
  tibetan: {cheap: ["faith"], dear: ["food", "fuel"]},
  malay: {cheap: ["food", "drugs"], dear: ["cloth"]},
  sahel: {cheap: ["valuables"], dear: ["food"]},
  swahili: {cheap: ["valuables", "materials"], dear: ["cloth"]},
  bantu: {cheap: ["materials", "tools"], dear: ["cloth"]},
  mesoamerican: {cheap: ["food", "drink"], dear: ["tools"]},
  andean: {cheap: ["cloth", "food"], dear: ["tools"]},
  polynesian: {cheap: ["food"], dear: ["tools", "materials"]},
  northern: {cheap: ["fuel", "materials"], dear: ["food", "cloth"]}
};
/** The world trades everything from 1900; by 2000 the land's trade no longer shows in prices. */
export const FADE = [1900, 2000];
export function landTrade(kind, way, year) {
  const t = LAND_TRADE[way];
  if ( !t || !kind ) return 1;
  const m = t.cheap.includes(kind) ? CHEAP : t.dear.includes(kind) ? DEAR : 1;
  if ( m === 1 ) return 1;
  const y = Number(year) || 0;
  const share = y <= FADE[0] ? 1 : y >= FADE[1] ? 0 : (FADE[1] - y) / (FADE[1] - FADE[0]);
  return Math.round((1 + (m - 1) * share) * 100) / 100;
}
/** A way of life's trade in words for the market window: {cheap: [kinds], dear: [kinds]}, or null. */
export const tradeOf = (way, year) => {
  const t = LAND_TRADE[way];
  if ( !t || Number(year) >= FADE[1] ) return null;
  return t;
};

/**
 * B5933: up to two real goods of a land for a kind of goods, for a caravan's load. goods: Library GOODS; inUse as for
 * placeOf. The land's own goods first, then any found there, picked by a seed so the same caravan always names the same.
 */
export function namedGoods(kind, goods = [], year, inUse, here = {}, seed = "") {
  if ( typeof inUse !== "function" ) return [];
  const pool = goods.filter(g => g.kind === kind && g.kind !== "coin" && inUse(g, year));
  const own = pool.filter(g => g.ways && [here.region, here.way].some(k => k && k in g.ways && g.ways[k] !== false));
  const pick = (list, n) => {
    let h = 0;
    for ( const c of `${seed}|${kind}` ) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const out = [];
    for ( let i = 0; i < list.length && out.length < n; i++ ) {
      const g = list[(h + i) % list.length];
      if ( !out.includes(g) ) out.push(g);
    }
    return out;
  };
  const first = pick(own, 2);
  const rest = first.length < 2 ? pick(pool.filter(g => !first.includes(g)), 2 - first.length) : [];
  return [...first, ...rest].map(g => g.name.replace(/^(a|an|some) /, ""));
}
