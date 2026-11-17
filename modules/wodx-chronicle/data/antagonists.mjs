/**
 * WoDX Chronicle (Antagonist Lines Desk, B6670-B6709): the antagonist groups of every line, as data. No Foundry.
 * Read by the Fall ledger (signatures.mjs), WoDX NPC (servants, rivalries), WoDX Otherworlds (Wyrm corruption) and
 * WoDX Senses (the marks a foe leaves that the right sight can catch).
 *
 * Row: key, label, line, match (words on a sheet's clan, tribe, affiliation, kith, faction... that make a character
 * one of them), fall (the kind of Fall ledger they work on others, or null), end (the servant bond a victim who
 * reaches the last step falls into, as WoDX NPC's servant kinds), mark {sights, colour, words}, eras [{from, to,
 * name}] (years they are active and the name they go by then; null is open), page (the book that governs them).
 *
 * Dates come from the books where a book gives one, else from the history already in WoDX: each era says which.
 * Words are WoDX's own. G3 (B6672): one dated table per group, read by every system.
 */

/** Pentex: Premium Oil went public in 1916 and the Wyrm took its founder soon after (W20 pdf 463). It became
 *  Endron Oil around the First World War (W20 pdf 464), and the board made a holding company, Pentex, which was
 *  buying back stock by the Great Depression (W20 Book of the Wyrm pdf 47). Endron's year and Pentex's are house
 *  readings (1918, 1929): the books give no year. Settles the 1900 / 1913 clash (B6697). */
export const PENTEX_FROM = 1916;
export const PENTEX_NAMES = [{from: 1916, to: 1917, name: "Premium Oil"}, {from: 1918, to: 1928, name: "Endron Oil"}, {from: 1929, to: null, name: "Pentex"}];

/** The kinds of Fall ledger. step 3 and step 5 are what the track does in play (B6698). */
export const FALLS = {
  setite: {label: "Corruption (Followers of Set)", end: "cult", endWords: "belongs to the Setite: a cultist bound to them",
    page: "V20 pdf 61 (p. 53); Path of Typhon V20 pdf 346"},
  nephandi: {label: "Corruption (the Nephandi)", end: "cult", endWords: "is drawn into the Nephandus' cabal as a cultist, ready for the Caul",
    page: "M20 pdf 228-234; Book of the Fallen pdf 47-61"},
  wyrm: {label: "Wyrm taint", end: "fomor", endWords: "takes a Bane inside and becomes a fomor in the Wyrm's service",
    page: "W20 pdf 430-432; W20 Book of the Wyrm"},
  infernal: {label: "Corruption (an infernal patron)", end: "pact", endWords: "signs a pact and is bound to the patron's servant",
    page: "V20 pdf 394-403, 455; Guide to Infernalism (Revised) pdf 41-61"},
  apophis: {label: "Corruption (Apophis)", end: "cult", endWords: "joins a cult of the Devourer",
    page: "Mummy 2nd edition pdf 35-36; Mummy: The Resurrection"},
  yama: {label: "Corruption (a Yama King)", end: "pact", endWords: "is sworn to a Yama King's servant",
    page: "Kindred of the East pdf 86-87"},
  lammasu: {label: "Longing (the Defilers)", end: "pact", endWords: "is bound by Longing to the Defiler",
    page: "Demon: The Fallen, House of the Defilers"}
};

const ALL = [{from: null, to: null}];

export const ANTAGONISTS = [
  {key: "setite", label: "Followers of Set", line: "vampire", match: ["setite", "followers of set", "follower of set"], fall: "setite",
    mark: {sights: ["entropy"], colour: 0xc9a227, words: "a serpent's coil of vice"}, eras: ALL, page: "V20 pdf 61"},
  {key: "nephandi", label: "Nephandi", line: "mage", match: ["nephandi", "nephandus", "barabbi", "barabbus", "widderslainte", "k'llasshaa", "malfean nephand", "heralds of basilisk"], fall: "nephandi",
    mark: {sights: ["prime", "entropy"], colour: 0x7a1f8f, words: "tainted Resonance"}, eras: ALL, page: "M20 pdf 228-234"},
  {key: "marauder", label: "Marauders", line: "mage", match: ["marauder", "marauders"], fall: null,
    mark: {sights: ["prime", "correspondence"], colour: 0xff7ad9, words: "reality bends here"}, eras: ALL, page: "M20, the Marauders"},
  {key: "technocracy", label: "The Technocracy", line: "mage", match: ["technocracy", "technocratic", "order of reason", "iteration x", "new world order", "progenitor", "syndicate", "void engineer", "daedalean"], fall: null,
    mark: null, eras: [{from: null, to: 1324, name: "the Craftmasons and the first Daedaleans"}, {from: 1325, to: 1896, name: "the Order of Reason"}, {from: 1897, to: null, name: "the Technocratic Union"}],
    page: "M20 pdf 169 (the Order of Reason in the 14th century, the Union in the late 19th); years as WoDX's history has them"},
  {key: "wyrm", label: "Servants of the Wyrm", line: "werewolf", match: ["black spiral", "spiral dancer", "fomor", "fomori", "wyrm cult", "kumo", "kerasi", "bane"], fall: "wyrm",
    mark: {sights: ["penumbra"], colour: 0x9acd32, words: "the Wyrm's taint"}, eras: ALL, page: "W20 pdf 42-44, 430-439"},
  {key: "pentex", label: "Pentex", line: "werewolf", match: ["pentex", "endron", "premium oil", "first team"], fall: "wyrm",
    mark: {sights: ["penumbra"], colour: 0x9acd32, words: "the Wyrm's taint"}, eras: PENTEX_NAMES, page: "W20 pdf 463-464"},
  {key: "infernal", label: "Infernalists", line: "vampire", match: ["baali", "infernalist", "infernal", "devil worship", "earthbound"], fall: "infernal",
    mark: {sights: ["prime", "entropy"], colour: 0xb3261e, words: "a stain of the Pit"}, eras: ALL, page: "V20 pdf 394-403"},
  {key: "talmahera", label: "The Tal'Mahe'Ra", line: "vampire", match: ["tal'mahe'ra", "talmahera", "true black hand", "true hand"], fall: null,
    mark: null, eras: ALL, page: "V20 pdf 414-415; The Black Hand (Revised)"},
  {key: "akuma", label: "Akuma and the Yama Kings", line: "kuei-jin", match: ["akuma", "yama king", "devil-ridden"], fall: "yama",
    mark: {sights: ["entropy"], colour: 0x5b8f2a, words: "demon-tainted Chi"}, eras: ALL, page: "Kindred of the East pdf 86-87"},
  {key: "spectre", label: "Spectres", line: "wraith", match: ["spectre", "spectres", "doppelganger", "nephwrack", "shadow-eaten", "malfean"], fall: null,
    mark: {sights: ["shroud"], colour: 0x2b1036, words: "Oblivion clings to it"}, eras: ALL, page: "Wraith 20th pdf 409-431"},
  {key: "thallain", label: "Thallain and Fomorians", line: "changeling", match: ["thallain", "fomorian", "fomorians", "aithu", "beastie", "bodach", "boggart", "bogie", "ghast", "goblin", "kelpie", "lurk", "mandragora", "nasties", "night hag", "ogre", "sevartal", "skinwalker", "spriggan", "weeping wight"], fall: null,
    mark: {sights: ["chimerical"], colour: 0x4a2a5a, words: "a nightmare given form"}, eras: ALL, page: "Changeling 20th pdf 35, 41-42"},
  {key: "dauntain", label: "Dauntain", line: "changeling", match: ["dauntain"], fall: null,
    mark: {sights: ["chimerical"], colour: 0x9a9a9a, words: "Banality clings to them"}, eras: [{from: 1969, to: null, name: "the Dauntain"}],
    page: "Changeling 20th; from the Resurgence, as WoDX's fae history has it"},
  {key: "apepnu", label: "The Apepnu", line: "mummy", match: ["bane mummy", "bane mummies", "apepnu", "asekh-sen", "asekh sen", "children of apophis", "cult of apophis"], fall: "apophis",
    mark: {sights: ["entropy"], colour: 0x6b4f1d, words: "the Devourer's shadow"}, eras: ALL, page: "Mummy 2nd edition pdf 35-36"},
  {key: "inquisition", label: "The Inquisition", line: "hunter", match: ["inquisition", "inquisitor", "society of leopold"], fall: null,
    mark: null, eras: [{from: 1231, to: null, name: "the Inquisition"}], page: "Hunters Hunted II pdf 118-126; Dark Ages: Inquisitor"}
];

export const ANTAGONIST_KEYS = ANTAGONISTS.map(a => a.key);
