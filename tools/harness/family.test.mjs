import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

// Family systems: pregnancy and birth, with supernatural story hooks (B3220-B3222).
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const imp = p => import(pathToFileURL(join(root, p)));
const F = await imp("modules/wodx-npc/scripts/family-rules.mjs");
const H = await imp("modules/wodx-npc/scripts/hearts-rules.mjs");
const XH = await imp("modules/wodx-sheets/scripts/extras-html.mjs");

test("a pregnancy is due about nine months on the clock", () => {
  assert.equal(F.dueAt(0), Math.round(9 * F.MONTH_SECONDS));
  const days = F.dueAt(1000) / 86400;
  assert.ok(days > 273 && days < 275);
});

test("the birth roll gets easier with the centuries and with who attends", () => {
  assert.equal(F.birthDifficulty(1300, "midwife"), 8);
  assert.equal(F.birthDifficulty(1300, "none"), 9);
  assert.equal(F.birthDifficulty(1300, "physician"), 8, "no physician's help before 1700");
  assert.equal(F.birthDifficulty(1800, "physician"), 6);
  assert.equal(F.birthDifficulty(1900), 5, "a physician by default");
  assert.equal(F.birthDifficulty(1960), 4, "a hospital");
  assert.equal(F.birthDifficulty(1890, "hospital"), 6, "no hospital before 1930");
  assert.equal(F.birthDifficulty(2000), 4);
  assert.equal(F.careFor(1400), "midwife"); assert.equal(F.careFor(1900), "physician"); assert.equal(F.careFor(1990), "hospital");
  assert.equal(F.birthPool(2, "midwife"), 5);
});

test("the dice count the V20 way, and the outcome follows", () => {
  assert.deepEqual(F.countDice([8, 9, 1, 3], 6), {successes: 1, botch: false});
  assert.deepEqual(F.countDice([1, 3, 2], 6), {successes: 0, botch: true});
  assert.deepEqual(F.countDice([3, 2], 6), {successes: 0, botch: false});
  assert.equal(F.birthOutcome({successes: 2}), "well");
  assert.equal(F.birthOutcome({successes: 0}), "hard");
  assert.equal(F.birthOutcome({botch: true}), "loss");
});

test("rest after a birth follows the custom of the time and the way of life", () => {
  assert.match(F.lyingIn(1400, "latin").label, /churching/);
  assert.equal(F.lyingIn(1400, "islamic").weeks, 6);
  assert.match(F.lyingIn(1700, "sinic").label, /sitting the month/);
  assert.equal(F.lyingIn(1990, "sinic").label, "parental leave");
  for ( const s of Object.keys(H.SPHERE_ADOPTION) ) assert.ok(F.lyingIn(1500, s).weeks > 0, s);
});

test("seasons, the one who carries, and the sheet's plain line", () => {
  assert.equal(F.seasonOf(4), "spring"); assert.equal(F.seasonOf(12), "winter"); assert.equal(F.seasonOf(4, true), "autumn");
  assert.equal(F.carrierIndex(["m", "f"]), 1); assert.equal(F.carrierIndex(["f", "m"]), 0);
  assert.equal(F.carrierIndex(["f", "f"]), -1); assert.equal(F.carrierIndex(["", ""]), -1);
  assert.equal(F.expectingLine("spring", 1350), "Expecting, due in spring 1350.");
});

test("supernatural pregnancies are story hooks only, never rules", () => {
  assert.equal(F.storyHooks(["mortal", "mortal"], {kind: "mortal"}).length, 0);
  assert.deepEqual(F.storyHooks(["werewolf", "werewolf"], H.childOf(["werewolf", "werewolf"])), [F.STORY_HOOKS.metis]);
  assert.ok(F.storyHooks(["werewolf", "mortal"], H.childOf(["werewolf", "mortal"], 0.5)).includes(F.STORY_HOOKS.werewolf));
  assert.ok(F.storyHooks(["ghoul", "mage"], {}).length === 2);
  for ( const t of Object.values(F.STORY_HOOKS) ) assert.doesNotMatch(t, /sex|naked|body of/i);
});

test("family is wired: the age floor, the approval, the clock, the hooks and the sheet", () => {
  const f = src("modules/wodx-npc/scripts/family.mjs");
  assert.match(f, /age\?\.romance\?\.\(a, b\)/, "both parents must be adults");
  assert.match(f, /registerApprovalHandler\?\.\(ASK_CHILD/);
  assert.match(f, /Hooks\.on\("updateWorldTime"/);
  assert.match(f, /Hooks\.callAll\("wodxExpecting"/); assert.match(f, /Hooks\.callAll\("wodxBirth"/);
  const hooks = src("docs/HOOKS.md");
  assert.match(hooks, /\| wodxExpecting \| npc \|/); assert.match(hooks, /\| wodxBirth \| npc \|/);
  assert.match(src("modules/wodx-npc/scripts/main.mjs"), /family: \{conceive: FAMILY\.conceive/);
  const html = XH.relationsHtml([{kind: "spouse", label: "Spouse", groupLabel: "Family", name: "A", uuid: "Actor.a", hand: "Actor.a"},
    {kind: "friend", label: "Friend", groupLabel: "Friends", name: "B", uuid: "Actor.b", hand: "Actor.b"}], {couples: true, family: ["Expecting, due in spring 1350."]});
  assert.equal((html.match(/data-act="tie-child"/g) ?? []).length, 1, "only the couple's tie");
  assert.match(html, /Family news/);
  assert.doesNotMatch(XH.relationsHtml([], {}), /Family news/);
});
