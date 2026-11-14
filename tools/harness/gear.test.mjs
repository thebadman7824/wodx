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

// WoDX Library 0.21.0 (B3070 to B3073): gear by region.
const W = await import(join(root, "modules/wodx-library/data/gear-ways.mjs"));
const names = (era, where) => new Set(G.forEra(data.items, era, where).map(i => i.name));
test("gear by region: the Americas before the settlers carry no steel, crossbow or plate", () => {
  const mex = names("dark-ages", {year: 1400, way: "mesoamerican", region: "mexico"});
  for ( const n of ["Macuahuitl", "Tepoztopilli", "Atlatl dart", "Ichcahuipilli", "Spear", "Club", "Shortbow", "Sling"] ) assert.ok(mex.has(n), n);
  for ( const n of ["Broadsword", "Crossbow", "Longbow", "Lance", "Class Four", "Halberd", "Katana", "Jian"] ) assert.ok(!mex.has(n), n);
  const fr = names("dark-ages", {year: 1300, way: "latin", region: "france"});
  for ( const n of ["Broadsword", "Crossbow", "Lance", "Class Five"] ) assert.ok(fr.has(n), n);
  for ( const n of ["Macuahuitl", "Katana", "Scimitar", "Assegai"] ) assert.ok(!fr.has(n), n);
});

test("gear by region: the swords of Asia and Africa at home, guns by the year each land took them up", () => {
  const jp = y => names("renaissance", {year: y, way: "japanese", region: "japan"});
  assert.ok(jp(1600).has("Katana") && jp(1600).has("Naginata") && jp(1600).has("Yumi"));
  assert.ok(!jp(1520).has("Arquebus") && jp(1550).has("Arquebus"), "the arquebus reaches Japan in 1543");
  assert.ok(!jp(1600).has("Rapier") && !jp(1600).has("Full Plate"));
  assert.ok(names("dark-ages", {year: 1300, way: "sinic", region: "china"}).has("Jian"));
  assert.ok(names("dark-ages", {year: 1300, way: "islamic", region: "egypt"}).has("Scimitar"));
  assert.ok(names("dark-ages", {year: 1300, way: "islamic", region: "egypt"}).has("Kilij"));
  assert.ok(names("dark-ages", {year: 1300, way: "bantu", region: "southern-africa"}).has("Assegai"));
  assert.ok(names("dark-ages", {year: 1300, way: "polynesian", region: "pacific-islands"}).has("Patu"));
  assert.ok(names("modern", {year: 2000, way: "japanese", region: "japan"}).has("Katana"));
  assert.ok(!names("modern", {year: 2000, way: "latin", region: "france"}).has("Katana"));
  const all = names("dark-ages");
  assert.ok(all.has("Katana") && all.has("Broadsword"), "with no place given, every land's gear");
});

test("gear by region: each weapon of another land fights as a book weapon and keeps its page", () => {
  const local = data.items.filter(i => i.flags["wodx-library"].local);
  assert.ok(local.length >= 50);
  for ( const i of local ) {
    const f = i.flags["wodx-library"], base = data.items.find(b => !b.flags["wodx-library"].local && b.flags["wodx-library"].source === f.source && b.name === f.like);
    assert.ok(base, `${i.name} fights as ${f.like}`);
    assert.deepEqual(i.system.damage ?? null, base.system.damage ?? null, i.name);
    assert.equal(i.system.difficulty, base.system.difficulty, i.name);
    assert.match(i.system.reference, /house rule/, i.name);
    assert.ok(!/—/.test(JSON.stringify(i)) && !/\b(he|she|him|her|his|hers)\b/i.test(i.system.description), i.name);
  }
  const keys = local.map(i => `${i.flags["wodx-library"].source}|${i.name}`);
  assert.equal(new Set(keys).size, keys.length, "one local piece per name and book");
  for ( const [name, , like] of W.LOCAL_GEAR ) for ( const src of Object.keys(like) ) assert.ok(G.SOURCES[src], `${name}: ${src}`);
});

test("gear by region: every region and way of life named is one WoDX Chronicle knows", async () => {
  const Wr = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
  const known = new Set([...Object.keys(Wr.WORLD_REGIONS), ...Object.keys(Wr.SPHERES), "*"]);
  const keysOf = w => Object.keys(w ?? {});
  for ( const [n, w] of Object.entries(W.GEAR_WAYS) ) for ( const k of keysOf(w) ) assert.ok(known.has(k), `${n}: ${k}`);
  for ( const [n, w] of W.LOCAL_GEAR ) for ( const k of keysOf(w) ) assert.ok(known.has(k), `${n}: ${k}`);
  for ( const n of Object.keys(W.GEAR_WAYS) ) assert.ok(data.items.some(i => i.name === n), `rule for a gear name that exists: ${n}`);
});
