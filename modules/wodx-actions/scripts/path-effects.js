/**
 * WoDX Actions 3.27.0: path magic on the effects card, the pure rules. Thaumaturgy, Necromancy and Koldunic path
 * powers (V20 Dark Ages pp. 275-302, by power id in data/disciplines-daw.json) and the Numina of The Hunters Hunted II
 * (pp. 70-83, by "numen:level") each map to one effect keyword and one result, in the same shapes as the Dark Ages
 * rotes (mage-da-effects.js). A power with no entry, or whose result is a summoned being, a vision, a long ritual or a
 * judgement, stays the Storyteller's call and is only listed on the card.
 */
import { H, T, C, N, S, K as KW, P, MV, HL, outcomesOf } from "./mage-da-effects.js";
import {DAY} from "../../wodx-chronicle/scripts/terms.mjs";

/**
 * Dark Ages path powers, by power id, from a page check of each power (2026-11-11). Summoned beings, raised dead,
 * blood moved between bodies, contested rolls and rolled damage dice stay the Storyteller's call.
 */
const K = "koldunic-sorcery-the-", NE = "necromancy-the-", TH = "thaumaturgy-potestas-";
// B6738: Corrupt Body's and Acedia's time by successes (V20 Dark Ages p. 301)
/** B6858: a hedge curse's length by successes (HH2 p. 73): the next action, a scene, a day, a week, a month, a year. */
const HH_CURSE = [["the next action", {kind: "rounds", rounds: 1}], ["one scene", {kind: "scene"}], ["one day", {kind: "time", seconds: DAY}],
  ["one week", {kind: "time", seconds: 7 * DAY}], ["one month", {kind: "time", seconds: 30 * DAY}], ["up to a year", {kind: "time", seconds: 365 * DAY}]];
const DT = "dark-thaumaturgy-";
/** B7697: Name the Crime's urge by successes, a turn to a month (DAC 2002 p. 105); a Minor Curse's hours (p. 109). */
const NAME_CRIME = [["one turn", {kind: "rounds", rounds: 1}], ["one hour", 3600], ["one night", DAY], ["one week", 7 * DAY], ["one month", 30 * DAY]];
const HOURS = [1, 2, 3, 4, 5].map(h => [`${h} hour${h === 1 ? "" : "s"}`, h * 3600]);
const CURSE_LADDER = [["one night", DAY], ["one week", 7 * DAY], ["one month", 30 * DAY], ["one season", 91 * DAY], ["one year", 365 * DAY]];
/** B7700: the Companion's Thaumaturgy paths (DAC 2002 pp. 92-96); Wrath of God's dread by successes (p. 94). */
const TA = "thaumaturgy-thaumaturgical-alchemy-", LB = "thaumaturgy-way-of-the-levinbolt-", SF = "thaumaturgy-prey-on-the-souls-fear-", WD = "thaumaturgy-path-of-warding-";
const WRATH = [["one turn", {kind: "rounds", rounds: 1}], ["five minutes", 300], ["one scene", {kind: "scene"}], ["several hours", 3 * 3600], ["one night", DAY]];
export const PATH_EFFECTS = {
  // Koldunic Sorcery (pp. 275-278)
  [`${K}transylvanian-kraina-burebistas-throne`]: N(),
  [`${K}transylvanian-kraina-pietrosus-hospitality`]: T("trip", "Pietrosu's freezing wind", {turns: 1}, "all"),
  [`${K}transylvanian-kraina-the-banks-of-the-basca`]: [T("trip", "Swept away", {turns: 1}, "all"), H("harm", 2, "bashing", {fixed: true, who: "all"})], [`${K}transylvanian-kraina-kupalas-exhalation`]: H("harm", 1, "lethal", {who: "all"}),
  [`${K}transylvanian-kraina-restless-medias`]: [H("harm", 3, "lethal", {fixed: true, who: "all"}), T("trip", "Thrown down by the quake", {turns: 1}, "all")],
  [`${K}black-sea-kraina-danubian-voices`]: KW("speak", "self"), [`${K}black-sea-kraina-grave-of-the-marea-neagra`]: T("ward", "Grave of the Marea Neagra", "night", "self"),
  [`${K}black-sea-kraina-pontos-euxeinos`]: HL(1, {who: "self"}), [`${K}black-sea-kraina-minions-of-deep-marmora`]: KW("summon", "self"),
  [`${K}black-sea-kraina-pontos-axeinos`]: [T("hold", "Seized by the whirlpool", {turns: 1}, "one"), H("harm", 1, "lethal")],
  // Path of Bone (pp. 279-280)
  [`${NE}path-of-bone-seal-of-abamixtra`]: KW("summon", "self"), [`${NE}path-of-bone-awaken-the-homuncular-servant`]: S("summon"), [`${NE}path-of-bone-shambling-hordes`]: S("summon"),
  [`${NE}path-of-bone-baleful-exorcism`]: S("sway"), [`${NE}path-of-bone-daemonic-possession`]: S("possess"),
  // Path of the Cenotaph (pp. 280-281)
  [`${NE}path-of-the-cenotaph-a-touch-of-death`]: N(), [`${NE}path-of-the-cenotaph-reveal-the-catene`]: N(),
  [`${NE}path-of-the-cenotaph-tread-upon-the-grave`]: N(), [`${NE}path-of-the-cenotaph-death-knell`]: N(), [`${NE}path-of-the-cenotaph-ephemeral-binding`]: KW("bind", "one"),
  // Path of the Corpse in the Monster (p. 282)
  [`${NE}path-of-the-corpse-in-the-monster-mortuus-in-vultus`]: T("shape", "Mortuus in Vultus", "scene", "self"),
  [`${NE}path-of-the-corpse-in-the-monster-algor-mortis`]: T("ward", "Algor Mortis", "scene", "self"),
  [`${NE}path-of-the-corpse-in-the-monster-intimations-of-mortality`]: T("fortune", "Intimations of Mortality", "scene", "one"),
  [`${NE}path-of-the-corpse-in-the-monster-benedictio-mortem`]: T("ward", "Benedictio Mortem", {turns: 1}, "self"),
  [`${NE}path-of-the-corpse-in-the-monster-benedictio-vitae`]: KW("fear", "self", {calm: true}),
  // The Grave's Decay (pp. 283-284)
  [`${NE}graves-decay-ashes-to-ashes`]: S(), [`${NE}graves-decay-rigor-mortis`]: T("hold", "Rigor Mortis", {turns: 1}, "one"),
  [`${NE}graves-decay-ashen-ladys-embrace`]: H("harm", 2, "aggravated", {fixed: true, ask: true}),
  [`${NE}graves-decay-gift-of-melancholia`]: T("boost", "Melancholia", "night", "one", {sap: true, on: "all", dice: 1}), [`${NE}graves-decay-dust-to-dust`]: H("harm", 1, "aggravated", {soak: false}),
  // Path of Haunting (pp. 285-286)
  [`${NE}path-of-haunting-song-of-the-dead`]: T("fortune", "Song of the Dead", {days: 1}, "one"), [`${NE}path-of-haunting-summon-wisp`]: [T("light", "Summon Wisp", "scene", "self"), T("fortune", "Entranced by the wisp", "scene", "one", {curse: true, shift: 1})],
  [`${NE}path-of-haunting-harrowing`]: T("fortune", "Harrowing", "night", "one"), [`${NE}path-of-haunting-phantasms`]: KW("illusion", "self"),
  [`${NE}path-of-haunting-spectral-menacing`]: S(),
  // Path of the Sepulchre (pp. 287-288)
  [`${NE}path-of-the-sepulchre-peering-across-the-shroud`]: T("sight", "Peering Across the Shroud", "scene", "self"),
  [`${NE}path-of-the-sepulchre-summon-soul`]: S("summon"), [`${NE}path-of-the-sepulchre-compel-soul`]: KW("sway", "one"), [`${NE}path-of-the-sepulchre-haunting`]: KW("bind", "one"),
  [`${NE}path-of-the-sepulchre-torment`]: H("harm", 1, "lethal"),
  // Path of Ash (p. 289)
  [`${NE}path-of-ash-shroudsight`]: T("sight", "Shroudsight", "scene", "self"),
  [`${NE}path-of-ash-tongue-of-the-dark-kingdoms`]: T("sense", "Tongue of the Dark Kingdoms", "scene", "self"),
  [`${NE}path-of-ash-touch-the-nether`]: T("sideways", "Touch the Nether", "scene", "self"), [`${NE}path-of-ash-ex-nihilo`]: S("sideways"),
  [`${NE}path-of-ash-shroud-mastery`]: KW("place", "self", {shroud: true}),
  // Path of the Twilight Garden (pp. 289-290)
  [`${NE}path-of-the-twilight-garden-whispers-to-the-soul`]: S("fear"),
  [`${NE}path-of-the-twilight-garden-kiss-of-the-dark-mother`]: T("harm", "Kiss of the Dark Mother", "night", "self"),
  [`${NE}path-of-the-twilight-garden-dark-humors`]: T("boost", "Phlegmatic humor", "scene", "one", {sap: true, on: "all", dice: 2}), [`${NE}path-of-the-twilight-garden-caul-of-the-neverborn`]: T("ward", "Caul of the Neverborn", "scene", "self"),
  [`${NE}path-of-the-twilight-garden-lament-of-dhainu`]: KW("fear", "all"),
  // The Vitreous Path (pp. 291-292)
  [`${NE}vitreous-path-eyes-of-the-wraith`]: T("sight", "Eyes of the Wraith", "scene", "self"), [`${NE}vitreous-path-aura-of-decay`]: KW("work", "self"),
  [`${NE}vitreous-path-pischachas-feast`]: P("blood", 2, "self", {fixed: true}), [`${NE}vitreous-path-curse-of-the-maelstrom`]: KW("summon", "self"), [`${NE}vitreous-path-night-cry`]: T("fortune", "Night Cry", "scene", "one", {once: false}),
  // Thaumaturgy (pp. 299-302)
  [`${TH}elementorum-strength-of-the-earth`]: T("shape", "Strength of the Earth", {turns: 1}, "self"), [`${TH}elementorum-wooden-tongues`]: N(),
  [`${TH}elementorum-animate-the-unmoving`]: KW("summon", "self"), [`${TH}elementorum-elemental-form`]: T("shape", "Elemental Form", "night", "self"),
  [`${TH}elementorum-summon-elemental`]: S("summon"),
  [`${TH}exsecrabilis-stigma`]: T("fortune", "Stigma", {seconds: DAY}, "one"), [`${TH}exsecrabilis-malady`]: T("boost", "Malady", {ladder: [["a night (the book: nights equal to the caster's Willpower)", DAY]]}, "one", {sap: true, on: "physical", max: 3}),
  [`${TH}exsecrabilis-scapegoat`]: T("sway", "Scapegoat", {days: 1}, "one"), [`${TH}exsecrabilis-corrupt-body`]: T("boost", "Corrupt Body", {ladder: CURSE_LADDER}, "one", {sap: true, on: "all", dice: 1}),
  [`${TH}exsecrabilis-acedia`]: T("fortune", "Acedia", {ladder: CURSE_LADDER}, "one", {curse: true, shift: 2, once: false}),
  [`${TH}vitae-a-taste-for-blood`]: KW("know", "one"), [`${TH}vitae-blood-awakening`]: [P("blood", -1, "one"), KW("fear", "one", {frenzy: true})], [`${TH}vitae-inner-vessel`]: S(), [`${TH}vitae-theft-of-vitae`]: [P("blood", 1, "self"), P("blood", -1, "one")],
  // B6855: Disciplines that are not paths, read again on their pages (V20 Dark Ages pp. 266, 266, 275)
  "valeren-watcher-souls-breath": [P("blood", 1, "self"), H("harm", 1, "lethal")],
  "valeren-warrior-song-of-the-blooded": T("boost", "Song of the Blooded", "scene", "self", {on: "physical", dice: 3}),
  "abyss-mysticism-cry-that-slays-the-light": KW("light", "self", {dark: true}),
  [`${TH}vitae-cauldron-of-blood`]: H("harm", 1, "aggravated", {soak: false, ask: true}),
  // B7662: the lesser paths and Genius Loci, from the full check of V20 Dark Ages (pp. 278, 297-299)
  ...Object.fromEntries([1, 1, 2, 2, 3].map((lv, i) => [`thaumaturgy-creatio-ignis-${i + 1}`, H("harm", lv, "aggravated", {fixed: true, ask: true})])),
  ...Object.fromEntries([1, 2, 3, 4, 5].map(l => [`thaumaturgy-iter-pernix-${l}`, KW("move", "self")])),
  ...Object.fromEntries([1, 2, 3, 4, 5].map(l => [`thaumaturgy-potestas-motus-${l}`, KW("move", "one")])),
  ...Object.fromEntries(["fog", "rain", "wind", "storm", "storm"].map((w, i) => [`thaumaturgy-potestas-tempestatum-${i + 1}`, KW("weather", "self", {weather: w})])),
  ...Object.fromEntries([1, 2, 3, 4, 5].map(l => [`koldunic-sorcery-genius-loci-${l}`, T("sense", "Genius Loci", "scene", "self")])),
  // B7697: Dark Thaumaturgy, Maleficia and Striga, Dark Ages Companion (2002) pp. 105-111 (each row carries book "DAC 2002")
  [`${DT}rego-venalis-nights-terror`]: T("boost", "Night's Terror", "night", "one", {sap: true, on: "all"}),
  [`${DT}rego-venalis-poison-heart`]: KW("sway", "one"), [`${DT}rego-venalis-fool-the-hearts-eye`]: KW("illusion", "self"),
  [`${DT}rego-venalis-name-the-crime`]: T("sway", "Name the Crime", {ladder: NAME_CRIME}, "one"), [`${DT}rego-venalis-unleash-the-dark-soul`]: S("summon"),
  [`${DT}video-nefas-see-the-unseen`]: [T("sight", "See the Unseen", "scene", "self"), T("fortune", "Gazing into the spirit world", "scene", "self", {curse: true, shift: 1, once: false})],
  [`${DT}video-nefas-learn-the-hearts-pain`]: KW("know", "one"), [`${DT}video-nefas-seize-the-moment`]: KW("know", "one"),
  [`${DT}video-nefas-casting-the-bones`]: N("know"), [`${DT}video-nefas-recall-the-bloody-deed`]: S("summon"),
  [`${DT}rego-dolor-strike-the-broken-limb`]: H("harm", 1, "lethal"),
  [`${DT}rego-dolor-phantom-pain`]: T("boost", "Phantom Pain", "scene", "one", {sap: true, on: "all"}),
  [`${DT}rego-dolor-curse-the-senses`]: T("fortune", "Cursed senses", "scene", "one", {curse: true, once: false}),
  [`${DT}rego-dolor-feed-the-corruption`]: H("harm", 2, "lethal", {fixed: true, soak: false}),
  [`${DT}rego-dolor-eternal-torment`]: H("harm", 1, "aggravated"),
  ...Object.fromEntries(["an-insignificant", "a-least", "a-lesser", "a-minor", "a-specific"].map(k => [`${DT}rego-manes-call-${k}-demon`, S("summon")])),
  "maleficia-evil-eye": T("fortune", "Evil Eye", {turns: 1}, "one", {curse: true}),
  "maleficia-minor-curse": T("fortune", "Minor Curse", {ladder: HOURS}, "one", {curse: true, shift: 1, once: false}),
  "maleficia-psalm-of-the-damned": T("boost", "Psalm of the Damned", "scene", "one", {sap: true, on: "all"}),
  "maleficia-barrenness": S("free"),
  "maleficia-greater-curse": T("fortune", "Greater Curse", {ladder: [["one year", 365 * DAY]]}, "one", {curse: true, shift: 1, once: false}),
  "striga-strix": T("sense", "Strix", "scene", "self"),
  "striga-scobax": T("fortune", "Plagued by vermin", "scene", "one", {curse: true, shift: 2, once: false}),
  "striga-masca": T("shape", "Masca", "night", "self"),
  "striga-hexe": H("harm", 1, "aggravated"),
  "striga-fractura": [P("blood", -1, "self"), S("make")],
  // B7700: four Thaumaturgy paths of the Dark Ages Companion (2002) pp. 92-96 (each row carries book "DAC 2002")
  [`${TA}fortify-the-solid-form`]: KW("work", "self"), [`${TA}crystallize-liquid`]: KW("work", "self"), [`${TA}liquefy-the-solid-form`]: KW("work", "one"),
  [`${TA}ethereal-stone`]: KW("hold", "one"), [`${TA}vaporous-transformation`]: KW("work", "self"),
  // The bolt's dice are set by the level and can be dodged, so the harm waits for the Storyteller
  ...Object.fromEntries(["spark", "illuminate", "body-of-light", "jupiters-aegis", "lightning-dance"].map(k => [`${LB}${k}`, S("harm")])),
  [`${SF}startle-the-superstitious-mind`]: T("boost", "Startled", {turns: 1}, "one", {sap: true, on: "all"}),
  [`${SF}rout-the-charging-hordes`]: KW("fear", "all"), [`${SF}wrath-of-god`]: T("hold", "Wrath of God", {ladder: WRATH}, "one"),
  [`${SF}the-inner-demon`]: KW("fear", "one"), [`${SF}demonic-horde`]: KW("fear", "all"),
  [`${WD}bar-the-common-passage`]: T("ward", "Bar the Common Passage", "night", "self"), [`${WD}glyph-of-scrying`]: T("sight", "Glyph of Scrying", {days: 1}, "self"),
  [`${WD}runes-of-power`]: KW("ward", "self"), [`${WD}glyph-of-enlightenment`]: T("sight", "Glyph of Enlightenment", {days: 1}, "self"),
  [`${WD}secure-the-sacred-domain`]: T("ward", "Secure the Sacred Domain", "night", "self")
};

/** Numina, by "numen:level" (The Hunters Hunted II). */
export const NUMINA_EFFECTS = {
  "divination:1": N(), "divination:2": N(), "divination:3": N(), "divination:4": N(), "divination:5": N(),
  "healing:1": N(), "healing:4": HL(1), "healing:5": HL(1, {aggravated: true}),
  // B6858: read again on HH2 pp. 72-79. A curse is a standing harder roll for its ladder (on all the victim's rolls: the
  // book leaves the situation to the Storyteller), with dice lost at four and five; Healing 2 takes away the pain of
  // wounds for 10 minutes a success; astral travel crosses over; Cyberkinesis reads or works the device
  ...Object.fromEntries([1, 2, 3, 4, 5].map(l => [`curses:${l}`, [T("fortune", `Curse (${l})`, {ladder: HH_CURSE}, "one", {curse: true, shift: [1, 2, 3, 3, 4][l - 1], once: false}),
    ...(l >= 4 ? [T("boost", `Curse (${l}): dice`, {ladder: HH_CURSE}, "one", {on: "all", dice: l - 3, sap: true})] : [])]])),
  "healing:2": T("boost", "Pain eased", {turns: 200}, "one", {painless: true}),
  "astral:1": N("sense"), "astral:2": S("sideways"), "astral:3": S("manifest"), "astral:4": S("sideways"), "astral:5": S("veil"),
  "cyberkinesis:2": S("work"), "cyberkinesis:3": N("know"), "cyberkinesis:4": S("work"), "cyberkinesis:5": S("work"),
  "psychometry:1": N(), "psychometry:2": N(), "psychometry:3": N(), "psychometry:4": N(), "psychometry:5": N(),
  "cyberkinesis:1": N("know"),
  // The flame's damage is set by the level, not the successes; the target may dodge, so it waits for the Storyteller
  "pyrokinesis:1": H("harm", 1, "aggravated", {fixed: true, ask: true}), "pyrokinesis:2": H("harm", 1, "aggravated", {fixed: true, ask: true}),
  "pyrokinesis:3": H("harm", 2, "aggravated", {fixed: true, ask: true}), "pyrokinesis:4": H("harm", 2, "aggravated", {fixed: true, ask: true}),
  "pyrokinesis:5": H("harm", 3, "aggravated", {fixed: true, ask: true}),
  // A thrown object does up to the level in bashing (lethal at the Storyteller's word) and can be dodged
  ...Object.fromEntries([1, 2, 3, 4, 5].map(l => [`telekinesis:${l}`, H("harm", l, "bashing", {fixed: true, ask: true})]))
};

/** Is this Discipline heading a path of blood sorcery? */
export function isPath(heading) {
  return /^(thaumaturgy|necromancy|koldunic)/i.test(String(heading ?? ""));
}

/** What a path power does with its successes: [{key, who, ask?, st?, out}]. Unknown powers come back as one st line. */
/** B6855: the Dark Ages powers with no effect to put on the card, each read on its page, and why. */
/** B6858: Numina levels with no table effect, with the page (read). */
export const NUMINA_STORY = {
  "healing:3": "HH2 p. 76: bones set and wounds heal twice as fast; WoDX keeps no natural healing rate to double"
};

export const PATH_STORY = {
  "daimoinon-spew-wide-the-pit": "V20 Dark Ages p. 212: the book gives it no system; the creature is a plot device",
  "temporis-clios-kiss": "V20 Dark Ages p. 259: a journey into the past, the Storyteller's story",
  [`${NE}graves-decay-ashes-to-ashes`]: "V20 Dark Ages p. 283: a corpse turns to ash; WoDX keeps no corpses",
  [`${NE}path-of-haunting-spectral-menacing`]: "V20 Dark Ages p. 286: ghosts' powers on the target are easier; the Storyteller's ghosts roll them",
  [`${TH}vitae-inner-vessel`]: "V20 Dark Ages p. 302: a lower Generation for a while; generation limits are the Storyteller's",
  "maleficia-barrenness": "DAC 2002 p. 109: no children, and a vampire cannot Embrace; WoDX keeps no births, and the Embrace is the Storyteller's"
};

/** B7697: a power row from another book names it in its source. */
const BOOK_NAME = {"DAC 2002": "Dark Ages Companion (2002)"};

export function pathOutcomes(power, successes) {
  const spec = PATH_EFFECTS[power?.id] ?? S();
  return outcomesOf(spec, {key: spec.kw, label: power?.n ?? power?.name ?? "", source: `${BOOK_NAME[power?.book] ?? "V20 Dark Ages"} p. ${power?.p ?? "?"}`}, successes, String(power?.e ?? ""));
}

/** What a Numen at a level does with its successes. */
export function numinaOutcomes(key, level, successes, def = null) {
  const spec = NUMINA_EFFECTS[`${key}:${level}`] ?? S();
  const label = `${def?.label ?? key} ${level}`;
  return outcomesOf(spec, {key: spec.kw, label, source: `The Hunters Hunted II p. ${def?.p ?? "?"}`}, successes, String(def?.levels?.[level - 1] ?? ""));
}
