/**
 * The rules core guard (B8060-B8061, docs/RULES-CORE.md). The rules package modules/wodx-rules, and every rules file
 * still waiting to move into it, must stay free of Foundry: no Foundry global named in its code or in any file it
 * imports, and nothing that breaks loading it in plain Node. tools/harness/rules-core.test.mjs runs these checks.
 *
 *   node tools/harness/rules-core.mjs            print what the checks find (the same lists the test compares)
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, "../..");
export const PKG = "modules/wodx-rules";
export const BASELINE = path.join(HERE, "rules-core-baseline.json");

/** The Foundry globals a pure file may not touch. */
export const FOUNDRY_GLOBALS = ["game", "foundry", "CONFIG", "CONST", "ui", "Hooks", "canvas", "ChatMessage", "Roll",
  "Actor", "Item", "Scene", "JournalEntry", "Macro", "Token", "TokenDocument", "Combat", "Dialog", "DialogV2",
  "Application", "FormApplication", "renderTemplate", "fromUuid", "fromUuidSync", "getDocumentClass", "TextEditor",
  "Handlebars", "loadTemplates", "Playlist", "Folder", "User", "Region", "AmbientLight", "Tile", "Wall", "Note"];

/** A rules file: *-rules.mjs, *-rules.js, rules.mjs or rules.js. */
export const isRulesFile = f => /(^|[-/])rules\.m?js$/.test(f);

const rel = f => path.relative(ROOT, f).split(path.sep).join("/");
const walk = d => fs.readdirSync(d, {withFileTypes: true}).flatMap(e => {
  const p = path.join(d, e.name);
  if ( e.isDirectory() ) return ["node_modules", "tests", ".git"].includes(e.name) ? [] : walk(p);
  return /\.m?js$/.test(e.name) ? [p] : [];
});

/** Code with comments, strings and template text taken out, so a word in prose or a message never counts. */
export function codeOnly(src) {
  let out = "", i = 0;
  const n = src.length;
  while ( i < n ) {
    const c = src[i], d = src[i + 1];
    if ( c === "/" && d === "*" ) { const j = src.indexOf("*/", i + 2); i = j < 0 ? n : j + 2; out += " "; continue; }
    if ( c === "/" && d === "/" ) { const j = src.indexOf("\n", i); i = j < 0 ? n : j; continue; }
    if ( c === "\"" || c === "'" || c === "`" ) {
      let j = i + 1;
      while ( j < n && src[j] !== c ) {
        if ( src[j] === "\\" ) j++;
        else if ( c === "`" && src[j] === "$" && src[j + 1] === "{" ) {
          // keep the code inside ${...}
          let depth = 1, k = j + 2;
          while ( k < n && depth ) { if ( src[k] === "{" ) depth++; else if ( src[k] === "}" ) depth--; k++; }
          out += " " + codeOnly(src.slice(j + 2, k - 1)) + " ";
          j = k - 1;
        }
        j++;
      }
      out += "\"\"";
      i = j + 1;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

const GLOBAL_RE = new RegExp(String.raw`(^|[^\w$.])(?:globalThis\.)?(${FOUNDRY_GLOBALS.join("|")})\s*(?:\?\.|[.(\[])`, "g");

/** The Foundry globals one file's code names, as "name (line n)". */
export function foundryUses(src) {
  const code = codeOnly(src), hits = [];
  // a name declared in the file (a parameter or a const called game) is the file's own, not Foundry's
  const own = new Set([...code.matchAll(/(?:\b(?:const|let|var|function|class)\s+|[(,]\s*)([A-Za-z_$][\w$]*)\s*(?=[=,)]|\s*=>|\s*\()/g)].map(m => m[1]));
  for ( const m of code.matchAll(GLOBAL_RE) ) if ( !own.has(m[2]) ) hits.push(m[2]);
  return [...new Set(hits)];
}

/** The relative files a file imports (static, dynamic and re-exports), as absolute paths. */
export function importsOf(file, src = fs.readFileSync(file, "utf8")) {
  const out = new Set();
  const re = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["']([^"'`]+)["']/g;
  for ( const m of src.matchAll(re) ) if ( m[1].startsWith(".") ) out.add(path.resolve(path.dirname(file), m[1].split("?")[0]));
  return [...out];
}

/** Every file a set of files reaches through imports, the files themselves included. */
export function closure(files) {
  const seen = new Set(), queue = [...files];
  while ( queue.length ) {
    const f = queue.pop();
    if ( seen.has(f) || !fs.existsSync(f) || !/\.m?js$/.test(f) ) continue;
    seen.add(f);
    queue.push(...importsOf(f));
  }
  return seen;
}

/** The files in the package. */
export const packageFiles = (root = ROOT) => {
  const d = path.join(root, PKG);
  return fs.existsSync(d) ? walk(d) : [];
};

/** The rules files still in their modules (not yet in the package). */
export const rulesOutside = (root = ROOT) => walk(path.join(root, "modules"))
  .filter(f => isRulesFile(rel(f)) && !rel(f).startsWith(`${PKG}/`));

export const loadBaseline = () => JSON.parse(fs.readFileSync(BASELINE, "utf8"));

/** What the checks find: Foundry uses in the package's reach and the rules files' reach, imports that leave the
 *  package, and rules files outside it. */
export function report(root = ROOT) {
  const pkg = packageFiles(root), outside = rulesOutside(root);
  const reach = closure([...pkg, ...outside]);
  const foundry = [];
  for ( const f of [...reach].sort() ) {
    const uses = foundryUses(fs.readFileSync(f, "utf8"));
    if ( uses.length ) foundry.push(`${rel(f)}: ${uses.join(", ")}`);
  }
  const leaves = new Set();
  for ( const f of pkg ) for ( const t of importsOf(f) ) if ( !rel(t).startsWith(`${PKG}/`) ) leaves.add(rel(t));
  return {foundry, leaves: [...leaves].sort(), outside: outside.map(rel).sort(), packageCount: pkg.length};
}

if ( process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ) {
  const r = report();
  console.log(`Package files: ${r.packageCount}. Rules files not moved yet: ${r.outside.length}.`);
  console.log(`Foundry named in the rules' reach (${r.foundry.length}):`, r.foundry);
  console.log(`Package imports from outside it (${r.leaves.length}):`, r.leaves);
}
