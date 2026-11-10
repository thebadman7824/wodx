import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/*
 * The rules-clash table (Phase 10, part 1): every row is whole and settled, the doc matches the data, and the
 * Dark Ages fae soak that the table fixed works in the combat rules.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const {default: T} = await import(pathToFileURL(join(root, "modules/wodx-chronicle/data/rules-clashes.mjs")).href);
const {render} = await import(pathToFileURL(join(root, "tools/clashes/render.mjs")).href);
const R = await import(pathToFileURL(join(root, "modules/wodx-combat/scripts/rules.js")).href);
const decisions = readFileSync(join(root, "docs/DECISIONS.md"), "utf8");

test("every clash row is whole, with a known basis and status", () => {
  const ids = new Set();
  for (const r of T.rows) {
    assert.ok(r.id && !ids.has(r.id), `unique id ${r.id}`); ids.add(r.id);
    for (const k of ["topic", "books", "settled", "code"]) assert.ok(String(r[k] ?? "").trim(), `${r.id}.${k}`);
    assert.ok(Array.isArray(r.lines) && r.lines.length, `${r.id}.lines`);
    assert.ok(["v20", "era", "line", "house"].includes(r.basis), `${r.id}.basis`);
    assert.ok(["settled", "fixed", "check"].includes(r.status), `${r.id}.status`);
    if (r.status === "check") assert.ok(String(r.check ?? "").trim(), `${r.id} needs its page question`);
    else assert.ok(r.refs.length, `${r.id} needs a ref`);
    if (r.basis === "house") assert.ok(r.refs.some(x => /^B\d+$/.test(x)), `${r.id}: a house rule names its decision`);
  }
});

test("every decision a row names is in DECISIONS", () => {
  for (const r of T.rows) for (const ref of r.refs.filter(x => /^B\d+$/.test(x)))
    assert.ok(new RegExp(`(\\| ${ref} \\||## ${ref}\\.)`).test(decisions), `${r.id}: ${ref} missing from DECISIONS`);
});

test("nothing in the table comes from 5th edition", () => {
  const text = JSON.stringify(T);
  assert.doesNotMatch(text, /\bV5\b|5th edition rules|Vampire: The Masquerade 5/);
});

test("docs/RULES-CLASHES.md matches the data", async () => {
  assert.equal(readFileSync(join(root, "docs/RULES-CLASHES.md"), "utf8"), await render());
});

test("Dark Ages fae: Stamina soaks lethal in the mien and cold iron is soakable (DA:Fae pp. 88, 104)", () => {
  assert.equal(R.soakPool({profile: "fae", damageType: "lethal", stamina: 3}).dice, 0);
  assert.equal(R.soakPool({profile: "fae", damageType: "lethal", stamina: 3, lethalSoak: true}).dice, 3);
  assert.equal(R.soakPool({profile: "fae", damageType: "aggravated", stamina: 3, lethalSoak: true}).dice, 0);
  // C20: cold iron leaves no natural soak
  assert.equal(R.soakPool({profile: "fae", damageType: "aggravated", stamina: 3, armor: 1, bane: true}).dice, 1);
  // DA:Fae: cold iron is soaked with Stamina, in or out of the mien
  assert.equal(R.soakPool({profile: "fae", damageType: "aggravated", stamina: 3, armor: 1, bane: true, baneSoak: true}).dice, 4);
  // mortals are untouched
  assert.equal(R.soakPool({profile: "mortal", damageType: "lethal", stamina: 3}).dice, 0);
  assert.equal(R.soakPool({profile: "mortal", damageType: "bashing", stamina: 3}).dice, 3);
});

test("demons and mummies soak by their own books (DtF pp. 171, 247; MtR p. 136)", () => {
  assert.equal(R.soakPool({profile: "demon", damageType: "bashing", stamina: 3}).dice, 3);
  assert.equal(R.soakPool({profile: "demon", damageType: "lethal", stamina: 3}).dice, 0);
  assert.equal(R.soakPool({profile: "demon", damageType: "lethal", stamina: 3, formOn: true}).dice, 3);
  assert.equal(R.soakPool({profile: "demon", damageType: "aggravated", stamina: 3, formOn: true, armor: 1}).dice, 1);
  assert.equal(R.soakPool({profile: "mummy", damageType: "lethal", stamina: 3}).dice, 3);
  assert.equal(R.soakPool({profile: "mummy", damageType: "aggravated", stamina: 3}).dice, 0);
});

test("WoDX Actions soaks with the one Combat copy: a Garou falling soaks lethal", async () => {
  const A = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/core-rules.js")).href);
  assert.equal(A.soakPool, R.soakPool);
  assert.equal(A.soakPool({profile: "lupine", damageType: "lethal", stamina: 4}).dice, 4);
});

test("the profiles give demons and mummies their own soak in both copies", async () => {
  for (const m of ["wodx-combat", "wodx-actions"]) {
    const P = await import(pathToFileURL(join(root, `modules/${m}/scripts/profiles.js`)).href);
    assert.equal(P.PROFILES.demon.soak, "demon"); assert.equal(P.PROFILES.mummy.soak, "mummy");
  }
});
