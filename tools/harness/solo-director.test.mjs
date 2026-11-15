import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* WoDX Solo, step 4 of The Lone Chronicle: the director, experience from the night's log, the recap (B6045 to B6049) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const D = await import(pathToFileURL(join(root, "modules/wodx-solo/scripts/director-rules.mjs")));
const WR = await import(pathToFileURL(join(root, "modules/wodx-storyteller/scripts/wrapup-rules.mjs")));
const DAY = 86400;
const at = (night, hour) => (night * DAY) + (DAY / 2) + (hour * 3600); // hours after noon
const NOW = at(100, 9); // night 100, 9 hours after noon

test("the temper: a rest after a hard night, pressure after quiet ones", () => {
  assert.equal(D.temperOf([{at: at(99, 10), kind: "encounter"}], NOW), "rest");
  assert.equal(D.temperOf([{at: at(97, 10), kind: "encounter"}], NOW), "pressure", "two quiet nights since");
  assert.equal(D.temperOf([{at: at(98, 10), kind: "encounter"}], NOW), "steady");
  assert.equal(D.temperOf([], NOW), "pressure");
  const hard3 = [96, 97, 98].map(n => ({at: at(n, 10), text: "A fight began"}));
  assert.equal(D.temperOf(hard3, NOW), "rest", "three hard nights of the last four");
  assert.equal(D.temperOf(hard3.slice(1), NOW), "steady", "two hard of four, last night quiet");
});

test("how many: the dial takes one off or adds one, from 1 to 3", () => {
  assert.equal(D.howMany("rest", 1), 1);
  assert.equal(D.howMany("pressure", 1), 2);
  assert.equal(D.howMany("pressure", 0.5), 1);
  assert.equal(D.howMany("pressure", 1.5), 3);
  assert.equal(D.howMany("rest", 0.5), 1);
  assert.equal(D.howMany("nonsense"), 1);
});

test("picking: a rest keeps to light things, kinds differ, nothing brought again at once", () => {
  const things = [
    {key: "a", kind: "flaw", heavy: true, title: "Hunted"},
    {key: "b", kind: "ledger", heavy: false, title: "An oath"},
    {key: "c", kind: "ledger", heavy: false, title: "A debt"},
    {key: "d", kind: "clock", heavy: true, title: "The war"}
  ];
  const rest = D.pickThings({things, temper: "rest", count: 2, rand: () => 0});
  assert.ok(rest.every(t => !t.heavy));
  const p = D.pickThings({things, temper: "pressure", count: 3, rand: () => 0.5});
  assert.equal(new Set(p.map(t => t.kind)).size, 3, "three kinds before any twice");
  const again = D.pickThings({things, temper: "pressure", count: 4, brought: [{key: "a", night: 99}], night: 100, rand: () => 0});
  assert.ok(!again.some(t => t.key === "a"));
  const later = D.pickThings({things, temper: "pressure", count: 4, brought: [{key: "a", night: 90}], night: 100, rand: () => 0});
  assert.ok(later.some(t => t.key === "a"));
  const only = D.pickThings({things: [things[0]], temper: "rest", count: 1, rand: () => 0});
  assert.equal(only[0].key, "a", "a rest with nothing light left still brings what there is");
  const list = D.addBrought([{key: "a", night: 1}], [{key: "a"}, {key: "z"}], 5);
  assert.deepEqual(list, [{key: "a", night: 5}, {key: "z", night: 5}]);
});

test("the Ledger and the clocks as the director's things", () => {
  const me = {id: "A", name: "Ilse"};
  const L = D.ledgerThings([
    {id: "o", kind: "oath", status: "open", from: me, to: {name: "the Prince"}, what: "guard the gate"},
    {id: "d", kind: "debt", status: "open", from: me, to: {name: "Jakob"}, what: "ten groschen"},
    {id: "b", kind: "boon", status: "open", from: {name: "Vera"}, to: {name: "ilse"}},
    {id: "k", kind: "oath", status: "kept", from: me, to: {name: "X"}},
    {id: "j", kind: "objective", status: "open", from: me, to: {}, what: "Find the ledger", steps: [{text: "Reach the mill", done: false}]}
  ], me);
  assert.deepEqual(L.map(t => t.key), ["ledger:o", "ledger:d", "ledger:b", "ledger:j:Reach the mill"]);
  assert.equal(L[1].heavy, true);
  assert.equal(L[1].title, "Jakob calls in what is owed");
  assert.equal(L[2].title, "Vera owes you");
  const C = D.clockThings([{id: "w", kind: "own", name: "The war", segments: 6, filled: 4}, {id: "x", kind: "task", name: "t", segments: 4, filled: 0}, {id: "f", kind: "own", segments: 4, filled: 4}]);
  assert.equal(C.length, 1);
  assert.equal(C[0].heavy, true);
  assert.equal(C[0].text, "The war moves a step closer; 1 to go.");
  assert.equal(D.clockThings([{id: "w", kind: "own", name: "The war", segments: 6, filled: 5}])[0].text, "The war comes to a head tonight.");
});

test("experience: what the log shows, by the line's own list, at most 5", () => {
  const me = {id: "A", name: "Ilse"};
  const entries = [
    {at: at(100, 2), kind: "travel", actor: "A", place: "Brno", text: "To Brno"},
    {at: at(100, 3), kind: "encounter", actor: "A", text: "On the road"},
    {at: at(100, 4), text: "A fight began on the bridge"},
    {at: at(99, 4), kind: "travel", actor: "A", place: "Olomouc", text: "To Olomouc"}
  ];
  const ledger = [{id: "o", kind: "oath", status: "kept", from: me, to: {name: "P"}, what: "guard", history: [{at: at(100, 5), what: "Marked Kept or paid."}]}];
  const deeds = D.nightDeeds({entries, me, ledger, night: 100, seenBefore: ["Olomouc"]});
  assert.deepEqual([deeds.there, deeds.danger, deeds.learning, deeds.success], [true, true, true, true]);
  assert.equal(deeds.why.learning, "saw Brno for the first time");
  const reasons = WR.reasonsFor("vampire", {story: true});
  const ticks = D.xpTicks(deeds, reasons);
  assert.ok(ticks.includes("there") && ticks.includes("danger") && ticks.includes("success"));
  const award = D.xpAward(ticks, reasons);
  assert.ok(award.points >= 3 && award.points <= D.XP_NIGHT_MAX);
  assert.match(award.note, /^The night: took part in the session/);
  // a night with nothing done gives nothing
  const none = D.nightDeeds({entries, me, night: 101});
  assert.equal(D.xpAward(D.xpTicks(none, reasons), reasons).points, 0);
  // the oracle counts as learning, and as being there
  const oracle = D.nightDeeds({me, asked: [{at: at(101, 1), actorId: "A", q: "Is it?", answer: "yes"}], night: 101});
  assert.ok(oracle.there && oracle.learning && !oracle.danger);
  // a fight with nothing of the character's that night is not the character's danger
  assert.equal(D.nightDeeds({entries: [{at: at(102, 1), text: "A fight began"}], me, night: 102}).danger, false);
  // the cap
  const many = [{key: "a", label: "A", xp: 3}, {key: "b", label: "B", xp: 3}];
  assert.equal(D.xpAward(["a", "b"], many).points, D.XP_NIGHT_MAX);
});

test("the recap: the character's night in its own words, the oracle too, cut short when long", () => {
  const me = {id: "A"};
  const entries = [
    {at: at(100, 3), kind: "encounter", actor: "A", text: "Two drunks on the road"},
    {at: at(100, 1), kind: "travel", actor: "A", text: "To Brno"},
    {at: at(100, 2), kind: "ask", actor: "A", text: "Asked to go"},
    {at: at(100, 2), kind: "travel", actor: "B", text: "Not mine"},
    {at: at(99, 2), kind: "travel", actor: "A", text: "The night before"}
  ];
  const rows = D.recapRows({entries, me, asked: [{at: at(100, 1.5), actorId: "A", q: "Is the mill watched?", answer: "yes", label: "Yes"}], night: 100});
  assert.deepEqual(rows.map(r => r.text), ["To Brno", "You asked the oracle: Is the mill watched? Yes.", "Two drunks on the road"]);
  const long = Array.from({length: 20}, (_, i) => ({at: at(100, i / 4), kind: "note", actor: "A", text: `n${i}`}));
  const cut = D.recapRows({entries: long, me, night: 100});
  assert.equal(cut.length, D.RECAP_MAX);
  assert.equal(cut.at(-1).text, "And 9 more besides.");
});

test("the seat's side: dusk, morning, the award, the recap and I am stuck", () => {
  const src = readFileSync(join(root, "modules/wodx-solo/scripts/director.mjs"), "utf8");
  assert.match(src, /Hooks\.on\("updateWorldTime"/);
  assert.match(src, /Hooks\.on\("userConnected"/);
  assert.match(src, /award\(\[actor\], points, note\)/);
  assert.match(src, /flags: \{\[ST\]: \{aid: "director"\}/, "the director's cards are on the Leads page");
  assert.match(src, /clocks\.save\(/);
  const panel = readFileSync(join(root, "modules/wodx-solo/scripts/panel.mjs"), "utf8");
  assert.match(panel, /director\.direct\(\{actorId: actor\.id, force: true, count: 1, light: true\}\)/);
  const main = readFileSync(join(root, "modules/wodx-solo/scripts/main.mjs"), "utf8");
  assert.match(main, /registerDirectorSettings\(\)/);
  assert.match(main, /installDirector\(/);
  assert.match(main, /director: directorApi/);
});
