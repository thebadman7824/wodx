import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Fill a container by place and era (Interactables 0.17.0) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const F = await imp("modules/wodx-interactables/scripts/fill-rules.mjs");
const gear = JSON.parse(src("modules/wodx-library/data/gear.json")).items;
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

test("fill: siege guns, ship armour and parries are never drawn", () => {
  for ( const it of gear ) {
    const k = String(it.flags["wodx-library"].kind ?? "");
    if ( /heavy|ship|crew-served|parry/.test(k) ) assert.equal(F.categoryOf(it), null, it.name);
  }
});

test("fill: a draw keeps to the era and the place", () => {
  const got = F.draw(gear, {era: "dark-ages", place: "armory", container: "chest", count: 6, rng: seq(0.1, 0.5, 0.9, 0.3)});
  assert.equal(got.length, 6);
  assert.equal(new Set(got.map(g => g.name)).size, 6);
  for ( const g of got ) assert.ok(g.flags["wodx-library"].eras.includes("dark-ages"), g.name);
  const church = F.draw(gear, {era: "dark-ages", place: "church", count: 12});
  for ( const g of church ) assert.equal(F.categoryOf(g), "melee");
  const clinic = F.draw(gear, {era: "dark-ages", place: "clinic", count: 4});
  for ( const g of clinic ) assert.notEqual(F.categoryOf(g), "cyber");
});

test("fill: a small container takes only small things", () => {
  const got = F.draw(gear, {era: "modern", place: "armory", container: "safe", count: 12});
  assert.ok(got.length > 0);
  for ( const g of got ) assert.ok(F.fits(g, "safe"), g.name);
  for ( const g of got ) assert.ok(!["armor", "shield"].includes(F.categoryOf(g)));
});

test("fill: kept links join the list once", () => {
  assert.equal(F.mergeLines("A\nB", ["B", "C"]), "A\nB\nC");
  assert.equal(F.mergeLines("", ["X"]), "X");
});

test("fill: the button, the review and the wiring", () => {
  const s = src("modules/wodx-interactables/scripts/fill.mjs");
  assert.match(s, /if \( !game\.user\.isGM \) return null;/);
  assert.match(s, /Draw again/);
  assert.match(s, /data-fixed/);
  const m = src("modules/wodx-interactables/scripts/main.mjs");
  assert.match(m, /data-wix-fill/);
  assert.match(m, /fill: \{open: Fill\.fillDialog/);
});
