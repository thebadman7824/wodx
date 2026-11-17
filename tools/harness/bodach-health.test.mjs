/* B6922: a Bodach's Deadly Exposure (C20 p. 373): two fewer health levels, read by WoDX Combat's health track. */
import "./win-paths.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {join, dirname} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const load = p => import(pathToFileURL(join(root, p)));
const S = await load("modules/wodx-chronicle/scripts/signature-rules.mjs");
const R = await load("modules/wodx-combat/scripts/rules.js");
const row = k => S.faeRows({kith: [k]})[0];
const lvl = (value, penalty) => ({value, total: value, penalty, label: "x"});
const track = dmg => ({system: {health: {bruised: lvl(1, 0), hurt: lvl(1, -1), injured: lvl(1, -1), wounded: lvl(1, -2), mauled: lvl(1, -2), crippled: lvl(1, -5), incapacitated: lvl(1, 0),
  damage: {bashing: dmg, lethal: 0, aggravated: 0, woundpenalty: 0}}, traits: {health: {totalhealthlevels: {max: 7, value: 7}}}}});

test("B6922: the Bodach row gives two fewer health levels; other kiths none", () => {
  assert.deepEqual(S.faeFewer([row("wod.bio.changeling.bodachs")]), {n: 2, names: ["Bodachs (Thallain)"]});
  assert.equal(S.faeFewer([row("wod.bio.changeling.boggans")]).n, 0);
  assert.equal(S.faeFewer([row("wod.bio.changeling.rockgiants")]).n, 0);
});

test("B6922: fewer levels come off Hurt and Injured, so two bashing levels already wound at -2", () => {
  assert.deepEqual(R.fewerCuts({bruised: 1, hurt: 1, injured: 1, wounded: 1, mauled: 1, crippled: 1, incapacitated: 1}, 2), {hurt: 1, injured: 1});
  const t = R.applyBodyTotals(track(2), {bruised: 0, fewer: 2});
  assert.equal(t.system.health.hurt.total, 0);
  assert.equal(t.system.health.injured.total, 0);
  assert.equal(t.system.traits.health.totalhealthlevels.max, 5);
  assert.equal(t.system.health.damage.woundpenalty, -2, "Bruised then Wounded");
  const d = R.applyBodyDerived(track(1), {bruised: 0, shift: 0, ease: 0, fewer: 2});
  assert.equal(d.system.traits.health.totalhealthlevels.max, 5);
  R.applyBodyDerived(d, {bruised: 0, shift: 0, ease: 0, fewer: 2});
  assert.equal(d.system.traits.health.totalhealthlevels.max, 5, "a second prepare takes nothing more");
  assert.equal(R.mergeBody({bruised: 0, fewer: 2, names: []}, {bruised: 1, names: []}).fewer, 2);
});

test("B6922: Chronicle's toughness carries the kith's fewer levels and Combat's own track reads them", () => {
  const traits = readFileSync(join(root, "modules/wodx-chronicle/scripts/traits.mjs"), "utf8");
  assert.match(traits, /fewerFor\(actor\)/);
  const main = readFileSync(join(root, "modules/wodx-combat/scripts/main.js"), "utf8");
  assert.match(main, /R\.fewerCuts\(totals, body\.fewer\)/);
});
