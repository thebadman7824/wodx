/**
 * Renown from play (B7879-B7882): the deeds that win or cost a werewolf Renown, the Litany, and the rank challenges.
 * Pure data and rules; garou.js and WoDX Storyteller's sept window read them.
 *
 *   DEEDS: the sample awards of Dark Ages: Werewolf pp. 98-99, in WoDX's own words. Each deed moves one or more of
 *   Glory, Honor and Wisdom by the book's number. Some deeds the game can see (a fox frenzy, a month of chores, a
 *   missed moot, a rite learned); those raise a suggestion the Storyteller confirms, because Renown is earned only when
 *   others hear of the deed (p. 98).
 *   A deed that costs seven or more in one category is a crime, punished by the sept beyond the lost Renown (p. 98).
 *   LITANY: the thirteen tenets (pp. 31-33). A breach the book prices in the award table carries that price; the rest
 *   are the sept's to judge (WoDX's reading, B7881).
 *   RANK_CHALLENGES: the sample challenges a benefactor may set (p. 101).
 */

export const REF = "Dark Ages: Werewolf";
export const RENOWN = ["glory", "honor", "wisdom"];
export const CRIME = -7;

/** Sample Renown awards, DA:W pp. 98-99. id: {label, d: {glory, honor, wisdom}}. */
export const DEEDS = {
  // Glory
  "brave": {label: "Proving bravery in a routine matter, or taking part in a just challenge", d: {glory: 1}},
  "wound-won": {label: "Surviving an incapacitating wound in a battle the pack won", d: {glory: 2}},
  "average-threat": {label: "Defeating an average threat, or surviving a hostile Umbral realm", d: {glory: 3}},
  "strong-threat": {label: "Defeating a strong threat, or dying in defence of a caern", d: {glory: 5}},
  "mighty-threat": {label: "Defeating a very powerful threat, or giving one's life to save a caern and its defenders", d: {glory: 7}},
  "caern-overrun": {label: "Not stopping the Wyrm from overrunning a caern", d: {glory: -3}},
  "coward-death": {label: "Cowardice that costs another Garou's life", d: {glory: -5}},
  // Honor
  "guard": {label: "Helping guard a caern", d: {honor: 1}},
  "chores-month": {label: "A month of regular duties and chores for the sept", d: {honor: 1}},
  "moot-rite": {label: "Performing a moot or punishment rite, or protecting a helpless human", d: {honor: 2}},
  "mediate": {label: "Settling a serious dispute fairly, or covering up what might show the Garou to humans", d: {honor: 3}},
  "truthful": {label: "Telling the truth in great adversity, or protecting a helpless wolf", d: {honor: 5}},
  "torture": {label: "Enduring torture to protect fellow Garou", d: {honor: 7}},
  "no-leave": {label: "Speaking at a moot without leave, failing a helpless human, or speaking ill of an allied tribe", d: {honor: -1}},
  "chores-failed": {label: "Failing the sept's duties and chores in the last month, or failing a helpless wolf", d: {honor: -2}},
  "unjust-challenge": {label: "An unjust challenge, or leaving one's post on watch", d: {honor: -3}},
  "veil": {label: "Tearing the Veil, or failing a helpless Garou", d: {honor: -5}},
  // Wisdom
  "rite-learned": {label: "Learning a new rite, making a talen, or healing a Garou of another pack for nothing", d: {wisdom: 1}},
  "good-advice": {label: "Good advice, finding a fetish by the signs, or summoning an Incarna's avatar", d: {wisdom: 2}},
  "taint-proved": {label: "Proving a place or thing Wyrm-tainted, a spirit quest done, or a riddle contest won", d: {wisdom: 3}},
  "prophecy": {label: "A warning that comes true, or ending a great threat with no Garou badly hurt", d: {wisdom: 5}},
  "lost-caern": {label: "Finding a lost caern, or finding or making a new Gift", d: {wisdom: 7}},
  "frenzy": {label: "Suffering a frenzy", d: {wisdom: -1}},
  "missed-moot": {label: "Missing a sept moot", d: {wisdom: -1}},
  "kin-relations": {label: "Bad relations with the Kinfolk nearby, or attacking a far stronger force alone", d: {wisdom: -3}},
  "fetish-broken": {label: "Breaking a powerful and needed fetish by accident", d: {wisdom: -5}},
  // Deeds that sit in more than one table
  "fox-frenzy": {label: "A fox frenzy (it is a frenzy too)", d: {glory: -1, wisdom: -1}},
  "refuse-office": {label: "Refusing a sept position", d: {glory: -1, honor: -2, wisdom: -1}}
};
/** The page each deed comes from. */
export const deedPage = () => "pp. 98-99";

export function deedById(id) { return DEEDS[id] ? {id, ...DEEDS[id], d: {...DEEDS[id].d}} : null; }

/** A deed's deltas as a short line: "Glory -1, Wisdom -1". */
export function deltaLine(d = {}) {
  return RENOWN.filter(k => Number(d[k])).map(k => `${k[0].toUpperCase()}${k.slice(1)} ${d[k] > 0 ? "+" : ""}${d[k]}`).join(", ");
}

/** A crime: seven or more lost in one category for one deed (p. 98). Returns the categories. */
export function crimeIn(d = {}) { return RENOWN.filter(k => Number(d[k]) <= CRIME); }

/** The Litany (pp. 31-33), each with the deed that prices a breach, where the award table gives one (B7881). */
export const LITANY = [
  {id: "mate", text: "Garou shall not mate with Garou", deed: null},
  {id: "wyrm", text: "Combat the Wyrm wherever it dwells and whenever it breeds", deed: "caern-overrun"},
  {id: "territory", text: "Respect the territory of another", deed: "no-leave"},
  {id: "surrender", text: "Accept an honorable surrender", deed: "unjust-challenge"},
  {id: "submit", text: "Submit to those of higher station", deed: "no-leave"},
  {id: "kill", text: "The first share of the kill for the greatest in station", deed: "no-leave"},
  {id: "flesh", text: "You shall not eat the flesh of humans", deed: null},
  {id: "beneath", text: "Respect those beneath you; all are of Gaia", deed: "no-leave"},
  {id: "veil", text: "The Veil shall not be lifted", deed: "veil"},
  {id: "sickness", text: "Do not suffer your people to tend your sickness", deed: null},
  {id: "peace", text: "The leader may be challenged at any time during peace", deed: "unjust-challenge"},
  {id: "war", text: "The leader may not be challenged during wartime", deed: "unjust-challenge"},
  {id: "caern", text: "You shall take no action that causes a caern to be violated", deed: "caern-overrun"}
];
export const LITANY_PAGES = "pp. 31-33";

/** The sample rank challenges a benefactor sets (p. 101). */
export const RANK_CHALLENGES = [
  "Win a fistfight against the benefactor in Homid form",
  "Find a hidden fetish within a day",
  "Beat the benefactor in a fight with smiths' hammers",
  "Bear harsh torment without a sound",
  "Climb a mountain and bring a stone from its top within twelve hours",
  "Make a hymn to Gaia on the spot, fine enough to move all who hear it",
  "Bring the elder the body of a powerful Wyrm creature within a month",
  "Make a fetish with a power no Garou of the sept has seen",
  "Settle a dispute between two of the sept's packs",
  "Bring ten pounds of gold to the caern as chiminage within a day, breaking no human law"
];

/** A challenge the benefactor picks (any of the samples; `pick` is an index or a random draw). */
export function rankChallenge(pick = null, rng = Math.random) {
  const i = Number.isInteger(pick) && pick >= 0 && pick < RANK_CHALLENGES.length ? pick : Math.floor(rng() * RANK_CHALLENGES.length);
  return RANK_CHALLENGES[i];
}

/** What a frenzy costs (p. 99): every frenzy a point of Wisdom; a fox frenzy also a point of Glory. */
export const frenzyDeed = kind => (kind === "fox" ? "fox-frenzy" : "frenzy");

/**
 * The suggestion a deed from play raises, for the Storyteller's approval queue.
 * @returns {{type, key, title, detail, data}}
 */
export function deedProposal(actor, deedId, {why = "", key = null, day = 0} = {}) {
  const deed = deedById(deedId);
  if ( !deed || !actor ) return null;
  const crime = crimeIn(deed.d);
  return {type: "wodx-actions.renown", key: key ?? `renown:${actor.id}:${deedId}:${day}`,
    title: `${actor.name}: ${deedId === "rite-learned" || Object.values(deed.d).some(v => v > 0) ? "Renown for" : "Renown lost for"} ${deed.label.toLowerCase()}`,
    detail: `${deltaLine(deed.d)}${why ? `: ${why}` : ""}. Only if others hear of it (${REF} ${deedPage()}).${crime.length ? " A crime: the sept punishes it beyond the lost Renown (p. 98)." : ""}`,
    data: {actorId: actor.id, deed: deedId, d: deed.d, why}};
}
