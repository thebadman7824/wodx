import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Long tasks over the clock (Storyteller 0.15.0) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const R = await imp("modules/wodx-storyteller/scripts/tasks-rules.mjs");
const {DAY, WEEK} = R;

test("tasks: a new task fills in its kind's starting point", () => {
  const t = R.normTask({id: "a", kind: "wonder", started: 100});
  assert.equal(t.interval, "week");
  assert.equal(t.goal, 10);
  assert.equal(t.delicate, true);
  assert.equal(t.next, 100 + WEEK);
  assert.equal(t.status, "open");
  const odd = R.normTask({kind: "nonsense", diff: 14, goal: -3, interval: "year"});
  assert.equal(odd.kind, "other");
  assert.equal(odd.diff, 10);
  assert.equal(odd.goal, 1);
  assert.equal(odd.interval, "day");
});

test("tasks: a roll counts as the books count it", () => {
  assert.deepEqual(R.countFaces([7, 8, 1, 3], 6), {successes: 1, botch: false});
  assert.deepEqual(R.countFaces([10, 2], 6, {specialty: true}), {successes: 2, botch: false});
  assert.deepEqual(R.countFaces([1, 3, 4], 6), {successes: 0, botch: true});
  assert.deepEqual(R.countFaces([6, 1], 6), {successes: 0, botch: false});
});

test("tasks: one roll for each interval the clock has passed", () => {
  const t = R.normTask({kind: "craft", started: 0});
  assert.equal(R.dueRolls(t, DAY - 1), 0);
  assert.equal(R.dueRolls(t, DAY), 1);
  assert.equal(R.dueRolls(t, 3 * DAY + 5), 3);
  assert.equal(R.dueRolls({...t, status: "paused"}, 10 * DAY), 0);
  assert.equal(R.dueRolls({...t, status: "done"}, 10 * DAY), 0);
});

test("tasks: successes add up to the goal; a botch loses them", () => {
  let t = R.normTask({kind: "craft", started: 0, goal: 5});
  t = R.stepTask(t, {successes: 3}, DAY);
  assert.equal(t.total, 3);
  assert.equal(t.next, 2 * DAY);
  t = R.stepTask(t, {successes: 0, botch: true}, 2 * DAY);
  assert.equal(t.total, 0);
  assert.equal(t.status, "open");
  t = R.stepTask(t, {successes: 2}, 3 * DAY);
  t = R.stepTask(t, {successes: 4}, 4 * DAY);
  assert.equal(t.status, "done");
  assert.equal(t.rolls, 4);
  // A finished task takes no more rolls
  assert.deepEqual(R.stepTask(t, {successes: 9}, 5 * DAY), t);
  assert.equal(t.log.length, 4);
});

test("tasks: a botch ruins delicate work", () => {
  const t = R.stepTask(R.normTask({kind: "talen", started: 0, total: 3, goal: 5}), {successes: 0, botch: true}, DAY);
  assert.equal(t.status, "ruined");
  assert.equal(t.total, 0);
  assert.match(R.describe(t), /ruined/);
});

test("tasks: paused time does not count", () => {
  const t = R.pauseTask(R.normTask({kind: "research", started: 0, interval: "day"}));
  assert.equal(t.status, "paused");
  const back = R.resumeTask(t, 20 * DAY);
  assert.equal(back.status, "open");
  assert.equal(back.next, 21 * DAY);
  assert.equal(R.dueRolls(back, 20 * DAY), 0);
});

test("tasks: ids are new and contain no dots", () => {
  let i = 0;
  const seq = [0.1, 0.1, 0.5];
  const id = R.newId({[R.newId({}, () => 0.1)]: {}}, () => seq[i++]);
  assert.match(id, /^t[0-9a-z]+$/);
  assert.notEqual(id, R.newId({}, () => 0.1));
});

test("tasks: wiring, the cap on rolls, Undo, and the window's search box", () => {
  const s = src("modules/wodx-storyteller/scripts/tasks.mjs");
  assert.match(s, /isActiveGM\(\)/);
  assert.match(s, /R\.MAX_ROLLS/);
  assert.match(s, /wst-task-undo/);
  assert.match(s, /searchBox\("table\.wst-tasks-t"/);
  assert.match(s, /searchBox\("select\[name=ability\]"/);
  assert.match(s, /ForcedDeletion/);
  const m = src("modules/wodx-storyteller/scripts/main.mjs");
  assert.match(m, /Tasks\.registerTaskHooks\(\)/);
  assert.match(m, /tasks: \{open: Tasks\.tasksDialog/);
  assert.equal(JSON.parse(src("modules/wodx-storyteller/module.json")).version, "0.15.0");
});
