import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* WoDX Sheets 0.6: every sheet has a second page, as the printed sheets do */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SR = await import(join(root, "modules/wodx-sheets/scripts/sheet-rules.mjs"));
const main = readFileSync(join(root, "modules/wodx-sheets/scripts/main.mjs"), "utf8");
const block = readFileSync(join(root, "modules/wodx-sheets/templates/block.hbs"), "utf8");

test("every sheet has a second page", () => {
  for ( const [id, s] of Object.entries(SR.SHEETS) ) assert.ok(s.page2.flat().length > 0, id);
});

test("combat, possessions and history on every page two but the Fae's Dreaming tab and the Wraith's Shadow", () => {
  for ( const [id, s] of Object.entries(SR.SHEETS) ) {
    if ( id === "faeDA" || id === "wr20" ) continue;
    for ( const b of ["combat", "gear", "description"] ) assert.ok(s.page2.flat().includes(b), `${id}: ${b}`);
  }
  for ( const id of ["w20", "werewolfDA"] ) assert.ok(SR.SHEETS[id].page2.flat().includes("fetishes"), id);
  for ( const id of ["m20", "mageDA"] ) assert.ok(SR.SHEETS[id].page2.flat().includes("rotes"), id);
  for ( const id of ["v20", "kindredDA"] ) for ( const b of ["rituals", "paths"] ) assert.ok(SR.SHEETS[id].page2.flat().includes(b), `${id}: ${b}`);
});

test("no block is drawn twice on one sheet, and main.mjs builds every one", () => {
  const cases = new Set([...main.matchAll(/case "([a-zA-Z0-9]+)"/g)].map(m => m[1]));
  for ( const [id, s] of Object.entries(SR.SHEETS) ) {
    const b = SR.blocksOf(s);
    assert.deepEqual(b.filter((x, i) => b.indexOf(x) !== i), [], id);
    for ( const k of b ) assert.ok(cases.has(k), `${id}: ${k}`);
  }
});

test("the Combat box reads weapons and armor; items blocks show a note", () => {
  assert.match(main, /i\.type === "Melee Weapon" \|\| i\.type === "Ranged Weapon"/);
  assert.match(main, /i\.type === "Armor"/);
  assert.match(main, /function weaponLine/); assert.match(main, /function armorLine/);
  const items = block.slice(block.indexOf('(eq kind "items")'), block.indexOf('(eq kind "list")'));
  assert.match(items, /\{\{#if note\}\}/);
});
