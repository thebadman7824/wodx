import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* The law of the land (WoDX Chronicle, B3490-B3492): law families, Moravia's own rows, the Law here card */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const L = await import(join(root, "modules/wodx-chronicle/scripts/law-rules.mjs"));
const W = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));

test("every world region has a law family, and every family id used is known or planned", () => {
  const planned = new Set(["common", "orthodox", "islamic", "steppe", "south-asia", "chinese", "japanese", "african", "americas", "pacific", "north"]);
  for ( const id of Object.keys(W.WORLD_REGIONS) ) {
    const fam = L.REGION_FAMILY[id];
    assert.ok(fam, `${id} has no law family`);
    assert.ok(L.FAMILIES[fam] || planned.has(fam), `${id}: unknown family ${fam}`);
  }
});

test("every id a row names is in its table", () => {
  const tables = {crimes: L.CRIMES, proof: L.PROOF, punish: L.PUNISH, order: L.ORDER};
  const rows = [...Object.values(L.FAMILIES).flatMap(f => f.rows), ...Object.values(L.REGION_ROWS).flat()];
  for ( const r of rows ) for ( const part of ["add", "drop"] ) for ( const [k, ids] of Object.entries(r[part] ?? {}) ) {
    if ( !tables[k] ) continue;
    for ( const id of ids ) assert.ok(tables[k][id], `${r.note}: ${k} ${id}`);
  }
  for ( const id of L.EVERGREEN_CRIMES ) assert.ok(L.CRIMES[id]);
});

test("Moravia across the eras", () => {
  const at = y => L.lawOf("moravia", y);
  assert.match(at(1197).rule.ruler, /King of Bohemia/);
  assert.ok(at(1197).proof.includes("ordeal"));
  assert.ok(!at(1240).proof.includes("ordeal"), "the ordeal fades after 1215");
  assert.ok(at(1250).courts.some(c => /mining court/.test(c)));
  assert.ok(at(1430).warn.some(w => /Hussite/.test(w)));
  assert.ok(!at(1440).warn.some(w => /Hussite/.test(w)), "the Hussite wars end");
  assert.ok(at(1650).crimes.includes("wrong-faith"));
  assert.ok(!at(1790).crimes.includes("wrong-faith"), "toleration in 1781");
  assert.ok(!at(1790).crimes.includes("sorcery"));
  assert.ok(at(1942).order.includes("secret-police"));
  assert.equal(at(1946).rule.form, "A parliamentary republic");
  assert.ok(at(1946).punish.includes("hanging"), "the republic kept the death penalty");
  assert.ok(at(1960).proof.includes("party"));
  assert.ok(!at(1991).punish.includes("hanging"), "abolished 1990");
  assert.ok(!at(1991).order.includes("secret-police"));
  assert.ok(!at(1991).order.includes("inquisitors"));
  assert.ok(at(2010).courts.some(c => /European Union/.test(c)));
  for ( const y of [1197, 1500, 1800, 1950, 2022, 2100] ) {
    const r = at(y);
    for ( const id of L.EVERGREEN_CRIMES ) assert.ok(r.crimes.includes(id), `${y} lacks ${id}`);
    assert.ok(r.rule.ruler && r.order.length, `${y} has a ruler and keepers of order`);
    assert.ok(r.bribe >= 1 && r.bribe <= 5);
  }
});

test("a land whose family is not written yet stands in with the custom of the land, marked a guess", () => {
  const r = L.lawOf("nowhere", 1400);
  assert.equal(r.family, "custom");
  assert.equal(r.guess, true);
  const waiting = Object.entries(L.REGION_FAMILY).find(([, f]) => !L.FAMILIES[f]);
  if ( waiting ) { const w = L.lawOf(waiting[0], 1400); assert.equal(w.guess, true); assert.equal(w.planned, waiting[1]); }
  assert.equal(L.lawOf("france", 1400).guess, false);
});

test("the clock note lists what changed, both ways", () => {
  const fwd = L.changesBetween("moravia", 1900, 1950).map(c => c.year);
  assert.deepEqual(fwd, [...fwd].sort((a, b) => a - b));
  assert.ok(fwd.includes(1918) && fwd.includes(1939) && fwd.includes(1948));
  assert.deepEqual(L.changesBetween("moravia", 1950, 1900), L.changesBetween("moravia", 1900, 1950));
  assert.equal(L.changesBetween("moravia", 1300, 1300).length, 0);
});

test("the Law here card opens one more section per dot, and all for the Storyteller", () => {
  const r = L.lawOf("moravia", 1300);
  const base = L.cardSections(r, {dots: 0}).map(s => s.key);
  assert.deepEqual(base, ["rule", "order", "warn"]);
  assert.equal(L.cardSections(r, {dots: 2}).length, 5);
  const all = L.cardSections(r, {full: true}).map(s => s.key);
  for ( const k of ["crimes", "courts", "proof", "punish", "taxes", "bribe"] ) assert.ok(all.includes(k));
});

test("the lands of Islam (B3493)", () => {
  const at = (r, y) => L.lawOf(r, y);
  assert.equal(at("egypt", 1300).family, "islamic");
  assert.equal(at("egypt", 1300).guess, false);
  assert.ok(at("egypt", 1300).courts.some(c => /qadi/.test(c)));
  assert.ok(at("egypt", 1300).order.includes("muhtasib"));
  assert.ok(at("levant", 1600).courts.some(c => /kanun/.test(c)), "Ottoman kanun after 1516");
  assert.ok(at("anatolia", 1850).taxes.some(x => /poll tax/.test(x)));
  assert.ok(!at("anatolia", 1860).taxes.some(x => /poll tax/.test(x)), "equal subjects 1856");
  assert.ok(!at("anatolia", 1930).courts.some(c => /qadi/.test(c)), "sharia courts closed 1924");
  assert.ok(!at("anatolia", 1930).crimes.includes("wine"));
  assert.ok(at("persia", 1990).courts.some(c => /revolutionary/.test(c)));
  assert.ok(at("persia", 1300).courts.some(c => /Yassa/.test(c)));
  assert.ok(!at("persia", 1400).courts.some(c => /Yassa/.test(c)));
  assert.ok(!at("nusantara", 1300).crimes.includes("apostasy"), "Hindu-Buddhist kingdoms before Islam");
  assert.ok(at("nusantara", 1500).crimes.includes("apostasy"));
  assert.ok(at("maghreb", 1900).warn.some(w => /Settlers/.test(w)));
  assert.ok(!at("maghreb", 1970).warn.some(w => /Settlers/.test(w)));
  for ( const r of ["anatolia", "levant", "egypt", "arabia", "maghreb", "persia", "nusantara"] ) for ( const y of [1197, 1500, 1800, 1950, 2022] ) {
    const x = at(r, y);
    assert.ok(x.rule.ruler && x.order.length && x.courts.length, `${r} ${y}`);
  }
});

test("Chinese imperial law and its neighbours (B3494)", () => {
  const at = (r, y) => L.lawOf(r, y);
  assert.equal(at("china", 1400).family, "chinese");
  assert.ok(at("china", 1400).proof.includes("confession"));
  assert.ok(at("china", 1300).warn.some(w => /Mongols first/.test(w)));
  assert.ok(!at("china", 1400).warn.some(w => /Mongols first/.test(w)));
  assert.ok(at("china", 1700).warn.some(w => /queue/.test(w)));
  assert.ok(!at("china", 1920).warn.some(w => /queue/.test(w)));
  assert.ok(at("china", 1900).courts.some(c => /consular/.test(c)));
  assert.ok(!at("china", 1950).courts.some(c => /consular/.test(c)));
  assert.ok(at("china", 1970).warn.some(w => /Red Guards/.test(w)));
  assert.ok(!at("china", 1980).warn.some(w => /Red Guards/.test(w)));
  assert.ok(at("china", 1960).proof.includes("party"));
  assert.match(at("korea", 1500).rule.ruler, /Joseon/);
  assert.match(at("korea", 1930).rule.form, /colony of Japan/);
  assert.ok(at("southeast-asia", 1600).courts.some(c => /Lê Code/.test(c)));
  for ( const r of ["china", "korea", "southeast-asia"] ) for ( const y of [1197, 1500, 1800, 1950, 2022] ) {
    const x = at(r, y);
    assert.ok(x.rule.ruler && x.order.length && x.courts.length, `${r} ${y}`);
  }
});

test("South Asia (B3495)", () => {
  const at = (r, y) => L.lawOf(r, y);
  assert.equal(at("india", 1300).family, "south-asia");
  assert.ok(at("india", 1300).courts.some(c => /qadi/.test(c)));
  assert.ok(at("india", 1300).crimes.includes("caste-breach"));
  assert.ok(!at("india", 1600).taxes.some(x => /poll tax/.test(x)), "Akbar lifted it");
  assert.ok(at("india", 1700).taxes.some(x => /poll tax/.test(x)), "Aurangzeb brought it back");
  assert.ok(!at("india", 1750).taxes.some(x => /poll tax/.test(x)));
  assert.ok(at("india", 1900).courts.some(c => /Penal Code/.test(c)));
  assert.ok(!at("india", 1960).crimes.includes("caste-breach"), "1950 constitution");
  assert.ok(at("india", 1976).warn.some(w => /Emergency/.test(w)));
  assert.ok(!at("india", 1980).warn.some(w => /Emergency/.test(w)));
  assert.match(at("tibet-himalaya", 1700).rule.ruler, /Dalai Lama/);
  assert.match(at("tibet-himalaya", 1950).rule.form, /People's Republic/);
  assert.ok(!at("tibet-himalaya", 1300).crimes.includes("caste-breach"));
  for ( const r of ["india", "tibet-himalaya"] ) for ( const y of [1197, 1500, 1800, 1950, 2022] ) {
    const x = at(r, y);
    assert.ok(x.rule.ruler && x.order.length && x.courts.length, `${r} ${y}`);
  }
});

test("Africa south of the Sahara (B3496)", () => {
  const at = (r, y) => L.lawOf(r, y);
  assert.equal(at("west-africa", 1300).family, "african");
  assert.match(at("west-africa", 1300).rule.ruler, /Mansa/);
  assert.ok(at("west-africa", 1300).courts.some(c => /Timbuktu/.test(c)));
  assert.ok(at("west-africa", 1700).warn.some(w => /slave ships/.test(w)));
  assert.ok(!at("west-africa", 1900).warn.some(w => /slave ships/.test(w)));
  assert.ok(at("west-africa", 1920).warn.some(w => /same law/.test(w)), "colonial rule");
  assert.ok(!at("west-africa", 1970).warn.some(w => /same law/.test(w)), "independence");
  assert.ok(!at("west-africa", 1920).punish.includes("enslave"));
  assert.ok(at("east-africa", 1500).courts.some(c => /Fetha Nagast/.test(c)));
  assert.ok(at("southern-africa", 1970).crimes.includes("pass-law"));
  assert.ok(!at("southern-africa", 2000).crimes.includes("pass-law"));
  assert.ok(!at("southern-africa", 2000).punish.includes("hanging"));
  assert.ok(at("central-africa", 1900).warn.some(w => /rubber/.test(w)));
  for ( const r of ["west-africa", "east-africa", "southern-africa", "central-africa"] ) for ( const y of [1197, 1500, 1800, 1950, 2022] ) {
    const x = at(r, y);
    assert.ok(x.rule.ruler && x.order.length && x.courts.length, `${r} ${y}`);
  }
});

test("English common law (B3497)", () => {
  const at = y => L.lawOf("british-isles", y);
  assert.equal(at(1300).family, "common");
  assert.ok(at(1197).proof.includes("ordeal") && !at(1230).proof.includes("ordeal"));
  assert.ok(at(1230).proof.includes("jury"));
  assert.ok(at(1450).punish.includes("burning") && !at(1700).punish.includes("burning"));
  assert.ok(at(1600).warn.some(w => /Witch trials/.test(w)) && !at(1700).warn.some(w => /Witch trials/.test(w)));
  assert.ok(at(1750).crimes.includes("pretend-powers") && !at(1750).crimes.includes("sorcery"));
  assert.ok(!at(1960).crimes.includes("pretend-powers"), "repealed 1951");
  assert.ok(at(1800).punish.includes("transportation") && !at(1900).punish.includes("transportation"));
  assert.ok(at(1840).order.includes("police") && !at(1840).order.includes("hue-cry"));
  assert.ok(at(1950).punish.includes("hanging") && !at(1970).punish.includes("hanging"));
  assert.match(at(1655).rule.form, /commonwealth/);
  assert.match(at(1700).rule.form, /constitutional/);
});
