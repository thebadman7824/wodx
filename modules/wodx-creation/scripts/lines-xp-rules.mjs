/**
 * Experience for every line (B6271): what a dot costs and how high it may go, from the charts in data/lines-xp.mjs.
 * Vampires, ghouls and mortals keep their own table (data/vampire.mjs, rules.mjs xpCost); this answers for the rest.
 * Pure rules: no Foundry calls.
 *
 * Purchase kinds beyond the old ones:
 *   stat      a single rating (Rage, Gnosis, Arete, Glamour, Faith, Balance, Yin, Yang, Hun, P'o); key: its name
 *   power     a rated power the character has (a Sphere, an Art, a Realm, an Arcanos, a Lore, a Hekau path, a Path of
 *             sorcery); cat: which; own: affinity, favoured or of the character's House
 *   newPower  the first dot of one; a Gift (cat "gift") is bought whole, at its level
 */
import {LINE_XP, POWER_ITEMS, SPHERES} from "../data/lines-xp.mjs";

export {LINE_XP, POWER_ITEMS, SPHERES};

export const NEW_KINDS = {
  stat: "Trait",
  power: "Power",
  newPower: "New power"
};

/** Does this line have a chart here? */
export const hasChart = line => !!LINE_XP[line];

const n0 = v => Math.max(0, Math.trunc(Number(v) || 0));

/**
 * Cost of one purchase on a line's chart, or null when the line cannot buy it with experience.
 * p: {line, kind, key, current, cat, own, level, discipline}
 */
export function lineCost({line, kind, key, current = 0, cat, own = false, level = 1}) {
  const t = LINE_XP[line];
  if ( !t ) return null;
  const cur = n0(current), next = cur + 1;
  const by = t.byNext ? next : cur;
  switch ( kind ) {
    case "attribute": return t.attribute ? by * t.attribute : null;
    case "ability": return cur ? by * t.ability : t.newAbility;
    case "newAbility": return t.newAbility;
    case "willpower": return t.willpower ? Math.max(1, by) * t.willpower : null;
    case "virtue": return t.virtue ? Math.max(1, by) * t.virtue : null;
    case "road": return t.road ? Math.max(1, by) * t.road : null;
    case "discipline":
      if ( !t.otherDiscipline ) return null;
      return cur ? cur * t.otherDiscipline : t.newDiscipline;
    case "newDiscipline": return t.newDiscipline ?? null;
    case "stat": {
      const s = t.stats?.[key];
      return s ? Math.max(1, cur) * s.per : null;
    }
    case "power": {
      const c = t.powers?.[cat];
      if ( !c || !c.per ) return null;
      if ( !cur ) return own ? c.newCost : (c.newOther ?? c.newCost);
      return (c.byNext ? next : cur) * ((own && c.perOwn) ? c.perOwn : c.per);
    }
    case "newPower": {
      const c = t.powers?.[cat];
      if ( !c ) return null;
      if ( cat === "gift" ) {
        const lv = Math.max(1, n0(level));
        if ( c.newFlat ) return own ? c.newFlat : (c.newFlatOther ?? c.newFlat);
        return lv * (own ? c.newByLevel : (c.newByLevelOther ?? c.newByLevel));
      }
      return own ? c.newCost : (c.newOther ?? c.newCost);
    }
    default: return null;
  }
}

/** Highest rating on a line's chart. arete: a Mage's Arete, which caps every Sphere (M20). */
export function lineMax({line, kind, key, cat, arete = 0}) {
  const t = LINE_XP[line];
  if ( !t ) return 0;
  switch ( kind ) {
    case "virtue": return 5;
    case "road": case "willpower": return 10;
    case "stat": return t.stats?.[key]?.max ?? 10;
    case "power": case "newPower": {
      const c = t.powers?.[cat];
      if ( !c ) return 0;
      return c.capBy === "arete" ? Math.min(c.max, n0(arete)) : c.max;
    }
    case "discipline": case "newDiscipline": return t.otherDiscipline ? 5 : 0;
    default: return 5;
  }
}

/** The rated powers a line buys, as [cat, label] pairs, for the spend window's "new" row. Gifts are learned in Actions. */
export const newPowerCats = line => Object.entries(LINE_XP[line]?.powers ?? {}).filter(([c]) => c !== "gift").map(([c, v]) => [c, v.label]);
/** Does this cat have an "own" price (affinity, favoured, the character's House)? */
export const hasOwnPrice = (line, cat) => { const c = LINE_XP[line]?.powers?.[cat]; return !!c && (c.perOwn !== undefined || c.newOther !== undefined); };
export const ownWord = cat => ({sphere: "Affinity Sphere", hekau: "Favoured Hekau", lore: "A Lore of the character's own House", gift: "Of the breed, auspice or tribe"})[cat] ?? "The character's own";

/** Is this a power item of the cat? it: {type, system: {type}}. */
export function itemIsCat(it, cat) {
  const s = POWER_ITEMS[cat];
  if ( !s || !it ) return false;
  if ( s.alsoItemType && it.type === s.alsoItemType ) return true;
  return it.type === s.itemType && String(it.system?.type ?? "") === s.sysType;
}

/** The new item for a first dot. */
export function powerItem(cat, name, value = 1, {own = false} = {}) {
  const s = POWER_ITEMS[cat];
  if ( !s ) return null;
  const flags = own ? {"wodx-creation": {favored: true}} : {};
  return {name, type: s.itemType, system: {type: s.sysType, value, level: value, max: 5, label: name}, flags};
}
