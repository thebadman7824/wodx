/** Release stamp: which commit of the WoDX repo each package was built from.
 * Every package folder holds release.json. `git archive` fills it in (export-subst in
 * .gitattributes); tools/release/stamp.mjs fills it in for a copy made any other way.
 * A file still holding the $Format placeholder was copied straight from a working folder. */

/** Read one release.json body. Returns {commit, date} or null when it is not stamped. */
export function parseStamp(data) {
  const commit = typeof data?.commit === "string" ? data.commit.trim() : "";
  if ( !/^[0-9a-f]{7,40}$/i.test(commit) ) return null;
  const date = typeof data?.date === "string" && !data.date.includes("$Format") ? data.date : null;
  return {commit: commit.toLowerCase(), date};
}

export const short = commit => String(commit ?? "").slice(0, 7);

/** "9 Nov 2026" from an ISO date, or "" when there is none. */
export function shortDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if ( !m ) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`;
}

/** Sum up the stamps of all packages. stamps: [{id, stamp}] with stamp from parseStamp (or null).
 * Returns {state: "one"|"mixed"|"unstamped"|"partial", commit, date, groups, unstamped, line}. */
export function summarise(stamps) {
  const unstamped = stamps.filter(s => !s.stamp).map(s => s.id);
  const byCommit = new Map();
  for ( const s of stamps ) {
    if ( !s.stamp ) continue;
    if ( !byCommit.has(s.stamp.commit) ) byCommit.set(s.stamp.commit, {commit: s.stamp.commit, date: s.stamp.date, ids: []});
    byCommit.get(s.stamp.commit).ids.push(s.id);
  }
  const groups = [...byCommit.values()].sort((a, b) => b.ids.length - a.ids.length);
  if ( !groups.length ) {
    return {state: "unstamped", commit: null, date: null, groups, unstamped,
      line: "WoDX build: not stamped (copied from a working folder)"};
  }
  if ( groups.length > 1 ) {
    const parts = groups.map(g => `${short(g.commit)} (${g.ids.length})`).join(", ");
    return {state: "mixed", commit: null, date: null, groups, unstamped,
      line: `WoDX build: mixed, ${parts}${unstamped.length ? `, ${unstamped.length} not stamped` : ""}`};
  }
  const g = groups[0];
  const when = shortDate(g.date);
  const base = `WoDX build ${short(g.commit)}${when ? `, ${when}` : ""}`;
  if ( unstamped.length ) {
    return {state: "partial", commit: g.commit, date: g.date, groups, unstamped,
      line: `${base}; not stamped: ${unstamped.join(", ")}`};
  }
  return {state: "one", commit: g.commit, date: g.date, groups, unstamped, line: base};
}
