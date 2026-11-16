#!/usr/bin/env node
/**
 * Audit check by kind of file (B6904), for every tracked file that is not a script or an asset. One item per file in
 * <out dir>/items.jsonl. Each kind has its own test, and each item says in `how` what was and was not checked:
 *   pack       declared in a system or module manifest, and a whole LevelDB folder (CURRENT, MANIFEST)
 *   lang       parses, is listed in its manifest; en.json also: how many keys no code or template names
 *   data       parses (JSON), and some code, template or manifest names it by path or file name
 *   template   (hbs, html) named by code; css listed in a manifest or imported
 *   tool       parses (node --check, python compile); named by another tool, a doc, a workflow or package.json
 *   doc        every repo path it links or names in backticks exists (the prose itself is not checked)
 *   other      parses where it has a parser; named somewhere
 * verdict: working, unreferenced (fine but nothing names it: read by hand), broken (does not parse, missing parts,
 * dead link).
 *   node tools/audit/kinds.mjs <out dir> [files.json]
 */
import fs from "node:fs";
import path from "node:path";
import {execFileSync, spawnSync} from "node:child_process";
import {ROOT} from "./coverage.mjs";

const git = a => execFileSync("git", a, {cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28});
const all = git(["ls-files"]).split("\n").filter(Boolean);
const read = f => { try { return fs.readFileSync(path.join(ROOT, f), "utf8"); } catch { return ""; } };
const isText = f => /\.(m?js|json|hbs|html|css|md|yml|yaml|py|ps1|cmd|bat|sh|txt|toml)$/i.test(f) || !/\.[^/]+$/.test(f);
const codeCorpus = all.filter(f => /\.(m?js|hbs|html|css|json)$/i.test(f) && !f.startsWith("tools/harness/")).map(read).join("\n");
const anyCorpus = all.filter(f => isText(f) && !/\/packs\//.test(f)).map(read).join("\n");
const manifests = all.filter(f => /(^|\/)(module|system)\.json$/.test(f)).map(f => ({f, j: JSON.parse(read(f))}));

function namedIn(file, corpus) {
  const parts = file.split("/");
  for ( let i = 0; i < parts.length; i++ ) {
    const tail = parts.slice(i).join("/");
    if ( (i < parts.length - 1 || tail.length > 8) && corpus.includes(tail) ) return tail;
  }
  return null;
}
const parsesJSON = f => { try { JSON.parse(read(f)); return true; } catch { return false; } };

function kindOf(f) {
  if ( /\/packs\//.test(f) ) return "pack";
  if ( /\/lang\/[^/]+\.json$/.test(f) ) return "lang";
  if ( /\.md$/i.test(f) ) return "doc";
  if ( f.startsWith("tools/") ) return "tool";
  if ( /\.(hbs|html|css)$/i.test(f) ) return "template";
  if ( /\.json$/i.test(f) ) return "data";
  return "other";
}

function check(f) {
  const k = kindOf(f), item = {file: f, kind: k};
  const done = (verdict, how, evidence) => Object.assign(item, {verdict, how: `run:tools/audit/kinds.mjs (${how})`, evidence});
  if ( k === "pack" ) {
    const dir = f.replace(/\/[^/]+$/, ""), root = manifests.find(m => dir.startsWith(path.dirname(m.f) + "/"));
    const rel = root ? dir.slice(path.dirname(root.f).length + 1) : null;
    const declared = !!root && (root.j.packs ?? []).some(p => p.path === rel || p.path === `./${rel}`);
    const whole = ["CURRENT"].every(x => all.includes(`${dir}/${x}`)) && all.some(x => x.startsWith(`${dir}/MANIFEST-`));
    return done(declared && whole ? "working" : "broken", "declared pack, whole LevelDB folder; entries not opened", declared ? (whole ? `pack ${rel} in ${root.f}` : "LevelDB folder incomplete") : `folder ${dir} is not a declared pack`);
  }
  if ( k === "lang" ) {
    if ( !parsesJSON(f) ) return done("broken", "parse", "does not parse");
    const root = manifests.find(m => f.startsWith(path.dirname(m.f) + "/")), rel = root ? f.slice(path.dirname(root.f).length + 1) : "";
    const listed = !!root && (root.j.languages ?? []).some(l => l.path === rel || l.path === `./${rel}`);
    let note = "";
    if ( /\/en\.json$/.test(f) ) {
      const flat = []; const walk = (o, p) => { for ( const [a, v] of Object.entries(o) ) typeof v === "object" ? walk(v, `${p}${a}.`) : flat.push(`${p}${a}`); };
      walk(JSON.parse(read(f)), "");
      const unused = flat.filter(key => !codeCorpus.includes(key) && !codeCorpus.includes(key.split(".").pop() + '"'));
      note = `; ${flat.length} keys, ${unused.length} named by no code or template (a key can be built at run time)`;
    }
    return done(listed ? "working" : "unreferenced", "parse, listed in manifest, key use for en", (listed ? `listed in ${root.f}` : "not listed in any manifest") + note);
  }
  if ( k === "doc" ) {
    const txt = read(f), refs = new Set();
    for ( const m of txt.matchAll(/\]\(([^)#\s]+)[^)]*\)/g) ) if ( !/^[a-z]+:/i.test(m[1]) ) refs.add(path.normalize(path.join(path.dirname(f), m[1])));
    for ( const m of txt.matchAll(/`((?:modules|system|tools|docs|changes)\/[\w./-]+\.\w+)`/g) ) refs.add(m[1]);
    const missing = [...refs].filter(r => !fs.existsSync(path.join(ROOT, r)));
    return done(missing.length ? "broken" : "working", "every linked or named repo path exists; the prose was not read", missing.length ? `missing: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? ` (+${missing.length - 8})` : ""}` : `${refs.size} repo path(s), all present`);
  }
  // parse where a parser exists
  let parses = true, why = "";
  if ( /\.m?js$/.test(f) ) { const r = spawnSync(process.execPath, ["--check", path.join(ROOT, f)], {encoding: "utf8"}); parses = r.status === 0; why = r.stderr.split("\n")[0]; }
  else if ( /\.py$/.test(f) ) { const r = spawnSync("python3", ["-c", "import ast,sys;ast.parse(open(sys.argv[1]).read())", path.join(ROOT, f)], {encoding: "utf8"}); parses = r.status === 0; why = r.stderr.split("\n").pop(); }
  else if ( /\.json$/.test(f) ) { parses = parsesJSON(f); why = "JSON does not parse"; }
  if ( !parses ) return done("broken", "parse", why || "does not parse");
  if ( k === "template" && /\.css$/.test(f) ) {
    const root = manifests.find(m => f.startsWith(path.dirname(m.f) + "/")), rel = root ? f.slice(path.dirname(root.f).length + 1) : "";
    const listed = !!root && (root.j.styles ?? []).some(s => (s.src ?? s) === rel || (s.src ?? s) === `./${rel}`);
    const by = listed ? `styles in ${root.f}` : namedIn(f, codeCorpus);
    return done(by ? "working" : "unreferenced", "listed in manifest styles or imported", by ? `named as ${by}` : "no manifest lists it and nothing imports it");
  }
  const corpus = k === "tool" || k === "other" ? anyCorpus : codeCorpus;
  const by = /(^|\/)(module|system|package)\.json$|^\.github\/|^\.git|^(README|NOTICE)/.test(f) ? "a manifest or repo file in its own right" : namedIn(f, corpus.replace(read(f), ""));
  return done(by ? "working" : "unreferenced", k === "tool" ? "parse, named by another file" : "parse where possible, named by code", by ? `named as ${by}` : "nothing else names it");
}

if ( process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname ) {
  const out = process.argv[2], list = process.argv[3];
  if ( !out ) { console.error("Usage: node tools/audit/kinds.mjs <out dir> [files.json]"); process.exit(2); }
  const files = list ? JSON.parse(fs.readFileSync(list, "utf8")).map(x => x.file ?? x) : all;
  fs.mkdirSync(out, {recursive: true});
  const rows = files.map(check);
  fs.writeFileSync(path.join(out, "items.jsonl"), rows.map(r => JSON.stringify(r)).join("\n") + "\n");
  const c = {}; for ( const r of rows ) c[`${r.kind}:${r.verdict}`] = (c[`${r.kind}:${r.verdict}`] ?? 0) + 1;
  console.log(rows.length, c);
}
