import {GENERATIONS, CLANS, XP, GHOUL, BOND} from "../data/vampire.mjs";

/** Pure rules: no Foundry calls, so they can be tested on their own. */

/** The generation chart row; Thirteenth and higher share one row, and nothing is below Third. */
export function generationRow(generation) {
  const g = Math.min(13, Math.max(3, Math.trunc(Number(generation) || 13)));
  return {generation: Math.trunc(Number(generation) || 13), ...GENERATIONS.rows[g]};
}

/** A childe is one step further from Caine than the sire. */
export function childeGeneration(sireGeneration) {
  const g = Math.trunc(Number(sireGeneration));
  return Number.isFinite(g) && g >= 3 ? g + 1 : null;
}

const norm = s => String(s ?? "").toLowerCase().replace(/^wod\.bio\.vampire\./, "").replace(/[()]/g, " ").replace(/\s+/g, " ").trim();

/** Find a clan by any name Rothenstein or upstream uses ("Old Clan Tzimisce", "wod.bio.vampire.gangrel"). */
export function findClan(name) {
  const n = norm(name);
  if ( !n ) return null;
  return CLANS.find(c => c.id === n || norm(c.name) === n || (c.aliases ?? []).includes(n))
    ?? CLANS.find(c => n.includes(norm(c.name)) || (c.aliases ?? []).some(a => n.includes(a)))
    ?? null;
}

/**
 * A clan's Disciplines in an era. `vampireEra` is the upstream ability set the era profile uses
 * ("darkages", "victorian", "modern" ...). Only the Assamite list changes after the Dark Ages.
 */
export function clanDisciplines(clan, vampireEra = "darkages") {
  if ( !clan ) return [];
  const medieval = ["darkages", "classical", "livinggods"].includes(vampireEra);
  return [...((!medieval && clan.modern) ? clan.modern : clan.disciplines)];
}

/** Highest Discipline level a ghoul can reach (V20DA p. 399). */
export function ghoulDisciplineCap(domitorGeneration) {
  const g = Math.trunc(Number(domitorGeneration));
  if ( !Number.isFinite(g) || g >= 8 ) return 1;
  if ( g <= 3 ) return 5; // The book leaves the Third Generation open ("??"); House rule: no lower than the Fourth
  return GHOUL.disciplineCap[g];
}

/** A ghoul's blood pool grows by one each century as a ghoul (V20DA p. 399). */
export function ghoulBloodMax(yearsAsGhoul = 0) {
  return GHOUL.bloodMax + (GHOUL.bloodMaxPerCentury * Math.max(0, Math.floor((Number(yearsAsGhoul) || 0) / 100)));
}

/** May a ghoul learn this Discipline? Celerity, Fortitude and Potence always; others only if the domitor knows them. */
export function ghoulCanLearn(discipline, domitorDisciplines = []) {
  const d = norm(discipline);
  return GHOUL.alwaysAvailable.some(a => norm(a) === d) || domitorDisciplines.some(k => norm(k) === d);
}

/** Blood oath stage after a number of drinks (V20DA pp. 341–342). */
export function bondStage(drinks) {
  const n = Math.max(0, Math.trunc(Number(drinks) || 0));
  if ( n >= BOND.drinksToBind ) return {drinks: n, stage: 3, label: "Blood bound"};
  return {drinks: n, stage: n, label: ["No bond", "First drink", "Second drink"][n]};
}

/** Kinds of purchase the experience log understands. */
export const KINDS = {
  attribute: "Attribute",
  ability: "Ability",
  newAbility: "New Ability",
  discipline: "Discipline",
  newDiscipline: "New Discipline",
  virtue: "Virtue",
  road: "Road or Humanity",
  willpower: "Willpower"
};

/**
 * A spend by the book (WoDX Chronicle 0.46.0 levels, B2454): it passes the approval queue on its own under a "small"
 * rule. An Attribute, an Ability (new or raised), Willpower, or a Discipline of the character's own clan (any, for a
 * Caitiff), at the book's cost and within what is there to spend. A new Discipline (it needs a teacher), Virtues and
 * the Road or Humanity (they need a reason in the story) wait for the Storyteller. XP awards are not touched.
 * now: the re-checked option ({kind, cost, ok, discipline}); asked: the cost the player saw.
 */
export const BOOK_KINDS = ["attribute", "ability", "newAbility", "willpower"];
export function byTheBook(now, asked = null) {
  if ( !now?.ok ) return false;
  if ( asked !== null && Number(asked) !== now.cost ) return false;
  if ( BOOK_KINDS.includes(now.kind) ) return true;
  return now.kind === "discipline" && (now.discipline === "clan" || now.discipline === "caitiff");
}

/**
 * Experience cost to raise a trait by one dot, or null if this line cannot buy it.
 * @param {object} p
 * @param {"vampire"|"ghoul"|"mortal"} p.line
 * @param {string} p.kind      One of KINDS
 * @param {number} [p.current] The current rating
 * @param {"clan"|"other"|"caitiff"} [p.discipline] For a vampire's or ghoul's Discipline
 */
export function xpCost({line, kind, current = 0, discipline = "other"}) {
  const t = XP[line];
  if ( !t ) return null;
  const cur = Math.max(0, Math.trunc(Number(current) || 0));
  switch ( kind ) {
    case "newAbility": return t.newAbility;
    case "newDiscipline": return t.newDiscipline;
    case "attribute": return cur * t.attribute;
    case "ability": return cur ? cur * t.ability : t.newAbility;
    case "virtue": return cur * t.virtue;
    case "road": return cur * t.road;
    case "willpower": return cur * t.willpower;
    case "discipline": {
      if ( !t.otherDiscipline ) return null;
      if ( !cur ) return t.newDiscipline;
      if ( line === "vampire" && discipline === "caitiff" ) return cur * t.caitiffDiscipline;
      return cur * (discipline === "clan" ? t.clanDiscipline : t.otherDiscipline);
    }
    default: return null;
  }
}

/**
 * Highest rating a purchase may reach.
 * @param {object} p
 * @param {"vampire"|"ghoul"|"mortal"} p.line
 * @param {string} p.kind
 * @param {number} [p.generation]        A vampire's Generation
 * @param {number} [p.domitorGeneration] A ghoul's domitor's Generation
 */
export function traitMax({line, kind, generation, domitorGeneration}) {
  if ( kind === "virtue" ) return 5;
  if ( kind === "road" || kind === "willpower" ) return 10;
  if ( line === "vampire" ) return generationRow(generation).maxTrait;
  if ( kind === "discipline" || kind === "newDiscipline" ) return line === "ghoul" ? ghoulDisciplineCap(domitorGeneration) : 0;
  return 5;
}
