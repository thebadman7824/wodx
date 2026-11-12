import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const B = await import(join(root, "modules/wodx-storyteller/scripts/battle-rules.mjs"));
const F = await import(join(root, "modules/wodx-npc/scripts/faction-rules.mjs"));
const L = await import(join(root, "modules/wodx-chronicle/scripts/legends-rules.mjs"));

const field = (over = {}) => B.normBattle({id: "b1", name: "The fight at the ford", place: "Brno ford", year: 1420,
  sides: [{name: "Crusaders", men: 2000, quality: 4}, {name: "Hussites", men: 1500, quality: 3, position: "works", defends: true}], ...over});

test("every year from 1197 to the far future has an age of war, and the ages follow each other", () => {
  for ( let y = 1197; y <= 2100; y += 7 ) {
    const a = B.ageFor(y);
    assert.ok(a?.label, `no age for ${y}`);
    assert.ok(y >= a.from && y <= a.to, `${y} falls outside ${a.id}`);
  }
  assert.equal(B.ageFor(1250).id, "feudal");
  assert.equal(B.ageFor(1420).id, "hussite");
  assert.equal(B.ageFor(1620).id, "pike");
  assert.equal(B.ageFor(1805).id, "columns");
  assert.equal(B.ageFor(1866).id, "rifle");
  assert.equal(B.ageFor(1916).id, "trench");
  assert.equal(B.ageFor(1943).id, "armour");
  assert.equal(B.ageFor(2010).id, "network");
  // the Future Darkness branch has its own age after 2025; the classic line keeps the network age
  assert.equal(B.ageFor(2040, {branch: "future"}).id, "future");
  assert.equal(B.ageFor(2040, {branch: "classic"}).id, "network");
  assert.equal(B.ageFor(1100).id, "feudal");
  // wars outside the living world
  assert.equal(B.ageFor(1600, {realm: "underworld"}).id, "underworld");
  assert.equal(B.ageFor(1600, {realm: "umbra"}).guns, false);
  // the ages cover 1197 to 2025 with no gap or overlap
  const classic = B.AGES.filter(a => !a.branch);
  for ( let i = 1; i < classic.length; i++ ) assert.equal(classic[i].from, classic[i - 1].to + 1, `${classic[i].id} does not follow ${classic[i - 1].id}`);
});

test("size steps, positions by year, and walls that guns can breach", () => {
  assert.equal(B.sizeStep(8), 1);
  assert.equal(B.sizeStep(100), 2);
  assert.equal(B.sizeStep(101), 3);
  assert.equal(B.sizeStep(250000), 6);
  const ids = y => B.positionsFor(y).map(p => p.id);
  assert.ok(!ids(1300).includes("starfort"));
  assert.ok(ids(1600).includes("starfort"));
  assert.ok(!ids(1900).includes("bunker"));
  assert.ok(ids(1940).includes("bunker"));
  assert.equal(B.positionBonus("castle", B.ageFor(1300)), 3);
  assert.equal(B.positionBonus("castle", B.ageFor(1450)), 2, "old walls count for less once guns arrive");
  assert.equal(B.positionBonus("starfort", B.ageFor(1650)), 3);
  assert.equal(B.positionBonus("castle", B.ageFor(1300), {breached: true}), 1);
});

test("a battle is cleaned: two sides, the second defends, resolve from quality and position", () => {
  const b = B.normBattle({sides: [{men: -5, quality: 9}, {}]});
  assert.equal(b.kind, "field");
  assert.equal(b.sides[0].men, 1);
  assert.equal(b.sides[0].quality, 5);
  assert.equal(b.sides[1].defends, true);
  assert.equal(b.sides[0].resolve, 8);
  const f = field();
  assert.equal(f.sides[1].resolve, 3 + 3 + 1, "field works steady the defenders");
  assert.deepEqual(B.normBattles({list: [f, null, "x"]}).list.map(x => x.id), ["b1"]);
});

test("commander rolls: difficulty 6 plus disease, the heavier side's extra dice, wavering and being demoralised", () => {
  assert.equal(B.difficultyFor({sick: 0}), 6);
  assert.equal(B.difficultyFor({sick: 2}), 8);
  const b = B.normBattle({sides: [{men: 5000, quality: 4, commander: {pool: 5, morale: 3}}, {men: 500, quality: 3, commander: {pool: 5}}]});
  const age = B.ageFor(1250);
  const s = B.phaseSetup(b, age);
  assert.equal(s[0].weight, 4 + 4);
  assert.equal(s[1].weight, 3 + 3);
  assert.equal(s[0].pool, 5 + 2, "two points heavier, two more dice");
  assert.equal(s[1].pool, 5);
  assert.equal(s[0].difficulty, 6);
  assert.equal(B.phaseSetup(b, age, {extra: [2, 0]})[0].pool, 9);
  const shaken = {...b, sides: [{...b.sides[0], penalty: 2, lostUnits: 5}, b.sides[1]]};
  assert.equal(B.demoralised(shaken.sides[0]), 2, "5 units lost past a morale of 3");
  assert.equal(B.phaseSetup(shaken, age)[0].pool, 7 - 2 - 2);
  const f = field();
  assert.deepEqual(Object.keys(f.sides[0].commander).sort(), ["actorId", "medicine", "morale", "name", "pool", "works"]);
});

test("a phase: the side with more successes takes the difference from the other's resolve; deeds count", () => {
  const b = field(), age = B.ageFor(1420);
  const step = B.settlePhase(b, age, [{successes: 4}, {successes: 1}], [[], [{name: "Jan", successes: 2}]]);
  assert.deepEqual(step.phase.total, [4, 3]);
  assert.equal(step.phase.winner, 0);
  assert.equal(step.sides[1].resolve, b.sides[1].resolve - 1);
  assert.equal(step.sides[1].men, 1500 - Math.round(1500 * age.kill));
  assert.ok(step.sides[0].men < 2000);
  assert.equal(step.over, null);
  // deeds take foes out of the fight, one for each success
  assert.equal(step.sides[0].men, 2000 - Math.round(2000 * age.kill / 3) - 2);
  assert.equal(step.sides[1].lostUnits, 1);
  // a botch hands the other side 2 net successes (Spoils of War p. 44)
  const bo = B.settlePhase(b, age, [{successes: 0, botch: true}, {successes: 0}]);
  assert.equal(bo.phase.winner, 1);
  assert.equal(bo.phase.net, -2);
  assert.equal(bo.sides[0].resolve, b.sides[0].resolve - 2);
});

test("wavering: a side that loses 3 or more rolls Charisma + Leadership; failure costs 2 dice, a botch breaks it", () => {
  const b = B.normBattle({sides: [{name: "A", men: 1000, quality: 5}, {name: "B", men: 1000, quality: 5}]}), age = B.ageFor(1250);
  const st = B.settlePhase(b, age, [{successes: 4}, {successes: 1}]);
  assert.deepEqual(st.waver, {side: 1, difficulty: 3});
  assert.equal(B.settlePhase(b, age, [{successes: 2}, {successes: 1}]).waver, null);
  assert.deepEqual(B.settlePhase(b, age, [{successes: 0}, {successes: 9}], [[{name: "Hero", successes: 11}], []]).waver, {side: 1, difficulty: 6},
    "killing more than 10 in a turn shakes the enemy");
  const after = B.applyStep(b, st, 1);
  const failed = B.applyWaver(after, 1, {successes: 0});
  assert.equal(failed.sides[1].penalty, 2);
  assert.equal(failed.phases.at(-1).waver.result, "wavers");
  assert.equal(B.phaseSetup(failed, age)[1].pool, b.sides[1].commander.pool - 2);
  // the penalty lasts one phase
  assert.equal(B.settlePhase(failed, age, [{successes: 1}, {successes: 1}]).sides[1].penalty, 0);
  assert.equal(B.applyWaver(after, 1, {successes: 2}).sides[1].penalty, 0);
  const broke = B.applyWaver(after, 1, {successes: 0, botch: true}, 7);
  assert.equal(broke.over.how, "rout");
  assert.equal(broke.over.winner, 0);
  // Undo puts the penalty and units back
  assert.equal(B.undoStep(failed).sides[1].lostUnits, 0);
});

test("a side whose resolve runs out breaks; the outcome reads as a sentence with the losses", () => {
  let b = field(), age = B.ageFor(1420);
  let guard = 0;
  while ( !b.over && guard++ < 20 ) b = B.applyStep(b, B.settlePhase(b, age, [{successes: 5}, {successes: 0}]), 1000);
  assert.equal(b.over.winner, 0);
  assert.equal(b.over.how, "rout");
  assert.match(b.over.text, /^Crusaders won the day; Hussites broke and fled\. Crusaders lost [\d,]+ of 2,000; Hussites lost [\d,]+ of 1,500\.$/);
  assert.ok(b.sides.every(s => s.men >= 1));
  // Undo takes the last phase back, men, resolve and the end
  const u = B.undoStep(b);
  assert.equal(u.over, null);
  assert.equal(u.phases.length, b.phases.length - 1);
  assert.equal(u.sides[1].resolve, b.phases.at(-1).before[1].resolve);
});

test("drawing off, a stalemate, and the time a battle takes in each age", () => {
  const b = field();
  const w = B.withdraw(b, 0, 5);
  assert.equal(w.over.winner, 1);
  assert.equal(w.over.how, "withdraw");
  assert.equal(w.sides[0].men, 1800);
  assert.match(w.over.text, /Crusaders drew off in good order and left the field to Hussites/);
  assert.equal(B.undoStep(w).sides[0].men, 2000);
  const s = B.stalemate(b, 5);
  assert.equal(s.over.winner, null);
  const two = B.applyStep(B.applyStep(b, B.settlePhase(b, B.ageFor(1420), [{successes: 1}, {successes: 1}])),
    B.settlePhase(b, B.ageFor(1420), [{successes: 1}, {successes: 1}]));
  assert.equal(B.timeTaken(two, B.ageFor(1420)), 2 * 3600);
  assert.equal(B.timeTaken(two, B.ageFor(1916)), 2 * 86400, "a trench battle takes days");
  assert.equal(B.timeWords(2 * 3600), "2 hours");
  assert.equal(B.timeWords(21 * 86400), "3 weeks");
});

test("a siege: the walls wear down by the week, guns twice as fast, hunger after the stores", () => {
  const s0 = B.normBattle({id: "s1", kind: "siege", name: "The siege of Pernštejn", place: "Pernštejn",
    sides: [{name: "The Swedes", men: 5000, quality: 4}, {name: "The garrison", men: 300, quality: 3, position: "castle", stores: 14}]});
  assert.equal(s0.sides[1].defends, true);
  const medieval = B.ageFor(1300), guns = B.ageFor(1645);
  assert.equal(B.siegeSetup(s0, medieval).difficulty, 9);
  assert.equal(B.siegeSetup(s0, guns).difficulty, 8);
  assert.equal(B.siegeSetup(s0, guns).pool, s0.sides[0].commander.works);
  const w1 = B.settleWeek(s0, medieval, {successes: 2});
  assert.equal(w1.breach, 2);
  assert.equal(B.settleWeek(s0, guns, {successes: 2}).breach, 4);
  assert.equal(w1.sides[1].stores, 7);
  assert.equal(w1.phase.hungry, false);
  let s = s0;
  for ( let i = 0; i < 3; i++ ) s = B.applyStep(s, B.settleWeek(s, medieval, {successes: 0}));
  assert.equal(s.sides[1].stores, 0);
  assert.equal(s.sides[1].resolve, B.startResolve(s0.sides[1]) - 1, "the third week is hungry");
  assert.equal(s.weeks, 3);
  // disease in camp (Spoils of War p. 41): 5,000 men roll at 5; failures stack, and at 3 the camp loses resolve
  assert.equal(B.diseaseDifficulty(s0.sides[0]), 5);
  assert.equal(B.diseaseDifficulty({men: 300}), 4);
  assert.equal(B.diseaseDifficulty({men: 40000}), 10);
  assert.equal(B.diseaseAfter(0, {successes: 0}), 1);
  assert.equal(B.diseaseAfter(2, {successes: 2}), 1);
  assert.equal(B.diseaseAfter(2, {successes: 1}), 2);
  let sk = s0;
  for ( let i = 0; i < 3; i++ ) sk = B.applyStep(sk, B.settleWeek(sk, medieval, {successes: 0}, [{successes: 0}, {successes: 1}]));
  assert.equal(sk.sides[0].sick, 3);
  assert.equal(sk.sides[0].resolve, s0.sides[0].resolve - 1);
  assert.equal(B.siegeSetup(sk, medieval).difficulty, 10, "disease makes the works harder");
  // undo puts the stores, the disease and the breach back
  const u = B.undoStep(sk);
  assert.equal(u.weeks, 2);
  assert.equal(u.sides[0].sick, 2);
  assert.equal(u.sides[0].resolve, s0.sides[0].resolve);
  // the breach fills, the walls are stormed, the rest is a field battle with the walls halved
  const full = B.applyStep(s0, B.settleWeek(s0, guns, {successes: 4}));
  assert.equal(full.breached, true);
  const st = B.assault(full);
  assert.equal(st.kind, "field");
  assert.equal(B.weightOf(st.sides[1], guns, {breached: true}), B.sizeStep(300) + 3 + 0 + 1);
  assert.equal(B.undoAny(st).kind, "siege");
  // a starving garrison gives up
  let g = B.normBattle({kind: "siege", sides: [{men: 100}, {men: 50, quality: 1, stores: 0}]});
  let n = 0;
  while ( !g.over && n++ < 30 ) g = B.applyStep(g, B.settleWeek(g, medieval, {successes: 0}), 9);
  assert.equal(g.over.how, "surrender");
  assert.equal(g.over.winner, 0);
  // the progress clock mirrors the breach
  const c = B.clockFor(full);
  assert.equal(c.segments, B.BREACH_SEGMENTS);
  assert.equal(c.filled, B.BREACH_SEGMENTS);
  assert.equal(c.name, "The walls of Pernštejn");
});

test("the battle's counterattack on a character, and wars among the chronicle's events", () => {
  assert.equal(B.hazardFor(B.ageFor(1250), "thick"), 5, "5 dice in the Dark Ages Companion");
  assert.equal(B.hazardFor(B.ageFor(1250), "thick", true), 7, "drawing attention adds 2");
  assert.equal(B.hazardFor(B.ageFor(1916), "rear"), 6);
  assert.deepEqual(B.counterResult(2, 1), {dice: 4, type: "lethal", staked: false});
  assert.equal(B.counterResult(2, 3).type, "aggravated");
  assert.equal(B.counterResult(5, 2, {cainite: true}).staked, true);
  assert.equal(B.counterResult(5, 2).staked, false, "only Cainites are staked");
  const evs = [{id: "a", year: 1419, name: "The Hussite Wars begin"}, {id: "b", year: 1420, name: "A comet"}, {id: "c", year: 1805, name: "The Battle of Austerlitz"},
    {id: "d", year: 1423, name: "The siege of Karlštejn"}];
  assert.deepEqual(B.warEvents(evs, 1421).map(e => e.id), ["a", "d"]);
  assert.deepEqual(B.warEvents(evs, 1805).map(e => e.id), ["c"]);
});

test("factions: an ended battle between factions proposes Status, Retainers and standing", () => {
  const state = F.normState({factions: [{id: "f1", name: "The Hussites", assets: {status: 2, retainers: 2}}, {id: "f2", name: "The Crusade", assets: {status: 3, retainers: 0}}]});
  const b = field({sides: [{name: "Crusaders", faction: "The Crusade", men: 2000}, {name: "Hussites", faction: "f1", men: 1500}]});
  const won = {...b, over: {winner: 1, how: "rout", at: 1}};
  const ch = F.battleChanges(state, won);
  assert.deepEqual(ch, [
    {op: "bg", faction: "f1", key: "status", delta: 1},
    {op: "standing", faction: "f2", other: "f1", delta: -1},
    {op: "bg", faction: "f2", key: "status", delta: -1}
  ]);
  const off = F.battleChanges(state, {...b, over: {winner: 0, how: "withdraw"}});
  assert.ok(!off.some(c => c.key === "retainers"), "drawing off in good order keeps the men");
  assert.deepEqual(F.battleChanges(state, {...b, over: {winner: null, how: "stalemate"}}).map(c => c.op), ["standing", "standing"]);
  assert.deepEqual(F.battleChanges(state, {...b, over: null}), []);
  assert.deepEqual(F.battleChanges(state, field({over: {winner: 0, how: "rout"}})), [], "no factions named, nothing proposed");
  for ( const c of ch ) assert.ok(F.describeChange(c, {}).length > 5);
});

test("the Legends book gains a line for each ended battle", () => {
  const b = B.applyStep(field(), {sides: field().sides, phase: {}, over: {winner: 0, how: "rout"}}, 500);
  const lines = L.battleLines([b, field(), {...b, id: "x", legend: false}], () => ({year: 1420, month: 7, day: 14}));
  assert.equal(lines.length, 1);
  assert.equal(lines[0].kind, "battle");
  assert.equal(lines[0].year, 1420);
  assert.equal(lines[0].shown, true);
  assert.match(lines[0].text, /^The fight at the ford at Brno ford: Crusaders won the day/);
  assert.ok(L.KINDS.battle);
});

test("the module wires the window into the Storyteller's hand and NPC listens for wodxBattle", () => {
  const main = readFileSync(join(root, "modules/wodx-storyteller/scripts/main.mjs"), "utf8");
  assert.match(main, /addTool\(\{key: "battle"/);
  assert.match(main, /registerBattleSettings\(\)/);
  const fac = readFileSync(join(root, "modules/wodx-npc/scripts/factions.mjs"), "utf8");
  assert.match(fac, /Hooks\.on\("wodxBattle"/);
  const leg = readFileSync(join(root, "modules/wodx-chronicle/scripts/legends.mjs"), "utf8");
  assert.match(leg, /battleLines\(other\(ST, "battles"/);
});

const book = (over = {}) => B.normBattle({id: "bk", name: "The book army", year: 1230,
  sides: [{name: "Example host", units: {peasants: 2, spearmen: 2, archers: 1, lightCavalry: 3, ghoulKnights: 1, cainiteCavalry: 1}, commander: {pool: 5, morale: 5}},
    {name: "Levies", units: {peasants: 6, spearmen: 1}, commander: {pool: 4, morale: 4}}], ...over});
const r = k => ({successes: k, botch: false, faces: []});

test("the book's troop table gives the example army of Spoils of War: 19, 20, 5 and 20", () => {
  const b = book();
  assert.equal(b.book, true);
  assert.deepEqual(B.unitPools(b.sides[0].units), {maneuver: 19, melee: 20, ranged: 5, defense: 20});
  assert.equal(b.sides[0].men, 2000 + 2000 + 500 + 300 + 50 + 10);
  assert.equal(b.sides[1].men, 7000);
  // a house army on one side keeps the house frame
  assert.equal(B.normBattle({sides: [{units: {peasants: 1}}, {men: 500}]}).book, false);
  assert.equal(B.UNIT_TYPES.garouPack.troops, 5);
  assert.deepEqual([B.UNIT_TYPES.knightsOfAcre.maneuver, B.UNIT_TYPES.knightsOfAcre.defense], [2, 4]);
});

test("a book turn: the commanders' net successes move the pools, then the armies' actions take units", () => {
  const b = book();
  const pl = B.bookPools(b, B.ageFor(1230), [r(3), r(1)]);
  assert.equal(pl.net, 2);
  assert.equal(pl.pools[0].melee, 22);
  assert.equal(pl.pools[1].melee, 6 + 2 - 2);
  const botched = B.bookPools(b, B.ageFor(1230), [r(0), {successes: 0, botch: true}]);
  assert.equal(botched.net, 2, "a botch gives the other side 2");
  const contests = B.bookContests(b, B.ageFor(1230), pl.pools, ["melee", "ranged"]);
  assert.equal(contests[0].attack.pool, 22);
  assert.equal(contests[0].resist.pool, pl.pools[1].defense);
  assert.equal(contests[1].resist.pool, Math.ceil(pl.pools[0].defense / 2), "shooting is against half the Defense");
  contests[0].rolls = {attack: r(6), resist: r(2)};
  contests[1].rolls = {attack: r(1), resist: r(3)};
  const st = B.settleBookTurn(b, B.ageFor(1230), {...pl, contests}, [[], []]);
  assert.deepEqual(st.phase.units, [0, 4], "melee wins by 4; failed shooting does no harm to the shooters");
  assert.equal(B.unitCount(st.sides[1].units), 3);
  assert.equal(st.sides[1].lostUnits, 4);
  assert.deepEqual(st.waver, {side: 1, difficulty: 4}, "losing 3 or more units makes an army waver at that many");
  assert.ok(st.sides[0].units.cainiteCavalry, "mortal troops fall first");
  // undo puts the units back
  const after = B.applyStep(b, st);
  assert.deepEqual(B.undoStep(after).sides[1].units, b.sides[1].units);
});

test("a book turn: a lost melee costs the attackers, a withdrawal ends it, an army with no units is beaten", () => {
  const b = book();
  const age = B.ageFor(1230);
  const pl = B.bookPools(b, age, [r(0), r(0)]);
  let c = B.bookContests(b, age, pl.pools, ["melee", "melee"]);
  c[0].rolls = {attack: r(1), resist: r(3)}; c[1].rolls = {attack: r(0), resist: r(0)};
  assert.deepEqual(B.settleBookTurn(b, age, {...pl, contests: c}).phase.units, [2, 0]);
  c = B.bookContests(b, age, pl.pools, ["melee", "withdraw"]);
  c[0].rolls = {attack: r(5), resist: r(0)}; c[1].rolls = {attack: r(3), resist: r(1)};
  const away = B.settleBookTurn(b, age, {...pl, contests: c});
  assert.deepEqual(away.phase.units, [0, 0], "a good withdrawal keeps the melee off");
  assert.deepEqual([away.over.winner, away.over.how], [0, "withdraw"]);
  const thin = book({sides: [{name: "A", units: {heavyCavalry: 5}, commander: {pool: 5}}, {name: "B", units: {peasants: 2}, commander: {pool: 3}}]});
  const p2 = B.bookPools(thin, age, [r(0), r(0)]);
  c = B.bookContests(thin, age, p2.pools, ["melee", "melee"]);
  c[0].rolls = {attack: r(6), resist: r(1)}; c[1].rolls = {attack: r(0), resist: r(4)};
  const done = B.settleBookTurn(thin, age, {...p2, contests: c});
  assert.deepEqual([done.over.winner, done.over.how, done.sides[1].men], [0, "rout", 0]);
  const saved = B.normBattle(B.applyStep(thin, done));
  assert.equal(saved.sides[1].men, 0, "an army with no units keeps no men when saved");
  // a book army drawing off leaves units behind
  const w = B.withdraw(book(), 1);
  assert.equal(B.unitCount(w.sides[1].units), 6);
  assert.equal(B.undoStep(w).sides[1].units.peasants, 6);
});

test("the Storyteller's window offers the book's units and the turn's action", () => {
  const src = readFileSync(join(root, "modules/wodx-storyteller/scripts/battles.mjs"), "utf8");
  assert.match(src, /B\.isBook\(b0\)/);
  assert.match(src, /name="s\$\{i\}\.u\.\$\{k\}"/);
  assert.match(src, /name="act\$\{i\}"/);
});
