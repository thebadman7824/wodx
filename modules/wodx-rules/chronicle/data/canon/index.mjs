/**
 * WoDX Chronicle canon (B7170, Finish-Line Desk o6): the one place a shared date lives. Modules read
 * canon("anarch-revolt").from instead of typing a year, so two modules can no longer disagree. Each fact carries the
 * books it was checked against (V20 line first, then Revised or 2nd edition, never 5th), in our own words.
 *
 * A fact: {id, name, from, to (same as from for a single night), when (optional words), refs: [{book, pdf, says}],
 * chosen (optional: why this value where the books leave room)}.
 * tools/harness/canon.test.mjs fails when a hand-typed year sits beside one of these names outside this file and
 * disagrees with it, and keeps a shrink-only list of the copies that still agree (tools/harness/canon-copies.json).
 */

export const CANON = Object.freeze([
  {id: "camarilla-founded", name: "The Camarilla is founded", from: 1435, to: 1435,
    names: /camarilla (?:forms|formed|is formed|was formed|is founded|was founded|founded)|founding of the camarilla/i,
    refs: [{book: "vampire-lore-of-the-clans", pdf: 251, says: "Hardestadt's sect is formally organised in 1435"},
      {book: "archons", pdf: 32, says: "the Camarilla is officially founded in 1435"}]},
  {id: "first-conclave", name: "The first Conclave", from: 1486, to: 1486,
    names: /first conclave/i,
    refs: [{book: "vampire-lore-of-the-clans", pdf: 251, says: "Hardestadt presides over the first Conclave in 1486"}]},
  {id: "convention-of-thorns", name: "The Convention of Thorns", from: 1493, to: 1493, when: "23 October 1493",
    names: /(?:convention|treaty|council) of thorns|thorns is near|ends at thorns/i,
    refs: [{book: "anarchs", pdf: 14, says: "the anarch leaders meet the elders at Thorns, in England, in 1493"},
      {book: "anarchs", pdf: 133, says: "the treaty is dated 23 October 1493"},
      {book: "vampire-vampire-storytellers-handbook-revised", pdf: 148, says: "the Camarilla formally recognised at Thorns, 23 October 1493"}]},
  {id: "anarch-revolt", name: "The Anarch Revolt", from: 1335, to: 1493,
    names: /(?<!second )anarch (?:revolt|rebellion)/i,
    refs: [{book: "archons", pdf: 32, says: "Tyler's attack on Hardestadt, about 1335"},
      {book: "anarchs", pdf: 13, says: "the stage is set by the 14th century; the war consumes the 15th"},
      {book: "anarchs", pdf: 14, says: "it ends with the treaty at Thorns in 1493"}],
    chosen: "The V20 books give no starting year. 1335 is the Revised Archons date for the first blow (\"or thereabouts\") and fits Anarchs Unbound. The older 1381 and 1394 in WoDX had no book behind them (B7171)."},
  {id: "second-anarch-revolt", name: "The Second Anarch Revolt", from: 1944, to: 1944,
    names: /second anarch revolt/i,
    refs: [{book: "v20", pdf: 52, says: "the Second Anarch Revolt of 1944 makes the Anarch Free State"}],
    chosen: "Anarchs Unbound (pdf 20) says 1943; V20 comes first."},
  {id: "black-death", name: "The Black Death", from: 1347, to: 1351,
    names: /black death|black plague/i,
    refs: [{book: "changeling-changeling-the-dreaming-second-edition", pdf: 55, says: "the plague from 1347 to 1351"},
      {book: "wr20", pdf: 99, says: "the Black Death lays Europe waste in 1347"}]}
]);

const BY_ID = new Map(CANON.map(f => [f.id, f]));

/** One fact by id. An unknown id throws, so a typo can't quietly become undefined. */
export function canon(id) {
  const f = BY_ID.get(id);
  if (!f) throw new Error(`wodx-chronicle canon: no fact "${id}"`);
  return f;
}

/** A fact's span as words: "1493", or "1335 to 1493". */
export function canonSpan(id) {
  const f = canon(id);
  return f.from === f.to ? String(f.from) : `${f.from} to ${f.to}`;
}
