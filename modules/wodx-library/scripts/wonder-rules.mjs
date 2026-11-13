/**
 * WoDX Library: making the supernatural items of each line (B3630-B3636). No Foundry calls here; the data is in
 * data/wonders.mjs and Storyteller runs the work as a long task (scripts/wonders.mjs there).
 *
 * One table for every line (Ben's Item Crafting Desk, 2026-11-13, g1): a row says what it needs, the roll, the time,
 * the cost and the item it makes. A finished task makes a real item (g2): a Fetish item with its Gnosis that WoDX
 * Actions' fetish window attunes and wakes, talens marked as one use, a weapon for war fetishes, and the silver the
 * carrier pays in Gnosis. Werewolf and the Changing Breeds come first; other lines add a LINES entry and rows.
 */
import {WONDERS, MAKES, MAKERS, TALEN_EXTRA, byKey} from "../data/wonders.mjs";

export {WONDERS, MAKES, MAKERS, TALEN_EXTRA, byKey};

/** The lines that can make things, each with its world setting (g6: on in the testbed, off on Live until Ben says). */
export const LINES = {
  garou: {label: "Werewolf and the Changing Breeds", setting: "craftGarou", makers: ["garou", "kinfolk"]}
};

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const low = s => String(s ?? "").toLowerCase();

/** The Changing Breeds as WoDX Actions names them (feraKey), lower case; anything else counts as Garou. */
export const breedOf = s => {
  const k = low(s).normalize("NFD").replace(/[^a-z]/g, "");
  return ["ananasi", "bastet", "corax", "gurahl", "kitsune", "mokole", "nagah", "nuwisha", "ratkin", "rokea", "apis", "camazotz", "grondr"].find(b => k.includes(b)) ?? "garou";
};

/**
 * Who is making it, from what the caller reads off the sheet.
 * m: {profile ("lupine", "mortal", ...), kinfolk (tribe or true), breed, gnosis (permanent), willpower, rituals,
 *     rites: [names known], gender}
 * Returns {kind: "garou"|"kinfolk"|null, breed, ...m}.
 */
export function makerOf(m = {}) {
  const lupine = low(m.profile) === "lupine";
  const kind = lupine ? "garou" : (m.kinfolk && n(m.gnosis) >= 1 ? "kinfolk" : null);
  return {...m, kind, breed: lupine ? breedOf(m.breed) : "garou", gnosis: n(m.gnosis), willpower: n(m.willpower), rituals: n(m.rituals),
    rites: (m.rites ?? []).map(String)};
}

/** Can this row be made in the year? (a modern device has a first year) */
export const inYear = (w, year = 0) => !w.from || !year || year >= w.from;

/**
 * The rows a maker may choose, by line. A Garou sees the Garou list; another Changing Breed sees the Garou list and its
 * own breed's fetishes; Kinfolk see the Garou list (B3634, house reading until W20 Kinfolk is read).
 */
export function listFor(maker, {line = "garou", year = 0} = {}) {
  const mk = maker?.kind ? maker : makerOf(maker);
  if ( !mk.kind || !LINES[line]?.makers.includes(mk.kind) ) return [];
  return WONDERS.filter(w => w.line === line && inYear(w, year) && (!w.breeds || w.breeds.includes(mk.breed)));
}

/** The level of the rite a row needs. */
export const riteLevel = w => w.kind === "talen" ? MAKES.talen.riteLevel : MAKES.fetish.riteLevel;

/**
 * What stops the maker, as plain reasons (g3: WoDX checks they have the power). Empty when nothing does.
 * opts.spend: permanent Gnosis to spend (fetish) or Gnosis to spend (talen).
 */
export function blockers(w, maker, {spend = 0} = {}) {
  const mk = maker?.kind !== undefined ? maker : makerOf(maker);
  const out = [];
  if ( !w ) return ["no such item"];
  if ( !mk.kind ) out.push("only Garou, the other Changing Breeds and Kinfolk with Gnosis make fetishes and talens");
  const make = MAKES[w.kind];
  const knows = mk.rites.some(r => make.rite.test(r));
  if ( !knows ) out.push(`needs the ${make.label} (level ${make.riteLevel})`);
  if ( mk.rituals < make.riteLevel ) out.push(`needs Rituals ${make.riteLevel} or more`);
  const s = Math.max(0, Math.round(n(spend)));
  if ( w.kind === "talen" && s < MAKES.talen.minSpend ) out.push("the binder must spend at least 1 Gnosis");
  if ( s > mk.gnosis ) out.push(`spends ${s} Gnosis but has ${mk.gnosis}`);
  return out;
}

/** Notes the Storyteller should see, not blockers. */
export function cautions(w, maker) {
  const out = [];
  if ( w?.onlyFemale && low(maker?.gender) && !/^(f|female|woman)$/.test(low(maker.gender)) ) out.push(`${w.name} will not work for a male Garou (W20 pdf ${w.pdf}).`);
  if ( w?.tribe ) out.push(`A signature fetish of the ${w.tribe}; others making one may need the tribe's teaching.`);
  if ( w?.silver ) out.push(`Silver: carrying it costs ${w.silver} from the bearer's effective Gnosis.`);
  if ( w?.house ) out.push("Part of this entry is a house reading (logged for review).");
  return out;
}

/**
 * The roll's difficulty. Fetish: 10, two lower for each permanent Gnosis spent, and lower again (0 to 3) for good
 * persuasion. Talen: the spirit's Gnosis, one lower for each Gnosis spent. Clamped to 2..10 like every long task.
 */
export function difficulty(w, {spend = 0, persuasion = 0, court = 0} = {}) {
  const s = Math.max(0, Math.round(n(spend)));
  const base = w.kind === "talen" ? n(w.gnosis) - s * MAKES.talen.gnosisCut : MAKES.fetish.diff - s * MAKES.fetish.gnosisCut - Math.max(0, Math.min(3, Math.round(n(persuasion))));
  return Math.max(2, Math.min(10, base + Math.round(n(court))));
}

/**
 * The long task that makes it: a seed for Storyteller's saveTask. A fetish waits for the three nights of cleansing
 * before its one roll (delay, in days); the binding is delicate (a botch ruins the vessel and angers the spirit).
 */
export function taskFor(w, maker, {spend = 0, persuasion = 0, court = 0, strength = "gaffling", forced = false} = {}) {
  const make = MAKES[w.kind];
  const talen = w.kind === "talen";
  return {
    kind: "fetish", name: `${talen ? "Bind" : "Make"} ${talen ? "talens: " : ""}${w.name}`,
    attr: talen ? "" : make.attr, ability: talen ? "" : make.ability, pool: talen ? "willpower" : "",
    diff: difficulty(w, {spend, persuasion, court}), goal: 1, interval: make.interval, delicate: true,
    delay: make.cleanse, wonder: w.key, spend: Math.max(0, Math.round(n(spend))), power: TALEN_EXTRA[strength] !== undefined ? strength : "gaffling",
    forced: !!forced, note: `${make.label}: ${w.spirit}.${forced ? " The spirit is forced in: it must first be beaten to 0 Essence." : ""}`
  };
}

/** How many talens the binding makes: one a success, plus two or three for a stronger spirit (W20 pdf 229). */
export const talenCount = (successes, strength = "gaffling") => Math.max(0, Math.round(n(successes))) > 0
  ? Math.min(12, Math.round(n(successes)) + (TALEN_EXTRA[strength] ?? 0)) : 0;

const para = s => `<p>${String(s ?? "").replace(/[<>&]/g, c => ({"<": "&lt;", ">": "&gt;", "&": "&amp;"})[c])}</p>`;

/**
 * The items a finished task makes. spirit: what the Storyteller says was bound (defaults to the row's text).
 * Returns item data: one Fetish item (and a Melee Weapon beside it for war fetishes), or `count` talens.
 */
export function itemsFor(w, {successes = 1, strength = "gaffling", spirit = "", maker = "", at = 0} = {}) {
  if ( !w ) return [];
  const talen = w.kind === "talen";
  const bound = String(spirit || w.spirit);
  const flag = {key: w.key, line: w.line, kind: w.kind, spirit: bound, silver: n(w.silver), maker: String(maker), at: n(at),
    ref: `${w.book}, pdf ${w.pdf}`, does: w.does};
  const desc = para(w.does) + para(`Spirit bound: ${bound}.`) + (w.silver ? para(`Silver: the bearer's effective Gnosis is ${w.silver} lower while carrying it.`) : "")
    + (w.weapon?.note ? para(w.weapon.note) : "") + para(`${w.book}, pdf ${w.pdf}.`);
  const fetish = {name: w.name, type: "Fetish", img: "icons/svg/item-bag.svg",
    system: {gnosis: n(w.gnosis), difficulty: n(w.gnosis), type: talen ? "wod.types.talen" : "wod.types.fetish", level: String(w.level ?? ""), description: desc, reference: `${w.book}, pdf ${w.pdf}`},
    flags: {"wodx-library": {wonder: flag}, ...(talen ? {"wodx-actions": {talen: true}} : {})}};
  if ( talen ) {
    const k = talenCount(successes, strength);
    return Array.from({length: k}, () => structuredClone(fetish));
  }
  const out = [fetish];
  if ( w.weapon ) {
    const x = w.weapon;
    out.push({name: `${w.name} (as a weapon)`, type: "Melee Weapon", img: "icons/svg/sword.svg",
      system: {difficulty: x.diff, damage: {attribute: x.attr, bonus: x.bonus, type: x.type, isrollable: true},
        attack: {attribute: "dexterity", ability: x.ability || "melee", accuracy: 0, isrollable: true}, istwohanded: x.hands === 2, conceal: "",
        description: para(`${w.name}: the fetish itself, used as a weapon.`) + (x.note ? para(x.note) : "") + para(`${w.book}, pdf ${w.pdf}.`), reference: `${w.book}, pdf ${w.pdf}`},
      flags: {"wodx-library": {wonder: {...flag, weaponOf: w.key}}}});
  }
  return out;
}

/**
 * Silver a bearer carries, from item flags: each made klaive or grand klaive counts once (fetish and its weapon are
 * one thing). Returns {klaive, grand} for WoDX Actions' silverGnosisPenalty.
 */
export function silverCarried(items = []) {
  const seen = new Set();
  let klaive = 0, grand = 0;
  for ( const it of items ) {
    const f = it?.flags?.["wodx-library"]?.wonder;
    if ( !f?.silver || seen.has(f.key + "|" + (f.at || "")) ) continue;
    seen.add(f.key + "|" + (f.at || ""));
    if ( f.silver >= 2 ) grand += 1; else klaive += 1;
  }
  return {klaive, grand};
}

/** A one-line summary for a picker. */
export function label(w) {
  return `${w.name} (${w.kind === "talen" ? "talen" : `level ${w.level}`}, Gnosis ${w.gnosis})`;
}
