/**
 * WoDX Otherworlds 0.14.0: standing with the spirit courts, the pure part. No Foundry calls here (B1320-B1324).
 *
 * The books give chiminage (what a spirit asks for a service), Bans (what a totem forbids) and spirits that remember
 * how they were treated, but no number for it. This is a house rule that keeps that memory as a number per court,
 * from -5 (scorned) to +5 (honoured), for any character who deals with spirits: Garou and the other Changing Breeds,
 * their Kinfolk, mages (Spirit, and the Dreamspeakers above all) and mortal shamans.
 *
 * Courts: Bird, Beast, Elemental, Wyld, Weaver, Wyrm, and the character's own totem (named on the record).
 * What moves standing (MOVES), and what standing does (effect): it changes the difficulty to summon a spirit of
 * that court, to have one teach a Gift, and to bind one into a fetish or talen; at -5 the court may refuse outright.
 * Stored on the actor: flags.wodx-otherworlds.spirits {standing: {<court>: n}, totem: name, log: [{at, court, by, why}]}.
 */

export const MIN = -5, MAX = 5;
export const COURTS = {
  bird: "Bird spirits", beast: "Beast spirits", elemental: "Elementals", wyld: "Wyld spirits", weaver: "Weaver spirits", wyrm: "Wyrm spirits", totem: "The totem"
};

/** What moves standing, and by how much (house rule). `courts`: which courts move; "chosen" is the one picked. */
export const MOVES = {
  paid: {label: "Chiminage paid", courts: {chosen: 1}},
  refused: {label: "Chiminage owed and not paid", courts: {chosen: -2}},
  bane: {label: "A Bane destroyed", courts: {wyld: 1, totem: 1, wyrm: -1}},
  bound: {label: "A spirit bound or slain against its will", courts: {chosen: -2}},
  banKept: {label: "The totem's Ban kept through a hard test", courts: {totem: 1}},
  banBroken: {label: "The totem's Ban broken", courts: {totem: -3}},
  favour: {label: "A favour done for the court", courts: {chosen: 1}},
  slight: {label: "A slight against the court", courts: {chosen: -1}}
};

/** Standing in words, highest first. */
export const BANDS = [
  {min: 5, word: "honoured"}, {min: 3, word: "well regarded"}, {min: 1, word: "known kindly"}, {min: 0, word: "unknown"},
  {min: -2, word: "mistrusted"}, {min: -4, word: "resented"}, {min: MIN, word: "scorned"}
];
export const band = n => BANDS.find(b => n >= b.min) ?? BANDS[BANDS.length - 1];

const clamp = v => Math.max(MIN, Math.min(MAX, Math.round(Number(v) || 0)));

export function normSpirits(s = {}) {
  const o = s && typeof s === "object" ? s : {};
  const standing = {};
  for ( const k of Object.keys(COURTS) ) { const v = clamp(o.standing?.[k]); if ( v ) standing[k] = v; }
  const log = (Array.isArray(o.log) ? o.log : []).filter(x => x && COURTS[x.court]).slice(-40)
    .map(x => ({at: Number(x.at) || 0, court: x.court, by: Math.round(Number(x.by) || 0), why: String(x.why ?? "").slice(0, 200)}));
  return {standing, totem: String(o.totem ?? "").slice(0, 80), log};
}

export const standingOf = (s, court) => normSpirits(s).standing[court] ?? 0;

/**
 * Apply a move: `move` a key of MOVES (or "custom" with `by`), `court` the chosen court. Returns {spirits, changes:
 * [{court, from, to}]}. Moves that would go past the ends stop there.
 */
export function applyMove(s, move, {court = null, by = 0, why = "", at = 0} = {}) {
  const out = normSpirits(s);
  const m = MOVES[move];
  const plan = m ? Object.entries(m.courts).map(([k, v]) => [k === "chosen" ? court : k, v]) : [[court, Math.round(Number(by) || 0)]];
  const changes = [];
  for ( const [k, v] of plan ) {
    if ( !COURTS[k] || !v ) continue;
    const from = out.standing[k] ?? 0, to = clamp(from + v);
    if ( to === from ) continue;
    if ( to ) out.standing[k] = to; else delete out.standing[k];
    out.log.push({at, court: k, by: to - from, why: String(why || m?.label || "By the Storyteller").slice(0, 200)});
    changes.push({court: k, from, to});
  }
  out.log = out.log.slice(-40);
  return {spirits: out, changes};
}

/**
 * What standing does to a roll with a spirit of that court (summoning, being taught a Gift, binding into a fetish or
 * talen): {diff, refuses, note}. +3 or more: -1 difficulty, +5: -2; -3 or less: +1, -5: +2 and the court may refuse.
 */
export function effect(n) {
  const v = clamp(n);
  const diff = v >= 5 ? -2 : v >= 3 ? -1 : v <= -5 ? 2 : v <= -3 ? 1 : 0;
  const refuses = v <= MIN;
  const note = diff === 0 ? "" : `${diff < 0 ? "" : "+"}${diff} difficulty, the court's regard (house rule)${refuses ? "; the court may refuse outright" : ""}.`;
  return {diff, refuses, note};
}

/** One line per court with standing, for a chat card or a sheet: "Weaver spirits: resented (-3)". */
export function summary(s) {
  const o = normSpirits(s);
  return Object.entries(o.standing).map(([k, v]) => `${k === "totem" && o.totem ? o.totem : COURTS[k]}: ${band(v).word} (${v > 0 ? "+" : ""}${v})`);
}

/**
 * How the courts stand in an era (notes for the Storyteller, house notes, not book text). The year decides which
 * note shows; the World of Future Darkness has its own.
 */
export function eraNotes(year, {future = false} = {}) {
  const y = Number(year) || 1197;
  const weaver = y < 1800 ? "The Weaver's spirits gather where people build: towns, roads, mills and cloisters. Away from them they are few."
    : y < 1990 ? "Mills, rail and wire carry the Weaver's spirits wherever a city grows; a slight against them is heard in every town."
    : "The Net is the Weaver's as much as stone and steel; its spirits are everywhere people are.";
  const wyrm = y < 1800 ? "Wyrm spirits feed on war, plague and cruelty, and lair where those have soaked the ground."
    : "Industry gives the Wyrm's spirits new lairs: smoke, slag, poisoned rivers and the places people are used up.";
  const wyld = y < 1800 ? "Wyld spirits are strong in forest, marsh and mountain, which still cover much of the land." : "The Wyld's spirits draw back from the cities into what wild places are left.";
  const out = {weaver, wyrm, wyld};
  if ( future || y >= 2020 ) out.future = "In the World of Future Darkness the courts of the machines and the Net are the Storyteller's to name; standing with them is kept under Weaver spirits.";
  return out;
}

/** Who usually deals with spirits, by the actor's type and the system's line names. */
export const SPIRIT_TYPES = /werewolf|changing|garou|fera|mage|kinfolk|shaman|sorcerer|kami|spirit/i;
