/* WoDX Otherworlds 0.21.0 (B2556 to B2559): the coarse map of each realm past the near worlds. Pure rules. */
import test from "node:test";
import assert from "node:assert/strict";
import * as RW from "../../modules/wodx-otherworlds/scripts/realm-worlds-rules.mjs";
import {REALMS, REALM_ORDER} from "../../modules/wodx-otherworlds/scripts/realm-maps-rules.mjs";

const maps = Object.fromEntries(RW.REALM_IDS.map(id => [id, RW.build(id, {year: 1197})]));

test("every realm of the catalogue has a map, with colours for all its ground and its own landmarks as places", () => {
  assert.deepEqual([...RW.REALM_IDS].sort(), [...REALM_ORDER].sort());
  for ( const id of RW.REALM_IDS ) {
    const m = maps[id];
    assert.equal(m.cells.length, RW.H, id);
    assert.ok(m.cells.every(r => r.length === RW.W), `${id} width`);
    for ( const g of new Set(m.cells.join("")) ) assert.match(m.pal[g] ?? "", /^#[0-9a-f]{6}$/, `${id} colour for ${g}`);
    assert.ok(m.places.length >= 2, `${id} places`);
    assert.ok(RW.PLANS[m.plan] && RW.KINDS[m.kind], `${id} plan and redraw rule`);
    assert.ok(m.redraw && m.ours && m.days > 0, `${id} words`);
    assert.ok(!/seed|house rule/i.test(`${m.redraw} ${m.ours}`), `${id} plain words`);
    const marked = (RW.MARKS[id] ?? []).filter(x => typeof x === "string");
    for ( const p of m.places ) {
      const extra = RW.extrasOf(id).map(e => e[1]);
      assert.ok(REALMS[id].landmarks.includes(p.name) || marked.includes(p.name) || extra.includes(p.name), `${id}: ${p.name} is from the realm's catalogue entry`);
      assert.equal(p.kind, REALMS[id].landmarks.includes(p.name) || marked.includes(p.name) ? "place" : RW.extrasOf(id).find(e => e[1] === p.name)[0], `${id}: ${p.name} kind`);
      assert.ok(m.pace[p.y * RW.W + p.x] > 0, `${id}: ${p.name} stands on ground that can be crossed`);
    }
    assert.ok(m.gate >= 0 && m.gate < m.places.length, `${id} arrival`);
  }
});

test("every place can be reached from every other, and a journey has a time and a path of neighbouring squares", () => {
  for ( const id of RW.REALM_IDS ) {
    const m = maps[id];
    for ( const p of m.places.slice(1) ) {
      const j = RW.journey(m, 0, p.i);
      assert.ok(!j.noWay && j.days > 0 && j.squares > 1, `${id}: a way to ${p.name}`);
      assert.deepEqual(j.path[0], [m.places[0].x, m.places[0].y]);
      assert.deepEqual(j.path.at(-1), [p.x, p.y]);
      for ( let i = 1; i < j.path.length; i++ ) assert.ok(Math.abs(j.path[i][0] - j.path[i - 1][0]) <= 1 && Math.abs(j.path[i][1] - j.path[i - 1][1]) <= 1, `${id} path step`);
      for ( const [x, y] of j.path ) assert.ok(m.pace[y * RW.W + x] > 0, `${id}: the path keeps to ground that can be crossed`);
    }
  }
  const t = maps.tempest, there = RW.journey(t, 1, 2), back = RW.journey(t, 2, 1);
  assert.ok(Math.abs(there.days - back.days) < 0.02, "the same time both ways");
  assert.match(RW.timeWords(0.25), /^about 6 hours$/);
  assert.match(RW.timeWords(1), /^about 1 day$/);
  assert.match(RW.timeWords(12.4), /^about 12 days$/);
});

test("0.22.0: ways in and out and located dangers are places; a traveller arrives at the way in where the catalogue names one", () => {
  let more = 0;
  for ( const id of RW.REALM_IDS ) {
    const m = maps[id], want = RW.extrasOf(id).filter(([, n]) => !REALMS[id].landmarks.some(l => l.toLowerCase() === n.toLowerCase()));
    for ( const [kind, name] of want ) assert.ok(m.places.some(p => p.name === name && p.kind === kind), `${id}: ${name} is on the map`);
    more += want.length;
    assert.equal(new Set(m.places.map(p => p.name)).size, m.places.length, `${id}: no place twice`);
    for ( const a of m.places ) for ( const b of m.places ) if ( a.i < b.i ) assert.ok(a.x !== b.x || a.y !== b.y, `${id}: ${a.name} and ${b.name} share a square`);
    const arrive = REALMS[id].map?.arrival ?? REALMS[id].map?.back;
    if ( arrive ) assert.equal(m.places[m.gate].name, arrive, `${id} arrival`);
  }
  assert.ok(more >= 200, `${more} further places`);
  assert.ok(maps.enoch.places.some(p => p.name === "the Aralu tombs" && p.kind === "place"));
  assert.equal(maps.stygia.places[maps.stygia.gate].name, "The harbour on the Sea of Shadows");
  assert.ok(RW.svg(maps.tempest).includes("a way in or out") && RW.svg(maps.tempest).includes("a danger"));
  assert.ok(!RW.extrasOf("yellow-springs").some(e => e[1] === "a Castigator's notice"));
});

test("0.23.0: the book lookup's named places stand on the maps with what they are and their page; the notes come with the map", async () => {
  const {PLACES, LAYOUT, CHANGE} = await import("../../modules/wodx-otherworlds/scripts/realm-places.mjs");
  assert.deepEqual(Object.keys(PLACES).sort(), [...RW.REALM_IDS].sort());
  let n = 0;
  for ( const id of RW.REALM_IDS ) {
    for ( const [name, what, ref] of PLACES[id] ) {
      assert.ok(name && what && /pdf \d/.test(ref), `${id}: ${name} has a page`);
      assert.ok(name.length <= 60 && what.length <= 320, `${id}: ${name} is short`);
      const p = maps[id].places.find(q => q.label === name[0].toUpperCase() + name.slice(1));
      assert.ok(p && p.what === what && p.ref === ref && p.kind === "place", `${id}: ${name} is on the map`);
      n++;
    }
    for ( const [note, ref] of [...LAYOUT[id], ...CHANGE[id]] ) assert.ok(note && /pdf \d/.test(ref), `${id} note has a page`);
    assert.equal(maps[id].layout, LAYOUT[id]);
    assert.ok(maps[id].places.length <= 20, `${id}: ${maps[id].places.length} places`);
  }
  assert.ok(n >= 180, `${n} places`);
  const m = maps.malfeas, to = m.places.find(p => p.name === "the Temple Obscura").i;
  assert.ok(RW.lines(m, RW.journey(m, m.gate, to), {year: 1197}).some(l => /^The Temple Obscura: .+pdf \d/.test(l)));
  assert.ok(!RW.lines(m, RW.journey(m, m.gate, to, {known: RW.knownPlaces(m, [])}), {year: 1197}).some(l => /^The Temple Obscura: /.test(l)), "a place not yet found is not described");
});

test("the same asking gives the same map, and each redraw rule changes it only when it should", () => {
  const again = id => JSON.stringify(RW.build(id, {year: 1197}).cells);
  for ( const id of ["pangaea", "tempest", "flux"] ) assert.equal(again(id), JSON.stringify(maps[id].cells));
  const cells = (id, o) => RW.build(id, o).cells.join("");
  // fixed: the year changes nothing
  for ( const id of RW.REALM_IDS.filter(i => RW.kindOf(i) === "fixed" && i !== "atrocity") ) assert.equal(RW.seedOf(id, {year: 1197}), RW.seedOf(id, {year: 2010, visit: 5, season: 2, which: "x"}), id);
  // a Great Maelstrom: the same before, another after
  assert.equal(cells("tempest", {year: 1197}), cells("tempest", {year: 1346}));
  assert.notEqual(cells("tempest", {year: 1346}), cells("tempest", {year: 1347}));
  assert.equal(RW.turnOf("far-shores", {year: 2010}), 5);
  // a season, a visit, a name
  assert.notEqual(RW.seedOf("far-dreaming", {year: 1300, season: 0}), RW.seedOf("far-dreaming", {year: 1300, season: 1}));
  assert.equal(RW.seedOf("far-dreaming", {year: 1300, season: 4}), RW.seedOf("far-dreaming", {year: 1300, season: 3}));
  assert.notEqual(cells("flux", {visit: 0}), cells("flux", {visit: 1}));
  assert.notEqual(RW.seedOf("dark-kingdom", {which: "Jade"}), RW.seedOf("dark-kingdom", {which: "Ivory"}));
  assert.equal(RW.seedOf("dark-kingdom", {which: " jade "}), RW.seedOf("dark-kingdom", {which: "Jade"}));
  // the Atrocity Realm gains yards with the ages and keeps the old ones
  const early = RW.build("atrocity", {year: 1197}), late = RW.build("atrocity", {year: 1999});
  assert.deepEqual(late.places.map(p => p.name), early.places.map(p => p.name));
  assert.notEqual(early.cells.join(""), late.cells.join(""));
});

test("places stay hidden until found: no journey ends at one, the map is shrouded away from what is known", () => {
  const m = maps.tempest, far = m.places.find(p => p.i !== m.gate && Math.hypot(p.x - m.places[m.gate].x, p.y - m.places[m.gate].y) > 40);
  const known = RW.knownPlaces(m, []);
  assert.deepEqual([...known], [m.gate]);
  assert.equal(RW.journey(m, m.gate, far.i, {known}).hidden, true);
  assert.ok(RW.journey(m, m.gate, far.i, {known: RW.knownPlaces(m, [far.i])}).days > 0);
  assert.ok(RW.journey(m, m.gate, far.i).days > 0, "the whole realm: any place");
  assert.equal(RW.inSight(m, known, m.places[m.gate].x, m.places[m.gate].y), true);
  assert.equal(RW.inSight(m, known, far.x, far.y), false);
  assert.deepEqual(RW.normFound(m, [far.i, far.i, m.gate, 99, -1, "x"]), [far.i]);
  const dark = RW.svg(m, {known}), whole = RW.svg(m);
  const dots = s => s.split("<circle").length - 1;
  assert.ok(dark.includes("not yet found") && !whole.includes("not yet found"));
  assert.equal(dots(dark), 1);
  assert.equal(dots(whole), m.places.length);
  assert.match(RW.lines(m, RW.journey(m, m.gate, far.i, {known}), {year: 1197})[0], /is not yet found/);
});

test("pictures, the closer look and the lines under the map", () => {
  for ( const id of RW.REALM_IDS ) {
    const m = maps[id], j = RW.journey(m, 0, 1), s = RW.svg(m, {path: j.path, known: RW.knownPlaces(m, [0, 1])});
    assert.ok(s.startsWith("<svg") && s.endsWith("</svg>") && !/NaN|undefined/.test(s), `${id} picture`);
    assert.ok(s.length < 900000, `${id} picture size ${s.length}`);
    const c = RW.closer(m, m.places[0].x, m.places[0].y);
    assert.deepEqual(c, RW.closer(m, m.places[0].x, m.places[0].y));
    assert.equal(c.cells.length, RW.ZOOM);
    assert.equal(c.lands.reduce((n, l) => n + l[1], 0) > 95, true);
    assert.ok(!/NaN|undefined/.test(RW.closerSvg(m, c)), `${id} closer picture`);
    const lines = RW.lines(m, j, {year: 1197});
    assert.ok(lines.length >= 2 && lines.every(l => l && !/undefined|NaN/.test(l)), `${id} lines`);
    assert.match(lines[0], /^From .+ to .+: about \d/);
  }
  assert.ok(RW.lines(maps["digital-web"], null, {year: 1500}).includes("No way leads in this year."));
  assert.ok(!RW.lines(maps["digital-web"], null, {year: 2000}).includes("No way leads in this year."));
  assert.ok(RW.lines(maps.tempest, null, {year: 1916}).some(l => /Great Maelstrom rages/.test(l)));
});
