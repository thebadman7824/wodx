// NPC Aftercare Desk (B5800-B5806): what comes after. Pure rules, and the wiring by source.
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const AC = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/aftercare-rules.mjs")));
const DU = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/duty-rules.mjs")));

test("n1: held, then let go, served, banished or put to death", () => {
  assert.equal(AC.heldDuty("W").label, "Held for trial");
  assert.equal(AC.lawAfter(null).do, "free");
  assert.equal(AC.lawAfter({kind: "fine"}).do, "free");
  assert.equal(AC.lawAfter({kind: "time", year: 1500, until: 1503}).seconds, 3 * AC.YEAR);
  assert.equal(AC.lawAfter({kind: "banished"}).do, "gone");
  assert.equal(AC.lawAfter({kind: "death"}).do, "dead");
  assert.equal(AC.lawAfter({kind: "death"}, {guilty: false}).do, "free");
  const h = AC.homeDuty("H", 100);
  assert.equal(h.until, 100 + 3600);
  // a duty that starts later (home after a sentence) waits for its time
  assert.equal(DU.dutyActive({place: "H", after: 500}, 100), false);
  assert.equal(DU.dutyActive({place: "H", after: 500}, 600), true);
  assert.equal(DU.withDuties([], {x: {place: "H", after: 500, until: 900}}, 100).length, 0);
});

test("n2: the healing clock (M20 pp. 408-409) and who needs a healer", () => {
  assert.deepEqual(AC.nextHeal({bashing: 2}), {type: "bashing", seconds: 3600});
  assert.deepEqual(AC.nextHeal({lethal: 3}), {type: "lethal", seconds: 7 * 86400});
  assert.deepEqual(AC.nextHeal({lethal: 2, bashing: 3}), {type: "bashing", seconds: 3 * 3600});
  assert.equal(AC.nextHeal({}), null);
  assert.equal(AC.needsCare({bashing: 3}), false);
  assert.equal(AC.needsCare({bashing: 4}), true);
  assert.equal(AC.needsCare({lethal: 3}), true);
  assert.equal(AC.laidUp({lethal: 2}), false);
  assert.deepEqual(AC.bloodHeal({bashing: 1, lethal: 3}, 4), {bashing: 1, lethal: 1, spent: 2});
  assert.equal(AC.HEALERS[0], "hospital");
});

test("n3: who gives way, and the next meeting is likelier to come to blows", () => {
  assert.equal(AC.givesWay([{id: "a", us: 1, them: 3}, {id: "b", us: 3, them: 1}]), "a");
  assert.equal(AC.givesWay([{id: "a", us: 1, them: 1, ownGround: true}, {id: "b", us: 1, them: 1}]), "b");
  assert.equal(AC.standoffBonus(100, 200), 10);
  assert.equal(AC.standoffBonus(100, 100 + 31 * 86400), 0);
  assert.equal(AC.standoffBonus(undefined, 5), 0);
  assert.match(src("modules/wodx-npc/scripts/rivalry.mjs"), /givesWay/);
});

test("n4: Dazed, then rest at home until morning", () => {
  const d = AC.restDuty("H", 10 * 3600);
  assert.equal(d.after, 10 * 3600 + 600);
  assert.equal(d.until, 86400 + 6 * 3600);
  assert.equal(AC.nextMorning(3 * 3600), 6 * 3600);
});

test("n5: mourning by faith", () => {
  assert.equal(AC.mourningOf("jewish").days, 7);
  assert.equal(AC.mourningOf("islamic").days, 3);
  assert.equal(AC.mourningOf("nobody").days, 7);
  const m = AC.mournDuties("H", "C", 0, "islamic");
  assert.equal(m.worship.until, 3 * 86400);
  assert.deepEqual(Object.keys(m), ["worship", "home"]);
  assert.match(src("modules/wodx-npc/scripts/hearts.mjs"), /aftercare\?\.mourn/);
});

test("n6, n7: a robber's night out, and who moves on marriage", () => {
  assert.equal(AC.spreeDuty("T", 22 * 3600).until, 86400 + 6 * 3600);
  assert.deepEqual(AC.whoMoves([{id: "a", home: null}, {id: "b", home: "H"}]), {moves: "a", to: "b"});
  assert.deepEqual(AC.whoMoves([{id: "a", home: "A", sex: "female"}, {id: "b", home: "B", sex: "male"}]), {moves: "a", to: "b"});
  assert.deepEqual(AC.whoMoves([{id: "a", home: "A", household: 4}, {id: "b", home: "B", household: 1}]), {moves: "b", to: "a"});
  assert.equal(AC.whoMoves([{id: "a"}, {id: "b"}]), null);
  assert.match(src("modules/wodx-npc/scripts/prowl.mjs"), /Report it to the watch/);
  assert.match(src("modules/wodx-chronicle/scripts/law-punish.mjs"), /mercy: true/);
});
