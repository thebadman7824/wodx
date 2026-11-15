/* Drink, drugs, botched makings, Treasures, keepings and misleading looks act without the Storyteller's hand (B5012-B5016). */
import "./win-paths.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const load = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const U = await load("modules/wodx-library/scripts/use-rules.mjs");
const AR = await load("modules/wodx-actions/scripts/rules.js");
const X = await load("modules/wodx-library/scripts/examine-rules.mjs");
const IR = await load("modules/wodx-interactables/scripts/interact-rules.mjs");
const TR = await load("modules/wodx-storyteller/scripts/tasks-rules.mjs");

test("a state in the body becomes roll effects", () => {
  const d = U.intoxBites("drunk", {count: 5});
  assert.equal(d.length, 2);
  assert.deepEqual(d.map(b => b.duration.seconds), [3600, 7200]);
  assert.ok(d.every(b => b.dice === -1 && b.tags.includes("dexterity")));
  const h = U.intoxBites("hallucinogen", {rand: () => 0.99});
  assert.equal(h[0].dice, -3);
  assert.equal(U.intoxBites("hallucinogen", {rand: () => 0}, )[0].dice, -1);
  assert.equal(U.intoxBites("opiate", {scale: "weaker"})[0].dice, -1);
  assert.equal(U.intoxBites("opiate", {scale: "stronger"})[0].dice, -3);
  assert.equal(U.intoxBites("remedy", {wounded: true})[0].dice, 1);
  assert.deepEqual(U.intoxBites("remedy", {wounded: false}), []);
  assert.deepEqual(U.intoxBites("tobacco"), []);
  assert.ok(!/Storyteller/.test(U.STATES.hallucinogen.text + U.STATES.remedy.text + U.STRENGTH_TEXT.impure));
});

test("an impure batch and an unknown drug resolve on their own", () => {
  assert.equal(U.impureOutcome(1).key, "nothing");
  assert.equal(U.impureOutcome(10).key, "poison");
  assert.ok(U.UNKNOWN_KINDS.every(k => U.EFFECTS[k]));
  const s = src("modules/wodx-library/scripts/use.mjs");
  assert.ok(/trueKindOf\(item\)/.test(s) && /knowIt\(actor, item, kind\)/.test(s) && /addBite/.test(s));
  assert.ok(/remedyAt/.test(src("modules/wodx-storyteller/scripts/contagion.mjs")));
});

test("a drugged vessel reaches the vampire's rolls", () => {
  assert.equal(AR.vesselBites("drunk", 2).length, 2);
  assert.ok(AR.vesselBites("opiate").some(b => b.tags.includes("frenzy") && b.diff === -1));
  assert.deepEqual(AR.vesselBites("stimulant"), []);
  assert.ok(/vesselBites\(taint, pen\)/.test(src("modules/wodx-actions/scripts/main.js")));
});

test("a Treasure's components are stages with their own roll", () => {
  const t = TR.normTask({kind: "wonder", name: "x", attr: "perception", ability: "kenning", goal: 3, diff: 6,
    stages: [{name: "Find", goal: 3, attr: "perception", ability: "kenning", diff: 7}, {name: "Craft", goal: 10, attr: "dexterity", ability: "craft", diff: 6}]});
  assert.equal(TR.rollingAs(t).diff, 7);
  const t2 = TR.stepTask({...t, next: 0}, {successes: 3, botch: false}, 0);
  assert.equal(t2.stage, 1);
  assert.equal(TR.rollingAs(t2).attr, "dexterity");
  assert.equal(t2.status, "open");
});

test("talisman keepings fade and renew; botched looks mislead", async () => {
  const H = await load("modules/wodx-library/scripts/wonders-hedge.mjs");
  const seen = new Set(Array.from({length: 40}, (_, i) => H.keepingOf(`k${i}`)?.key ?? "none"));
  assert.ok(seen.has("none") && seen.size >= 4);
  const P = await load("modules/wodx-library/scripts/wonder-powers.mjs");
  const pl = P.plan({id: "keep", renew: 100}, {flag: {expires: 5}, now: 50});
  assert.equal(pl.item["flags.wodx-library.wonder.expires"], 150);
  assert.ok(X.falseNote({quality: "fine"}, null, () => 0).length > 5);
  assert.equal(IR.falseClue({texts: ["a"]}, [{texts: ["b", "deep lie"]}], () => 0), "deep lie");
  assert.ok(IR.FALSE_LEADS.includes(IR.falseClue({texts: []}, [], () => 0)));
  const M = await load("modules/wodx-library/scripts/wonders-mage.mjs");
  assert.equal(M.botchCost(10).paradox, 1);
});
