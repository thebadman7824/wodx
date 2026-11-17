#!/usr/bin/env node
/**
 * Feature registry (B7140-B7149, the Finish-Line Desk, Ben 17 November 2026): one row per thing a player or the
 * Storyteller uses, in registry/features/<module-id>.json, with proof for each step it has reached. Audits, the
 * Monday review and handoffs read this instead of rebuilding the picture (registry/features/README.md).
 *
 *   node tools/registry/registry.mjs check [--module <id>]   every row well formed, its files, gate step, reader and
 *                                                            art ids found; exit 1 on a problem
 *   node tools/registry/registry.mjs owner <file>            the rows that own a repo path
 *   node tools/registry/registry.mjs owners [--module <id>] [--list]   script files no row owns
 *   node tools/registry/registry.mjs wip [<module>]          half-built rows per module (the ratchet, B7146)
 *   node tools/registry/registry.mjs changed --since <ref>   rows whose entry or owned files changed since <ref>
 *   node tools/registry/registry.mjs summary [--write]       docs/FEATURES.md, generated (B7148)
 */
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const DIR = "registry/features";
export const INBOX = `${DIR}/_inbox.json`;
/** The seven steps, in order (B7141). A row's status is the last step reached with every earlier one reached too. */
export const STEPS = ["built", "wired", "shown", "gated", "book", "verified"];
export const STATUS = ["planned", ...STEPS];
/** Steps a row may skip with a reason ({"none": "why"}): a rule with nothing to show, a tool with no book page. */
export const SKIPPABLE = new Set(["shown", "book"]);
export const FAULT_STATUS = new Set(["open", "fixed", "not-a-fault"]);
/** Where the shared art tables live (the art thread's, outside git); read only when present (B7147). */
export const ART_DIR = process.env.WODX_ART_ASSETS ?? "/mnt/project-files/registry/art-assets";
/** The script files a row may own and that must be owned once a module is seeded (same scope as coverage.mjs). */
export const SCOPE = /^(modules\/[\w-]+\/scripts\/|system\/worldofdarkness\/module\/).+\.m?js$/;

const ID = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const read = (root, f) => { try { return fs.readFileSync(path.join(root, f), "utf8"); } catch { return null; } };

/** Every registry file at `root` (or as given by `files`, a {path: text} map from git): {module: {seeded, rows}}. */
export function load(root = ROOT, files = null) {
  const out = {}, problems = [];
  const names = files ? Object.keys(files) : (fs.existsSync(path.join(root, DIR)) ? fs.readdirSync(path.join(root, DIR)).map(n => `${DIR}/${n}`) : []);
  for ( const f of names.sort() ) {
    if ( !/\.json$/.test(f) || f === INBOX ) continue;
    const text = files ? files[f] : read(root, f);
    let j;
    try { j = JSON.parse(text); } catch (e) { problems.push(`${f}: not valid JSON (${e.message})`); continue; }
    const want = path.basename(f, ".json");
    if ( j.module !== want ) problems.push(`${f}: "module" must be "${want}"`);
    out[want] = {file: f, seeded: j.seeded === true, rows: Array.isArray(j.rows) ? j.rows : []};
    if ( !Array.isArray(j.rows) ) problems.push(`${f}: "rows" must be a list`);
  }
  return {modules: out, problems};
}

export const allRows = reg => Object.values(reg.modules).flatMap(m => m.rows);

/** A step counts as reached when it is truthy; a skippable step also counts when it says {"none": "<reason>"}. */
export const reached = (row, step) => !!row?.steps?.[step];
export const openFaults = row => (row.faults ?? []).filter(f => (f.status ?? "open") === "open");

/** planned | built | wired | shown | gated | book | verified, plus "parked" when the row is parked by Ben. */
export function status(row) {
  if ( row.parked ) return "parked";
  let s = "planned";
  for ( const step of STEPS ) { if ( !reached(row, step) ) break; s = step; }
  // B7141: an open fault (a Report a problem entry, an audit finding) takes a verified row back to book
  if ( s === "verified" && openFaults(row).length ) s = "book";
  return s;
}
/** Half-built (B7146): work started (built) but not yet gated, or carrying an open fault. Planned and parked rows are not. */
export function halfBuilt(row) {
  const s = status(row);
  if ( s === "parked" || s === "planned" ) return false;
  return STATUS.indexOf(s) < STATUS.indexOf("gated") || openFaults(row).length > 0;
}
export function wip(reg) {
  const out = {};
  for ( const [m, x] of Object.entries(reg.modules) ) out[m] = x.rows.filter(halfBuilt).length;
  return out;
}

/** Glob to a regular expression: `**` any depth, `*` within one folder segment. */
export function globRe(g) {
  const s = g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\/?/g, "\u0000").replace(/\*/g, "[^/]*").replace(/\u0000/g, "(?:.*/)?");
  return new RegExp(`^${s.replace(/\(\?:\.\*\/\)\?$/, ".*")}$`);
}
const covers = (pattern, file) => pattern.includes("*") ? globRe(pattern).test(file) : pattern === file || file.startsWith(pattern.replace(/\/?$/, "/"));

/** The rows that own a repo path (B7142). The solo reports converter files a fault on the single owner. */
export function ownerOf(reg, file) {
  const f = String(file).replace(/\\/g, "/").replace(/^\.\//, "");
  return allRows(reg).filter(r => (r.files ?? []).some(p => covers(p, f)));
}

/** Files git tracks at `root`. */
export function trackedFiles(root = ROOT) {
  return execFileSync("git", ["ls-files"], {cwd: root, encoding: "utf8"}).split("\n").filter(Boolean);
}
const moduleOf = f => /^modules\/([\w-]+)\//.exec(f)?.[1] ?? (/^system\//.test(f) ? "system" : null);

/** Script files in scope that no row owns, for the given modules (all when none named). */
export function unowned(reg, files, modules = null) {
  return files.filter(f => SCOPE.test(f) && (!modules || modules.includes(moduleOf(f))) && !ownerOf(reg, f).length);
}

/** Art ids in the shared tables ({id: row}), or null when the tables are not reachable (CI). */
export function artIds(dir = ART_DIR) {
  try {
    const ids = {};
    for ( const n of fs.readdirSync(dir) ) if ( /\.json$/.test(n) ) for ( const r of JSON.parse(fs.readFileSync(path.join(dir, n), "utf8")).rows ?? [] ) ids[r.id] = r;
    return ids;
  } catch { return null; }
}

/**
 * Problems with the rows (B7140, B7142): ids, steps in the right shape, files that exist, the gate file and step,
 * the reader, art ids. `strength` (optional) is a function (gateFile, step) -> grade; a gated step on a weak grade is
 * a problem (B7143). Returns ["<module>/<row>: what is wrong"].
 */
export function rowProblems(reg, {root = ROOT, files = null, strength = null, art = undefined} = {}) {
  const tracked = files ?? trackedFiles(root);
  const have = new Set(tracked), out = [...reg.problems];
  const ids = new Map();
  const arts = art === undefined ? artIds() : art;
  const text = f => read(root, f);
  for ( const [m, mod] of Object.entries(reg.modules) ) {
    for ( const r of mod.rows ) {
      const at = `${m}/${r?.id ?? "?"}`, bad = s => out.push(`${at}: ${s}`);
      if ( !r || typeof r !== "object" ) { out.push(`${m}: a row is not an object`); continue; }
      if ( !ID.test(r.id ?? "") ) bad(`id must be lower case words joined by . or - (got ${JSON.stringify(r.id)})`);
      if ( ids.has(r.id) ) bad(`id also used in ${ids.get(r.id)}`); else ids.set(r.id, m);
      if ( !r.name ) bad("needs a name");
      if ( r.module && r.module !== m ) bad(`module says ${r.module} but the row is in ${m}.json`);
      for ( const k of Object.keys(r.steps ?? {}) ) if ( !STEPS.includes(k) ) bad(`unknown step "${k}" (steps: ${STEPS.join(", ")})`);
      const st = r.steps ?? {};
      // steps reached out of order: a later step is set while an earlier one is not
      let gap = null;
      for ( const s of STEPS ) { if ( !reached(r, s) ) gap ??= s; else if ( gap ) bad(`${s} is set but ${gap} is not`); }
      for ( const s of STEPS ) if ( st[s]?.none !== undefined && !SKIPPABLE.has(s) ) bad(`${s} cannot be skipped with "none"`);
      for ( const s of SKIPPABLE ) if ( st[s]?.none !== undefined && String(st[s].none).trim().length < 10 ) bad(`${s}: "none" needs a reason`);
      if ( reached(r, "built") && !(r.files ?? []).length ) bad("built, but owns no files");
      for ( const p of r.files ?? [] ) if ( !(p.includes("*") ? tracked.some(f => globRe(p).test(f)) : have.has(p) || tracked.some(f => f.startsWith(p.replace(/\/?$/, "/")))) ) bad(`file ${p} is not in the repo`);
      if ( st.wired && st.wired !== true ) {
        const [f, sym] = String(st.wired.reader ?? "").split(":");
        if ( !f ) bad("wired needs a reader (file:symbol that reads it in play)");
        else if ( !have.has(f) ) bad(`wired: reader file ${f} is not in the repo`);
        else if ( sym && !(text(f) ?? "").includes(sym) ) bad(`wired: ${sym} not found in ${f}`);
      } else if ( st.wired === true ) bad("wired needs {\"reader\": \"file:symbol\"}");
      if ( st.shown && st.shown.none === undefined && !st.shown.what ) bad("shown needs {\"what\": \"what players see\"} or {\"none\": \"why\"}");
      if ( st.gated ) {
        const g = st.gated.gate, step = st.gated.step;
        if ( !g || !have.has(g) ) bad(`gated: gate file ${g ?? "(none)"} is not in the repo`);
        else if ( step === undefined || step === null || step === "" ) bad("gated needs the gate step that checks the effect");
        else {
          const src = text(g) ?? "";
          if ( !src.includes(String(step)) ) bad(`gated: step "${step}" not found in ${g}`);
          else if ( strength ) {
            const grade = strength(g, String(step));
            if ( grade === null ) bad(`gated: no step named "${step}" in ${g}`);
            else if ( grade && grade !== "effect" ) bad(`gated: ${g} step "${step}" is graded ${grade}; a gated row needs a step that drives the real trigger and checks the effect (tools/registry/strength.mjs)`);
          }
        }
      }
      if ( st.book && st.book.none === undefined && !st.book.ref ) bad("book needs {\"ref\": \"V20 p. 272\"} or {\"none\": \"why\"}");
      if ( st.verified && !(st.verified.by && st.verified.how) ) bad("verified needs {\"by\", \"how\"} (set by a session other than the builder)");
      for ( const f of r.faults ?? [] ) {
        if ( !f.id || !f.what ) bad("each fault needs an id and what");
        if ( f.status && !FAULT_STATUS.has(f.status) ) bad(`fault ${f.id}: status must be open, fixed or not-a-fault`);
      }
      for ( const a of r.art ?? [] ) if ( arts && !arts[a] ) bad(`art id ${a} is not in the art tables (${ART_DIR})`);
    }
  }
  return out;
}

/** Files of the registry at a git commit, as {path: text}. */
export function registryAt(root, rev) {
  let names = [];
  try { names = execFileSync("git", ["ls-tree", "--name-only", `${rev}:${DIR}`], {cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"]}).split("\n").filter(Boolean); } catch { return {}; }
  const out = {};
  for ( const n of names ) out[`${DIR}/${n}`] = execFileSync("git", ["show", `${rev}:${DIR}/${n}`], {cwd: root, encoding: "utf8"});
  return out;
}
const rowKey = r => JSON.stringify(r);

/** Rows whose entry changed, or whose owned files changed, between `since` and the working tree's HEAD. */
export function changed(root, since) {
  const now = load(root), was = load(root, registryAt(root, since));
  const before = new Map(allRows(was).map(r => [r.id, rowKey(r)]));
  const files = execFileSync("git", ["diff", "--name-only", since, "HEAD"], {cwd: root, encoding: "utf8"}).split("\n").filter(Boolean);
  const out = [];
  for ( const r of allRows(now) ) {
    const why = [];
    if ( !before.has(r.id) ) why.push("new row");
    else if ( before.get(r.id) !== rowKey(r) ) why.push("row changed");
    const touched = files.filter(f => (r.files ?? []).some(p => covers(p, f)));
    if ( touched.length ) why.push(`${touched.length} owned file(s) changed`);
    if ( why.length ) out.push({id: r.id, module: r.module, status: status(r), why});
  }
  return out;
}

/** docs/FEATURES.md (B7148): one table per module, generated, never edited by hand. */
export function summary(reg) {
  const lines = ["# Features", "", "Written by `node tools/registry/registry.mjs summary --write` from registry/features/ (B7148). Do not edit by hand.",
    "Status is the last step a row has proof for: planned, built, wired, shown, gated, book, verified (registry/features/README.md).", ""];
  const mods = Object.entries(reg.modules);
  const counts = mods.map(([m, x]) => [m, x.seeded, x.rows.length, x.rows.filter(r => status(r) === "verified").length, x.rows.filter(halfBuilt).length]);
  lines.push("| Module | Seeded | Rows | Verified | Half-built |", "| --- | --- | --- | --- | --- |");
  for ( const [m, s, n, v, h] of counts ) lines.push(`| ${m} | ${s ? "yes" : "not yet"} | ${n} | ${v} | ${h} |`);
  for ( const [m, x] of mods ) {
    if ( !x.rows.length ) continue;
    lines.push("", `## ${m}`, "", "| Feature | Core | Status | Open | Gate |", "| --- | --- | --- | --- | --- |");
    for ( const r of [...x.rows].sort((a, b) => (b.core ? 1 : 0) - (a.core ? 1 : 0) || a.name.localeCompare(b.name)) ) {
      const open = [...(r.open ?? []), ...openFaults(r).map(f => `fault: ${f.what}`)].length;
      lines.push(`| ${r.name} (\`${r.id}\`) | ${r.core ? "core" : ""} | ${status(r)} | ${open || ""} | ${r.steps?.gated ? `${path.basename(r.steps.gated.gate, ".mjs")} ${r.steps.gated.step}` : ""} |`);
    }
  }
  return lines.join("\n") + "\n";
}

if ( process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ) {
  const [cmd, ...args] = process.argv.slice(2);
  const opt = k => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
  const reg = load(ROOT);
  const only = opt("module");
  if ( only ) for ( const m of Object.keys(reg.modules) ) if ( m !== only ) delete reg.modules[m];
  if ( cmd === "check" ) {
    const {gradeStep} = await import("./strength.mjs");
    const p = rowProblems(reg, {strength: (g, s) => gradeStep(ROOT, g, s)});
    const n = allRows(reg).length;
    console.log(`${n} row(s) in ${Object.keys(reg.modules).length} module file(s); ${p.length} problem(s).`);
    for ( const x of p ) console.log(`  ${x}`);
    process.exit(p.length ? 1 : 0);
  } else if ( cmd === "owner" ) {
    const f = args.find(a => !a.startsWith("--"));
    if ( !f ) { console.error("Usage: registry.mjs owner <file>"); process.exit(2); }
    const rows = ownerOf(reg, f);
    for ( const r of rows ) console.log(`${r.id}\t${r.module}\t${status(r)}`);
    if ( !rows.length ) console.log("no row owns it");
  } else if ( cmd === "owners" ) {
    const mods = only ? [only] : null, open = unowned(reg, trackedFiles(ROOT), mods);
    const total = trackedFiles(ROOT).filter(f => SCOPE.test(f) && (!mods || mods.includes(moduleOf(f)))).length;
    console.log(`${total - open.length} of ${total} script files are owned by a row; ${open.length} not.`);
    if ( args.includes("--list") ) for ( const f of open ) console.log(`  ${f}`);
  } else if ( cmd === "wip" ) {
    const w = wip(reg), m = args.find(a => !a.startsWith("--"));
    for ( const [k, v] of Object.entries(w) ) if ( !m || k === m ) console.log(`${k}\t${v} half-built${reg.modules[k].seeded ? "" : " (not seeded yet)"}`);
  } else if ( cmd === "changed" ) {
    const since = opt("since");
    if ( !since ) { console.error("Usage: registry.mjs changed --since <ref>"); process.exit(2); }
    for ( const c of changed(ROOT, since) ) console.log(`${c.id}\t${c.module}\t${c.status}\t${c.why.join("; ")}`);
  } else if ( cmd === "summary" ) {
    const s = summary(reg);
    if ( args.includes("--write") ) { fs.writeFileSync(path.join(ROOT, "docs/FEATURES.md"), s); console.log("wrote docs/FEATURES.md"); }
    else process.stdout.write(s);
  } else {
    console.error("Usage: registry.mjs check|owner <file>|owners|wip|changed --since <ref>|summary [--write]");
    process.exit(2);
  }
}
