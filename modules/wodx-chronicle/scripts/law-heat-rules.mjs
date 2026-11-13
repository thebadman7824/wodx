/**
 * The law's heat (B3606-B3607): the pure part. No Foundry here, so the harness can test it.
 *
 * When witnesses see a crime (WoDX NPC writes a description: a theft, a break-in, a fire, a desecration, a fight or a
 * breach), the keepers of order of that land take notice. Heat is kept per region and culprit, apart from the
 * hunters' pressure and a hunting ground's heat: this is the mortal law looking for a criminal, not hunters looking
 * for a monster. It rises by how grave the deed is under that land's law that year, scaled by how well the law
 * catches people (the law record's catch), and cools by the age's means: a watchman forgets in weeks, a police file
 * stays for months, a database for years. At the top a warrant goes out, then a manhunt; an arrest leads to a trial
 * (B3608). The gravity, the stages and the cooling are house figures (docs/PENDING-REVIEW.md).
 */

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const DAY = 86400;
export const MAX = 10;

/** How grave each deed is (house figures). breach: a mortal saw something they should not, mostly an assault. */
export const GRAVITY = {theft: 2, break: 2, force: 1, fire: 3, desecrate: 2, fight: 1, breach: 2, killing: 4};
export const DEED_WORDS = {theft: "theft", break: "breaking in", force: "forcing a way in", fire: "setting a fire", desecrate: "desecrating a holy place",
  fight: "brawling", breach: "an assault", killing: "a killing"};

/** The stages of the law's interest. */
export const STAGES = [
  {key: "none", min: 0, name: "Nothing", note: "The law has no interest."},
  {key: "asked", min: 2, name: "Asked after", note: "The watch asks after someone of this description."},
  {key: "warrant", min: 5, name: "Wanted", note: "A warrant is out. Any keeper of order who knows the face may make an arrest."},
  {key: "manhunt", min: 8, name: "Manhunt", note: "The law hunts in earnest: patrols, rewards, informers and a watch on the roads."}
];
export const stageOf = h => [...STAGES].reverse().find(s => n(h) >= s.min) ?? STAGES[0];

/**
 * How much a deed adds. law: a lawOf record (crimes, catch). Desecration counts more where heresy or blasphemy is a
 * crime; a named culprit (a witness knows them) counts half again.
 */
export function gainFor(deed, law = {}, {named = false, witnesses = 1} = {}) {
  let g = GRAVITY[deed] ?? 1;
  const crimes = law.crimes ?? [];
  if ( deed === "desecrate" && (crimes.includes("heresy") || crimes.includes("blasphemy")) ) g += 1;
  if ( named ) g *= 1.5;
  if ( n(witnesses) >= 3 ) g += 0.5;
  return Math.round(g * (0.5 + clamp(n(law.catch) || 0.3, 0, 1)) * 10) / 10;
}

/** Days for heat to halve, by the age's means of keeping order (the law record's order list). */
export function halfLife(law = {}) {
  const o = law.order ?? [];
  if ( o.includes("cameras") ) return 365;
  if ( o.includes("police") || o.includes("detectives") || o.includes("gendarmerie") ) return 60;
  if ( o.includes("secret-police") ) return 90;
  return 14;
}

export function normEntry(e = {}) {
  return {id: String(e.id ?? "").slice(0, 40), name: String(e.name ?? "").slice(0, 80), line: String(e.line ?? "mortal").slice(0, 20), heat: clamp(n(e.heat), 0, MAX), at: n(e.at),
    deeds: (Array.isArray(e.deeds) ? e.deeds : []).slice(-12).map(d => ({deed: String(d.deed ?? "").slice(0, 20), at: n(d.at), where: String(d.where ?? "").slice(0, 80)})),
    arrested: n(e.arrested)};
}
/** State: {regions: {regionId: {actorId: entry}}}. */
export function normState(s = {}) {
  const regions = {};
  for ( const [r, m] of Object.entries(s?.regions ?? {}) ) { regions[r] = {}; for ( const [id, e] of Object.entries(m ?? {}) ) regions[r][id] = normEntry({...e, id}); }
  return {regions};
}

/** Heat now, after cooling since it was last touched. */
export function cooled(e, now, law = {}) {
  const x = normEntry(e);
  const days = Math.max(0, (n(now) - x.at) / DAY);
  return Math.round(x.heat * Math.pow(0.5, days / halfLife(law)) * 100) / 100;
}

/** Add a deed. Returns {entry, before, after, crossed} where crossed is the stage reached when it rose a stage. */
export function addDeed(e0, {deed, law = {}, now = 0, named = false, witnesses = 1, where = "", id, name, line} = {}) {
  const e = normEntry({...e0, id: id ?? e0?.id, name: name ?? e0?.name, line: line ?? e0?.line});
  const before = cooled(e, now, law);
  const after = clamp(before + gainFor(deed, law, {named, witnesses}), 0, MAX);
  const entry = {...e, heat: Math.round(after * 100) / 100, at: n(now), deeds: [...e.deeds, {deed: String(deed), at: n(now), where: String(where).slice(0, 80)}].slice(-12)};
  const b = stageOf(before), a = stageOf(after);
  return {entry, before, after, crossed: STAGES.indexOf(a) > STAGES.indexOf(b) ? a : null};
}

/** Clear or lower heat (an arrest, a bribe, an amnesty). factor 0 clears it. */
export function lower(e0, now, law = {}, factor = 0) {
  const e = normEntry(e0);
  return {...e, heat: Math.round(cooled(e, now, law) * clamp(n(factor), 0, 1) * 100) / 100, at: n(now)};
}

/** A bribe's chance to make the watch forget, by the law record's bribe (1 cheap to 5 dangerous to try) and the heat. */
export const bribeChance = (law = {}, heat = 0) => clamp(0.15 * (6 - n(law.bribe || 2)) - 0.05 * Math.max(0, n(heat) - 2), 0.02, 0.8);

/**
 * Hooks by line (B3606): what the law's heat means to each kind of character, for the Storyteller's warrant card.
 * Plain advice in WoDX's own words.
 */
export const LINE_HOOKS = {
  vampire: "The law arrests by day. A warrant on one of the Kindred means a knock on the haven's door at noon.",
  ghoul: "A ghoul is mortal before the law; a domitor may let the servant hang rather than be found.",
  werewolf: "Kinfolk in the watch can lose the file; a manhunt that follows the culprit into the woods can find a caern.",
  mage: "Witnesses who saw the impossible make poor sworn testimony, and the law prefers a plain crime it can prove.",
  changeling: "The mortal law sees only the mortal seeming, and charges the mortal life with what the fae self did.",
  wraith: "A wraith cannot be arrested, but the one whose body it rode can.",
  hunter: "To the state a hunter's killing is murder, whatever was slain.",
  mummy: "A warrant can outlast a life: the law may still want the name the mummy wore before.",
  demon: "The law charges the host, whose family and past it can find.",
  revenant: "The family's lawyers and the family's money stand behind a revenant, for a price.",
  mortal: ""
};

/** The Storyteller's line about one entry. */
export function summary(e, now, law = {}) {
  const h = cooled(e, now, law), st = stageOf(h);
  const last = normEntry(e).deeds.at(-1);
  return `${st.name} (${h.toFixed(1)} of ${MAX})${last ? `, last for ${DEED_WORDS[last.deed] ?? last.deed}${last.where ? ` at ${last.where}` : ""}` : ""}; cools by half in ${halfLife(law)} days.`;
}
