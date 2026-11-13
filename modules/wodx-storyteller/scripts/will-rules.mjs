/**
 * WoDX Storyteller 0.62.0: wills and inheritance by the law of the place and year (B2773-B2775). Pure: no Foundry.
 *
 * A will is kept on the testator's sheet (flags["wodx-storyteller"].will): who gets what share, a note, and whether
 * the wealth is held through false heirs (the way the undying keep their fortunes from one century to the next).
 * When someone dies with no will, or a will that leaves something out, the law of their homeland in that year says
 * who inherits. The table is a house reading of history, rounded for play; the books give no such table (B2774).
 */

/** The ways an estate is divided. */
export const RULES = {
  eldest: {label: "To the eldest son", text: "Land and house go to the eldest son, else the eldest daughter, else the nearest kin; a widow keeps a third for life."},
  split: {label: "Shared among the children", text: "Shared equally among the children; a widow keeps a share for life."},
  sons: {label: "Shared among the sons", text: "Shared equally among the sons; daughters have their dowries, and a widow is kept from it."},
  shares: {label: "Fixed shares", text: "Fixed shares by kinship: a son takes twice a daughter's share, a spouse an eighth with children or a quarter without, parents a sixth each. A will may dispose of a third at most."},
  joint: {label: "The joint family", text: "The family's property is held jointly by the sons from birth; on a death the share passes within the joint family."},
  house: {label: "The house goes on", text: "The head of the house passes everything to one heir, most often the eldest son or an adopted heir, who keeps the household."},
  civil: {label: "Civil law", text: "Shared between the spouse and the children by the civil code; a will may direct only part of it."},
  state: {label: "The state takes it", text: "Inheritance is abolished: the estate goes to the state, beyond a small sum for dependants."},
  custom: {label: "Local custom", text: "The family decides by its own custom; the Storyteller rules on who takes what."}
};

/** Law by way of life, then dated rows for regions that differ. [from year, rule]. */
export const BY_SPHERE = {
  latin: [[-9999, "eldest"], [1900, "civil"]], orthodox: [[-9999, "sons"], [1918, "state"], [1923, "civil"]],
  islamic: [[-9999, "shares"]], indic: [[-9999, "joint"], [1956, "civil"]], sinic: [[-9999, "sons"], [1950, "civil"]],
  japanese: [[-9999, "house"], [1947, "civil"]], theravada: [[-9999, "custom"], [1950, "civil"]], tibetan: [[-9999, "custom"]],
  malay: [[-9999, "custom"], [1450, "shares"]], sahel: [[-9999, "shares"]], swahili: [[-9999, "shares"]], bantu: [[-9999, "custom"]],
  mesoamerican: [[-9999, "custom"]], andean: [[-9999, "custom"]], polynesian: [[-9999, "custom"]], northern: [[-9999, "custom"]]
};
export const BY_REGION = {
  "moravia": [[-9999, "eldest"], [1812, "civil"]],
  "german-lands": [[-9999, "split"], [1900, "civil"]],
  "france": [[-9999, "eldest"], [1804, "civil"]],
  "low-countries": [[-9999, "split"], [1811, "civil"]],
  "italy": [[-9999, "eldest"], [1865, "civil"]],
  "iberia": [[-9999, "split"], [1889, "civil"]],
  "british-isles": [[-9999, "eldest"], [1926, "civil"]],
  "scandinavia": [[-9999, "split"], [1900, "civil"]],
  "russia": [[-9999, "sons"], [1918, "state"], [1923, "civil"]],
  "china": [[-9999, "sons"], [1931, "civil"]],
  "anatolia": [[-9999, "shares"], [1926, "civil"]]
};
const at = (rows, y) => { let out = rows[0][1]; for ( const [from, r] of rows ) if ( y >= from ) out = r; return out; };
/** The rule for a region in a year. sphere: Chronicle's sphereFor(region, year). */
export function lawFor(region, year, sphere = "latin") {
  const y = Number(year) || 0;
  const key = BY_REGION[region] ? at(BY_REGION[region], y) : at(BY_SPHERE[sphere] ?? BY_SPHERE.latin, y);
  return {key, ...RULES[key]};
}

/** A will, tidied: {heirs: [{id, name, share}], note, hidden, made}. Shares are fractions that add up to at most 1. */
export function normWill(w = {}) {
  const heirs = (w?.heirs ?? []).filter(h => h && (h.id || h.name)).map(h => ({id: h.id ?? null, name: String(h.name ?? ""), share: Math.max(0, Number(h.share) || 0)}));
  const sum = heirs.reduce((s, h) => s + h.share, 0);
  if ( sum > 1 ) for ( const h of heirs ) h.share = h.share / sum;
  if ( heirs.length && sum === 0 ) for ( const h of heirs ) h.share = 1 / heirs.length;
  return {heirs, note: String(w?.note ?? ""), hidden: !!w?.hidden, made: w?.made ?? null};
}

/**
 * Who takes what. kin: {spouse: {id, name} | null, children: [{id, name, sex, born}], parents: [...], siblings: [...]},
 * the living only. will: normWill. Returns {law, shares: [{id, name, share, why}], free} where free is what the will
 * could not place (it goes by the law).
 */
export function settle({law, kin = {}, will = null} = {}) {
  const out = [];
  const add = (p, share, why) => { if ( !p || share <= 0 ) return; const hit = out.find(o => (p.id && o.id === p.id) || (!p.id && o.name === p.name)); if ( hit ) { hit.share += share; hit.why += `; ${why}`; } else out.push({id: p.id ?? null, name: p.name ?? "", share, why}); };
  const kids = [...(kin.children ?? [])].sort((a, b) => (a.born ?? 0) - (b.born ?? 0));
  const sons = kids.filter(k => k.sex === "male"), daughters = kids.filter(k => k.sex !== "male");
  const w = will ? normWill(will) : {heirs: []};
  // How much a will may give away under this law
  const cap = law.key === "shares" ? 1 / 3 : law.key === "civil" ? 0.5 : law.key === "state" ? 0 : law.key === "joint" ? 0.25 : 1;
  const willed = Math.min(cap, w.heirs.reduce((s, h) => s + h.share, 0));
  const scale = w.heirs.length ? willed / Math.max(1e-9, w.heirs.reduce((s, h) => s + h.share, 0)) : 0;
  for ( const h of w.heirs ) add(h, h.share * scale, "by the will");
  let left = 1 - willed;
  if ( left <= 1e-9 ) return {law, shares: out, free: 0};
  const restKin = [...(kin.parents ?? []), ...(kin.siblings ?? [])];
  const evenly = (list, part, why) => { for ( const p of list ) add(p, part / list.length, why); };
  switch ( law.key ) {
    case "eldest": case "house": {
      const heir = sons[0] ?? daughters[0] ?? restKin[0] ?? null;
      if ( kin.spouse && law.key === "eldest" ) { add(kin.spouse, left / 3, "the widow's third, for life"); left -= left / 3; }
      if ( heir ) add(heir, left, law.key === "eldest" ? "the eldest takes the rest" : "the heir of the house");
      else if ( kin.spouse ) add(kin.spouse, left, "no other heir");
      break;
    }
    case "split": case "civil": {
      const spousePart = kin.spouse ? (kids.length ? left / (law.key === "civil" ? 4 : 3) : left / 2) : 0;
      if ( spousePart ) add(kin.spouse, spousePart, law.key === "civil" ? "the spouse's share by the code" : "the spouse's share");
      const rest = left - spousePart;
      if ( kids.length ) evenly(kids, rest, "a child's equal share");
      else if ( restKin.length ) evenly(restKin, rest, "the nearest kin");
      else if ( kin.spouse ) add(kin.spouse, rest, "no other heir");
      break;
    }
    case "sons": {
      if ( sons.length ) evenly(sons, left, "a son's equal share");
      else if ( daughters.length ) evenly(daughters, left, "no sons");
      else if ( restKin.length ) evenly(restKin, left, "the nearest kin");
      else if ( kin.spouse ) add(kin.spouse, left, "no other heir");
      break;
    }
    case "shares": {
      let pool = left;
      if ( kin.spouse ) { const s = pool * (kids.length ? 1 / 8 : 1 / 4); add(kin.spouse, s, "the spouse's fixed share"); pool -= s; }
      for ( const p of kin.parents ?? [] ) { const s = (left) / 6; if ( pool - s < 0 ) break; add(p, s, "a parent's sixth"); pool -= s; }
      const units = sons.length * 2 + daughters.length;
      if ( units ) { for ( const k of sons ) add(k, pool * 2 / units, "a son's share, twice a daughter's"); for ( const k of daughters ) add(k, pool / units, "a daughter's share"); }
      else if ( (kin.siblings ?? []).length ) evenly(kin.siblings, pool, "the nearest kin");
      else if ( kin.spouse ) add(kin.spouse, pool, "no other heir");
      break;
    }
    case "joint": {
      if ( sons.length ) evenly(sons, left, "a share of the joint family");
      else if ( kin.spouse ) add(kin.spouse, left, "the widow's keep, then the joint family");
      else if ( restKin.length ) evenly(restKin, left, "the joint family");
      break;
    }
    case "state": {
      const keep = Math.min(left, 0.1);
      if ( kids.length || kin.spouse ) evenly([kin.spouse, ...kids].filter(Boolean), keep, "a dependant's allowance");
      break;
    }
    default: break;
  }
  const placed = out.reduce((s, o) => s + o.share, 0);
  return {law, shares: out.map(o => ({...o, share: Math.round(o.share * 1000) / 1000})), free: Math.max(0, Math.round((1 - placed) * 1000) / 1000)};
}

/** Share of a sum of money, rounded down to whole coins; whatever is left over goes to the first heir. */
export function splitMoney(total, shares) {
  const t = Math.max(0, Math.floor(Number(total) || 0));
  const parts = shares.map(s => ({...s, amount: Math.floor(t * s.share)}));
  const rest = t - parts.reduce((s, p) => s + p.amount, 0);
  if ( parts.length && rest > 0 && parts.reduce((s, p) => s + p.share, 0) >= 0.999 ) parts[0].amount += rest;
  return parts;
}

/**
 * Wealth held through false heirs: an undying owner passes it to themselves under a new name. Each passing is a roll,
 * Intelligence + Finance at difficulty 6 (house rule, B2775): a failure leaves a trail someone may follow, a botch
 * makes it a secret someone has found.
 */
export const FALSE_HEIR = {pool: ["intelligence", "finance"], difficulty: 6, every: 40};
/** How many passings a gap of years needs (one each `every` years, at least one if the gap is that long). */
export const passingsFor = years => Math.floor(Math.max(0, Number(years) || 0) / FALSE_HEIR.every);
