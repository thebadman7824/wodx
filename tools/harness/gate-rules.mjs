#!/usr/bin/env node
/**
 * The gate rules, checked on the source of every gate (B3731). See tools/gate/kit.mjs and docs/WORKFLOW.md.
 *   position    a document a gate made is picked by its place in a list (made[0], createDocuments(...)[1],
 *               game.actors.contents[0]): find it by name or flag (kit inOrder, named, byFlag)
 *   laneScene   the gate uses the canvas or the viewed scene but makes no scene of its own (kit G.scene())
 *   laneDoc     the gate looks up a scene, actor or journal by a name it never makes, so it leans on the lane
 *               (bring it as a fixture, tools/gate/fixtures, or make it)
 *   version     the gate checks for one exact version number instead of what the feature does
 * Gates written before the rules are listed in gate-rules-baseline.json; the list may only shrink.
 *   node tools/harness/gate-rules.mjs              the violations, gate by gate
 *   node tools/harness/gate-rules.mjs --baseline   rewrite the baseline from the gates as they are now
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const GATES = path.resolve(HERE, "../gate");
export const BASELINE = path.join(HERE, "gate-rules-baseline.json");

const strip = src => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

export const RULES = {
  position(src) {
    const hits = [];
    const vars = new Set();
    // A list put in order by name (inOrder, the kit's make) may be picked by place: that is the order asked for.
    for ( const m of src.matchAll(/(\w+)\s*=\s*((?:await\s+)?[^;\n=]*?)create(?:Embedded)?Documents\(/g) ) if ( !/inOrder\(|\.make\(/.test(m[2]) ) vars.add(m[1]);
    vars.delete("const"); vars.delete("let");
    for ( const v of vars ) for ( const m of src.matchAll(new RegExp(String.raw`\b${v}\[\d+\]`, "g")) ) hits.push(m[0]);
    // [0] of a create of one document is that document.
    for ( const m of src.matchAll(/create(?:Embedded)?Documents\([^;]*?\)\s*\)?\s*\[(\d+)\]/g) ) if ( m[1] !== "0" || /\}\s*,\s*\{/.test(m[0]) ) hits.push("createDocuments(...)[n]");
    for ( const m of src.matchAll(/game\.(?:actors|scenes|items|journal|tables|macros|folders|messages|combats)\.(?:contents\[\d+\]|contents\.at\(|values\(\)\.next\(\))/g) ) hits.push(m[0]);
    return hits;
  },
  laneScene(src) {
    const uses = /\bcanvas\??\.(?:scene|tokens|walls|tiles|lighting|grid|dimensions)\b|game\??\.scenes\??\.(?:active|viewed|current)\b/.test(src);
    // A scene of its own: the kit's, or one it makes and views itself.
    const own = /\bkitRun\(|\bG\.(?:scene|fixtureScene)\(|\.fixtureScene\(|\bkit\.scene\(/.test(src)
      || (/Scene\.create(?:Documents)?\(|Scene\.implementation\.create\(/.test(src) && /\.(?:view|activate)\(\)/.test(src));
    return uses && !own ? ["canvas or viewed scene without a scene of its own"] : [];
  },
  laneDoc(src) {
    const hits = [];
    for ( const m of src.matchAll(/game\.(scenes|actors|journal)\.getName\(\s*(["'`])([^"'`$]+)\2/g) ) {
      if ( /\bgate\b/i.test(m[3]) ) continue; // names a gate makes carry "gate" (the module may make the document)
      const n = m[3].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const made = new RegExp(String.raw`name\s*:\s*["'\`]${n}["'\`]|["'\`]${n}["'\`]\s*[,;)]`, "g");
      if ( [...src.matchAll(made)].length < 2 && !new RegExp(String.raw`name\s*:\s*["'\`]${n}["'\`]`).test(src) ) hits.push(`${m[1]}.getName("${m[3]}")`);
    }
    return hits;
  },
  version(src) {
    return [...src.matchAll(/\.version\s*===?\s*["'`]\d+\.\d+\.\d+["'`]|["'`]\d+\.\d+\.\d+["'`]\s*===?\s*[\w.?]*\.version\b/g)].map(m => m[0]);
  }
};

export function gateFiles(dir = GATES) {
  const extra = path.resolve(dir, "../lanes/gate-map-extra.json");
  const not = new Set(fs.existsSync(extra) ? JSON.parse(fs.readFileSync(extra, "utf8")).notGates ?? [] : []);
  return fs.readdirSync(dir).filter(f => /^gate[\w-]*\.mjs$/.test(f) && !not.has(f.replace(/\.mjs$/, ""))).filter(f => /export\s+(?:(?:async\s+)?function\s+run\b|const\s+run\s*=)/.test(fs.readFileSync(path.join(dir, f), "utf8"))).sort();
}

/** {gate: {rule: [hits]}} for every gate that breaks a rule. */
export function check(dir = GATES) {
  const out = {};
  for ( const f of gateFiles(dir) ) {
    const src = strip(fs.readFileSync(path.join(dir, f), "utf8"));
    for ( const [rule, fn] of Object.entries(RULES) ) {
      const hits = fn(src);
      if ( hits.length ) (out[f.replace(/\.mjs$/, "")] ??= {})[rule] = hits;
    }
  }
  return out;
}

/** The baseline as {gate: [rules]}. */
export const loadBaseline = () => fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, "utf8")).gates : {};

export function compare(found, base) {
  const fresh = [], cleared = [];
  for ( const [g, rules] of Object.entries(found) ) for ( const r of Object.keys(rules) ) if ( !base[g]?.includes(r) ) fresh.push(`${g}: ${r} (${rules[r].slice(0, 3).join("; ")})`);
  for ( const [g, rules] of Object.entries(base) ) for ( const r of rules ) if ( !found[g]?.[r] ) cleared.push(`${g}: ${r}`);
  return {fresh, cleared};
}

function main() {
  const found = check();
  if ( process.argv.includes("--baseline") ) {
    const gates = Object.fromEntries(Object.entries(found).map(([g, r]) => [g, Object.keys(r).sort()]));
    fs.writeFileSync(BASELINE, JSON.stringify({about: "Gates written before the gate rules (B3731) that still break one. The list may only shrink: move a gate to tools/gate/kit.mjs, then run node tools/harness/gate-rules.mjs --baseline.", gates}, null, 1) + "\n");
    console.log(`Baseline: ${Object.keys(gates).length} gates.`);
    return;
  }
  for ( const [g, rules] of Object.entries(found) ) console.log(`${g.padEnd(22)} ${Object.entries(rules).map(([r, h]) => `${r}: ${h.slice(0, 2).join("; ")}`).join(" | ")}`);
  const {fresh, cleared} = compare(found, loadBaseline());
  console.log(`${Object.keys(found).length} of ${gateFiles().length} gates break a rule; ${fresh.length} new, ${cleared.length} cleared since the baseline.`);
}

if ( process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ) main();
