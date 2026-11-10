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
      books: "Kindred, Garou and wraiths soak lethal with Stamina; mortals, mages (M20 p. 334), hunters and C20 changelings soak it only with armor.",
      settled: "Each target by its own line's book (row hit-between-lines).",
      basis: "line", status: "check", code: "wodx-combat profiles.js PROFILES.soak",
      refs: ["VtDA20 p. 345", "M20 p. 334", "Ghouls and Revenants p. 262"],
      check: "Demon: the Fallen and Mummy: the Resurrection: may Stamina soak lethal and aggravated damage? The code treats demons and mummies as Garou (Stamina against everything)."
    },
    {
      id: "soak-aggravated", topic: "Who soaks aggravated damage",
      lines: ["V20", "VtDA20", "W20", "DA:W", "Wr20"],
      books: "Kindred soak it with Fortitude only. Garou soak it with Stamina, except in Homid form in the Dark Ages (DA:W p. 102). Wraiths: armor only in the code (a house adaptation).",
      settled: "Each target by its own line's book; Werewolf by era.",
      basis: "line", status: "check", code: "wodx-combat rules.js soakPool; wodx-actions garou.js aggSoak",
      refs: ["B41", "VtDA20 p. 345", "DA:W p. 102"],
      check: "Wraith: The Oblivion 20th: may a wraith soak aggravated damage with Stamina, or only with an Arcanos? Give the page."
    },
    {
      id: "bashing-halved", topic: "Bashing damage halved after soak",
      lines: ["V20", "VtDA20", "KotE", "G&R"],
      books: "Kindred halve bashing after soak, rounding down (VtDA20 p. 345). Kuei-jin run on the Vampire sheet and so halve it too.",
      settled: "Kindred and elder ghouls halve it. Kuei-jin follow Kindred of the East.",
      basis: "line", status: "check", code: "wodx-combat rules.js damageAfterSoak",
      refs: ["VtDA20 p. 345"],
      check: "Kindred of the East: do the Kuei-jin halve bashing damage as the Kindred do? Give the page."
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
      books: "Kindred: aggravated, armor useless, only Fortitude soaks (VtDA20 p. 359, printed p. 221). The Fire or sunlight box in the combat window makes the hit aggravated for any target.",
      settled: "The target's book decides (row hit-between-lines). Until the pages are read, the box stays aggravated for every target and the Storyteller can untick it.",
      basis: "line", status: "check", code: "wodx-combat main.js damageProfile (fireSun)",
      refs: ["VtDA20 p. 359", "VtDA20 p. 221"],
      check: "V20 and W20: is fire aggravated or lethal for a mortal, and for a Garou? Give each page."
    },
    {
      id: "bite", topic: "Whose bite is aggravated",
      lines: ["V20", "VtDA20", "W20", "DA:W"],
      books: "Kindred fangs: Strength + 1 aggravated, after a hold (VtDA20 pp. 346-347). Garou by form (DA:W pp. 106-107; W20 p. 285). The combat window's plain Bite is aggravated for anyone.",
      settled: "Aggravated only for Kindred, and for shapechangers by form. Anyone else bites for lethal (house rule until the page is read).",
      basis: "line", status: "check", code: "wodx-combat rules.js UNARMED.bite, main.js attackUsable",
      refs: ["VtDA20 p. 346", "W20 p. 285", "DA:W p. 106"],
      check: "V20 maneuvers chart: does it limit the aggravated bite to vampires, and what does a mortal's or ghoul's bite do? Give the page."
    },
    {
      id: "claws", topic: "Claws from Disciplines",
      lines: ["V20", "VtDA20"],
      books: "Protean 2 grows aggravated claws. The code also lets Vicissitude 1 claw.",
      settled: "Only the power that the book says grows claws or bone weapons gives them, with the damage type the book gives.",
      basis: "v20", status: "check", code: "wodx-combat main.js attackUsable",
      refs: ["VtDA20 p. 347"],
      check: "V20 and VtDA20 Vicissitude: which level gives bone weapons or claws, and is their damage lethal or aggravated? Give the pages."
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
      books: "The code charges five blood and a day's rest in every era (VtDA20 p. 345).",
      settled: "By era: VtDA20 in the Dark Ages, V20 after.",
      basis: "era", status: "check", code: "wodx-actions rules.js planHealing",
      refs: ["VtDA20 p. 345"],
      check: "V20 core: the cost to heal one aggravated level (blood, Willpower, rest). Give the page."
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
      books: "The Delirium chart by Willpower (DA:W p. 97; W20 p. 263). The Storyteller picks who rolls.",
      settled: "Mortals and ghouls by the chart; Kinfolk and the other supernatural lines as W20 says.",
      basis: "line", status: "check", code: "wodx-actions garou-rules.js delirium",
      refs: ["DA:W p. 97", "W20 p. 263"],
      check: "W20: which beings are untouched by the Delirium (Kinfolk, vampires, ghouls, mages, changelings, wraiths)? Give the page."
    },
    {
      id: "mind-powers", topic: "One line's mind powers on another line",
      lines: ["V20", "M20", "DA:Fae", "HtR", "W20", "Wr20"],
      books: "Dominate fails on a fae whose Day or Night is at least the vampire's rating (DA:Fae p. 181). Hunters with enough Conviction are immune to mind-clouding powers (HtR). Countermagic and Disciplines: not read yet.",
      settled: "The target's book decides immunity; otherwise the power works by its own book.",
      basis: "house", status: "check", code: "wodx-actions fae-da-rules.js, hunter-rules.js",
      refs: ["B503", "DA:Fae p. 181"],
      check: "M20: can countermagic or a Mind shield resist Dominate or Thaumaturgy? V20: does Dominate work on a Garou or a mage? Give the pages."
    },
    {
      id: "initiative-celerity", topic: "Initiative and Celerity",
      lines: ["V20", "VtDA20", "W20"],
      books: "Initiative is Dexterity + Wits + a die in every line. VtDA20 Celerity adds its dots to Dexterity pools and buys actions at the end of the turn (pdf p. 203). The combat setting adds Celerity to Initiative in every era.",
      settled: "By era: VtDA20 in the Dark Ages, V20 after.",
      basis: "era", status: "check", code: "wodx-combat main.js celerityDice, macros/initiative.js",
      refs: ["VtDA20 pdf p. 203"],
      check: "V20 Celerity: does it add dice to Dexterity pools or to Initiative, or only buy extra actions? Give the page."
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
      books: "The books give Garou, mage and fae blood their own effects. Not read yet.",
      settled: "The drinker's book decides what the blood gives; the target's book decides what losing it does.",
      basis: "line", status: "check", code: "wodx-actions kindred-rules.js",
      refs: [],
      check: "V20: what does a vampire gain from Garou, mage or fae blood (blood points, risks)? Kindred of the East: Chi from a Garou. Give the pages."
    },
    {
      id: "paradox-witnesses", topic: "Paradox, Disciplines and supernatural witnesses",
      lines: ["M20", "DA:M", "V20", "W20"],
      books: "Disciplines and Gifts are not magick and draw no Paradox. Vulgar magick seen by Sleepers does.",
      settled: "Only Sleepers count as witnesses for Paradox; Kindred, Garou and the like do not.",
      basis: "line", status: "check", code: "wodx-actions m20-rules.js",
      refs: [],
      check: "M20: do vampires, Garou or other supernatural onlookers count as Sleeper witnesses for vulgar magick? Give the page."
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
