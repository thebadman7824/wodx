import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* What a made supernatural item does when used: powers, pools, charges, drawbacks, transfers, worn bonuses (B3690-B3692) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const P = await import(pathToFileURL(join(root, "modules/wodx-library/scripts/wonder-powers.mjs")));
const src = p => readFileSync(join(root, p), "utf8");
const POOL = "item:flags.wodx-library.wonder.pool.value";

test("wonder powers: V20 successes, ones cancel, botch only with no successes", () => {
  assert.deepEqual(P.countSuccesses([7, 8, 1, 3], 6).successes, 1);
  assert.equal(P.countSuccesses([2, 3, 1], 6).botch, true);
  assert.equal(P.countSuccesses([6, 1], 6).botch, false);
  assert.equal(P.countSuccesses([10, 10], 11).diff, 10);
});

test("wonder powers: spending from the item's pool, then spent when empty", () => {
  const flag = {pool: {label: "blood points", value: 1, max: 1}, emptySpent: true,
    powers: [{id: "release", label: "Release the vitae", spend: {pool: "item", amount: 1}, transfer: null}]};
  const p = P.powerOf(flag, "release");
  assert.deepEqual(P.blockersOf(p, {flag, values: {[POOL]: 1}}), []);
  const out = P.plan(p, {flag, values: {[POOL]: 1}});
  assert.equal(out.item["flags.wodx-library.wonder.pool.value"], 0);
  assert.equal(out.item["flags.wodx-library.wonder.spent"], true);
  assert.equal(out.undo.item["flags.wodx-library.wonder.pool.value"], 1);
  assert.match(P.blockersOf(p, {flag, values: {[POOL]: 0}}).join(), /needs 1 blood points/);
});

test("wonder powers: a drawback goes on the actor, capped, and is undone", () => {
  const flag = {powers: [{id: "v", label: "Vulgar effect", roll: {dice: 3, diff: 6}, drawback: {path: "system.paradox.temporary", amount: 1, label: "1 Paradox."}}]};
  const p = P.powerOf(flag, "v");
  const out = P.plan(p, {flag, values: {"actor:system.paradox.temporary": 20}, roll: {successes: 2, botch: false}});
  assert.equal(out.actor["system.paradox.temporary"], 20);
  assert.equal(out.undo.actor["system.paradox.temporary"], 20);
  const out2 = P.plan(p, {flag, values: {"actor:system.paradox.temporary": 3}, roll: {successes: 1}});
  assert.equal(out2.actor["system.paradox.temporary"], 4);
  assert.deepEqual(P.pathsOf(p), ["system.paradox.temporary"]);
});

test("wonder powers: transfer out of a periapt and back, with a need and room", () => {
  const flag = {pool: {label: "Quintessence", value: 5, max: 10},
    powers: [{id: "draw", label: "Draw Quintessence", transfer: {from: "item", to: "actor:system.quintessence.temporary", amount: 3, need: {path: "system.spheres.prime.value", min: 2}}, back: {label: "Pour it back"}}]};
  const list = P.powersOf(flag);
  assert.deepEqual(list.map(p => p.id), ["draw", "draw~back"]);
  const vals = {[POOL]: 5, "actor:system.quintessence.temporary": 1, "actor:system.spheres.prime.value": 1};
  assert.ok(P.blockersOf(list[0], {flag, values: vals}).length, "Prime 1 is too low");
  vals["actor:system.spheres.prime.value"] = 2;
  const out = P.plan(list[0], {flag, values: vals});
  assert.equal(out.item["flags.wodx-library.wonder.pool.value"], 2);
  assert.equal(out.actor["system.quintessence.temporary"], 4);
  const back = P.plan(list[1], {flag, values: {[POOL]: 9, "actor:system.quintessence.temporary": 4, "actor:system.spheres.prime.value": 2}});
  assert.equal(back.item["flags.wodx-library.wonder.pool.value"], 10, "fills only to the pool's max");
  assert.equal(back.actor["system.quintessence.temporary"], 3);
});

test("wonder powers: charges, one-use items, per-power uses, Storyteller-only powers", () => {
  const flag = {uses: {value: 1, max: 3}, powers: [{id: "a", label: "A", uses: 2}, {id: "g", label: "G", gm: true}]};
  const out = P.plan(P.powerOf(flag, "a"), {flag, values: {}});
  assert.equal(out.item["flags.wodx-library.wonder.uses.value"], 0);
  assert.equal(out.spent, true);
  assert.equal(out.item["flags.wodx-library.wonder.used.a"], 1);
  assert.match(P.blockersOf(P.powerOf({...flag, used: {a: 2}}, "a"), {flag: {...flag, used: {a: 2}}}).join(), /used up/);
  assert.match(P.blockersOf(P.powerOf(flag, "g"), {flag, isGM: false}).join(), /Storyteller/);
  assert.deepEqual(P.blockersOf(P.powerOf(flag, "g"), {flag, isGM: true}), []);
  assert.equal(P.plan({id: "x", label: "X"}, {flag: {oneUse: true}}).spent, true);
});

test("wonder powers: worn bonuses use the system's attribute_buff bonuslist and leave other entries", () => {
  const flag = {name: "Amulet", worn: [{attr: "strength", value: 2}]};
  const other = {name: "Other", type: "soak_buff", value: 1, isactive: true};
  const on = P.wornList(flag, true, [other]);
  assert.equal(on.length, 2);
  assert.deepEqual([on[1].type, on[1].settingtype, on[1].value, on[1].isactive], ["attribute_buff", "strength", 2, true]);
  const off = P.wornList(flag, false, on);
  assert.equal(off.length, 2);
  assert.equal(off[1].isactive, false);
  assert.equal(P.wornList({...flag, spent: true}, true)[0].isactive, false);
  assert.deepEqual(P.setPool({pool: {value: 1, max: 4}}, 9), {"flags.wodx-library.wonder.pool.value": 4});
});

test("wonder powers: the Use window and Library main are wired", () => {
  const use = src("modules/wodx-library/scripts/use.mjs"), main = src("modules/wodx-library/scripts/main.mjs");
  assert.match(use, /WU\.powerKeys\(item\)/);
  assert.match(use, /return WU\.runPower\(item, ability, actor\)/);
  assert.match(main, /setupWonderUse\(\)/);
  assert.match(src("modules/wodx-library/scripts/wonder-use.mjs"), /preUpdateItem/);
});
