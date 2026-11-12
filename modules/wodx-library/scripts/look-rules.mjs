/**
 * WoDX Library 0.14.0: the look. What a character wears and how they are, read the way a stranger reads it at a
 * glance. The pure parts, so the harness can test them; WoDX NPC uses the reading for first meetings, talk lines,
 * guards and the sides an NPC can tell.
 *
 * Books: Appearance (V20 p. 98), Status (V20 p. 118) and Resources (V20 p. 116) are V20's; Appearance 0 failing first
 * impressions is V20 Dark Ages p. 55. No book ties dress to station or has sumptuary law, so how dress moves a first
 * meeting, the era weights and the condition steps are house rules (docs/PENDING-REVIEW.md).
 *
 * An item for the reading: {name, worn, kind, from, to, conceal, tier, quality, examine: {worn, ...},
 *   dressedAs: {station, sides}}. kind, from, to, conceal and tier come from the goods list (tier for the current era).
 */

export const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const low = v => String(v ?? "").trim().toLowerCase();

/** Kinds of goods that are dress when worn. */
export const DRESS_KINDS = new Set(["cloth", "accessories", "faith"]);
/** Kinds whose worn pieces add a step to station at tier 4 or more. */
export const FINERY_KINDS = new Set(["valuables"]);

/**
 * How loudly dress speaks, by year (house rule). gap: how many station steps apart before an NPC cares;
 * highGap: a smaller gap that still counts with an NPC of station 4 or 5 (0 for none).
 */
export const ERA_WEIGHTS = [
  {from: -10000, to: 1600, gap: 2, highGap: 0, note: "Dress is fixed by rank; overdressing is a crime"},
  {from: 1601, to: 1799, gap: 2, highGap: 0, note: "Cloth and cut still show rank plainly"},
  {from: 1800, to: 1913, gap: 2, highGap: 1, note: "Ready-made clothes; the well-off still read a clerk at a glance"},
  {from: 1914, to: 1999, gap: 3, highGap: 0, note: "Brands and tailoring, not law"},
  {from: 2000, to: 2099, gap: 3, highGap: 0, note: "Casual dress hides wealth"}
];
export const weightAt = year => ERA_WEIGHTS.find(w => num(year) >= w.from && num(year) <= w.to) ?? ERA_WEIGHTS[ERA_WEIGHTS.length - 1];

/** Words in a worn thing's name that show a side to anyone who sees it. */
export const SIDE_WORDS = [
  [/\b(habit|cassock|surplice|vestments?|cowl|clerical|priest'?s collar|dog collar)\b/i, "kind:church"],
  [/\bpilgrim'?s badge\b/i, "pilgrim"],
  [/\bpolice\b|\bconstable\b|\bgendarme\b|\bwatchman'?s\b/i, "kind:watch"],
  [/\bmilitary\b|\bsoldier'?s\b|\bregimental\b|\barmy\b/i, "military"],
  [/\blivery\b/i, "livery"],
  [/\bcorporate\b|\bsecurity (badge|uniform)\b/i, "corporate"]
];
export function sidesOfName(name) {
  const out = [];
  for ( const [re, side] of SIDE_WORDS ) if ( re.test(String(name ?? "")) && !out.includes(side) ) out.push(side);
  return out;
}

/** Is a thing out of its time in this year? A good with no years is never out of time. */
export function outOfTime(item = {}, year = null) {
  if ( !Number.isFinite(Number(year)) || year === null ) return false;
  const from = item.from, to = item.to;
  if ( from === undefined && to === undefined ) return false;
  const y = Number(year);
  return (Number.isFinite(Number(from)) && y < Number(from)) || (Number.isFinite(Number(to)) && y > Number(to));
}

/** Can a stranger see it? Worn dress always; anything else carried only when it can't be hidden (conceal N). */
export const seen = item => !!item && (item.worn ? true : String(item.conceal ?? "").toUpperCase() === "N");

/** Station 0 to 5 from what is worn: the best dress tier, a step for fine valuables worn, held to 5. */
export function stationOf(items = []) {
  const worn = (items ?? []).filter(i => i?.worn);
  const dress = worn.filter(i => DRESS_KINDS.has(i.kind)).map(i => num(i.tier));
  let s = dress.length ? Math.max(...dress) : 0;
  if ( worn.some(i => FINERY_KINDS.has(i.kind) && num(i.tier) >= 4) ) s += 1;
  return Math.max(0, Math.min(5, s));
}

/** Condition words a stranger sees. */
export const CONDITIONS = {
  bloody: "blood on them", wounded: "wounds showing", filthy: "filthy", soaked: "soaked through", torn: "torn clothes", weapon: "a weapon drawn"
};

/**
 * The look. view: {items, year, appearance, status, conditions: [ids], wounds, weaponOut, monstrous}.
 * Returns {station, worn: [names], strange: [names out of time], condition: [keys], appearance, status, sides,
 *   disguise: {station, sides} or null, fine: [{name, kind}] for fine and masterwork things worn}.
 */
export function lookOf(view = {}) {
  const items = (view.items ?? []).filter(Boolean);
  const year = view.year ?? null;
  const conds = new Set((view.conditions ?? []).map(low));
  const condition = [];
  if ( conds.has("bloody") || conds.has("bloodied") || items.some(i => i.worn && i.examine?.bloody) ) condition.push("bloody");
  if ( num(view.wounds) >= 2 ) condition.push("wounded");
  if ( conds.has("filthy") || conds.has("dirty") ) condition.push("filthy");
  if ( conds.has("soaked") || conds.has("wet") ) condition.push("soaked");
  if ( items.some(i => i.worn && DRESS_KINDS.has(i.kind) && i.examine?.worn) ) condition.push("torn");
  if ( view.weaponOut ) condition.push("weapon");
  const sides = [];
  for ( const i of items ) if ( i.worn ) for ( const s of sidesOfName(i.name) ) if ( !sides.includes(s) ) sides.push(s);
  const dressed = items.find(i => i.worn && i.dressedAs);
  const disguise = dressed ? {station: Math.max(0, Math.min(5, num(dressed.dressedAs.station))), sides: [...(dressed.dressedAs.sides ?? [])].map(low).filter(Boolean)} : null;
  return {
    station: stationOf(items),
    worn: items.filter(i => i.worn).map(i => i.name),
    // Library 0.16.0: the worn things a witness would remember, dress first (for a culprit's description)
    dress: [...items.filter(i => i.worn && DRESS_KINDS.has(i.kind)), ...items.filter(i => i.worn && !DRESS_KINDS.has(i.kind) && seen(i) && i.kind !== null && i.kind !== "arms")].map(i => i.name).slice(0, 4),
    strange: items.filter(i => seen(i) && outOfTime(i, year)).map(i => i.name),
    condition,
    appearance: view.appearance === null || view.appearance === undefined ? null : num(view.appearance),
    status: num(view.status),
    monstrous: !!view.monstrous,
    sides,
    disguise,
    fine: items.filter(i => i.worn && (i.quality === "fine" || i.quality === "master")).map(i => ({name: i.name, kind: i.kind}))
  };
}

/** The look as a held disguise shows it: the disguise's station and sides instead of the real ones. */
export function asSeen(look, held = false) {
  if ( !look?.disguise || !held ) return look;
  return {...look, station: look.disguise.station, sides: look.disguise.sides, disguised: true};
}

/** Abilities that let an NPC judge fine work by kind of thing. */
export const JUDGES = {cloth: ["crafts", "craft", "etiquette"], accessories: ["crafts", "craft"], valuables: ["crafts", "craft", "finance", "commerce"],
  arms: ["crafts", "craft", "melee"], faith: ["crafts", "craft", "theology"]};

/**
 * How the look moves a first meeting (house rule). npc: {station, mortal (bool), sameKind (bool, a Status match),
 * abilities: {key: dots}}. Returns {delta, names}, held to two steps either way.
 */
export function lookSeed(look, npc = {}, year = null) {
  if ( !look ) return {delta: 0, names: []};
  const w = weightAt(year);
  const mortal = npc.mortal !== false;
  let delta = 0;
  const names = [];
  const add = (d, why) => { if ( d ) { delta += d; names.push(why); } };
  if ( mortal && Number.isFinite(Number(npc.station)) && npc.station !== null ) {
    const gap = num(look.station) - num(npc.station);
    const need = w.highGap && num(npc.station) >= 4 ? w.highGap : w.gap;
    if ( gap >= need ) add(1, "fine clothes");
    else if ( -gap >= need ) add(-1, "shabby clothes");
  }
  if ( mortal && look.strange?.length ) add(-1, "strange dress");
  if ( look.condition?.includes("bloody") || look.condition?.includes("wounded") ) add(mortal ? -1 : 0, look.condition.includes("bloody") ? "blood on them" : "wounds showing");
  if ( mortal && num(npc.station) >= 3 && (look.condition?.includes("filthy") || look.condition?.includes("soaked")) ) add(-1, look.condition.includes("filthy") ? "filth" : "soaked through");
  if ( look.appearance !== null && look.appearance !== undefined ) {
    if ( look.appearance >= 4 ) add(1, "good looks");
    else if ( look.appearance === 0 && !look.monstrous && mortal ) add(-1, "an ugly face");
  }
  if ( !mortal && npc.sameKind && num(look.status) >= 3 ) add(1, "their standing");
  const ab = npc.abilities ?? {};
  const judged = (look.fine ?? []).find(f => (JUDGES[f.kind] ?? ["crafts", "craft"]).some(k => num(ab[k]) >= 1));
  if ( judged ) add(1, `fine work (${judged.name})`);
  return {delta: Math.max(-2, Math.min(2, delta)), names};
}

/** At a later meeting: what still shows for this scene only. -1 for blood or wounds with a mortal, else 0. */
export function sceneStep(look, {mortal = true} = {}) {
  if ( !look || !mortal ) return {delta: 0, names: []};
  const c = look.condition ?? [];
  if ( c.includes("bloody") ) return {delta: -1, names: ["blood on them"]};
  if ( c.includes("wounded") ) return {delta: -1, names: ["wounds showing"]};
  return {delta: 0, names: []};
}

/** Traits and look together: each held to two steps, the two together to three (Ben, 2026-11-12). */
export const COMBINED_CAP = 3;
export const combine = (traits = 0, look = 0) => Math.max(-COMBINED_CAP, Math.min(COMBINED_CAP, num(traits) + num(look)));

/** Station a template NPC has when nothing they wear or own says (house rule). */
export const TEMPLATE_STATION = {
  mob: 0, beast: null, spirit: null, ghost: null, spectre: null, civilian: 1, soldier: 1, guard: 2, hunter: 1, inquisitor: 3,
  ghoul: 1, neonate: 2, sabbat: 1, garou: 1, mage: 2, technocrat: 3, changeling: 1, fomor: 1, sheriff: 3, elder: 4
};
/** An NPC's own station: what they wear, else their Resources, else their template, else 1. */
export function npcStation({wornStation = null, resources = null, template = null} = {}) {
  if ( Number.isFinite(Number(wornStation)) && wornStation !== null && Number(wornStation) > 0 ) return Math.min(5, Number(wornStation));
  if ( Number.isFinite(Number(resources)) && resources !== null && Number(resources) > 0 ) return Math.min(5, Number(resources));
  if ( template && template in TEMPLATE_STATION ) return TEMPLATE_STATION[template];
  return 1;
}

/** "dressed fine" or "dressed poor" against an NPC's station, by the era's gap. */
export function dressedVs(look, npcSt, year = null) {
  if ( !look || npcSt === null || npcSt === undefined ) return null;
  const w = weightAt(year), gap = num(look.station) - num(npcSt);
  const need = w.highGap && num(npcSt) >= 4 ? w.highGap : w.gap;
  return gap >= need ? "fine" : -gap >= need ? "poor" : "even";
}

/** A short reading for the Storyteller: "station 3; strange dress (a wristwatch); blood on them". */
export function readLine(look) {
  if ( !look ) return "";
  const bits = [`station ${look.station}`];
  if ( look.strange?.length ) bits.push(`strange dress (${look.strange.join(", ")})`);
  for ( const c of look.condition ?? [] ) bits.push(CONDITIONS[c] ?? c);
  if ( look.sides?.length ) bits.push(`shows ${look.sides.join(", ")}`);
  if ( look.disguise ) bits.push(`dressed as station ${look.disguise.station}${look.disguise.sides.length ? ` (${look.disguise.sides.join(", ")})` : ""}`);
  return bits.join("; ");
}

/* ---- Library 0.16.0: a witness's description of someone, from the look (WoDX NPC's culprit descriptions) ---- */

const STATION_WORDS = ["ragged", "poorly dressed", "plainly dressed", "well dressed", "finely dressed", "richly dressed"];
const SIDE_SEEN = {"kind:church": "in a churchman's habit", "kind:watch": "in the watch's uniform", military: "in uniform", livery: "in livery", pilgrim: "with a pilgrim's badge", corporate: "with a company badge"};
const COND_SEEN = {bloody: "blood on them", wounded: "hurt", weapon: "a weapon drawn", torn: "torn clothes", filthy: "filthy", soaked: "soaked through"};
/** Size words from the token (a witness's sense of height and bulk; V20 sheets carry no height). */
export const SIZE_WORDS = {small: "small", big: "very big", huge: "huge"};
export const sizeOf = gridWidth => (num(gridWidth) >= 3 ? "huge" : num(gridWidth) >= 2 ? "big" : num(gridWidth) > 0 && num(gridWidth) < 1 ? "small" : null);

/**
 * What a witness would remember: {station, sides, dress, condition, size, face, monstrous, disguised}.
 * look: from lookOf (or asSeen when a disguise held). size: a SIZE_WORDS key or null.
 */
export function marksOf(look, {size = null} = {}) {
  if ( !look ) return null;
  const face = look.monstrous ? "monstrous" : look.appearance === null || look.appearance === undefined ? null : num(look.appearance) >= 4 ? "striking" : num(look.appearance) === 0 ? "ugly" : null;
  return {station: Math.max(0, Math.min(5, Math.round(num(look.station)))), sides: [...(look.sides ?? [])], dress: [...(look.dress ?? [])].slice(0, 4),
    condition: (look.condition ?? []).filter(c => COND_SEEN[c]), size: SIZE_WORDS[size] ? size : null, face, monstrous: !!look.monstrous, disguised: !!look.disguised};
}

/** The description in words: "a well dressed figure in livery, very big, wearing a red cloak and riding boots, with blood on them". */
export function describeMarks(m) {
  if ( !m ) return "";
  let line = `a ${STATION_WORDS[m.station] ?? "plainly dressed"} figure`;
  const side = (m.sides ?? []).map(sd => SIDE_SEEN[sd]).find(Boolean);
  if ( side ) line += ` ${side}`;
  const bits = [];
  if ( m.size ) bits.push(SIZE_WORDS[m.size]);
  if ( m.face === "monstrous" ) bits.push("with a face out of a nightmare");
  else if ( m.face === "striking" ) bits.push("with a face people remember");
  else if ( m.face === "ugly" ) bits.push("with an ugly face");
  const dress = (m.dress ?? []).map(d => String(d).toLowerCase());
  if ( dress.length ) bits.push(`wearing ${dress.length > 1 ? `${dress.slice(0, -1).join(", ")} and ${dress.at(-1)}` : dress[0]}`);
  const cond = (m.condition ?? []).map(c => COND_SEEN[c]).filter(Boolean);
  if ( cond.length ) bits.push(`with ${cond.length > 1 ? `${cond.slice(0, -1).join(", ")} and ${cond.at(-1)}` : cond[0]}`);
  return [line, ...bits].join(", ");
}
