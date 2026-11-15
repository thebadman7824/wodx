/* Merits and flaws that bite by themselves (B4879). */
import "./win-paths.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const load = p => import(pathToFileURL(join(root, p)));
const TB = await load("modules/wodx-chronicle/scripts/trait-bite-rules.mjs");
const TE = await load("modules/wodx-chronicle/data/trait-effects.mjs");
const TR = await load("modules/wodx-chronicle/scripts/trait-rules.mjs");

test("every bite belongs to a trait that has a moment", () => {
  for (const k of Object.keys(TB.BITES)) assert.ok(TE.PROMPTS[k], k);
});

test("every timed bite reaches real roll tags", () => {
  const known = new Set(TR.rollTags(...Object.values(TB.BITES).flatMap(b => [...(b.fail?.tags ?? []), ...(b.fail?.else?.tags ?? [])])));
  for (const [k, b] of Object.entries(TB.BITES)) for (const t of b.fail?.tags ?? b.fail?.else?.tags ?? []) assert.ok(t === "all" || known.has(t), `${k}: ${t}`);
});

test("rolls and outcomes", () => {
  assert.deepEqual(TB.count([7, 8, 1, 3], 7), { successes: 1, raw: 2, botch: false });
  assert.equal(TB.count([1, 2], 7).botch, true);
  assert.equal(TB.outcome(TB.biteOf("impatient"), { successes: 1 }).held, true);
  assert.equal(TB.outcome(TB.biteOf("impatient"), { successes: 0 }).held, false);
  assert.equal(TB.outcome(TB.biteOf("hatred"), { raw: 4 }).frenzy, true);
  assert.equal(TB.outcome(TB.biteOf("hatred"), { raw: 3 }).frenzy, false);
});

test("bite effects apply to the rolls they name", () => {
  const list = [{ name: "Guilt", tags: ["all"], diff: 1 }, { name: "Out of patience", tags: ["social"], diff: 1 }];
  assert.equal(TB.biteEffects(list, ["melee"]).length, 1);
  assert.equal(TB.biteEffects(list, ["social"]).length, 2);
  assert.equal(TR.sumEffects(TB.biteEffects(list, ["social"])).diff, 2);
});

test("the approval handler lands the bite", () => {
  const s = readFileSync(join(root, "modules/wodx-chronicle/scripts/traits.mjs"), "utf8");
  assert.match(s, /await bite\(a, x, d\)/);
  assert.match(s, /addSource\(biteSource\)/);
});
