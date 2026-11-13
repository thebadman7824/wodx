/**
 * WoDX Creation 0.28.0: the wizard's quick start (B2827). Pure rules, tested by the harness.
 * The player picks a concept; the quick start spends the book's Attribute, Ability and Virtue allotments the way that
 * concept would, on whatever Traits the sheet shows (a Dark Ages sheet's Archery and Ride, a modern sheet's Firearms
 * and Drive), and suggests a Nature and Demeanor from the sheet's own archetypes. Everything stays editable on the
 * wizard's pages and on the sheet; the step-by-step path is unchanged.
 */

/** The order dots are handed out within a group: mostly to the first, then the second, then the third. */
const SPREAD = [0, 1, 0, 2, 1, 2];
/** How many dots each listed Ability wants before freebies, best first (the line's cap still holds). */
const WANT = [3, 3, 2, 2, 2, 1, 1, 1, 1, 1];

/**
 * The concepts. attrs: the Attribute groups, primary first, and the order within each; abil: the Abilities the
 * concept leans on, best first ("a|b" takes the first the sheet has, so the same concept fits 1197 and 1999);
 * virtues: best first; nature and demeanor: suggestions from the usual archetypes. Words fit every line and era.
 */
export const CONCEPTS = {
  soldier: {label: "Soldier or guard", attrs: ["physical", "mental", "social"],
    order: {physical: ["strength", "stamina", "dexterity"], social: ["manipulation", "charisma", "appearance"], mental: ["wits", "perception", "intelligence"]},
    abil: ["melee", "brawl", "alertness", "firearms|archery", "athletics", "dodge", "ride|drive", "survival", "intimidation", "medicine", "leadership"],
    virtues: ["courage", "selfcontrol", "conscience", "conviction", "instinct"], nature: "Survivor|Conformist", demeanor: "Bravo|Conformist"},
  scholar: {label: "Scholar", attrs: ["mental", "social", "physical"],
    order: {physical: ["dexterity", "stamina", "strength"], social: ["charisma", "manipulation", "appearance"], mental: ["intelligence", "perception", "wits"]},
    abil: ["academics", "occult", "linguistics", "investigation", "theology|science", "awareness", "expression", "alertness", "etiquette", "medicine"],
    virtues: ["conscience", "selfcontrol", "courage", "conviction", "instinct"], nature: "Pedagogue|Visionary", demeanor: "Curmudgeon|Traditionalist"},
  thief: {label: "Thief", attrs: ["physical", "mental", "social"],
    order: {physical: ["dexterity", "stamina", "strength"], social: ["manipulation", "charisma", "appearance"], mental: ["wits", "perception", "intelligence"]},
    abil: ["stealth", "larceny|security", "streetwise", "subterfuge", "dodge", "alertness", "melee", "athletics", "investigation", "law"],
    virtues: ["selfcontrol", "courage", "conscience", "instinct", "conviction"], nature: "Rogue|Survivor", demeanor: "Trickster|Conniver"},
  noble: {label: "Noble or courtier", attrs: ["social", "mental", "physical"],
    order: {physical: ["dexterity", "stamina", "strength"], social: ["manipulation", "charisma", "appearance"], mental: ["intelligence", "wits", "perception"]},
    abil: ["etiquette", "politics", "leadership", "subterfuge", "empathy", "expression", "ride|drive", "melee", "law", "academics", "seneschal|finance"],
    virtues: ["selfcontrol", "conscience", "courage", "conviction", "instinct"], nature: "Autocrat|Director", demeanor: "Gallant|Traditionalist"},
  healer: {label: "Healer", attrs: ["mental", "social", "physical"],
    order: {physical: ["dexterity", "stamina", "strength"], social: ["charisma", "manipulation", "appearance"], mental: ["intelligence", "perception", "wits"]},
    abil: ["medicine", "empathy", "hearthwisdom|science", "occult", "alertness", "academics", "awareness", "crafts", "survival", "etiquette"],
    virtues: ["conscience", "selfcontrol", "courage", "conviction", "instinct"], nature: "Caregiver|Martyr", demeanor: "Caregiver|Pedagogue"},
  woodsman: {label: "Hunter or woodsman", attrs: ["physical", "mental", "social"],
    order: {physical: ["dexterity", "stamina", "strength"], social: ["charisma", "manipulation", "appearance"], mental: ["perception", "wits", "intelligence"]},
    abil: ["survival", "archery|firearms", "animalken", "stealth", "alertness", "athletics", "brawl", "melee", "medicine", "occult"],
    virtues: ["courage", "selfcontrol", "conscience", "instinct", "conviction"], nature: "Loner|Survivor", demeanor: "Loner|Curmudgeon"},
  merchant: {label: "Merchant or trader", attrs: ["social", "mental", "physical"],
    order: {physical: ["stamina", "dexterity", "strength"], social: ["manipulation", "charisma", "appearance"], mental: ["intelligence", "wits", "perception"]},
    abil: ["commerce|finance", "subterfuge", "etiquette", "empathy", "streetwise", "linguistics", "law", "ride|drive", "politics", "alertness"],
    virtues: ["selfcontrol", "conscience", "courage", "conviction", "instinct"], nature: "Architect|Conniver", demeanor: "Bon Vivant|Gallant"},
  believer: {label: "Priest or holy one", attrs: ["social", "mental", "physical"],
    order: {physical: ["stamina", "dexterity", "strength"], social: ["charisma", "manipulation", "appearance"], mental: ["intelligence", "perception", "wits"]},
    abil: ["theology|occult", "expression", "empathy", "academics", "leadership", "occult", "etiquette", "medicine", "linguistics", "awareness"],
    virtues: ["conviction|conscience", "courage", "selfcontrol", "conscience", "instinct"], nature: "Fanatic|Penitent", demeanor: "Pedagogue|Judge"},
  tough: {label: "Street tough", attrs: ["physical", "social", "mental"],
    order: {physical: ["strength", "stamina", "dexterity"], social: ["manipulation", "charisma", "appearance"], mental: ["wits", "perception", "intelligence"]},
    abil: ["brawl", "streetwise", "intimidation", "melee", "athletics", "alertness", "dodge", "subterfuge", "firearms|archery", "drive|ride"],
    virtues: ["courage", "instinct", "selfcontrol", "conscience", "conviction"], nature: "Bravo|Rebel", demeanor: "Bravo|Monster"},
  artisan: {label: "Artisan", attrs: ["mental", "physical", "social"],
    order: {physical: ["dexterity", "stamina", "strength"], social: ["charisma", "manipulation", "appearance"], mental: ["intelligence", "perception", "wits"]},
    abil: ["crafts", "technology|commerce", "alertness", "academics", "commerce|finance", "empathy", "athletics", "streetwise", "science", "expression"],
    virtues: ["selfcontrol", "conscience", "courage", "conviction", "instinct"], nature: "Perfectionist|Architect", demeanor: "Traditionalist|Perfectionist"},
  performer: {label: "Performer", attrs: ["social", "physical", "mental"],
    order: {physical: ["dexterity", "stamina", "strength"], social: ["charisma", "appearance", "manipulation"], mental: ["wits", "perception", "intelligence"]},
    abil: ["performance", "expression", "empathy", "subterfuge", "etiquette", "streetwise", "athletics", "alertness", "dodge", "linguistics"],
    virtues: ["courage", "conscience", "selfcontrol", "instinct", "conviction"], nature: "Celebrant|Bon Vivant", demeanor: "Child|Thrill-Seeker"},
  seeker: {label: "Investigator", attrs: ["mental", "physical", "social"],
    order: {physical: ["dexterity", "stamina", "strength"], social: ["manipulation", "charisma", "appearance"], mental: ["perception", "wits", "intelligence"]},
    abil: ["investigation", "alertness", "law|theology", "empathy", "streetwise", "subterfuge", "occult", "academics", "brawl", "firearms|archery"],
    virtues: ["conviction|conscience", "selfcontrol", "courage", "conscience", "instinct"], nature: "Judge|Visionary", demeanor: "Judge|Curmudgeon"}
};

/** The line's own Ability goes first for the lines that have one (the profile kinds of wizard-rules LINE_KIND). */
export const LINE_FIRST = {lupine: ["primalurge"], fae: ["kenning"], mage: ["awareness"], wraith: ["awareness"], hunter: ["awareness"], mummy: ["occult"], demon: ["awareness"]};

const key = s => String(s ?? "").toLowerCase().replace(/[^a-z]/g, "");

/** Hand out `budget` dots over the listed traits (by index into `list`), each from its current value up to `max`. */
function spread(values, list, budget, max) {
  let left = budget, guard = 0;
  while ( left > 0 && list.length && guard++ < 200 ) {
    let moved = false;
    for ( const i of SPREAD ) {
      if ( left <= 0 ) break;
      const k = list[i % list.length];
      if ( k == null || values[k] >= max ) continue;
      values[k] += 1; left -= 1; moved = true;
    }
    if ( !moved ) break;
  }
  return left;
}

/**
 * The quick build. traits: Creation's traitGroups(system); L: the book's totals (attributes, abilities, abilityCap,
 * virtues); kind: the line profile. Returns {updates: {path: value}, order: {attributes, abilities}, unspent: n}.
 * Every Attribute, Ability and Virtue the sheet shows gets a value, so a sheet half built before starts clean.
 */
export function quickBuild(conceptId, traits = {}, L = {}, {kind = ""} = {}) {
  const c = CONCEPTS[conceptId];
  if ( !c ) return null;
  const updates = {};
  let unspent = 0;
  // Attributes: each starts at its free dot
  const allotA = L.attributes ?? [7, 5, 3];
  c.attrs.forEach((g, rank) => {
    const rows = traits[g] ?? [];
    const vals = Object.fromEntries(rows.map(t => [t.path, 1]));
    const byKey = Object.fromEntries(rows.map(t => [key(t.label), t.path]));
    const list = c.order[g].map(k => byKey[k]).filter(Boolean);
    for ( const t of rows ) if ( !list.includes(t.path) ) list.push(t.path);
    unspent += spread(vals, list, allotA[rank] ?? 0, 5);
    Object.assign(updates, vals);
  });
  // Abilities: find each wanted one on the sheet, whichever group it is in there
  const groups = ["talent", "skill", "knowledge"];
  const where = {};
  for ( const g of groups ) for ( const t of traits[g] ?? [] ) where[key(t.label)] = {g, path: t.path};
  const wanted = [];
  for ( const w of [...(LINE_FIRST[kind] ?? []), ...c.abil] ) {
    const hit = String(w).split("|").map(key).find(k => where[k] && !wanted.some(x => x.path === where[k].path));
    if ( hit ) wanted.push(where[hit]);
  }
  // The group of the concept's first Ability is primary, the next new group secondary (the line's own one aside)
  const lead = wanted.slice((LINE_FIRST[kind] ?? []).filter(k => where[key(k)]).length);
  const abilOrder = [...new Set([...lead.map(x => x.g), ...groups])];
  const cap = L.abilityCap ?? 3, allotB = L.abilities ?? [13, 9, 5];
  const vals = {};
  for ( const g of groups ) for ( const t of traits[g] ?? [] ) vals[t.path] = 0;
  abilOrder.forEach((g, rank) => {
    let left = allotB[rank] ?? 0;
    const mine = wanted.filter(x => x.g === g);
    mine.forEach((x, i) => { const d = Math.min(cap, WANT[i] ?? 1, left); vals[x.path] = d; left -= d; });
    // Any left: one more on the wanted ones, then one dot on the group's other Abilities in the sheet's order
    for ( const x of mine ) { if ( left <= 0 ) break; if ( vals[x.path] < cap ) { vals[x.path] += 1; left -= 1; } }
    for ( const t of traits[g] ?? [] ) { if ( left <= 0 ) break; if ( vals[t.path] === 0 ) { vals[t.path] = 1; left -= 1; } }
    // Still some left (a group the concept hardly uses): round the group again, up to the cap
    for ( let pass = 1; pass < cap && left > 0; pass++ ) for ( const t of [...mine, ...(traits[g] ?? [])] ) { if ( left <= 0 ) break; if ( vals[t.path] === pass ) { vals[t.path] += 1; left -= 1; } }
    unspent += left;
  });
  Object.assign(updates, vals);
  // Virtues, when the line has them: each in use starts with its free dot
  if ( Number.isFinite(L.virtues) && traits.virtues?.length ) {
    const rows = traits.virtues;
    const byKey = Object.fromEntries(rows.map(t => [key(t.label), t.path]));
    const list = [];
    for ( const v of c.virtues ) { const hit = String(v).split("|").map(key).find(k => byKey[k] && !list.includes(byKey[k])); if ( hit ) list.push(byKey[hit]); }
    for ( const t of rows ) if ( !list.includes(t.path) ) list.push(t.path);
    const vv = Object.fromEntries(rows.map(t => [t.path, 1]));
    unspent += spread(vv, list.slice(0, 3), L.virtues, 5);
    Object.assign(updates, vv);
  }
  return {updates, order: {attributes: [...c.attrs], abilities: abilOrder}, unspent};
}

/** The Nature and Demeanor to suggest: the first of each "a|b" pair that the chronicle's archetype list has. */
export function archetypesFor(conceptId, known = null) {
  const c = CONCEPTS[conceptId];
  if ( !c ) return {nature: "", demeanor: ""};
  const pick = s => { const all = String(s).split("|"); return (known ? all.find(a => known.has(a.toLowerCase())) : null) ?? all[0]; };
  return {nature: pick(c.nature), demeanor: pick(c.demeanor)};
}
