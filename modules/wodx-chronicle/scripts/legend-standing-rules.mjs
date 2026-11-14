/**
 * The Legends book pays off (B3160, B3161): a deed written in the book suggests a change of standing for the player
 * characters in it, for the Storyteller to approve in the approval queue. Pure rules, no Foundry.
 *
 * Garou earn and lose temporary Renown by deeds (W20 Renown); Kindred standing is Status, gained by office and lost
 * by a broken boon (V20 Prestation). Others get a note to weigh their standing by hand. Which deed gives which
 * Renown, and the single point, are WoDX's readings, logged in docs/DECISIONS.md.
 */

/** kind: "lupine" | "kindred" | anything else. */
const SIDE = kind => (kind === "lupine" ? "garou" : kind === "kindred" ? "kindred" : "other");

/**
 * What a Legends line suggests for one person in it. entry: a Legends line; who: {id, name, kind, role} where role
 * is "holder" (an office), "from" or "to" (a ledger line) or "fighter" (a deed). Returns null or
 * {trait, step, words} where trait is "glory" | "honor" | "wisdom" | "status" | "standing".
 */
export function standingFor(entry, who) {
  if ( !entry || !who?.id ) return null;
  const side = SIDE(who.kind), id = String(entry.id ?? "");
  const pick = (garou, kindred, other, words) => {
    const t = side === "garou" ? garou : side === "kindred" ? kindred : other;
    return t ? {trait: t[0], step: t[1], words} : null;
  };
  if ( entry.kind === "office" ) {
    if ( /:won:/.test(id) ) return pick(["honor", 1], ["status", 1], ["standing", 1], `took a seat: ${entry.text}`);
    if ( /:lost:/.test(id) ) return pick(null, ["status", -1], ["standing", -1], `lost a seat: ${entry.text}`);
    return null;
  }
  if ( entry.kind === "ledger" && who.role === "from" ) {
    if ( /:kept$/.test(id) ) return pick(["honor", 1], null, null, `kept their word: ${entry.text}`);
    if ( /:broken$/.test(id) ) return pick(["honor", -1], ["status", -1], ["standing", -1], `broke their word: ${entry.text}`);
    return null;
  }
  if ( entry.kind === "deed" && who.role === "fighter" ) {
    if ( entry.won ) return pick(["glory", 1], null, ["standing", 1], `won a fight: ${entry.text}`);
    return null;
  }
  return null;
}

/** All the suggestions for new lines. people: id -> {kind, pc}. Only player characters get them. */
export function suggestionsFor(entries = [], people = {}) {
  const out = [];
  for ( const e of entries ) {
    const roles = e.kind === "ledger" ? [["from", e.people?.[0]], ["to", e.people?.[1]]]
      : (e.people ?? []).map(p => [e.kind === "deed" ? "fighter" : "holder", p]);
    for ( const [role, p] of roles ) {
      const info = p?.id ? people[p.id] : null;
      if ( !info?.pc ) continue;
      const s = standingFor(e, {id: p.id, name: p.name, kind: info.kind, role});
      if ( s ) out.push({entryId: e.id, actorId: p.id, name: p.name, ...s});
    }
  }
  return out;
}

export const TRAIT_WORDS = {glory: "Glory", honor: "Honor", wisdom: "Wisdom", status: "Status", standing: "standing"};
/** The words of a suggestion, for the queue. */
export const suggestionText = s => `${s.name} ${s.words.replace(/[.\s]+$/, "")}. ${s.trait === "standing" ? `Their standing ${s.step > 0 ? "rises" : "falls"}` : `${s.step > 0 ? "+" : ""}${s.step} ${s.trait === "status" ? "" : "temporary "}${TRAIT_WORDS[s.trait]}`}.`;
