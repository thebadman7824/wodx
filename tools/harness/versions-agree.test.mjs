/* One version check for every WoDX module, in place of exact pins scattered through the tests and gates.
 * A module's version must agree in three places: module.json, the version string its api reports (any
 * `const VERSION = "x.y.z"` or `version: "x.y.z"` in its scripts), and the newest entry at the top of its CHANGELOG.md.
 * Tests that need a feature check for the feature; gates that need a release use an at-least comparison.
 * Stale design desk 2026-11-12b-d1. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MODS = path.join(ROOT, "modules");
const modules = fs.readdirSync(MODS).filter(d => fs.existsSync(path.join(MODS, d, "module.json")));
const SEMVER = String.raw`\d+\.\d+\.\d+`;

function scripts(dir) {
  const out = [];
  if ( !fs.existsSync(dir) ) return out;
  for ( const e of fs.readdirSync(dir, {withFileTypes: true}) ) {
    const p = path.join(dir, e.name);
    if ( e.isDirectory() ) out.push(...scripts(p));
    else if ( /\.(m?js)$/.test(e.name) ) out.push(p);
  }
  return out;
}

/** Every module-version string a module's scripts carry: `const VERSION = "x.y.z"` and `version: "x.y.z"`. */
function apiVersions(mod) {
  const found = [];
  const re = new RegExp(String.raw`(?:\bconst VERSION\s*=\s*|\bversion:\s*)"(${SEMVER})"`, "g");
  for ( const f of scripts(path.join(MODS, mod, "scripts")) ) {
    const s = fs.readFileSync(f, "utf8");
    for ( const m of s.matchAll(re) ) found.push({file: path.relative(ROOT, f), v: m[1]});
  }
  return found;
}

/** The newest release in a changelog: the first list entry that starts with a version. */
function changelogTop(mod) {
  const s = fs.readFileSync(path.join(MODS, mod, "CHANGELOG.md"), "utf8");
  return new RegExp(String.raw`^[-*] (${SEMVER})\b`, "m").exec(s)?.[1] ?? null;
}

test("each module's version agrees in module.json, its api and the top of its changelog", () => {
  for ( const mod of modules ) {
    const v = JSON.parse(fs.readFileSync(path.join(MODS, mod, "module.json"), "utf8")).version;
    assert.match(v, new RegExp(`^${SEMVER}$`), `${mod}: module.json version ${v} is not x.y.z`);
    assert.equal(changelogTop(mod), v, `${mod}: CHANGELOG.md starts at ${changelogTop(mod)}, module.json says ${v}; add the new release at the top`);
    for ( const {file, v: a} of apiVersions(mod) ) assert.equal(a, v, `${file} says ${a}, module.json says ${v}`);
  }
});

test("every module with an api version is found by the check", () => {
  // Modules whose api reports its version; if one stops matching, the agreement check above would go quiet for it
  for ( const mod of ["wodx-actions", "wodx-combat", "wodx-npc", "wodx-sheets", "wodx-storyteller", "wodx-library", "wodx-paperdoll",
    "wodx-senses", "wodx-atmosphere", "wodx-interactables", "wodx-targeting"] ) {
    assert.ok(apiVersions(mod).length > 0, `${mod}: no api version string found`);
  }
});

test("no harness test or gate pins an exact module version", () => {
  const pins = [];
  const here = path.join(ROOT, "tools/harness");
  for ( const f of fs.readdirSync(here).filter(f => f.endsWith(".test.mjs") && f !== "versions-agree.test.mjs") ) {
    const s = fs.readFileSync(path.join(here, f), "utf8");
    for ( const m of s.matchAll(new RegExp(String.raw`assert\.(?:equal|strictEqual)\([^;\n]*\.version,\s*"${SEMVER}"\)`, "g")) ) pins.push(`${f}: ${m[0]}`);
    for ( const m of s.matchAll(/assert\.match\([^;\n]*(?:VERSION = |version: )\\?"\d+\\\.\d+\\\.\d+/g) ) pins.push(`${f}: ${m[0]}`);
  }
  const gates = path.join(ROOT, "tools/gate");
  for ( const f of fs.readdirSync(gates).filter(f => f.endsWith(".mjs")) ) {
    const s = fs.readFileSync(path.join(gates, f), "utf8");
    for ( const m of s.matchAll(new RegExp(String.raw`(?:version|\))\s*===\s*"${SEMVER}[^"]*"`, "g")) ) pins.push(`${f}: ${m[0]}`);
  }
  assert.deepEqual(pins, [], "check for the feature, or use an at-least comparison, instead of pinning a version");
});
