/**
 * Book one's twist web (Rothenstein Rebuilt, B4850-B4853). The Storyteller's third volume holds twenty-four twists, one
 * under each encounter, tied into six chains that pay off in named chapters, with pairs that cannot both stand as
 * written. This file keeps only the shape: numbers, chains, the earliest chapter, the pairs and a quick order. The
 * twists' own words stay in the Storyteller's volumes; the labels here are short handles in our own words.
 * Pure data: twist-rules.mjs reads it.
 */

/** The chains: key, a handle, the twists on it and the chapters it pays off in. */
export const CHAINS = [
  {key: "graff", label: "Graff's ledger", twists: [6, 7, 16, 18, 24], pays: ["c6", "c8", "c9"]},
  {key: "egon", label: "The hermit's lodge", twists: [8, 15, 17, 20], pays: ["c4", "c7", "c8"]},
  {key: "letter", label: "The black-wax letter", twists: [1, 5, 11, 13], pays: ["c1", "c2", "c9"]},
  {key: "grove", label: "The Grove sign", twists: [2, 9, 23], pays: ["c3", "c5", "c9"]},
  {key: "white", label: "The lady in white", twists: [4, 17, 19], pays: ["c3", "c8", "c10"]},
  {key: "inside", label: "Konrad's inside man", twists: [3, 24], pays: ["c6", "c8", "c9"]}
];

/**
 * The twists. n: the twist's number (and its encounter's); from: the earliest chapter it fits; free: a small quiet
 * twist that fits any night; variants: a twist with two hearts, of which only one can be used.
 */
export const TWISTS = [
  {n: 1, label: "What the failed hunt carried", from: "c1"},
  {n: 2, label: "What the harvest ball hid", from: "c3"},
  {n: 3, label: "Dreams that come true", from: "c6"},
  {n: 4, label: "An old name spoken", from: "c1", free: true},
  {n: 5, label: "The rider on the ridge", from: "c1"},
  {n: 6, label: "A remedy meant for Graff", from: "c6"},
  {n: 7, label: "Ash from the Lower Town fire", from: "c6"},
  {n: 8, label: "A small boot at the lodge", from: "c4"},
  {n: 9, label: "A ring in the ruins", from: "c3"},
  {n: 10, label: "The wolf that wore a collar", from: "c1", free: true},
  {n: 11, label: "The players' script", from: "c2"},
  {n: 12, label: "Who bought the purse", from: "c1", free: true},
  {n: 13, label: "The hunter in Hungary", from: "c9"},
  {n: 14, label: "The shrine past the ferry", from: "c1", free: true},
  {n: 15, label: "The wedding's missing bride", from: "c4"},
  {n: 16, label: "Who cut the dam", from: "c8"},
  {n: 17, label: "The lady in white", from: "c8"},
  {n: 18, label: "Silver with red veins", from: "c8"},
  {n: 19, label: "A message for a name", from: "c3"},
  {n: 20, label: "The knight's cousin", from: "c4"},
  {n: 21, label: "What the Dolany woman saw", from: "c5"},
  {n: 22, label: "The blind man's fortunes", from: "c1", variants: {tool: "the Husbandman speaks through them", seer: "they are a true seer's"}},
  {n: 23, label: "The arrow in the Grove", from: "c5"},
  {n: 24, label: "The margrave's clerk", from: "c6", variants: {turned: "the clerk is turned", killed: "the clerk is killed"}}
];

/**
 * Twists that cannot both stand as written. When `a` is revealed, `b` keeps a different heart (the note says which),
 * and the other way round. A twist with variants locks its other variant outright.
 */
export const PAIRS = [
  {a: 15, b: 17, note: "Only one of them owns the drowned bride. The other needs another cause."},
  {a: 20, b: 8, note: "With the cousin in the lodge, the hermit cannot be wholly kind: the hermit is guilty of what was left undone."},
  {a: 21, b: 23, note: "If Yaroslava knows what was seen, the silence is no secret any more. Decide who told whom."},
  {a: 13, b: 1, note: "The hunter is either one who lived through the failed hunt or a separate agent, never both."}
];

/** The quick order for a table that moves fast; the free twists drop into any quiet night. */
export const ORDER = [1, 5, 2, 3, 9, 6, 7, 8, 11, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];

/** The last chapter that may bring a new twist; after it is played, the company pulls the last threads itself. */
export const LAST_CHAPTER = "c9";
/** Book one's chapters in order (saga-rothenstein.mjs). */
export const CHAPTERS = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10"];
/** One twist a week of game time (Ben, 2026-11-14). */
export const WEEK = 7 * 86400;
