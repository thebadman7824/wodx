/**
 * Standing before the law (B3614-B3615): the pure part. No Foundry here, so the harness can test it.
 *
 * The law has seldom treated everyone the same. This reads a character's social rank (WoDX NPC's rank ladders:
 * flags["wodx-npc"].rank) and says how that rank stands before the law of the land in a year: the unfree, the common
 * people, the clergy (benefit of clergy in England until 1827, church courts elsewhere until the codes), the nobility
 * (tried by their peers until the estates fell), and the wealthy of a modern age, whose money speaks. It shifts a
 * trial's difficulty, the weight of the sentence, and how high one may climb in the offices of the state.
 * A player character's gender never counts (B3500). How hard the chronicle leans on this is the world setting
 * lawStanding: "history" (the default), "softened" (trials and sentences only, no bar on offices) or "off".
 * The years are rounded history; the modifiers are house figures (docs/PENDING-REVIEW.md).
 */

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
export const MODES = {history: "As history: the law treats each standing as it did", softened: "Softened: standing shifts trials and sentences, but bars no one from office", off: "Off: everyone stands equal before the law"};

/** The class before the law of a rank word from WoDX NPC's ladders. */
const CLASS_OF = {
  unfree: ["Serf", "Slave", "Bonded labourer", "Bondservant", "Captive or bondsman", "Outcast"],
  clergy: ["Clergy", "Clergy or scholar", "Ulama", "Priestly family"],
  noble: ["Knight", "Lord", "Prince", "Noble", "Royal", "Boyar", "Ruling house", "Servitor noble", "Samurai", "Lord's house", "Court noble", "Imperial clan", "Gentry", "Scholar-official", "Officer of the state", "Notable", "Chief's kin"],
  wealthy: ["Wealthy", "Elite", "Corporate"]
};
export function classOf(rankWord = "") {
  for ( const [k, words] of Object.entries(CLASS_OF) ) if ( words.includes(String(rankWord)) ) return k;
  return "common";
}

/** The years each privilege or bar ends, by law family (null: never in this family; "*" for the rest). */
export const ENDS = {
  unfree: {latin: 1848, common: 1600, orthodox: 1861, islamic: 1900, "south-asia": 1950, chinese: 1910, japanese: 1871, african: 1900, americas: 1888, "*": 1900},
  clergy: {common: 1827, latin: 1800, orthodox: 1917, islamic: 1920, "*": 1900},
  noble: {latin: 1850, common: 1948, orthodox: 1917, islamic: 1923, "south-asia": 1950, chinese: 1912, japanese: 1871, "*": 1900}
};
const ended = (cls, family, year) => { const t = ENDS[cls]; if ( !t ) return true; const y = family in t ? t[family] : t["*"]; return y != null && n(year) >= y; };

/**
 * How a standing fares. Returns {cls, trialDiff, tierShift, officeCap, words}. officeCap: the highest rank index
 * (0-4) in the offices of the state, null for no bar.
 */
export function standingOf(rankWord, family, year, mode = "history") {
  const cls = classOf(rankWord);
  const out = {cls, trialDiff: 0, tierShift: 0, officeCap: null, words: ""};
  if ( mode === "off" ) return out;
  if ( cls === "wealthy" ) return {...out, trialDiff: -1, words: "Money buys the best advocates."};
  if ( cls === "common" ) return out;
  if ( ended(cls, family, year) ) return out;
  if ( cls === "unfree" ) Object.assign(out, {trialDiff: 2, tierShift: 1, officeCap: 0, words: "The unfree have little standing in court, and harsh sentences."});
  if ( cls === "clergy" ) Object.assign(out, {trialDiff: -1, tierShift: -1, words: "Clergy may claim the church's court, and its lighter hand."});
  if ( cls === "noble" ) Object.assign(out, {trialDiff: -2, tierShift: -1, words: "A noble is tried by peers, and spared the common gallows."});
  if ( mode === "softened" ) out.officeCap = null;
  return out;
}

/** The offices a bar applies to (WoDX Storyteller institution kinds). */
export const STATE_OFFICES = ["court", "ruler", "tax", "army", "council"];
/** The highest rank a character of this standing may reach in an institution of this kind (4 when unbarred). */
export const capFor = (standing, kind) => (standing?.officeCap != null && STATE_OFFICES.includes(kind) ? standing.officeCap : 4);

/** What standing means for each line (B3615), for the Storyteller. */
export const LINE_STANDING = {
  vampire: "A Kindred can take whatever standing a mortal name can be given, and the Ventrue are known to.",
  ghoul: "A ghoul often stands where the domitor puts them, and a domitor can lift them high.",
  werewolf: "Kinfolk families can hold any rank; the Garou themselves rarely care to.",
  mage: "The Order of Hermes and the Technocracy both know how far a title opens doors.",
  changeling: "The fae nobility's titles mean nothing to a mortal court, and a commoner of the fae may be a mortal noble.",
  wraith: "A wraith keeps the standing of the life it had, among the dead.",
  hunter: "A hunter of good standing is believed; a vagrant one is locked up.",
  mummy: "An ancient noble of Egypt is a nobody before a modern court.",
  demon: "The host's standing is the demon's way into society.",
  revenant: "Revenant families buy titles, and keep them for centuries.",
  mortal: ""
};
