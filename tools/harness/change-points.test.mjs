import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* B6779f: the dots a change leaves to spend are read by Spend experience: free dots on the rows they pay for */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CP = await import(pathToFileURL(join(root, "modules/wodx-rules/creation/change-points-rules.mjs")));
const SR = await import(pathToFileURL(join(root, "modules/wodx-rules/creation/states-rules.mjs")));
const TR = await import(pathToFileURL(join(root, "modules/wodx-rules/creation/totals-rules.mjs")));

test("every pool a change writes has a reader", () => {
  const writers = {
    chrysalis: (({arts, realms}) => ({arts, realms}))(SR.chrysalisStart({willpower: 3, seeming: "wilder", wilder: "glamour"})),
    fallen: SR.fallenStart({house: "devils", conscience: 2, courage: 2}).toSpend,
    secondBreath: SR.secondBreathStart({willpower: 4}).toSpend,
    wraith: TR.wraithStart({willpower: 4, memoriam: 2}).toSpend
  };
  for ( const [change, pools] of Object.entries(writers) ) for ( const k of Object.keys(pools) ) assert.ok(CP.POOLS[change]?.pools?.[k], `${change}.${k}`);
});

test("a dot from the Chrysalis buys an Art for nothing and counts down", () => {
  const flags = {chrysalis: {toSpend: {arts: 1, realms: 0}}};
  const art = {kind: "power", cat: "art", key: "item:a", current: 1, next: 2, cost: 4, ok: false, reason: "Needs 4 experience; 0 available"};
  const dot = CP.asChangeDot(art, flags);
  assert.equal(dot.cost, 0); assert.equal(dot.ok, true);
  assert.deepEqual(dot.fromChange, {change: "chrysalis", pool: "arts"});
  assert.equal(CP.asChangeDot({...art, cat: "realm"}, flags), null, "no Realm dots left");
  assert.deepEqual(CP.takeOne(flags, dot.fromChange), ["chrysalis.toSpend.arts", 0]);
  assert.equal(CP.asChangeDot({...art, ok: false, reason: "Already at the most this character can have (5)"}, flags).ok, false);
});

test("a Kuei-jin's Chi dots go on Yin or Yang, its Disciplines on a new one too; a wraith's Passions are counted by hand", () => {
  const f = {secondBreath: {toSpend: {chi: 4, disciplines: 3}}, wraith: {toSpend: {passions: 10, arcanoi: 5}}};
  assert.ok(CP.poolFor({kind: "stat", key: "yin"}, f));
  assert.equal(CP.poolFor({kind: "stat", key: "hun"}, f), null);
  assert.ok(CP.poolFor({kind: "newDiscipline"}, f));
  assert.equal(CP.changePools(f).find(p => p.pool === "passions").byHand, true);
});

test("Spend experience and the spend read the pools", () => {
  const apps = readFileSync(join(root, "modules/wodx-creation/scripts/apps.mjs"), "utf8");
  const xp = readFileSync(join(root, "modules/wodx-creation/scripts/xp.mjs"), "utf8");
  assert.match(apps, /CP\.changePools\(/); assert.match(apps, /data-action="buyChange"/);
  assert.match(xp, /purchase\?\.fromChange \? changeDot/); assert.match(xp, /CP\.takeOne\(/);
});
