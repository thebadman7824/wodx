/**
 * WoDX Chronicle 0.25.0: the signature features of each clan, bloodline, tribe and the like (the Splat Features Desk,
 * approved by Ben 2026-11-12). One table per line; the rules that read it are in scripts/signature-rules.mjs.
 *
 * Mechanics only, in our own words. Page refs: "pdf" pages unless marked printed. V20 first, then V20 Dark Ages.
 * Rows marked house: true go past what the books say (Ben's notes on the desk, or a gap the book check found).
 */

/** Vampire clans and bloodlines. match: words that name the clan in a sheet's clan field or the bloodline flag. */
export const VAMPIRE = [
  {key: "toreador", label: "Toreador", match: ["toreador"], feature: "muse",
    title: "Muse and Obsession", page: "V20 pdf 75 (p. 67); V20 Dark Ages pdf 62 (p. 61)",
    text: "A person, work or place that entranced the Toreador can become a Muse. Each week away from it the Obsession track rises by one, and the Toreador's Self-Control roll against the next beautiful thing gets harder by the same amount. Seeing the Muse lowers it; owning it or making something for it lowers it more. Harm to a Muse who is a person raises it at once and calls for a frenzy check."},
  {key: "setite", label: "Followers of Set", match: ["setite", "followers of set", "follower of set", "set"], feature: "corruption",
    title: "Corruption ledger", page: "V20 pdf 61 (p. 53); V20 Dark Ages pdf 60 (p. 59); Path of Typhon V20 pdf 346 (p. 338)",
    text: "Each mortal or NPC the Setite works on gets a hidden Corruption track (0 to 5) with one named vice. A won seduction, persuasion, deceit or bribe raises it, and so does a gift of something that feeds the vice. Each step makes the victim's own resistance to the vice harder. At 3 the victim does small wrongs for the Setite; at 5 they belong to the Setite, ready to be taken as a retainer or ghoul, or used as leverage. Someone else (a priest, a hunter, a friend) can work the track down."},
  {key: "brujah", label: "Brujah", match: ["brujah"], feature: "cause",
    title: "The Cause and the Rant", page: "V20 pdf 59 (p. 51); V20 Dark Ages pdf 46 (p. 45)",
    text: "The Brujah holds a Cause, picked from the list or written by the player and approved by the Storyteller. When a scene goes against it, the Brujah rolls to keep their temper with the clan's +2 frenzy difficulty. Each success adds a point toward a Rant (three points): a gathering the Brujah can call that can turn a crowd into a mob."},
  {key: "gangrel", label: "Gangrel", match: ["gangrel"], feature: "marks",
    title: "Marks of the Beast", page: "V20 pdf 63 (p. 55); V20 Dark Ages pdf 50 (p. 49)", house: true,
    text: "Each frenzy leaves an animal mark with an edge and a cost. House rule: a mark lasts a month and then heals as a wound would. Wild animals treat a Gangrel as one of their own, and out of town Survival rolls to find earth to sleep in or to read tracks are one easier."},
];

/** Brujah causes (Ben 2026-11-12: a list to pick from, NPCs draw from it too). from/to: years the cause makes sense. */
export const CAUSES = [
  {key: "city", label: "The freedom of a city from its lord or Prince"},
  {key: "faith", label: "A faith, or a fight against one"},
  {key: "philosophy", label: "A philosophy of the Kindred (the old dream of Carthage, the Road of Humanity)"},
  {key: "people", label: "A people, a trade or a class held down by others"},
  {key: "grudge", label: "A grudge against a named elder"},
  {key: "learning", label: "Learning and its schools against those who would burn the books"},
  {key: "anarch", label: "The Anarch cause (house reading: from 1400)", from: 1400},
  {key: "nation", label: "A nation's freedom", from: 1776},
  {key: "workers", label: "The workers against their masters", from: 1830},
  {key: "equality", label: "Equal rights for all", from: 1848},
  {key: "counter", label: "Against the system: counterculture, punk, the street", from: 1955},
  {key: "net", label: "Free data and free nets against the corporations", from: 1985},
];

/** Setite vices: what feeds each one as a gift. Matched against a Library good's kind, its substance and the words of its name. */
export const VICES = [
  {key: "greed", label: "Greed", feeds: ["coin", "valuables", "money", "gold", "silver", "jewel"]},
  {key: "lust", label: "Lust", feeds: ["vice", "perfume", "silk"]},
  {key: "drink", label: "Drink", feeds: ["alcohol", "brandy", "wine", "ale", "beer", "mead", "vodka", "whisk", "gin", "rum", "slivovitz", "absinthe"]},
  {key: "drug", label: "A drug", feeds: ["drugs", "opium", "opiate", "laudanum", "stimulant", "cannabis", "hashish"]},
  {key: "pride", label: "Pride", feeds: ["cloth", "valuables", "keepsake", "fine", "portrait"]},
  {key: "revenge", label: "Revenge", feeds: ["arms", "poison", "knife", "dagger"]},
  {key: "gluttony", label: "Gluttony", feeds: ["food", "delicacy", "sweet"]},
  {key: "gambling", label: "Gambling", feeds: ["dice", "cards", "toys", "lottery"]},
];

/** What each step of the Corruption track means. */
export const CORRUPTION_STEPS = [
  "untouched",
  "tempted: the victim thinks of the vice more often",
  "indulging: the victim seeks it out",
  "compromised: the victim will do small wrongs for the Setite",
  "bound: the victim hides the Setite's secrets and lies for them",
  "owned: the victim belongs to the Setite (a retainer or ghoul, or leverage)",
];

/** Gangrel marks: edge and cost. Effects use the trait effect shapes other modules already read. */
export const MARKS = [
  {key: "ears", label: "Pointed, furred ears", edge: "+1 die to hearing rolls", cost: "-1 Appearance", effects: [{tags: ["hearing"], dice: 1}, {tags: ["appearance"], dice: -1}], sense: "sound"},
  {key: "eyes", label: "Animal eyes that shine", edge: "sees in near darkness (half the darkness penalty)", cost: "a Masquerade sign to mortals", effects: [{tags: ["sight"], dice: 1}], sense: "sight", sign: true},
  {key: "nose", label: "A muzzle or wet nose", edge: "+1 die to smell and tracking", cost: "-1 Appearance", effects: [{tags: ["smell", "tracking"], dice: 1}, {tags: ["appearance"], dice: -1}], sense: "smell"},
  {key: "fur", label: "Fur along the arms and back", edge: "no penalty from cold weather", cost: "-1 Appearance", effects: [{tags: ["cold"], dice: 1}, {tags: ["appearance"], dice: -1}]},
  {key: "claws", label: "Claws that don't retract", edge: "claws as natural weapons (Strength + 1 lethal, house rule)", cost: "-1 die to fine handwork", effects: [{tags: ["crafts", "larceny"], dice: -1}], weapon: true},
  {key: "tail", label: "A tail", edge: "+1 die to balance and climbing", cost: "a Masquerade sign to mortals", effects: [{tags: ["climb", "athletics"], dice: 1}], sign: true},
  {key: "teeth", label: "A mouth of animal teeth", edge: "+1 die to Intimidation", cost: "-1 Appearance, slurred speech", effects: [{tags: ["intimidation"], dice: 1}, {tags: ["appearance"], dice: -1}]},
];

export const DAY = 86400;
export const WEEK = 7 * DAY;
export const MARK_LASTS = 30 * DAY;
export const RANT_POINTS = 3;
export const OBSESSION_MAX = 5;
export const CORRUPTION_MAX = 5;
