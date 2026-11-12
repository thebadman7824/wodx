import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const L = await import(join(root, "modules/wodx-chronicle/scripts/legends-rules.mjs"));

// A plain calendar for the tests: one year is 1000 seconds from 1197
const dateOf = t => ({year: 1197 + Math.floor(t / 1000), month: 1 + Math.floor((t % 1000) / 100), day: 1});

test("dated events become lines, and follow the clock when it goes back", () => {
  const lines = L.eventLines([{id: "camarilla", name: "The Camarilla", summary: "The sect is founded.", year: 1435}, {id: "x", name: "X", summary: "", year: 1999, month: 3, day: 2}]);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].id, "event:camarilla");
  assert.equal(L.dateLabel(lines[1]), "2 March 1999");
  let {legends} = L.merge(null, lines, {firedIds: ["camarilla", "x"]});
  assert.equal(legends.entries.length, 2);
  ({legends} = L.merge(legends, [], {firedIds: ["camarilla"]}));
  assert.deepEqual(legends.entries.map(e => e.id), ["event:camarilla"]);
});

test("deaths, Embraces and ghouls come from actors and the archive; copies are not deaths", () => {
  const actors = [
    {id: "a1", name: "Old Smith", chronology: {died: 150000, cause: "old age"}},
    {id: "a2", name: "Anezka", chronology: {embraced: 253000}, lineage: {sire: {id: "s1", name: "Lord Vok"}}},
    {id: "a3", name: "Jan", chronology: {ghouled: 600000}, lineage: {domitor: {id: "a2", name: "Anezka"}}},
    {id: "a4", name: "Orphan", chronology: {embraced: 700000}}
  ];
  const archived = {a1: {name: "Old Smith", died: 150000}, z9: {name: "Gone", died: 90000, cause: "fire"}, c1: {name: "Copy", died: 1, kind: "copy"}};
  const out = L.actorLines(actors, archived, dateOf);
  const ids = out.map(e => e.id).sort();
  assert.deepEqual(ids, ["death:a1", "death:z9", "embrace:a2", "embrace:a4", "ghoul:a3"]);
  const emb = out.find(e => e.id === "embrace:a2");
  assert.equal(emb.year, 1450);
  assert.match(emb.text, /Lord Vok Embraced Anezka/);
  assert.equal(emb.shown, false, "Embraces wait for the Storyteller");
  assert.match(out.find(e => e.id === "embrace:a4").text, /sire is not known/);
  assert.equal(out.find(e => e.id === "death:z9").year, 1287);
  assert.equal(out.find(e => e.id === "death:a1").shown, true);
});

test("the Ledger gives kept and broken boons, oaths and debts, dated when marked", () => {
  const entries = [
    {id: "b1", kind: "boon", size: "major", status: "kept", from: {id: "x", name: "Prince Ota"}, to: {id: "y", name: "Mira"}, what: "Silence at court.", made: 1000, history: [{at: 5000, what: "Marked Kept or paid."}]},
    {id: "o1", kind: "oath", status: "broken", from: {name: "Mira"}, to: {name: "Ota"}, what: "", made: 2000, history: []},
    {id: "b2", kind: "boon", status: "open", from: {name: "A"}, to: {name: "B"}},
    {id: "c1", kind: "consequence", status: "kept", from: {name: "A"}}
  ];
  const out = L.ledgerLines(entries, dateOf);
  assert.deepEqual(out.map(e => e.id), ["ledger:b1:kept", "ledger:o1:broken"]);
  assert.equal(out[0].year, 1202);
  assert.equal(out[0].text, "Kept: a major boon owed by Prince Ota to Mira (Silence at court).");
  assert.equal(out[0].shown, true);
  assert.equal(out[1].shown, false, "oaths start hidden");
  assert.equal(out[1].year, 1199);
});

test("offices: the first build records who holds each seat; later builds record seats won and lost", () => {
  const f = [{id: "f1", name: "The Court of Brno", politics: {offices: {prince: ["p1"], sheriff: ["s1"]}}},
    {id: "f2", name: "A Hidden Cult", secret: true, politics: {offices: {prince: ["c1"]}}}];
  const names = {p1: "Ota", s1: "Vlk", s2: "Mira", c1: "Hana"};
  const s1 = L.officeSnapshot(f, (fac, k) => k[0].toUpperCase() + k.slice(1), id => names[id]);
  const first = L.officeLines(null, s1, {at: 10, year: 1400});
  assert.equal(first.length, 3);
  assert.match(first[0].text, /Ota held the seat of Prince in The Court of Brno when this book began/);
  assert.equal(first.find(e => e.faction === "A Hidden Cult").shown, false, "a secret faction's seats wait");
  f[0].politics.offices.sheriff = ["s2"];
  const s2 = L.officeSnapshot(f, (fac, k) => k, id => names[id]);
  const next = L.officeLines(s1, s2, {at: 20, year: 1410});
  assert.deepEqual(next.map(e => e.text).sort(), ["Mira took the seat of sheriff in The Court of Brno.", "Vlk lost the seat of Sheriff in The Court of Brno."]);
  assert.deepEqual(L.officeLines(s2, s2, {at: 30}), []);
});

test("holdings: a place's own year dates the first line; later changes of hands are recorded", () => {
  const p1 = [{uuid: "Scene.a", name: "The Mill", owner: {id: "Actor.x", name: "Ota", since: 1450}}, {uuid: "Scene.b", name: "Haven", owner: {id: "Actor.y", name: "Mira"}}];
  const s1 = L.holdingSnapshot(p1);
  const first = L.holdingLines(null, s1, {at: 1, year: 1500});
  assert.equal(first.find(e => e.place === "The Mill").year, 1450);
  assert.equal(first.find(e => e.place === "Haven").year, 1500);
  const s2 = L.holdingSnapshot([{uuid: "Scene.a", name: "The Mill", owner: {id: "faction:f1", name: "The Court"}}]);
  const next = L.holdingLines(s1, s2, {at: 2, year: 1510});
  assert.deepEqual(next.map(e => e.text).sort(), ["Mira no longer holds Haven.", "The Mill passed from Ota to The Court."]);
  assert.deepEqual(L.holdingLines(s2, s2, {at: 3}), []);
});

test("merge keeps the Storyteller's switches and does not add a line twice", () => {
  const a = L.eventLines([{id: "e1", name: "E", summary: "s", year: 1300}]);
  let {legends, added} = L.merge(null, a, {firedIds: ["e1"]});
  assert.equal(added.length, 1);
  legends.entries[0].shown = false;
  ({legends, added} = L.merge(legends, a, {firedIds: ["e1"]}));
  assert.equal(added.length, 0);
  assert.equal(legends.entries[0].shown, false);
});

test("the book runs across every era: chapters by century from 1197 to the Future Darkness", () => {
  const years = [1197, 1347, 1666, 1899, 1999, 2050, 2099];
  const lines = years.map((y, i) => L.normEntry({id: `e${i}`, kind: "event", year: y, text: `In ${y}`}));
  lines.push(L.normEntry({id: "u", kind: "holding", text: "Someone held a place"}));
  const ch = L.chapters(lines);
  assert.deepEqual(ch.map(c => c.name), ["1100 to 1199", "1300 to 1399", "1600 to 1699", "1800 to 1899", "1900 to 1999", "2000 to 2099", "Undated"]);
  assert.equal(ch[5].entries.length, 2);
});

test("filters: person, place, faction, years, kind; players see shown lines up to today only", () => {
  const e = [
    L.normEntry({id: "1", kind: "death", year: 1450, text: "Ota died.", people: [{id: "a", name: "Ota"}], place: "Brno"}),
    L.normEntry({id: "2", kind: "office", year: 1500, text: "Mira took a seat.", people: [{name: "Mira"}], faction: "The Court of Brno"}),
    L.normEntry({id: "3", kind: "embrace", year: 1990, text: "Mira Embraced Jan.", people: [{name: "Mira"}, {name: "Jan"}]}),
    L.normEntry({id: "4", kind: "event", year: 2050, text: "A future event."})
  ];
  assert.deepEqual(L.filterEntries(e, {person: "mira"}).map(x => x.id), ["2", "3"]);
  assert.deepEqual(L.filterEntries(e, {person: "a"}).map(x => x.id), ["1", "2", "3"], "an id or part of a name");
  assert.deepEqual(L.filterEntries(e, {place: "brno"}).map(x => x.id), ["1"]);
  assert.deepEqual(L.filterEntries(e, {faction: "court"}).map(x => x.id), ["2"]);
  assert.deepEqual(L.filterEntries(e, {from: 1400, to: 1600}).map(x => x.id), ["1", "2"]);
  assert.deepEqual(L.filterEntries(e, {kind: "event"}).map(x => x.id), ["4"]);
  assert.deepEqual(L.filterEntries(e, {players: true, today: {year: 2000, month: 1, day: 1}}).map(x => x.id), ["1", "2"],
    "the Embrace is hidden and 2050 is after today");
  const idx = L.indexOf(e);
  assert.deepEqual(idx.people, ["Jan", "Mira", "Ota"]);
});

test("a stored book that is broken or old is read safely", () => {
  const s = L.normLegends({entries: [{id: "x", kind: "nonsense", year: "1450", month: 13}, null, {kind: "death"}], snap: "bad"});
  assert.equal(s.entries.length, 1);
  assert.equal(s.entries[0].kind, "event");
  assert.equal(s.entries[0].year, 1450);
  assert.equal(s.entries[0].month, null);
  assert.equal(s.snap, null);
  assert.deepEqual(L.normLegends(undefined).entries, []);
});
