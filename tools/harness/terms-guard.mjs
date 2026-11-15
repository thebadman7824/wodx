/**
 * The shared terms guard (B6193). WoDX keeps one meaning for the words every module uses in
 * modules/wodx-chronicle/scripts/terms.mjs (time units, the turn, the night, dice, health levels, distance, eras, lines,
 * player and Storyteller characters). This scan finds a module that writes its own copy again.
 *
 *   node tools/harness/terms-guard.mjs              list what each rule finds now
 *   node tools/harness/terms-guard.mjs --baseline   write tools/harness/terms-guard-baseline.json (only after moving
 *                                                    code onto the terms, so the list only shrinks)
 *
 * The baseline holds the older copies still there, file by file with a count; a new file or a higher count fails
 * tools/harness/terms-guard.test.mjs. Import from terms.mjs instead (or api.terms in play).
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, "../..");
const MODULES = path.join(ROOT, "modules");
export const BASELINE = path.join(HERE, "terms-guard-baseline.json");
/** The files that define the terms themselves. */
const OWNERS = new Set(["wodx-chronicle/scripts/terms.mjs", "wodx-chronicle/scripts/calendar-math.mjs", "wodx-chronicle/scripts/calendar.mjs"]);

const UNIT_NAMES = "DAY|WEEK|MONTH|YEAR|HOUR|MINUTE|NIGHT|SECONDS_A_DAY|SECONDS_PER_DAY|SECONDS_PER_YEAR|YEAR_SECONDS|MONTH_SECONDS|TURN|TURN_SECONDS|DEFAULT_TURN|SCENE_SECONDS|LUNAR_MONTH|LUNAR_MONTH_DAYS|LUNAR_CYCLE_DAYS|SYNODIC_MONTH|YEAR_AND_A_DAY_DAYS";
const count = (text, re) => (text.match(re) ?? []).length;

/** Each rule: text of a file in, number of copies found out. */
export const RULES = {
  /** A time unit written out again: const DAY = 86400, const WEEK = 7 * 86400, const YEAR = 365 * DAY. */
  timeUnit: t => count(t, new RegExp(`(?:\\bconst|\\blet|,)\\s+(?:${UNIT_NAMES})\\s*=\\s*\\(?\\s*[\\d.]`, "g")),
  /** A second's count of a day, week, 30 days or a year typed in place. */
  timeLiteral: t => count(t, /\b(?:86400|604800|2592000|31557600|31536000|31556952|2629746)\b/g),
  /** A dice count of its own: ones counted next to the hits. Use terms.successes (difficulty 2-10, a 10 always hits). */
  diceCount: t => count(t, /(?:=>\s*\w+(?:\.result)?\s*===\s*1\s*\)\.length|===\s*1\s*\)\s*ones\s*(?:\+\+|\+=)|\bones\s*(?:\+\+|\+=)[^\n]*|filter\(\s*(\w+)\s*=>\s*\1\s*===\s*1\s*\))/g),
  /** The seven health levels typed out again. Use terms.HEALTH_LEVELS. */
  healthLevels: t => count(t, /["']bruised["']\s*,\s*["']hurt["']\s*,\s*["']injured["']|\["Bruised",\s*"0"\]/g),
  /** A distance conversion of its own: a units test or a yard-to-metre figure. Use terms.toYards / fromYards. */
  distance: t => count(t, /\/(?:\^\()?m\|meter|0\.9144|1\.0936|=\s*\(?\s*\w+\s*\)?\s*=>\s*1\s*\/\s*\(?[^\n]*toYards/g),
  /** Night as set hours. Use terms.isNightAt or api.terms.isNightHere (sunset to sunrise where the scene is). */
  nightHours: t => count(t, /(?:const|function)\s+isNightHour\b/g),
  /** A player character test of its own. Use terms.isPC / isNPC. */
  pcTest: t => count(t, /(?:const|let)\s+(?:isPC|isNpc|isNPC|isPlayer)\s*=\s*\(?\w+\)?\s*=>[^\n]*hasPlayerOwner/g),
  /** An era table typed again. Use terms.ERA_LIKE, terms.darkAgesRules, terms.eraGroup. */
  eraTable: t => count(t, /ERA_LIKE\s*=\s*\{|DA_ERAS\s*=\s*\[\s*["']dark|DARK_AGE_ERAS\s*=/g)
};

function walk(dir, out = []) {
  for ( const e of fs.readdirSync(dir, {withFileTypes: true}) ) {
    if ( e.name === "node_modules" || e.name.startsWith(".") ) continue;
    const p = path.join(dir, e.name);
    if ( e.isDirectory() ) walk(p, out);
    else if ( /\.(m?js)$/.test(e.name) && !/\.min\./.test(e.name) ) out.push(p);
  }
  return out;
}

/** Everything each rule finds now: {"rule|module/file": n}. */
export function check() {
  const found = {};
  for ( const f of walk(MODULES) ) {
    const rel = path.relative(MODULES, f).split(path.sep).join("/");
    if ( OWNERS.has(rel) || !/\/(scripts|data)\//.test(`/${rel}`) ) continue;
    const text = fs.readFileSync(f, "utf8");
    for ( const [rule, fn] of Object.entries(RULES) ) {
      const n = fn(text);
      if ( n ) found[`${rule}|${rel}`] = n;
    }
  }
  return found;
}

export function loadBaseline() {
  try { return JSON.parse(fs.readFileSync(BASELINE, "utf8")); } catch (e) { return {}; }
}

/** fresh: copies past the baseline; cleared: baseline entries now lower (to take down). */
export function compare(now, base) {
  const fresh = [], cleared = [];
  for ( const [k, n] of Object.entries(now) ) if ( n > (base[k] ?? 0) ) fresh.push(`${k}: ${n}${base[k] ? ` (was ${base[k]})` : ""}`);
  for ( const [k, n] of Object.entries(base) ) if ( (now[k] ?? 0) < n ) cleared.push(`${k}: ${now[k] ?? 0} (baseline ${n})`);
  return {fresh, cleared};
}

if ( process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) ) {
  const now = check();
  if ( process.argv.includes("--baseline") ) {
    const sorted = Object.fromEntries(Object.entries(now).sort(([a], [b]) => a.localeCompare(b)));
    fs.writeFileSync(BASELINE, `${JSON.stringify(sorted, null, 1)}\n`);
    console.log(`Wrote ${Object.keys(sorted).length} entries to ${path.relative(ROOT, BASELINE)}`);
  } else {
    const by = {};
    for ( const [k, n] of Object.entries(now) ) { const r = k.split("|")[0]; by[r] = (by[r] ?? 0) + n; }
    console.log(by);
    for ( const [k, n] of Object.entries(now) ) console.log(`${n}\t${k}`);
  }
}
