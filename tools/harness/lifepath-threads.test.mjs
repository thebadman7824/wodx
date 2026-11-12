import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import * as LP from "../../modules/wodx-creation/scripts/lifepath-rules.mjs";
import * as T from "../../modules/wodx-creation/scripts/lifepath-threads-rules.mjs";
import * as FP from "../../modules/wodx-creation/scripts/first-night-prelude-rules.mjs";
import * as P from "../../modules/wodx-chronicle/scripts/pod-rules.mjs";

/* Creation 0.14.0 + Chronicle 0.44.0: lifepath threads as story chains (desk cr2) and a guest in a prelude (desk bf1) */

const DAY = 86400;
const walk = (line, birthYear, seed, pick = 0) => {
  let p = LP.newPath({line, birthYear, seed});
  for ( let g = 0; !LP.done(p) && g < 20; g++ ) p = LP.choose(p, pick);
  return p;
};

test("a person's role and note say what the past left open", () => {
  assert.equal(T.kindOf("your sire's rival", "who would see you destroyed"), "enemy");
  assert.equal(T.kindOf("a cousin", "who wants your place"), "rival");
  assert.equal(T.kindOf("the one you saved", "who owes you a life"), "owed");
  assert.equal(T.kindOf("a creditor", "who is still owed"), "debt");
  assert.equal(T.kindOf("a priest", "who knows your confession"), "secret");
  assert.equal(T.kindOf("a first love", "you have never stopped looking for"), "lost");
  assert.equal(T.kindOf("a packmate", "you would die for"), "promise");
  assert.equal(T.kindOf("a neighbour", "who shared bread when they had little"), null, "a kind memory leaves nothing open");
  assert.ok(T.undying("your sire", "who needed a soldier"));
  assert.ok(!T.undying("a cousin", "who wants your place"));
  assert.ok(T.undying("an elder", "who has plans for you", "vampire"));
});

test("threads come from every line's lifepaths, at most four, sharpest first", () => {
  const kinds = new Set();
  for ( const line of Object.keys(LP.LINES) ) for ( let i = 0; i < 12; i++ ) {
    const p = walk(line, 1200 + i * 70, `th${i}`, i % 3);
    const th = T.threadsOf(LP.record(p, {people: []}));
    assert.ok(th.length <= T.THREADS_MAX);
    th.forEach((t, k) => {
      kinds.add(t.kind);
      assert.ok(T.THREAD_KINDS[t.kind], t.kind);
      assert.ok(t.id && t.role && Number.isFinite(t.year), JSON.stringify(t));
      if ( k ) assert.ok(T.KIND_ORDER.indexOf(th[k - 1].kind) <= T.KIND_ORDER.indexOf(t.kind));
    });
  }
  for ( const k of ["enemy", "rival", "secret", "lost"] ) assert.ok(kinds.has(k), `some lifepath leaves ${k}`);
  assert.deepEqual(T.threadsOf(null), []);
  assert.deepEqual(T.threadsOf({path: {steps: []}}), []);
});

test("kept Flaws add a thread when no person carries it; dropped ones do not", () => {
  let found = null;
  for ( let i = 0; i < 200 && !found; i++ ) {
    const p = walk("vampire", 1300 + i, `fl${i}`, i % 2);
    const sum = LP.summary(p);
    const h = sum.gives.find(g => g.kind === "flaw" && g.name === "Hunted");
    if ( h ) found = {p, key: h.key};
  }
  assert.ok(found, "some vampire lifepath suggests Hunted");
  const kept = T.threadsOf(LP.record(found.p, {kept: [found.key]}));
  const dropped = T.threadsOf(LP.record(found.p, {kept: []}));
  assert.ok(kept.some(t => t.kind === "hunted") || kept.length === T.THREADS_MAX);
  assert.ok(!dropped.some(t => t.kind === "hunted"));
});

test("a linked NPC is carried into the thread by name", () => {
  for ( let i = 0; i < 100; i++ ) {
    const p = walk("mortal", 1500 + i, `nm${i}`);
    const people = LP.summary(p).people.filter(x => T.kindOf(x.role, x.note));
    if ( !people.length ) continue;
    const q = people[0];
    const th = T.threadsOf(LP.record(p, {people: [{...q, actorId: "npc1", name: "Vok"}]}));
    const t = th.find(x => x.role === q.role);
    if ( !t ) continue;
    assert.equal(t.actorId, "npc1");
    assert.equal(t.name, "Vok");
    return;
  }
  assert.fail("no mortal lifepath named a person with something open");
});

test("a thread's chain is written for the year of play", () => {
  const lp = {id: "p1:rival", kind: "rival", role: "a cousin", note: "who wants your place", year: 1610, scene: "Inheritance", undying: false, turning: "the Embrace", actorName: "Jana"};
  const near = P.lpChain({key: "lp:rival", where: "Brno", lp}, 1630);
  assert.equal(near.steps.length, 3);
  assert.match(near.steps[0].text, /Jana's past \(1610, Inheritance\): a cousin, who wants Jana's place/);
  assert.match(near.steps[0].text, /stranger's seal/, "a letter in the 1600s");
  assert.match(near.steps[0].text, /in Brno/);
  assert.doesNotMatch(near.steps[0].text, /descendant/);
  const far = P.lpChain({key: "lp:rival", lp}, 1890);
  assert.match(far.steps[0].text, /long dead/);
  assert.match(far.steps[1].text, /^A descendant of a cousin/);
  assert.match(far.steps[0].text, /telegram/);
  const sire = P.lpChain({key: "lp:enemy", lp: {...lp, kind: "enemy", role: "your sire's rival", note: "who would see you destroyed", undying: true, name: "Ottokar"}}, 1890);
  assert.match(sire.steps[0].text, /far stronger, and may now be the pawn of something older/);
  assert.match(sire.steps[0].text, /Ottokar \(Jana's sire's rival\)/);
  assert.doesNotMatch(sire.steps.map(s => s.text).join(" "), /\{|\byou\b/i, "no slot left unfilled, nothing in the second person");
  for ( const [y, re] of [[1250, /pedlar/], [1700, /seal/], [1920, /newspapers|telegram/], [2000, /investigator|number/], [2060, /filter|data broker/]] ) {
    const txt = Object.keys(P.LP_CHAINS).map(k => P.lpChain({key: `lp:${k}`, lp: {...lp, kind: k}}, y).steps[0].text).join(" ");
    assert.match(txt, re, `news travels by era in ${y}`);
  }
  for ( const k of Object.keys(T.THREAD_KINDS) ) assert.ok(P.LP_CHAINS[k], `a chain for ${k}`);
});

test("lifepath runs step through nextStep and chainOf like the preset chains", () => {
  const run = {key: "lp:debt", at: 0, last: 100, lp: {kind: "debt", role: "a creditor", note: "who is still owed", year: 1900, actorName: "Petr"}};
  const a = P.nextStep(run, 1910);
  assert.equal(a.index, 0); assert.equal(a.due, 100);
  const b = P.nextStep({...run, at: 2}, 1910);
  assert.ok(b.last);
  assert.equal(P.nextStep({...run, at: 3}, 1910), null);
  assert.equal(P.chainOf({key: "black-death"}).key, "black-death", "preset chains are untouched");
  assert.equal(P.nextStep({key: "nothing-such"}), null);
  assert.equal(P.lpChain({lp: {kind: "nonsense"}}), null);
});

test("threads fall due one at a time: two weeks in, then a month apart", () => {
  const th = [{id: "a"}, {id: "b"}];
  assert.equal(P.lpNext({since: 0, seen: {}}, th, 13 * DAY), null);
  assert.equal(P.lpNext({since: 0, seen: {}}, th, 14 * DAY).id, "a");
  assert.equal(P.lpNext({since: 0, last: 14 * DAY, seen: {a: "put"}}, th, 30 * DAY), null);
  assert.equal(P.lpNext({since: 0, last: 14 * DAY, seen: {a: "put"}}, th, 44 * DAY).id, "b");
  assert.equal(P.lpNext({since: 0, last: 0, seen: {a: "running", b: "dismissed"}}, th, 999 * DAY), null);
  assert.equal(P.lpNext({}, [], 999 * DAY), null);
});

test("the Chronicle wiring: approval type, Undo-free reject, the window and the api", () => {
  const src = readFileSync(new URL("../../modules/wodx-chronicle/scripts/pod.mjs", import.meta.url), "utf8");
  assert.match(src, /registerHandler\(T_LP, \{label: [^}]*approve: e => startThread\(e\.data\?\.actor, e\.data\?\.thread\), reject: e => dismissThread/s);
  assert.match(src, /dealChains\(\)\.then\(\(\) => lifepathTick\(\)\)/);
  assert.match(src, /Threads from the past/);
  assert.match(src, /lifepathTick, startThread, threads: threadsOf/);
  assert.match(src, /lifepathThreads\?\.\(a\)/);
  const main = readFileSync(new URL("../../modules/wodx-creation/scripts/main.mjs", import.meta.url), "utf8");
  assert.match(main, /lifepathThreads: actor => threadsOf\(lifepath\.lifepathOf\(actor\)\)/);
});

/* ---------------- a guest in a prelude (bf1) ---------------- */

test("a guest fits only where the years meet", () => {
  const cainite = {line: "vampire", birthYear: 1170, turnYear: 1197};
  assert.deepEqual(FP.guestFit(1995, cainite).as, "elder", "a 1197 Cainite in the 1990s only as an elder");
  assert.equal(FP.guestFit(1220, cainite).as, "turned");
  assert.equal(FP.guestFit(1190, cainite).as, "mortal");
  assert.ok(!FP.guestFit(1160, cainite).ok, "not yet born");
  assert.ok(!FP.guestFit(1174, cainite).ok, "only a small child");
  const neonate = {line: "vampire", birthYear: 1970, turnYear: 1994};
  assert.ok(!FP.guestFit(1220, neonate).ok);
  const mortal = {line: "mortal", birthYear: 1800, turnYear: null};
  assert.ok(FP.guestFit(1850, mortal).ok);
  assert.ok(!FP.guestFit(1920, mortal).ok, "a mortal is long dead after a hundred years");
  const garou = {line: "werewolf", birthYear: 1800, turnYear: 1815};
  assert.ok(!FP.guestFit(1920, garou).ok);
  assert.equal(FP.guestFit(1850, {line: "wraith", birthYear: 1700, turnYear: 1740}).as, "ghost");
  assert.ok(FP.guestFit(1850, {line: "mage", birthYear: 1720, turnYear: 1745}).ok, "a mage can stretch the years");
  assert.equal(FP.guestFit(1850, null).as, "unknown");
  assert.ok(FP.guestFit(null, cainite).ok);
});

test("guest beats name both characters and write a guest tie per scene", () => {
  for ( const as of ["mortal", "turned", "elder", "ghost", "unknown"] ) {
    const b = FP.guestBeat(as, 0, "Ilse", "Jan");
    assert.match(b, /Ilse/); assert.doesNotMatch(b, /\{\{/);
  }
  assert.match(FP.guestBeat("elder", 0, "Ilse", "Jan"), /already old/);
  const t = FP.guestTie({from: "g", about: "h", scene: "life:youth:1212", year: 1212, title: "1212: The fair", beat: "What did Ilse see?", text: "She stole the purse."});
  assert.equal(t.kind, "guest");
  assert.match(t.q, /^In 1212, 1212: The fair: What did Ilse see\?$/);
  assert.ok(FP.sameTie(t, {...t, text: "x"}));
  assert.ok(!FP.sameTie(t, {...t, scene: "turn"}), "two scenes, two guest ties");
  assert.ok(!FP.sameTie(t, {from: "g", about: "h"}), "a guest tie does not replace the ring's question");
  assert.ok(FP.sameTie({from: "g", about: "h", q: "1"}, {from: "g", about: "h", q: "2"}), "ring questions still replace each other");
});

test("prelude scenes carry their year for the guest check", () => {
  const story = [{stage: "youth", year: 1212, title: "The fair", choice: "Stole"}, {stage: "turning", year: 1225, title: "The Embrace", choice: "Taken"},
    {stage: "after", year: 1228, title: "Court", choice: "Bowed"}];
  const sc = FP.buildScenes({story, parts: []});
  assert.deepEqual(sc.map(s => s.year), [1212, 1225, 1225, 1228]);
  assert.deepEqual(FP.buildScenes({story: [], parts: []}).map(s => s.year), [null, null, null]);
});

test("the runner offers a guest and saves the beat with Undo", () => {
  const src = readFileSync(new URL("../../modules/wodx-creation/scripts/first-night-prelude.mjs", import.meta.url), "utf8");
  assert.match(src, /data-action="guest"/);
  assert.match(src, /guest: PreludeRunApp\.#onGuest/);
  assert.match(src, /P\.guestFit\(year, guestYears\(a\)\)/);
  assert.match(src, /undo: \{tie: \{from: tie\.from, about: tie\.about, kind: "guest", scene: tie\.scene\}\}/);
  assert.match(src, /if \( u\.tie \) await dropTie\(u\.tie\)/);
  assert.match(src, /type === "guest\.answer"/);
  assert.match(src, /filter\(t => !P\.sameTie\(t, tie\)\)/);
});
