/**
 * WoDX Combat 3.14.0: the after-action card. Pure rules, no Foundry.
 *
 * When a fight ends the Storyteller gets one card: for each fighter the health levels taken and dealt, the points of
 * blood, Willpower and the like spent, and the powers and other acts seen in chat; then who outside the fight could see
 * it. Mortals who saw something they should not have are a breach; one click records it in the Masquerade ledger
 * (which follows the place: an Elysium or a haven keeps it) and starts a rumour in the night's draw.
 *
 * How far the tale travels follows the year (house rule, B1340): before photography a witness has only their word;
 * from 1888 a snapshot camera is possible; from 1985 a camcorder; from 2005 a camera in most pockets; in the World of
 * Future Darkness everything is recorded. With a recording likely, or five or more witnesses, the breach is severe.
 */

/** The pools whose spending the card lists, as read from system.advantages.<key>.temporary. */
export const POOLS = {
  bloodpool: "blood", willpower: "Willpower", rage: "Rage", gnosis: "Gnosis", glamour: "Glamour",
  quintessence: "Quintessence", pathos: "Pathos", faith: "Faith", conviction: "Conviction"
};

/** What a witness of each age can carry away, newest last. */
export const EVIDENCE = [
  {from: -9999, id: "word", label: "only their word", severe: false},
  {from: 1888, id: "snapshot", label: "a snapshot camera is possible", severe: false},
  {from: 1985, id: "camcorder", label: "a camcorder is possible", severe: false},
  {from: 2005, id: "phones", label: "a phone camera in most pockets: expect pictures", severe: true},
  {from: 2026, id: "recorded", label: "everything is recorded", severe: true, future: true}
];
export const MANY_WITNESSES = 5;

export function evidenceFor(year, {future = false} = {}) {
  const y = Number(year);
  let out = EVIDENCE[0];
  if ( !Number.isFinite(y) || !y ) return out;
  for ( const e of EVIDENCE ) if ( y >= e.from && (!e.future || future) ) out = e;
  return out;
}

/** A breach's severity: 1, or 2 when pictures are likely or the crowd is large. 0 with no breach witness. */
export function severity(breachCount, ev) {
  const n = Math.max(0, Number(breachCount) || 0);
  if ( !n ) return 0;
  return ev?.severe || n >= MANY_WITNESSES ? 2 : 1;
}

/** A fighter's numbers at one moment: {dmg (health levels marked), pools: {key: temporary}}. */
export function snapshot({damage = {}, pools = {}} = {}) {
  const n = v => Math.max(0, Number(v) || 0);
  const out = {};
  for ( const k of Object.keys(POOLS) ) if ( pools[k] !== undefined && pools[k] !== null ) out[k] = n(pools[k]);
  return {dmg: n(damage.bashing) + n(damage.lethal) + n(damage.aggravated), pools: out};
}

/**
 * The card's rows. start, end: {uuid: {name, ...snapshot()}}; cards: WoDX Combat attack cards of this fight
 * ({attacker, target, levels, applied, counter: {uuid, levels}, counterApplied}); acts: [{uuid, title}] seen in chat.
 * A fighter who joined late has no start: their taken and spent count from when they joined (start null: nothing).
 */
export function rows({start = {}, end = {}, cards = [], acts = []} = {}) {
  const ids = [...new Set([...Object.keys(start), ...Object.keys(end)])];
  const given = {};
  for ( const c of cards ) {
    if ( c?.attacker && c.applied && Number(c.levels) > 0 && c.target !== c.attacker ) given[c.attacker] = (given[c.attacker] ?? 0) + Number(c.levels);
    if ( c?.counter?.uuid && c.counterApplied && Number(c.counter.levels) > 0 && c.target ) given[c.target] = (given[c.target] ?? 0) + Number(c.counter.levels);
  }
  return ids.map(id => {
    const s = start[id], e = end[id] ?? s;
    const spent = [];
    if ( s && e ) for ( const [k, label] of Object.entries(POOLS) ) {
      const d = (s.pools?.[k] ?? 0) - (e.pools?.[k] ?? s.pools?.[k] ?? 0);
      if ( d > 0 ) spent.push({key: k, label, amount: d});
    }
    const powers = [...new Set(acts.filter(a => a.uuid === id && a.title).map(a => a.title))];
    return {uuid: id, name: e?.name ?? s?.name ?? "?", taken: s && e ? Math.max(0, e.dmg - s.dmg) : 0, healed: s && e ? Math.max(0, s.dmg - e.dmg) : 0,
      given: given[id] ?? 0, spent, powers};
  }).sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

/** The rumour a breach starts: the place and what was seen, in words for the night's draw. No names of the fighters. */
export function rumourText({place = "", kinds = [], ev = null} = {}) {
  const where = String(place || "").trim() || "the town";
  const what = kinds.length ? kinds.join(" and ") : "something no one can explain";
  const proof = ev?.id === "phones" || ev?.id === "recorded" ? " Someone says there are pictures." : ev?.id === "camcorder" ? " Someone says it was filmed." : "";
  return `People are talking about a fight at ${where}: ${what}.${proof}`;
}

/** One line for a fighter, as the card shows it. */
export function rowText(r) {
  const bits = [`took ${r.taken} level${r.taken === 1 ? "" : "s"}`, `dealt ${r.given}`];
  if ( r.healed ) bits.push(`healed ${r.healed}`);
  if ( r.spent.length ) bits.push(`spent ${r.spent.map(s => `${s.amount} ${s.label}`).join(", ")}`);
  return bits.join("; ");
}

/**
 * B3171: did the player characters' side win? fighters: [{id, pc, down}]. A fight is won when at least one player
 * character is still up and every other fighter is down. No player character in it: never won.
 */
export function fightWon(fighters = []) {
    const pcs = fighters.filter(f => f?.pc), others = fighters.filter(f => f && !f.pc);
    return pcs.some(f => !f.down) && others.length > 0 && others.every(f => f.down);
}
/** The deed's words for the Legends book. */
export function deedText({won = false, place = "", pcs = [], foes = []} = {}) {
    const who = pcs.length ? pcs.join(", ") : "Someone";
    const against = foes.length ? ` against ${foes.slice(0, 4).join(", ")}${foes.length > 4 ? " and others" : ""}` : "";
    return `${who} fought${against}${place ? ` at ${place}` : ""}${won ? " and won" : ""}.`;
}
