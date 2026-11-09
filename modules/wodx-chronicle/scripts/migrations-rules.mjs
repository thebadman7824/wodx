/**
 * Data versions, the pure part. Every WoDX module's data in a world has a version, a whole number from 1.
 * A module that changes how it stores its flags or settings raises its version and registers the step that
 * brings older data up to it. The world records the version each module's data is at.
 */

/** A module's target version: its highest registered step, or 1. */
export function targetVersion(entry) {
  const steps = Object.keys(entry?.steps ?? {}).map(Number).filter(Number.isInteger);
  return Math.max(1, entry?.version ?? 1, ...steps);
}

/**
 * What needs to run.
 * @param {object} registry    {moduleId: {version, steps: {2: {name, run}, 3: ...}}}
 * @param {object|null} stored {moduleId: version} as the world records it; null in a world that has never been stamped
 * @param {string[]} activeIds the WoDX modules on in this world
 * @returns {{stamp: object, pending: Array<{module, from, to, steps: Array<{version, name, run}>}>, problems: string[]}}
 *   stamp: the versions to record without running anything (a first stamp, or a module seen for the first time)
 */
export function planMigrations(registry, stored, activeIds) {
  const stamp = {};
  const pending = [];
  const problems = [];
  for ( const id of activeIds ) {
    const entry = registry[id];
    const to = targetVersion(entry);
    // Never stamped (a new world or a module just turned on): its data is taken to be as the code writes it now
    if ( stored === null || stored === undefined || stored[id] === undefined ) { stamp[id] = to; continue; }
    const from = Number(stored[id]) || 1;
    if ( from > to ) { problems.push(`${id}: this world's data is at version ${from}, newer than the module's ${to}. Was an older copy of the module installed?`); continue; }
    if ( from === to ) continue;
    const steps = [];
    for ( let v = from + 1; v <= to; v++ ) {
      const step = entry.steps?.[v];
      if ( !step?.run ) { problems.push(`${id}: no step to bring its data from ${v - 1} to ${v}.`); steps.length = 0; break; }
      steps.push({version: v, name: step.name ?? `version ${v}`, run: step.run});
    }
    if ( steps.length ) pending.push({module: id, from, to, steps});
  }
  return {stamp, pending, problems};
}

/** Does a document's data (as toObject() gives it) carry this module's flags, here or in an embedded document? */
export function carriesFlags(data, moduleId) {
  if ( !data || typeof data !== "object" ) return false;
  if ( data.flags?.[moduleId] && Object.keys(data.flags[moduleId]).length ) return true;
  for ( const value of Object.values(data) ) {
    if ( Array.isArray(value) && value.some(v => v && typeof v === "object" && carriesFlags(v, moduleId)) ) return true;
  }
  return false;
}

/** A file name for a backup: <world>-<module>-v<from>-<stamp>.json */
export function backupName(worldId, moduleId, from, date = new Date()) {
  const stamp = date.toISOString().replace(/[:.]/g, "-");
  return `${worldId}-${moduleId}-v${from}-${stamp}.json`;
}
