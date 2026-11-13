import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* NPCs who talk among themselves where a character can overhear (NPC 0.53.0, B2700 to B2703) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const O = await imp("modules/wodx-npc/scripts/overheard-rules.mjs");
const G = await imp("modules/wodx-npc/scripts/talk-grammar.mjs");
const STOCK = await imp("modules/wodx-npc/data/stock-talk.mjs");
const MORE = await imp("modules/wodx-npc/data/stock-talk-more.mjs");
const {HOUSE} = await imp("modules/wodx-npc/data/grammar/house.mjs");
const GR = await imp("modules/wodx-npc/data/grammar/groups.mjs");
const {OVERHEARD} = await imp("modules/wodx-npc/data/grammar/overheard.mjs");
const {TIMES} = await imp("modules/wodx-npc/data/grammar/overheard-times.mjs");
const W = await imp("modules/wodx-chronicle/scripts/world-rules.mjs");

const grammar = G.mergeGrammars({rules: G.poolRules(STOCK, MORE)}, HOUSE, GR.GROUPS_GRAMMAR, OVERHEARD);
const REGIONS = Object.keys(W.WORLD_REGIONS);
const YEARS = [1197, 1241, 1300, 1420, 1499, 1550, 1650, 1750, 1798, 1850, 1900, 1916, 1925, 1942, 1960, 1985, 1993, 2005, 2015, 2021, 2026, 2060];
const GENDERED = /\b(he|she|him|his|her|hers|himself|herself)\b/i;
const sq = (id, x, y) => ({id, x: x * 100, y: y * 100, w: 1, h: 1});

test("pairs: nearest first, each NPC once, within reach", () => {
  const p = O.pairsOf([sq("a", 0, 0), sq("b", 1, 0), sq("c", 2, 0), sq("d", 9, 9)], {reach: 2});
  assert.equal(p.length, 1, "c is near b, but b already talks with a; d stands alone");
  assert.deepEqual(p[0].slice(0, 2).map(x => x.id), ["a", "b"]);
  assert.equal(O.pairsOf([sq("a", 0, 0), sq("b", 5, 0)], {reach: 2}).length, 0);
});

test("earshot: a character near either speaker hears; one far off does not", () => {
  const pair = [sq("a", 0, 0), sq("b", 1, 0)];
  const hear = O.earshotOf(pair, [sq("near", 4, 0), sq("far", 12, 0)], {earshot: 4});
  assert.deepEqual(hear.map(x => x.id), ["near"]);
});

test("throttles: pair gap, scene gap, the dice, and force", () => {
  assert.ok(O.mayChat({now: 1e6, roll: 0.1}));
  assert.ok(!O.mayChat({now: 1e6, roll: 0.9}));
  assert.ok(!O.mayChat({now: 1e6, lastPair: 1e6 - 1000, roll: 0}));
  assert.ok(!O.mayChat({now: 1e6, lastScene: 1e6 - 1000, roll: 0}));
  assert.ok(O.mayChat({now: 1e6, lastPair: 1e6 - 1000, roll: 1, force: true}));
});

test("talk of the times: data is sound and own words", () => {
  const spheres = new Set(Object.keys(W.SPHERES));
  for ( const t of TIMES ) {
    assert.ok(t.from <= t.to, `${t.from}-${t.to}`);
    if ( t.where !== "*" ) for ( const w of t.where ) assert.ok(REGIONS.includes(w) || spheres.has(w), `unknown place ${w}`);
    assert.ok(t.phrases.length);
    for ( const p of t.phrases ) {
      assert.ok(!/—/.test(p) && !GENDERED.test(p), p);
      assert.ok(p.split(/\s+/).length < 8, `short phrases only: ${p}`);
    }
  }
});

test("talk of the times: every region, every era, the most specific first", () => {
  for ( const region of REGIONS ) for ( const year of YEARS ) {
    assert.ok(O.timesFor({region, year, seed: 7}), `${region} ${year} has talk of the times`);
  }
  const hussites = new Set(Array.from({length: 40}, (_, i) => O.timesFor({region: "moravia", year: 1420, seed: i})));
  assert.ok([...hussites].every(p => ["the Hussites", "the crusade against the heretics", "the war wagons"].includes(p)), [...hussites].join(", "));
  assert.ok(O.timesFor({region: "egypt", year: 1798, seed: 1}).match(/French|pyramids/));
  assert.ok(["the arcologies", "the corporate wars", "the water rationing", "the new net", "the floods on the coast"].includes(O.timesFor({region: "china", year: 2060, seed: 3})));
  assert.equal(O.timesFor({region: "moravia", year: null}), null);
});

test("exchanges read clean in every region, era and topic", () => {
  let made = 0;
  for ( const region of REGIONS ) for ( const year of YEARS ) {
    const shared = O.sharedFacts({year, region, market: {supply: {food: "short", fuel: "plenty"}}, factions: [{id: "f", name: "The Weavers' Guild"}, {id: "k", name: "The court", secret: true, members: ["a", "b"]}],
      a: "a", b: "b", feast: "the feast of the town's saint", weather: "rain", units: [["gulden", "gulden", 60], ["kreuzer", "kreuzer", 1]], rumour: "A wolf was seen on the north road.", seed: year});
    assert.equal(shared.sphere, W.sphereFor(region, year));
    for ( const topic of O.TOPICS ) {
      const x = O.exchange({a: {facts: {}}, b: {facts: {}}, shared, grammar, seed: year + region.length, topic});
      if ( !x ) continue;
      made++;
      assert.equal(x.lines.length, 2, `${region} ${year} ${topic} has an answer`);
      for ( const l of x.lines ) {
        assert.ok(!O.unfilled(l.say), `${region} ${year} ${topic}: ${l.say}`);
        assert.ok(!GENDERED.test(l.say) && !/—/.test(l.say), l.say);
      }
    }
  }
  assert.ok(made > REGIONS.length * YEARS.length * 7, `made ${made}`);
});

test("the words follow the place: Cairo, Kyoto and Tenochtitlan are not Brno", () => {
  const say = (region, year, topic, n = 30) => new Set(Array.from({length: n}, (_, i) => O.exchange({a: {facts: {}}, b: {facts: {}}, grammar, seed: i, topic,
    shared: O.sharedFacts({year, region, market: {supply: {food: "short"}}, seed: i})})?.lines.map(l => l.say).join(" ")).values());
  const cairo = [...say("egypt", 1600, "price")].join(" "), kyoto = [...say("japan", 1600, "price")].join(" "), mex = [...say("mexico", 1400, "price")].join(" ");
  assert.ok(/souk|bazaar|covered market/.test(cairo) || /bread/.test(cairo));
  assert.ok(/rice/.test(kyoto) && !/bread/.test(kyoto), kyoto);
  assert.ok(/maize/.test(mex) && !/bread/.test(mex), mex);
  const watch = [...say("china", 1600, "watch")].join(" ");
  assert.ok(/yamen|magistrate|night watch/.test(watch), watch);
});

test("passers-by keep to street talk; secret factions stay between members", () => {
  const shared = O.sharedFacts({year: 1600, region: "moravia", rumour: "Something.", factions: [{id: "f", name: "The guild"}], seed: 1});
  const pb = O.topicsFor(shared, {passerby: true}).map(([t]) => t);
  assert.ok(!pb.includes("rumour") && !pb.includes("faction") && !pb.includes("secret"));
  for ( let s = 0; s < 40; s++ ) {
    const x = O.exchange({a: {facts: {}}, b: {facts: {}}, shared, grammar, seed: s, passerby: true});
    assert.ok(x && O.PASSERBY_TOPICS.includes(x.topic), x?.topic);
  }
  const secret = [{id: "k", name: "The court", secret: true, members: ["a", "b"]}];
  assert.deepEqual(O.factionTopic(secret, {a: "a", b: "b"}), {name: "the court", secret: true});
  assert.equal(O.factionTopic(secret, {a: "a", b: "c"}), null, "a secret faction is never gossip for outsiders");
  const open = [{id: "x", name: "Far guild", places: []}, {id: "y", name: "The Bridge Guild", places: ["scene1"]}];
  assert.equal(O.factionTopic(open, {sceneId: "scene1", seed: 3}).name, "the Bridge Guild", "the faction holding the scene comes first");
});

test("money and goods words", () => {
  assert.equal(O.moneyWord([["pounds", "pounds", 240], ["shillings", "shillings", 12], ["pence", "pence", 1]], 1700), "shillings");
  assert.equal(O.moneyWord([["gulden", "gulden", 60], ["kreuzer", "kreuzer", 1]], 1800), "kreuzer");
  assert.equal(O.moneyWord([["korun", "korun", 100], ["haléřů", "haléřů", 1]], 1990), "korun");
  assert.equal(O.moneyWord([["eb", "eb", 1]], 2050), "eb");
  assert.equal(O.moneyWord([], 2050), null);
  for ( const sphere of Object.keys(W.SPHERES) ) for ( const year of [1300, 1650, 1850, 1950, 2010, 2050] )
    for ( const kind of ["food", "drink", "fuel", "light", "cloth", "medicine", "tools", "papers", "power", "drugs"] ) assert.ok(O.goodWord(kind, {sphere, year}), `${kind} ${sphere} ${year}`);
  assert.equal(O.goodWord("keepsake"), null);
});

test("the grammar is whole, and the talk generator carries it", () => {
  const problems = G.lint(grammar).filter(p => /oh[A-Z]|overheard/.test(p));
  assert.deepEqual(problems, []);
  const talk = readFileSync(join(root, "modules/wodx-npc/scripts/talk.mjs"), "utf8");
  assert.ok(talk.includes("GROUPS_GRAMMAR, OVERHEARD)"), "the Storyteller's grammar journal can add overheard lines");
  const log = O.addToLog(Array.from({length: 40}, (_, i) => ({i})), {i: 40});
  assert.equal(log.length, 30); assert.equal(log.at(-1).i, 40);
});
