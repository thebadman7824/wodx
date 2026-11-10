import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as DR from "../../modules/wodx-storyteller/scripts/dashboard-rules.mjs";

/* WoDX Storyteller 0.10.0: the Storyteller's dashboard. */
test("time words: minutes, hours, days, ahead and behind", () => {
  assert.equal(DR.whenLabel(30), "now");
  assert.equal(DR.whenLabel(600), "in 10 min");
  assert.equal(DR.whenLabel(7200), "in 2 h");
  assert.equal(DR.whenLabel(86400), "in 1 day");
  assert.equal(DR.whenLabel(-3 * 86400), "3 days ago");
  assert.equal(DR.whenLabel(null), "no date");
});
test("a party line reads the sheet, shows blood only for those who have it, and leaves missing traits out", () => {
  const v = DR.partyRow({id: "v", name: "Anezka", type: "Vampire", statuses: ["frenzy", "frenzy", "blind"], where: "The mill",
    system: {health: {damage: {bashing: 1, lethal: 2, aggravated: 0}}, advantages: {willpower: {permanent: 6, temporary: 3}, bloodpool: {temporary: 2, max: 12}}}});
  assert.deepEqual(v.wounds, {bashing: 1, lethal: 2, aggravated: 0, taken: 3, levels: 7, down: false});
  assert.deepEqual(v.willpower, {now: 3, of: 6});
  assert.deepEqual(v.blood, {now: 2, of: 12});
  assert.deepEqual(v.statuses, ["blind", "frenzy"]);
  assert.equal(DR.woundWords(v.wounds), "1 bashing, 2 lethal");
  const m = DR.partyRow({id: "m", name: "Brother Tomas", type: "Mortal", system: {advantages: {bloodpool: {temporary: 0, max: 10}}}});
  assert.equal(m.blood, null);
  assert.equal(m.willpower, null);
  assert.equal(DR.woundWords(m.wounds), "unhurt");
  const g = DR.partyRow({name: "Ghoul", type: "Mortal", system: {settings: {hasbloodpool: true}, advantages: {bloodpool: {temporary: 1, max: 3}}}});
  assert.deepEqual(g.blood, {now: 1, of: 3});
  const down = DR.partyRow({name: "Zed", system: {health: {damage: {aggravated: 7}}}});
  assert.ok(down.wounds.down);
  assert.deepEqual(DR.sortParty([m, v, down]).map(r => r.name), ["Zed", "Anezka", "Brother Tomas"]);
});
test("clocks: only what is ahead and timed, soonest first, capped", () => {
  const c = DR.clocks({now: 1000, dawnAt: 5000,
    timed: [{actor: "A", name: "Obfuscate", until: 2000}, {actor: "B", name: "Old", until: 500}, {actor: "C", name: "Forever"}],
    beats: [{name: "The bell", on: "time", time: 3000}, {name: "Done", on: "time", time: 4000, fired: true}, {name: "At the mill", on: "place"}],
    dreams: [{actor: "A", title: "The stag", at: 1500}, {actor: "A", title: "Untimed", at: null}, {actor: "A", title: "Gone", at: 1200, released: true}],
    events: [{name: "The fire", at: 9000}, {name: "No date", at: null}]});
  assert.deepEqual(c.map(x => x.kind), ["dream", "effect", "beat", "dawn", "event"]);
  assert.equal(DR.clocks({now: 0, timed: Array.from({length: 50}, (_, i) => ({until: i + 1}))}).length, 40);
  assert.deepEqual(DR.clocks({now: null}), []);
});
test("open threads: waiting beats, untimed beats, live rumours and the queue", () => {
  const t = DR.threads({beats: [{name: "At the mill", on: "place"}, {name: "Flagged", on: "flag"}, {name: "Timed", on: "time", time: 5}, {name: "No time", on: "time", time: null}, {name: "Fired", on: "map", fired: true}],
    rumours: [{text: "The bell rang", known: 3}], queue: 2, held: 0});
  assert.deepEqual(t.map(x => x.what), ["Beat: At the mill", "Beat: Flagged", "Beat: No time", "Rumour: The bell rang", "The approval queue"]);
});
test("consequences: open only, overdue first, then soonest, undated last", () => {
  const e = DR.consequences([{id: "a", what: "later", due: 900}, {id: "b", what: "late", due: 50}, {id: "c", what: "none", due: null}, {id: "d", what: "soon", due: 200}, {id: "e", what: "kept", due: 10, status: "kept"}], 100);
  assert.deepEqual(e.map(x => x.id), ["b", "d", "a", "c"]);
  assert.equal(e[0].overdue, true);
  assert.equal(e[3].due, null);
});
test("the dashboard is wired: a toolbar button, the api, searchable lists, read only", () => {
  const main = readFileSync(new URL("../../modules/wodx-storyteller/scripts/main.mjs", import.meta.url), "utf8");
  const ui = readFileSync(new URL("../../modules/wodx-storyteller/scripts/dashboard.mjs", import.meta.url), "utf8");
  assert.match(main, /tokens\.tools\.wodxDashboard = /);
  assert.match(main, /dashboard: \{open: /);
  assert.match(ui, /searchBox\(/);
  assert.doesNotMatch(ui, /\.update\(|setSetting|mutate\(/);
});
