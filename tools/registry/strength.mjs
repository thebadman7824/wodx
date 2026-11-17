#!/usr/bin/env node
/**
 * Gate strength (B7143, the Finish-Line Desk, Ben 17 November 2026): how strongly each gate step proves its feature,
 * read from the gate's code. The done-claims audit of 15 November graded 500 claims by hand and found 121 gates that
 * checked the effect, 151 that called an inner function, 94 that checked only a marker and 126 with none.
 *
 *   effect       the step drives a real trigger (a turn, a document update, a hook, a click, the clock) and checks a
 *                number, a token, the canvas or the sheet
 *   marker       it drives a trigger but checks only that a flag, effect, condition, card or message exists
 *   direct-call  it calls module functions without any real trigger
 *   none         no check in the step
 *
 * A grader reading code is a heuristic. It reads the step's own body and one level of the gate file's local helpers
 * that the step calls. A registry row can claim "gated" only through a step graded effect (registry.mjs check). The
 * weak gates already in the repo are listed in tools/registry/strength-baseline.json, which may only shrink:
 * tools/harness/registry.test.mjs fails a new gate file with no effect step.
 *
 *   node tools/registry/strength.mjs [<gate file> ...] [--json]   grades per gate and step (all of tools/gate/gate*.mjs)
 *   node tools/registry/strength.mjs --baseline                     prints the baseline as it would be written now
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const GRADES = ["none", "direct-call", "marker", "effect"];

/** Triggers a player or the clock causes: a turn coming round, a click, a key, the clock, a roll from a sheet. */
const STRONG = [
  /\bcombat\w*\.(update|nextTurn|nextRound|previousTurn|startCombat|endCombat)\s*\(/i, /\btoTurnOf\s*\(/,
  /\.click\s*\(\s*\)/, /dispatchEvent\s*\(/, /game\.time\.advance\s*\(/, /\.(rollAttribute|rollAbility|rollPool|rollDice)\s*\(/,
  /\.(_onDrop|onDrop)\w*\s*\(/, /\bsheet\.render\s*\(/, /\.document\.update\s*\(\s*\{\s*(x|y)\b/
];
/** Document writes: a real path when the step does not also call the module's functions itself. */
const WEAK = [/\.update\s*\(\s*\{/, /\.(create|update|delete)EmbeddedDocuments\s*\(/, /\.setFlag\s*\(/,
  /\.(toggleStatusEffect|toggleActiveEffect)\s*\(/, /ChatMessage\.create\s*\(/];
/** A module function called as the action (not a read: get, has, is, find, list, read, count, of, by, ...). */
const ACTION = /\b(?:[A-Z][A-Za-z]{0,3}|api|\w+\.api|game\.wodx\w*)(?:\??\.\w+)*?\??\.(?!(?:get|has|is|find|list|read|count|of|by|all|names?|label|who|which|show|text|cards?|summary)[A-Z(]?)(\w+)\s*\(/;
const EFFECT = [
  /\.system\.\w/, /\bhealth\b/, /\bdamage\b/, /\bhurt\s*\(/, /\b(x|y|elevation|rotation)\s*[!=<>]=?/, /\.document\.(x|y|elevation)\b/,
  /\bcanvas\.\w/, /\bvision\b|\bsight\b|\blight\b/, /\b(pool|dice|difficulty|successes|total|soak|initiative)\b/i,
  /\bwillpower\b|\bblood\b|\bhumanity\b|\bxp\b/i, /\bsheet\b.*querySelector|querySelector.*\bsheet\b/, /\bwalls?\b|\bdoor\b/
];
const MARKER = [/getFlag\s*\(/, /\bflags\b/, /\beffects\b/, /\bstatuses\b/, /hasCondition\s*\(/, /\bmessages?\b/, /\bcards?\s*\(/, /\.content\b/];

/** The step bodies of a gate file: [{name, body}], cut at each `G.step(` (or `step(`). */
export function steps(src) {
  const re = /\b(?:G\.)?step\s*\(\s*(["'`])((?:\\.|(?!\1).)*)\1/g, out = [];
  let m;
  const hits = [];
  while ( (m = re.exec(src)) ) hits.push({name: m[2], at: m.index});
  for ( let i = 0; i < hits.length; i++ ) out.push({name: hits[i].name, body: src.slice(hits[i].at, hits[i + 1]?.at ?? src.length)});
  if ( out.length ) return out;
  // older gates have no step(): each ok("name", ...) is a step, its body the code since the previous check
  const ok = /(?:\bG\.|[^.\w])ok\s*\(\s*(["'`])((?:\\.|(?!\1).)*)\1/g;
  let from = 0;
  while ( (m = ok.exec(src)) ) {
    const end = src.indexOf("\n", m.index);
    out.push({name: m[2], body: src.slice(from, end < 0 ? src.length : end)});
    from = end < 0 ? src.length : end;
  }
  return out.filter(s => !/^0\./.test(s.name));
}
/** Local helpers of a gate file: {name: body} for `const name = (...) => ...` and `function name(...) {...}`. */
export function helpers(src) {
  const out = {}, re = /(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>|(?:async\s+)?function\s+(\w+)\s*\(/g;
  let m;
  const hits = [];
  while ( (m = re.exec(src)) ) hits.push({name: m[1] ?? m[2], at: m.index});
  for ( let i = 0; i < hits.length; i++ ) out[hits[i].name] = src.slice(hits[i].at, Math.min(hits[i + 1]?.at ?? src.length, hits[i].at + 1500));
  return out;
}
/** How many checks a step makes: its ok() or G.ok() calls (or R.steps.push in the oldest gates). */
const checksOf = body => (body.match(/(?:\bG\.|[^.\w])ok\s*\(|R\.steps\.push\s*\(/g) ?? []).length;

/** Grade one step body, with the file's helpers (one level). */
export function grade(body, help = {}) {
  if ( !checksOf(body) ) return "none";
  const called = Object.keys(help).filter(h => new RegExp(`\\b${h}\\s*\\(`).test(body));
  const all = [body, ...called.map(h => help[h])].join("\n");
  const effect = EFFECT.some(r => r.test(all));
  const onEffect = effect ? "effect" : MARKER.some(r => r.test(all)) ? "marker" : "effect";
  if ( STRONG.some(r => r.test(all)) ) return onEffect;
  // firing a hook by hand or calling the module's own function is the inner path, not the one play takes
  if ( ACTION.test(all) || /Hooks\.(callAll|call)\s*\(/.test(all) ) return "direct-call";
  if ( WEAK.some(r => r.test(all)) ) return onEffect;
  return "marker";
}

/** Grades of every step of a gate file: [{step, grade}]. */
export function gradeFile(root, file) {
  const src = fs.readFileSync(path.join(root, file), "utf8"), help = helpers(src);
  return steps(src).map(s => ({step: s.name, grade: grade(s.body, help)}));
}
/** The grade of the step whose name starts with (or contains) `step`, or null when no step matches. */
export function gradeStep(root, file, step) {
  let all;
  try { all = gradeFile(root, file); } catch { return null; }
  const want = String(step).trim();
  const hit = all.find(s => s.step === want) ?? all.find(s => s.step.startsWith(`${want}.`) || s.step.startsWith(`${want} `)) ?? all.find(s => s.step.includes(want));
  return hit?.grade ?? null;
}
export const best = grades => grades.reduce((b, g) => GRADES.indexOf(g.grade) > GRADES.indexOf(b) ? g.grade : b, "none");

export function gateFiles(root = ROOT) {
  return fs.readdirSync(path.join(root, "tools/gate")).filter(n => /^gate.*\.mjs$/.test(n)).sort().map(n => `tools/gate/${n}`);
}
/** {file: best grade} for the gates whose best step is weaker than effect: the shrink-only baseline. */
export function weakGates(root = ROOT) {
  const out = {};
  for ( const f of gateFiles(root) ) { const b = best(gradeFile(root, f)); if ( b !== "effect" ) out[f] = b; }
  return out;
}

if ( process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ) {
  const args = process.argv.slice(2);
  if ( args.includes("--baseline") ) { console.log(JSON.stringify(weakGates(ROOT), null, 1)); process.exit(0); }
  const files = args.filter(a => !a.startsWith("--"));
  const list = files.length ? files : gateFiles(ROOT);
  const rows = list.map(f => ({file: f, steps: gradeFile(ROOT, f)}));
  if ( args.includes("--json") ) { console.log(JSON.stringify(rows, null, 1)); process.exit(0); }
  const tally = Object.fromEntries(GRADES.map(g => [g, 0]));
  for ( const r of rows ) for ( const s of r.steps ) tally[s.grade]++;
  console.log(`${rows.length} gate file(s), ${rows.reduce((n, r) => n + r.steps.length, 0)} step(s): ${GRADES.map(g => `${tally[g]} ${g}`).join(", ")}.`);
  if ( files.length ) for ( const r of rows ) { console.log(r.file); for ( const s of r.steps ) console.log(`  ${s.grade.padEnd(11)} ${s.step}`); }
}
