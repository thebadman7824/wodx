#!/usr/bin/env node
/**
 * One priority order for every project process (B7350-B7359). Reads registry/priorities.json and answers the
 * questions every tool that orders work needs: which rank a job has, which of two jobs goes first, whether a PC is in
 * a planned hold window, whether the merge train's clock runs, and whether a long batch (the book OCR, an art render)
 * may start. Tools import it; the PC loops call it from the command line.
 *
 *   node tools/pcq/prio.mjs check                                     the file is well formed (exit 1 if not)
 *   node tools/pcq/prio.mjs rank <class>                              the rank of a class, e.g. pr-gates -> R3
 *   node tools/pcq/prio.mjs threads                                   the thread order, one line each
 *   node tools/pcq/prio.mjs window [--pc HOST]                        the planned window that holds this PC now, if any
 *   node tools/pcq/prio.mjs ask --class ocr|art [--pc HOST] [--free-gb N] [--claim]
 *        one JSON line {go, why, ramGb}: exit 0 to go, 3 to wait. --claim writes a claim file for this process's
 *        parent (the loop that called it) so the runner can keep the memory free; claims of dead processes are ignored.
 *   node tools/pcq/prio.mjs release --class ocr|art [--pc HOST]       drop this caller's claim
 *   node tools/pcq/prio.mjs claims                                    live claims on this PC, one JSON line
 *
 * Claims live in PRIO_CLAIMS_DIR (default <script folder>/../../../claims, i.e. D:\WoDX\pcq\claims beside the runner's
 * clone). Nothing here starts, stops or changes a job: it only answers.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const FILE = path.resolve(HERE, "../../registry/priorities.json");
export const CLAIMS = process.env.PRIO_CLAIMS_DIR || path.resolve(HERE, "../../../claims");
const HOUR = 3600e3;

/** The priorities file, parsed. */
export function load(file = FILE) { return JSON.parse(fs.readFileSync(file, "utf8")); }

/** Problems with the file, as lines; empty when it is well formed. */
export function check(p) {
  const out = [];
  const ranks = Array.isArray(p?.ranks) ? p.ranks : [];
  if ( !ranks.length ) out.push("ranks: none listed");
  const ids = ranks.map(r => r.id);
  if ( new Set(ids).size !== ids.length ) out.push("ranks: an id is listed twice");
  ranks.forEach((r, i) => {
    if ( !/^R\d+$/.test(r.id ?? "") ) out.push(`ranks[${i}]: id must look like R0, R1, ...`);
    for ( const y of r.yieldsTo ?? [] ) if ( ids.indexOf(y) < 0 || ids.indexOf(y) >= i ) out.push(`${r.id}: yields to ${y}, which is not a rank above it`);
  });
  for ( const [c, r] of Object.entries(p?.classes ?? {}) ) if ( !ids.includes(r) ) out.push(`classes.${c}: no rank ${r}`);
  for ( const need of ["pr-gates", "train-front", "health"] ) if ( !p?.classes?.[need] ) out.push(`classes: ${need} is missing`);
  if ( p?.classes?.control !== ids[0] ) out.push("classes.control must be the first rank");
  if ( !(p?.aging?.hoursPerStep > 0) ) out.push("aging.hoursPerStep must be above 0");
  if ( !["gate-boundary", "job-end"].includes(p?.preempt?.mode) ) out.push("preempt.mode must be gate-boundary or job-end");
  for ( const [host, pc] of Object.entries(p?.pcs ?? {}) ) {
    if ( pc.lead && !(pc.lead.class && pc.lead.ramGb > 0) ) out.push(`pcs.${host}.lead needs a class and ramGb`);
    for ( const [c, b] of Object.entries(pc.budgets ?? {}) ) if ( !(b.ramGb > 0) ) out.push(`pcs.${host}.budgets.${c} needs ramGb`);
  }
  for ( const [i, w] of (p?.windows?.planned ?? []).entries() ) {
    if ( !p.pcs?.[w.pc] ) out.push(`windows.planned[${i}]: unknown pc ${w.pc}`);
    if ( !(Date.parse(w.from) < Date.parse(w.to)) ) out.push(`windows.planned[${i}]: from must be a time before to`);
  }
  if ( !(p?.train?.maxHours > 0) ) out.push("train.maxHours must be above 0");
  const orders = (p?.threads ?? []).map(t => t.order);
  if ( !orders.length || orders.some((o, i) => o !== i + 1) ) out.push("threads: order must run 1, 2, 3, ... with no gaps");
  if ( !Array.isArray(p?.gpu?.order) || !p.gpu.order.length ) out.push("gpu.order: none listed");
  return out;
}

/** The position of a rank (0 is first). An unknown rank sorts last. */
export function rankIndex(p, id) { const i = p.ranks.findIndex(r => r.id === id); return i < 0 ? p.ranks.length : i; }

/** The rank of a class (a class name or a rank id). Unknown classes get the PR gate rank. */
export function rankOf(p, cls) {
  if ( p.ranks.some(r => r.id === cls) ) return cls;
  return p.classes[cls] ?? p.classes["pr-gates"];
}

/**
 * The class of a PC job. job: the parsed job (jobs.mjs); ctx: {front: the job belongs to the train's front pull
 * request, labels: the pull request's labels}. A job may name its own "class"; otherwise it is worked out.
 */
export function classOf(p, job = {}, ctx = {}) {
  if ( ctx.front ) return "train-front";
  if ( job.class && p.classes[job.class] ) return job.class;
  if ( job.branchTools ) return "branch-tools";
  if ( (ctx.labels ?? []).includes(p.urgentLabel ?? "urgent") ) return "urgent";
  if ( job.kind === "books-find" || job.kind === "trove-find" ) return "lookup";
  // A full run of main (nightly or scheduled) is a health run; a full run of a branch is still that branch's gates.
  if ( job.all && !/^(claude|handoff)\//.test(String(job.ref ?? "main")) ) return "health";
  return job.touched ? "pr-gates" : "hand";
}

/**
 * Queue order. entries: [{job, waitedMs, number, ctx}]. Rank first; inside a rank the job's own 1-5 number, less one
 * step for each aging.hoursPerStep it has waited (never below 1, and never out of its rank), then the older issue.
 */
export function sortQueue(p, entries) {
  const key = e => {
    const r = rankIndex(p, rankOf(p, classOf(p, e.job, e.ctx)));
    const steps = Math.floor((e.waitedMs ?? 0) / (p.aging.hoursPerStep * HOUR));
    const inner = p.aging.withinRankOnly ? Math.max(1, (e.job?.prio ?? 3) - steps) : (e.job?.prio ?? 3);
    return [r, inner, e.number ?? 0];
  };
  return [...entries].sort((a, b) => { const x = key(a), y = key(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; });
}

/** May a job of rank `low` keep its lanes while a job of rank `high` waits? false means hand over at the next gate. */
export function mayKeep(p, low, high) {
  const lo = p.ranks.find(r => r.id === low);
  return !lo || !(lo.yieldsTo ?? []).includes(high);
}

const host = () => os.hostname().toUpperCase();
const pcOf = (p, pc = host()) => p.pcs[Object.keys(p.pcs).find(k => k.toUpperCase() === String(pc).toUpperCase())] ?? null;

/** The planned window that holds a PC at `now` (from holdMinutesBefore ahead of it to its end), or null. */
export function activeWindow(p, pc = host(), now = Date.now()) {
  const lead = (p.windows?.holdMinutesBefore ?? 0) * 60e3;
  return (p.windows?.planned ?? []).find(w => String(w.pc).toUpperCase() === String(pc).toUpperCase()
    && now >= Date.parse(w.from) - lead && now < Date.parse(w.to)) ?? null;
}

/** Whether the merge train's clock runs. s: {held, off, window} for the lanes that could run the front job. */
export function trainClockRuns(p, s = {}) {
  return !(p.train.clockStopsWhen ?? []).some(k => s[k]);
}

/**
 * May a long batch start now? cls: ocr or art; freeGb: free memory now (optional). The PC's lead class always goes,
 * outside a planned window. A budgeted class goes when its budget fits in the free memory. Anything else is not a
 * batch this file knows, and is told to wait.
 */
export function ask(p, {cls, pc = host(), freeGb = null, now = Date.now()} = {}) {
  const box = pcOf(p, pc);
  if ( !box ) return {go: false, why: `no entry for ${pc} in registry/priorities.json`, ramGb: 0};
  const w = activeWindow(p, pc, now);
  if ( w ) return {go: false, why: `planned window on ${box.name}: ${w.why ?? "hold"} until ${w.to}`, ramGb: 0};
  if ( box.lead?.class === cls ) return {go: true, why: `${cls} leads on ${box.name} (${box.lead.until})`, ramGb: box.lead.ramGb};
  const b = box.budgets?.[cls];
  if ( !b ) return {go: false, why: `${cls} is neither the lead nor a budgeted job on ${box.name}`, ramGb: 0};
  if ( freeGb !== null && freeGb < b.ramGb ) return {go: false, why: `${cls} needs ${b.ramGb} GB free on ${box.name}, ${freeGb} GB is`, ramGb: b.ramGb};
  return {go: true, why: `${cls} fits its ${b.ramGb} GB budget on ${box.name}`, ramGb: b.ramGb};
}

const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; } };

/** Live claims in a folder: [{class, pid, ramGb, since}]. Claims of dead processes are removed. */
export function claims(dir = CLAIMS) {
  let names = [];
  try { names = fs.readdirSync(dir).filter(f => f.endsWith(".json")); } catch { return []; }
  const out = [];
  for ( const f of names ) {
    const file = path.join(dir, f);
    let c = null; try { c = JSON.parse(fs.readFileSync(file, "utf8")); } catch {}
    if ( !c || !alive(c.pid) ) { try { fs.unlinkSync(file); } catch {} continue; }
    out.push(c);
  }
  return out;
}

/** Memory the runner must keep free of lanes: the sum of the live claims. */
export const reservedGb = (dir = CLAIMS) => claims(dir).reduce((s, c) => s + (c.ramGb ?? 0), 0);

export function writeClaim(dir, c) {
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(path.join(dir, `${c.class}-${c.pid}.json`), JSON.stringify(c));
}
export function dropClaim(dir, cls, pid) { try { fs.unlinkSync(path.join(dir, `${cls}-${pid}.json`)); } catch {} }

function main(argv) {
  const opt = k => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : null; };
  const p = load();
  const cmd = argv[0];
  if ( cmd === "check" ) { const bad = check(p); console.log(bad.length ? bad.join("\n") : "priorities.json is well formed"); return bad.length ? 1 : 0; }
  if ( cmd === "rank" ) { console.log(rankOf(p, argv[1])); return 0; }
  if ( cmd === "threads" ) { for ( const t of p.threads ) console.log(`${t.order}. ${t.kind}`); return 0; }
  if ( cmd === "window" ) { const w = activeWindow(p, opt("pc") ?? host()); console.log(JSON.stringify(w)); return 0; }
  if ( cmd === "claims" ) { console.log(JSON.stringify(claims())); return 0; }
  if ( cmd === "ask" ) {
    const cls = opt("class"), free = opt("free-gb");
    const a = ask(p, {cls, pc: opt("pc") ?? host(), freeGb: free === null ? null : Number(free)});
    if ( a.go && argv.includes("--claim") ) writeClaim(CLAIMS, {class: cls, pid: process.ppid, ramGb: a.ramGb, since: new Date().toISOString()});
    console.log(JSON.stringify(a));
    return a.go ? 0 : 3;
  }
  if ( cmd === "release" ) { dropClaim(CLAIMS, opt("class"), process.ppid); return 0; }
  console.error("Usage: node tools/pcq/prio.mjs check | rank <class> | threads | window [--pc H] | ask --class C [--pc H] [--free-gb N] [--claim] | release --class C | claims");
  return 2;
}

if ( import.meta.url === pathToFileURL(process.argv[1] ?? "").href ) process.exitCode = main(process.argv.slice(2));
