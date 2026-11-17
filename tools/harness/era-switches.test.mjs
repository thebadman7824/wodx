import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync, readdirSync} from "node:fs";

/*
 * B6668: an era profile's switches (its "rules" in data/eras.json) decide what other modules do; each module's own
 * year check is only the fallback. This holds every switch to at least one reader, and each reader to the switch.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const M = p => join(root, "modules", p);
const T = await import(M("wodx-chronicle/scripts/terms.mjs"));
const K = await import(M("wodx-storyteller/scripts/kits-rules.mjs"));
const B = await import(M("wodx-sheets/scripts/beginner-rules.mjs"));
const R = await import(M("wodx-interactables/scripts/interact-rules.mjs"));
const F = await import(M("wodx-interactables/scripts/fill-rules.mjs"));
const eras = JSON.parse(readFileSync(M("wodx-chronicle/data/eras.json"), "utf8"));

/** Each switch and the files that read it from the profile in force. */
const READERS = {
  firearms: ["wodx-storyteller/scripts/between.mjs", "wodx-npc/scripts/trust.mjs", "wodx-interactables/scripts/main.mjs"],
  morality: ["wodx-sheets/scripts/beginner.mjs", "wodx-npc/scripts/factions.mjs", "wodx-creation/scripts/change-of-state.mjs"],
  gauntletChart: ["wodx-storyteller/scripts/glance-rules.mjs", "wodx-otherworlds/scripts/ratings.mjs"],
  cyberware: ["wodx-interactables/scripts/fill.mjs"]
};

test("every switch a profile carries has a reader, and each reader reads it", () => {
  const keys = new Set(eras.profiles.flatMap(p => Object.keys(p.rules ?? {})));
  assert.deepEqual([...keys].sort(), Object.keys(READERS).sort(), "a new switch needs a reader here and in the code");
  for ( const [key, files] of Object.entries(READERS) ) {
    for ( const f of files ) {
      const src = readFileSync(M(f), "utf8");
      assert.ok(src.includes(`eraSwitch?.("${key}")`) || src.includes(`eraSwitch("${key}")`) || src.includes(`rules?.${key}`), `${f} reads ${key}`);
    }
  }
});

test("no module decides by its own year where the switch exists (the old checks are gone)", () => {
  const trust = readFileSync(M("wodx-npc/scripts/trust.mjs"), "utf8");
  assert.doesNotMatch(trust, /< 1600 \? "bandit"/);
  const kits = readFileSync(M("wodx-storyteller/scripts/kits-rules.mjs"), "utf8");
  assert.doesNotMatch(kits, /y < 1600/);
  const beg = readFileSync(M("wodx-sheets/scripts/beginner-rules.mjs"), "utf8");
  assert.doesNotMatch(beg, /year < 1450/);
  const eraApi = readFileSync(M("wodx-chronicle/scripts/eras.mjs"), "utf8");
  assert.match(eraApi, /export function eraSwitch\(key\)/);
});

test("terms: the switch decides, the year is the fallback", () => {
  assert.equal(T.gunsOnSheet(false, 1900), false);
  assert.equal(T.gunsOnSheet(true, 1200), true);
  assert.equal(T.gunsOnSheet("early", 1500), false);
  assert.equal(T.gunsOnSheet("early", 1700), true);
  assert.equal(T.gunsOnSheet(undefined, 1599), false);
  assert.equal(T.gunsOnSheet(undefined, 1600), true);
  assert.equal(T.gunsOnSheet(undefined, null), false, "an unknown year counts as early");
  assert.equal(T.walksRoads("roads", 1800), true);
  assert.equal(T.walksRoads("humanity-and-paths", 1300), false);
  assert.equal(T.walksRoads(undefined, 1449), true);
  assert.equal(T.walksRoads(undefined, 1450), false);
  assert.equal(T.cyberwareOn(true, false), true);
  assert.equal(T.cyberwareOn(false, true), false);
  assert.equal(T.cyberwareOn(undefined, true), true);
});

test("firearms: quick extras, the strike-back and the archery butt follow the switch", () => {
  const keys = (y, f) => K.extrasFor(y, f).map(e => e.key);
  assert.ok(keys(1197).includes("watch") && !keys(1197).includes("police"), "no switch: the year");
  assert.ok(keys(1999).includes("police"));
  assert.ok(keys(1999, false).includes("watch") && !keys(1999, false).includes("police"), "no firearms: early templates in any year");
  assert.ok(keys(1300, true).includes("police"), "firearms on: late templates");
  const target = {isTarget: true, kind: "mark"};
  assert.equal(R.nameOf(target, {eraId: "modern", year: 1999, firearms: false}), "Archery butt");
  assert.notEqual(R.nameOf(target, {eraId: "dark-ages", year: 1300, firearms: true}), "Archery butt");
  assert.equal(R.nameOf(target, {eraId: "dark-ages", year: 1300}), "Archery butt", "no switch: the Dark Ages rules");
  assert.notEqual(R.nameOf(target, {eraId: "modern", year: 1999}), "Archery butt");
});

test("morality: Humanity's help says Road where the profile walks the Roads", () => {
  const road = h => /Road of Humanity/.test(h);
  assert.ok(road(B.helpFor("Humanity", {year: 1700, morality: "roads"})), "the Age of Revolutions keeps the Roads");
  assert.ok(!road(B.helpFor("Humanity", {year: 1300, morality: "humanity-and-paths"})));
  assert.ok(road(B.helpFor("Humanity", {year: 1300})), "no switch: before 1450");
  assert.ok(!road(B.helpFor("Humanity", {year: 1500})));
});

test("cyberware: a clinic draws it only where the switch or the gear's era list allows", () => {
  const cyber = {name: "Cyberoptic", type: "Item", flags: {"wodx-library": {kind: "cyber eye", cyber: true, eras: ["future-darkness"]}}};
  const knife = {name: "Knife", type: "Melee Weapon", flags: {"wodx-library": {kind: "melee", eras: ["future-darkness", "modern"]}}};
  const names = o => F.candidates([cyber, knife], {place: "clinic", ...o}).map(c => c.item.name);
  assert.deepEqual(names({era: "future-darkness"}), ["Cyberoptic", "Knife"], "no switch: the era list");
  assert.deepEqual(names({era: "future-darkness", cyberware: false}), ["Knife"]);
  assert.deepEqual(names({era: "modern", cyberware: true}), ["Cyberoptic", "Knife"], "a world's own profile can turn it on");
  assert.deepEqual(names({era: "modern"}), ["Knife"]);
});

test("each profile's switches are of a kind the readers know", () => {
  const charts = Object.keys((readFileSync(M("wodx-otherworlds/scripts/rules.mjs"), "utf8").match(/"(dark-ages|w20|wild-west)": \{/g) ?? []).reduce((o, m) => ({...o, [m.slice(1, m.indexOf('"', 1))]: 1}), {}));
  for ( const p of eras.profiles ) {
    const r = p.rules ?? {};
    assert.ok([false, true, "early"].includes(r.firearms), `${p.id} firearms`);
    if ( "morality" in r ) assert.ok(["roads", "humanity-and-paths"].includes(r.morality), `${p.id} morality`);
    assert.ok(charts.includes(r.gauntletChart), `${p.id} gauntletChart`);
    if ( "cyberware" in r ) assert.equal(typeof r.cyberware, "boolean", `${p.id} cyberware`);
  }
  assert.ok(readdirSync(M("wodx-chronicle/scripts")).includes("eras.mjs"));
});
