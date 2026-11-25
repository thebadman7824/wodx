/**
 * WoDX Creation 0.26.0: the Traits that follow from the others at creation (B3000 to B3004). Humanity or a Road from
 * the Virtues, Willpower from Courage (or the line's fixed start), Rage by auspice, Gnosis by breed, Willpower by
 * tribe, Arete and Quintessence, Corpus and Pathos, Glamour and Banality, Faith and Torment, Balance and Sekhem.
 * Dots bought with freebies in the wizard and the prelude's Willpower gains are added on top. Book rules in WoDX's
 * own words; the page refs are each line's creation pages in creation-totals.mjs. No Foundry here.
 */
import {TOTALS} from "../data/creation-totals.mjs";
import {startingTempers} from "../../wodx-actions/scripts/c20-rules.js";

const n = v => Math.max(0, Math.trunc(Number(v) || 0));
const prop = (o, p) => String(p).split(".").reduce((x, k) => x?.[k], o);
const low = s => String(s ?? "").trim().toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ");

/** A sheet's own text field: the PC sheet keeps it in bio.splatfields, the older sheets at the top. */
export function field(sys = {}, key) {
  const v = sys?.bio?.splatfields?.[key]?.value ?? sys?.[key] ?? sys?.custom?.[key] ?? "";
  return low(typeof v === "object" ? (v?.value ?? "") : v);
}

export const RAGE_BY_AUSPICE = {ragabash: 1, theurge: 2, philodox: 3, galliard: 4, ahroun: 5};
export const GNOSIS_BY_BREED = {homid: 1, metis: 3, lupus: 5};
/** W20 core, each tribe's starting Willpower. The Dark Ages names map onto them (B3002; book check passed 2026-11-13). */
export const WILLPOWER_BY_TRIBE = {"black furies": 3, "bone gnawers": 4, "children of gaia": 4, fianna: 3, "get of fenris": 3, "glass walkers": 3,
  "red talons": 3, "shadow lords": 3, "silent striders": 3, "silver fangs": 3, stargazers: 4, uktena: 3, wendigo: 4,
  // B6779e: the lost tribes (W20 pp. 389, 391, 393) and the Black Spiral Dancers (W20 p. 425)
  bunyip: 4, croatan: 4, "white howlers": 3, "black spiral dancers": 3};
// B6779e: the Hakken have no row of their own (W20 pp. 506-507 call them a group apart, with loose ties to the Shadow
// Lords); house rule: their starting Willpower is the Shadow Lords' 3
const TRIBE_ALIAS = {fenrir: "get of fenris", "warders of men": "glass walkers", hakken: "shadow lords", "black spiral": "black spiral dancers"};
/** Demon: the Fallen's starting Torment by House (B3003, corrected after the book check, B3005). */
export const TORMENT_BY_HOUSE = {devils: 4, namaru: 4, scourges: 3, asharu: 3, malefactors: 3, annunaki: 3, fiends: 3, neberu: 3,
  defilers: 3, lammasu: 3, devourers: 4, rabisu: 4, slayers: 4, halaku: 4};
/** The Dark Ages tribes whose starting Willpower differs from W20 (B3005, book check 2026-11-13). */
export const DARK_AGES_TRIBE_WILLPOWER = {"children of gaia": 3};
/** C20: what each seeming adds at the start (B3006). The Wilder picks Glamour or Willpower. */
/** B5024: whether the sheet's seeming is a wilder's. */
export const isWilder = sys => field(sys ?? {}, "seeming").includes("wilder");
export const SEEMING_BONUS = {childling: {glamour: 1}, wilder: {choice: true}, grump: {willpower: 1}};

/**
 * B7831: W20 Changing Breeds, each Breed's starting Rage, Gnosis and Willpower. by: which sheet field picks the row
 * (auspice holds the aspect, auspice, path or seasonal auspice; tribe holds a Bastet tribe), or a number for every
 * member. rage: false is a Breed with no Rage. Pages are the private dump's pdf pages (printed = pdf + 7).
 * The other creation totals stay W20's (W20 Changing Breeds gives no figures of its own for them).
 */
export const FERA_STARTS = {
  ajaba: {page: "W20 Changing Breeds pdf 42-43 / printed 49-50", rage: {by: "auspice", t: {dawn: 5, midnight: 3, dusk: 1}},
    gnosis: {by: "auspice", t: {dawn: 1, midnight: 3, dusk: 5}}, willpower: 3},
  ananasi: {page: "W20 Changing Breeds pdf 55 / printed 62", rage: false, gnosis: {by: "breed", t: {homid: 1, arachnid: 5}},
    willpower: {by: "breed", t: {homid: 3, arachnid: 4}}, note: "Ananasi have no Rage; every Ananasi has a blood pool of 10."},
  bastet: {page: "W20 Changing Breeds pdf 67-77 / printed 74-84",
    rage: {by: "tribe", t: {bagheera: 2, balam: 4, bubasti: 1, ceilican: 3, khan: 5, pumonca: 4, qualmi: 2, simba: 5, swara: 2}},
    gnosis: {by: "breed", t: {homid: 1, metis: 3, feline: 5}},
    willpower: {by: "tribe", t: {bagheera: 4, balam: 3, bubasti: 5, ceilican: 3, khan: 2, pumonca: 4, qualmi: 5, simba: 2, swara: 4}}},
  corax: {page: "W20 Changing Breeds pdf 88 / printed 95", rage: 1, gnosis: 6, willpower: 3,
    note: "Raven's Gifts: every Corax starts with one more dot each of Subterfuge, Enigmas and Dodge."},
  gurahl: {page: "W20 Changing Breeds pdf 100, 105-106 / printed 107, 112-113", rage: {by: "breed", t: {homid: 3, ursine: 4}},
    gnosis: {by: "breed", t: {homid: 4, ursine: 5}}, willpower: 6},
  kitsune: {page: "W20 Changing Breeds pdf 119-122 / printed 126-129", rage: {by: "auspice", t: {kataribe: 2, gukutsushi: 2, doshi: 3, eji: 4}},
    gnosis: {by: "breed", t: {kojin: 3, roko: 5, shinju: 4}}, willpower: 5},
  mokole: {page: "W20 Changing Breeds pdf 136-139 / printed 143-146", rage: null, gnosis: {by: "breed", t: {homid: 2, suchid: 4}},
    willpower: {by: "auspice", t: {striking: 3, "rising sun": 3, unshading: 5, unshaded: 5, noonday: 5, warding: 3, "setting sun": 3,
      concealing: 4, shrouded: 4, shining: 4, "midnight sun": 4, gathering: 5, decorated: 5, crowning: 5, eclipse: 5,
      hemanta: 2, zarad: 3, grisma: 4, vasanta: 5, "tung chun": 3, "nam hsai": 5, "sai chau": 5, "pei tung": 4}},
    note: "W20 Changing Breeds gives the Mokole no starting Rage: set it with the Storyteller. The Archid form gets as many Characteristics as the starting Gnosis."},
  nagah: {page: "W20 Changing Breeds pdf 150-151 / printed 157-158",
    rage: {by: "auspice", t: {kamakshi: 3, spring: 3, kartikeya: 4, summer: 4, kamsa: 3, autumn: 3, kali: 4, winter: 4}},
    gnosis: {by: "breed", t: {balaram: 1, ahi: 3, vasuki: 5}}, willpower: 4},
  nuwisha: {page: "W20 Changing Breeds pdf 162-163 / printed 169-170", rage: false, gnosis: {by: "breed", t: {homid: 1, latrani: 5}}, willpower: 4,
    note: "Nuwisha have no Rage and cannot frenzy."},
  ratkin: {page: "W20 Changing Breeds pdf 175-178 / printed 182-185",
    rage: {by: "auspice", t: {"tunnel runner": 1, "shadow seer": 2, "knife skulker": 3, warrior: 5, "blade slave": 5, engineer: 2, "plague lord": 3, munchmausen: 4, twitcher: 5}},
    gnosis: {by: "breed", t: {homid: 1, metis: 3, rodens: 5}}, willpower: 3},
  rokea: {page: "W20 Changing Breeds pdf 192-193 / printed 199-200", rage: {by: "auspice", t: {brightwater: 5, dimwater: 4, darkwater: 3}},
    gnosis: {by: "breed", t: {homid: 1, squamus: 5}}, willpower: 4}
};
/** The sheet's Breed as a FERA_STARTS key ("Mokolé" to mokole), or "" for a Garou or a Breed not in the table. */
export const feraOf = sys => {
  const k = low(sys?.changingbreed ?? field(sys, "changingbreed")).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return FERA_STARTS[k] ? k : "";
};

const lookup = (table, text, alias = {}) => {
  const t = low(text);
  if ( !t ) return null;
  const k = alias[t] ?? Object.keys(table).find(x => t === x || t.startsWith(`${x} `) || t.includes(x)) ?? Object.entries(alias).find(([a]) => t.includes(a))?.[1];
  return k && table[k] !== undefined ? table[k] : null;
};

const virtue = (sys, k) => n(sys?.advantages?.virtues?.[k]?.permanent);
const inUse = (sys, k) => { const v = sys?.advantages?.virtues?.[k]; return !!v && (n(v.permanent) > 0 || !!v.isvisible); };

/** Humanity or the Road: the two moral Virtues added, Conviction and Instinct where the sheet uses them. */
function roadBase(sys) {
  const first = inUse(sys, "conviction") && !inUse(sys, "conscience") ? "conviction" : "conscience";
  const second = inUse(sys, "instinct") && !inUse(sys, "selfcontrol") ? "instinct" : "selfcontrol";
  return {value: virtue(sys, first) + virtue(sys, second), from: `${first === "conviction" ? "Conviction" : "Conscience"} + ${second === "instinct" ? "Instinct" : "Self-Control"}`};
}

/** The two highest of the Virtues on the sheet, added. */
function twoHighest(sys) {
  const v = ["conscience", "conviction", "courage", "selfcontrol", "instinct"].filter(k => inUse(sys, k)).map(k => virtue(sys, k)).sort((a, b) => b - a);
  return (v[0] ?? 0) + (v[1] ?? 0);
}

/**
 * The derived Traits for a line, as rows: {key, label, path, set: {path: value}, want, have, how, extra}. want is null
 * when the sheet does not say enough yet (no auspice, no House), with how saying what is missing. Rows the wizard
 * cannot work out go in `notes`.
 *   sys         the actor's system data
 *   bought      the wizard's freebie dots per extra key: {willpower, road, rage, gnosis, arete, glamour}
 *   prelude     Willpower dots the prelude gave
 *   backgrounds {lowercase name: dots}
 */
export function derivedTraits(lineId, sys = {}, {bought = {}, prelude = 0, backgrounds = {}, wilder = "glamour"} = {}) {
  const L = TOTALS[lineId];
  if ( !L ) return {rows: [], notes: [], ref: ""};
  const rows = [], notes = [];
  const bg = name => n(backgrounds[low(name)]);
  const add = (key, label, path, base, how, {extra = null, temp = true, value = false, plus = 0} = {}) => {
    const b = extra ? n(bought[extra]) : 0;
    const want = base === null ? null : Math.min(key === "corpus" ? 10 : 20, n(base) + b + n(plus));
    const set = {};
    if ( want !== null ) { set[`${path}.permanent`] = want; if ( temp ) set[`${path}.temporary`] = want; if ( value ) set[`${path}.value`] = want; }
    const bits = [how, b ? `plus ${b} bought with freebies` : "", plus ? `plus ${plus} from the prelude` : ""].filter(Boolean);
    rows.push({key, label, path, set, want, have: n(prop(sys, `${path.replace(/^system\./, "")}.permanent`) ?? prop(sys, `${path.replace(/^system\./, "")}.temporary`)), how: bits.join(", "), extra});
  };
  const wp = (base, how) => add("willpower", "Willpower", "system.advantages.willpower", base, how, {extra: "willpower", plus: prelude});
  const road = (label = "Humanity") => { const r = roadBase(sys); add("road", label, "system.advantages.path", r.value, r.from, {extra: "road", temp: false, value: true}); };

  switch ( lineId ) {
    // B7820: HH2 hunters and plain mortals keep V20's Humanity and Courage (HH2 pdf 36 / printed 35)
    case "v20": case "ghoul": case "revenant": case "hh2": case "mortal":
      road(inUse(sys, "conviction") || inUse(sys, "instinct") ? "Humanity or Path" : "Humanity");
      wp(virtue(sys, "courage"), "Courage");
      break;
    case "vtda20":
      road("Road");
      wp(virtue(sys, "courage"), "Courage");
      break;
    case "daelder": {
      // B7691: the Road less 1 for each 150 years active, 2 at the least (DASC 2002 printed p. 76)
      const r = roadBase(sys);
      add("road", "Road", "system.advantages.path", Math.max(1, r.value - 2), `${r.from}, less 2 for the years`, {extra: "road", temp: false, value: true});
      notes.push("An elder active for 450 years or more loses another dot of Road for each 150 years, and may take 15 more bonus points for each.");
      wp(virtue(sys, "courage"), "Courage");
      notes.push("Generation starts at ninth: each dot of the Generation Background makes it one lower.");
      break;
    }
    case "kote":
      wp(Math.max(5, n(sys?.advantages?.hun?.permanent)), "Hun, 5 at least");
      notes.push("Yin, Yang, Hun, P'o and Dharma follow the Direction and Dharma: set them with the Storyteller.");
      break;
    case "w20": case "daw": {
      // a Dark Ages Changing Breed too: DA:W gives only the Garou tables (house rule, docs/PENDING-REVIEW.md)
      const fera = feraOf(sys);
      if ( fera ) {
        const F = FERA_STARTS[fera];
        const pick = (spec, what) => {
          if ( spec === false ) return {v: null, how: "This Breed has no " + what};
          if ( spec === null || spec === undefined ) return {v: null, how: "The book gives no starting " + what + ": set it with the Storyteller"};
          if ( typeof spec === "number" ) return {v: spec, how: "Every member starts at " + spec};
          const v = lookup(spec.t, field(sys, spec.by));
          return {v, how: v === null ? `Write the ${spec.by === "auspice" ? "aspect or auspice" : spec.by} on the sheet first` : `By ${spec.by === "auspice" ? "aspect" : spec.by}`};
        };
        const r = pick(F.rage, "Rage"), g = pick(F.gnosis, "Gnosis"), w = pick(F.willpower, "Willpower");
        if ( F.rage !== false ) add("rage", "Rage", "system.advantages.rage", r.v, r.how, {extra: "rage"});
        add("gnosis", "Gnosis", "system.advantages.gnosis", g.v, g.how, {extra: "gnosis"});
        wp(w.v, w.how);
        if ( F.note ) notes.push(F.note);
        notes.push(`${F.page}.`);
        break;
      }
      const ausp = field(sys, "auspice"), breed = field(sys, "breed"), tribe = field(sys, "tribe");
      const r = lookup(RAGE_BY_AUSPICE, ausp), g = lookup(GNOSIS_BY_BREED, breed);
      const w = (lineId === "daw" ? lookup(DARK_AGES_TRIBE_WILLPOWER, tribe) : null) ?? lookup(WILLPOWER_BY_TRIBE, tribe, TRIBE_ALIAS);
      add("rage", "Rage", "system.advantages.rage", r, r === null ? "Write the auspice on the sheet first" : "By auspice", {extra: "rage"});
      add("gnosis", "Gnosis", "system.advantages.gnosis", g, g === null ? "Write the breed on the sheet first" : "By breed", {extra: "gnosis"});
      wp(w, w === null ? (tribe ? "This tribe is not in the list: set it with the Storyteller" : "Write the tribe on the sheet first") : "By tribe");
      break;
    }
    case "m20": {
      add("arete", "Arete", "system.advantages.arete", 1, "Starts at 1", {extra: "arete"});
      wp(5, "Starts at 5");
      const path = sys?.quintessence && typeof sys.quintessence === "object" ? "system.quintessence" : "system.advantages.quintessence";
      add("quintessence", "Quintessence", path, bg("Avatar"), "As many as the Avatar Background");
      break;
    }
    case "dam": {
      wp(5, "Starts at 5");
      const path = sys?.quintessence && typeof sys.quintessence === "object" ? "system.quintessence" : "system.advantages.quintessence";
      const cf = bg("Cray") + bg("Fount");
      add("quintessence", "Quintessence", path, Math.max(5, cf), cf > 5 ? "Cray + Fount" : "Starts at 5");
      break;
    }
    case "wr20":
      add("corpus", "Corpus", "system.advantages.corpus", 10, "Starts full at 10");
      add("pathos", "Pathos", "system.advantages.pathos", 5 + bg("Memoriam"), "5 + Memoriam");
      wp(5, "Starts at 5");
      notes.push("The Shadow's Angst, Dark Passions and Thorns are made with the Storyteller.");
      break;
    case "c20": {
      const seem = Object.keys(SEEMING_BONUS).find(k => field(sys, "seeming").includes(k)), sb = SEEMING_BONUS[seem] ?? {};
      // B5024: a wilder's point goes where the wizard's pick says (Glamour unless Willpower is picked)
      const own = sb.choice ? (wilder === "willpower" ? {willpower: 1} : {glamour: 1}) : sb;
      const tag = what => seem && own[what] ? `Starts at 4, plus ${own[what]} as a ${seem}${sb.choice ? " (the player's pick)" : ""}` : "Starts at 4";
      // B6935: the Tempers are WoDX Actions' C20 rule (startingTempers, C20 pp. 85-87, 144-145); no seeming yet, the base
      const t = startingTempers(seem ?? "", wilder === "willpower" ? "willpower" : "glamour");
      wp(t.willpower, tag("willpower"));
      add("glamour", "Glamour", "system.advantages.glamour", t.glamour, tag("glamour"), {extra: "glamour"});
      add("banality", "Banality", "system.advantages.banality", t.banality, "Starts at 3");
      if ( sb.choice ) notes.push(`A wilder adds 1 to Glamour or to Willpower: now ${wilder === "willpower" ? "Willpower" : "Glamour"}; change the pick below.`);
      else if ( !seem ) notes.push("Write the seeming on the sheet: a childling starts with 1 more Glamour, a grump with 1 more Willpower, and a wilder picks one.");
    }
      break;
    case "dafae":
      wp(4, "Starts at 4");
      notes.push("Mists and Weaving follow the origin: set them with the Storyteller.");
      break;
    case "inquisitor":
      wp(virtue(sys, "courage") + n(sys?.advantages?.virtues?.zeal?.permanent), "Courage + Zeal");
      notes.push("Conviction is the order's Superior Virtue plus its Virtue: set it with the Storyteller.");
      break;
    // B7820: Kinfolk start at Willpower 3 (W20 pdf 382 / printed 380); a sorcerer at 5 (Sorcerer Revised pdf 46 / printed 45)
    case "kinfolk":
      wp(3, "Starts at 3");
      notes.push("No Gifts at creation: a Kinfolk learns them in play from a teacher.");
      break;
    case "sorcerer":
      wp(5, "Starts at 5");
      notes.push("The Mana pool equals the Mana Background; pick a Resonance Trait (Dynamic, Entropic or Static).");
      break;
    case "kinain":
      add("glamour", "Glamour", "system.advantages.glamour", 2, "Holds 2 at most, 1 back each chapter (C20 pdf 460 / printed 459)");
      add("banality", "Banality", "system.advantages.banality", 3, "Starts at 3 (C20 pdf 461 / printed 460)");
      notes.push("C20 gives Kinain no Willpower figure: set it with the Storyteller.");
      break;
    case "htr":
      wp(3, "Starts at 3");
      notes.push("Conviction follows the creed: set it with the Storyteller.");
      break;
    case "demon": {
      add("faith", "Faith", "system.advantages.faith", 3, "Starts at 3");
      const house = field(sys, "house"), t = lookup(TORMENT_BY_HOUSE, house);
      add("torment", "Torment", "system.advantages.torment", t, t === null ? (house ? "This House is not in the list: set it with the Storyteller" : "Write the House on the sheet first") : "By House");
      wp(twoHighest(sys), "The two highest Virtues added");
      break;
    }
    case "mummy": {
      const bal = Math.max(1, n(sys?.advantages?.balance?.permanent));
      add("balance", "Balance", "system.advantages.balance", bal, "1 at least, 3 at most");
      add("sekhem", "Sekhem", "system.advantages.sekhem", bal, "As much as Balance");
      wp(5, "Starts at 5");
      break;
    }
    default:
      notes.push(...L.start);
  }
  for ( const r of rows ) r.off = r.want !== null && r.want !== r.have;
  return {rows, notes, ref: L.ref};
}

/** Vampire blood at the start: {roll, plus, max, how}. roll: dice to roll (0 for a fixed start); plus: dots added. */
export function startingBlood(lineId, {backgrounds = {}} = {}) {
  const bg = name => n(backgrounds[low(name)]);
  switch ( lineId ) {
    // B8035 (#2501, the owner's call, 25 Nov 2026): a new Cainite starts fully fed, not on the book's die, so no new
    // character can start in frenzy. The books' rolls (V20 p. 113, V20DA p. 156) are kept in "book" for reference.
    case "v20": return {full: true, roll: 0, plus: 0, how: "A full pool (house rule; the book rolls one die)", book: "One die"};
    case "vtda20": return {full: true, roll: 0, plus: 0, how: "A full pool (house rule; the book rolls one die + Domain + Herd)", book: "One die + Domain + Herd", bg: bg("Domain") + bg("Herd")};
    case "daelder": return {full: true, roll: 0, plus: 0, how: "A full pool (house rule; the book rolls two dice)", book: "Two dice; any past the Generation's limit are lost"};
    case "ghoul": case "revenant": return {roll: 0, plus: 1, how: "Starts at 1"};
    default: return null;
  }
}

/** Every update the rows ask for, in one object. */
export const derivedUpdates = rows => Object.assign({}, ...rows.filter(r => r.want !== null).map(r => r.set));
