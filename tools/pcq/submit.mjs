#!/usr/bin/env node
/**
 * Builds and checks a PC job before a thread queues it (B4100-B4109). Prints the issue title and body; the thread then
 * opens the issue with its GitHub tool (title and body as printed, label pc-job). Checks here catch the faults that
 * used to cost a PC run: a gate name with no file, a two-browser gate in a plain gates job, a gate that breaks the
 * gate rules, a gate script that does not parse.
 *
 *   node tools/pcq/submit.mjs gates gateplains gatelifepath [--lanes 2] [--ref claude/x] [--prio 1] [--thread cmsg_..] [--reset]
 *   node tools/pcq/submit.mjs gates --touched [--lanes 3] ...     the gates the branch's changes need
 *   node tools/pcq/submit.mjs gate-two gatelookhand
 *   node tools/pcq/submit.mjs deploy [--lanes 5]
 *   node tools/pcq/submit.mjs reset --lane 4
 *   node tools/pcq/submit.mjs books-find "Four Bears" "Mato-Tope" [--book v20]
 *   node tools/pcq/submit.mjs trove-find "Catlin" [--under "The Ultimate Trove - Books (C-D)"]
 *   --after <issue>   wait for that job first      --json   print only the job's json
 * Exit 1 when a check fails (nothing to queue).
 */
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {validate, issueBody, LABEL} from "./jobs.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../.."), GATES = path.join(ROOT, "tools", "gate");
const runnerLanes = JSON.parse(fs.readFileSync(path.join(HERE, "runner.json"), "utf8")).lanes;
export const TWO_BROWSER = /phase\s*===?\s*["']player|case\s+["']player/;

/** Problems with the gates a job names. */
export async function preflight(job, gatesDir = GATES) {
  const out = [], names = job.kind === "gate-two" ? [job.gate] : job.kind === "gates" ? job.gates : [];
  for ( const g of names ) {
    const f = path.join(gatesDir, `${g}.mjs`);
    if ( !fs.existsSync(f) ) { out.push(`${g}: no tools/gate/${g}.mjs`); continue; }
    const src = fs.readFileSync(f, "utf8");
    if ( job.kind === "gates" && TWO_BROWSER.test(src) ) out.push(`${g} is a two-browser gate: queue it as gate-two`);
    if ( job.kind === "gate-two" && !TWO_BROWSER.test(src) ) out.push(`${g} is not a two-browser gate: queue it in a gates job`);
    const syn = spawnSync(process.execPath, ["--check", f], {encoding: "utf8"});
    if ( syn.status ) out.push(`${g} does not parse: ${syn.stderr.split("\n").find(l => /Error/.test(l)) ?? syn.stderr.slice(0, 200)}`);
  }
  if ( names.length ) {
    try {
      const {compare, check, loadBaseline} = await import("../harness/gate-rules.mjs");
      const {fresh} = compare(check(gatesDir), loadBaseline());
      for ( const f of fresh.filter(x => names.some(g => x.startsWith(`${g} `) || x.startsWith(`${g}:`) || x.startsWith(`${g}.`))) ) out.push(`gate rule: ${f}`);
    } catch {}
  }
  return out;
}

if ( process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ) {
  const args = process.argv.slice(2), kind = args[0];
  const valued = new Set(["lanes", "lane", "ref", "prio", "thread", "after", "book", "under"]);
  const opt = k => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
  const pos = args.slice(1).filter((a, i, all) => !a.startsWith("--") && !(i > 0 && all[i - 1].startsWith("--") && valued.has(all[i - 1].slice(2))));
  const num = k => opt(k) === undefined ? undefined : Number(opt(k));
  const raw = {kind, ref: opt("ref"), prio: num("prio"), thread: opt("thread"), after: num("after"), lane: num("lane"), lanes: num("lanes")};
  if ( kind === "gates" ) Object.assign(raw, {gates: pos, touched: args.includes("--touched") || undefined, all: args.includes("--all") || undefined, reset: args.includes("--reset") || undefined});
  if ( kind === "gate-two" ) raw.gate = pos[0];
  if ( kind === "books-find" ) Object.assign(raw, {terms: pos, book: opt("book")});
  if ( kind === "trove-find" ) Object.assign(raw, {pattern: pos[0], under: opt("under")});
  for ( const k of Object.keys(raw) ) if ( raw[k] === undefined ) delete raw[k];
  const v = validate(raw, runnerLanes);
  if ( v.error ) { console.error(`Not queued: ${v.error}`); process.exit(1); }
  const problems = await preflight(v.job);
  if ( problems.length ) { console.error(`Not queued; fix these first:\n  ${problems.join("\n  ")}`); process.exit(1); }
  const job = Object.fromEntries(Object.entries(raw).filter(([k]) => k !== "lanes" || v.job.lanes > 1));
  if ( args.includes("--json") ) { console.log(JSON.stringify(job)); process.exit(0); }
  const what = job.gates?.join(" ") || job.gate || job.terms?.join(", ") || job.pattern || (job.touched ? "touched gates" : job.all ? "every gate" : `lane ${job.lane ?? ""}`);
  console.log(`Title: PC job: ${kind} ${what}`.slice(0, 120));
  console.log(`Label: ${LABEL.job}\nBody:\n${issueBody(job)}`);
}
