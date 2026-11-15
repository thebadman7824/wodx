/**
 * The People generator's rules (Phase 7a): one person from a seeded stream and the chronicle's tables. Pure, so the
 * harness can test it; the Foundry side (people.mjs) makes the sheet.
 */
import {draw, between, pick, shuffled} from "../../wodx-chronicle/scripts/gen-core.mjs";
import {TRADE_SHEETS} from "../data/people.mjs";
import {FAMILY_FIRST} from "../data/people-order.mjs";

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
  const family = text(tables, `names.family.${sex}.${origin}`, rand, vars) ?? text(tables, `names.byname.${sex}.${origin}`, rand, vars);
  // Chinese, Japanese, Korean, Vietnamese and Hungarian names put the family first
  return {given, family, name: (FAMILY_FIRST.has(origin) ? [family, given] : [given, family]).filter(Boolean).join(" ")};
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
export function person({rand, tables, era, culture, kind = "mortal", sex = "any", trade = "any", origin: asked = null}) {
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
  const nature = text(tables, "people.archetype", rand), demeanorRaw = text(tables, "people.archetype", rand);
  const demeanor = rand() < 0.3 ? nature : demeanorRaw;
  const motive = text(tables, "people.motive", rand), secret = text(tables, "people.secret", rand), look = text(tables, "people.look", rand);
  const sheet = sheetFor({rand, trade: job, era});
  const willpower = Math.min(7, 3 + between(rand, 0, 2) + (STRONG_WILLED.has(nature) ? 1 : 0));
  const virtues = {conscience: 1 + between(rand, 0, 2), selfcontrol: 1 + between(rand, 0, 2), courage: 1 + between(rand, 0, 2)};
  return {kind, sex: s, nameForm: nameSex, origin, ...n, trade: job, nature, demeanor, motive, secret, look, willpower, virtues, era, culture, ...sheet};
}

/** The Storyteller's note on the sheet: concept, wants, hides, manner. Gender-neutral (B48). */
export function noteOf(p) {
  return `<p><strong>${p.kind === "ghoul" ? "Ghoul" : "Mortal"}, ${p.trade}.</strong> ${cap(p.look)}.</p>
    <p><strong>Wants</strong> ${p.motive}.</p><p><strong>Hides that this person</strong> ${p.secret}.</p>
    <p class="wodx-quiet">Made by the WoDX People generator. Nature ${p.nature}, Demeanor ${p.demeanor}.</p>`;
}
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

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
