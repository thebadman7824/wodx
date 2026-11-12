/**
 * WoDX NPC 0.24.0 (B1009 to B1013): supernatural NPCs by line. Each archetype is a temperament (a template beside the
 * line templates in npc-rules), a routine and the years, eras and regions it belongs to. The line templates of 7b and
 * 0.18.0 (neonate, elder, ghoul, garou, mage, technocrat, changeling, ghost, spectre, hunter, inquisitor, sabbat,
 * sheriff, fomor) stay as they are; these sit under them for the clan, tribe, kith, Tradition or creed that conducts
 * itself differently. WoDX readings of each line's usual conduct, V20 first, then Revised or 2nd edition; house
 * rules, not book rules (PENDING-REVIEW). No Foundry calls, so the harness can test it.
 *
 *   from / to   years (null: always). spans: several [from, to] pairs where a kind leaves and comes back.
 *   eras        Chronicle era ids it is limited to (Orpheus crews: the World of Future Darkness only, Ben 2026-11-12).
 *   regions     regions it is limited to (Kuei-jin: Asia only, Ben 2026-11-12). A scene's region is its
 *               flags.wodx-npc.region, else WoDX Storyteller's money region; Moravia when neither says.
 *   pick        a test on an NPC's sides (rivalry-rules sidesOf) that chooses this archetype by line.
 */

const B = (from, to, place, activity, more = {}) => ({from, to, place, activity, when: "any", days: null, feast: "any", label: "", ...more});
const weekdays = [0, 1, 2, 3, 4, 5], monFri = [0, 1, 2, 3, 4];
const night = {when: "night"}, day = {when: "day"};
const KINDRED_FEARS = ["fire", "sunlight", "faith"];
export const WOFD_ERAS = ["future-darkness", "time-of-future-judgement"];

const T = (label, line, v) => ({label, line, aggression: 0.8, caution: 1, cunning: 1, loyalty: 0.8, cowardice: 0.4, berserk: 0, power: 1.2,
  fleeAt: 4, frenzyProne: false, fears: [], tactics: ["power"], ...v});

export const SUPERNATURALS = {
  /* Vampire */
  nosferatu: {kind: "kindred", pick: /clan:nosferatu/, template: T("Nosferatu, keeps to the dark", "kindred", {aggression: 0.6, caution: 1.4, cunning: 1.4,
    cowardice: 0.5, berserk: 0.5, frenzyProne: true, fears: KINDRED_FEARS, tactics: ["stalk", "power", "flee", "masquerade"]}),
    preset: {label: "Nosferatu, out after midnight", blocks: [B(0, 24, "sewer", "sleep", day), B(0, 5, "street", "hunt", {...night, label: "Out after midnight"}),
      B(0, 24, "sewer", "hide", {...night, label: "In the warrens"})]}},
  toreador: {kind: "kindred", pick: /clan:toreador/, template: T("Toreador, holds a salon", "kindred", {aggression: 0.5, caution: 1.2, cunning: 1.2, loyalty: 0.6,
    berserk: 0.6, frenzyProne: true, fears: KINDRED_FEARS, tactics: ["parley", "power", "call", "masquerade"]}),
    preset: {label: "Toreador, salon then the hunt", blocks: [B(0, 24, "haven", "sleep", day), B(19, 23, "tavern", "work", {...night, label: "Holds a salon"}),
      B(23, 3, "street", "hunt", night), B(0, 24, "haven", "rest", night)]}},
  gangrel: {kind: "kindred", pick: /clan:gangrel/, template: T("Gangrel, roams the wilds", "kindred", {aggression: 1.3, caution: 0.6, cunning: 0.6, loyalty: 0.5,
    cowardice: 0.2, berserk: 1.2, frenzyProne: true, territory: 1, fears: KINDRED_FEARS, tactics: ["melee", "power", "ground"]}),
    preset: {label: "Gangrel, sleeps in the earth", blocks: [B(0, 24, "wilds", "sleep", {...day, label: "In the earth"}), B(0, 24, "wilds", "hunt", night)]}},
  "fiend-lord": {kind: "kindred", to: 1493, template: T("Lasombra or Tzimisce lord", "kindred", {aggression: 0.8, caution: 1.1, cunning: 1.6, loyalty: 0.4,
    cowardice: 0.1, berserk: 0.4, power: 2, fleeAt: 5, frenzyProne: true, fears: KINDRED_FEARS, tactics: ["power", "call", "alive", "lead", "guard"]}), preset: "elder"},
  anarch: {kind: "kindred", from: 1381, pick: /sect:anarch|anarch/, template: T("Anarch gang", "kindred", {aggression: 1.2, caution: 0.6, cunning: 0.7, loyalty: 1.2,
    cowardice: 0.3, berserk: 0.9, frenzyProne: true, territory: 1.5, morale: 1, fears: KINDRED_FEARS, tactics: ["melee", "pack", "ground", "power"]}),
    preset: {label: "Anarchs, hunt together", blocks: [B(0, 24, "haven", "sleep", day), B(21, 4, "street", "hunt", {...night, label: "Running with the gang"}),
      B(0, 24, "haven", "rest", night)]}},
  revenant: {kind: "ghoul", pick: /revenant|bratovitch|grimaldi|obertus|zantosa|danyavich|rafastio|ducheski/, template: T("Revenant family", "ghoul", {aggression: 1,
    caution: 0.8, cunning: 0.6, loyalty: 2, cowardice: 0.3, berserk: 0.4, power: 0.6, fears: ["fire"], tactics: ["melee", "guard", "call", "pack"]}),
    preset: {label: "Revenant, serves by day, guards by night", blocks: [B(6, 18, "home", "work", {...day, label: "The household's work"}),
      B(0, 24, "home", "patrol", {...night, label: "Guards the house"}), B(0, 24, "home", "rest")]}},

  /* Werewolf and the Fera */
  "urban-garou": {kind: "lupine", from: 1500, pick: /tribe:(bone gnawer|glass walker|iron rider|urrah)/, template: T("Bone Gnawer or Glass Walker", "lupine", {aggression: 1.2,
    caution: 0.8, cunning: 0.9, loyalty: 1.2, cowardice: 0.2, berserk: 1, frenzyProne: true, territory: 1.5, fears: ["silver"], tactics: ["melee", "power", "call", "masquerade"]}),
    preset: {label: "Garou of the city, patrols at night", blocks: [B(9, 17, "street", "work", {...day, days: weekdays, label: "A life in the city"}),
      B(0, 24, "alley", "patrol", {...night, label: "Watches the city patch"}), B(0, 24, "home", "rest")]}},
  "caern-warder": {kind: "lupine", template: T("Caern warder", "lupine", {aggression: 1.4, caution: 0.6, cunning: 0.6, loyalty: 1.6, cowardice: 0, berserk: 1.2,
    fleeAt: 7, frenzyProne: true, territory: 2, fears: ["silver"], tactics: ["melee", "power", "ground", "call"]}),
    preset: {label: "Caern warder, never leaves the caern", blocks: [B(5, 7, "caern", "patrol", {label: "Dawn round"}), B(17, 19, "caern", "patrol", {label: "Dusk round"}),
      B(0, 24, "caern", "rest", {label: "At the caern"})]}},
  "spiral-dancer": {kind: "lupine", pick: /black spiral|tribe:white howler/, template: T("Black Spiral Dancer", "lupine", {aggression: 1.8, caution: 0.3, cunning: 0.8, loyalty: 0.8,
    cowardice: 0.1, berserk: 1.6, fleeAt: 6, frenzyProne: true, fears: ["silver"], tactics: ["melee", "power", "swarm", "pack"]}),
    preset: {label: "Black Spiral Dancer, out from the hive", blocks: [B(0, 24, "wilds", "hunt", night), B(0, 24, "sewer", "hide", {label: "In the hive"})]}},
  kinfolk: {kind: "mortal", pick: /kinfolk/, template: T("Kinfolk", "mortal", {aggression: 0.4, caution: 1.2, cunning: 0.5, loyalty: 1.4, cowardice: 1, power: 0,
    fleeAt: 2, fears: [], tactics: ["call", "flee"]}), preset: "labourer"},
  fera: {kind: "lupine", pick: /bastet|corax|ratkin|nuwisha|gurahl|ananasi|rokea|mokol|kitsune|nagah|apis|camazotz|grondr/, template: T("Fera watcher", "lupine", {aggression: 0.6,
    caution: 1.4, cunning: 1.4, loyalty: 0.8, cowardice: 0.6, berserk: 0.6, frenzyProne: true, fears: ["silver"], tactics: ["stalk", "scatter", "power", "flee"]}),
    preset: {label: "Fera, watches unseen", blocks: [B(0, 24, "alley", "patrol", night), B(0, 24, "wilds", "hide", day)]}},

  /* Mage */
  "hollow-one": {kind: "mage", from: 1900, pick: /hollow one/, template: T("Hollow One", "mage", {aggression: 0.5, caution: 1.2, cunning: 1.2, loyalty: 0.8, cowardice: 0.6,
    power: 1.6, fleeAt: 3, tactics: ["power", "flee", "masquerade"]}),
    preset: {label: "Hollow One, nights in the club", blocks: [B(22, 4, "tavern", "drink", {label: "At the club"}), B(4, 13, "home", "sleep"), B(13, 22, "home", "work", {label: "Study"})]}},
  marauder: {kind: "mage", pick: /marauder/, template: T("Marauder", "mage", {aggression: 1.2, caution: 0.2, cunning: 0.8, loyalty: 0.2, cowardice: 0.5, berserk: 1, power: 2,
    erratic: true, tactics: ["power", "melee"]}),
    preset: {label: "Marauder, no hours anyone could keep", blocks: [B(0, 24, "street", "wander", {label: "Wanders where the madness takes them"})]}},
  nephandus: {kind: "mage", pick: /nephand/, template: T("Nephandus", "mage", {aggression: 0.8, caution: 1.3, cunning: 1.8, loyalty: 0.2, cowardice: 0.3, power: 2,
    tactics: ["power", "hostage", "call", "masquerade"]}), preset: "mage"},

  /* Wraith */
  legionnaire: {kind: "wraith", pick: /legion:|hierarchy|deathlord/, template: T("Hierarchy legionnaire", "wraith", {aggression: 0.9, caution: 1, cunning: 0.9, loyalty: 1.6,
    cowardice: 0.2, power: 1.4, morale: 1.4, tactics: ["power", "formation", "call", "alive"]}),
    preset: {label: "Legionnaire, patrols the necropolis", blocks: [B(0, 24, "park", "patrol", {...night, label: "Patrols the graveyard"}), B(0, 24, "home", "rest", {label: "At the citadel"})]}},
  renegade: {kind: "wraith", pick: /renegade|heretic/, template: T("Renegade or Heretic", "wraith", {aggression: 0.6, caution: 1.4, cunning: 1.3, loyalty: 0.6, cowardice: 0.6,
    power: 1.6, hunger: 1, tactics: ["power", "flee"]}), preset: "wraith"},

  /* Changeling */
  "sidhe-noble": {kind: "fae", spans: [[null, 1400], [1969, null]], pick: /sidhe|house:/, template: T("Seelie or Unseelie noble", "fae", {aggression: 0.7, caution: 1, cunning: 1.4,
    loyalty: 1, cowardice: 0.4, power: 1.6, fears: ["iron"], tactics: ["parley", "power", "call", "lead"]}), preset: "noble"},
  redcap: {kind: "fae", spans: [[null, 1400], [1969, null]], pick: /kith:redcap/, template: T("Redcap", "fae", {aggression: 1.6, caution: 0.4, cunning: 0.5, loyalty: 0.8,
    cowardice: 0.3, berserk: 1, hunger: 1, fears: ["iron"], tactics: ["melee", "scavenge", "power"]}),
    preset: {label: "Redcap, out at night", blocks: [B(8, 16, "work", "work", {days: weekdays, label: "A mortal living"}), B(22, 4, "alley", "hunt", night),
      B(4, 8, "home", "sleep"), B(0, 24, "home", "rest")]}},
  troll: {kind: "fae", spans: [[null, 1400], [1969, null]], pick: /kith:troll/, template: T("Troll", "fae", {aggression: 1.1, caution: 0.8, cunning: 0.4, loyalty: 2, cowardice: 0.1,
    fleeAt: 6, fears: ["iron"], tactics: ["melee", "guard"]}), preset: "soldier"},
  dauntain: {kind: "fae", from: 1969, pick: /dauntain/, template: T("Dauntain", "fae", {aggression: 1.1, caution: 1, cunning: 1.2, loyalty: 0.6, cowardice: 0.3, power: 1.2,
    fears: [], tactics: ["supernatural", "power", "ranged"]}), preset: "hunter"},

  /* Hunter */
  arcanum: {kind: "hunter", from: 1885, pick: /arcanum/, template: T("Arcanum scholar", "hunter", {aggression: 0.1, caution: 1.6, cunning: 1.4, loyalty: 1, cowardice: 1.4, power: 0.4,
    fleeAt: 2, fears: ["violence"], tactics: ["flee", "call", "report"]}),
    preset: {label: "Arcanum scholar, library hours", blocks: [B(9, 18, "work", "work", {days: weekdays, label: "In the library"}), B(20, 23, "home", "work", {label: "Notes"}),
      B(23, 8, "home", "sleep"), B(0, 24, "home", "rest")]}},
  imbued: {kind: "hunter", from: 1999, wofdFrom: 2023, pick: /creed:/, template: T("Imbued hunter", "hunter", {aggression: 1, caution: 1, cunning: 1, loyalty: 1.1, cowardice: 0.3,
    power: 1.2, fears: [], tactics: ["supernatural", "power", "call", "cover"]}), preset: "hunter"},
  avenger: {kind: "hunter", from: 1999, wofdFrom: 2023, pick: /creed:(avenger|wayward|judge)/, template: T("Imbued of Zeal (Avenger, Judge, Wayward)", "hunter", {aggression: 1.5,
    caution: 0.5, cunning: 0.8, loyalty: 1, cowardice: 0.1, berserk: 0.6, power: 1.2, fleeAt: 5, fears: [], tactics: ["supernatural", "melee", "power"]}), preset: "hunter"},
  defender: {kind: "hunter", from: 1999, wofdFrom: 2023, pick: /creed:(defender|martyr)/, template: T("Imbued who shields others (Defender, Martyr)", "hunter", {aggression: 0.9,
    caution: 0.9, loyalty: 1.8, cowardice: 0.1, power: 1.2, fleeAt: 5, fears: [], tactics: ["guard", "power", "call", "supernatural"]}), preset: "hunter"},
  innocent: {kind: "hunter", from: 1999, wofdFrom: 2023, pick: /creed:(innocent|redeemer|visionar|hermit)/, template: T("Imbued of Mercy or Vision (Innocent, Redeemer, Visionary, Hermit)", "hunter", {aggression: 0.4,
    caution: 1.3, cunning: 1.1, loyalty: 1, cowardice: 0.8, power: 1.2, fleeAt: 3, fears: [], tactics: ["power", "parley", "flee", "call"]}), preset: "hunter"},

  /* Mummy and Demon */
  mummy: {kind: "mummy", from: 1990, template: T("Mummy", "mummy", {aggression: 0.7, caution: 1.3, cunning: 1.4, loyalty: 1.4, cowardice: 0.2, power: 1.6, fleeAt: 5,
    tactics: ["power", "guard", "masquerade"]}),
    preset: {label: "Mummy, a mortal life and the relics", blocks: [B(9, 17, "work", "work", {days: monFri, label: "A mortal life"}), B(20, 24, "home", "work", {label: "With the relics"}),
      B(0, 8, "home", "sleep"), B(0, 24, "home", "rest")]}},
  fallen: {kind: "demon", from: 1999, template: T("Fallen in a host", "demon", {aggression: 0.8, caution: 1.2, cunning: 1.6, loyalty: 0.5, cowardice: 0.3, power: 1.8, fleeAt: 5,
    tactics: ["power", "hostage", "masquerade"]}), preset: "labourer"},

  /* Travellers */
  "kuei-jin": {kind: "kindred", regions: ["asia"], pick: /kuei-jin|kindred of the east|wan kuei|dharma:/, template: T("Kuei-jin traveller", "kindred", {aggression: 0.8, caution: 1.2,
    cunning: 1.4, loyalty: 1, cowardice: 0.2, power: 1.8, fleeAt: 5, fears: [], tactics: ["power", "melee", "parley"]}), preset: "elder"},
  "orpheus-crew": {kind: "mortal", eras: WOFD_ERAS, pick: /orpheus|terrel & squib|terrel and squib|nextworld/, template: T("Orpheus crew", "mortal", {aggression: 0.6, caution: 1.1,
    cunning: 1.2, loyalty: 1.3, cowardice: 0.4, power: 1.2, fears: [], tactics: ["power", "ranged", "call", "formation"]}), preset: "night-shift"}
};

export const SUPERNATURAL_TEMPLATES = Object.fromEntries(Object.entries(SUPERNATURALS).map(([k, a]) => [k, {...a.template,
  ...(a.regions ? {label: `${a.template.label} (${a.regions.join(", ")} only)`} : {}), ...(a.eras ? {label: `${a.template.label} (Future Darkness only)`} : {})}]));
export const SUPERNATURAL_PRESETS = Object.fromEntries(Object.entries(SUPERNATURALS).filter(([, a]) => typeof a.preset === "object")
  .map(([k, a]) => [k, {...a.preset, ...(a.from ? {from: a.from} : {}), ...(a.to ? {to: a.to} : {})}]));
export const SUPERNATURAL_DEFAULT_PRESET = Object.fromEntries(Object.entries(SUPERNATURALS).map(([k, a]) => [k, typeof a.preset === "string" ? a.preset : k]));

/**
 * Does the archetype belong here? {year, era, region}: any left out is not checked. Imbued hunters wait for 2023 in
 * the World of Future Darkness (WoDX's standing rule for Hunters), and for 1999 in the classic years.
 */
export function fits(key, {year = null, era = null, region = null} = {}) {
  const a = SUPERNATURALS[key];
  if ( !a ) return false;
  const y = Number(year);
  const wofd = !!era && WOFD_ERAS.includes(era);
  if ( a.eras && (!era || !a.eras.includes(era)) ) return false;
  if ( a.regions && (!region || !a.regions.includes(region)) ) return false;
  if ( !Number.isFinite(y) || !y ) return true;
  const from = wofd && a.wofdFrom ? a.wofdFrom : a.from;
  const spans = a.spans ?? [[from ?? null, a.to ?? null]];
  return spans.some(([f, t]) => (f === null || y >= f) && (t === null || y <= t));
}
export const supernaturalsFor = (where = {}) => Object.keys(SUPERNATURALS).filter(k => fits(k, where));

/** Most specific first, so a Zeal creed is an Avenger before it is any Imbued. */
const ORDER = ["avenger", "defender", "innocent", "imbued", "arcanum", "dauntain", "redcap", "troll", "sidhe-noble", "spiral-dancer", "fera", "urban-garou",
  "nosferatu", "toreador", "gangrel", "anarch", "revenant", "kinfolk", "hollow-one", "marauder", "nephandus", "legionnaire", "renegade", "kuei-jin", "orpheus-crew"];
/**
 * The archetype an NPC's line and sides choose, or null to keep the line template. where: {year, era, region}, so a
 * Kuei-jin outside Asia or an Orpheus crew before the Future Darkness keeps the line's own template.
 */
export function pickSupernatural({kind, sides = [], generation = 13} = {}, where = {}) {
  const list = (sides ?? []).map(String);
  const has = re => list.some(x => re.test(x));
  if ( kind === "kindred" && has(/^sect:.*sabbat/) ) return null;
  if ( kind === "mage" && has(/technocra|order of reason|daedalean|iteration x|progenitor|syndicate|void engineer|new world order/) ) return null;
  if ( kind === "hunter" && has(/inquisit|leopold/) ) return null;
  for ( const k of ORDER ) {
    const a = SUPERNATURALS[k];
    const kindOk = a.kind === kind || (k === "dauntain" && kind === "mortal") || (k === "kuei-jin" && kind === "exalted");
    if ( kindOk && a.pick && has(a.pick) && fits(k, where) ) return k;
  }
  if ( kind === "kindred" && generation && generation <= 8 && has(/clan:(lasombra|tzimisce)/) && fits("fiend-lord", where) ) return "fiend-lord";
  if ( kind === "mummy" && fits("mummy", where) ) return "mummy";
  if ( kind === "demon" && fits("fallen", where) ) return "fallen";
  return null;
}

/** A Marauder's turn: Quiet turns its choice over to chance. Picks one of the options it scored, seeded by the round. */
export function erraticPick(options, seed = 0) {
  if ( !options?.length ) return options;
  const k = Math.abs(Math.floor(Math.sin(seed + 1) * 10000)) % options.length;
  return [{...options[k], why: `${options[k].why}; Quiet: the Marauder's madness picks this`}, ...options.filter((_, i) => i !== k)];
}
