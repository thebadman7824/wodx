/**
 * The crossover referee's cases: what happens when one line's power meets a creature of another line. Each case
 * rests on a row of rules-clashes.mjs (`clash`) and gives the ruling for one kind of meeting. The referee
 * (scripts/referee-rules.mjs) picks the cases that fit who acts, on whom, and the era's book.
 *
 * Each case:
 *   id       short key
 *   power    the kind of meeting (POWERS below)
 *   from     the acting line(s), Combat profile keys, or "any"
 *   to       the target line(s), or "any"
 *   book     "da" (the Dark Ages books: Dark Ages, Long Night and earlier) | "late" (every later era) | absent (all)
 *   needs    an extra condition on the target: "faith" (True Faith above 0), "faith3", "faith4"
 *   ruling   what happens, in a sentence or two
 *   test     what the referee works out or offers to roll (referee-rules.mjs testFor)
 *   refs     book pages (printed) and decision numbers
 *   status   settled | check (the ruling is a draft until the page is read on the PC; `check` holds the question)
 *
 * Rules basis: V20 first, then Revised or 2nd edition, then the rest; nothing from 5th edition.
 */

export const LINES = {
  kindred: "Kindred", ghoul: "Ghoul or revenant", mortal: "Mortal", hunter: "Hunter", lupine: "Garou or Fera",
  mage: "Mage or sorcerer", fae: "Changeling or fae", wraith: "Wraith or ghost", spirit: "Spirit or spectre",
  beast: "Beast", demon: "Demon", mummy: "Mummy", exalted: "Exalted"
};

export const POWERS = {
  mind: "Dominate or another mind power",
  emotion: "Presence or another emotion power",
  sight: "Auspex or a sense power against Obfuscate",
  counter: "Countermagick against a power",
  unmagic: "Resisting a mage's magick",
  drink: "Drinking another line's blood",
  ghoul: "Making a ghoul",
  delirium: "The Delirium",
  hit: "A blow between lines",
  frenzy: "Provoking frenzy",
  witness: "Witnesses to vulgar magick",
  possess: "Possession",
  wraith: "Wraith powers on the living",
  umbra: "Crossing into the spirit world"
};

const NIGHT_FOLK = ["kindred", "ghoul", "lupine", "fae", "wraith", "spirit", "demon", "mummy", "exalted", "hunter"];

export const CASES = [
  /* Mind powers */
  {id: "mind-faith-da", power: "mind", from: ["any"], to: ["any"], book: "da", needs: "faith",
    ruling: "True Faith shields the target. At Faith 3 or more, Dominate, Dementation, Chimerstry, Obfuscate and other mind-clouding powers do nothing. Below that, the target may spend 1 Willpower: their Faith comes off the power's successes (doubled against the Daimoinon).",
    test: {kind: "faith", immuneAt: 3}, refs: ["VtDA20 p. 394"], clash: "mind-powers", status: "settled"},
  {id: "mind-faith-late", power: "mind", from: ["any"], to: ["any"], book: "late", needs: "faith",
    ruling: "True Faith shields the target. At Faith 3 or more, mind powers do nothing. Below that, the target may spend 1 Willpower and roll Faith at difficulty 7: each success cancels one of the power's.",
    test: {kind: "faith", immuneAt: 3, roll: true}, refs: ["HH2 pp. 83-85", "V20 p. 372"], clash: "mind-powers", status: "settled"},
  {id: "mind-kindred", power: "mind", from: ["kindred"], to: ["kindred"],
    ruling: "Dominate cannot touch a Kindred of lower Generation (stronger blood) than the vampire using it. Otherwise it works as its own book says, eye contact first.",
    test: {kind: "generation"}, refs: ["V20 p. 158"], clash: "mind-powers", status: "settled"},
  {id: "mind-mortal", power: "mind", from: ["any"], to: ["mortal", "ghoul", "hunter", "beast"],
    ruling: "The power works by its own book, against the target's Willpower.",
    test: {kind: "willpower"}, refs: ["V20 p. 158"], clash: "mind-powers", status: "settled"},
  {id: "mind-fae-da", power: "mind", from: ["any"], to: ["fae"], book: "da",
    ruling: "Dominate and like powers fail on a fae whose Day or Night is at least the power's rating.",
    test: {kind: "dominion"}, refs: ["DA:Fae p. 181"], clash: "mind-powers", status: "settled"},
  {id: "mind-fae-late", power: "mind", from: ["any"], to: ["fae"], book: "late",
    ruling: "No rule found yet for a changeling in later eras: the power works by its own book, against the changeling's Willpower as for a mortal (draft).",
    test: {kind: "willpower"}, refs: ["B760"], clash: "mind-powers", status: "check",
    check: "Does Changeling 20th give the Kithain any defence against Dominate or other vampiric mind powers? Search C20 for Dominate."},
  {id: "mind-garou", power: "mind", from: ["any"], to: ["lupine"],
    ruling: "A Garou or Fera resists as a mortal does: the power's roll is made against the target's Willpower (house rule).",
    test: {kind: "willpower"}, refs: ["B503", "V20 p. 158"], clash: "mind-powers", status: "settled"},
  {id: "mind-mage", power: "mind", from: ["any"], to: ["mage"],
    ruling: "A mage may counter it with countermagick: Arete at difficulty 7, each success taking one of the power's successes away. Against Dominate the mage needs Mind 1 (house rule).",
    test: {kind: "counter", sphere: "mind"}, refs: ["B503", "M20 p. 545", "M20 p. 546"], clash: "mind-powers", status: "settled"},
  {id: "mind-wraith", power: "mind", from: ["kindred", "ghoul"], to: ["wraith"],
    ruling: "Dominate needs eye contact, so it reaches a wraith only when the vampire can see it (Auspex, or the wraith Embodied). Then the roll is made against the wraith's Willpower as for a mortal (draft).",
    test: {kind: "willpower"}, refs: ["B760", "V20 p. 158"], clash: "mind-powers", status: "check",
    check: "Does Wraith 20th or V20 rule vampiric Dominate on a wraith? Search Wraith 20th for Dominate and Auspex."},
  {id: "mind-any", power: "mind", from: ["any"], to: ["any"],
    ruling: "No book rules this pair. The power works by its own book, against the target's Willpower as for a mortal (house rule).",
    test: {kind: "willpower"}, refs: ["B760"], clash: "mind-powers", status: "settled", fallback: true},

  /* Emotion powers */
  {id: "emotion-faith-da", power: "emotion", from: ["any"], to: ["any"], book: "da", needs: "faith",
    ruling: "At Faith 4 or more the target is immune to Presence and other emotion powers. Below that, 1 Willpower takes the target's Faith off the power's successes.",
    test: {kind: "faith", immuneAt: 4}, refs: ["VtDA20 p. 394"], clash: "mind-powers", status: "settled"},
  {id: "emotion-faith-late", power: "emotion", from: ["any"], to: ["any"], book: "late", needs: "faith",
    ruling: "At Faith 3 or more the target is immune to mind powers, emotion powers among them. Below that, 1 Willpower and Faith at difficulty 7: each success cancels one of the power's.",
    test: {kind: "faith", immuneAt: 3, roll: true}, refs: ["HH2 pp. 83-85"], clash: "mind-powers", status: "settled"},
  {id: "emotion-mortal", power: "emotion", from: ["any"], to: ["mortal", "ghoul", "hunter", "beast", "kindred"],
    ruling: "The power works by its own book.",
    test: {kind: "none"}, refs: ["V20 p. 158"], clash: "mind-powers", status: "settled"},
  {id: "emotion-mage", power: "emotion", from: ["any"], to: ["mage"],
    ruling: "A mage may counter it with countermagick: Arete at difficulty 7, each success taking one of the power's away. Mind 1 is needed, as against Dominate (house rule).",
    test: {kind: "counter", sphere: "mind"}, refs: ["B503", "M20 p. 545"], clash: "mind-powers", status: "settled"},
  {id: "emotion-any", power: "emotion", from: ["any"], to: ["any"],
    ruling: "No book rules this pair. The power works by its own book, against the target's Willpower as for a mortal (house rule).",
    test: {kind: "willpower"}, refs: ["B760"], clash: "mind-powers", status: "settled", fallback: true},

  /* Senses against Obfuscate */
  {id: "sight-faith", power: "sight", from: ["any"], to: ["any"], needs: "faith3",
    ruling: "The watcher's True Faith of 3 or more sees through Obfuscate and other mind-clouding powers.",
    test: {kind: "none"}, refs: ["VtDA20 p. 394", "HH2 pp. 83-85"], clash: "mind-powers", status: "settled", watcherFaith: true},
  {id: "sight-auspex", power: "sight", from: ["any"], to: ["any"],
    ruling: "Auspex against Obfuscate, by the era's book. Later eras: higher Auspex rolls Perception + Awareness at 7 less the difference, equal ratings make a resisted roll, higher Obfuscate is not seen. Dark Ages: Auspex equal or higher rolls at 8 less 1 a dot above; higher Obfuscate is not seen. A mortal without Auspex never sees through it; a beast counts as Auspex 1. Another line's sense power counts its rating as Auspex (house rule).",
    test: {kind: "pierce"}, refs: ["V20 p. 142", "VtDA20 p. 195", "V20 p. 184", "B89", "B760"], clash: "mind-powers", status: "settled"},

  /* Countermagick */
  {id: "counter-mage", power: "counter", from: ["mage"], to: ["any"],
    ruling: "A mage counters a Discipline, Gift or Arcanos with countermagick: a full action, a dot in a Sphere the effect would use, Arete at difficulty 7; each success takes one of the power's successes away.",
    test: {kind: "counter", actorRolls: true}, refs: ["M20 p. 545", "M20 p. 546"], clash: "mind-powers", status: "settled"},
  {id: "unmagic", power: "unmagic", from: ["mage"], to: NIGHT_FOLK,
    ruling: "One of the Night-Folk counters a mage's magick with Wits + Occult; the successes that count are capped by the target's own power trait.",
    test: {kind: "nightfolk"}, refs: ["M20 p. 546"], clash: "mind-powers", status: "settled"},
  {id: "unmagic-mage", power: "unmagic", from: ["mage"], to: ["mage"],
    ruling: "Mage against mage: countermagick with Arete at difficulty 7, each success taking one away.",
    test: {kind: "counter"}, refs: ["M20 p. 545"], clash: "mind-powers", status: "settled"},

  /* Blood */
  {id: "drink-garou", power: "drink", from: ["kindred", "ghoul"], to: ["lupine"],
    ruling: "Each point of Garou blood drunk gives two blood points. While it is in the drinker, each point raises frenzy and Rötschreck difficulties by 1.",
    test: {kind: "none"}, refs: ["V20 p. 380"], clash: "feeding-supernatural", status: "settled"},
  {id: "drink-fae", power: "drink", from: ["kindred", "ghoul"], to: ["fae"],
    ruling: "Fae blood is a potent drug to Kindred in every era: the Glamour in it brings hallucinations and waking dreams for a scene for each point drunk, and dice pools drop by 1 to 3. A Dark Ages fae's Court gift comes on top (house rule).",
    test: {kind: "none"}, refs: ["B525", "VtDA20 p. 181"], clash: "feeding-supernatural", status: "settled"},
  {id: "drink-mage", power: "drink", from: ["kindred", "ghoul"], to: ["mage"],
    ruling: "A mage's blood is ordinary blood (house rule).",
    test: {kind: "none"}, refs: ["B522"], clash: "feeding-supernatural", status: "settled"},
  {id: "ghoul-faith", power: "ghoul", from: ["kindred"], to: ["any"], needs: "faith4",
    ruling: "True Faith of 4 or more makes the target immune to the Blood Oath and to ghouling.",
    test: {kind: "none"}, refs: ["VtDA20 p. 394"], clash: "ghouls", status: "settled"},
  {id: "ghoul-fera", power: "ghoul", from: ["any"], to: ["ghoul"],
    ruling: "Only Kindred vitae makes or keeps a ghoul. Blood of the Garou or Fera fed to a ghoul gives it no vitae: its pool does not fill and its years are not held back (draft).",
    test: {kind: "none"}, refs: ["B760", "VtDA20 p. 399"], clash: "ghouls", status: "check",
    check: "Do V20 Ghouls and Revenants, VtDA20 or W20 say what Garou or Fera blood does to a ghoul, and whether a Garou can be made a ghoul? Search G&R and W20 for ghoul with Garou or werewolf."},
  {id: "ghoul-any", power: "ghoul", from: ["kindred"], to: ["any"],
    ruling: "V20 Dark Ages ghoul rules in every era; experience by VtDA20 p. 399 for Disciplines and Ghouls and Revenants p. 139 for the rest.",
    test: {kind: "none"}, refs: ["B22", "VtDA20 p. 399", "Ghouls and Revenants p. 139"], clash: "ghouls", status: "settled", fallback: true},

  /* The Delirium */
  {id: "delirium-immune", power: "delirium", from: ["lupine"], to: ["lupine", "kindred", "mage", "fae", "wraith", "spirit"],
    ruling: "Untouched. Garou and Fera are immune, and so are vampires, mages, changelings and wraiths unless a power forces the Delirium (house rule for the last three).",
    test: {kind: "none"}, refs: ["B521", "W20 p. 160"], clash: "delirium", status: "settled"},
  {id: "delirium-mortal", power: "delirium", from: ["lupine"], to: ["mortal", "ghoul", "hunter", "beast"],
    ruling: "Mortals and ghouls roll on the Delirium chart by Willpower. Kinfolk are untouched.",
    test: {kind: "none"}, refs: ["W20 p. 263", "W20 p. 46", "DA:W p. 97"], clash: "delirium", status: "settled"},

  /* The rest, one each */
  {id: "hit", power: "hit", from: ["any"], to: ["any"],
    ruling: "The attacker's book sets the damage type dealt. The target's book sets the soak, the halving and what the wound does. Banes (silver, cold iron, fire, sunlight) are the target's. WoDX Combat already does this.",
    test: {kind: "none"}, refs: ["B500"], clash: "hit-between-lines", status: "settled"},
  {id: "frenzy", power: "frenzy", from: ["any"], to: ["kindred", "lupine", "fae"],
    ruling: "Each line keeps its own frenzy. A creature of another line can be a provocation (a Crinos for a Kindred, fire for anyone), named by the Storyteller.",
    test: {kind: "none"}, refs: ["B53", "VtDA20 p. 357"], clash: "frenzy-rage", status: "settled"},
  {id: "witness", power: "witness", from: ["mage"], to: ["any"],
    ruling: "Only Sleepers count as witnesses for Paradox. The Night-Folk and their circles (vampires, Garou, ghouls, Kinfolk, kinain, cultists, mummies, hunters) do not.",
    test: {kind: "witness"}, refs: ["M20 p. 531"], clash: "paradox-witnesses", status: "settled"},
  {id: "possess", power: "possess", from: ["any"], to: ["any"],
    ruling: "The one already inside holds the body. A newcomer must win a resisted Willpower roll against it (difficulty 6 each); a tie keeps the first.",
    test: {kind: "possess"}, refs: ["B506"], clash: "possession", status: "settled"},
  {id: "wraith-living", power: "wraith", from: ["wraith"], to: ["any"],
    ruling: "Wraith 20th rules the Shroud and the Arcanoi in every era.",
    test: {kind: "none"}, refs: ["B43"], clash: "wraith-living", status: "settled"},
  {id: "umbra", power: "umbra", from: ["any"], to: ["any"],
    ruling: "One Umbra for the whole chronicle: Wraith first, then Werewolf, then Mage. WoDX Otherworlds draws it.",
    test: {kind: "none"}, refs: ["B31"], clash: "umbra", status: "settled"}
];
