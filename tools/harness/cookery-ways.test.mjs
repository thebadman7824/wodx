import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Crafting and cookery by region (B3100-B3102) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const G = await imp("modules/wodx-library/data/goods.mjs");
const R = await imp("modules/wodx-library/scripts/recipe-rules.mjs");
const good = n => G.GOODS.find(g => g.name === n);
const MEX = {way: "mesoamerican", region: "mexico"}, MOR = {way: "latin", region: "moravia"};
const ZULU = {way: "bantu", region: "southern-africa"}, TONGA = {way: "polynesian", region: "pacific-islands"};
const ANDES = {way: "andean", region: "andes"}, INDIA = {way: "indic", region: "india"}, TIBET = {way: "tibetan", region: "tibet-himalaya"};

test("cookery by region: the brews, quids and dishes of other lands have recipes, not raw", () => {
  const want = {"sorghum beer": "sorghumbeer", "maize beer": "maizebeer", pulque: "pulque", kava: "kava", "a gourd of foaming cacao": "cacaodrink",
    "a betel nut wrapped in leaf with lime": "betel", "freeze-dried potatoes": "chuno", "rice crackers": "ricecake", "fermented cabbage": "ferment-veg",
    "a block of yak butter": "butter", "a sheet of flat sour bread": "flatbread", "roasted barley flour": "mill", pemmican: "dry", "a bundle of dried fish": "dry"};
  for ( const [name, key] of Object.entries(want) ) {
    const g = good(name);
    assert.ok(g, name);
    const m = R.methodFor(g, Math.max(1650, g.from));
    assert.equal(m.method?.key, key, `${name}: ${m.why}`);
  }
  for ( const name of ["sorghum", "millet", "maguey sap", "kava root", "areca nuts", "a bundle of betel leaves", "a kola nut", "quinoa", "turmeric", "cloves"] ) {
    assert.ok(good(name), name);
    assert.ok(R.methodFor(good(name), 1600).raw, `${name} is grown or gathered`);
  }
  assert.equal(R.inScope(good("a betel box of brass")), false, "a betel box holds the quid; it is not one");
});

test("cookery by region: ingredients are bought where they grow", () => {
  const names = (group, y, w) => R.membersOf(group, G.GOODS, y, w).map(g => g.name);
  assert.ok(names("maize", 1400, MEX).includes("corn kernels"), "maize in Mexico long before Europe");
  assert.deepEqual(names("maize", 1400, MOR), [], "no maize in Moravia in 1400");
  assert.ok(names("maize", 1700, MOR).includes("corn kernels"), "maize reaches Moravia later");
  assert.deepEqual(names("agave", 1400, MEX), ["maguey sap"]);
  assert.deepEqual(names("agave", 1400, MOR), []);
  assert.ok(names("sorghum", 1400, ZULU).includes("sorghum"));
  assert.deepEqual(names("kavaroot", 1700, MOR), []);
  assert.deepEqual(names("kavaroot", 1700, TONGA), ["kava root"]);
  // no place given: years only, as before
  assert.ok(names("maize", 1700).includes("corn kernels"));
});

test("cookery by region: what is at home in a land, every era", () => {
  const at = (n, y, w) => R.inUse(good(n), y, w);
  assert.ok(at("pulque", 1400, MEX) && !at("pulque", 1400, MOR));
  assert.ok(at("mead", 1400, MOR) && !at("mead", 1400, MEX));
  assert.ok(at("maize beer", 1300, ANDES) && !at("maize beer", 1300, INDIA));
  assert.ok(at("a betel nut wrapped in leaf with lime", 1200, INDIA) && !at("a betel nut wrapped in leaf with lime", 1200, MOR));
  assert.ok(at("roasted barley flour", 1600, TIBET) && !at("roasted barley flour", 1600, MEX));
  assert.ok(at("kava", 1990, TONGA));
  for ( const y of [1197, 1500, 1800, 1999, 2022] ) {
    const here = G.GOODS.filter(g => R.inScope(g) && R.inUse(g, y, MEX)).filter(g => R.recipeOf(g, y).ok);
    assert.ok(here.length > 5, `something to cook in Mexico in ${y}`);
  }
  // "Cook with it": a carried ingredient lists what it makes
  assert.deepEqual(R.usesOf("maguey sap", G.GOODS, 1400, MEX).map(g => g.name), ["pulque"]);
  assert.deepEqual(R.usesOf("kava root", G.GOODS, 1700).map(g => g.name), ["kava"]);
});

test("cookery by region: the windows keep to the land", () => {
  const ck = src("modules/wodx-storyteller/scripts/cookery.mjs"), own = src("modules/wodx-storyteller/scripts/owners.mjs");
  assert.match(src("modules/wodx-storyteller/scripts/core.mjs"), /export function whereNow/);
  assert.match(ck, /R\.membersOf\(m\.group, G\.GOODS, y, at\)/, "buying picks this land's goods");
  assert.match(ck, /const here = !at \|\| R\.inUse\(good, year, at\)/);
  assert.match(ck, /select name="lands" data-fixed/);
  assert.match(own, /export async function makeable\(year = yearNow\(\), where = null\)/);
  assert.match(own, /select name="lands" data-fixed/);
});
