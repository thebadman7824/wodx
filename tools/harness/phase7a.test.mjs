import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* Phase 7a: the generator core (WoDX Chronicle 0.4.0) and People (WoDX Creation 0.5.0) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const {PEOPLE_TABLES, TRADE_SHEETS} = await import(join(root, "modules/wodx-creation/data/people.mjs"));
const PR = await import(join(root, "modules/wodx-creation/scripts/people-rules.mjs"));
const {GIVEN_ONLY} = await import(join(root, "modules/wodx-creation/data/people-world.mjs"));
const tablesFor = ctx => id => G.resolveTable(PEOPLE_TABLES, id, ctx);

test("seeded: the same seed and key give the same numbers; a nonce or a key changes them", () => {
  const a = G.stream("seed1", "people:1:0"), b = G.stream("seed1", "people:1:0");
  const sa = Array.from({length: 20}, a), sb = Array.from({length: 20}, b);
  assert.deepEqual(sa, sb);
  assert.ok(sa.every(x => x >= 0 && x < 1));
  assert.notDeepEqual(Array.from({length: 5}, G.stream("seed1", "people:1:0", 1)), sa.slice(0, 5));
  assert.notDeepEqual(Array.from({length: 5}, G.stream("seed2", "people:1:0")), sa.slice(0, 5));
  // Roughly even
  const r = G.stream("x", "y"); const n = Array.from({length: 4000}, r).filter(x => x < 0.5).length;
  assert.ok(n > 1800 && n < 2200, `half below 0.5: ${n}`);
});

test("tables: weights, Foundry ranges, nested and inline choices, values", () => {
  const ranged = G.withRanges([{text: "a", weight: 3}, {text: "b", weight: 1}]);
  assert.deepEqual(ranged.map(r => r.range), [[1, 3], [4, 4]]);
  const r = G.stream("s", "k"); const counts = {a: 0, b: 0};
  for ( let i = 0; i < 2000; i++ ) counts[G.drawResult(r, ranged).text]++;
  assert.ok(counts.a > counts.b * 2, JSON.stringify(counts));
  const tables = id => ({inner: {results: [{text: "deep {{v}}"}]}})[id];
  assert.equal(G.expand("x {inner} {only} {{v}}", {rand: G.stream("s", "k"), tables, vars: {v: "V"}}), "x deep V {only} V");
  assert.match(G.expand("{a|b}", {rand: G.stream("s", "k"), tables}), /^[ab]$/);
});

test("the most specific table wins: era and homeland, then era, then plain", () => {
  const all = [{id: "x", results: [{text: "plain"}]}, {id: "x", era: ["medieval"], results: [{text: "era"}]},
    {id: "x", era: ["medieval"], culture: ["bohemia"], results: [{text: "both"}]}];
  assert.equal(G.resolveTable(all, "x", {era: "medieval", culture: "bohemia"}).results[0].text, "both");
  assert.equal(G.resolveTable(all, "x", {era: "medieval", culture: "american"}).results[0].text, "era");
  assert.equal(G.resolveTable(all, "x", {era: "modern", culture: "bohemia"}).results[0].text, "plain");
});

test("every origin has names in every era and homeland the tables cover", () => {
  for ( const o of PEOPLE_TABLES.filter(t => t.id === "people.origin") ) {
    for ( const era of o.era ) for ( const culture of o.culture ) {
      const tb = tablesFor({era, culture});
      for ( const {text: origin} of o.results ) for ( const sex of ["male", "female"] ) {
        assert.ok(tb(`names.${sex}.${origin}`), `given names: ${origin} ${sex} ${era} ${culture}`);
        assert.ok(GIVEN_ONLY.has(origin) || tb(`names.family.${sex}.${origin}`) || tb(`names.byname.${sex}.${origin}`), `family names: ${origin} ${sex} ${era} ${culture}`);
      }
      assert.ok(tb("people.trade"), `trades: ${era} ${culture}`);
    }
  }
});

test("a person: seeded, named for the era, with a sheet that fits the system", () => {
  const ctx = {era: "medieval", culture: "bohemia"};
  const mk = (k, n = 0) => PR.person({rand: G.stream("rothenstein", k, n), tables: tablesFor(ctx), ...ctx});
  const a = mk("people:1:0"), b = mk("people:1:0");
  assert.deepEqual(a, b, "the same key gives the same person");
  assert.notEqual(mk("people:1:0", 1).name, a.name, "a re-roll gives another (most of the time)");
  const keys = new Set("academics,alertness,animalken,art,athletics,awareness,brawl,bureaucracy,computer,cosmology,craft,demolitions,dodge,drive,empathy,enigmas,esoterica,etiquette,expression,finance,firearms,gremayre,intimidation,intuition,investigation,kenning,larceny,law,leadership,linguistics,martialarts,medicine,meditation,melee,occult,performance,persuasion,politics,primalurge,religion,research,rituals,science,security,stealth,streetwise,subterfuge,survival,technology".split(","));
  const secondary = new Set(["legerdemain", "archery", "commerce", "ride", "hearthwisdom", "seneschal", "theology"]);
  for ( const [trade, sheet] of Object.entries(TRADE_SHEETS) ) for ( const k of Object.keys(sheet.k) ) {
    assert.ok(k.startsWith("+") ? secondary.has(k.slice(1)) : keys.has(k), `${trade}: ${k}`);
  }
  for ( let i = 0; i < 60; i++ ) {
    const p = mk(`people:2:${i}`);
    assert.ok(p.given && p.family && p.name.includes(" "), `named: ${p.name}`);
    assert.equal(Object.values(p.attributes).reduce((s, v) => s + v, 0), 9 + 13, "6/4/3 dots on 1s");
    assert.ok(Object.values(p.attributes).every(v => v >= 1 && v <= 4));
    assert.ok(p.willpower >= 3 && p.willpower <= 7);
    assert.ok(p.nature && p.demeanor && p.motive && p.secret && p.look && p.trade);
  }
  // A Czech woman's byname takes the feminine form; a Jewish name says ben or bat
  const many = Array.from({length: 300}, (_, i) => mk(`people:3:${i}`));
  assert.ok(many.some(p => p.origin === "czech" && p.sex === "female" && /(á|ka|ová|ice|ena)$|^z /.test(p.family)));
  assert.ok(many.filter(p => p.origin === "jewish").every(p => /^(ben|bat) /.test(p.family) && (p.sex === "female") === p.family.startsWith("bat")));
  // An asked origin is kept when the era names it (kin of a Jewish household); a missing one falls back to the draw
  for ( let i = 0; i < 40; i++ ) {
    const k = PR.person({rand: G.stream("rothenstein", `people:4:${i}`), tables: tablesFor(ctx), ...ctx, origin: "jewish"});
    assert.equal(k.origin, "jewish", k.name);
    assert.ok(/^(ben|bat) /.test(k.family), k.name);
  }
  const odd = PR.person({rand: G.stream("rothenstein", "people:5:0"), tables: tablesFor(ctx), ...ctx, origin: "nowhere"});
  assert.ok(odd.given && odd.origin !== "nowhere");
  assert.deepEqual(PR.person({rand: G.stream("rothenstein", "people:1:0"), tables: tablesFor(ctx), ...ctx, origin: null}), a, "no origin asked: the same person as before");
  // Modern Czech surnames by sex
  const mod = {era: "modern", culture: "bohemia"};
  const m = Array.from({length: 80}, (_, i) => PR.person({rand: G.stream("s", `m:${i}`), tables: tablesFor(mod), ...mod}));
  assert.ok(m.filter(p => p.origin === "czech" && p.sex === "female").every(p => /(á|ová)$/.test(p.family)), "Nováková, Černá");
});

test("gender-neutral text (B48): the tables and the sheet note", () => {
  const words = /\b(he|she|him|her|his|hers|himself|herself)\b/i;
  for ( const id of ["people.motive", "people.secret", "people.look", "people.trade"] ) {
    for ( const t of PEOPLE_TABLES.filter(x => x.id === id) ) for ( const r of t.results ) assert.ok(!words.test(r.text), `${id}: ${r.text}`);
  }
  const ctx = {era: "medieval", culture: "bohemia"};
  for ( let i = 0; i < 30; i++ ) {
    const note = PR.noteOf(PR.person({rand: G.stream("s", `n:${i}`), tables: tablesFor(ctx), ...ctx}));
    assert.ok(!words.test(note.replace(/<[^>]+>/g, " ")), note);
  }
});

test("a table gives the same result drawn by weight-made ranges as its Roll Table does", () => {
  const results = [{text: "a", weight: 5}, {text: "b", weight: 2}, {text: "c", weight: 1}];
  const asRoll = G.withRanges(results).map(r => ({text: r.text, weight: r.weight, range: r.range}));
  for ( let i = 0; i < 50; i++ ) {
    assert.equal(G.drawResult(G.stream("s", `k${i}`), G.withRanges(results)).text, G.drawResult(G.stream("s", `k${i}`), asRoll).text);
  }
});
