import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* A sept to live in and Renown from play (B7874-B7882; Dark Ages: Werewolf pp. 29-36, 74, 98-101, 144-145, 167-170) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const D = await imp("modules/wodx-actions/scripts/garou-deeds-rules.js");
const S = await imp("modules/wodx-storyteller/scripts/sept-rules.mjs");
const RR = await imp("modules/wodx-storyteller/scripts/recipe-rules.mjs");
const {ROTHENSTEIN} = await imp("modules/wodx-rothenstein/data/recipe.mjs");
const {FACTIONS} = await imp("modules/wodx-rothenstein/data/factions.mjs");
const DAY = 86400;

test("B7879: the book's award table, crimes at seven, the Litany's thirteen tenets, the rank challenges", () => {
  assert.deepEqual(D.DEEDS["chores-month"].d, {honor: 1});
  assert.deepEqual(D.DEEDS["chores-failed"].d, {honor: -2});
  assert.deepEqual(D.DEEDS["missed-moot"].d, {wisdom: -1});
  assert.deepEqual(D.DEEDS["no-leave"].d, {honor: -1});
  assert.deepEqual(D.DEEDS["rite-learned"].d, {wisdom: 1});
  assert.deepEqual(D.DEEDS["fox-frenzy"].d, {glory: -1, wisdom: -1});
  assert.deepEqual(D.DEEDS["refuse-office"].d, {glory: -1, honor: -2, wisdom: -1});
  // every deed is a whole number the table uses
  for ( const [k, v] of Object.entries(D.DEEDS) ) for ( const x of Object.values(v.d) ) assert.ok([1, 2, 3, 5, 7, -1, -2, -3, -5].includes(x), k);
  assert.deepEqual(D.crimeIn({glory: -7}), ["glory"]);
  assert.deepEqual(D.crimeIn({honor: -5}), []);
  assert.equal(D.LITANY.length, 13);
  for ( const l of D.LITANY ) if ( l.deed ) assert.ok(D.DEEDS[l.deed], l.id);
  assert.equal(D.RANK_CHALLENGES.length, 10);
  assert.equal(D.rankChallenge(0), D.RANK_CHALLENGES[0]);
  assert.equal(D.deltaLine({glory: -1, wisdom: -1}), "Glory -1, Wisdom -1");
});

test("B7880: a frenzy costs Wisdom, a fox frenzy Glory too; a deed's suggestion carries its numbers", () => {
  assert.equal(D.frenzyDeed("fox"), "fox-frenzy");
  assert.equal(D.frenzyDeed("berserk"), "frenzy");
  const p = D.deedProposal({id: "a1", name: "Ilse"}, "fox-frenzy", {why: "fled", day: 3});
  assert.equal(p.type, "wodx-actions.renown");
  assert.equal(p.key, "renown:a1:fox-frenzy:3");
  assert.deepEqual(p.data.d, {glory: -1, wisdom: -1});
  assert.match(p.detail, /Glory -1, Wisdom -1: fled/);
  assert.match(p.title, /lost/);
  assert.match(D.deedProposal({id: "a1", name: "Ilse"}, "rite-learned").title, /Renown for/);
  assert.equal(D.deedProposal({id: "a1"}, "nonsense"), null);
});

test("B7875: chores kept three days in four win Honor; fewer than one in four lose two", () => {
  let s = S.blank();
  s = S.normState({...s, members: [{id: "a", name: "Ilse", chore: "watch"}, {id: "b", name: "Mirek"}]});
  assert.equal(s.members[1].chore, "fields");
  const from = 0, to = 28 * DAY;
  let st = s;
  for ( let d = 0; d < 21; d++ ) st = S.markChore(st, "a", d * DAY + 100).state;
  const again = S.markChore(st, "a", 100);
  assert.equal(again.fresh, false, "one mark a day");
  assert.equal(S.reckonChores(st.days.a, from, to).deed, "chores-month");
  st = S.markChore(st, "b", DAY).state;
  assert.equal(S.reckonChores(st.days.b, from, to).deed, "chores-failed");
  const mid = Array.from({length: 14}, (_, i) => i);
  assert.equal(S.reckonChores(mid, from, to).deed, null);
  assert.equal(Object.keys(S.CHORES).length, 6);
});

test("B7876: the moot's business: who stayed away, the month's work, news by date", () => {
  let st = S.normState({members: [{id: "a", name: "Ilse"}, {id: "b", name: "Mirek"}, {id: "n", name: "An elder"}]});
  for ( let d = 0; d < 25; d++ ) st = S.markChore(st, "a", d * DAY).state;
  const b = S.mootBusiness(st, {present: ["a", "n"], pcs: ["a", "b"], from: 0, to: 28 * DAY, date: [1204, 5, 1]});
  assert.deepEqual(b.absent.map(m => m.id), ["b"]);
  const deeds = b.deeds.map(d => `${d.id}:${d.deed}`).sort();
  assert.deepEqual(deeds, ["a:chores-month", "b:chores-failed", "b:missed-moot"], "only player characters get suggestions; the elder gets none");
  assert.deepEqual(b.news.map(n => n.id), ["songs", "sack"]);
  assert.deepEqual(S.newsDue(["songs"], [1204, 4, 12]).map(n => n.id), []);
  assert.deepEqual(S.newsDue(["songs", "sack"], [1205, 1, 1]).map(n => n.id), ["concolation"]);
  assert.equal(S.mootMoon(4), true); assert.equal(S.mootMoon(3), false);
});

test("B7877: rites taught a week a level; a failed week costs Willpower; a botch waits three moons; no rite above Rituals", () => {
  assert.equal(S.canLearn(3, 2).ok, false);
  assert.equal(S.canLearn(2, 2).ok, true);
  assert.equal(S.lessonDiff(3), 7);
  assert.equal(S.lessonDiff(1), 9);
  let l = S.normLesson({student: "a", studentName: "Ilse", rite: "Rite of Cleansing", level: 2, teacher: "Dobroslava"});
  assert.equal(S.lessonDue(l, 0), true);
  let r = S.lessonWeek(l, {successes: 1}, 0);
  assert.equal(r.lesson.weeks, 1); assert.equal(r.learned, false);
  assert.equal(S.lessonDue(r.lesson, 3 * DAY), false);
  const fail = S.lessonWeek(r.lesson, {successes: 0}, 7 * DAY);
  assert.equal(fail.spend, 1); assert.equal(fail.lesson.weeks, 1);
  const quit = S.lessonWeek(r.lesson, {successes: 0}, 7 * DAY, {willpower: false});
  assert.equal(quit.lesson.state, "given-up");
  const done = S.lessonWeek(fail.lesson, {successes: 2}, 14 * DAY);
  assert.equal(done.learned, true); assert.equal(done.lesson.state, "learned");
  const botch = S.lessonWeek(l, {successes: 0, botch: true}, 0);
  assert.equal(botch.lesson.state, "waiting");
  assert.equal(S.lessonDue(botch.lesson, 80 * DAY), false);
  assert.equal(S.lessonDue(botch.lesson, 89 * DAY), true);
});

test("B7882: a rank challenge waits once per rank", () => {
  let x = S.addChallenge(S.blank(), {actorId: "a", name: "Ilse", rank: 2}, 0);
  assert.ok(x.added);
  const twice = S.addChallenge(x.state, {actorId: "a", name: "Ilse", rank: 2}, 1);
  assert.equal(twice.added, null);
  assert.equal(twice.state.challenges.length, 1);
});

test("B7874: the Old Grove is staffed: four Silver Fang elders and a Kinfolk family, leader and members in the faction", () => {
  const plan = RR.castPlan(ROTHENSTEIN, []);
  const leader = plan.make.find(p => p.name === "Jaromír Moon-Ward");
  assert.equal(leader.type, "Werewolf");
  assert.equal(leader.sheet["system.custom.tribe"], "Silver Fangs");
  assert.equal(leader.sheet["system.auspice"], "Ahroun");
  assert.equal(leader.sheet["system.renown.rank"], 4);
  const kin = plan.make.find(p => p.name === "Hostivít of the Grove farm");
  assert.equal(kin.type, "Mortal"); assert.equal(kin.sheet["flags.world.wodx.kinfolk"], "silver-fangs");
  const grove = FACTIONS.find(f => f.key === "grove");
  assert.equal(grove.leader, "Jaromír Moon-Ward");
  assert.equal(grove.members.length, 7);
  for ( const m of grove.members ) assert.ok(ROTHENSTEIN.cast.people.some(p => p.name === m), m);
  assert.ok(ROTHENSTEIN.anchors.people.filter(p => p.faction === "grove").every(p => p.home === "old-grove"));
  assert.deepEqual(RR.validate(ROTHENSTEIN, {}).filter(x => /Werewolf|kind of sheet/.test(x)), []);
});

test("B7874-B7882: wiring: the sept window, the approval handler, the frenzy, the rank hook, the award dialog", () => {
  const g = src("modules/wodx-actions/scripts/garou.js"), m = src("modules/wodx-actions/scripts/main.js");
  assert.match(g, /suggestDeed\(actor, DEED\.frenzyDeed\(kind\)/);
  assert.match(g, /registerHandler\?\.\("wodx-actions\.renown"/);
  assert.match(g, /Hooks\.callAll\("wodxRankReady"/);
  assert.match(g, /DEED\.crimeIn\(deltas\)/);
  assert.match(g, /data-wodx-deed/);
  assert.match(m, /gx\(\)\.registerHandlers\(\)/);
  assert.match(m, /suggestDeed: /);
  const st = src("modules/wodx-storyteller/scripts/main.mjs"), sept = src("modules/wodx-storyteller/scripts/sept.mjs");
  assert.match(st, /sept: Sept\.api\(\)/);
  assert.match(st, /wodxSept/);
  assert.match(sept, /Hooks\.on\("wodxRankReady"/);
  assert.match(sept, /Power\.holdMoot\(key, presentIds\)/);
  assert.match(sept, /type: "wod\.types\.rite"/);
  assert.match(sept, /"system\.renown\.rank"/);
});
