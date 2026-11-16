#!/usr/bin/env node
/**
 * Audit findings (B6912): which findings are still open. An audit may only say "everything is fixed" when this passes.
 *   node tools/audit/findings.mjs <audit dir> [--rulings <file.json>] [--ref origin/main] [--list]
 * A finding is an item whose verdict is broken, only-tells or dead. It is closed when:
 *   - its `fix` names a commit (7 to 40 hex digits) that is in --ref (default origin/main), or a B number that a
 *     commit message in --ref names (alone or in a range such as B6740-B6748), or
 *   - it is dead and its file is no longer tracked at --ref, or
 *   - a later item closes it: {"closes": "<item id>", "commit": "<sha in --ref>", "test": "<what proves it>"}, written
 *     by a re-check on --ref (worker commits rebased after the audit no longer match their recorded sha), or
 *   - the rulings file (picks exported from the review desk: {"<item id>": {pick}}, with "group-<g>" picks
 *     covering a group's items unless "item-<id>" overrides) holds a ruling for it.
 * A fix note with no commit ("describe only", "needs the owner") does not close anything. The harness and gates prove the
 * fix still works; this proves nothing was left behind. Exit 1 with the open findings; exit 0 when none is open.
 */
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {ROOT, readItems} from "./coverage.mjs";

export const FINDING = new Set(["broken", "only-tells", "dead"]);
const SHA = /\b[0-9a-f]{7,40}\b/g, BNUM = /\bB(\d{2,5})\b/g;

export function closedBy(item, {inRef, tracked, rulings, landed}) {
  for ( const sha of String(item.fix ?? "").match(SHA) ?? [] ) if ( inRef(sha) ) return `fix ${sha}`;
  for ( const [, n] of String(item.fix ?? "").matchAll(BNUM) ) if ( landed?.(Number(n)) ) return `fix B${n}`;
  if ( item.verdict === "dead" && item.file && !tracked(item.file) ) return "deleted";
  const id = item.id ?? "";
  const r = rulings[`item-${id}`]?.pick || rulings[id]?.pick || (item.group ? rulings[`group-${item.group}`]?.pick : "");
  return r ? `ruling: ${r}` : "";
}

export function openFindings(items, ctx) {
  const later = new Map(items.filter(x => x.closes && x.test && ctx.inRef(String(x.commit ?? ""))).map(x => [x.closes, x]));
  return items.filter(x => !(x.id && later.has(x.id))).filter(x => FINDING.has(x.verdict)).map(x => ({x, by: closedBy(x, ctx)})).filter(o => !o.by).map(o => o.x);
}

function gitCtx(ref, root = ROOT) {
  const seen = new Map();
  const inRef = sha => {
    if ( !seen.has(sha) ) {
      try { execFileSync("git", ["merge-base", "--is-ancestor", sha, ref], {cwd: root, stdio: "ignore"}); seen.set(sha, true); }
      catch { seen.set(sha, false); }
    }
    return seen.get(sha);
  };
  const files = new Set(execFileSync("git", ["ls-tree", "-r", "--name-only", ref], {cwd: root, encoding: "utf8"}).split("\n"));
  const bs = new Set();
  const log = execFileSync("git", ["log", "--format=%B", ref], {cwd: root, encoding: "utf8", maxBuffer: 1 << 28});
  for ( const [, a, b] of log.matchAll(/\bB(\d{2,5})(?:\s*[-\u2013]\s*B?(\d{2,5}))?\b/g) ) {
    const lo = Number(a), hi = b ? Number(b) : lo;
    if ( hi >= lo && hi - lo < 100 ) for ( let n = lo; n <= hi; n++ ) bs.add(n);
  }
  return {inRef, tracked: f => files.has(f), landed: n => bs.has(n)};
}

if ( process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ) {
  const a = process.argv.slice(2), dir = a[0], opt = k => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : undefined; };
  if ( !dir || !fs.existsSync(dir) ) { console.error("Usage: node tools/audit/findings.mjs <audit dir> [--rulings f.json] [--ref origin/main] [--list]"); process.exit(2); }
  const rulings = opt("--rulings") ? JSON.parse(fs.readFileSync(opt("--rulings"), "utf8")) : {};
  const items = readItems(dir), all = items.filter(x => FINDING.has(x.verdict));
  const open = openFindings(items, {...gitCtx(opt("--ref") ?? "origin/main"), rulings});
  console.log(`${all.length - open.length} of ${all.length} findings are closed; ${open.length} open.`);
  if ( open.length && (a.includes("--list") || open.length <= 50) ) for ( const o of open ) console.log(`  ${o.verdict}: ${o.id ?? o.file} ${o.where ?? ""}`.trimEnd());
  process.exit(open.length ? 1 : 0);
}
