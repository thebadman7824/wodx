/**
 * The People generator's rules (Phase 7a): one person from a seeded stream and the chronicle's tables. Pure, so the
 * harness can test it; the Foundry side (people.mjs) makes the sheet.
 */
import {draw, between, pick, shuffled} from "../../wodx-chronicle/scripts/gen-core.mjs";
import {TRADE_SHEETS} from "../data/people.mjs";

export const ATTRS = {physical: ["strength", "dexterity", "stamina"], social: ["charisma", "manipulation", "appearance"], mental: ["perception", "intelligence", "wits"]};
const GROUP = {p: "physical", s: "social", m: "mental"};
/** Extra dots by priority. WoDX reading for ordinary folk: a little below a starting character (7/5/3). */
export const ATTR_DOTS = [6, 4, 3];
/** A few single dots of everyday Abilities, by era group. */
export const COMMON = {
  medieval: ["alertness", "athletics", "awareness", "brawl", "empathy", "intimidation", "subterfuge", "stealth", "survival", "melee", "craft", "etiquette"],
  "early-modern": ["alertness", "athletics", "awareness", "brawl", "empathy", "intimidation", "subterfuge", "stealth", "survival", "melee", "craft", "etiquette"],
  industrial: ["alertness", "athletics", "awareness", "brawl", "empathy", "intimidation", "subterfuge", "stealth", "streetwise", "melee", "craft", "etiquette", "firearms"],
  modern: ["alertness", "athletics", "awareness", "brawl", "empathy", "intimidation", "subterfuge", "stealth", "streetwise", "drive", "computer", "etiquette"],
  ancient: ["alertness", "athletics", "awareness", "brawl", "empathy", "intimidation", "subterfuge", "stealth", "survival", "melee", "craft", "etiquette"]
};
const STRONG_WILLED = new Set(["Survivor", "Fanatic", "Martyr", "Autocrat", "Director", "Penitent", "Traditionalist"]);

const text = (tables, id, rand, vars) => draw(id, {rand, tables, vars})?.text ?? null;

/** A name: the given name and the family name or byname, as the era and origin use them. */
export function nameOf({rand, tables, origin, sex}) {
  const vars = {child: sex === "female" ? "bat" : "ben"};
  const given = text(tables, `names.${sex}.${origin}`, rand, vars);
  const family = text(tables, `names.family.${sex}.${origin}`, rand, vars) ?? text(tables, `names.byname.${sex}.${origin}`, rand, vars);
  return {given, family, name: [given, family].filter(Boolean).join(" ")};
}

/** The sheet's dots for a trade: Attributes by its priority, its Abilities, and a few everyday ones. */
export function sheetFor({rand, trade, era}) {
  const plan = TRADE_SHEETS[trade] ?? {a: shuffled(rand, ["p", "s", "m"]).join(""), k: {}};
  const attributes = Object.fromEntries(Object.values(ATTRS).flat().map(k => [k, 1]));
  [...plan.a].forEach((g, i) => {
    const keys = ATTRS[GROUP[g]];
    let left = ATTR_DOTS[i];
    let guard = 0;
    while ( left > 0 && guard++ < 50 ) {
      const k = pick(rand, keys);
      if ( attributes[k] < 4 ) { attributes[k]++; left--; }
    }
  });
  const abilities = {}, secondary = {};
  for ( const [k, v] of Object.entries(plan.k) ) {
    if ( k.startsWith("+") ) secondary[k.slice(1)] = v; else abilities[k] = v;
  }
  for ( const k of shuffled(rand, COMMON[era] ?? COMMON.medieval).slice(0, 3) ) abilities[k] = Math.min(3, (abilities[k] ?? 0) + 1);
  return {attributes, abilities, secondary};
}

/**
 * One person. opts: era (group), culture, kind ("mortal" or "ghoul"), sex ("female", "male" or "any"), trade (or "any").
 * Returns everything the sheet needs and the cards show.
 */
export function person({rand, tables, era, culture, kind = "mortal", sex = "any", trade = "any"}) {
  const s = sex === "any" ? (rand() < 0.5 ? "female" : "male") : sex;
  const origin = text(tables, "people.origin", rand) ?? (culture === "american" ? "anglo" : "czech");
  const n = nameOf({rand, tables, origin, sex: s});
  const job = trade && trade !== "any" ? trade : (text(tables, "people.trade", rand) ?? "labourer");
  const nature = text(tables, "people.archetype", rand), demeanorRaw = text(tables, "people.archetype", rand);
  const demeanor = rand() < 0.3 ? nature : demeanorRaw;
  const motive = text(tables, "people.motive", rand), secret = text(tables, "people.secret", rand), look = text(tables, "people.look", rand);
  const sheet = sheetFor({rand, trade: job, era});
  const willpower = Math.min(7, 3 + between(rand, 0, 2) + (STRONG_WILLED.has(nature) ? 1 : 0));
  const virtues = {conscience: 1 + between(rand, 0, 2), selfcontrol: 1 + between(rand, 0, 2), courage: 1 + between(rand, 0, 2)};
  return {kind, sex: s, origin, ...n, trade: job, nature, demeanor, motive, secret, look, willpower, virtues, era, culture, ...sheet};
}

/** The Storyteller's note on the sheet: concept, wants, hides, manner. Gender-neutral (B48). */
export function noteOf(p) {
  return `<p><strong>${p.kind === "ghoul" ? "Ghoul" : "Mortal"}, ${p.trade}.</strong> ${cap(p.look)}.</p>
    <p><strong>Wants</strong> ${p.motive}.</p><p><strong>Hides that this person</strong> ${p.secret}.</p>
    <p class="wodx-quiet">Made by the WoDX People generator. Nature ${p.nature}, Demeanor ${p.demeanor}.</p>`;
}
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
