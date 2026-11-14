/**
 * Regime change (B3618-B3619): the pure part. No Foundry here, so the harness can test it.
 *
 * Governments fall. The law records already date each change of rule in each land (a new form of government, a new
 * ruler); this says what such a turn does to those who live under it. A new form of government (a revolution, a
 * conquest, a new constitution) sweeps out many of the old officers and lets the old warrants lapse; a new ruler
 * under the same form only changes the top. A town that rises (WoDX Storyteller's towns) may win, and drive out the
 * officers of that town. Where the government is chosen by vote, a character on a council faces the voters at each
 * election. What a turn does is speculation where the books are silent, and every figure is a house figure
 * (docs/PENDING-REVIEW.md).
 */

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** What each cause of a turn sweeps out: the institution kinds (WoDX Storyteller) and the chance each holder goes. */
export const SWEEP = {
  form: {kinds: ["ruler", "court", "army", "secret", "tax", "council"], chance: 0.5, amnesty: true, words: "A new order sweeps out the old officers; the old warrants lapse."},
  ruler: {kinds: ["ruler"], chance: 0.25, amnesty: false, words: "A new ruler brings new favourites to the top."},
  rising: {kinds: ["ruler", "court", "tax", "army"], chance: 0.6, amnesty: false, words: "The town rises and drives out the officers of the old order."}
};
/** The sentences a new order's amnesty lifts (WoDX Chronicle's sentence marks). */
export const AMNESTY_MARKS = ["outlaw", "banished"];

/**
 * The turns of rule in a region's law between two years (after from, up to to), from its rows: a row that sets a new
 * form of government is a "form" turn, one that only sets a new ruler is a "ruler" turn. rows: L.rowsFor(region).
 */
export function turnsBetween(rows = [], from = 0, to = 0) {
  const out = [];
  for ( const r of rows ) {
    if ( !(n(r.from) > n(from) && n(r.from) <= n(to)) ) continue;
    const rule = r.set?.rule;
    if ( !rule ) continue;
    const cause = rule.form ? "form" : rule.ruler ? "ruler" : null;
    if ( cause ) out.push({year: n(r.from), note: String(r.note ?? ""), cause, ...SWEEP[cause]});
  }
  return out.sort((a, b) => a.year - b.year);
}

/** A sweep's holders: each seat's holder goes with the chance, the higher ranks a little likelier. rand: a number source. */
export function sweepSeats(seats = [], {chance = 0.5, only = null, rand = Math.random} = {}) {
  const gone = [];
  const out = seats.map(s => {
    if ( !s.holder || (only && s.holder.id !== only && s.holder.pawnOf !== only) ) return s;
    const c = only ? 1 : Math.min(1, chance * (0.75 + 0.125 * n(s.rank)));
    if ( rand() >= c ) return s;
    gone.push({...s.holder, rank: s.rank});
    return {rank: s.rank, holder: null, since: 0};
  });
  return {seats: out, gone};
}

/* ---- Elections ---- */

/** The year voting for a parliament begins to matter, by law family (rounded; "*" for the rest), and how often. */
export const ELECT_FROM = {common: 1832, latin: 1848, americas: 1824, pacific: 1856, japanese: 1890, orthodox: 1906, islamic: 1908, "south-asia": 1951, african: 1957, chinese: 1912, "*": 1900};
export const ELECT_EVERY = {common: 5, "*": 4};
const ELECTED = /parliament|assembly|congress|diet|duma|sejm|reichstag|cortes|senate and house|national council/i;
const NO_VOTE = /one-party|occupied|protectorate|absolute|autocratic|junta|military|colony|viceroyalty|puppet/i;

/** Whether the law record's rule is chosen by vote (rounded: a parliament, and no one party, army or occupier over it). */
export function electoral(rec = {}, family = "") {
  const rule = rec.rule ?? {};
  const from = ELECT_FROM[family] ?? ELECT_FROM["*"];
  return n(rec.year) >= from && ELECTED.test(`${rule.council ?? ""} ${rule.form ?? ""}`) && !NO_VOTE.test(`${rule.form ?? ""} ${rule.council ?? ""}`);
}

/** The election years after from, up to to. lawAt(year) gives the law record. */
export function electionsBetween(lawAt, family, from, to) {
  const every = ELECT_EVERY[family] ?? ELECT_EVERY["*"], out = [];
  for ( let y = Math.floor(n(from) / every) * every + every; y <= n(to); y += every ) if ( electoral(lawAt(y), family) ) out.push(y);
  return out.slice(-12);
}

/** The roll a councillor makes to keep the seat: Manipulation + Politics, harder at the top and in an age of mass media. */
export function electionRequest({rank = 0, year = 0, name = ""} = {}) {
  return {label: `${name ? `${name}: ` : ""}keep the seat at the election`, pools: [["manipulation", "politics"]], diff: Math.min(9, 6 + (n(rank) >= 3 ? 1 : 0) + (n(year) >= 1950 ? 1 : 0)), mode: "simple"};
}

/** What a turn means for each line (B3619), for the Storyteller. */
export const LINE_REGIME = {
  vampire: "The Prince's mortal pawns fall with the old order; whoever backed the new one gains.",
  ghoul: "A ghoul in office falls with the domitor's pawns, or rises with the new order.",
  werewolf: "A new order may open the wild lands to the axe, or close them.",
  mage: "The Technocracy prefers order of any kind; a revolution is a chance for the Traditions.",
  changeling: "Upheaval feeds Banality or Glamour, as the people despair or dream.",
  wraith: "A revolution fills the Shadowlands with the newly dead, and the old regime's ghosts linger.",
  hunter: "A new order's secret police may hunt the hunters, or recruit them.",
  mummy: "A mummy has seen many regimes fall, and knows which treasures go missing in the chaos.",
  demon: "Revolutions are made of the faith and despair a demon feeds on.",
  revenant: "Revenant families have outlived every regime by serving the next.",
  mortal: ""
};
