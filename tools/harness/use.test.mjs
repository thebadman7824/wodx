import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Using things (Library 0.9.0, B907-B910) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const G = await imp("modules/wodx-library/data/goods.mjs");
const U = await imp("modules/wodx-library/scripts/use-rules.mjs");
const good = n => G.GOODS.find(g => g.name === n);

test("use: every ability of every good is on the roster, and most goods have one", () => {
  let some = 0;
  for ( const g of G.GOODS ) {
    const a = U.abilitiesOf(g);
    for ( const k of a ) assert.ok(U.ABILITIES[k], `${g.name}: ${k}`);
    assert.equal(new Set(a).size, a.length, `${g.name}: twice`);
    if ( a.length ) some++;
  }
  assert.ok(some > 1500, `only ${some} goods can be used`);
  for ( const [k, a] of Object.entries(U.ABILITIES) ) assert.ok(a.label && a.effect && a.verb, k);
});

test("use: a journal is written and drawn in, a fiddle played, a candle lit, a bedroll slept in", () => {
  assert.deepEqual(U.abilitiesOf(good("a leather journal")), ["write", "draw", "read"]);
  assert.ok(U.abilitiesOf(good("a fiddle")).includes("play"));
  assert.equal(U.lightOf(good("a tallow candle")), "candle");
  assert.equal(U.lightOf(good("a storm lantern")), "lantern");
  assert.equal(U.lightOf(good("a flashlight")), "electric");
  assert.equal(U.refuelOf(good("lamp oil")), "lantern");
  assert.ok(U.abilitiesOf(good("a bedroll")).includes("sleep"));
  assert.ok(U.abilitiesOf(good("a fountain pen")).includes("letter"));
  assert.ok(U.abilitiesOf(good("a printed map")).includes("mark"));
  assert.ok(U.abilitiesOf(good("a first aid kit")).includes("treat"));
  assert.ok(!U.spends(good("a first aid kit"), "treat") && U.spends(good("a roll of clean linen bandage"), "treat"));
  assert.ok(U.abilitiesOf(good("a tin canteen")).includes("drink") && !U.spends(good("a tin canteen"), "drink"));
});

test("use: what is in a thing", () => {
  assert.equal(U.substanceOf(good("claret")), "alcohol");
  assert.equal(U.substanceOf(good("black coffee")), "caffeine");
  assert.equal(U.substanceOf(good("orange juice")), "water");
  assert.equal(U.substanceOf(good("laudanum")), "opiate");
  assert.equal(U.substanceOf(good("a cigarette")), "tobacco");
  assert.equal(U.substanceOf(good("a tab of LSD blotter paper")), "hallucinogen");
  assert.equal(U.substanceOf(good("blood")), "blood");
  assert.equal(U.substanceOf(good("flour")), null, "flour is cooked with");
  assert.equal(U.substanceOf(good("a salt herring")), "food");
});

test("use: each line takes it its own way; unsure cells ask the Storyteller", () => {
  for ( const [k, r] of Object.entries(U.EFFECTS) ) {
    assert.ok(U.EFFECT_LABELS[k], k);
    for ( const l of U.LINES ) assert.ok(r[l]?.does, `${k} ${l}`);
  }
  assert.equal(U.effectFor("alcohol", "vampire").does, "none");
  assert.equal(U.effectFor("alcohol", "changeling").state, "drunk");
  assert.equal(U.effectFor("alcohol", "mortal").waters, true);
  assert.equal(U.effectFor("alcohol", "werewolf").does, "takes", "Ben: weaker than for a mortal");
  assert.match(U.effectFor("alcohol", "werewolf").text, /Weaker than for a mortal/);
  assert.equal(U.effectFor("food", "vampire").does, "none");
  assert.equal(U.effectFor("food", "wraith").does, "cannot");
  assert.equal(U.effectFor("blood", "vampire").does, "blood");
  assert.equal(U.effectFor("bed", "mortal").does, "sleeps");
  assert.equal(U.lineOf("Mortal", "ghoul"), "ghoul");
  assert.equal(U.lineOf("Changing Breed"), "werewolf");
  assert.equal(U.VESSEL_STATE.sedative, "opiate");
  for ( const [k, r] of Object.entries(U.EFFECTS) ) for ( const c of Object.values(r) ) if ( c.text ) {
    assert.doesNotMatch(c.text, /—|–/, k);
    assert.doesNotMatch(c.text, /\b(he|she|his|her|him|hers)\b/i, k);
  }
});

test("use: pages kept in a thing are cleaned", () => {
  const p = U.normPages([{kind: "drawing", text: "A map of the crypt", by: "Ana", at: 5}, {text: ""}, null, {kind: "bogus", text: "x"}]);
  assert.equal(p.length, 2);
  assert.equal(p[0].kind, "drawing");
  assert.equal(p[1].kind, "writing");
  assert.equal(U.useLine("Ana", "write", "a leather journal"), "Ana writes in a leather journal.");
});

test("use: wired into the Library, the Possessions row, carried light and the common checks", () => {
  assert.match(src("modules/wodx-library/scripts/main.mjs"), /setupUse\(\)/);
  assert.equal(JSON.parse(src("modules/wodx-library/module.json")).socket, true);
  assert.match(src("modules/wodx-sheets/scripts/extras-html.mjs"), /data-act="use"/);
  assert.match(src("modules/wodx-sheets/scripts/extras.mjs"), /case "use":/);
  assert.match(src("modules/wodx-interactables/scripts/main.mjs"), /api\.carry = setupCarry\(\)/);
  assert.match(src("modules/wodx-library/scripts/use.mjs"), /typeof c === "function" \? c : c\?\.carry/);
  const iv = JSON.parse(src("modules/wodx-interactables/module.json")).version;
  assert.match(src("modules/wodx-interactables/scripts/main.mjs"), new RegExp(`const VERSION = "${iv.replace(/\./g, "\\.")}"`));
  assert.equal(U.ABILITIES.play.preset, "performance");
  assert.match(src("modules/wodx-actions/scripts/main.js"), /extraDiff: preDiff = 0/);
});

test("use: Ben's desk picks are rulings, and holy water burns the damned (2026-11-12)", () => {
  for ( const [sub, lines] of Object.entries(U.PICKS) ) for ( const l of Object.keys(lines) ) {
    const c = U.effectFor(sub, l);
    assert.equal(c.sure, true, `${sub} ${l}`);
    assert.notEqual(c.does, undefined, `${sub} ${l}`);
    if ( c.text ) { assert.doesNotMatch(c.text, /—|–/); assert.doesNotMatch(c.text, /\b(he|she|his|her|him|hers|Ben)\b/); }
  }
  assert.equal(U.effectFor("food", "mummy").does, "feeds");
  assert.equal(U.effectFor("blood", "werewolf").does, "none");
  assert.equal(U.effectFor("unknown", "wraith").does, "cannot");
  assert.match(U.effectFor("hallucinogen", "changeling").text, /Stronger than for a mortal/);
  assert.equal(U.effectFor("holywater", "demon").does, "harms");
  assert.equal(U.effectFor("holywater", "vampire").does, "none");
  assert.equal(U.effectForActor("holywater", "vampire", "Baali").does, "harms");
  assert.equal(U.effectForActor("holywater", "vampire", "wod.bio.vampire.followersofset Followers of Set").does, "harms");
  assert.equal(U.effectForActor("holywater", "vampire", "Toreador").does, "none");
  assert.match(U.effectFor("holywater", "demon").text, /lethal damage each turn/);
  assert.equal(U.effectForActor("holywater", "demon", "", {torment: 3}).does, "none", "Torment 3 or less: unhurt");
  assert.equal(U.effectForActor("holywater", "demon", "", {torment: 3, holyFlaw: true}).does, "harms");
  assert.equal(U.effectForActor("holywater", "demon", "", {torment: 6}).does, "harms");
  const unsure = Object.entries(U.EFFECTS).flatMap(([k, r]) => U.LINES.filter(l => !U.effectFor(k, l).sure).map(l => `${k} ${l}`));
  assert.deepEqual(unsure, [], "every cell on the desk is decided");
});

test("use: Ben's item notes: patches, the syringe and the spoon, drinks and food to cook with", () => {
  const good = n => G.GOODS.find(g => g.name === n);
  assert.deepEqual(U.abilitiesOf(good("a dermal patch")), ["apply"]);
  assert.equal(U.substanceOf(good("a dermal patch")), "stimulant");
  assert.deepEqual(U.abilitiesOf(good("a fentanyl patch")), ["apply"]);
  assert.deepEqual(U.abilitiesOf(good("a glass syringe")), ["inject"]);
  assert.deepEqual(U.abilitiesOf(good("milk")), ["drink"]);
  assert.deepEqual(U.abilitiesOf(good("honey")), ["eat"]);
  assert.match(src("modules/wodx-library/scripts/use.mjs"), /RR\.usesOf\(good\.name/);
  assert.match(src("modules/wodx-library/scripts/use.mjs"), /case "inject":/);
});
