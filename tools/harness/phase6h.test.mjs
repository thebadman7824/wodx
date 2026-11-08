import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* Phase 6h: changelings of the later eras (WoDX Actions 3.9.0, Changeling 20th) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const C = await import(join(root, "modules/wodx-actions/scripts/c20-rules.js"));
const V = await import(join(root, "modules/wodx-actions/scripts/voice-rules.js"));

test("eighteen Arts; four primary Realms and two modifiers, five levels each (pp. 197–236)", () => {
  assert.equal(Object.keys(C.ARTS).length, 18);
  assert.deepEqual(C.PRIMARY, ["actor", "fae", "nature", "prop"]);
  for ( const r of Object.values(C.REALMS) ) assert.equal(r.levels.length, 5);
});

test("a cantrip: the book's two worked examples (p. 236)", () => {
  // Metamorphosis 3 and Actor 3, Wyrd, a bunk of −2: six dice at 6, one Glamour
  const a = C.cantripPlan({art: 3, artLevel: 1, used: [{realm: "actor", level: 3}], known: {actor: 3}, wyrd: true}, {bunk: 2});
  assert.deepEqual([a.dice, a.difficulty, a.cost], [6, 6, 1]);
  // Primal 3, Fae 2 (Fae 1 used), Time 1 not known, Wyrd, bunk −2: five dice at 7, two Glamour
  const b = C.cantripPlan({art: 3, used: [{realm: "fae", level: 1}, {realm: "time", level: 1}], known: {fae: 2}, wyrd: true}, {bunk: 2});
  assert.deepEqual([b.dice, b.difficulty, b.cost], [5, 7, 2]);
});

test("cantrip rules: a primary Realm needed; the Art's level; free Wyrd while invoked; Banality, Title, freehold", () => {
  assert.equal(C.cantripPlan({art: 2, used: [{realm: "scene", level: 1}], known: {scene: 1}}).ok, false);
  assert.equal(C.cantripPlan({art: 2, artLevel: 3, used: [{realm: "prop", level: 1}], known: {prop: 1}}).ok, false);
  assert.equal(C.cantripPlan({art: 2, used: [{realm: "prop", level: 1}], known: {prop: 1}, wyrd: true, wyrdInvoked: true}).cost, 0);
  const p = C.cantripPlan({art: 2, used: [{realm: "actor", level: 2}], known: {actor: 2}}, {targetBanality: 8, placeBanality: 9, higherTitle: true, freehold: true});
  assert.equal(p.difficulty, 10);
});

test("Nightmare dice: replace, never add; volunteering three; 10s and botches; Imbalance at 10 (p. 275)", () => {
  assert.equal(C.cantripPlan({art: 3, used: [{realm: "actor", level: 3}], known: {actor: 3}, nightmare: 8}).nightmareDice, 6);
  const v = C.cantripPlan({art: 3, used: [{realm: "actor", level: 3}], known: {actor: 3}, nightmare: 2}, {volunteer: true});
  assert.equal(v.nightmareDice, 5); assert.equal(v.difficulty, 7);
  assert.equal(C.cantripPlan({art: 1, used: [{realm: "actor", level: 1}], known: {actor: 1}, nightmare: 1}, {volunteer: true}).nightmareDice, 1, "needs three normal dice left");
  assert.equal(C.nightmareFrom([10, 3, 10, 10], 2, false), 1, "only the Nightmare dice count");
  assert.equal(C.nightmareFrom([1, 1], 0, true), 1);
  const r = C.addNightmare({nightmare: 9, imbalances: 2, willpower: 3}, 2);
  assert.deepEqual([r.nightmare, r.imbalances, r.glamourBack, r.bedlam], [0, 3, 1, true]);
});

test("Unleashing (pp. 196–197)", () => {
  assert.equal(C.unleashPlan({glamour: 4, nightmare: 2, glamourPool: 1}).ok, false);
  const p = C.unleashPlan({glamour: 4, nightmare: 2, glamourPool: 4});
  assert.deepEqual([p.dice, p.difficulty, p.nightmareAfter], [7, 7, 3]);
  assert.equal(C.unleashOutcome({successes: 2}, 3).result, "controlled");
  assert.equal(C.unleashOutcome({successes: 4}, 3).result, "wild");
  assert.equal(C.unleashOutcome({successes: 0}, 3).result, "failed");
  assert.equal(C.unleashOutcome({botch: true}, 3).imbalance, 1);
});

test("Banality: triggers, the 11th point, Undone, the Mists (pp. 144, 173–174, 258, 268–270)", () => {
  assert.equal(C.triggerOutcome({successes: 1}), 0); assert.equal(C.triggerOutcome({successes: 0}), 1); assert.equal(C.triggerOutcome({botch: true, ones: 3}), 3);
  assert.deepEqual(C.addBanality({rating: 3, points: 9}, 2), {rating: 4, points: 0, newDot: true});
  assert.deepEqual(C.addBanality({rating: 3, points: 9}, 7), {rating: 4, points: 0, newDot: true}, "never more than one dot");
  assert.equal(C.undone(10), true);
  assert.equal(C.mistsFor(0).effect, "perfect recall"); assert.equal(C.mistsFor(10).time, null); assert.equal(C.mistsFor(6).time, "a week");
  assert.equal(C.ownMists(5, 4), true); assert.equal(C.wyrdDifficulty(5, 3), 5);
  assert.deepEqual(C.startingTempers("childling"), {willpower: 4, glamour: 5, banality: 3});
  assert.deepEqual(C.startingTempers("grump"), {willpower: 5, glamour: 4, banality: 3});
});

test("Epiphany, sanctuary, cold iron, Bedlam (pp. 259–264, 274, 290–295)", () => {
  assert.equal(C.epiphany("reverie", {successes: 5}, {threshold: true}).dot, true);
  assert.equal(C.epiphany("reverie", {successes: 5}).dot, false);
  assert.equal(C.epiphany("rapture", {successes: 5}).refill, true);
  assert.equal(C.raptureDifficulty(5, 3), 8);
  assert.equal(C.epiphany("ravaging", {successes: 0}).banality, 1); assert.equal(C.epiphany("ravaging", {botch: true}).banalityDot, 1);
  assert.equal(C.epiphany("rhapsody", {successes: 3}).masterpiece, 6); assert.equal(C.epiphany("rhapsody", {successes: 0}, {invested: 3}).blockedMonths, 3);
  assert.equal(C.sanctuary(3, 4), 1); assert.equal(C.sanctuary(6, 2), 3);
  assert.equal(C.musingTime(3), "a week");
  assert.equal(C.COLD_IRON.glamourPerLevel, 1);
  assert.equal(Object.keys(C.BEDLAM).length, 7);
  assert.equal(C.spendIsImbalanced({temp: 5, perm: 5, imbalances: 1}), true); assert.equal(C.spendIsImbalanced({temp: 4, perm: 5, imbalances: 1}), false);
});

test("the inner voice for later changelings: Bedlam's road and Banality", () => {
  assert.equal(V.pressure("mists", {era: "c20", banality: 3, glamour: 4, willpower: 4}).level, "calm");
  assert.equal(V.pressure("mists", {era: "c20", banality: 3, glamour: 4, nightmare: 6, willpower: 4}).level, "stirring");
  assert.equal(V.pressure("mists", {era: "c20", banality: 3, glamour: 4, imbalances: 1, willpower: 4}).level, "rising");
  assert.equal(V.pressure("mists", {era: "c20", banality: 3, glamour: 4, imbalances: 3, willpower: 4}).level, "breaking");
});

test("wiring: Actions 3.9.0, the later-era fae menu, the cantrip button by era, gender-neutral text (B48)", () => {
  assert.match(JSON.parse(readFileSync(join(root, "modules/wodx-actions/module.json"), "utf8")).version, /^3\.(9|1\d)\./);
  const main = readFileSync(join(root, "modules/wodx-actions/scripts/main.js"), "utf8");
  assert.match(main, /FXD\.isDA\(a\) \? fx\(\)\.cast\(a\) : cx\(\)\.cantrip\(a\)/);
  const pm = readFileSync(join(root, "modules/wodx-actions/scripts/profile-menus.js"), "utf8");
  assert.match(pm, /api:c20Unleash/);
  const words = /\b(he|she|him|her|his|hers|himself|herself)\b/i;
  const src = readFileSync(join(root, "modules/wodx-actions/scripts/c20.js"), "utf8") + readFileSync(join(root, "modules/wodx-actions/scripts/c20-rules.js"), "utf8");
  const strings = src.match(/`[^`]*`|"[^"\n]{12,}"/g).join(" ").replace(/<[^>]+>/g, " ");
  assert.ok(!words.test(strings), strings.match(words)?.[0]);
});
