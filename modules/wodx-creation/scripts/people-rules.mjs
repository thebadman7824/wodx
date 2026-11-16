/**
 * The People generator's rules (Phase 7a): one person from a seeded stream and the chronicle's tables. Pure, so the
 * harness can test it; the Foundry side (people.mjs) makes the sheet.
 */
import {draw, between, pick, shuffled, stream, drawResult, expand} from "../../wodx-chronicle/scripts/gen-core.mjs";
import {TRADE_SHEETS} from "../data/people.mjs";
import {FAMILY_FIRST} from "../data/people-order.mjs";
import {customFor, NOBLE_TRADE, PATTERN, suffixPatrons} from "../data/name-customs.mjs";

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
  "mid-century": ["alertness", "athletics", "awareness", "brawl", "empathy", "intimidation", "subterfuge", "stealth", "streetwise", "drive", "firearms", "etiquette"],
  future: ["alertness", "athletics", "awareness", "brawl", "empathy", "intimidation", "subterfuge", "stealth", "streetwise", "drive", "computer", "technology"],
  ancient: ["alertness", "athletics", "awareness", "brawl", "empathy", "intimidation", "subterfuge", "stealth", "survival", "melee", "craft", "etiquette"]
};
const STRONG_WILLED = new Set(["Survivor", "Fanatic", "Martyr", "Autocrat", "Director", "Penitent", "Traditionalist"]);

const text = (tables, id, rand, vars) => draw(id, {rand, tables, vars})?.text ?? null;

/** A name: the given name and the family name or byname, as the era and origin use them. */
export function nameOf({rand, tables, origin, sex}) {
  const vars = {child: sex === "female" ? "bat" : "ben"};
  const given = text(tables, `names.${sex}.${origin}`, rand, vars);
  const fd = draw(`names.family.${sex}.${origin}`, {rand, tables, vars});
  const family = fd?.text ?? text(tables, `names.byname.${sex}.${origin}`, rand, vars);
  // Chinese, Japanese, Korean, Vietnamese and Hungarian names put the family first
  return {given, family, name: joinName(origin, given, family), drawnFrom: fd?.result?.text ?? null};
}
const joinName = (origin, given, family) => (FAMILY_FIRST.has(origin) ? [family, given] : [given, family]).filter(Boolean).join(" ");

/**
 * How this person's children are named for them where the people names a child for the father (B6252): from a
 * "son of" pattern in the people's family list ("ibn {names.male.arabic}", "{names.male.turkish}oğlu"), else from
 * the father's-name pairs the list holds (Eriksson/Eriksdotter for Erik). null where the list has neither.
 */
export function childNamesOf(tables, origin, father) {
  if ( !father ) return null;
  const out = {};
  for ( const [sex, word] of [["male", "ben"], ["female", "bat"]] ) {
    const t = tables?.(`names.family.${sex}.${origin}`);
    const tpl = t?.results?.find(r => String(r.text).includes(`{names.male.${origin}}`))?.text;
    if ( tpl ) out[sex] = String(tpl).replace(/\{\{child\}\}/g, word).replace(`{names.male.${origin}}`, father).trim();
  }
  if ( out.male && out.female ) return out;
  const m = tables?.(`names.family.male.${origin}`)?.results ?? [], f = tables?.(`names.family.female.${origin}`)?.results ?? [];
  const plain = list => list.filter(r => !PATTERN.test(String(r.text))).map(r => String(r.text));
  const ms = plain(m), fs = plain(f);
  const pair = suffixPatrons(ms.map((x, i) => [x, fs[i]]))[father];
  return pair ? {male: pair[0], female: pair[1]} : null;
}

/**
 * The name as the year's custom shapes it (desk nm1, B6250 to B6253; data/name-customs.mjs). n: from nameOf.
 * Draws its own small stream from the name, so every other draw of the person stays as it was. later: the people's
 * next tables, where a family name falls due before the era group's own list has one (Turkey 1934, Bohemia's Jews
 * 1787). Returns n with family and name set and nameCustom {form, hereditary, from, source, childNames}.
 */
export function withCustom(n, {origin, sex, year, noble = false, tables, later = null}) {
  const c = customFor(origin, year, {noble});
  if ( !c ) return n;
  const sub = stream(`${origin}|${n.given}|${n.family}`, "name-custom", 0);
  let family = n.family;
  let hereditary = c.share >= 1 || (c.share > 0 && sub() < c.share);
  if ( c.form === "given" || (c.form === "settling" && !hereditary && c.unset === "given") ) { family = null; hereditary = false; }
  else if ( hereditary && family && n.drawnFrom && PATTERN.test(n.drawnFrom) ) {
    const id = `names.family.${sex}.${origin}`;
    const pool = [later?.(id), tables?.(id)].map(t => (t?.results ?? []).filter(r => !PATTERN.test(String(r.text)))).find(l => l.length);
    if ( pool ) {
      const r = drawResult(sub, pool.map(({text, weight}) => ({text, weight})));
      family = expand(r.text, {rand: sub, tables, vars: {child: sex === "female" ? "bat" : "ben"}});
    }
  }
  const childNames = hereditary || sex === "female" ? null : childNamesOf(tables, origin, n.given);
  return {...n, family, name: joinName(origin, n.given, family),
    nameCustom: {form: c.form, hereditary, from: c.from, source: c.source, ...(c.unset ? {unset: c.unset} : {}), ...(c.noble ? {noble: true} : {}), childNames}};
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

/** Half the share of people the generator makes nonbinary when asked for anyone: 1 in 100 in all. */
export const NONBINARY_HALF = 0.005;

/**
 * One person. opts: era (group), culture, kind ("mortal" or "ghoul"), sex ("female", "male", "nonbinary" or "any"), trade (or "any"),
 * origin (asked for, e.g. a household's own; used when the era's tables name it).
 * Returns everything the sheet needs and the cards show.
 */
export function person({rand, tables, era, culture, kind = "mortal", sex = "any", trade = "any", origin: asked = null, year = null, later = null}) {
  // "any": one in a hundred is nonbinary (Ben, 2026-11-13; B3503), read from the same draw so that every person
  // generated before keeps their name and the rest of their draws. Names follow the lists of the draw's side.
  let s = sex, nameSex = sex;
  if ( sex === "any" ) { const r = rand(); nameSex = r < 0.5 ? "female" : "male"; s = Math.abs(r - 0.5) < NONBINARY_HALF ? "nonbinary" : nameSex; }
  else if ( sex === "nonbinary" ) nameSex = rand() < 0.5 ? "female" : "male";
  const drawn = text(tables, "people.origin", rand) ?? (culture === "american" ? "anglo" : "czech");
  // An asked origin (kin of a household) is kept when the era's tables have names for it; else the drawn one stands
  let origin = drawn, n = null;
  if ( asked && asked !== drawn ) { n = nameOf({rand, tables, origin: asked, sex: nameSex}); if ( n.given ) origin = asked; else n = null; }
  n ??= nameOf({rand, tables, origin, sex: nameSex});
  const job = trade && trade !== "any" ? trade : (text(tables, "people.trade", rand) ?? "labourer");
  // B6251: the year decides the name's shape (a byname, a father's name, a family name); a noble's name is inherited
  n = withCustom(n, {origin, sex: nameSex, year, noble: NOBLE_TRADE.test(job), tables, later});
  const {drawnFrom, ...named} = n;
  const nature = text(tables, "people.archetype", rand), demeanorRaw = text(tables, "people.archetype", rand);
  const demeanor = rand() < 0.3 ? nature : demeanorRaw;
  const motive = text(tables, "people.motive", rand), secret = text(tables, "people.secret", rand), look = text(tables, "people.look", rand);
  const sheet = sheetFor({rand, trade: job, era});
  const willpower = Math.min(7, 3 + between(rand, 0, 2) + (STRONG_WILLED.has(nature) ? 1 : 0));
  const virtues = {conscience: 1 + between(rand, 0, 2), selfcontrol: 1 + between(rand, 0, 2), courage: 1 + between(rand, 0, 2)};
  return {kind, sex: s, nameForm: nameSex, origin, ...named, trade: job, nature, demeanor, motive, secret, look, willpower, virtues, era, culture, ...sheet};
}

/** The Storyteller's note on the sheet: concept, wants, hides, manner. Gender-neutral (B48). */
export function noteOf(p) {
  return `<p><strong>${p.kind === "ghoul" ? "Ghoul" : "Mortal"}, ${p.trade}.</strong> ${cap(p.look)}.</p>
    <p><strong>Wants</strong> ${p.motive}.</p><p><strong>Hides that this person</strong> ${p.secret}.</p>
    ${customLine(p)}<p class="wodx-quiet">Made by the WoDX People generator. Nature ${p.nature}, Demeanor ${p.demeanor}.</p>`;
}
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

/** The Storyteller's line on how the name was borne in its year (B6253). */
export const CUSTOM_WORDS = {
  given: "Goes by one name alone, as people here do in this year.",
  byname: "The second name belongs to this person alone (a trade, a place, a nickname or the father's name); the family does not share it.",
  settling: "Bynames are turning into family names here in this year; this one is not yet passed down.",
  family: "Bears a family name that passes to spouse and children.",
  noble: "Bears the family's inherited name, as the nobility does here in this year."
};
export function customLine(p = {}) {
  const c = p.nameCustom;
  if ( !c ) return "";
  const key = c.noble ? "noble" : c.form === "settling" ? (c.hereditary ? "family" : c.unset === "given" ? "given" : "settling") : c.form;
  return CUSTOM_WORDS[key] ? `<p class="wodx-quiet">${CUSTOM_WORDS[key]}</p>` : "";
}

/* ---- B3925 (no-effect audit w3): what a made person wants, hides and looks like, as things the game reads ---- */

/** The talk topic every made person raises (WoDX NPC talk sheet). */
export const WANT_TOPIC = "a favour";
/** The secrets system's kind for what a person hides, from the words (WoDX NPC secrets-rules SECRET_KINDS). */
const SECRET_WORDS = [
  [/owes money|lost a fortune|debt/i, "debt"],
  [/keeps a faith in secret/i, "heresy"],
  [/served a monster|was bitten/i, "masquerade"],
  [/steals|forged|cheats|blackmail|deserted|had a hand in a death|wrote an anonymous|shelters a relative the law/i, "crime"]
];
export function secretKind(text = "") {
  for ( const [re, kind] of SECRET_WORDS ) if ( re.test(String(text)) ) return kind;
  return "other";
}
const seedId = (p, tag) => `${tag}${String(p.batch ?? "x").replace(/[^a-z0-9]/gi, "").slice(-8)}${p.row ?? 0}${p.nonce ?? 0}`.slice(0, 20);

/**
 * The flags a made person carries so the other modules act on them:
 *   wodx-npc.want       {topic, text, met: {}}: the favour they ask, which the Storyteller marks done for an opinion step
 *   wodx-npc.behavior.talk  "[offer] a favour" and the line they say about it (their own talk sheet)
 *   wodx-npc.secrets    what they hide, as a secret the characters can dig out (a hook when found)
 *   wodx-library.features  the look, for witness descriptions and the Storyteller's reading
 */
export function peopleFlags(p = {}) {
  const out = {};
  if ( p.motive ) {
    out["flags.wodx-npc.want"] = {topic: WANT_TOPIC, text: String(p.motive), met: {}};
    out["flags.wodx-npc.behavior.talk"] = `[offer] ${WANT_TOPIC}\n[${WANT_TOPIC}] Speaks of wanting ${p.motive}; whoever helps will be remembered kindly.`;
  }
  if ( p.secret ) out["flags.wodx-npc.secrets"] = [{id: seedId(p, "ps"), kind: secretKind(p.secret), text: `Hides that this person ${p.secret}.`, weight: 1, tie: null, public: false, found: {}}];
  if ( p.look ) out["flags.wodx-library.features"] = [String(p.look)];
  return out;
}
