/**
 * WoDX Library 0.17.0: what a character could know, the pure part. For the Storyteller only: from the Encyclopaedia,
 * the entries that fit a character's line and the chronicle's year, each with a suggestion (would they know it?) and
 * the reason. Nothing is shown to a player until the Storyteller puts the entry in that character's codex.
 *
 * House rule (logged in PENDING-REVIEW): the books give no general table for what a character knows, so WoDX
 * suggests from the line and Intelligence + a Knowledge:
 *   - an entry that has not happened by the clock's year is never suggested (its date, or its era's first year);
 *   - the character's own line: its terms, rules, powers and factions are known; its people, places, lore and events
 *     need Intelligence + Occult (Academics for events, Politics for people and factions) of 4;
 *   - another line's entries need Intelligence + Occult of 6;
 *   - a ghoul reads vampire entries, and a revenant too, as their own line at 2 more.
 */

/** The first year each Encyclopaedia era is in play. An entry tagged only with later eras has not happened yet. */
export const ERA_FROM = {"mythic": -10000, "living-gods": -3000, "ancient": -2000, "classical": -800, "dark-ages": 800, "renaissance": 1450,
  "victorian": 1837, "wild-west": 1850, "great-war": 1914, "modern": 1950, "time-of-judgment": 1999, "future-darkness": 2023};
/** Which Encyclopaedia lines count as a character's own. */
export const OWN = {vampire: ["vampire"], ghoul: ["vampire"], revenant: ["vampire"], werewolf: ["werewolf", "fera"], mage: ["mage"],
  changeling: ["changeling"], wraith: ["wraith", "orpheus"], hunter: ["hunter"], mummy: ["mummy"], demon: ["demon"], mortal: []};
const STEP = {ghoul: 2, revenant: 2};
export const OWN_NEED = 4, OTHER_NEED = 6;
const COMMON = new Set(["term", "mechanic", "power", "faction"]);

/** Has this entry happened by the year? A dated entry by its date; otherwise by the earliest of its eras. */
export function happened(e, year) {
  const y = Number(year);
  if ( !Number.isFinite(y) || !y ) return true;
  if ( Number.isFinite(Number(e?.date?.from)) && e.date.from !== null ) return Number(e.date.from) <= y;
  const starts = (e?.eras ?? []).map(x => ERA_FROM[x]).filter(v => v !== undefined);
  return !starts.length || Math.min(...starts) <= y;
}

/** The Knowledge a kind of entry is read by. */
export function skillFor(kind) {
  if ( kind === "event" ) return "academics";
  if ( kind === "character" || kind === "faction" ) return "politics";
  return "occult";
}

/** dots: {intelligence, abilities: {occult, academics, politics, ...}}. */
const pool = (dots, k) => (Number(dots?.intelligence) || 0) + (Number(dots?.abilities?.[k]) || 0);

/**
 * Would the character know the entry? Returns {fits, known, why}: fits is false when it has not happened yet; known is
 * the suggestion; why says it in a few words for the Storyteller.
 */
export function suggest(e, {line = "mortal", year = 0, dots = {}} = {}) {
  if ( !happened(e, year) ) return {fits: false, known: false, why: "has not happened yet"};
  const own = (OWN[line] ?? []).some(l => (e?.lines ?? []).includes(l));
  if ( own ) {
    const extra = STEP[line] ?? 0;
    if ( COMMON.has(e.kind) && !extra ) return {fits: true, known: true, why: "common to the line"};
    const k = COMMON.has(e.kind) ? "occult" : skillFor(e.kind);
    const need = (COMMON.has(e.kind) ? OWN_NEED - 1 : OWN_NEED) + extra;
    const has = pool(dots, k);
    return {fits: true, known: has >= need, why: `Intelligence + ${k[0].toUpperCase()}${k.slice(1)} ${has} of ${need}`};
  }
  const has = pool(dots, "occult");
  return {fits: true, known: has >= OTHER_NEED, why: `another line's: Intelligence + Occult ${has} of ${OTHER_NEED}`};
}

/**
 * The entries to show for a character: those that have happened, own line first, then the suggested ones, then by
 * title. onlyKnown leaves out what would not be suggested. At most `limit`.
 */
export function listFor(entries = [], who = {}, {onlyKnown = true, limit = 400} = {}) {
  const own = new Set(OWN[who.line] ?? []);
  const rows = [];
  for ( const e of entries ?? [] ) {
    const s = suggest(e, who);
    if ( !s.fits || (onlyKnown && !s.known) ) continue;
    rows.push({e, ...s, own: (e.lines ?? []).some(l => own.has(l))});
  }
  rows.sort((a, b) => (b.own - a.own) || (b.known - a.known) || String(a.e.title).localeCompare(String(b.e.title)));
  return rows.slice(0, limit);
}
