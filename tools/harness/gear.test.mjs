import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* WoDX Library 0.1.0: gear by era, from the book tables */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const G = await import(join(root, "modules/wodx-library/scripts/gear-rules.mjs"));
const {build} = await import(join(root, "tools/library/build-gear.mjs"));
const data = JSON.parse(readFileSync(join(root, "modules/wodx-library/data/gear.json"), "utf8"));
const by = n => data.items.find(i => i.name === n);
const combat = readFileSync(join(root, "modules/wodx-combat/scripts/main.js"), "utf8");

test("the committed data is what the book tables build", () => {
  assert.deepEqual(build(), data.items);
  assert.ok(data.items.length > 300);
});

test("damage, difficulty and type read as the charts give them", () => {
  assert.deepEqual(G.parseDamage("Str+2 (L)", "Sword"), {attribute: "strength", bonus: 2, type: "lethal"});
  assert.deepEqual(G.parseDamage("Str+3B", "Mace"), {attribute: "strength", bonus: 3, type: "bashing"});
  assert.deepEqual(G.parseDamage("Str+1", "Club"), {attribute: "strength", bonus: 1, type: "bashing"});
  assert.deepEqual(G.parseDamage("4L", "Longbow"), {attribute: "", bonus: 4, type: "lethal"});
  assert.deepEqual(G.parseDamage("8 (16)", "Coach Gun"), {attribute: "", bonus: 8, type: "lethal"});
  assert.equal(G.parseDifficulty("+1"), 7); assert.equal(G.parseDifficulty("—"), 6); assert.equal(G.parseDifficulty("6 (7)"), 6);
});

test("weapons from bow to smartgun, each with its book and page", () => {
  const s = by("Sword"), p = by("Pistol, Hvy."), lb = data.items.find(i => i.name === "Longbow" && i.flags["wodx-library"].source === "v20-dark-ages");
  assert.equal(s.type, "Melee Weapon"); assert.equal(s.system.damage.bonus, 2); assert.equal(s.system.damage.type, "lethal");
  assert.equal(p.type, "Ranged Weapon"); assert.equal(p.system.damage.bonus, 5); assert.equal(p.system.range, 25); assert.equal(p.system.clip.max, 14);
  assert.equal(lb.system.damage.bonus, 4); assert.equal(lb.system.range, 120);
  assert.ok(by("Smartgun Link")); assert.match(by("Smartgun Link").system.description, /−2 TN/);
  for ( const i of data.items ) assert.ok(i.flags["wodx-library"].page && i.system.reference, i.name);
  assert.ok(!data.items.some(i => /—/.test(JSON.stringify(i))), "no long dashes in the data");
});

test("each era gets its own books' gear", () => {
  const names = era => new Set(G.forEra(data.items, era).map(i => i.name));
  assert.ok(names("dark-ages").has("Battle-Ax") && !names("dark-ages").has("Pistol, Hvy.") && !names("dark-ages").has("Arquebus"));
  assert.ok(names("renaissance").has("Arquebus") && names("renaissance").has("Rapier"));
  assert.ok(names("wild-west").has("Winchester 1873, lever action .44") || [...names("wild-west")].some(n => /Winchester 1873/.test(n)));
  assert.ok(!names("wild-west").has("Assault Rifle") && names("modern").has("Assault Rifle"));
  assert.ok(names("future-darkness").has("Subdermal Armor") && !names("modern").has("Subdermal Armor"));
  for ( const era of G.ERA_ORDER ) assert.ok(G.forEra(data.items, era).length > 10, era);
});

test("cyberware soak: implants are worn armor that Combat always counts", () => {
  const sub = by("Subdermal Armor"), sk = by("Skinweave"), plate = by("Body plating");
  assert.equal(sub.type, "Armor"); assert.equal(sub.system.soak.lethal, 4); assert.ok(sub.flags["wodx-library"].implant); assert.equal(sub.system.isequipped, true);
  assert.equal(sk.system.soak.bashing, 3); assert.equal(plate.system.soak.lethal, 8);
  assert.equal(by("Sport Heart").type, "Item", "a heart that lowers soak is not armor");
  assert.equal(by("Cyberarm").type, "Item", "a cyberarm's soak is its own, not the body's");
  assert.equal(sub.flags["wodx-library"].surgery, "CR"); assert.equal(sub.flags["wodx-library"].humanity, "2D6");
  assert.match(combat, /i\.flags\?\.\["wodx-library"\]\?\.implant/);
});
