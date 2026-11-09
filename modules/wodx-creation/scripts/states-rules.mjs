/**
 * WoDX Creation 0.9.0: four more changes of state, pure rules (harness-tested). Mechanics from the book check in
 * research/book-checks/state-changes.md; pages are given as pdf / printed. Where the book is silent the choice is a
 * house rule and says so, and each is logged in docs/PENDING-REVIEW.md.
 *
 *   Revenant birth      V20 Ghouls and Revenants (printed = pdf - 1)
 *   The Chrysalis       Changeling: The Dreaming 20th (printed = pdf - 1)
 *   A Fallen in a host  Demon: The Fallen (printed = pdf - 1)
 *   The Second Breath   Kindred of the East (the offset drifts; pdf pages are given)
 */
const n = v => Math.max(0, Math.trunc(Number(v) || 0));

/* ------------------------------------------------------------------ */
/*  Revenant birth                                                     */
/* ------------------------------------------------------------------ */

/** The twelve revenant families: Disciplines and weakness in short (G&R Chapter Four). */
export const FAMILIES = {
  bratovich: {label: "Bratovich", disciplines: ["animalism", "fortitude", "vicissitude"], page: "pdf 91 / printed 90",
    weakness: "+2 difficulty to resist frenzy; Willpower cannot hold off a frenzy, but 1 point ends one."},
  dhabi: {label: "D'Habi", disciplines: ["presence", "obfuscate", "daimonion"], page: "pdf 93 / printed 92",
    weakness: "+2 difficulty on every Willpower roll."},
  ducheski: {label: "Ducheski", disciplines: ["auspex", "dominate", "thaumaturgy"], page: "pdf 95 / printed 94",
    weakness: "No Social Ability above 2."},
  enrathi: {label: "Enrathi", disciplines: ["dominate", "obfuscate", "potence"], page: "pdf 97 / printed 96",
    weakness: "Humanity no higher than 3, Conscience no higher than 2."},
  grimaldi: {label: "Grimaldi", disciplines: ["celerity", "dominate", "fortitude"], page: "pdf 99 / printed 98",
    weakness: "A Willpower roll at 7 to hold back scorn when there is a chance to boast of the family."},
  kairouan: {label: "Kairouan Brotherhood", disciplines: ["auspex", "celerity", "obfuscate"], page: "pdf 101 / printed 100",
    weakness: "The Slow Healing Flaw (V20 p. 483)."},
  obertus: {label: "Obertus", disciplines: ["auspex", "obfuscate", "vicissitude"], page: "pdf 103 / printed 102",
    weakness: "An Obsessive-Compulsive Derangement (the Narov line: Megalomania, and Dominate for Obfuscate)."},
  oprichniki: {label: "Oprichniki", disciplines: ["animalism", "obfuscate", "potence"], page: "pdf 105 / printed 104",
    weakness: "The Haunted Flaw (V20 p. 495), for good: a ghost laid to rest is followed by another."},
  rafastio: {label: "Rafastio", disciplines: ["animalism", "auspex", "thaumaturgy"], page: "pdf 107 / printed 106",
    weakness: "Disciplines follow the moon: new moon +2 difficulty, waxing or waning +1, full moon -1. The Embrace usually kills them."},
  rossellini: {label: "Rossellini", disciplines: ["dominate", "fortitude", "necromancy"], page: "pdf 109 / printed 108",
    weakness: "The Deathsight Flaw (V20 p. 494)."},
  anushin: {label: "Servants of Anushin-Rawan", disciplines: ["auspex", "obfuscate", "presence"], page: "pdf 111 / printed 110",
    weakness: "Acts as if Bound to the first of the founder's descendants met, for 10 nights less Willpower."},
  zantosa: {label: "Zantosa", disciplines: ["auspex", "presence", "vicissitude"], page: "pdf 113 / printed 112",
    weakness: "A Willpower roll after a strong pleasure, or obsession; no Willpower against powers that tempt with a new pleasure."}
};
export const DISC_LABEL = k => k === "dhabi" ? "D'Habi" : k[0].toUpperCase() + k.slice(1);

/**
 * A revenant's start (G&R pdf 117, 120-122, 126, 141 / printed 116, 119-121, 125, 140).
 *   way "standard": Potence 1 and one dot in a family Discipline; "alternate": no free Potence, two family Disciplines.
 *   picks: the family Disciplines chosen (one or two). Returns {disciplines: {key: dots}, blood, errors}.
 */
export function revenantStart({family, way = "standard", picks = []} = {}) {
  const F = FAMILIES[family];
  const errors = [];
  if ( !F ) return {disciplines: {}, blood: null, errors: ["Pick a family."]};
  const own = picks.filter(p => F.disciplines.includes(p));
  const want = way === "alternate" ? 2 : 1;
  const chosen = [...new Set(own)].slice(0, want);
  if ( chosen.length < want ) {
    for ( const d of F.disciplines ) if ( chosen.length < want && !chosen.includes(d) && !(way === "standard" && d === "potence") ) chosen.push(d);
  }
  const disciplines = {};
  if ( way !== "alternate" ) disciplines.potence = 1;
  for ( const d of chosen ) disciplines[d] = (disciplines[d] ?? 0) + 1;
  if ( own.length < picks.length ) errors.push("Only the family's own Disciplines can be taken at birth.");
  // The sample revenant: a pool of 10, starting at 1, made back at 1 a night (G&R pdf 141 / printed 140)
  return {disciplines, blood: {max: 10, start: 1, perNight: 1}, errors, family: F};
}

/* ------------------------------------------------------------------ */
/*  The Chrysalis                                                      */
/* ------------------------------------------------------------------ */

export const SEEMINGS = {childling: "Childling", wilder: "Wilder", grump: "Grump"};

/**
 * The Tempers after the Chrysalis (C20 pdf 145, 149 / printed 144, 148): Willpower 4, Glamour 4, Banality 3, with the
 * seeming's step (Childling +1 Glamour, Grump +1 Willpower, Wilder either). The mortal's Willpower, if higher, stays
 * (house rule; C20 builds the character fresh and says nothing of mortal Traits).
 */
export function chrysalisStart({willpower = 0, seeming = "childling", wilder = "glamour"} = {}) {
  let wp = Math.max(4, n(willpower)), glamour = 4;
  if ( seeming === "childling" ) glamour += 1;
  if ( seeming === "grump" ) wp += 1;
  if ( seeming === "wilder" ) { if ( wilder === "willpower" ) wp += 1; else glamour += 1; }
  return {willpower: Math.min(10, wp), glamour: Math.min(10, glamour), banality: 3, arts: 3, realms: 5, seeming: SEEMINGS[seeming] ? seeming : "childling"};
}

/* ------------------------------------------------------------------ */
/*  A Fallen taking a host                                             */
/* ------------------------------------------------------------------ */

/** The Houses: starting Torment and House lores (DtF House write-ups). */
export const HOUSES = {
  devils: {label: "Devils (Namaru)", torment: 4, lores: ["Celestials", "Flame", "Radiance"], page: "pdf 102 / printed 101"},
  scourges: {label: "Scourges (Asharu)", torment: 3, lores: ["Winds", "Awakening", "Firmament"], page: "pdf 110 / printed 109"},
  malefactors: {label: "Malefactors (Annunaki)", torment: 3, lores: ["Earth", "Forge", "Paths"], page: "pdf 108 / printed 107"},
  fiends: {label: "Fiends (Neberu)", torment: 3, lores: ["Light", "Patterns", "Portals"], page: "pdf 106 / printed 105"},
  defilers: {label: "Defilers (Lammasu)", torment: 3, lores: ["Longing", "Storms", "Transfiguration"], page: "pdf 100 / printed 99"},
  devourers: {label: "Devourers (Rabisu)", torment: 4, lores: ["Beast", "Flesh", "Wild"], page: "pdf 104 / printed 103"},
  slayers: {label: "Slayers (Halaku)", torment: 4, lores: ["Death", "Realms", "Spirit"], page: "pdf 112 / printed 111"}
};

/**
 * A Fallen in its first host (DtF pdf 125, 127-129 / printed 124, 126-128): Faith 3, Torment by House, Virtues 1 each
 * plus 3 to spend, Willpower the two highest Virtues added. The host's Conscience and Courage stand as the Virtues
 * the demon starts from, at most 3 each before the 3 dots (house rule: the book blends the two natures and leaves the
 * split to the player); Conviction starts at 1. Returns {faith, torment, virtues, willpower, toSpend}.
 */
export function fallenStart({house, conscience = 1, courage = 1} = {}) {
  const H = HOUSES[house] ?? HOUSES.devils;
  const virtues = {conscience: Math.min(3, Math.max(1, n(conscience))), conviction: 1, courage: Math.min(3, Math.max(1, n(courage)))};
  const top = Object.values(virtues).sort((a, b) => b - a);
  return {faith: 3, torment: H.torment, virtues, willpower: top[0] + top[1], toSpend: {virtues: 3, lore: 3}, house: H};
}
/** Willpower once the Virtue dots are spent: the two highest added (DtF pdf 129 / printed 128). */
export const fallenWillpower = v => { const t = [n(v.conscience), n(v.conviction), n(v.courage)].sort((a, b) => b - a); return t[0] + t[1]; };

/** Taking a new host (DtF pdf 260 / printed 259): the Willpower difficulty by the body. Null: no roll. */
export const HOST_TARGETS = {ordinary: {label: "An ordinary person", diff: 8}, thrall: {label: "One of the demon's thralls", diff: 6},
  willing: {label: "A willing thrall", diff: null}, object: {label: "An object that resonates with people", diff: 9}, attuned: {label: "An object that suits the demon, or is attuned", diff: 6}};
/** The result of a possession roll: successes against the difficulty, 1s cancelling. */
export function possession(target, dice = []) {
  const T = HOST_TARGETS[target] ?? HOST_TARGETS.ordinary;
  if ( T.diff === null ) return {taken: true, successes: null, botch: false, diff: null};
  const hits = dice.filter(d => d >= T.diff).length, ones = dice.filter(d => d === 1).length;
  const net = hits - ones;
  return {taken: net > 0, successes: Math.max(0, net), botch: hits === 0 && ones > 0, diff: T.diff};
}

/* ------------------------------------------------------------------ */
/*  The Second Breath                                                  */
/* ------------------------------------------------------------------ */

/**
 * A Kuei-jin risen (KotE pdf 70, 78, 82, 86): Yin and Yang 1 each with 4 to spend, Hun 1 and P'o 3, Dharma 1,
 * Chi equal to Yin and Yang, Disciplines 3 with one a Demon Art. Willpower starts at Hun and must reach 5; its most is
 * Hun + 5. The mortal's Willpower, if higher, stays up to that most (house rule; the book is silent on carrying over).
 */
export function secondBreathStart({willpower = 0} = {}) {
  const hun = 1, po = 3, yin = 1, yang = 1;
  const most = Math.min(10, hun + 5);
  return {yin, yang, hun, po, dharma: 1, chi: {yin, yang}, willpower: Math.min(most, Math.max(5, n(willpower))), willpowerMost: most,
    toSpend: {chi: 4, disciplines: 3}};
}
