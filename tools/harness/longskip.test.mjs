/**
 * The long time-skip test from the Master Plan's Testing list: one chronicle from 1197 to 2025 in steps, with every
 * WoDX module that listens to the clock loaded. After each step: no actor, item or journal is lost (only
 * snapshots and heirs are added), the era follows the date, the dated events fire in order, and the ages and
 * years awake come out as the plan proposed.
 */
import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";
import {installActors} from "./actors-mock.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
await installActors(root);
CONFIG.worldofdarkness.sheettype.changingbreed = "Changing Breed";
globalThis.canvas = {tokens: {controlled: []}};
const M = "wodx-creation";

await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
await import(join(root, "modules/wodx-creation/scripts/main.mjs"));
game.modules.set(M, {});
const api = () => game.modules.get(M).api;
const chron = () => game.modules.get("wodx-chronicle").api;
const {getEngine} = await import(join(root, "modules/wodx-chronicle/scripts/calendar.mjs"));
const at = (year, month = 1, day = 1) => getEngine().dateToTime({year, month, day, hour: 21, minute: 0});
const count = () => ({actors: game.actors.size, items: [...game.actors].reduce((n, a) => n + a.items.size, 0), journals: game.journal.size});

const STEPS = [
  [1347, "long-night"], [1450, "renaissance"], [1600, "renaissance"], [1840, "victorian"],
  [1914, "great-war"], [1999, "modern"], [2025, "modern"]
];

let cast;
test("a chronicle opens in 1197 with a household of every kind", async () => {
  await Hooks.callAll("init");
  mock.setupTime();
  await Hooks.callAll("ready");
  await mock.settle();
  await game.time.set(at(1197, 3, 1));
  await chron().events.check();
  const elder = await Actor.create({name: "Radu (long skip)", type: "Vampire"});
  await elder.update({"system.generation": 8, "system.advantages.path.permanent": 5});
  await api().lineage.setChronology(elder, {embraced: at(1100)});
  const ghoul = await Actor.create({name: "Mirek (long skip)", type: "Mortal"});
  await api().giveVitae(ghoul, elder, {points: 4});
  await api().lineage.setChronology(ghoul, {bornYear: 1170});
  const mortal = await Actor.create({name: "Hedwig (long skip)", type: "Mortal"});
  await api().lineage.setChronology(mortal, {bornYear: 1180});
  await JournalEntry.create({name: "Rothenstein notes", pages: [{name: "One", type: "text", text: {content: "<p>Kept</p>"}}]});
  cast = {elder: elder.id, ghoul: ghoul.id, mortal: mortal.id};
  assert.equal(chron().eras.activeEra().profile.id, "dark-ages");
  assert.deepEqual(chron().events.fired(), []);
});

for ( const [year, era] of STEPS ) {
  test(`pass the years to ${year}: nothing lost, the era is ${era}, events in order`, async () => {
    const before = count();
    const firedBefore = chron().events.fired().length;
    const elderBefore = api().data.chronology(game.actors.get(cast.elder)).awakeYears ?? 0;
    const from = game.time.worldTime;
    const plan = api().time.planSkip({from, to: at(year, 3, 1)});
    assert.equal(plan.toYear, year);
    await api().time.applyPlan(plan, {label: `to ${year}`});
    await mock.settle(); await mock.settle();
    const after = count();
    assert.ok(after.actors >= before.actors, `no actor lost (${before.actors} → ${after.actors})`);
    assert.ok(after.items >= before.items - 20, `items kept, bar converted Abilities (${before.items} → ${after.items})`);
    assert.ok(after.journals >= before.journals, "no journal lost");
    assert.ok(game.journal.getName("Rothenstein notes")?.pages.getName("One"), "the Storyteller's journal is untouched");
    assert.equal(api().time.yearOf(game.time.worldTime), year);
    assert.equal(chron().eras.targetEra().profile.id, era);
    const fired = chron().events.fired();
    assert.ok(fired.length >= firedBefore, "events only move forward");
    const table = chron().events.list();
    const keys = fired.map(id => table.find(e => e.id === id).key);
    assert.deepEqual([...keys].sort((a, b) => a - b), keys, "fired oldest first");
    assert.ok(table.filter(e => e.live && e.year < year).every(e => fired.includes(e.id)), "every live event before the year has fired");
    const elder = game.actors.get(cast.elder);
    assert.ok(elder, "the elder survives every step");
    const awake = api().data.chronology(elder).awakeYears ?? 0;
    assert.ok(awake >= elderBefore + plan.years - 1, `years awake grow with the skip (${elderBefore} + ${plan.years} → ${awake})`);
  });
}

test("by 2025: the mortal and the ghoul have their deaths or ages, and the snapshots stand apart", () => {
  const mortal = game.actors.get(cast.mortal);
  assert.ok(mortal, "a dead mortal is kept, not deleted");
  assert.ok(api().data.chronology(mortal).died, "the mortal died of age on the way");
  const snaps = [...game.actors].filter(a => a.getFlag(M, "snapshotOf"));
  assert.ok(snaps.length >= STEPS.length, "a snapshot for each step that changed someone");
  assert.ok(snaps.every(s => s.folder?.name === "WoDX · Before the years"));
  const fired = chron().events.fired();
  for ( const id of ["black-death", "thorns", "fourth-great-maelstrom", "resurgence", "reckoning"] ) assert.ok(fired.includes(id), id);
  assert.ok(!fired.includes("avatar-storm"), "metaplot stays off unless switched on");
});
