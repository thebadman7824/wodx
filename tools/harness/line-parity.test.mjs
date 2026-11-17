import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";

/* B6300-B6303: every line gets the line-agnostic tools the Kindred have (15 November 2026) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
installMock({dataRoot: root});
const A = p => import(join(root, "modules/wodx-actions/scripts", p));
const PM = await A("profile-menus.js");
const TR = await A("theme-rules.js");
const GR = await A("garou-rules.js");
const CR = await import(join(root, "modules/wodx-combat/scripts/rules.js"));

const specs = k => PM.MENUS[k].sections.flatMap(([, b]) => b.map(([s]) => s));

test("B6300: every line's menu carries the shared Storyteller tools", () => {
  for (const k of Object.keys(PM.MENUS)) {
    const s = specs(k);
    for (const x of ["api:newNight", "api:endStory", "api:masquerade", "api:skyAndSun"]) assert.ok(s.includes(x), `${k} lacks ${x}`);
  }
});

test("B6300: every bodied line can do downtime on its Backgrounds; spirits and beasts cannot", () => {
  for (const k of Object.keys(PM.MENUS)) {
    const has = specs(k).includes("api:downtime");
    assert.equal(has, !["spirit", "beast"].includes(k), k);
  }
  for (const k of ["lupine", "mage", "mageDA"]) assert.ok(specs(k).includes("api:seduction"), k);
  for (const k of ["fae", "faeDA", "demon", "mummy", "orpheus"]) assert.ok(specs(k).includes("api:healing"), k);
});

test("B6300: no button shows twice, and the shared ones land in the right bands", () => {
  for (const k of Object.keys(PM.MENUS)) {
    const s = specs(k);
    assert.equal(new Set(s).size, s.length, `${k} repeats a button`);
    const g = TR.groupMenu(k, PM.MENUS[k].sections, {isGM: true});
    const band = spec => g.bands.find(b => b.buttons.some(x => x.spec === spec))?.id;
    assert.equal(band("api:newNight"), "st", k);
    assert.equal(band("api:endStory"), "st", k);
    if (s.includes("api:downtime") && k !== "kindred") assert.equal(band("api:downtime"), "recover", k);
    // a player does not see the Storyteller's band
    const p = TR.groupMenu(k, PM.MENUS[k].sections, {isGM: false});
    assert.ok(!p.bands.some(b => b.id === "st"), k);
  }
});

test("B6303: Rage at a new story is one die, no higher than permanent Rage", () => {
  assert.equal(GR.newStoryRage(7, 5), 5);
  assert.equal(GR.newStoryRage(3, 5), 3);
  assert.equal(GR.newStoryRage(10, 10), 10);
  assert.equal(GR.newStoryRage(0, 4), 1);
  assert.equal(GR.newStoryRage(6, 0), 0);
});

test("B6302: a Cainite is staked by three successes, as before", () => {
  assert.equal(CR.followOn("stake", {hit: true, damageSuccesses: 3, profile: "vampire"})[0]?.condition, "staked");
  assert.equal(CR.followOn("stake", {hit: true, damageSuccesses: 2, profile: "vampire"}).length, 0);
  assert.equal(CR.followOn("stake", {hit: true, damageSuccesses: 3, profile: "mortal"}).length, 0);
});

test("B6302: a Kuei-jin's Chi aspect decides what holds them (KotE pdf pp. 11, 73)", () => {
  const st = (key, chi, metal) => CR.followOn(key, {hit: true, damageSuccesses: 3, profile: "vampire", chi, metal}).some(f => f.condition === "staked");
  assert.equal(st("stake", "yin", false), true);
  assert.equal(st("impale", "yin", false), true);
  assert.equal(st("stake", "yin", true), false);
  assert.equal(st("stake", "yang", false), false);
  assert.equal(st("stake", "yang", true), true);
  assert.equal(st("impale", "yang", true), false, "an arrow never holds a Yang vampire");
  assert.equal(st("stake", "balance", true), false);
  assert.equal(st("stake", "balance", false), false);
  assert.equal(st("stake", "", false), true, "no aspect set yet: the Cainite rule");
  assert.ok(CR.LONG_METAL.test("Katana") && CR.LONG_METAL.test("Iron bar") && !CR.LONG_METAL.test("Wooden stake") && !CR.LONG_METAL.test("Pistol"));
});

const RD = await import(join(root, "modules/wodx-chronicle/scripts/roads-rules.mjs"));
const VL = await import(join(root, "modules/wodx-otherworlds/scripts/veil-look-rules.mjs"));

test("B6304: each road belongs to its line", () => {
  assert.equal(RD.roadLine({type: "Wraith"}), "wraith");
  assert.equal(RD.roadLine({type: "Vampire", variant: "kindredeast"}), "kuei-jin");
  assert.equal(RD.roadLine({type: "Vampire"}), null, "Cainites walk to Golconda instead");
  assert.equal(RD.roadLine({type: "Demon"}), "demon");
  assert.equal(RD.roadLine({type: "Mortal", hastorment: true}), "demon");
  assert.equal(RD.roadLine({type: "Mage"}), null);
});

test("B6305, B6306: Transcendence needs all Eight Truths and a Shadow weaker than the will (Wraith 20th p. 298)", () => {
  const all = RD.TRUTHS.map(t => t.key);
  assert.equal(RD.TRUTHS.length, 8);
  assert.equal(RD.transcendReady(all, 3, 6).ready, true);
  assert.equal(RD.transcendReady(all, 6, 6).ready, false);
  assert.equal(RD.transcendReady(all.slice(1), 1, 6).ready, false);
  assert.deepEqual(RD.withTruth(["self", "patience"], "shadow"), ["patience", "shadow", "self"]);
  assert.deepEqual(RD.withTruth(["shadow"], "shadow", false), []);
  assert.deepEqual(RD.withTruth([], "nonsense"), []);
  assert.equal(RD.shadowRose(2, 3), true);
  assert.equal(RD.shadowRose(3, 3), false);
  assert.equal(RD.shadowRose(null, 3), false);
});

test("B6307: the Road Back by Dharma (KotE pdf pp. 30-31)", () => {
  assert.equal(RD.roadBackStage(6), "walking");
  assert.equal(RD.roadBackStage(9), "bodhisattva-ready");
  assert.equal(RD.roadBackStage(9, {bodhisattva: true}), "bodhisattva");
  assert.equal(RD.roadBackStage(10, {bodhisattva: true}), "arhat-ready");
  assert.equal(RD.roadBackStage(10), "bodhisattva-ready", "an arhat is a bodhisattva first");
  assert.equal(RD.roadBackStage(7, {bodhisattva: true}), "lapsed");
});

test("B6307: a bodhisattva sees across the Shroud and the Gauntlet; Ghostsight for its scene only", () => {
  assert.deepEqual(VL.sightsOf({bodhisattva: true}, 0), ["shroud", "penumbra"]);
  assert.deepEqual(VL.sightsOf({yinSight: {until: 100}}, 50), ["shroud"]);
  assert.deepEqual(VL.sightsOf({yinSight: {until: 100}}, 150), []);
  assert.deepEqual(VL.sightsOf({}, 0), []);
  assert.equal(VL.veilFor({shroud: 4}, {nature: "vampire", sights: VL.sightsOf({bodhisattva: true})}).mist, true);
  assert.equal(VL.veilFor({shroud: 4}, {nature: "vampire", sights: []}).mist, false);
});

test("B6308: Redemption counts down from Torment 10 (Demon: The Fallen p. 160)", () => {
  assert.equal(RD.redemptionStep(10), 0);
  assert.equal(RD.redemptionStep(3), 7);
  assert.equal(RD.redemptionStep(0), 10);
});
