// B6745 (final audit w3): world-timeline events that clashed with canon or with known dates.
import test from "node:test";
import assert from "node:assert/strict";
import WH from "../../modules/wodx-chronicle/data/world-history.mjs";
import FW from "../../modules/wodx-chronicle/data/future-world.mjs";

const ev = WH.events;
const byTitle = t => ev.filter(e => e.title === t || e.name === t);
const yearOf = t => { const hits = byTitle(t); assert.equal(hits.length, 1, `one event titled ${t}`); return hits[0].year; };
const text = e => `${e.title ?? e.name ?? ""} ${e.summary ?? ""} ${e.hidden ?? ""} ${JSON.stringify(e)}`;

test("B6745: no Technocracy or Union before it is named in 1897 (M20 p. 27)", () => {
  const bad = ev.filter(e => e.year < 1897 && /Technocra|the Union'?s?\b/.test(text(e)) && !/Order of Reason will become|later (the )?Technocra/.test(text(e)));
  assert.deepEqual(bad.map(e => `${e.year} ${e.title ?? e.name}`), []);
});

test("B6745: the Grand Convocation does not begin before 1457 (M20 p. 30)", () => {
  const bad = ev.filter(e => e.year < 1457 && /Grand Convocation begins/.test(text(e)));
  assert.deepEqual(bad.map(e => `${e.year} ${e.title ?? e.name}`), []);
});

test("B6745: corrected historical years", () => {
  assert.equal(yearOf("The Prague fire"), 1541);
  assert.equal(yearOf("The Ringtheater fire"), 1881);
  assert.equal(yearOf("Trams in Brno"), 1869);
  assert.equal(yearOf("The Northern Railway reaches Brno"), 1839);
  assert.equal(yearOf("The Brno technical college"), 1899);
  assert.equal(yearOf("The Masaryk circuit"), 1930);
  assert.equal(yearOf("The Holy Trinity Column"), 2000);
  assert.equal(byTitle("Charles Bridge planned").length, 0, "the 1359 duplicate of the 1357 bridge is gone");
  assert.equal(byTitle("Victoria crowned").length, 0, "she took the throne in 1837 and was crowned in 1838");
  assert.ok(!ev.some(e => /,,/.test(e.summary ?? "")), "no doubled commas");
});

test("B6745: the hollowed deputies are Free State deputies in both future files", () => {
  const e = FW.events.find(x => x.id === "fdw-2052-eu-1");
  assert.match(e.summary, /Free State deputies/);
  assert.doesNotMatch(e.summary, /crusade's deputies in Rome/);
});
