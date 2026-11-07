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
 * @param {Record<string, boolean>} [options.rules]  House rules, for profiles with requiresRule
 * @returns {{profile: object, interlude: boolean}}
 */
export function resolveEra(profiles, year, {region = "europe", rules = {}} = {}) {
  const usable = profiles.filter(p => !p.prologue
    && (!p.requiresRule || rules[p.requiresRule])
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
