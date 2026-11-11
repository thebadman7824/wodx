/**
 * WoDX Chronicle 0.16.0: how fast word travels in each age (B707 to B709). Pure rules, shared by the rumour mill of
 * WoDX Storyteller and the Masquerade breaches of WoDX NPC, so the two never disagree about the year.
 *
 * House figures, rounded: the books give no rate for gossip. Years follow the Czech lands: printing in Moravia from
 * the late fifteenth century, the papers free to print after 1848, broadcast radio from 1923, television from 1953,
 * the internet in homes from the mid-1990s. The Net of the Future Darkness runs only on that branch.
 *
 *   heat     how many new people each knower tells a night
 *   places   how many new places a breach reaches a day, for each step of its severity
 *   flood    big news (a rumour marked big, or a breach of severity 2 or more) reaches everyone it can in one night
 */
export const MEDIA = [
  {id: "word", label: "Word of mouth", from: -9999, heat: 2, places: 1, flood: false},
  {id: "print", label: "Printed sheets and pamphlets", from: 1490, heat: 2, places: 1, flood: false, bigHeat: 4},
  {id: "papers", label: "The newspapers", from: 1848, heat: 3, places: 2, flood: true},
  {id: "radio", label: "The wireless", from: 1923, heat: 3, places: 2, flood: true},
  {id: "television", label: "Television", from: 1953, heat: 4, places: 3, flood: true},
  {id: "internet", label: "The internet", from: 1995, heat: 6, places: 4, flood: true},
  {id: "net", label: "The Net", from: 2026, heat: 8, places: 5, flood: true, future: true}
];

/** The newest way word travels in a year. No year known: word of mouth. */
export function mediaFor(year, {future = false} = {}) {
  const y = Number(year);
  if ( !Number.isFinite(y) || !y ) return MEDIA[0];
  let out = MEDIA[0];
  for ( const m of MEDIA ) if ( y >= m.from && (!m.future || future) ) out = m;
  return out;
}

/** How many each knower tells a night. big: news the papers (or the print shop) would carry. Infinity for a flood. */
export function rumourHeat(year, {big = false, future = false} = {}) {
  const m = mediaFor(year, {future});
  if ( big && m.flood ) return Infinity;
  if ( big && m.bigHeat ) return m.bigHeat;
  return m.heat;
}

/** How many new places a breach reaches in a day: its severity times the age's reach; a flood reaches them all. */
export function breachReach(severity, year, {future = false} = {}) {
  const s = Math.max(0, Math.trunc(Number(severity) || 0));
  if ( !s ) return 0;
  const m = mediaFor(year, {future});
  if ( s >= 2 && m.flood ) return Infinity;
  return s * m.places;
}

/** Chance that a telling twists the tale (the rumour mill's optional garbling). House figure. */
export const TWIST_CHANCE = 0.15;
