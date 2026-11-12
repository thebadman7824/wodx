import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SW = await import(join(root, "modules/wodx-storyteller/scripts/siege-works-rules.mjs"));
const B = await import(join(root, "modules/wodx-storyteller/scripts/battle-rules.mjs"));

/** Dice that always show one face. */
const always = f => k => Array(k).fill(f);
/** A seeded die. */
function seeded(seed = 7) {
  let s = seed >>> 0;
  return k => Array.from({length: k}, () => { s = (s * 1664525 + 1013904223) >>> 0; return 1 + (s % 10); });
}
const ctx = (over = {}) => ({ageId: "feudal", men: [3000, 400], works: [5, 4], morale: [5, 5], storesLeft: 30, worksSuccesses: 0, ...over});
const siege = (campaign, over = {}) => B.normBattle({id: "s1", kind: "siege", name: "The siege of Rothenstein", year: 1250,
  sides: [{name: "The Margrave's host", men: 3000, quality: 3}, {name: "The castle", men: 400, quality: 3, position: "castle", defends: true, stores: 30}], campaign, ...over});

test("the tables: every engine and wall has its numbers, and every year has engines and walls to use", () => {
  for ( const [id, e] of Object.entries(SW.ENGINES) ) {
    assert.ok(e.label && e.damage > 0 && e.diff >= 0 && e.from <= e.to, id);
  }
  for ( const [id, w] of Object.entries(SW.WALLS) ) assert.ok(w.label && w.soak > 0 && w.health > 0, id);
  for ( let y = 1197; y <= 2100; y += 13 ) {
    const ranged = SW.enginesFor(y).filter(e => !e.contact);
    assert.ok(ranged.length, `no engine that shoots in ${y}`);
    assert.ok(SW.wallsFor(y).length, `no walls in ${y}`);
  }
  // the book's figures (Spoils of War p. 33-34)
  assert.equal(SW.ENGINES.trebuchet.damage, 15);
  assert.equal(SW.ENGINES.trebuchet.diff, 1);
  assert.equal(SW.WALLS.heavyWall.soak, 12);
  assert.equal(SW.WALLS.heavyWall.health, 30);
  assert.equal(SW.WALLS.largeKeep.health, 50);
  // no star fort in 1250, no bombard before the first guns, the railgun only on the Future Darkness branch
  assert.ok(!SW.wallsFor(1250).some(w => w.id === "bastion"));
  assert.ok(SW.wallsFor(1600).some(w => w.id === "bastion"));
  assert.ok(!SW.enginesFor(1250).some(e => e.id === "bombard"));
  assert.ok(SW.enginesFor(1420).some(e => e.id === "bombard"));
  assert.ok(!SW.enginesFor(2040).some(e => e.id === "railgun"));
  assert.ok(SW.enginesFor(2040, "future").some(e => e.id === "railgun"));
  assert.ok(!SW.supplyLinesFor(1250).some(s => s.id === "rail"));
  assert.ok(SW.supplyLinesFor(1870).some(s => s.id === "rail"));
  assert.equal(SW.chargeDice("feudal"), 0);
  assert.equal(SW.chargeDice("pike"), 2);
  assert.equal(SW.chargeDice("trench"), 4);
});

test("a campaign is null until set up; a fresh one takes its walls from where the garrison stands", () => {
  assert.equal(SW.normCampaign(null), null);
  assert.equal(siege(undefined).campaign, null);
  assert.equal(SW.blankCampaign(siege()).wall.type, "heavyWall");
  assert.equal(SW.blankCampaign(siege(null, {sides: [{}, {position: "town", defends: true}]})).wall.type, "mediumWall");
  // the battle keeps its campaign through normBattle
  const b = siege(SW.blankCampaign(siege()));
  assert.equal(b.campaign.wall.type, "heavyWall");
  assert.equal(B.normBattle(b).campaign.wall.type, "heavyWall");
  // a field battle has none
  assert.equal(B.normBattle({kind: "field"}).campaign, null);
});

test("foraging: successes times foragers are man-days; a short week eats the camp's stores, then hunger", () => {
  const c = SW.normCampaign({forage: {on: true, foragers: 300, pool: 5, difficulty: 6}, stores0: 10});
  const rich = SW.campaignWeek(c, ctx(), always(10));
  // 14 rolls of 5 dice, all successes: 70 x 300 = 21,000 man-days against a need of 21,000
  assert.equal(rich.fed[0], true);
  assert.equal(rich.stores0, 10);
  assert.equal(rich.resolveLost[0], 0);
  const lean = SW.campaignWeek(c, ctx(), always(2));
  assert.equal(lean.fed[0], true, "no food found: the camp eats a week of its 10 days of stores");
  assert.equal(lean.stores0, 3);
  const poor = SW.campaignWeek({...c, stores0: 3}, ctx(), always(2));
  assert.equal(poor.fed[0], false, "3 days of stores against a week's need leaves them short");
  assert.equal(poor.stores0, 0);
  assert.equal(poor.resolveLost[0], 1);
  // a supply line carries its share without foraging
  const rail = SW.campaignWeek(SW.normCampaign({supplyLine: "rail", stores0: 5}), ctx(), always(2));
  assert.equal(rail.fed[0], true);
  assert.equal(rail.stores0, 5);
  // no supply set: a week of stores is eaten
  const bare = SW.campaignWeek(SW.normCampaign({stores0: 20}), ctx(), always(2));
  assert.equal(bare.stores0, 13);
});

test("keeping order: 1, 2 or 4 successes by pay and supply; each short is +1 to every army roll", () => {
  const c = SW.normCampaign({order: {on: true, supply: ["normal", "poor"]}, stores0: 30});
  const ok = SW.campaignWeek(c, ctx(), always(10));
  assert.deepEqual(ok.unrest, [0, 0]);
  const bad = SW.campaignWeek(c, ctx(), always(3));
  assert.deepEqual(bad.unrest, [2, 4]);
  // by how they were fed: a hungry garrison keeps order as poorly supplied
  const auto = SW.campaignWeek(SW.normCampaign({order: {on: true, paid: [true, false]}, stores0: 30}), ctx({storesLeft: 0}), always(3));
  assert.deepEqual(auto.unrest, [1, 4]);
  // unrest adds to the difficulty of a side's rolls
  const s = B.normSide({unrest: 2, sick: 1});
  assert.equal(B.difficultyFor(s), 9);
});

test("a mine: planned, dug in yards by the ground, fired under the walls for 3 levels a success, not soaked", () => {
  let c = SW.normCampaign({wall: {type: "heavyWall"}, mine: {distance: 100, ground: "fair", pool: 5}, stores0: 60});
  let w = SW.campaignWeek(c, ctx(), always(10));
  assert.equal(w.campaign.mine.state, "digging");
  assert.equal(w.campaign.mine.plan, 5);
  c = w.campaign;
  // 5 successes x 25 yards reach the walls in one week, and the mine fires: 5 works + 5 planning dice, all hits
  w = SW.campaignWeek(c, ctx(), always(10));
  assert.equal(w.campaign.mine.state, "fired");
  assert.equal(w.campaign.mine.damage, 30);
  assert.equal(w.campaign.wall.damage, 30);
  assert.equal(w.breachAdd, 8, "30 levels bring a heavy wall (30) down: the whole breach clock");
  // rock: 10 yards a success
  const rock = SW.campaignWeek(SW.normCampaign({mine: {distance: 200, ground: "rock", pool: 3, state: "digging", plan: 1}, stores0: 60}), ctx(), always(10));
  assert.equal(rock.campaign.mine.dug, 30);
  // a botch brings part of it down
  const fall = SW.campaignWeek(SW.normCampaign({mine: {distance: 400, ground: "packed", pool: 3, state: "digging", plan: 1, dug: 200}, stores0: 60}), ctx(), always(1));
  assert.equal(fall.campaign.mine.dug, 150);
  // gunpowder adds dice from the first guns
  const pike = SW.campaignWeek(SW.normCampaign({wall: {type: "bastion"}, mine: {distance: 25, ground: "fair", pool: 1, state: "digging", plan: 1}, stores0: 60}), ctx({ageId: "pike"}), always(10));
  assert.equal(pike.campaign.mine.damage, (5 + 1 + 2) * 3);
});

test("countermining: the garrison hears a mine at 2 for every 10 yards, digs to meet it and breaks it", () => {
  // a mine 30 yards out after the week: the last days are heard at difficulty 6 or less
  const c = SW.normCampaign({mine: {distance: 100, ground: "packed", pool: 2, state: "digging", plan: 1, dug: 20}, counter: {watch: true, watchPool: 3, pool: 3}, stores0: 60});
  // first draws: the dig (2 dice of 7: 2 successes = 100 yards would reach; use a mixed die)
  const dice = always(7);
  const w = SW.campaignWeek({...c, mine: {...c.mine, distance: 150}}, ctx(), dice);
  assert.equal(w.campaign.mine.detected, true);
  const heard = w.report.find(r => r.who === 1 && /hears/.test(r.text));
  assert.ok(heard, "the garrison hears it");
  assert.match(heard.dice, /difficulty (\d+)/);
  assert.ok(Number(heard.dice.match(/difficulty (\d+)/)[1]) <= 7);
  // a mine too far off is not heard: 70 yards is past difficulty 10
  const far = SW.campaignWeek(SW.normCampaign({mine: {distance: 500, ground: "rock", pool: 1, state: "digging", plan: 1, dug: 0}, counter: {watch: true, watchPool: 10}, stores0: 60}), ctx(), always(10));
  assert.equal(far.campaign.mine.detected, false);
  // once heard, the countermine goes out to meet it and breaks it
  const met = SW.campaignWeek(SW.normCampaign({mine: {distance: 200, ground: "fair", pool: 1, state: "digging", plan: 1, dug: 150, detected: true}, counter: {pool: 4, fast: true}, stores0: 60}), ctx(), always(10));
  assert.equal(met.campaign.mine.state, "broken");
  // without shoring, a failed week brings the countermine down
  const fail = SW.campaignWeek(SW.normCampaign({mine: {distance: 400, ground: "fair", pool: 1, state: "digging", plan: 1, dug: 10, detected: true}, counter: {pool: 4, fast: true, dug: 40}, stores0: 60}), ctx(), always(3));
  assert.equal(fail.campaign.counter.dug, 0);
});

test("engines: materials, then putting together, then they shoot at the walls' soak; a ditch keeps rams back", () => {
  let c = SW.normCampaign({wall: {type: "lightWall"}, engines: [{type: "trebuchet"}], craftPool: 5, stores0: 60});
  let w = SW.campaignWeek(c, ctx(), always(10));
  assert.equal(w.campaign.engines[0].stage, "assemble");
  w = SW.campaignWeek(w.campaign, ctx({works: [15, 4]}), always(10));
  assert.equal(w.campaign.engines[0].stage, "ready");
  // a botch wrecks it
  const wreck = SW.campaignWeek(SW.normCampaign({engines: [{type: "mangonel"}], stores0: 60}), ctx(), always(1));
  assert.equal(wreck.campaign.engines.length, 0);
  // ready engines shoot each day; with every die a 10 the soak takes 2 per success
  const ready = SW.normCampaign({wall: {type: "lightWall"}, engines: [{type: "trebuchet", stage: "ready"}], stores0: 60});
  const shot = SW.campaignWeek(ready, ctx(), always(10));
  // attack 5 successes, damage 15 + 4 = 19 dice, soak 7 x 2 = 14: 5 a day for 7 days
  assert.equal(shot.campaign.wall.damage, 35);
  assert.equal(shot.breachAdd, 8);
  // a ram waits behind a ditch; the works fill the ditch first
  const ram = SW.normCampaign({wall: {type: "lightWall", moat: true}, engines: [{type: "ram", stage: "ready"}], stores0: 60});
  const r1 = SW.campaignWeek(ram, ctx({worksSuccesses: 2}), always(10));
  assert.equal(r1.campaign.wall.damage, 0);
  assert.equal(r1.worksToMoat, 2);
  assert.equal(r1.campaign.wall.moatFill, 2);
  const r2 = SW.campaignWeek(r1.campaign, ctx({worksSuccesses: 3}), always(10));
  assert.equal(r2.campaign.wall.moatFill, SW.MOAT_FILL);
  assert.ok(!r2.report.some(x => /ditch keeps/.test(x.dice)), "the ditch is filled, the ram reaches the walls");
  assert.ok(r1.report.some(x => /ditch keeps/.test(x.dice)));
});

test("the walls' damage fills the breach clock in proportion", () => {
  assert.equal(SW.segmentsFor(0, 30), 0);
  assert.equal(SW.segmentsFor(15, 30), 4);
  assert.equal(SW.segmentsFor(29, 30), 7);
  assert.equal(SW.segmentsFor(60, 30), 8);
});

test("a week of siege with its campaign: merged into the step, and Undo takes the campaign back", () => {
  const b0 = siege(SW.normCampaign({wall: {type: "lightWall"}, order: {on: true, supply: ["poor", "normal"]}, engines: [{type: "trebuchet", stage: "ready"}], stores0: 30}));
  const age = B.ageFor(1250);
  const step = B.settleWeek(b0, age, {successes: 1, botch: false, faces: [8, 3, 2]}, [{successes: 1}, {successes: 1}]);
  const camp = SW.campaignWeek(b0.campaign, ctx(), always(10));
  const merged = SW.mergeWeek(b0, step, camp);
  assert.ok(merged.breach >= step.breach);
  assert.equal(merged.phase.campBefore.wall.damage, 0);
  const b1 = B.applyStep(b0, merged, 100);
  assert.ok(b1.campaign.wall.damage > 0);
  assert.deepEqual(b1.sides.map(s => s.unrest), [0, 0]);
  const stored = B.normBattle(b1);
  assert.equal(stored.campaign.wall.damage, b1.campaign.wall.damage);
  const back = B.undoAny(stored);
  assert.equal(back.campaign.wall.damage, 0);
  assert.equal(back.breach, 0);
  assert.equal(back.weeks, 0);
  // unrest set by a bad week is taken back too
  const camp2 = SW.campaignWeek(b0.campaign, ctx(), always(3));
  const b2 = B.applyStep(b0, SW.mergeWeek(b0, B.settleWeek(b0, age, {successes: 0}, [null, null]), camp2), 100);
  assert.deepEqual(b2.sides.map(s => s.unrest), [4, 2]);
  assert.deepEqual(B.undoAny(B.normBattle(b2)).sides.map(s => s.unrest), [0, 0]);
  // and it counts against the next week's works
  assert.equal(B.siegeSetup(b2, age).difficulty, Math.min(10, B.siegeSetup(b0, age).difficulty + 4));
  assert.equal(B.difficultyFor(b2.sides[0]), 10);
});

test("a long siege with every part on runs a year of weeks without breaking its numbers", () => {
  const draw = seeded(11);
  let b = siege(SW.normCampaign({wall: {type: "heavyWall", moat: true}, order: {on: true}, forage: {on: true, foragers: 200, pool: 5, difficulty: 7},
    supplyLine: "wagons", engines: [{type: "trebuchet"}, {type: "ram"}], mine: {distance: 150, ground: "fair", pool: 5}, counter: {watch: true, watchPool: 4, pool: 4}, stores0: 21}));
  const age = B.ageFor(1250);
  for ( let k = 0; k < 52 && !b.over; k++ ) {
    const f = draw(5), r = {successes: f.filter(x => x >= 7).length, botch: false, faces: f};
    const step = B.settleWeek(b, age, r, [{successes: 1}, {successes: 1}]);
    const camp = SW.campaignWeek(b.campaign, {...ctx(), men: b.sides.map(s => s.men), storesLeft: step.sides[1].stores, worksSuccesses: r.successes}, draw);
    b = B.normBattle(B.applyStep(b, SW.mergeWeek(b, step, camp), k));
    assert.ok(b.breach >= 0 && b.breach <= 8);
    assert.ok(b.sides.every(s => s.resolve >= 0 && s.unrest >= 0 && s.unrest <= 4));
    assert.ok(b.campaign.stores0 >= 0 && b.campaign.wall.damage >= 0);
    assert.ok(b.phases.at(-1).camp.every(x => typeof x.text === "string" && x.text.length));
  }
  assert.ok(b.weeks > 0);
});
