/**
 * Papers and the undying (B3612-B3613): the pure part. No Foundry here, so the harness can test it.
 *
 * For beings who do not age, the hardest law is the paper trail. Each age and land keeps its own records of who
 * someone is: parish registers, land and tax rolls, censuses, passports, identity cards, fingerprints, social
 * insurance numbers, computer records, biometrics. The more records the age keeps, the harder a new self is to make
 * and the likelier a clerk notices the same face, name or signature a lifetime later. A new self is a downtime
 * project (WoDX Storyteller's "Make a new self on paper"). The years are rounded history; the costs and the notice
 * chances are house figures (docs/PENDING-REVIEW.md).
 */

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * The records. from: the year by law family ("*" for any not named), or a plain year for everyone. weight: how much
 * the record ties a person down.
 */
export const RECORDS = [
  {id: "rolls", label: "Land and tax rolls, and the lord's or the town's books", from: 0, weight: 1},
  {id: "registers", label: "Registers of baptism, marriage and burial", from: {common: 1538, latin: 1563, orthodox: 1722, "*": 1900}, weight: 1},
  {id: "household", label: "Household registers kept for the state", from: {chinese: 0, japanese: 1638, "*": null}, weight: 1},
  {id: "census", label: "A census of every household", from: {americas: 1790, common: 1801, latin: 1850, orthodox: 1897, "south-asia": 1871, japanese: 1920, "*": 1950}, weight: 1},
  {id: "passport", label: "Passports for any journey abroad", from: 1914, weight: 1},
  {id: "fingerprints", label: "Fingerprints taken at every arrest", from: 1901, weight: 1},
  {id: "idcard", label: "An identity card carried at all times", from: {latin: 1938, orthodox: 1932, chinese: 1985, islamic: 1950, african: 1960, "*": null}, weight: 2},
  {id: "number", label: "A social insurance or citizen's number", from: {americas: 1935, common: 1948, "*": 1960}, weight: 1},
  {id: "computer", label: "Records kept on computers", from: 1965, weight: 2},
  {id: "biometric", label: "Faces and fingerprints in databases, checked at borders", from: 2005, weight: 2}
];

const fromFor = (r, family) => (typeof r.from === "number" ? r.from : (family in r.from ? r.from[family] : r.from["*"]));

/** The records kept in a land of this family in a year. */
export function recordsFor(family = "", year = 0) {
  return RECORDS.filter(r => { const f = fromFor(r, family); return f != null && n(year) >= f; });
}
/** How tightly the age's records tie a person down: the weights added, 1 in the Dark Medieval to about 12 today. */
export const paperWeight = (family, year) => recordsFor(family, year).reduce((s, r) => s + r.weight, 0);

/** The downtime project for a new self: difficulty and successes needed, and the cost in Resources dots. */
export function newSelfProject(family, year) {
  const w = paperWeight(family, year);
  return {diff: clamp(5 + Math.ceil(w / 3), 5, 9), goal: 2 + w, resources: w >= 8 ? 3 : w >= 4 ? 2 : 1};
}

/** The chance, each decade a self is kept openly, that someone notices it does not age (house figures). */
export function noticeChance(family, year, {quality = 3, decades = 1} = {}) {
  const w = paperWeight(family, year);
  const per = clamp(0.03 + 0.025 * w - 0.02 * (n(quality) - 3), 0.01, 0.6);
  return Math.round((1 - Math.pow(1 - per, Math.max(1, n(decades)))) * 1000) / 1000;
}

/** A self on paper, kept on the character (flag wodx-chronicle.selves). quality 1-5. */
export function normSelf(s = {}) {
  return {id: String(s.id ?? "").slice(0, 40), name: String(s.name ?? "").slice(0, 80), quality: clamp(Math.round(n(s.quality) || 3), 1, 5), since: n(s.since),
    region: String(s.region ?? "").slice(0, 40), family: String(s.family ?? "").slice(0, 20), current: !!s.current, burned: !!s.burned};
}
/** Quality from the project's spare successes: 3, plus one for each two over the goal, less one if done in a hurry. */
export const qualityFrom = (successes, goal) => clamp(3 + Math.floor(Math.max(0, n(successes) - n(goal)) / 2), 1, 5);

/** Wills to oneself: how a court of this family treats an "heir" no one has seen grow up (house figures). */
export function heirChallenge(family, year) {
  const w = paperWeight(family, year);
  return {chance: clamp(0.05 + 0.04 * w, 0.05, 0.6), words: w >= 8 ? "Probate checks the heir's papers against the records; a forged heir must pass every one."
    : w >= 4 ? "A notary or a clerk may ask where this heir was born and who knew them." : "A lord's or a town's say is enough, if the right people agree."};
}

/** What each line makes of the paper trail (B3613), for the Storyteller. */
export const LINE_PAPERS = {
  vampire: "Every self a Kindred keeps must die on paper sooner or later; the Masquerade leans on forgers.",
  ghoul: "A ghoul who stops ageing needs a new self as surely as the domitor.",
  werewolf: "Garou age as mortals do, but a Kinfolk family's records can hide a cub's strange birth.",
  mage: "The Technocracy keeps the best records of all, and reads them.",
  changeling: "A changeling's mortal life is real on paper; the fae self has none.",
  wraith: "A wraith has only a death certificate, and some want it changed.",
  hunter: "A hunter's own papers show every arrest, and every name given at one.",
  mummy: "A mummy's old selves are in museum archives and old registers.",
  demon: "The host's papers are the demon's papers now.",
  revenant: "The family's own records go back centuries and keep its secrets.",
  mortal: ""
};
