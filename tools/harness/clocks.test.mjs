import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const K = await import(join(root, "modules/wodx-storyteller/scripts/clock-rules.mjs"));
const P = await import(join(root, "modules/wodx-storyteller/scripts/pacing-rules.mjs"));
const DAY = 86400, WEEK = 7 * DAY;

test("an own clock is cleaned: segments from the list, fill in range, who sees it", () => {
  const c = K.normClock({name: "The hunter closes in", segments: 7, filled: 99, tick: "nonsense", shown: ["a1", "a1", ""]});
  assert.equal(c.segments, 6);
  assert.equal(c.filled, 6);
  assert.equal(c.tick, "none");
  assert.deepEqual(c.shown, ["a1"]);
  assert.equal(K.normClock({shown: true}).shown, true);
  assert.equal(K.normClock({}).shown, false);
});

test("read clocks: long tasks, heat, ties and the Ledger", () => {
  const tasks = K.taskClocks([{actorId: "a1", actorName: "Mira", task: {id: "t1", name: "A fetish", goal: 5, total: 3, status: "open"}},
    {actorId: "a1", actorName: "Mira", task: {id: "t2", name: "Done", goal: 5, total: 5, status: "done"}},
    {actorId: "a2", actorName: "Jan", task: {id: "t3", name: "A big work", goal: 20, total: 10, status: "paused"}}]);
  assert.equal(tasks.length, 2);
  assert.deepEqual([tasks[0].segments, tasks[0].filled, tasks[0].for], [5, 3, ["a1"]]);
  assert.deepEqual([tasks[1].segments, tasks[1].filled], [8, 4], "a goal over 12 is scaled to 8");
  assert.match(tasks[1].note, /paused/);
  const heat = K.heatClocks([{id: "s1", name: "The docks", heat: 6, band: "Watched"}, {id: "s2", name: "Quiet", heat: 0}], 10);
  assert.deepEqual(heat.map(h => [h.id, h.filled, h.segments]), [["heat:s1", 6, 10]]);
  const now = 100 * DAY;
  const ties = K.tieClocks([{actorId: "g1", actorName: "Jan", tie: {key: "vitae", name: "Vitae", every: 30, last: now - 20 * DAY}},
    {actorId: "g1", actorName: "Jan", tie: {key: "fresh", name: "Fresh", every: 30, last: now - 2 * DAY}},
    {actorId: "g1", actorName: "Jan", tie: {key: "late", name: "Late", every: 10, last: now - 40 * DAY}}], now);
  assert.deepEqual(ties.map(t => [t.id, t.filled]), [["tie:g1:vitae", 4], ["tie:g1:late", 6]], "fresh ties are left out");
  assert.match(ties[1].note, /now/);
  const led = K.ledgerClocks([
    {id: "o1", kind: "objective", status: "open", what: "Find the relic. Somewhere", steps: [{done: true}, {done: false}, {done: true}]},
    {id: "d1", kind: "debt", status: "open", what: "Pay the Nosferatu", from: {name: "Mira"}, to: {name: "Vok"}, made: 0, due: 10 * DAY},
    {id: "d2", kind: "debt", status: "kept", made: 0, due: 10 * DAY},
    {id: "d3", kind: "boon", status: "open", made: 0, due: null}], 5 * DAY);
  assert.deepEqual(led.map(c => [c.id, c.segments, c.filled]), [["objective:o1", 3, 2], ["due:d1", 6, 3]]);
  assert.equal(led[0].name, "Objective: Find the relic");
  assert.match(led[1].name, /Mira to Vok/);
});

test("who sees what: own clocks carry their own switch, read clocks take it from the state", () => {
  const state = {own: [{id: "c1", name: "Everyone's", shown: true}, {id: "c2", name: "Mira's", shown: ["a1"]}, {id: "c3", name: "Secret"}], shown: {"task:a2:t3": ["a2"]}};
  const derived = [{id: "task:a2:t3", kind: "task", name: "Jan's work", segments: 8, filled: 4}, {id: "heat:s1", kind: "heat", name: "Heat", segments: 10, filled: 3}];
  const all = K.allClocks(state, derived);
  assert.equal(all.length, 5);
  assert.deepEqual(K.playerClocks(all, ["a1"]).map(c => c.id), ["c1", "c2"]);
  assert.deepEqual(K.playerClocks(all, ["a2"]).map(c => c.id), ["task:a2:t3", "c1"]);
  assert.deepEqual(K.playerClocks(all, []).map(c => c.id), ["c1"]);
});

test("filling by hand and ticking by themselves", () => {
  let s = {own: [{id: "f", name: "The Sabbat's plan", segments: 4, filled: 3, tick: "faction"}, {id: "w", name: "Weekly", segments: 4, tick: "week"}, {id: "h", name: "Hand", segments: 4}]};
  let r = K.step(s, "h", 2);
  assert.equal(r.clock.filled, 2);
  r = K.step(r.state, "h", -5);
  assert.equal(r.clock.filled, 0);
  r = K.tickAll(r.state, "faction", 0);
  assert.deepEqual(r.filled.map(c => c.id), ["f"], "the faction clock fills on its turn");
  r = K.tickAll(r.state, "faction", 0);
  assert.equal(r.filled.length, 0, "a full clock does not tick on");
  r = K.tickAll(r.state, "week", 1000);
  assert.equal(r.state.own.find(c => c.id === "w").filled, 0, "the first look starts the count");
  r = K.tickAll(r.state, "week", 1000 + 2 * WEEK + DAY);
  assert.equal(r.state.own.find(c => c.id === "w").filled, 2, "two full weeks, two segments");
  r = K.tickAll(r.state, "week", 50);
  assert.equal(r.state.own.find(c => c.id === "w").last, 50, "the clock set back starts the count again");
  assert.equal(r.state.own.find(c => c.id === "h").filled, 0, "a clock by hand never ticks");
});

test("a clock draws as an SVG circle in segments", () => {
  const svg = K.clockSVG({segments: 6, filled: 2}, 40);
  assert.equal((svg.match(/<path/g) ?? []).length, 6);
  assert.equal((svg.match(/class="on"/g) ?? []).length, 2);
  assert.match(svg, /aria-label="2 of 6"/);
});

test("pacing: nights run noon to noon, and a fight, a frenzy or a breach makes a night hard", () => {
  const at = (night, hour) => night * DAY + hour * 3600;
  assert.equal(P.nightOf(at(10, 23)), P.nightOf(at(11, 3)), "after midnight is the same night");
  assert.notEqual(P.nightOf(at(10, 23)), P.nightOf(at(11, 23)));
  assert.equal(P.hardness({text: "A fight began on The docks."}), "a fight");
  assert.equal(P.hardness({kind: "breach"}), "a breach");
  assert.equal(P.hardness({attention: "A frenzy"}), "a frenzy");
  assert.equal(P.hardness({kind: "roll", text: "Mira rolls Perception"}), null);
});

test("pacing note: a hard night just past, a run of hard nights, a run of quiet ones", () => {
  const at = (night, hour = 22) => night * DAY + hour * 3600;
  const now = at(20, 21);
  assert.equal(P.pacingNote([], now).text, "A week of quiet nights. Trouble may be due.");
  const three = [{at: at(16), text: "A fight began."}, {at: at(18), kind: "roll"}];
  assert.equal(P.pacingNote(three, now).text, "Three quiet nights in a row. Trouble may be due.");
  const last = [{at: at(19), text: "A fight began on the docks."}, {at: at(20, 2), attention: "A frenzy"}];
  assert.equal(P.pacingNote(last, now).text, "Last night had a fight and a frenzy. A quieter scene may suit tonight.");
  const hard = [19, 18, 16].map(n => ({at: at(n), kind: "breach"}));
  assert.equal(P.pacingNote(hard, now).text, "Three hard nights out of the last four. The coterie may need a quieter one.");
  const mixed = [{at: at(17), kind: "encounter"}, {at: at(18), kind: "roll"}];
  assert.equal(P.pacingNote(mixed, now), null, "two quiet nights after a hard one: nothing to say");
  assert.equal(P.pacingNote([{at: at(20, 20), kind: "breach"}], now).text, "A week of quiet nights. Trouble may be due.", "tonight does not count");
});
