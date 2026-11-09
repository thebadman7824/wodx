/* Phase 8, second half: the night's draw and the story aids (Storyteller), Otherworld journeys and the Shadowlands'
 * decay (Otherworlds), and token frames (Atmosphere). Pure rules and the shipped tables. */
import {test} from "node:test";
import assert from "node:assert/strict";
import * as G from "../../modules/wodx-chronicle/scripts/gen-core.mjs";
import * as N from "../../modules/wodx-storyteller/scripts/night-rules.mjs";
import {NIGHT_TABLES} from "../../modules/wodx-storyteller/data/night-tables.mjs";
import * as J from "../../modules/wodx-otherworlds/scripts/journey-rules.mjs";
import {JOURNEY_TABLES} from "../../modules/wodx-otherworlds/data/journey-tables.mjs";
import * as K from "../../modules/wodx-atmosphere/scripts/kits-rules.mjs";

const ranged = defs => defs.map(d => ({...d, results: G.withRanges(d.results)}));
const lookup = (defs, era) => { const all = ranged(defs); return id => G.resolveTable(all, id, {era, culture: null}); };
const ERAS = ["medieval", "ancient", "early-modern", "industrial", "modern"];
const randFor = (seed, nonce = 0) => k => G.stream(seed, k, nonce);

test("every night table id resolves in every era group", () => {
  const ids = ["night.hour.early", "night.hour.deep", "night.hour.late", "night.encounter.town", "night.encounter.wilds", "night.encounter.penumbra",
    "night.encounter.shadowlands", "night.rumour", "aid.symbol", "aid.dream", "aid.vision", "aid.augury", "aid.foreshadow", "aid.relic", "aid.fetish", "aid.talisman"];
  for ( const era of ERAS ) { const t = lookup(NIGHT_TABLES, era); for ( const id of ids ) assert.ok(t(id)?.results?.length >= 5, `${id} in ${era}`); }
});

test("the time of night", () => {
  assert.equal(N.partOfNight(19), "early");
  assert.equal(N.partOfNight(23.5), "deep");
  assert.equal(N.partOfNight(1), "deep");
  assert.equal(N.partOfNight(4.5), "late");
  assert.equal(N.partOfNight(-1), "deep");
});

test("layers in play follow the lines", () => {
  assert.deepEqual(N.layersFor([]), ["physical"]);
  assert.deepEqual(N.layersFor(["vampire", "werewolf"]), ["physical", "penumbra"]);
  assert.deepEqual(N.layersFor(["wraith", "mage"]), ["physical", "penumbra", "shadowlands"]);
});

test("a night is seeded: the same night twice, another nonce differs somewhere", () => {
  const tables = lookup(NIGHT_TABLES, "medieval");
  const a = N.composeNight({randFor: randFor("s", 0), tables, part: "deep", layers: ["physical", "shadowlands"], vars: {places: ["the mill"], people: ["Ilse"]}});
  const b = N.composeNight({randFor: randFor("s", 0), tables, part: "deep", layers: ["physical", "shadowlands"], vars: {places: ["the mill"], people: ["Ilse"]}});
  assert.deepEqual(a, b);
  assert.equal(a.encounters.length, 3);
  assert.ok(a.opening && a.rumour);
  let differs = false;
  for ( let n = 1; n < 6 && !differs; n++ ) differs = JSON.stringify(N.composeNight({randFor: randFor("s", n), tables, part: "deep"})) !== JSON.stringify(a);
  assert.ok(differs);
});

test("rumours and aids leave no blanks: every template fills", () => {
  for ( const era of ERAS ) {
    const tables = lookup(NIGHT_TABLES, era);
    for ( let i = 0; i < 40; i++ ) {
      const n = N.composeNight({randFor: randFor(`r${i}`), tables, part: "early", vars: {places: ["the mill"], people: ["Ilse"]}});
      assert.doesNotMatch(n.rumour, /\{|\}/, n.rumour);
      for ( const kind of Object.keys(N.AIDS) ) {
        const a = N.composeAid({kind, rand: G.stream(`a${i}`, kind), tables, vars: {actor: "Ilse", places: ["the mill"], people: ["Jan"]}});
        assert.ok(a?.text, `${kind} ${era}`);
        assert.doesNotMatch(a.text, /\{|\}/, a.text);
        if ( N.AIDS[kind].rating ) assert.ok(a.rating >= 1 && a.rating <= 5);
      }
    }
  }
});

test("suggested ratings lean low", () => {
  const n = [0, 0, 0, 0, 0, 0];
  const rand = G.stream("ratings", "x");
  for ( let i = 0; i < 4000; i++ ) n[N.suggestRating(rand)]++;
  assert.ok(n[1] > n[3] && n[3] > n[5] && n[5] > 0);
});

test("the chronicle's own places and people, the character's first, gate and battle maps left out", () => {
  const f = N.fragments({entries: [{actor: "a1", place: "The cellar"}, {actor: "a2", place: "The church"}],
    scenes: [{name: "Market"}, {name: "Battlemap: bridge"}, {name: "WoDX gate: Weather street"}],
    actors: [{id: "a1", name: "Ilse", pc: true}, {id: "n1", name: "Jan the smith", pc: false}, {id: "n2", name: "WoDX gate: Walker", pc: false}], actor: "a1"});
  assert.equal(f.places[0], "The cellar");
  assert.ok(f.places.includes("Market") && !f.places.some(p => /Battlemap|gate/.test(p)));
  assert.deepEqual(f.people, ["Jan the smith"]);
  assert.match(N.nightText({opening: "Dark.", encounters: [{label: "In town", text: "A cat."}], rumour: "Hm."}), /In town: A cat\. Rumour: Hm\./);
});

test("journeys: legs, seeding, hazards and the Great Maelstroms", () => {
  assert.equal(J.legsFor(1), 1);
  assert.equal(J.legsFor(5), 3);
  assert.equal(J.legsFor(40), 8);
  assert.equal(J.greatMaelstrom(1349), "the Second Great Maelstrom");
  assert.equal(J.greatMaelstrom(1917), "the Fourth Great Maelstrom");
  assert.equal(J.greatMaelstrom(1700), null);
  const tables = lookup(JOURNEY_TABLES, "medieval");
  for ( const realm of Object.keys(J.REALMS) ) {
    const a = J.planJourney({realm, hours: 8, year: 1700, randFor: randFor(`j:${realm}`), tables});
    assert.deepEqual(a, J.planJourney({realm, hours: 8, year: 1700, randFor: randFor(`j:${realm}`), tables}));
    assert.equal(a.legs.length, J.REALMS[realm].legs ?? 4);
    assert.ok(a.legs.every(l => l.landmark));
    if ( realm === "umbra" ) assert.equal(a.maelstroms, 0);
  }
  let calm = 0, great = 0;
  for ( let i = 0; i < 300; i++ ) {
    calm += J.planJourney({realm: "tempest", hours: 16, year: 1700, randFor: randFor(`c${i}`), tables}).maelstroms;
    great += J.planJourney({realm: "tempest", hours: 16, year: 1349, randFor: randFor(`c${i}`), tables}).maelstroms;
  }
  assert.ok(great > calm * 4, `${great} vs ${calm}`);
  assert.match(J.journeyText({legs: [{n: 1, landmark: "A stone.", hazard: "Wind."}]}), /Leg 1: A stone\. Hazard: Wind\./);
});

test("the Shadowlands' decay by the Shroud", () => {
  assert.equal(J.decayStrength(4), 1);
  assert.equal(J.decayStrength(7), 0.6);
  assert.equal(J.decayStrength(10), 0.2);
  assert.equal(J.decayStrength(null), 0.6);
  assert.equal(J.decayStrength(2), 1);
  assert.match(J.decayCss(4), /^grayscale\(0\.8\) sepia\(0\.25\) contrast\(1\.15\) brightness\(0\.85\)$/);
  assert.equal(J.decayCss(5, {on: false}), "");
});

test("token frames: every kit has one, who gets one, and the shapes", () => {
  for ( const k of Object.keys(K.KITS) ) { const f = K.frameFor(k); assert.ok(f.label && Number.isInteger(f.color) && ["round", "square"].includes(f.shape), k); }
  assert.equal(K.frameFor("no-such").kit, "dark-ages");
  assert.equal(K.framed("off", {hasActor: true, playerOwned: true}), false);
  assert.equal(K.framed("characters", {hasActor: true, playerOwned: false}), false);
  assert.equal(K.framed("characters", {hasActor: true, playerOwned: true}), true);
  assert.equal(K.framed("all", {hasActor: true}), true);
  assert.equal(K.framed("all", {hasActor: false}), false);
  const round = K.frameShapes(K.frameFor("renaissance"), 100, 100);
  assert.equal(round.length, 2);
  assert.ok(round.every(s => s.kind === "circle" && s.r < 50));
  const neon = K.frameShapes(K.frameFor("future-darkness"), 200, 100);
  assert.equal(neon.length, 2);
  assert.ok(neon[0].alpha < 0.5 && neon.every(s => s.kind === "rect"));
});
