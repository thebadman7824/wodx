import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Downtime projects (B3340-B3343) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const R = await imp("modules/wodx-storyteller/scripts/tasks-rules.mjs");
const P = await imp("modules/wodx-storyteller/scripts/projects-rules.mjs");
const {DAY, WEEK} = R;

test("projects: the new kinds fill in and older tasks keep their pace", () => {
  for ( const k of ["business", "court", "language", "track", "herd"] ) assert.ok(R.KINDS[k], k);
  const old = R.normTask({id: "a", kind: "research", started: 0});
  assert.equal(old.nights, 0);
  assert.equal(old.next, WEEK, "no nights given: the interval is as before");
  assert.equal(old.trouble, true);
  assert.equal(old.target, null);
  const c = R.normTask({kind: "court", target: {id: "x1", name: "Jana"}, nights: 9});
  assert.equal(c.nights, 7);
  assert.deepEqual(c.target, {id: "x1", name: "Jana"});
});

test("projects: fewer nights than the kind needs stretch each roll", () => {
  assert.equal(R.intervalS({kind: "research", interval: "week", nights: 3}), WEEK);
  assert.equal(R.intervalS({kind: "research", interval: "week", nights: 1}), 3 * WEEK);
  assert.equal(R.intervalS({kind: "research", interval: "week", nights: 7}), WEEK, "more nights never speed it past the kind's pace");
  const t = R.normTask({id: "a", kind: "track", interval: "day", nights: 1, started: 0});
  assert.equal(t.next, 3 * DAY);
  assert.equal(R.dueRolls(t, 3 * DAY), 1);
  assert.equal(R.dueRolls(t, 5 * DAY), 1);
  assert.equal(R.dueRolls(t, 6 * DAY), 2);
  const s = R.stepTask(t, {successes: 1, botch: false}, t.next);
  assert.equal(s.next, 6 * DAY);
  assert.equal(R.resumeTask({...R.pauseTask(t)}, 100).next, 100 + 3 * DAY);
});

test("projects: the weekly budget, and which projects pause when it runs out", () => {
  assert.equal(P.budgetFor({kind: "Vampire"}), 6);
  assert.equal(P.budgetFor({kind: "Mortal"}), 7);
  assert.equal(P.budgetFor({kind: "Vampire", own: 3}), 3);
  assert.equal(P.budgetFor({kind: "Mortal", own: 12}), 7);
  const ts = [
    {id: "a", status: "open", nights: 3, started: 1},
    {id: "b", status: "open", nights: 3, started: 2},
    {id: "c", status: "open", nights: 2, started: 3},
    {id: "d", status: "open", nights: 0, started: 0},
    {id: "e", status: "done", nights: 5, started: 0}
  ];
  assert.equal(P.nightsGiven(ts), 8);
  assert.deepEqual(P.overBudget(ts, 6), ["c"]);
  assert.deepEqual(P.overBudget(ts, 3), ["c", "b"]);
  assert.deepEqual(P.overBudget(ts, 8), []);
  assert.match(P.budgetLine("Ada", 8, 6), /2 too many/);
  assert.match(P.budgetLine("Ada", 4, 6), /2 free/);
});

test("projects: complications by kind and year, always on a botch", () => {
  const never = () => 0.99, always = () => 0;
  const t = R.normTask({kind: "research"});
  assert.equal(P.drawTrouble(t, {botch: false}, {year: 1300, rand: never}), null);
  const b = P.drawTrouble(t, {botch: true}, {year: 1300, rand: never});
  assert.ok(b && b.botch && b.text);
  assert.ok(P.drawTrouble(t, {botch: false}, {year: 1300, rand: always}));
  assert.equal(P.drawTrouble({...t, trouble: false}, {botch: true}, {year: 1300}), null);
  const keys = y => P.troubleFor("research", y).map(r => r.key);
  assert.ok(!keys(1300).includes("index") && keys(1600).includes("index") && !keys(1990).includes("index"));
  assert.ok(!keys(1800).includes("logged") && keys(2000).includes("logged"));
  assert.ok(P.troubleFor("track", 1700).some(r => r.key === "watch") && !P.troubleFor("track", 1700).some(r => r.key === "police"));
  assert.ok(P.troubleFor("nonsense", 1500).length >= 5, "unknown kinds still draw the common rows");
  const seen = {...t, complications: [{key: "closed"}, {key: "fire"}, {key: "same"}]};
  for ( let i = 0; i < 20; i++ ) {
    const c = P.drawTrouble(seen, {botch: true}, {year: 1300, rand: () => i / 20});
    assert.ok(!["closed", "fire", "same"].includes(c.key), "a fresh row where there is one");
  }
  const list = Array.from({length: 12}, (_, i) => ({key: `k${i}`, text: "x"}));
  assert.equal(list.reduce((l, c, i) => P.addTrouble(l, c, i), []).length, P.KEEP);
});

test("projects: what a finished project leaves never touches the sheet by itself", () => {
  assert.equal(P.outcomeOf({kind: "business"}).background, "Resources");
  assert.equal(P.outcomeOf({kind: "herd"}).background, "Herd");
  assert.equal(P.outcomeOf({kind: "language"}).background, "");
  assert.match(P.outcomeOf({kind: "track"}, "Petr").text, /Petr/);
  assert.equal(P.courtEvent({successes: 2}), "time");
  assert.equal(P.courtEvent({successes: 0}), null);
  assert.equal(P.courtEvent({botch: true}), "slight");
});

test("projects: the clock rolls them, courting goes through the hearts api and the planner shows the budget", () => {
  const s = src("modules/wodx-storyteller/scripts/tasks.mjs");
  assert.match(s, /P\.overBudget\(/);
  assert.match(s, /P\.drawTrouble\(/);
  assert.match(s, /hearts\?\.court\?\.\(/, "warmth moves only through WoDX NPC, which keeps the age floor");
  assert.match(s, /wodxProjectComplication/);
  assert.match(s, /P\.budgetLine\(/);
  assert.match(s, /last && game\.user\.isGM/, "complications are the Storyteller's to see");
  assert.match(src("modules/wodx-storyteller/scripts/main.mjs"), /projects: ProjectRules/);
});
