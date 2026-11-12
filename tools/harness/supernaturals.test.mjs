import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import * as SR from "../../modules/wodx-npc/scripts/supernatural-rules.mjs";
import * as NR from "../../modules/wodx-npc/scripts/npc-rules.mjs";
import * as R from "../../modules/wodx-npc/scripts/routine-rules.mjs";

/* Supernatural NPCs by line (WoDX NPC 0.24.0, B1009 to B1013) */

const prof = k => NR.profileOf({}, k);
const foe = (more = {}) => ({id: "e1", name: "Foe", visible: true, distance: 1, reach: true, wounds: 0, fearSources: [], attackDice: 4, ...more});
const tf = (kind, sides, where = {}, more = {}) => NR.templateFor({kind, sides, where, ...more});

test("29 archetypes, each with a template, a routine that checks and tactics that exist", () => {
  const keys = Object.keys(SR.SUPERNATURALS);
  assert.equal(keys.length, 29);
  for ( const k of keys ) {
    assert.ok(NR.TEMPLATES[k], `${k} template`);
    const preset = R.DEFAULT_PRESET[k];
    assert.ok(R.PRESETS[preset], `${k} preset ${preset}`);
    for ( const age of Object.keys(R.AGES) ) {
      const blocks = R.presetBlocks(preset, age);
      assert.ok(blocks.length, `${k} in ${age}`);
      assert.deepEqual(R.checkBlocks(blocks), [], `${k} blocks`);
      for ( const b of blocks ) assert.ok(R.ROLES[b.place], `${k} role ${b.place}`);
    }
    for ( const t of NR.TEMPLATES[k].tactics ) assert.ok(NR.TACTICS[t], `${k} tactic ${t}`);
  }
});

test("the sheet's clan, tribe, kith, Tradition or creed picks the archetype", () => {
  assert.equal(tf("kindred", ["clan:nosferatu"]), "nosferatu");
  assert.equal(tf("kindred", ["clan:toreador"]), "toreador");
  assert.equal(tf("kindred", ["clan:gangrel"]), "gangrel");
  assert.equal(tf("kindred", ["sect:anarch movement"], {year: 1900}), "anarch");
  assert.equal(tf("kindred", ["sect:anarch movement"], {year: 1300}), "neonate", "no Anarchs before the revolt");
  assert.equal(tf("kindred", ["clan:tzimisce"], {year: 1250}, {generation: 6}), "fiend-lord");
  assert.equal(tf("kindred", ["clan:tzimisce"], {year: 1600}, {generation: 6}), "elder", "the old lords end with the Sabbat");
  assert.equal(tf("lupine", ["tribe:glass walkers"], {year: 1990}), "urban-garou");
  assert.equal(tf("lupine", ["tribe:black spiral dancers"]), "spiral-dancer");
  assert.equal(tf("lupine", ["line:lupine", "variant:corax"]), "fera");
  assert.equal(tf("mortal", ["side:kinfolk"]), "kinfolk");
  assert.equal(tf("mage", ["aff:hollow ones"], {year: 1990}), "hollow-one");
  assert.equal(tf("mage", ["aff:marauder"]), "marauder");
  assert.equal(tf("wraith", ["legion:the silent legion"]), "legionnaire");
  assert.equal(tf("wraith", ["faction:renegade"]), "renegade");
  assert.equal(tf("fae", ["kith:redcap"], {year: 1990}), "redcap");
  assert.equal(tf("fae", ["kith:redcap"], {year: 1700}), "changeling", "no Kithain between the Shattering and the Resurgence");
  assert.equal(tf("hunter", ["aff:arcanum"], {year: 1950}), "arcanum");
  assert.equal(tf("mummy", [], {year: 1995}), "mummy");
  assert.equal(tf("demon", [], {year: 2001}), "fallen");
  assert.equal(tf("ghoul", ["family:bratovitch"]), "revenant");
});

test("the older line templates keep their place", () => {
  assert.equal(tf("kindred", ["sect:sabbat", "clan:nosferatu"]), "sabbat");
  assert.equal(tf("mage", ["aff:technocracy"]), "technocrat");
  assert.equal(tf("hunter", ["side:inquisition", "creed:avengers"], {year: 2005}), "inquisitor");
  assert.equal(tf("kindred", []), "neonate");
  assert.equal(tf("kindred", [], {}, {generation: 7}), "elder");
  assert.equal(tf("lupine", ["tribe:get of fenris"]), "garou");
  assert.equal(tf("mage", ["aff:order of hermes"]), "mage");
});

test("Hunters: the imbued from 1999, and from 2023 in the World of Future Darkness", () => {
  assert.equal(tf("hunter", ["creed:avengers"], {year: 1990}), "hunter");
  assert.equal(tf("hunter", ["creed:avengers"], {year: 2001}), "avenger");
  assert.equal(tf("hunter", ["creed:defenders"], {year: 2001}), "defender");
  assert.equal(tf("hunter", ["creed:innocents"], {year: 2001}), "innocent");
  assert.equal(tf("hunter", ["creed:visionaries"], {year: 2001}), "innocent");
  assert.equal(tf("hunter", ["creed:avengers"], {year: 2010, era: "future-darkness"}), "hunter");
  assert.equal(tf("hunter", ["creed:avengers"], {year: 2030, era: "future-darkness"}), "avenger");
});

test("Ben's rulings: Orpheus crews only in the Future Darkness, Kuei-jin only in Asia", () => {
  assert.ok(!SR.fits("orpheus-crew", {year: 2005}));
  assert.ok(!SR.fits("orpheus-crew", {year: 2005, era: "modern-nights"}));
  assert.ok(SR.fits("orpheus-crew", {year: 2050, era: "future-darkness"}));
  assert.ok(SR.fits("orpheus-crew", {year: 2100, era: "time-of-future-judgement"}));
  assert.ok(!SR.fits("kuei-jin", {year: 1600, region: "moravian"}));
  assert.ok(!SR.fits("kuei-jin", {year: 1600}));
  assert.ok(SR.fits("kuei-jin", {year: 1600, region: "asia"}));
  assert.equal(tf("kindred", ["side:kuei-jin"], {region: "moravian"}), "neonate");
  assert.equal(tf("kindred", ["side:kuei-jin"], {region: "asia"}), "kuei-jin");
  assert.equal(tf("exalted", ["side:kuei-jin"], {region: "asia"}), "kuei-jin");
  assert.equal(tf("mortal", ["side:orpheus"], {era: "future-darkness"}), "orpheus-crew");
  assert.equal(tf("mortal", ["side:orpheus"], {era: "victorian"}), "civilian");
  assert.match(NR.TEMPLATES["kuei-jin"].label, /asia only/);
  assert.match(NR.TEMPLATES["orpheus-crew"].label, /Future Darkness only/);
  assert.ok(!SR.supernaturalsFor({year: 1500, region: "moravian"}).includes("kuei-jin"));
});

test("conduct: a caern warder holds, a Nosferatu stalks, a legion takes them alive", () => {
  const warder = NR.scoreOptions(prof("caern-warder"), {self: {wounds: 6, onGround: true, kind: "lupine"}, enemies: [foe()], allies: []});
  assert.notEqual(warder[0].action, "flee", "holds the caern even badly hurt");
  const nos = (alone) => NR.scoreOptions(prof("nosferatu"), {self: {wounds: 0}, enemies: [foe({alone})], allies: []}).find(o => o.action === "attack").score;
  assert.ok(nos(true) > nos(false));
  assert.ok(prof("legionnaire").tactics.includes("alive"));
  assert.ok(prof("spectre").tactics.includes("swarm") && prof("spectre").hunger === 1);
});

test("a Marauder's Quiet picks among its options, the same way for the same round", () => {
  const opts = [{action: "attack", score: 5, why: "a"}, {action: "power", score: 4, why: "b"}, {action: "flee", score: 1, why: "c"}];
  const a = SR.erraticPick(opts, 3), b = SR.erraticPick(opts, 3);
  assert.deepEqual(a.map(o => o.action), b.map(o => o.action));
  assert.equal(a.length, 3);
  assert.match(a[0].why, /Quiet/);
  assert.ok(prof("marauder").erratic);
  const seen = new Set([0, 1, 2, 3, 4, 5, 6, 7].map(s => SR.erraticPick(opts, s)[0].action));
  assert.ok(seen.size > 1);
});

test("the runtime wires it in", () => {
  const main = readFileSync(new URL("../../modules/wodx-npc/scripts/main.mjs", import.meta.url), "utf8");
  assert.match(main, /where: whereNow\(\)/);
  assert.match(main, /SR\.erraticPick/);
  assert.match(main, /getFlag\?\.\(MOD, "region"\)/);
});
