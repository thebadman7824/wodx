// Book one's fronts, roles and clue carriers (B4910-B4919): pace, chapters, the twist's week, holds and strikes,
// succession, judgements, clues and the map sights.
import {test} from "node:test";
import assert from "node:assert/strict";
import {join, dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const F = await import(join(root, "modules/wodx-chronicle/scripts/front-rules.mjs"));
const DAY = 86400;
const ALL = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"];

test("the spine holds together: six fronts, two judgements, eight roles, six clues of three carriers", () => {
  assert.deepEqual(F.validate(), []);
  assert.deepEqual(F.FRONTS.map(f => f.key), ["court", "cult", "council", "church", "marta", "husbandman"]);
  assert.deepEqual(F.FRONTS.map(f => f.every), [7, 7, 14, 14, 21, 14]);
  assert.equal(F.JUDGEMENTS.length, 2);
  assert.equal(F.ROLES.length, 8);
  assert.equal(F.CLUES.length, 6);
  for ( const c of F.CLUES ) assert.equal(c.carriers.length, 3);
});

test("each front steps on its own pace, and never before its step's chapter", () => {
  let st = F.normState({}, 0);
  assert.deepEqual(F.dueFronts(st, {now: 0, played: []}), ["court", "marta"]);
  st = F.step(st, "court", {now: 0}).state;
  assert.match(F.whyNot(st, "court", {now: 0, played: ["c1"]}), /Next step in 7 days/);
  assert.equal(F.whyNot(st, "court", {now: 7 * DAY, played: ["c1"]}), "");
  assert.match(F.whyNot(st, "court", {now: 7 * DAY, played: []}), /waits for chapter 2/);
  st = F.step(st, "court", {now: 7 * DAY, played: ["c1"]}).state;
  assert.equal(st.fronts.court.at, 2);
  // The council steps every two weeks
  let c = F.normState({}, 0);
  c = F.step(c, "council", {now: 0, played: ["c1"]}).state;
  assert.match(F.whyNot(c, "council", {now: 10 * DAY, played: ALL}), /Next step in 4 days/);
});

test("a twist's week keeps fronts back unless pushed, and no front gives way to two twists running", () => {
  let st = F.step(F.normState({}, 0), "court", {now: 0}).state;
  const tw = {revealed: {1: {at: 6 * DAY}}, last: 6 * DAY};
  assert.match(F.whyNot(st, "court", {now: 7 * DAY, played: ["c1"], twists: tw}), /A twist came this week/);
  st = F.slip(st, {now: 7 * DAY, played: ["c1"], twists: tw});
  assert.equal(st.fronts.court.slipped, 6 * DAY);
  // Still the same twist's week: it waits
  assert.match(F.whyNot(st, "court", {now: 8 * DAY, played: ["c1"], twists: tw}), /A twist/);
  // The next twist does not hold it again
  const tw2 = {revealed: {1: {at: 6 * DAY}, 5: {at: 13 * DAY}}, last: 13 * DAY};
  assert.equal(F.whyNot(st, "court", {now: 13 * DAY, played: ["c1"], twists: tw2}), "");
  // Pushed steps through a twist's week
  let p = F.push(F.step(F.normState({}, 0), "court", {now: 0}).state, "court");
  assert.equal(F.whyNot(p, "court", {now: 7 * DAY, played: ["c1"], twists: tw}), "");
  p = F.step(p, "court", {now: 7 * DAY, played: ["c1"], twists: tw}).state;
  assert.equal(p.fronts.court.pushed, false);
});

test("held fronts wait, struck fronts go back a step, and the Storyteller can step one by hand", () => {
  let st = F.step(F.normState({}, 0), "cult", {now: 0, played: ["c1"]}).state;
  st = F.hold(st, "cult", true);
  assert.equal(F.whyNot(st, "cult", {now: 30 * DAY, played: ALL}), "Held.");
  assert.throws(() => F.step(st, "cult", {now: 30 * DAY, played: ALL, force: true}), /Held/);
  st = F.hold(st, "cult", false, 30 * DAY);
  assert.match(F.whyNot(st, "cult", {now: 30 * DAY, played: ALL}), /Next step in 7 days/);
  st = F.step(st, "cult", {now: 30 * DAY, played: ALL, force: true}).state;
  assert.equal(st.fronts.cult.at, 2);
  st = F.strike(st, "cult", 31 * DAY);
  assert.equal(st.fronts.cult.at, 1);
  assert.equal(F.stepNow(st, "cult").key, "gift");
  assert.equal(F.strike(F.normState({}, 0), "cult").fronts.cult.at, 0);
});

test("roles pass down their lines as people fall, and the most trusted contact is the one bought", () => {
  let st = F.normState({}, 0);
  assert.equal(F.holderOf(st, "contact"), "Mikhal the Tinker");
  st = F.lean(F.lean(st, "Jitka"), "Jitka");
  assert.equal(F.holderOf(st, "contact"), "Jitka");
  st = F.setGone(st, "Jitka");
  assert.equal(F.holderOf(st, "contact"), "Mikhal the Tinker");
  st = F.setGone(st, "Baba Yaroslava");
  assert.equal(F.holderOf(st, "words"), "An elder who sat at the Dolany fire");
  st = F.setGone(st, "An elder who sat at the Dolany fire");
  st = F.setGone(st, "The burned pages at Radu's fire");
  assert.equal(F.holderOf(st, "words"), "The burned pages at Radu's fire", "the last of a lasting line stays");
  st = F.setGone(F.setGone(st, "Old Radu"), "A character who took the Husbandman's gift");
  assert.equal(F.holderOf(st, "price"), "Bogdan Ursu");
  // The twist's heart takes the clerk out
  assert.equal(F.holderOf(st, "inside", {revealed: {24: {variant: "killed"}}}), "A councillor in Graff's debt");
  assert.equal(F.holderOf(st, "inside", {revealed: {24: {variant: "turned"}}}), "The margrave's clerk");
  // The Storyteller's choice wins
  assert.equal(F.holderOf(F.choose(st, "mortal", "Lenka"), "mortal"), "Lenka");
  assert.match(F.fill("Bound: @mortal, speaking: @voice.", st), /Bound: Peter, speaking: Konrad the Flesh-Smith/);
});

test("a stopped courier is followed by the next a week later", () => {
  let st = F.stopCourier(F.normState({}, 0), 10 * DAY);
  assert.equal(F.courierRides(st, 15 * DAY), null);
  st = F.courierRides(st, 17 * DAY);
  assert.equal(st.courier.rider, 2);
  assert.match(F.holderOf(st, "courier"), /rider 2/);
  assert.equal(F.courierRides(st, 40 * DAY), null);
});

test("judgements send their card once, when their chapter comes", () => {
  let st = F.judge(F.normState({}, 0), "reinhold", "lied");
  assert.deepEqual(F.judgementsDue(st, ["c1"]), []);
  const due = F.judgementsDue(st, ["c1", "c2", "c3", "c4", "c5", "c6"]);
  assert.equal(due.length, 1);
  assert.equal(due[0].chapter, "c7");
  st = F.told(st, "reinhold", "lied");
  assert.deepEqual(F.judgementsDue(st, ALL), []);
  st = F.judge(st, "yaroslava", "trust");
  assert.match(F.fill(F.judgementsDue(st, ALL.concat("c9")).length ? F.judgementOf("yaroslava").choices.trust.text : "", st), /Baba Yaroslava/);
  assert.equal(F.judge(st, "yaroslava", "nonsense").judged.yaroslava, "trust");
});

test("three carriers make the whole fact; each pins its own card", () => {
  let r = F.find(F.normState({}, 0), "konrad", 0);
  assert.ok(r.fresh && !r.whole);
  r = F.find(r.state, "konrad", 0);
  assert.ok(!r.fresh);
  r = F.find(F.find(r.state, "konrad", 2).state, "konrad", 1);
  assert.ok(r.whole);
  assert.deepEqual(r.state.clues.konrad, [0, 1, 2]);
  assert.equal(F.carrierCard("konrad", 0).kind, "person");
  assert.equal(F.carrierCard("konrad", 2).kind, "clue");
  assert.match(F.wholeCard("konrad").text, /Konrad the Flesh-Smith leads the cult/);
  assert.deepEqual(F.unfind(r.state, "konrad", 1).clues.konrad, [0, 2]);
  assert.throws(() => F.find(r.state, "konrad", 5), /no such carrier/);
});

test("sights land on a walkable map, the same way each time, inside the scene", () => {
  assert.equal(F.pickScene(["Sessio VII · First Contact", "Locus · The Ashfield", "Rothenstein: The Ashfield"], "The Ashfield"), "Locus · The Ashfield");
  assert.equal(F.pickScene(["Dolany Village (gridless trial)", "Dolany Village"], "Dolany Village"), "Dolany Village");
  assert.equal(F.pickScene(["A"], "@company"), null);
  const rect = {x: 100, y: 100, width: 4000, height: 3000};
  const sight = F.FRONTS.find(f => f.key === "cult").steps.find(s => s.key === "walk").sight;
  const a = F.sightLooks(sight, rect, "x"), b = F.sightLooks(sight, rect, "x");
  assert.deepEqual(a, b);
  assert.equal(a.length, 10);
  for ( const l of a ) assert.ok(l.at.x >= rect.x && l.at.x <= rect.x + rect.width && l.at.y >= rect.y && l.at.y <= rect.y + rect.height);
  const row = a.slice(0, 7).map(l => l.at.y);
  assert.equal(new Set(row).size, 1, "a line of miners walks in a row");
  const quake = F.sightLooks(F.FRONTS.find(f => f.key === "husbandman").steps.at(-1).sight, rect, "q");
  assert.ok(quake.some(l => l.kind === "quake" && !l.at));
});
