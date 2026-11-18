#!/usr/bin/env node
/**
 * B7390: seconds per gate from run-gate reports. run-gate.mjs ends each lane's report with one indented line,
 * "  TIMES gate6b=12 gate6c=8 ...", the seconds each gate took (sign-in, the run and the put-back).
 *
 *   node tools/pcq/gate-times.mjs <report or saved job comment> [...]    slowest first: gate, runs, median s, max s
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

/** {gate: [seconds, ...]} from every TIMES line in a text (several lanes or jobs add up). */
export function parseTimes(text = "") {
  const out = {};
  for ( const m of String(text).matchAll(/^\s+TIMES (.*)$/gm) )
    for ( const [, g, s] of m[1].matchAll(/(gate[\w-]*)=(\d+)/g) ) (out[g] ??= []).push(Number(s));
  return out;
}

/** Rows slowest first by median: {gate, runs, median, max, total}. */
export function timeTable(times) {
  const med = a => { const s = [...a].sort((x, y) => x - y), k = s.length >> 1; return s.length % 2 ? s[k] : Math.round((s[k - 1] + s[k]) / 2); };
  return Object.entries(times).map(([gate, a]) => ({gate, runs: a.length, median: med(a), max: Math.max(...a), total: a.reduce((x, y) => x + y, 0)}))
    .sort((a, b) => b.median - a.median || a.gate.localeCompare(b.gate));
}

if ( process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ) {
  const times = {};
  for ( const f of process.argv.slice(2) ) for ( const [g, a] of Object.entries(parseTimes(fs.readFileSync(f, "utf8"))) ) (times[g] ??= []).push(...a);
  const rows = timeTable(times);
  if ( !rows.length ) { console.error("No TIMES line found."); process.exit(1); }
  console.log("gate\truns\tmedian_s\tmax_s");
  for ( const r of rows ) console.log(`${r.gate}\t${r.runs}\t${r.median}\t${r.max}`);
  console.log(`total\t${rows.reduce((n, r) => n + r.runs, 0)}\t\t${rows.reduce((n, r) => n + r.total, 0)} s`);
}
