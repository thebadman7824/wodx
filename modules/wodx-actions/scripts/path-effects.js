/**
 * WoDX Actions 3.27.0: path magic on the effects card, the pure rules. Thaumaturgy, Necromancy and Koldunic path
 * powers (V20 Dark Ages pp. 275-302, by power id in data/disciplines-daw.json) and the Numina of The Hunters Hunted II
 * (pp. 70-83, by "numen:level") each map to one effect keyword and one result, in the same shapes as the Dark Ages
 * rotes (mage-da-effects.js). A power with no entry, or whose result is a summoned being, a vision, a long ritual or a
 * judgement, stays the Storyteller's call and is only listed on the card.
 */
import { H, T, C, N, S, MV, HL, outcomesOf } from "./mage-da-effects.js";

/**
 * Dark Ages path powers, by power id, from a page check of each power (2026-11-11). Summoned beings, raised dead,
 * blood moved between bodies, contested rolls and rolled damage dice stay the Storyteller's call.
 */
const K = "koldunic-sorcery-the-", NE = "necromancy-the-", TH = "thaumaturgy-potestas-";
export const PATH_EFFECTS = {
  // Koldunic Sorcery (pp. 275-278)
  [`${K}transylvanian-kraina-burebistas-throne`]: N(),
  [`${K}transylvanian-kraina-pietrosus-hospitality`]: T("trip", "Pietrosu's freezing wind", {turns: 1}, "all"),
  [`${K}transylvanian-kraina-the-banks-of-the-basca`]: S("harm"), [`${K}transylvanian-kraina-kupalas-exhalation`]: S("harm"),
  [`${K}transylvanian-kraina-restless-medias`]: S("harm"),
  [`${K}black-sea-kraina-danubian-voices`]: S(), [`${K}black-sea-kraina-grave-of-the-marea-neagra`]: T("ward", "Grave of the Marea Neagra", "night", "self"),
  [`${K}black-sea-kraina-pontos-euxeinos`]: HL(1, {who: "self"}), [`${K}black-sea-kraina-minions-of-deep-marmora`]: S(),
  [`${K}black-sea-kraina-pontos-axeinos`]: S(),
  // Path of Bone (pp. 279-280)
  [`${NE}path-of-bone-seal-of-abamixtra`]: S(), [`${NE}path-of-bone-awaken-the-homuncular-servant`]: S("summon"), [`${NE}path-of-bone-shambling-hordes`]: S("summon"),
  [`${NE}path-of-bone-baleful-exorcism`]: S("sway"), [`${NE}path-of-bone-daemonic-possession`]: S("possess"),
  // Path of the Cenotaph (pp. 280-281)
  [`${NE}path-of-the-cenotaph-a-touch-of-death`]: N(), [`${NE}path-of-the-cenotaph-reveal-the-catene`]: N(),
  [`${NE}path-of-the-cenotaph-tread-upon-the-grave`]: N(), [`${NE}path-of-the-cenotaph-death-knell`]: N(), [`${NE}path-of-the-cenotaph-ephemeral-binding`]: S("bind"),
  // Path of the Corpse in the Monster (p. 282)
  [`${NE}path-of-the-corpse-in-the-monster-mortuus-in-vultus`]: T("shape", "Mortuus in Vultus", "scene", "self"),
  [`${NE}path-of-the-corpse-in-the-monster-algor-mortis`]: T("ward", "Algor Mortis", "scene", "self"),
  [`${NE}path-of-the-corpse-in-the-monster-intimations-of-mortality`]: T("fortune", "Intimations of Mortality", "scene", "one"),
  [`${NE}path-of-the-corpse-in-the-monster-benedictio-mortem`]: T("ward", "Benedictio Mortem", {turns: 1}, "self"),
  [`${NE}path-of-the-corpse-in-the-monster-benedictio-vitae`]: S(),
  // The Grave's Decay (pp. 283-284)
  [`${NE}graves-decay-ashes-to-ashes`]: S(), [`${NE}graves-decay-rigor-mortis`]: T("hold", "Rigor Mortis", {turns: 1}, "one"),
  [`${NE}graves-decay-ashen-ladys-embrace`]: H("harm", 2, "aggravated", {fixed: true, ask: true}),
  [`${NE}graves-decay-gift-of-melancholia`]: S("harm"), [`${NE}graves-decay-dust-to-dust`]: H("harm", 1, "aggravated", {soak: false}),
  // Path of Haunting (pp. 285-286)
  [`${NE}path-of-haunting-song-of-the-dead`]: T("fortune", "Song of the Dead", {days: 1}, "one"), [`${NE}path-of-haunting-summon-wisp`]: S("light"),
  [`${NE}path-of-haunting-harrowing`]: T("fortune", "Harrowing", "night", "one"), [`${NE}path-of-haunting-phantasms`]: S(),
  [`${NE}path-of-haunting-spectral-menacing`]: S(),
  // Path of the Sepulchre (pp. 287-288)
  [`${NE}path-of-the-sepulchre-peering-across-the-shroud`]: T("sight", "Peering Across the Shroud", "scene", "self"),
  [`${NE}path-of-the-sepulchre-summon-soul`]: S("summon"), [`${NE}path-of-the-sepulchre-compel-soul`]: S("sway"), [`${NE}path-of-the-sepulchre-haunting`]: S(),
  [`${NE}path-of-the-sepulchre-torment`]: H("harm", 1, "lethal"),
  // Path of Ash (p. 289)
  [`${NE}path-of-ash-shroudsight`]: T("sight", "Shroudsight", "scene", "self"),
  [`${NE}path-of-ash-tongue-of-the-dark-kingdoms`]: T("sense", "Tongue of the Dark Kingdoms", "scene", "self"),
  [`${NE}path-of-ash-touch-the-nether`]: T("sideways", "Touch the Nether", "scene", "self"), [`${NE}path-of-ash-ex-nihilo`]: S("sideways"),
  [`${NE}path-of-ash-shroud-mastery`]: S(),
  // Path of the Twilight Garden (pp. 289-290)
  [`${NE}path-of-the-twilight-garden-whispers-to-the-soul`]: S("fear"),
  [`${NE}path-of-the-twilight-garden-kiss-of-the-dark-mother`]: T("harm", "Kiss of the Dark Mother", "night", "self"),
  [`${NE}path-of-the-twilight-garden-dark-humors`]: S(), [`${NE}path-of-the-twilight-garden-caul-of-the-neverborn`]: T("ward", "Caul of the Neverborn", "scene", "self"),
  [`${NE}path-of-the-twilight-garden-lament-of-dhainu`]: S("fear"),
  // The Vitreous Path (pp. 291-292)
  [`${NE}vitreous-path-eyes-of-the-wraith`]: T("sight", "Eyes of the Wraith", "scene", "self"), [`${NE}vitreous-path-aura-of-decay`]: S(),
  [`${NE}vitreous-path-pischachas-feast`]: S(), [`${NE}vitreous-path-curse-of-the-maelstrom`]: S(), [`${NE}vitreous-path-night-cry`]: S("harm"),
  // Thaumaturgy (pp. 299-302)
  [`${TH}elementorum-strength-of-the-earth`]: T("shape", "Strength of the Earth", {turns: 1}, "self"), [`${TH}elementorum-wooden-tongues`]: N(),
  [`${TH}elementorum-animate-the-unmoving`]: S(), [`${TH}elementorum-elemental-form`]: T("shape", "Elemental Form", "night", "self"),
  [`${TH}elementorum-summon-elemental`]: S("summon"),
  [`${TH}exsecrabilis-stigma`]: T("fortune", "Stigma", {seconds: 86400}, "one"), [`${TH}exsecrabilis-malady`]: S("harm"),
  [`${TH}exsecrabilis-scapegoat`]: T("sway", "Scapegoat", {days: 1}, "one"), [`${TH}exsecrabilis-corrupt-body`]: S("shape"),
  [`${TH}exsecrabilis-acedia`]: S("fortune"),
  [`${TH}vitae-a-taste-for-blood`]: N(), [`${TH}vitae-blood-awakening`]: S(), [`${TH}vitae-inner-vessel`]: S(), [`${TH}vitae-theft-of-vitae`]: S("charge"),
  [`${TH}vitae-cauldron-of-blood`]: H("harm", 1, "aggravated", {soak: false, ask: true})
};

/** Numina, by "numen:level" (The Hunters Hunted II). */
export const NUMINA_EFFECTS = {
  "divination:1": N(), "divination:2": N(), "divination:3": N(), "divination:4": N(), "divination:5": N(),
  "healing:1": N(), "healing:4": HL(1), "healing:5": HL(1, {aggravated: true}),
  "astral:1": N("sight"), "psychometry:1": N(), "psychometry:2": N(), "psychometry:3": N(), "psychometry:4": N(), "psychometry:5": N(),
  "cyberkinesis:1": N(),
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
export function pathOutcomes(power, successes) {
  const spec = PATH_EFFECTS[power?.id] ?? S();
  return outcomesOf(spec, {key: spec.kw, label: power?.n ?? power?.name ?? "", source: `V20 Dark Ages p. ${power?.p ?? "?"}`}, successes, String(power?.e ?? ""));
}

/** What a Numen at a level does with its successes. */
export function numinaOutcomes(key, level, successes, def = null) {
  const spec = NUMINA_EFFECTS[`${key}:${level}`] ?? S();
  const label = `${def?.label ?? key} ${level}`;
  return outcomesOf(spec, {key: spec.kw, label, source: `The Hunters Hunted II p. ${def?.p ?? "?"}`}, successes, String(def?.levels?.[level - 1] ?? ""));
}
