/**
 * WoDX Creation: the Dark Ages Storytellers Companion's supporting-character templates as sheet data (B7695). Pure, no
 * Foundry: the harness tests it; supporting-cast.mjs writes the sheet.
 *
 * The book's table gives the dots an experienced or exceptional version adds and leaves the placing to the
 * Storyteller (pdf p. 58). WoDX places them so the template stays what it is (house reading): each pass adds one dot
 * to every trait the template already has in that group, highest first, up to 5 (Disciplines: the template's own,
 * which are all Potence for a ghoul and all clan Disciplines for a Cainite, so the book's "at least half" holds). The
 * Storyteller can move dots on the sheet after.
 */
import {TEMPLATES, TIERS, BASE, ABILITY_2002, SHORT} from "./data/dasc-templates.mjs";
import {findClan, clanDisciplines} from "./rules.mjs";

export const byKey = key => TEMPLATES.find(t => t.key === key) ?? null;
export const pageOf = t => `${SHORT} pdf p. ${t.pdf} / printed p. ${t.pdf - 1}`;

/**
 * Add dots to a trait map, one per trait per pass, highest first (ties keep the book's order), up to cap. A trait
 * named in `skip` is never raised. Returns a new map.
 */
export function spread(traits = {}, dots = 0, cap = 5, skip = []) {
  const out = {...traits};
  const order = Object.keys(out).filter(k => !skip.includes(k)).map((k, i) => ({k, i})).sort((a, b) => (out[b.k] - out[a.k]) || (a.i - b.i)).map(x => x.k);
  let left = Math.max(0, Number(dots) || 0);
  while ( left > 0 ) {
    const open = order.filter(k => out[k] < cap);
    if ( !open.length ) break;
    for ( const k of open ) { if ( !left ) break; out[k] += 1; left -= 1; }
  }
  return out;
}

/** The 2002 Abilities as V20 Dark Ages reads them: renamed ones join their new name at the higher rating. */
export function convertAbilities(abilities = {}) {
  const out = {};
  for ( const [name, v] of Object.entries(abilities) ) {
    const to = ABILITY_2002[name] ?? name;
    out[to] = Math.max(out[to] ?? 0, v);
  }
  return out;
}

/** The Road rating: the two moral Virtues added (V20 Dark Ages creation), 1 to 10. */
export const roadOf = virtues => {
  const v = virtues ?? {};
  return Math.min(10, Math.max(1, (v.conscience ?? v.conviction ?? 1) + (v.selfcontrol ?? v.instinct ?? 1)));
};

/**
 * One template at one tier, ready for a sheet. Returns {key, name, line, group, tier, attributes, abilities,
 * backgrounds, disciplines, virtues, willpower, road: {name, value, path}, generation, clan, about, ref, notes: [..]}.
 */
export function build(key, tier = "base") {
  const t = byKey(key);
  if ( !t ) return null;
  const add = TIERS[tier]?.[t.line] ?? {};
  const clan = t.line === "vampire" ? findClan(t.clan) : null;
  // A Nosferatu's Appearance is 0 (V20 Dark Ages p. 55, B7660) and takes no dots
  const zeroAppearance = !!clan?.appearanceZero;
  const attrs0 = zeroAppearance ? {...t.attributes, appearance: 0} : {...t.attributes};
  const attributes = spread(attrs0, add.attributes, 5, zeroAppearance ? ["appearance"] : []);
  const abilities = spread(convertAbilities(t.abilities), add.abilities, 5);
  // The Generation Background is the Generation itself on a WoDX sheet, so it is not carried as a Background
  const bg0 = Object.fromEntries(Object.entries(t.backgrounds ?? {}).filter(([k]) => k !== "Generation"));
  const backgrounds = spread(bg0, add.backgrounds, 5);
  let disciplines = {...(t.disciplines ?? {})};
  if ( add.disciplines ) disciplines = t.line === "ghoul"
    ? {...disciplines, Potence: Math.min(5, (disciplines.Potence ?? 0) + add.disciplines)}
    : spread(disciplines, add.disciplines, 5);
  const generation = t.line === "vampire" ? Math.min(t.generation ?? BASE.generation, add.generation ?? 99) : null;
  const notes = [];
  const renamed = Object.keys(t.abilities ?? {}).filter(n => ABILITY_2002[n]);
  if ( renamed.length ) notes.push(`2002 Abilities read for V20 Dark Ages: ${renamed.map(n => `${n} as ${ABILITY_2002[n]}`).join(", ")}.`);
  if ( t.backgrounds?.Generation ) notes.push(`The book's Generation ${t.backgrounds.Generation} is the ${generation}th Generation on this sheet.`);
  if ( t.path ) notes.push(`Follows the ${t.path}.`);
  if ( t.book ) notes.push(`The book names this template the ${t.book}.`);
  return {key: t.key, name: tier === "base" ? t.name : `${t.name} (${TIERS[tier].label.toLowerCase()})`, line: t.line, group: t.group, tier,
    attributes, abilities, backgrounds, disciplines, virtues: {...t.virtues},
    willpower: t.willpower ?? BASE.willpower[t.line],
    road: {name: t.road ?? "Road of Humanity", value: roadOf(t.virtues), path: t.path ?? ""},
    generation, clan: t.clan ?? null, clanDisciplines: clan ? clanDisciplines(clan, "darkages") : [],
    about: t.about, ref: pageOf(t), notes};
}

/** Shape a built template for book-people-rules planOf (abilities by book name). */
export const asPerson = b => ({key: b.key, name: b.name, group: b.group, attributes: b.attributes, abilities: b.abilities,
  backgrounds: b.backgrounds, willpower: b.willpower, virtues: b.virtues, road: {name: b.road.name, value: b.road.value}, about: b.about});
