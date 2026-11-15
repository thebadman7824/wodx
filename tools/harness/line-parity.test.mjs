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
