/* The rules core guard (B8060-B8061, docs/RULES-CORE.md): the rules package modules/wodx-rules stays free of Foundry,
 * and so does every rules file still waiting to move into it. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {ROOT, PKG, FOUNDRY_GLOBALS, report, loadBaseline, packageFiles, foundryUses, codeOnly, isRulesFile} from "./rules-core.mjs";

const base = loadBaseline();
const r = report();

test("the guard's own reading: comments and strings never count, a name the file declares is its own", () => {
  assert.deepEqual(foundryUses(`// game.settings.get\nconst s = "game.user"; /* ui.notifications */`), []);
  assert.deepEqual(foundryUses("const x = game.settings.get('a', 'b');"), ["game"]);
  assert.deepEqual(foundryUses("const id = globalThis.foundry?.utils?.randomID?.();"), ["foundry"]);
  assert.deepEqual(foundryUses("const a = row.ui.label; const b = state.game.round;"), []);
  assert.deepEqual(foundryUses("export function score(game) { return game.points; }"), []);
  assert.deepEqual(foundryUses("const t = `${game.time.worldTime}s`;"), ["game"]);
  assert.equal(codeOnly("a('x // y') + b").includes("//"), false);
  assert.equal(isRulesFile("modules/wodx-npc/scripts/feud-rules.mjs"), true);
  assert.equal(isRulesFile("modules/wodx-rules/actions/rules.js"), true);
  assert.equal(isRulesFile("modules/wodx-npc/scripts/rulesheet.mjs"), false);
});

test("nothing in the rules' reach names a Foundry global (only the known ones, which may only go)", () => {
  const known = new Set(base.foundryKnown);
  const bad = r.foundry.filter(line => !known.has(line.split(":")[0]));
  assert.deepEqual(bad, [], `Rules code must not call Foundry (${PKG}, docs/RULES-CORE.md). Pass what the rule needs in as an argument, and let the module's Foundry code read it.`);
  const reached = new Set(r.foundry.map(line => line.split(":")[0]));
  const fixed = base.foundryKnown.filter(f => !reached.has(f));
  assert.deepEqual(fixed, [], "These no longer name Foundry: take them off foundryKnown in tools/harness/rules-core-baseline.json.");
});

test("the package imports nothing outside itself but the listed files, and that list only shrinks", () => {
  const allowed = new Set(base.outside);
  assert.deepEqual(r.leaves.filter(f => !allowed.has(f)), [],
    "A rules package file imports a file outside the package. Move that file into modules/wodx-rules, or, while a move is in progress, list it under outside in tools/harness/rules-core-baseline.json.");
  const unused = base.outside.filter(f => !r.leaves.includes(f));
  assert.deepEqual(unused, [], "No package file imports these any more: take them off outside in tools/harness/rules-core-baseline.json.");
});

test("every rules file lives in the package, apart from the ones not moved yet", () => {
  const listed = new Set([...base.notMoved, ...base.stay]);
  assert.deepEqual(r.outside.filter(f => !listed.has(f)), [],
    `New rules files go in ${PKG}/<module>/ (docs/RULES-CORE.md), not in the module's own scripts folder.`);
  assert.deepEqual([...listed].filter(f => f.startsWith(`${PKG}/`)), [], "Files in the package are not waiting to move: take them off the baseline lists.");
  const gone = [...listed].filter(f => !fs.existsSync(path.join(ROOT, f)));
  assert.deepEqual(gone, [], "These files moved or went: take them off notMoved or stay in tools/harness/rules-core-baseline.json.");
});

test("every package file loads in plain Node with Foundry's globals set to fail on any touch", async () => {
  const touched = [];
  const saved = {};
  for ( const g of FOUNDRY_GLOBALS ) {
    saved[g] = Object.getOwnPropertyDescriptor(globalThis, g);
    Object.defineProperty(globalThis, g, {configurable: true, get() { touched.push(g); throw new Error(`Foundry global ${g} touched while loading the rules core`); }});
  }
  const failed = [];
  try {
    for ( const f of packageFiles() ) {
      try { await import(pathToFileURL(f).href); }
      catch(err) { failed.push(`${path.relative(ROOT, f)}: ${err.message}`); }
    }
  } finally {
    for ( const g of FOUNDRY_GLOBALS ) {
      if ( saved[g] ) Object.defineProperty(globalThis, g, saved[g]);
      else delete globalThis[g];
    }
  }
  assert.deepEqual(failed, []);
  assert.deepEqual([...new Set(touched)], []);
  assert.ok(r.packageCount >= 3);
});

test("the module folder is a library: nothing runs when Foundry loads it", () => {
  const m = JSON.parse(fs.readFileSync(path.join(ROOT, PKG, "module.json"), "utf8"));
  assert.equal(m.id, "wodx-rules");
  assert.deepEqual(m.esmodules ?? [], []);
  assert.deepEqual(m.scripts ?? [], []);
});

test("B8068: Chronicle's old copies are gone, its calendar keeps only the Foundry half, and nothing imports the old paths", async () => {
  for ( const f of ["terms", "calendar-math"] ) assert.equal(fs.existsSync(path.join(ROOT, "modules/wodx-chronicle/scripts", `${f}.mjs`)), false, f);
  const src = fs.readFileSync(path.join(ROOT, "modules/wodx-chronicle/scripts/calendar.mjs"), "utf8");
  assert.doesNotMatch(src, /export\s*\*/);
  assert.match(src, /export function makeCalendarClass/);
  assert.match(src, /export function makeCalendarConfig/);
  const walk = d => fs.readdirSync(d, {withFileTypes: true}).flatMap(e => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? (["node_modules", ".git"].includes(e.name) ? [] : walk(p)) : /\.m?js$/.test(e.name) ? [p] : [];
  });
  const old = [];
  for ( const f of [...walk(path.join(ROOT, "modules")), ...walk(path.join(ROOT, "tools"))] ) {
    const s = codeOnly(fs.readFileSync(f, "utf8"));
    if ( /wodx-chronicle\/scripts\/(terms|calendar-math)\.mjs/.test(fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")) ) old.push(path.relative(ROOT, f));
    // a pure name taken from Chronicle's calendar must come from the core
    if ( /from\s*["'][^"']*wodx-chronicle\/scripts\/calendar\.mjs["']/.test(fs.readFileSync(f, "utf8")) && !/makeCalendar(Class|Config)/.test(s) ) old.push(path.relative(ROOT, f));
  }
  assert.deepEqual(old, [], "Import terms and the calendar from modules/wodx-rules/core (B8068).");
});
