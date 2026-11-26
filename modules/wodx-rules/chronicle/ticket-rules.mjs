/**
 * The referee ticket (B3520, B3521): a player's freeform action that needs a ruling, as one card in the Storyteller's
 * queue. Pure rules, harness-tested; the dialogs, the queue card and the roll are in ticket.mjs.
 *
 *   ATTRS, ABILITIES     the pool a player can name (fixed lists of the shared sheet)
 *   poolOf(sheet, a, b)  Attribute plus Ability from a plain sheet
 *   risksFor(q)          what the action may cost, by the actor's line and the era's book
 *   shift(diff, by)      a difficulty moved by the Storyteller, 1 to 3 either way, kept inside 2 to 10
 *   buildTicket(q)       everything the card shows
 */

export const ATTRS = ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"];
export const ABILITIES = ["alertness", "athletics", "awareness", "brawl", "empathy", "expression", "intimidation", "leadership", "streetwise", "subterfuge",
  "animalken", "crafts", "drive", "etiquette", "firearms", "larceny", "melee", "performance", "stealth", "survival",
  "academics", "computer", "finance", "investigation", "law", "medicine", "occult", "politics", "science", "technology"];

const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const cap = s => String(s ?? "").replace(/^./, c => c.toUpperCase());
export const label = k => ({animalken: "Animal Ken"}[k] ?? cap(k));

/** Attribute plus Ability from a plain sheet {attributes: {k: n}, abilities: {k: n}}. */
export function poolOf(sheet = {}, attr = "", ability = "") {
  const a = ATTRS.includes(attr) ? n(sheet.attributes?.[attr]) : 0;
  const b = ABILITIES.includes(ability) ? n(sheet.abilities?.[ability]) : 0;
  return Math.max(0, a + b);
}

/**
 * What the action may cost, by the actor's line (the crossover referee's profile keys) and the era's book ("da" for
 * the Dark Ages books, else "late"). Each risk names its book; the Storyteller weighs it. witnesses: mortals see it.
 */
export function risksFor({profile = "mortal", book = "late", witnesses = false, supernatural = true} = {}) {
  const out = [];
  const da = book === "da";
  if ( profile === "mage" ) {
    if ( da ) out.push({key: "magick", text: "Magick in the Dark Ages: the Dark Ages mage book's own rules for how the world answers it (the Storyteller checks them)."});
    else out.push({key: "paradox", text: "Paradox if the Effect is vulgar (M20). Vulgar magick before witnesses costs more."});
  }
  if ( profile === "kindred" ) out.push({key: "sin", text: da ? "A sin against the Road, by its hierarchy (V20 Dark Ages)." : "A sin against Humanity or the Path, by its hierarchy of sins (V20)."});
  if ( profile === "fae" ) out.push({key: "banality", text: "Banality, if the act is cold, mundane or done before disbelieving mortals (C20)."});
  if ( profile === "lupine" ) out.push({key: "rage", text: "Rage and frenzy if it angers or wounds; the Delirium and the Veil if mortals see a war form (W20)."});
  if ( profile === "wraith" ) out.push({key: "angst", text: "Angst for the Shadow, if the act feeds a dark Passion (Wraith 20th)."});
  if ( profile === "hunter" ) out.push({key: "conviction", text: "Conviction spent or strained, and what the act does to the hunter's Creed."});
  if ( profile === "demon" ) out.push({key: "torment", text: "Torment, if the act serves the demon's darker side."});
  if ( witnesses && supernatural && profile !== "mortal" ) out.push({key: "witnesses", text: "Witnesses: the Masquerade, the Veil or the Consensus may be strained, and word may spread."});
  return out;
}

/** A difficulty moved by the Storyteller: 1 to 3 either way, kept inside 2 to 10. */
export function shift(diff = 6, by = 0) {
  const b = Math.max(-3, Math.min(3, Math.round(n(by))));
  return Math.max(2, Math.min(10, Math.round(n(diff) || 6) + b));
}

const clean = (s, max) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * Everything the card shows. q: {text, attr, ability, difficulty, power, witnesses, actor: plain sheet, target: plain
 * sheet or null, book, cases: the crossover referee's [{case, test}] for the power, if any}.
 */
export function buildTicket(q = {}) {
  const actor = q.actor ?? {}, target = q.target ?? null;
  const pool = poolOf(actor, q.attr, q.ability);
  const base = Math.max(2, Math.min(10, Math.round(n(q.difficulty) || 6)));
  const cases = (q.cases ?? []).map(c => ({id: c.case?.id ?? "", ruling: clean(c.case?.ruling, 400), refs: (c.case?.refs ?? []).slice(0, 4),
    verdict: clean(c.test?.verdict ?? c.test?.text, 300), roll: c.test?.roll ? {dice: n(c.test.roll.dice), difficulty: n(c.test.roll.difficulty) || 6, who: clean(c.test.roll.who, 60)} : null}));
  const risks = risksFor({profile: actor.profile ?? "mortal", book: q.book ?? "late", witnesses: !!q.witnesses});
  return {
    text: clean(q.text, 600),
    attr: ATTRS.includes(q.attr) ? q.attr : "", ability: ABILITIES.includes(q.ability) ? q.ability : "",
    pool, difficulty: base, base, shift: 0,
    power: clean(q.power, 40), actorName: clean(actor.name, 80), profile: actor.profile ?? "mortal",
    targetName: target ? clean(target.name, 80) : "", targetProfile: target?.profile ?? "",
    cases, risks, complications: [], witnesses: !!q.witnesses, book: q.book === "da" ? "da" : "late"
  };
}

/** The Storyteller's change of difficulty on a ticket: from its first difficulty, never stacking past 3. */
export function withShift(t, by) {
  const s = Math.max(-3, Math.min(3, Math.round(n(by))));
  return {...t, shift: s, difficulty: shift(t.base ?? t.difficulty ?? 6, s)};
}

/** A complication added to a ticket (at most 3 kept). */
export const withComplication = (t, text) => ({...t, complications: [...(t.complications ?? []), clean(text, 300)].filter(Boolean).slice(-3)});

/** The pool in words: "Wits + Occult, 5 dice at difficulty 7". */
export function poolWords(t) {
  const parts = [t.attr && label(t.attr), t.ability && label(t.ability)].filter(Boolean).join(" + ");
  return `${parts || "No pool named"}, ${t.pool} ${t.pool === 1 ? "die" : "dice"} at difficulty ${t.difficulty}${t.shift ? ` (${t.shift > 0 ? "+" : ""}${t.shift} from the Storyteller)` : ""}`;
}

/** A short fallback complication when the story aids are not to hand (WoDX's own words). */
export const FALLBACK = [
  "It works, but someone saw more than they should have.",
  "It works, and it leaves a mark that can be traced back.",
  "It works only in part; the rest needs another try later.",
  "It works, and draws the notice of someone the character would rather avoid.",
  "It works, at a cost the character will feel tomorrow night.",
  "Something nearby answers it in a way nobody expected."
];
export const fallbackComplication = (rand = Math.random) => FALLBACK[Math.floor(Math.max(0, Math.min(0.9999, rand())) * FALLBACK.length)];
