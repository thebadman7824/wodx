import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The talk generator (NPC 0.44.0): a grammar that speaks when the Storyteller has written nothing that fits */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const G = await imp("modules/wodx-npc/scripts/talk-grammar.mjs");
const TK = await imp("modules/wodx-npc/scripts/talk-rules.mjs");
const STOCK = await imp("modules/wodx-npc/data/stock-talk.mjs");
const MORE = await imp("modules/wodx-npc/data/stock-talk-more.mjs");
const {HOUSE} = await imp("modules/wodx-npc/data/grammar/house.mjs");

const grammar = G.mergeGrammars({rules: G.poolRules(STOCK, MORE)}, HOUSE);
const YEARS = [1197, 1250, 1420, 1499, 1500, 1620, 1750, 1800, 1850, 1870, 1899, 1900, 1944, 1979, 1980, 1995, 2025, 2026, 2060];

test("facts: values, any-of, not, years and rated traits", () => {
  assert.ok(G.testFact("clan", "ventrue", {clan: "Ventrue"}));
  assert.ok(G.testFact("clan", ["brujah", "gangrel"], {clan: "gangrel"}));
  assert.ok(!G.testFact("clan", "!child", {clan: "child"}));
  assert.ok(G.testFact("voice", "!child", {}), "a missing fact passes a not-test");
  assert.ok(!G.testFact("clan", "ventrue", {}), "a missing fact fails a plain test");
  assert.ok(G.testFact("year", [1300, 1526], {year: 1400}) && !G.testFact("year", [1300, 1526], {year: 1527}));
  assert.ok(G.testFact("year", [2020, null], {year: 2100}));
  assert.ok(G.testFact("traits", {Dominate: 2}, {traits: {dominate: 3}}) && !G.testFact("traits", {Dominate: 4}, {traits: {Dominate: 3}}));
  assert.ok(G.testFact("mood", ["!afraid", "angry", "drunk"], {mood: "angry"}) && !G.testFact("mood", ["!afraid", "angry"], {mood: "afraid"}));
});

test("the most specific rule wins, ties pool, boosts count", () => {
  const rules = [
    {id: "a", when: {}, say: ["\"Any.\""]},
    {id: "b", when: {clan: "ventrue"}, say: ["\"Ventrue.\""]},
    {id: "c", when: {clan: "ventrue", mood: "angry"}, say: ["\"Angry Ventrue.\""]},
    {id: "d", when: {mood: "angry"}, boost: 1, say: ["\"Angry.\""]}
  ];
  assert.deepEqual(G.bestRules(rules, {clan: "ventrue"}).rules.map(r => r.id), ["b"]);
  assert.deepEqual(G.bestRules(rules, {clan: "ventrue", mood: "angry"}).rules.map(r => r.id), ["c", "d"]);
  assert.deepEqual(G.bestRules(rules, {clan: "toreador"}).rules.map(r => r.id), ["a"]);
  const g = {rules: {greet: rules}};
  assert.equal(G.generate("greet", {clan: "ventrue"}, {grammar: g}).say, "\"Ventrue.\"");
});

test("symbols, modifiers, facts and pronouns expand; unknown symbols stay for lint", () => {
  const sy = {thing: ["apple"], who: [{when: {era: "medieval"}, say: ["#thing.a#"]}, {when: {}, say: ["owl"]}]};
  assert.equal(G.expand("#thing.cap#", {}, sy), "Apple");
  assert.equal(G.expand("#who#", {era: "medieval"}, sy), "an apple");
  assert.equal(G.expand("#who.a#", {era: "modern"}, sy), "an owl");
  assert.equal(G.expand("{rumour}!", {rumour: "\"The mill burned\""}, sy), "The mill burned!");
  assert.equal(G.expand("#they# lost #their# hat", {}, sy), "they lost their hat");
  assert.equal(G.expand("#they# lost #their# hat", {gender: "f"}, sy), "they lost their hat", "never a guessed gender");
  assert.equal(G.expand("#nope#", {}, sy), "#nope#");
  assert.ok(G.lint({rules: {greet: [{id: "x", say: ["#nope#"]}]}, symbols: {}}).some(p => p.includes("#nope#")));
});

test("the house grammar lints clean", () => {
  assert.deepEqual(G.lint(grammar), []);
});

test("every kind that must speak does, in every era band, every year and every regard, with nothing left unexpanded", () => {
  for ( const kind of G.MUST_SPEAK ) {
    for ( const year of YEARS ) {
      for ( const regard of G.REGARDS ) {
        for ( const seed of [0, 1, 7, 99, 12345] ) {
          const r = G.generate(kind, {year, regard}, {grammar, seed});
          assert.ok(r?.say, `${kind} ${year} ${regard}`);
          assert.ok(!/#\w|\{\w+\}/.test(r.say), `${kind} ${year} ${regard}: ${r.say}`);
          assert.ok(/^".+"$/.test(r.say), r.say);
        }
      }
    }
  }
});

test("the stock pools still speak as before: same lines for the same era, regard and voice", () => {
  const lines = (kind, f) => new Set([...Array(400).keys()].map(seed => G.generate(kind, f, {grammar: {rules: G.poolRules(STOCK, MORE)}, seed})?.say));
  const g = lines("greet", {era: "medieval", regard: "hate"});
  for ( const l of STOCK.GREET.medieval.hate ) assert.ok(g.has(l), l);
  assert.equal(g.size, STOCK.GREET.medieval.hate.length);
  // a merchant's greetings mix with the era's
  const m = lines("greet", {era: "nineteenth", regard: "like", voice: "merchant"});
  assert.ok(MORE.VOICES.merchant.greet.warm.every(l => m.has(l)) && STOCK.GREET.nineteenth.like.every(l => m.has(l)));
  // children keep to their own lines
  const c = lines("greet", {era: "modern", regard: "neutral", voice: "child"});
  assert.ok([...c].every(l => MORE.VOICES.child.greet.neutral.includes(l)), [...c].join(" "));
  // corporate speaks only from 1980
  const early = lines("greet", {era: "twentieth", year: 1950, regard: "neutral", voice: "corporate"});
  assert.ok(![...early].some(l => MORE.VOICES.corporate.greet.neutral.includes(l)));
  // someone who hates the character shares no gossip and tells no rumour
  const h = lines("gossip", {era: "modern", regard: "hate"});
  assert.ok([...h].every(l => STOCK.RUMOUR_REFUSE.hate.includes(l)));
  const r = G.generate("rumour", {era: "modern", regard: "neutral", rumour: "The baker sells at night"}, {grammar});
  assert.ok(r.say.includes("The baker sells at night"), r.say);
  assert.equal(G.generate("rumour", {era: "modern", regard: "neutral"}, {grammar}), null, "no rumour, no rumour line");
});

test("one template speaks in every era: coin, order-keepers and address follow the year", () => {
  const coin = y => G.expand("#coin#", {year: y}, HOUSE.symbols, 3);
  assert.match(coin(1250), /denar/); assert.match(coin(1400), /groschen|heller/); assert.match(coin(1700), /kreuzer/);
  assert.match(coin(1900), /heller|kronen/); assert.match(coin(1995), /korun|crowns/); assert.match(coin(2040), /eurobucks|credits/);
  assert.match(G.expand("#watch#", {year: 1870, era: "nineteenth"}, HOUSE.symbols), /gendarmes|police/);
  assert.match(G.expand("#landmark#", {year: 1820, era: "nineteenth"}, HOUSE.symbols), /town hall|post house/, "no railway before 1839");
});

test("steady: the same seed says the same, and a recent line is avoided while others fit", () => {
  const f = {era: "modern", regard: "neutral"};
  const a = G.generate("greet", f, {grammar, seed: 42}), b = G.generate("greet", f, {grammar, seed: 42});
  assert.equal(a.say, b.say);
  const c = G.generate("greet", f, {grammar, seed: 42, recent: [a.say]});
  assert.notEqual(c.say, a.say);
});

test("a Storyteller grammar replaces a house rule by id and adds its own", () => {
  const st = {rules: {greet: [{id: "house.greet.cold", when: {warmth: "cold"}, boost: 1, say: ["\"Out.\""]}, {id: "st.ventrue", when: {clan: "ventrue", warmth: "cold"}, boost: 5, say: ["\"You are not expected.\""]}]}};
  const g = G.mergeGrammars(grammar, st);
  assert.equal(g.rules.greet.filter(r => r.id === "house.greet.cold").length, 1);
  assert.equal(G.generate("greet", {era: "medieval", regard: "hate", clan: "ventrue"}, {grammar: g}).say, "\"You are not expected.\"");
});

test("the writing: gender-neutral, no dashes for pauses, quoted speech, eras agree with talk-rules", () => {
  const all = [];
  const walk = o => { if ( typeof o === "string" ) all.push(o); else if ( Array.isArray(o) ) o.forEach(walk); else if ( o && typeof o === "object" ) Object.values(o).forEach(walk); };
  walk(HOUSE.rules); walk(HOUSE.symbols);
  for ( const l of all ) {
    assert.ok(!/\b(he|she|him|her|his|hers|himself|herself|lord|lady|sir|madam|ma'am)\b/i.test(l), l);
    assert.ok(!/—|--/.test(l), l);
  }
  for ( const list of Object.values(HOUSE.rules) ) for ( const r of list ) for ( const l of r.say ) assert.ok(/^".+"$/.test(l), l);
  for ( const y of YEARS ) assert.equal(G.bandOf(y), TK.eraBand(y), String(y));
});
