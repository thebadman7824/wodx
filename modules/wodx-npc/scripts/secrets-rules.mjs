/**
 * WoDX NPC 0.37.0: secrets and hooks, the pure part (B1903-B1905). No Foundry here, so the harness can test it.
 *
 * Any character or NPC can hold secrets: a diablerie, a childe made without leave, a tie to the other sect, a debt.
 * Each lives on the holder's world actor:
 *   flags["wodx-npc"].secrets = [{id, kind, text, weight, tie: {kind, id} | null, public, found: {<actor id>: {at, how, entry}}}]
 * Investigation, Auspex, spies or a clue can uncover one. Whoever finds it holds a hook: a major boon in WoDX
 * Storyteller's Ledger owed by the holder (entry = its id), spent like any boon, or used in the faction politics turn
 * to bring a charge that sticks. Which secrets a court cares about changes with the line and the age: heresy in 1197,
 * infernalism always, a Technocracy defection after 1897. The weights, methods and difficulties are house rules.
 */

/** Groups of polities (politics-rules.mjs keys). */
const KINDRED = ["dark-ages-court", "camarilla", "sabbat", "anarch"];
const MAGES = ["mage-fellowship", "tradition-chantry"];
const REASON = ["order-of-reason", "technocracy-construct"];
const HUNTERS = ["inquisition", "hunter-society", "imbued-cell"];
const FAE = ["fae-court", "commoner-freehold", "noble-fief"];

/**
 * The kinds of secret. cares: [{p: polity keys or "*", w: 0-2, from, to}] read in order, the first that fits wins
 * (w 2 grave, 1 it matters, 0 nobody there cares). law: the words of the charge it brings.
 */
export const SECRET_KINDS = {
  diablerie: {label: "Diablerie", law: "diablerie", cares: [{p: ["sabbat"], w: 0}, {p: ["anarch"], w: 1}, {p: KINDRED, w: 2}, {p: ["kuei-jin-court"], w: 1}]},
  childe: {label: "An Embrace made without leave", law: "Embracing without leave", cares: [{p: ["camarilla", "dark-ages-court"], w: 2}, {p: ["sabbat"], w: 1}]},
  sect: {label: "A tie to the other side", law: "dealings with the enemy", cares: [{p: ["camarilla"], w: 2, from: 1493}, {p: ["sabbat"], w: 2}, {p: ["anarch", "dark-ages-court"], w: 1},
    {p: ["garou-sept"], w: 2}, {p: [...MAGES, ...REASON], w: 2}, {p: HUNTERS, w: 2}, {p: FAE, w: 1}, {p: ["wraith-legion"], w: 2}]},
  masquerade: {label: "A breach of the Masquerade", law: "breaking the Masquerade", cares: [{p: ["camarilla"], w: 2}, {p: KINDRED, w: 1}]},
  infernal: {label: "Infernalism", law: "trafficking with the infernal", cares: [{p: ["fallen-congregation"], w: 0}, {p: "*", w: 2}]},
  heresy: {label: "Heresy", law: "heresy", cares: [{p: ["inquisition"], w: 2}, {p: "*", w: 1, to: 1650}, {p: ["hunter-society"], w: 1}]},
  defection: {label: "A defection kept quiet", law: "defection", cares: [{p: ["technocracy-construct"], w: 2, from: 1897}, {p: REASON, w: 2}, {p: MAGES, w: 2}]},
  wyrm: {label: "A taint of the Wyrm", law: "consorting with the Wyrm", cares: [{p: ["garou-sept"], w: 2}, {p: "*", w: 1}]},
  banality: {label: "Dealings with the Dauntain", law: "consorting with the Dauntain", cares: [{p: FAE, w: 2}]},
  renegade: {label: "A Renegade or Spectre tie", law: "dealings with Renegades", cares: [{p: ["wraith-legion"], w: 2}]},
  debt: {label: "A debt kept hidden", law: "a debt kept hidden", cares: [{p: "*", w: 1}]},
  crime: {label: "A crime", law: "a crime against the court", cares: [{p: "*", w: 1}]},
  other: {label: "Something else", law: "a hidden wrong", cares: [{p: "*", w: 1}]}
};
export const WEIGHTS = {1: "It matters", 2: "Grave"};

const id = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(n) || 0)));

/** A clean secret from anything the window or the API gives. */
export function normSecret(s = {}) {
  const kind = SECRET_KINDS[s.kind] ? s.kind : "other";
  const found = {};
  for ( const [k, v] of Object.entries(s.found ?? {}) ) if ( k && v && typeof v === "object" ) found[k] = {at: Number(v.at) || 0, how: String(v.how ?? "").slice(0, 120), entry: v.entry ?? null};
  return {id: s.id || id(), kind, text: String(s.text ?? "").trim().slice(0, 300), weight: clamp(s.weight ?? 1, 1, 2),
    tie: s.tie?.id ? {kind: String(s.tie.kind ?? "other"), id: String(s.tie.id)} : null, public: !!s.public, found};
}
export const secretsOf = flags => (Array.isArray(flags?.["wodx-npc"]?.secrets) ? flags["wodx-npc"].secrets.map(normSecret) : []);

/** How much a polity cares about a kind of secret in a year: 0, 1 or 2. No polity: how much anyone cares (its own weight). */
export function caresAbout(kind, {polity = null, year = null} = {}) {
  const K = SECRET_KINDS[kind] ?? SECRET_KINDS.other;
  const y = Number.isFinite(Number(year)) && year !== null ? Number(year) : null;
  for ( const c of K.cares ) {
    if ( c.p !== "*" && !(polity && c.p.includes(polity)) ) continue;
    if ( y !== null && ((c.from && y < c.from) || (c.to && y > c.to)) ) continue;
    return c.w;
  }
  return 0;
}

/** Who knows: the holder's owners, those who found it, everyone once public. */
export const knownBy = (s, charId) => !!s && (s.public || !!s.found?.[charId]);

/**
 * The ways to dig, each a roll the Storyteller can allow (house rules; the Telepathy pool and difficulty are V20's).
 * need: Auspex dots for telepathy, a Contacts or Spies background for spies.
 */
export const METHODS = {
  investigate: {label: "Investigation", pool: ["perception", "investigation"], diff: 7, time: "a night's digging"},
  telepathy: {label: "Auspex (Telepathy)", pool: ["intelligence", "subterfuge"], diff: "willpower", need: {auspex: 4}, time: "a turn of reading their thoughts"},
  spies: {label: "Spies or contacts", pool: ["manipulation", "streetwise"], diff: 7, need: {background: ["spies", "contacts"]}, time: "a week of asking"},
  aura: {label: "Auspex (Aura Perception)", pool: ["perception", "empathy"], diff: 8, need: {auspex: 2}, only: ["diablerie", "infernal", "wyrm"], time: "a turn of looking"}
};
/** Successes needed: one for a secret that matters, three for a grave one; telepathy and aura need one fewer. */
export const successesNeeded = (secret, method) => Math.max(1, (normSecret(secret).weight === 2 ? 3 : 1) - (method === "telepathy" || method === "aura" ? 1 : 0));

/** Which of the holder's secrets a method can reach: the unknown ones; aura only sees the marks the soul carries (diablerie veins, taint). */
export function reachable(secrets = [], method, charId) {
  const M = METHODS[method];
  return (secrets ?? []).map(normSecret).filter(s => !knownBy(s, charId) && (!M?.only || M.only.includes(s.kind)));
}

/** Roll d10s. Returns {dice, hits, ones, net, botch} (V20: each 1 cancels a success; no successes and a 1 is a botch). */
export function rollPool(n, diff, rand = Math.random) {
  const dice = Array.from({length: Math.max(0, Math.round(n) || 0)}, () => 1 + Math.floor(rand() * 10));
  const hits = dice.filter(d => d >= diff).length, ones = dice.filter(d => d === 1).length;
  return {dice, hits, ones, net: Math.max(0, hits - ones), botch: hits === 0 && ones > 0};
}

/**
 * Dig into one holder. secrets: theirs; pool: dice; diff: difficulty. The oldest reachable secret is the one found
 * when the roll makes enough successes. Returns {roll, secret, found, botch, need}.
 */
export function dig({secrets = [], method = "investigate", charId, pool = 0, diff = 7, rand = Math.random} = {}) {
  const open = reachable(secrets, method, charId);
  const roll = rollPool(pool, Math.max(2, Math.min(10, Number(diff) || 7)), rand);
  const target = open[0] ?? null;
  const need = target ? successesNeeded(target, method) : 1;
  return {roll, secret: target, found: !!target && roll.net >= need, botch: roll.botch, need};
}

/** The Ledger entry a found secret makes: a major boon owed by the holder to the finder. */
export function hookEntry(secret, holder, finder, at = 0) {
  const s = normSecret(secret);
  return {kind: "boon", size: "major", from: {id: holder.id, name: holder.name}, to: {id: finder.id, name: finder.name}, made: at,
    what: `Hook: ${finder.name} knows ${s.text || SECRET_KINDS[s.kind].label.toLowerCase()}`, notes: "A secret found. Spend it like a major boon, or bring it before the court."};
}

/** The secrets after one is found: who, when and how, and the Ledger entry it made. */
export function withFound(secrets = [], secretId, finderId, {at = 0, how = "", entry = null} = {}) {
  return (secrets ?? []).map(normSecret).map(s => s.id === secretId ? {...s, found: {...s.found, [finderId]: {at, how: String(how).slice(0, 120), entry}}} : s);
}

/** Find a secret by words (a clue's outcome): the first whose words or kind match. In: [{holder, secret}]. */
export function matchText(list = [], words = "") {
  const w = String(words ?? "").toLowerCase().replace(/[^\p{L}\p{N}' ]+/gu, " ").split(/\s+/).filter(x => x.length > 2);
  if ( !w.length ) return null;
  const score = s => { const t = `${s.text} ${SECRET_KINDS[s.kind]?.label ?? ""}`.toLowerCase(); return w.filter(x => t.includes(x)).length; };
  let best = null, top = 0;
  for ( const x of list ?? [] ) { const n = score(normSecret(x.secret)); if ( n > top ) { top = n; best = x; } }
  return top >= Math.min(2, w.length) ? best : null;
}

/**
 * For the faction politics turn: the hooks an NPC member holds on another member, best first.
 * hooks: [{holder, finder, secret}] (secrets already normalised); members: ids; polity and year say who cares.
 */
export function hooksFor(finder, hooks = [], members = [], {polity = null, year = null} = {}) {
  return (hooks ?? []).filter(h => h.finder === finder && members.includes(h.holder) && !h.secret.public)
    .map(h => ({...h, weight: caresAbout(h.secret.kind, {polity, year})})).filter(h => h.weight > 0)
    .sort((a, b) => b.weight - a.weight || b.secret.weight - a.secret.weight);
}
