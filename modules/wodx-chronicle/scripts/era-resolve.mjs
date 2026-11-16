/**
 * Era profile resolution. Pure functions, unit tested in Node.
 */

export const LINES = ["mortal", "vampire", "werewolf", "mage"];
export const SYSTEM_CHOICES = {
  mortal: ["modern", "victorian", "darkages", "classical", "livinggods"],
  vampire: ["modern", "victorian", "darkages", "classical", "livinggods"],
  werewolf: ["modern", "victorian", "darkages"],
  mage: ["modern", "victorian"]
};

export const ABILITY_GROUPS = ["talents", "skills", "knowledges"];
const keyList = v => Array.isArray(v) && v.every(k => typeof k === "string" && /^[a-z0-9]+$/.test(k));
function partProblems(part, where) {
  const out = [];
  if ( !part || typeof part !== "object" ) return [`${where} must be an object`];
  if ( part.add !== undefined ) {
    if ( !part.add || typeof part.add !== "object" ) out.push(`${where}.add must be an object of talents, skills, knowledges`);
    else for ( const [g, v] of Object.entries(part.add) ) {
      if ( !ABILITY_GROUPS.includes(g) ) out.push(`${where}.add.${g} is not talents, skills or knowledges`);
      else if ( !keyList(v) ) out.push(`${where}.add.${g} must be a list of ability keys`);
    }
  }
  if ( part.hide !== undefined && !keyList(part.hide) ) out.push(`${where}.hide must be a list of ability keys`);
  return out;
}
/** Problems in a profile's abilities block (B6382): {add: {talents, skills, knowledges}, hide: [keys], lines: {type: {add, hide}}}. */
export function abilityProblems(ab) {
  if ( ab === undefined ) return [];
  const out = partProblems(ab, "abilities");
  if ( ab?.lines !== undefined ) {
    if ( !ab.lines || typeof ab.lines !== "object" ) out.push("abilities.lines must be an object");
    else for ( const [t, part] of Object.entries(ab.lines) ) out.push(...partProblems(part, `abilities.lines.${t}`));
  }
  return out;
}

/**
 * The block the system fork reads (CONFIG.worldofdarkness.wodxEraAbilities, B6382), or null when the profile changes
 * no list: the profile's era for each line, and its add, hide and per-type lines.
 */
export function eraAbilitiesOf(profile) {
  const ab = profile?.abilities;
  if ( !ab ) return null;
  return {profile: profile.id, eras: {...(profile.system ?? {})}, add: ab.add ?? {}, hide: ab.hide ?? [], lines: ab.lines ?? {}};
}

/**
 * The abilities a line shows in an era (B6382, the same reading as the fork's CreateHelper.EraAbilityList): the
 * system's list by era name, with the block's add and hide where its era for the line matches, and its lines.<type>.
 */
export function eraAbilityList(base = {}, block = null, type = "", era = "") {
  const out = Object.fromEntries(ABILITY_GROUPS.map(g => [g, [...(base?.[g] ?? [])]]));
  if ( !block ) return out;
  const line = {changingbreed: "werewolf"}[type] ?? type;
  const parts = [];
  if ( block.eras?.[line] === era ) parts.push(block);
  if ( block.lines?.[type] ) parts.push(block.lines[type]);
  for ( const part of parts ) {
    for ( const g of ABILITY_GROUPS ) for ( const a of part.add?.[g] ?? [] ) if ( !out[g].includes(a) ) out[g].push(a);
    const hide = new Set(part.hide ?? []);
    if ( hide.size ) for ( const g of ABILITY_GROUPS ) out[g] = out[g].filter(a => !hide.has(a));
  }
  return out;
}

/**
 * B6383: what a sheet's abilities become when the era moves on. abilities: the sheet's system.abilities; shown: the
 * keys the new era shows. A shown ability becomes visible; one with dots always stays; one with no dots the new era
 * lacks is hidden. Returns {key: visible} for the abilities that change.
 */
export function followAbilities(abilities = {}, shown = []) {
  const want = new Set(shown), out = {};
  for ( const [k, a] of Object.entries(abilities ?? {}) ) {
    if ( !a || typeof a !== "object" ) continue;
    const vis = want.has(k) || Number(a.value) > 0;
    if ( !!a.isvisible !== vis ) out[k] = vis;
  }
  return out;
}

/** Check one profile; returns a list of problems (empty when valid). */
export function validateProfile(p) {
  const problems = [];
  if ( !p || typeof p !== "object" ) return ["not an object"];
  if ( !p.id || !/^[a-z0-9-]+$/.test(p.id) ) problems.push("id must be lower-case letters, digits and hyphens");
  if ( !p.name ) problems.push("name is missing");
  if ( !p.prologue ) {
    if ( !Number.isInteger(p.start) || !Number.isInteger(p.end) ) problems.push("start and end must be whole years");
    else if ( p.end < p.start ) problems.push("end is before start");
  }
  for ( const line of LINES ) {
    const v = p.system?.[line];
    if ( !SYSTEM_CHOICES[line].includes(v) ) problems.push(`system.${line} must be one of ${SYSTEM_CHOICES[line].join(", ")}`);
  }
  if ( p.regions && !Array.isArray(p.regions) ) problems.push("regions must be a list");
  // B6382: abilities the era adds to or hides from the system's lists; B6383: whether sheets follow the era
  problems.push(...abilityProblems(p.abilities));
  if ( p.sheets !== undefined && !["follow", "keep"].includes(p.sheets) ) problems.push("sheets must be follow or keep");
  return problems;
}

/**
 * Merge module and world profiles. A world profile with the same id replaces the module's.
 * Invalid profiles are dropped and reported.
 */
export function mergeProfiles(moduleProfiles = [], worldProfiles = []) {
  const byId = new Map();
  const rejected = [];
  for ( const [source, list] of [["module", moduleProfiles], ["world", worldProfiles]] ) {
    for ( const p of list ) {
      const problems = validateProfile(p);
      if ( problems.length ) rejected.push({source, id: p?.id ?? "(no id)", problems});
      else byId.set(p.id, {...p, source});
    }
  }
  return {profiles: [...byId.values()], rejected};
}

/**
 * Pick the profile for a year.
 * @param {object[]} profiles
 * @param {number} year
 * @param {object} [options]
 * @param {string} [options.region="europe"]
 * @param {Record<string, boolean>} [options.rules]  House rules, for profiles with requiresRule or excludedByRule
 * @returns {{profile: object, interlude: boolean}}
 */
export function resolveEra(profiles, year, {region = "europe", rules = {}} = {}) {
  const usable = profiles.filter(p => !p.prologue
    && (!p.requiresRule || rules[p.requiresRule])
    && (!p.excludedByRule || !rules[p.excludedByRule])
    && (!p.regions || p.regions.includes(region)));
  if ( !usable.length ) return {profile: null, interlude: true};

  // Profiles covering the year; the latest start is the most specific (Wild West inside Victorian)
  const covering = usable.filter(p => year >= p.start && year <= p.end).sort((a, b) => b.start - a.start);
  if ( covering.length ) return {profile: covering[0], interlude: false};

  // Between eras: keep the last era that ended before this year
  const before = usable.filter(p => p.end < year).sort((a, b) => b.end - a.end);
  if ( before.length ) return {profile: before[0], interlude: true};

  // Before every era: the earliest one
  const earliest = [...usable].sort((a, b) => a.start - b.start)[0];
  return {profile: earliest, interlude: true};
}

/**
 * The spans of years no era book covers, and the era whose rules each keeps (resolveEra's interludes, joined up).
 * @param {object[]} profiles
 * @param {object} [options]  region and rules as for resolveEra; from and to: the years to look over.
 * @returns {{from: number, to: number, keeps: string}[]}  keeps: the kept profile's name ("" for none).
 */
export function interludeSpans(profiles, {region = "europe", rules = {}, from = 1197, to = 2099} = {}) {
  const out = [];
  let cur = null;
  for ( let y = from; y <= to; y++ ) {
    const r = resolveEra(profiles, y, {region, rules});
    const keeps = r.interlude ? (r.profile?.name ?? "") : null;
    if ( keeps !== null && cur && cur.keeps === keeps && cur.to === y - 1 ) cur.to = y;
    else if ( keeps !== null ) out.push(cur = {from: y, to: y, keeps});
    else cur = null;
  }
  return out;
}
