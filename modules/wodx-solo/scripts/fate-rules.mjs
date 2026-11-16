/**
 * WoDX Solo: step 5 of The Lone Chronicle, the pure part (B6530 to B6536). No Foundry calls here.
 *
 *   The Beast      a lone player's character in frenzy is played by the game until it passes (V20 pdf 307): the
 *                  seat goes for an enemy in sight, else the nearest living being. A Kindred player may spend a
 *                  Willpower point for one turn of control.
 *   The long sleep torpor slept away, and years slept through by choice: a Cainite sleeps in voluntary torpor (no
 *                  shorter than half the Road's time, as WoDX Actions keeps it), anyone else lives the years.
 *   Heirs          when the character dies, the chronicle goes on with one of those the dead leave behind: a childe,
 *                  a ghoul, an heir from the years, the family, a tie on the sheet. Owner records pass to the heir.
 */

export const SOURCES = {
  frenzy: "V20 pdf 307: the Storyteller decides how long a frenzy lasts, one scene typically; a Willpower point controls one action for a turn",
  torpor: "V20 Dark Ages p. 351: the length of torpor comes from the Road",
  finalDeath: "V20 pdf 293: aggravated damage past Incapacitated is Final Death"
};

/** How far the Beast looks for prey, in yards (house reading: the scene, as far as the eye goes at night). */
export const PREY_REACH = 40;

/**
 * The one the Beast goes for: an enemy in sight first, then the nearest living being, within reach.
 * cands: [{id, yards, hostile, dead, hidden, self}]. Null when there is nobody.
 */
export function preyOf(cands = [], {reach = PREY_REACH} = {}) {
  const ok = (cands ?? []).filter(c => c && !c.self && !c.dead && !c.hidden && Number.isFinite(Number(c.yards)) && Number(c.yards) <= reach);
  if ( !ok.length ) return null;
  const by = (a, b) => Number(a.yards) - Number(b.yards) || String(a.id).localeCompare(String(b.id));
  const foes = ok.filter(c => c.hostile).sort(by);
  return (foes[0] ?? ok.sort(by)[0]) ?? null;
}

/** The fight's key for one round, so a Willpower point buys that round and no more. */
export const roundKey = (combatId, round) => `${combatId ?? ""}:${Number(round) || 0}`;

/** May this character fight the Beast with Willpower now? kind: WoDX Actions' profile key. */
export function canFightBeast({kind, frenzy, willpower, inFight, held, key} = {}) {
  if ( !frenzy ) return {ok: false, why: "not in frenzy"};
  if ( !["kindred", "ghoul"].includes(kind) ) return {ok: false, why: "only the Kindred and their ghouls can master the Beast this way"};
  if ( !inFight ) return {ok: false, why: "only in a fight"};
  if ( held && held === key ) return {ok: false, why: "this turn is already held"};
  if ( !(Number(willpower) > 0) ) return {ok: false, why: "no Willpower left"};
  return {ok: true, why: ""};
}

/** Dead, from a plain record: {statuses: [], died, finalDeath}. Torpor is not death. */
export function fallen(a = {}) {
  const st = a.statuses instanceof Set ? [...a.statuses] : (a.statuses ?? []);
  return st.includes("dead") || (a.died !== undefined && a.died !== null && a.died !== false) || !!a.finalDeath;
}

/* ------------------------------ the long sleep ------------------------------ */

import {YEAR} from "../../wodx-chronicle/scripts/terms.mjs";
export {YEAR};
/** The choices the panel offers, in years. */
export const SLEEPS = [1, 5, 10, 25, 50, 100];
/** The last year a sleep may reach: the main timeline ends in 2022; the Future Darkness branch runs to 2099. */
export const lastYear = futureBranch => (futureBranch ? 2099 : 2022);

/**
 * What a sleep of `years` does, from {kind, road, year, futureBranch}. A Cainite sleeps in torpor, no less than half
 * the Road's time (voluntary, as WoDX Actions keeps it); the rest live the years. years: what will pass.
 */
export function sleepPlan({kind = "mortal", road = 7, year = 1197, years = 1, futureBranch = false} = {}) {
  const want = Math.max(0, Math.round(Number(years) || 0));
  const room = Math.max(0, lastYear(futureBranch) - (Number(year) || 0));
  const kindred = kind === "kindred";
  const minDays = kindred ? Math.ceil(TORPOR_DAYS[Math.max(0, Math.min(10, Math.round(Number(road) || 0)))] / 2) : 0;
  const minYears = minDays / 365;
  const passes = Math.min(Math.max(want, Math.ceil(minYears)), room);
  if ( !passes ) return {ok: false, why: room ? "no time to pass" : `the chronicle ends in ${lastYear(futureBranch)}`, years: 0, torpor: kindred, minYears};
  return {ok: true, years: passes, torpor: kindred, minYears, capped: passes !== want,
    why: kindred ? `sleeps in torpor (at least ${minLabel(minDays)} at Road ${Math.round(Number(road) || 0)})` : "lives the years"};
}
/** Days of torpor by Road (V20 Dark Ages p. 351), the same table WoDX Actions uses. */
export const TORPOR_DAYS = {10: 1, 9: 3, 8: 7, 7: 14, 6: 30, 5: 365, 4: 3650, 3: 18250, 2: 36500, 1: 182500, 0: 365000};
function minLabel(days) {
  if ( days < 30 ) return `${days} day${days === 1 ? "" : "s"}`;
  if ( days < 365 ) return `${Math.round(days / 30)} month${Math.round(days / 30) === 1 ? "" : "s"}`;
  const y = Math.round(days / 365);
  return `${y} year${y === 1 ? "" : "s"}`;
}

/* ------------------------------ heirs ------------------------------ */

export const TIES = {
  childe: {label: "Childe", rank: 0}, ghoul: {label: "Ghoul", rank: 1}, heir: {label: "Heir", rank: 2},
  kin: {label: "Family", rank: 3}, tie: {label: "Tie", rank: 4}, mine: {label: "Yours already", rank: 5}
};

/**
 * Who could carry the chronicle on. dead: {id, uuid, family, ties: [{uuid, role}]}. list: [{id, uuid, name, sire,
 * domitor, heirOf, family, dead, group, mine}], sire/domitor/heirOf the ids the sheet names. Each living one once, by
 * the closest tie. Returns [{id, name, tie, label}], closest first.
 */
export function heirsOf(dead = {}, list = []) {
  const ties = new Map((dead.ties ?? []).filter(t => t?.uuid).map(t => [t.uuid, String(t.role ?? "").trim()]));
  const out = [];
  for ( const a of list ?? [] ) {
    if ( !a?.id || a.id === dead.id || a.dead || a.group ) continue;
    let tie = null, label = "";
    if ( a.sire && a.sire === dead.id ) tie = "childe";
    else if ( a.domitor && a.domitor === dead.id ) tie = "ghoul";
    else if ( a.heirOf && a.heirOf === dead.id ) tie = "heir";
    else if ( a.family && dead.family && a.family === dead.family ) tie = "kin";
    else if ( ties.has(a.uuid) ) { tie = "tie"; label = ties.get(a.uuid); }
    else if ( a.mine ) tie = "mine";
    if ( !tie ) continue;
    out.push({id: a.id, name: String(a.name ?? ""), tie, label: label ? `${TIES.tie.label}: ${label}` : TIES[tie].label});
  }
  return out.sort((x, y) => TIES[x.tie].rank - TIES[y.tie].rank || x.name.localeCompare(y.name));
}

/** An owner record passed to the heir: the same holding, the heir's name, the year, and where it came from. */
export function inherit(rec, heir = {}, {year = null, from = ""} = {}) {
  if ( !rec || typeof rec !== "object" ) return null;
  return {...rec, id: String(heir.uuid ?? ""), kind: "actor", name: String(heir.name ?? ""), since: Number.isFinite(Number(year)) ? Number(year) : rec.since ?? null,
    stolen: false, takenBy: "", takenByName: "", takenAt: null, note: `Inherited from ${from}`.slice(0, 300)};
}
