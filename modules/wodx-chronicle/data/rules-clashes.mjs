/**
 * Rules that compete between game lines, and how each is settled. One table for the whole chronicle; the crossover
 * referee reads it. Rules basis: V20 first, then Revised or 2nd edition, then the rest; nothing from 5th edition.
 *
 * Each row:
 *   id       short key
 *   topic    what is ruled
 *   lines    the lines whose books rule it differently
 *   books    what each book says, in a few words, with its page where the code already cites one
 *   settled  the ruling WoDX follows
 *   basis    v20 (V20 wins) | era (the book of the chronicle's era profile) | line (each character by its own book) |
 *            house (the books leave it open; a house rule, logged in DECISIONS and PENDING-REVIEW)
 *   status   settled (the code follows the ruling) | fixed (the code was changed to follow it) |
 *            check (the ruling stands but a page still has to be read on the PC; the question is in `check`)
 *   code     where it lives
 *   refs     decision numbers and book pages
 */
export default {
  version: 1,
  rows: [
    {
      id: "hit-between-lines", topic: "Whose book rules a hit between two lines",
      lines: ["all"],
      books: "Each line rules only its own creatures; no book rules a werewolf clawing a wraith or a mage shooting a changeling.",
      settled: "The attacker's book sets the damage type dealt (claws, fangs, a power, a weapon). The target's book sets the soak, halving and what the wound does. Banes (silver, cold iron, fire, sunlight) are the target's.",
      basis: "house", status: "settled", code: "wodx-combat rules.js soakPool, main.js damageProfile",
      refs: ["B500", "VtDA20 p. 345", "W20 p. 148"]
    },
    {
      id: "soak-lethal", topic: "Who soaks lethal damage with Stamina",
      lines: ["V20", "W20", "M20", "C20", "HtR", "Wr20", "DtF", "MtR", "KotE"],
      books: "Kindred, Garou, wraiths and mummies soak lethal with Stamina (Mummy: the Resurrection pdf 130 / p. 136). Mortals, mages (M20 p. 334), hunters and C20 changelings soak it only with armor. A demon soaks lethal only in the apocalyptic form (DtF pdf 172 / p. 171).",
      settled: "Each target by its own line's book. Demons and mummies now have their own soak models instead of the Garou one.",
      basis: "line", status: "fixed", code: "wodx-combat profiles.js PROFILES.soak, rules.js soakPool (demon, mummy)",
      refs: ["B524", "VtDA20 p. 345", "M20 p. 334", "DtF p. 171", "MtR p. 136", "Ghouls and Revenants p. 262"]
    },
    {
      id: "soak-aggravated", topic: "Who soaks aggravated damage",
      lines: ["V20", "VtDA20", "W20", "DA:W", "Wr20"],
      books: "Kindred soak it with Fortitude only. Garou soak it with Stamina, except in Homid form in the Dark Ages (DA:W p. 102). Wraiths soak it only with armor or certain Arcanoi (Wraith 20th pdf 393 / p. 400; Argos p. 224, Embody p. 232, Inhabit p. 246). Mummies only through Hekau (MtR p. 136); demons only through a power (DtF pdf 248 / p. 247).",
      settled: "Each target by its own line's book; Werewolf by era. A power that grants aggravated soak is added by hand as soak bonus.",
      basis: "line", status: "fixed", code: "wodx-combat rules.js soakPool; wodx-actions garou.js aggSoak",
      refs: ["B41", "VtDA20 p. 345", "DA:W p. 102", "Wraith 20th p. 400", "DtF p. 247", "MtR p. 136"]
    },
    {
      id: "bashing-halved", topic: "Bashing damage halved after soak",
      lines: ["V20", "VtDA20", "KotE", "G&R"],
      books: "Kindred halve bashing after soak, rounding down (VtDA20 p. 345). The KotE core is silent; the Kindred of the East Companion says dhampyrs, unlike true vampires, do not halve bashing (pdf 32 / p. 31), so the Kuei-jin do.",
      settled: "Kindred, Kuei-jin and elder ghouls halve it.",
      basis: "line", status: "settled", code: "wodx-combat rules.js damageAfterSoak",
      refs: ["VtDA20 p. 345", "KotE Companion p. 31"]
    },
    {
      id: "fae-soak-era", topic: "Fae soak and cold iron, Dark Ages against later eras",
      lines: ["DA:Fae", "C20"],
      books: "DA:Fae: in the mien a fae soaks lethal damage (p. 104); cold iron is aggravated in every form but can be soaked (p. 88). C20: cold iron is aggravated and Stamina gives no soak against it.",
      settled: "A Dark Ages fae (the sheet's own choice, an Origin, or the era) soaks as DA:Fae; every other fae as C20.",
      basis: "era", status: "fixed", code: "wodx-combat rules.js soakPool (lethalSoak, baneSoak); wodx-actions main.js faeSoak",
      refs: ["B501", "DA:Fae p. 88", "DA:Fae p. 104"]
    },
    {
      id: "silver", topic: "Silver against shapechangers",
      lines: ["W20", "DA:W"],
      books: "W20: aggravated and unsoakable except in breed form (p. 255). DA:W: in breed form soaked at 6 and the rest lethal (p. 102). Metis: always unsoakable.",
      settled: "By era, breed and form, as the books say.",
      basis: "era", status: "settled", code: "wodx-actions garou-rules.js baneEffect",
      refs: ["B41", "W20 p. 255", "DA:W p. 102"]
    },
    {
      id: "fire", topic: "Fire against creatures other than the Kindred",
      lines: ["V20", "W20", "M20", "C20", "Wr20", "HtR"],
      books: "Kindred: aggravated, armor useless, only Fortitude soaks (VtDA20 p. 359, printed p. 221). V20: a mortal takes aggravated damage, fire included, as lethal (pdf 293 / p. 285; fire chart pdf 305 / p. 297). W20: fire is always aggravated for Garou, ignores armor, and is soaked at a difficulty set by its heat (pdf 257 / p. 255, pdf 260 / p. 258).",
      settled: "The Fire box makes the hit aggravated; a mortal or ghoul takes it as lethal, as the combat card already does. The heat difficulty comes from the Fire window.",
      basis: "line", status: "settled", code: "wodx-combat main.js damageProfile (fireSun)",
      refs: ["VtDA20 p. 359", "VtDA20 p. 221", "V20 p. 285", "W20 p. 255", "W20 p. 258"]
    },
    {
      id: "bite", topic: "Whose bite is aggravated",
      lines: ["V20", "VtDA20", "W20", "DA:W"],
      books: "The aggravated bite is for vampires and other creatures with fangs, such as werewolves, after a clinch, hold or tackle (V20 pdf 284 / p. 276). The book gives no rule for a mortal's or ghoul's bite.",
      settled: "Aggravated for Kindred, and for shapechangers by form. Anyone else bites for bashing damage, as a punch (house rule).",
      basis: "line", status: "fixed", code: "wodx-combat main.js weapon list (bite)",
      refs: ["B520", "V20 p. 276", "W20 p. 285", "DA:W p. 106"]
    },
    {
      id: "claws", topic: "Claws from Disciplines",
      lines: ["V20", "VtDA20"],
      books: "Protean 2 grows aggravated claws. Vicissitude's Bonecraft (3) grows bone spikes or talons that do lethal damage (V20 pdf 250 / p. 242; VtDA20 Bone Craft, Strength + 1 lethal, pdf 269 / p. 268). Chiropteran Marauder's claws do Strength + 2 aggravated (V20 p. 242; VtDA20 p. 270). The code let Vicissitude 1 claw for aggravated damage.",
      settled: "Protean 2: aggravated claws. Vicissitude 3: bone talons for lethal. Higher forms by their own power.",
      basis: "v20", status: "fixed", code: "wodx-combat main.js attackUsable",
      refs: ["V20 p. 242", "VtDA20 p. 268", "VtDA20 p. 270"]
    },
    {
      id: "healing", topic: "Healing",
      lines: ["V20", "VtDA20", "W20", "Wr20", "DtF", "MtR", "KotE", "M20"],
      books: "Kindred: a blood a level (VtDA20 pp. 340, 345). Garou: a level a turn on a Stamina roll, not in breed form for homids and lupus. Wraiths: Pathos (Wr20 p. 295). Demons: Faith, never aggravated (DtF pp. 171, 248). Mummies: the mortal chart one level better (MtR p. 136). Kuei-jin: Chi for blood (KotE p. 145). Mortals: VtDA20 p. 352.",
      settled: "Each character heals by its own line's book.",
      basis: "line", status: "settled", code: "wodx-actions *-rules.js",
      refs: ["VtDA20 p. 340", "VtDA20 p. 345", "VtDA20 p. 352", "DtF p. 171", "MtR p. 136", "KotE p. 145"]
    },
    {
      id: "aggravated-heal-cost", topic: "What a vampire pays to heal an aggravated wound",
      lines: ["V20", "VtDA20"],
      books: "V20: a full day's rest and five blood for one level; each further level healed that day costs five more blood and a Willpower point (pdf 293 / p. 285). VtDA20: five blood and a day's rest a level (p. 345).",
      settled: "By era: in the Dark Ages five blood a level; after, V20's extra Willpower point for each level past the first.",
      basis: "era", status: "fixed", code: "wodx-actions main.js (the healing window)",
      refs: ["V20 p. 285", "VtDA20 p. 345"]
    },
    {
      id: "willpower-back", topic: "How Willpower comes back",
      lines: ["V20", "VtDA20", "W20", "M20", "C20", "Wr20", "HtR", "DtF"],
      books: "Acting by Nature gives a point back (V20 p. 267, pdf 275). The books differ on a nightly point and on the end of a story.",
      settled: "One rule for the whole table: the chronicle's Willpower setting (a point a night, at the end of the story, or off), the same for every line, plus a point for acting by Nature.",
      basis: "house", status: "settled", code: "wodx-storyteller upkeep-rules.mjs betweenPlan",
      refs: ["B502", "V20 p. 267", "VtDA20 p. 340"]
    },
    {
      id: "frenzy-rage", topic: "Frenzy, Rage, the P'o and Bedlam",
      lines: ["V20", "VtDA20", "W20", "KotE", "C20"],
      books: "Kindred frenzy on Self-Control or Instinct (VtDA20 p. 357). Garou frenzy on Rage successes. Kuei-jin on the P'o. Changelings on Bedlam.",
      settled: "Each line keeps its own. A creature of another line can be a provocation (a Crinos for a Kindred, fire for anyone), named by the Storyteller.",
      basis: "line", status: "settled", code: "wodx-actions rules.js, garou-rules.js, kote-rules.js, voice-rules.js",
      refs: ["B53", "VtDA20 p. 357"]
    },
    {
      id: "delirium", topic: "Who suffers the Delirium",
      lines: ["W20", "DA:W", "V20", "M20", "C20"],
      books: "Kinfolk are untouched (W20 pdf 48 / p. 46, p. 377). Mages and vampires are normally immune; only Garou and Fera resist even the Gift that forces it (pdf 162 / p. 160). The books say nothing of ghouls, changelings or wraiths.",
      settled: "Mortals and ghouls roll on the chart. Kinfolk, Garou and Fera are immune; vampires, mages, changelings and wraiths are immune too unless a power forces the Delirium (house rule for the last three).",
      basis: "line", status: "settled", code: "wodx-actions garou-rules.js delirium",
      refs: ["B521", "DA:W p. 97", "W20 p. 263", "W20 p. 46", "W20 p. 160"]
    },
    {
      id: "mind-powers", topic: "One line's mind powers on another line",
      lines: ["V20", "M20", "DA:Fae", "HtR", "W20", "Wr20"],
      books: "Dominate fails on a fae whose Day or Night is at least the vampire's rating (DA:Fae p. 181). V20 lists who resists Dominate (lower Generation, True Faith, Nature) but not Garou or mages (pdf 166 / p. 158); Faith 2 lets a mortal resist by spending Willpower (pdf 380 / p. 372). M20: a mage counters a Discipline with Arete, and the Storyteller may ask for Mind against Dominate; Night-Folk counter magick with Wits + Occult, capped by their own power trait (pdf 547 / p. 546).",
      settled: "The target's book decides. A Garou resists Dominate as a mortal does, with Willpower; a mage counters it as M20 says, with Mind 1 required (house rule for both). Otherwise the power works by its own book.",
      basis: "house", status: "settled", code: "wodx-actions fae-da-rules.js, hunter-rules.js",
      refs: ["B503", "DA:Fae p. 181", "V20 p. 158", "V20 p. 372", "M20 p. 546"]
    },
    {
      id: "initiative-celerity", topic: "Initiative and Celerity",
      lines: ["V20", "VtDA20", "W20"],
      books: "Initiative is Dexterity + Wits + a die in every line. V20 Celerity adds a die to Dexterity rolls; a blood point buys extra actions, dots so used add no dice that turn, and nothing goes to Initiative (pdf 150 / p. 142). VtDA20 Celerity: extra actions at the end of the turn (pdf p. 203).",
      settled: "Celerity never adds to Initiative, in any era: V20 says so, and V20 comes first while no VtDA20 page says otherwise. It still adds dice to Dexterity attack and defense pools.",
      basis: "era", status: "fixed", code: "wodx-combat main.js rollInitiative",
      refs: ["B523", "V20 p. 142", "VtDA20 pdf p. 203"]
    },
    {
      id: "extra-actions", topic: "Extra actions from Celerity, Rage and Time",
      lines: ["V20", "VtDA20", "W20", "M20"],
      books: "Celerity actions come at the end of the turn (VtDA20 pdf p. 203). Rage actions come after everyone's normal turn, in Initiative order (W20 pdf p. 268).",
      settled: "All extra actions, from any line, resolve in one pass after the normal turns, highest Initiative first.",
      basis: "house", status: "settled", code: "wodx-combat conductor-rules.js",
      refs: ["B500", "VtDA20 pdf p. 203", "W20 pdf p. 268"]
    },
    {
      id: "umbra", topic: "The spirit world",
      lines: ["Wr20", "W20", "M20"],
      books: "Each line draws its own Umbra.",
      settled: "One Umbra: Wraith first, then Werewolf, then Mage.",
      basis: "house", status: "settled", code: "wodx-otherworlds",
      refs: ["B31"]
    },
    {
      id: "ghouls", topic: "Ghouls and revenants",
      lines: ["V20", "VtDA20", "G&R"],
      books: "V20 Ghouls and Revenants and VtDA20 differ on blood, aging and costs.",
      settled: "V20 Dark Ages ghoul rules in every era; experience by VtDA20 p. 399 for Disciplines and Ghouls and Revenants p. 139 for the rest.",
      basis: "house", status: "settled", code: "wodx-creation",
      refs: ["B22", "B28", "B133", "VtDA20 p. 399", "Ghouls and Revenants p. 139"]
    },
    {
      id: "hunters-by-era", topic: "Hunters across eras",
      lines: ["VtDA20", "HH2", "HtR"],
      books: "Inquisitors, Hunters Hunted II and Hunter: The Reckoning each rule hunters differently.",
      settled: "Inquisitors in the Dark Ages, Hunters Hunted II until 1998, Hunter: The Reckoning from 1999.",
      basis: "era", status: "settled", code: "wodx-actions hunter-rules.js, reckoning-rules.js",
      refs: ["B42"]
    },
    {
      id: "xp-costs", topic: "Experience costs",
      lines: ["all"],
      books: "Each line has its own cost chart.",
      settled: "Each character pays by its own line's chart (by era for Vampire and Werewolf). A trait from another line, such as a Kinfolk's Gift or a mortal's Numina, costs what the book that teaches it charges an outsider; with no such price, the buyer's own chart for its nearest trait.",
      basis: "house", status: "settled", code: "wodx-creation xp.mjs, actor-data.mjs",
      refs: ["B22", "B437", "B504"]
    },
    {
      id: "health-tracks", topic: "Health for ghosts and spirits",
      lines: ["Wr20", "W20", "M20"],
      books: "Wraiths count Corpus; spirits count Essence; the combat window works on the seven health levels.",
      settled: "The seven levels stand in for Corpus and Essence in a fight (a house adaptation already in the code).",
      basis: "house", status: "settled", code: "wodx-combat rules.js (wraith and spirit soak)",
      refs: ["B505", "Wraith 20th p. 292"]
    },
    {
      id: "feeding-supernatural", topic: "Drinking the blood of another line",
      lines: ["V20", "W20", "M20", "C20", "KotE"],
      books: "V20: Garou blood gives two blood points for each one drunk, and while it is in the system each point raises frenzy and Rötschreck difficulties by 1 (pdf 388 / p. 380). V20 says nothing of mage or fae blood. KotE: shapeshifters hold concentrated Chi, which they call Gnosis (pdf 7 / p. 9), with no rule for drinking it.",
      settled: "Garou blood as V20 says. Mage blood is ordinary blood (house rule). Fae blood is a potent drug to Kindred in every era: the Glamour in it brings hallucinations and waking dreams for a scene a point drunk, and pools drop by 1 to 3 (house rule); a Dark Ages fae's Court gift (VtDA20 p. 181) comes on top. A Kuei-jin drawing Chi from a Garou gains two Chi a point, as V20's werewolf blood, and the same frenzy step (house rule).",
      basis: "line", status: "settled", code: "wodx-actions kindred-rules.js",
      refs: ["B522", "B525", "V20 p. 380", "KotE p. 9"]
    },
    {
      id: "paradox-witnesses", topic: "Paradox, Disciplines and supernatural witnesses",
      lines: ["M20", "DA:M", "V20", "W20"],
      books: "The Night-Folk and their circles (vampires, Garou, ghouls, Kinfolk, kinain, cultists, mummies, hunters) do not count as Sleeper witnesses (M20 pdf 532 / p. 531). Disciplines and Gifts are not magick and draw no Paradox.",
      settled: "Only Sleepers count as witnesses for Paradox.",
      basis: "line", status: "settled", code: "wodx-actions m20-rules.js",
      refs: ["M20 p. 531"]
    },
    {
      id: "chimerical", topic: "Chimerical damage and Banality",
      lines: ["C20", "DA:Fae"],
      books: "Chimerical damage harms only the enchanted (C20). Cold iron wielded is a Banality trigger.",
      settled: "C20 from its era; DA:Fae in the Dark Ages.",
      basis: "era", status: "settled", code: "wodx-actions c20-rules.js, fae-da-rules.js",
      refs: ["B501"]
    },
    {
      id: "wraith-living", topic: "Wraith powers on the living",
      lines: ["Wr20", "VtDA20"],
      books: "Wraith: The Great War and the Dark Ages books rule the Shroud and Arcanoi differently.",
      settled: "Wraith 20th in every era.",
      basis: "house", status: "settled", code: "wodx-actions wraith-rules.js",
      refs: ["B43"]
    },
    {
      id: "possession", topic: "Two possessors in one body",
      lines: ["DtF", "Wr20", "W20", "M20"],
      books: "Demon possession, Puppetry and spirit possession each rule their own; none says what happens when two meet in one body.",
      settled: "The one already inside holds the body. A newcomer must win a resisted Willpower roll against it (difficulty 6 each); a tie keeps the first.",
      basis: "house", status: "settled", code: "the Storyteller rolls it; no code yet",
      refs: ["B506"]
    },
    {
      id: "cp2020", topic: "Cyberpunk 2020 numbers in a Storyteller game",
      lines: ["CP2020", "WoFD"],
      books: "Cyberpunk 2020 rolls six- and ten-sided Interlock dice; the Storyteller system rolls pools of ten-sided dice.",
      settled: "Only Cyberpunk 2020 gear and soak values are used, converted in the gear library; Interlock rolls are never used.",
      basis: "house", status: "settled", code: "wodx-library data/gear.json",
      refs: ["B128"]
    }
  ]
};
