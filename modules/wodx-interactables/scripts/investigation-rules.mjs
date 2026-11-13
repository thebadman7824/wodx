/**
 * Investigation (B3364-B3368): theories on the case board, the hidden truth, evidence that fades, and what the
 * science of each year can read. Pure, no Foundry.
 *
 * A board (case-rules.mjs) gains:
 *   theories  [{id, who, what, where, why, rests: [link ids], by, at, test}]: the coterie's account in plain words and
 *             the lines on the board it rests on. test: {successes, said, at} from the last test.
 *   truth     [link key]: the lines the Storyteller marks as true (a key is the two card ids, sorted, joined by "|").
 *             Players never see it; the board's flags are readable with the browser's tools, so the Storyteller keeps
 *             the full truth in their own notes too.
 * Testing a theory is Perception or Intelligence + Investigation (V20 pdf 272) at difficulty 7. The answer says how many
 * of the lines hold up, never which: one success says whether any hold, two say roughly how many, three the number,
 * five also how many true lines the theory leaves out (B3365).
 *
 * Evidence (B3366) is a record the world keeps when something happens at a place: blood after feeding or a wound,
 * tracks and a witness after a break-in, ash and a smell of oil after a fire. Each kind fades at its own pace, faster in
 * rain or snow, and a search finds it while it lasts. What a find tells depends on the year (B3367): a print names
 * nobody before 1892, blood says nothing of who until typing in 1901, and DNA arrives in 1986. Every figure is a house
 * reading; the dates are rounded history in WoDX's own words.
 */

export const HOUR = 3600, DAY = 86400;
export const TEST_DIFF = 7, SEARCH_DIFF = 7;
const str = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
export const keyOf = (a, b) => [String(a), String(b)].sort().join("|");

/* ---- Theories (B3364, B3365) ---- */

export function normTheory(t = {}) {
  return {id: str(t.id, 20), who: str(t.who, 160), what: str(t.what, 200), where: str(t.where, 160), why: str(t.why, 200),
    rests: [...new Set((Array.isArray(t.rests) ? t.rests : []).map(x => str(x, 20)).filter(Boolean))].slice(0, 30),
    by: str(t.by, 40), at: n(t.at),
    test: t.test && typeof t.test === "object" ? {successes: Math.max(0, Math.round(n(t.test.successes))), said: str(t.test.said, 300), at: n(t.test.at)} : null};
}

/** The theories and truth of a board, made safe against the board's own lines. */
export function normInquiry(board = {}) {
  const linkIds = new Set((board.links ?? []).map(l => l.id));
  const pairs = new Set((board.links ?? []).map(l => keyOf(l.a, l.b)));
  const theories = (Array.isArray(board.theories) ? board.theories : []).map(normTheory).filter(t => t.id)
    .map(t => ({...t, rests: t.rests.filter(id => linkIds.has(id))})).slice(0, 20);
  const truth = [...new Set((Array.isArray(board.truth) ? board.truth : []).map(String))].filter(k => pairs.has(k));
  return {theories, truth};
}

/** A theory in words. */
export function theoryText(t) {
  const x = normTheory(t);
  const parts = [x.who && `Who: ${x.who}.`, x.what && `What: ${x.what}.`, x.where && `Where: ${x.where}.`, x.why && `Why: ${x.why}.`].filter(Boolean);
  return parts.join(" ") || "A theory with no words yet.";
}

/** How a theory stands against the truth: {holds, of, missed}. links: the board's lines. */
export function measure(theory, links = [], truth = []) {
  const t = normTheory(theory), T = new Set(truth);
  const rests = (links ?? []).filter(l => t.rests.includes(l.id)).map(l => keyOf(l.a, l.b));
  const holds = rests.filter(k => T.has(k)).length;
  const missed = [...T].filter(k => !rests.includes(k)).length;
  return {holds, of: rests.length, missed};
}

/** What a test of a theory says, by successes. Never which lines. */
export function verdict({holds, of, missed}, successes) {
  const s = Math.max(0, Math.round(n(successes)));
  if ( s <= 0 ) return "Nothing comes clear. The theory can't be judged yet.";
  if ( !of ) return "The theory rests on no line on the board; join the cards it stands on first.";
  if ( s === 1 ) return holds ? "Some of it holds up." : "None of it holds up.";
  if ( s === 2 ) {
    const r = holds / of;
    return holds === 0 ? "None of it holds up." : r >= 0.99 ? "All or nearly all of it holds up." : r >= 0.5 ? "More than half of it holds up." : "Less than half of it holds up.";
  }
  const base = `${holds} of the ${of} line${of === 1 ? "" : "s"} it rests on hold${holds === 1 ? "s" : ""} up.`;
  if ( s < 5 ) return base;
  return `${base} ${missed ? `There ${missed === 1 ? "is" : "are"} ${missed} more true link${missed === 1 ? "" : "s"} it leaves out.` : "It leaves nothing true out."}`;
}

/* ---- Evidence (B3366) ---- */

/**
 * Kinds of evidence: how long each lasts (days, outdoors in dry weather; indoors lasts four times as long), whether
 * rain washes it, and the science that reads it (B3367).
 */
export const EVIDENCE = {
  blood: {label: "Blood", days: 7, washes: true, read: "blood"},
  tracks: {label: "Tracks", days: 2, washes: true, read: "tracks"},
  witness: {label: "A witness", days: 30, washes: false, read: "witness"},
  paper: {label: "A letter or a paper", days: 365, washes: true, read: "paper"},
  ash: {label: "Ash and the smell of oil", days: 14, washes: true, read: "fire"},
  prints: {label: "Marks of hands", days: 60, washes: true, read: "prints"},
  footage: {label: "A camera's tape", days: 30, washes: false, read: "footage", from: 1970},
  traces: {label: "Hair, skin or spit", days: 120, washes: true, read: "dna"}
};

/** What each kind of evidence can tell, by the year. Each row: from year, the words, and dice it adds to a search. */
export const SCIENCE = {
  blood: [{from: -Infinity, says: "Someone bled here, and not long ago."}, {from: 1901, says: "The blood can be typed, which rules people out.", dice: 1}, {from: 1986, says: "The blood can be matched to one person.", dice: 2}],
  tracks: [{from: -Infinity, says: "Where they came from and where they went, and roughly how big."}, {from: 1890, says: "Prints of the shoes can be cast in plaster and matched.", dice: 1}],
  witness: [{from: -Infinity, says: "Someone saw something, if they are asked the right way."}, {from: 1880, says: "A description goes down on paper and can be shown about.", dice: 1}],
  paper: [{from: -Infinity, says: "The hand and the seal say something of who wrote it."}, {from: 1880, says: "The paper and the ink can be traced to a maker.", dice: 1}],
  fire: [{from: -Infinity, says: "The fire was set, not an accident."}, {from: 1900, says: "Where it started and what fed it can be found.", dice: 1}],
  prints: [{from: -Infinity, says: "A smudge on a frame, a hand on the dust."}, {from: 1892, says: "The prints can be matched to a person on file.", dice: 2}],
  footage: [{from: 1970, says: "A grainy picture of whoever came."}, {from: 2000, says: "A clear picture, with the time on it.", dice: 1}],
  dna: [{from: -Infinity, says: "Nothing anyone can read yet."}, {from: 1986, says: "A match to one person, given a sample to match.", dice: 2}]
};

/** What a piece of evidence tells in a year, and the dice the science of the day adds. */
export function scienceFor(kind, year = 0) {
  const rows = SCIENCE[EVIDENCE[kind]?.read] ?? [];
  let best = null;
  for ( const r of rows ) if ( !year || year >= r.from ) best = r;
  return best ? {says: best.says, dice: n(best.dice)} : {says: "", dice: 0};
}

/** The kinds that can be left in a year (no tape before cameras). */
export const kindsFor = year => Object.entries(EVIDENCE).filter(([, e]) => !e.from || !year || year >= e.from).map(([k]) => k);

export function normEvidence(e = {}) {
  return {id: str(e.id, 20), kind: EVIDENCE[e.kind] ? e.kind : "tracks", scene: str(e.scene, 40), at: n(e.at), by: str(e.by, 40), byName: str(e.byName, 80),
    text: str(e.text, 300), indoors: !!e.indoors, wet: Math.max(0, n(e.wet)), found: (Array.isArray(e.found) ? e.found : []).map(x => str(x, 40)).slice(0, 20)};
}

/** How fresh a piece of evidence is, from 1 (just left) to 0 (gone). wet: the hours of rain or snow on it since. */
export function freshness(ev, now) {
  const e = normEvidence(ev), k = EVIDENCE[e.kind];
  const life = k.days * DAY * (e.indoors ? 4 : 1);
  const lost = Math.max(0, now - e.at) + (k.washes && !e.indoors ? e.wet * HOUR * 6 : 0);
  return Math.max(0, Math.min(1, 1 - lost / life));
}

/** Difficulty to find it: 7, one more when half gone, two more when nearly gone; never past 10. */
export const searchDiff = f => Math.min(10, SEARCH_DIFF + (f < 0.5 ? 1 : 0) + (f < 0.2 ? 1 : 0));

/**
 * What a search turns up from one piece of evidence: {found, names}. Found on any success; with three or more and a
 * science that can name someone (dice 2 rows), the find names who left it.
 */
export function searchResult(ev, successes, year = 0) {
  const s = Math.max(0, Math.round(n(successes)));
  if ( s < 1 ) return {found: false, names: false};
  const sc = scienceFor(normEvidence(ev).kind, year);
  return {found: true, names: s >= 3 && sc.dice >= 2};
}

/** The words of a found piece, for a clue card. */
export function findWords(ev, {names = false, year = 0} = {}) {
  const e = normEvidence(ev), sc = scienceFor(e.kind, year);
  return [e.text, sc.says, names && e.byName ? `It points to ${e.byName}.` : ""].filter(Boolean).join(" ");
}

/** Leave evidence: adds to the list, merging the same kind by the same hand at the same place within the hour. */
export function leave(list, ev, idFor = i => `e${i}`) {
  const out = (Array.isArray(list) ? list : []).map(normEvidence);
  const e = normEvidence(ev);
  const same = out.find(x => x.kind === e.kind && x.scene === e.scene && x.by === e.by && Math.abs(x.at - e.at) < HOUR);
  if ( same ) { same.at = Math.max(same.at, e.at); if ( e.text && !same.text.includes(e.text) ) same.text = str(`${same.text} ${e.text}`, 300); return out; }
  let i = out.length + 1;
  const used = new Set(out.map(x => x.id));
  while ( used.has(idFor(i)) ) i++;
  out.push({...e, id: idFor(i)});
  return out;
}

/** Drop what is gone, and keep the newest MAX. */
export const MAX_EVIDENCE = 300;
export const prune = (list, now) => (list ?? []).map(normEvidence).filter(e => freshness(e, now) > 0).slice(-MAX_EVIDENCE);

/** What the clock's events leave (B3368): the kinds a hook leaves behind, by what happened. */
export function leftBy(what, year = 0) {
  const ok = new Set(kindsFor(year));
  const pick = ks => ks.filter(k => ok.has(k));
  switch ( what ) {
    case "fed": return pick(["blood", "witness"]);
    case "wound": return pick(["blood", "traces"]);
    case "fire": return pick(["ash", "witness", "footage"]);
    case "scout": return pick(["tracks", "witness"]);
    case "bribe": return pick(["witness"]);
    case "break": return pick(["tracks", "prints", "footage"]);
    case "violence": return pick(["blood", "witness", "traces"]);
    default: return pick(["witness"]);
  }
}
