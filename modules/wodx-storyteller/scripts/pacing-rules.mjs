/**
 * WoDX Storyteller 0.39.0: the pacing note on the night's draw (B1714, the lighter version Ben chose). No Foundry here.
 *
 * It reads the Storyteller's log for the last nights and says, for the Storyteller only, how the nights have run:
 * three quiet nights in a row, or a hard night just past. It never changes what the draw picks.
 *
 * A night runs from noon to noon, so the hours after midnight belong to the night before. A night is hard when the
 * log has a fight, a frenzy, a death or torpor, a breach of the Masquerade, Diablerie or an encounter on the road in
 * it. A night with none of those is quiet, whether or not anyone played it.
 */

const DAY = 86400;
export const FIGHT_TEXT = "A fight began";
const HARD_ATTENTION = new Set(["A frenzy", "A death or torpor", "A Masquerade breach", "Diablerie"]);

/** Which night a world time belongs to. */
export const nightOf = at => Math.floor((Number(at) - DAY / 2) / DAY);

/** What made a log entry hard, or null. */
export function hardness(e) {
  if ( !e ) return null;
  if ( String(e.text ?? "").startsWith(FIGHT_TEXT) ) return "a fight";
  if ( e.kind === "breach" ) return "a breach";
  if ( e.kind === "encounter" ) return "an encounter";
  if ( HARD_ATTENTION.has(e.attention) ) return String(e.attention).replace(/^A /, "a ").replace(/^Diablerie$/, "Diablerie");
  return null;
}

/**
 * The last `count` nights before tonight, newest first: [{night, hard: [reasons], entries}]. `entries` is the log.
 */
export function pastNights(entries = [], now = 0, count = 7) {
  const tonight = nightOf(now);
  const out = [];
  for ( let i = 1; i <= count; i++ ) out.push({night: tonight - i, hard: [], entries: 0});
  for ( const e of entries ) {
    const k = tonight - nightOf(e?.at ?? 0);
    if ( k < 1 || k > count ) continue;
    const row = out[k - 1];
    row.entries++;
    const h = hardness(e);
    if ( h && !row.hard.includes(h) ) row.hard.push(h);
  }
  return out;
}

const WORDS = ["", "one", "two", "three", "four", "five", "six", "seven"];
const list = xs => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/**
 * The note, or null when there is nothing worth saying. {text, quietRun, hardOfFour, last}.
 * The order: a hard night just past, then a run of hard nights, then a run of quiet ones.
 */
export function pacingNote(entries = [], now = 0) {
  const nights = pastNights(entries, now, 7);
  let quietRun = 0;
  for ( const n of nights ) { if ( n.hard.length ) break; quietRun++; }
  const hardOfFour = nights.slice(0, 4).filter(n => n.hard.length).length;
  const last = nights[0];
  let text = null;
  if ( hardOfFour >= 3 ) text = `${WORDS[hardOfFour][0].toUpperCase()}${WORDS[hardOfFour].slice(1)} hard nights out of the last four. The coterie may need a quieter one.`;
  else if ( last.hard.length ) text = `Last night had ${list(last.hard)}. A quieter scene may suit tonight.`;
  else if ( quietRun >= 3 ) text = `${quietRun === 7 ? "A week of" : `${WORDS[quietRun][0].toUpperCase()}${WORDS[quietRun].slice(1)}`} quiet nights${quietRun === 7 ? "" : " in a row"}. Trouble may be due.`;
  return text ? {text, quietRun, hardOfFour, last: last.hard} : null;
}
