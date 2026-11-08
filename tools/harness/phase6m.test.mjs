import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* Phase 6m: mages of the later eras (WoDX Actions 3.11.0, Mage 20th) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const M = await import(join(root, "modules/wodx-actions/scripts/m20-rules.js"));

test("Arete is capped by permanent Willpower: dice and Spheres (p. 329, Zafira's example)", () => {
  assert.equal(M.castingDice(4, 5), 4);
  assert.equal(M.castingDice(5, 3), 3);
  const p = M.castPlan({arete: 5, willpower: 3, used: [{sphere: "forces", level: 4}], known: {forces: 4}});
  assert.equal(p.ok, false);
});

test("difficulty: the highest Sphere + 3, 4 or 5; modifiers net ±3, Quintessence among them; 3 to 10; past 10 needs successes (pp. 501–503)", () => {
  const a = M.castPlan({arete: 3, willpower: 5, used: [{sphere: "forces", level: 2}, {sphere: "prime", level: 1}], known: {forces: 3, prime: 2}, kind: "witnessed"});
  assert.deepEqual([a.dice, a.difficulty, a.highest], [3, 7, 2]);
  const b = M.castPlan({arete: 3, willpower: 5, used: [{sphere: "life", level: 1}], known: {life: 1}, mods: ["personal", "unique", "node"], quint: 3});
  assert.deepEqual([b.difficulty, b.net, b.capped], [3, -3, true]);
  const c = M.castPlan({arete: 5, willpower: 5, used: [{sphere: "time", level: 5}], known: {time: 5}, kind: "witnessed", mods: ["backwards"], need: 2});
  assert.deepEqual([c.difficulty, c.need, c.over], [10, 5, 3]);
  assert.equal(M.castPlan({arete: 3, willpower: 5, used: [{sphere: "life", level: 1}], known: {life: 1}, quint: 3, avatar: 2}).ok, false);
});

test("degrees of success; Paradox gained by the chart (pp. 502–503)", () => {
  assert.equal(M.degree({successes: 0, botch: true}, 2).key, "botch");
  assert.equal(M.degree({successes: 2}, 4).key, "partial");
  assert.equal(M.degree({successes: 4}, 4).key, "success");
  assert.equal(M.degree({successes: 7}, 4).key, "extraordinary");
  assert.deepEqual([M.paradoxGained("coincidental", 3, false), M.paradoxGained("vulgar", 3, false)], [0, 1]);
  assert.deepEqual([M.paradoxGained("coincidental", 3, true), M.paradoxGained("vulgar", 3, true), M.paradoxGained("witnessed", 3, true)], [3, 4, 8]);
});

test("damage and duration by successes; the kinds of harm (p. 504)", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(s => M.damage(s)), [0, 2, 6, 8, 10, 12]);
  assert.equal(M.damage(2, {forces: true}), 6);
  assert.equal(M.damage(15), 20);
  assert.equal(M.duration(2), "one scene");
  assert.equal(M.damageType({spheres: ["mind"]}), "bashing");
  assert.equal(M.damageType({spheres: ["forces"], fire: true}), "aggravated");
  assert.equal(M.damageType({spheres: ["entropy"]}), "lethal");
});

test("backlash bands, the Quiet, shedding, the wheel, countermagick (pp. 331, 506, 545, 549)", () => {
  assert.equal(M.backlash({botch: true}).discharge, "all");
  assert.equal(M.backlash({successes: 0}).discharge, 0);
  assert.equal(M.backlash({successes: 12}).band, "≤15");
  assert.equal(M.backlash({successes: 22}).band, "21+");
  assert.equal(M.quietLevel(5).level, 2);
  assert.equal(M.shed(4, 2), 2);
  assert.equal(M.shed(6, 2), 6);
  assert.deepEqual(M.wheel(15, 8), {quintessence: 12, paradox: 8});
  assert.deepEqual(M.counterPlan({arete: 3, willpower: 5}), {ok: true, dice: 3, difficulty: 7, quint: 0});
  assert.equal(M.counterPlan({arete: 3, willpower: 5, mode: "reflect", prime: 0, quint: 2}).ok, false);
  assert.equal(M.counterPlan({arete: 3, willpower: 5, mode: "reflect", prime: 1, quint: 2}).difficulty, 9);
});

test("experience and creation (pp. 250, 336)", () => {
  assert.deepEqual([M.xpCost("sphere", 0), M.xpCost("sphere", 2, {affinity: true}), M.xpCost("sphere", 2), M.xpCost("arete", 3)], [10, 14, 16, 24]);
  assert.equal(M.STARTING.spheres, 6);
});

test("wiring: the cast button routes later-era mages to Mage 20th; gender-neutral text (B48)", () => {
  const main = readFileSync(join(root, "modules/wodx-actions/scripts/main.js"), "utf8");
  assert.match(main, /MXD\.isDA\(a\) \? mx\(\)\.cast\(a\) : a\?\.type === "Mage"/);
  for ( const k of ["m20Cast", "m20Backlash", "m20Counter"] ) assert.match(main, new RegExp(`${k}: withActor`));
  const words = /\b(he|she|him|her|his|hers|himself|herself)\b/i;
  for ( const f of ["m20.js", "m20-rules.js"] ) {
    const src = readFileSync(join(root, "modules/wodx-actions/scripts", f), "utf8");
    for ( const s of src.match(/`[^`]*`|"[^"\n]*"/g) ?? [] ) assert.ok(!words.test(s), `${f}: ${s.slice(0, 80)}`);
  }
});
