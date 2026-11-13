/**
 * WoDX Creation 0.26.0: the Traits that follow from the others at creation (B3000 to B3004). Humanity or a Road from
 * the Virtues, Willpower from Courage (or the line's fixed start), Rage by auspice, Gnosis by breed, Willpower by
 * tribe, Arete and Quintessence, Corpus and Pathos, Glamour and Banality, Faith and Torment, Balance and Sekhem.
 * Dots bought with freebies in the wizard and the prelude's Willpower gains are added on top. Book rules in WoDX's
 * own words; the page refs are each line's creation pages in creation-totals.mjs. No Foundry here.
 */
import {TOTALS} from "../data/creation-totals.mjs";

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
/** W20 core, each tribe's starting Willpower. The Dark Ages names map onto them (B3002; book check pending). */
export const WILLPOWER_BY_TRIBE = {"black furies": 3, "bone gnawers": 4, "children of gaia": 4, fianna: 3, "get of fenris": 3, "glass walkers": 3,
  "red talons": 3, "shadow lords": 3, "silent striders": 3, "silver fangs": 3, stargazers: 4, uktena: 3, wendigo: 4};
const TRIBE_ALIAS = {fenrir: "get of fenris", "warders of men": "glass walkers"};
/** Demon: the Fallen's starting Torment by House (B3003; book check pending). */
export const TORMENT_BY_HOUSE = {devils: 3, namaru: 3, scourges: 3, asharu: 3, malefactors: 3, annunaki: 3, fiends: 3, neberu: 3,
  defilers: 4, lammasu: 4, devourers: 4, rabisu: 4, slayers: 4, halaku: 4};

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
export function derivedTraits(lineId, sys = {}, {bought = {}, prelude = 0, backgrounds = {}} = {}) {
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
    case "v20": case "ghoul": case "revenant":
      road(inUse(sys, "conviction") || inUse(sys, "instinct") ? "Humanity or Path" : "Humanity");
      wp(virtue(sys, "courage"), "Courage");
      break;
    case "vtda20":
      road("Road");
      wp(virtue(sys, "courage"), "Courage");
      break;
    case "kote":
      wp(Math.max(5, n(sys?.advantages?.hun?.permanent)), "Hun, 5 at least");
      notes.push("Yin, Yang, Hun, P'o and Dharma follow the Direction and Dharma: set them with the Storyteller.");
      break;
    case "w20": case "daw": {
      const ausp = field(sys, "auspice"), breed = field(sys, "breed"), tribe = field(sys, "tribe");
      const r = lookup(RAGE_BY_AUSPICE, ausp), g = lookup(GNOSIS_BY_BREED, breed), w = lookup(WILLPOWER_BY_TRIBE, tribe, TRIBE_ALIAS);
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
    case "c20":
      wp(4, "Starts at 4");
      add("glamour", "Glamour", "system.advantages.glamour", 4, "Starts at 4", {extra: "glamour"});
      add("banality", "Banality", "system.advantages.banality", 3, "Starts at 3");
      notes.push("The seeming changes these starting values: check them with the Storyteller.");
      break;
    case "dafae":
      wp(4, "Starts at 4");
      notes.push("Mists and Weaving follow the origin: set them with the Storyteller.");
      break;
    case "inquisitor":
      wp(virtue(sys, "courage") + n(sys?.advantages?.virtues?.zeal?.permanent), "Courage + Zeal");
      notes.push("Conviction is the order's Superior Virtue plus its Virtue: set it with the Storyteller.");
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
    case "v20": return {roll: 1, plus: 0, how: "One die"};
    case "vtda20": return {roll: 1, plus: bg("Domain") + bg("Herd"), how: "One die + Domain + Herd"};
    case "ghoul": case "revenant": return {roll: 0, plus: 1, how: "Starts at 1"};
    default: return null;
  }
}

/** Every update the rows ask for, in one object. */
export const derivedUpdates = rows => Object.assign({}, ...rows.filter(r => r.want !== null).map(r => r.set));
