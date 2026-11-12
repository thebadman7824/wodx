import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import * as PR from "../../modules/wodx-npc/scripts/passerby-rules.mjs";
import * as RR from "../../modules/wodx-npc/scripts/routine-rules.mjs";

/* Passers-by and animals (WoDX NPC 0.26.0, B970 to B975) */

const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };

test("ages run from 1197 to the Future Darkness, and the first five match the routine ages", () => {
  assert.equal(PR.ageOf(1197), "medieval");
  assert.equal(PR.ageOf(1620), "early");
  assert.equal(PR.ageOf(1888), "industrial");
  assert.equal(PR.ageOf(1944), "c20");
  assert.equal(PR.ageOf(1999), "modern");
  assert.equal(PR.ageOf(2060), "future");
  for ( const y of [1197, 1500, 1800, 1914, 1980, 2024] ) assert.equal(PR.ageOf(y), RR.ageOf(y));
  for ( const age of Object.keys(PR.AGES) ) {
    assert.ok(PR.CROWD[age] && PR.PEOPLE[age] && PR.ANIMALS[age] && PR.ANIMAL_SHARE[age] !== undefined, age);
  }
});

test("the street empties after dark in the Middle Ages and fills with the night life later", () => {
  assert.ok(PR.crowdSize({year: 1250, hour: 23}) <= 1);
  assert.equal(PR.crowdSize({year: 1250, hour: 3}), 0);
  assert.ok(PR.crowdSize({year: 1995, hour: 23}) > PR.crowdSize({year: 1250, hour: 23}));
  assert.ok(PR.crowdSize({year: 1995, hour: 23, area: "slums"}) >= PR.crowdSize({year: 1995, hour: 23, area: "patrolled"}));
  assert.ok(PR.crowdSize({year: 1995, hour: 12, density: "busy"}) > PR.crowdSize({year: 1995, hour: 12, density: "quiet"}));
  assert.equal(PR.crowdSize({year: 1995, hour: 12, density: "busy", max: 3}), 3, "the cap holds");
  assert.equal(PR.crowdSize({year: 1995, hour: 12, max: 99}) <= PR.MAX_CAP, true);
});

test("people of each age, gender-neutral, no children, and drunk or sick blood by the hour", () => {
  const banned = /\b(man|woman|men|women|boy|girl|child|children|he|she|his|her|him|wife|husband|mother|father)\b/i;
  for ( const [age, t] of Object.entries(PR.PEOPLE) ) for ( const [k, p] of Object.entries(t) ) {
    for ( const s of [p.who, ...p.looks] ) assert.ok(!banned.test(s), `${age}.${k}: ${s}`);
    assert.ok(!/—/.test(p.who + p.looks.join("")), "no em-dashes");
  }
  const night = PR.makePasserby({year: 1450, hour: 23, rng: seq(0.99, 0, 0.01)});
  assert.equal(night.kind, "gongfarmer", "the last kind with weight at night");
  assert.equal(PR.makePasserby({year: 1450, hour: 12, rng: seq(0.01, 0, 0.5)}).vesselState, "clean", "nobody drunk by day");
  const drunk = PR.makePasserby({year: 1890, hour: 23, area: "slums", rng: seq(0.9, 0, 0.0)});
  assert.equal(drunk.vesselState, "drunk");
  assert.ok(drunk.drinks >= 2);
  const sick = PR.makePasserby({year: 1890, hour: 12, sick: true, rng: seq(0.5, 0, 0.1)});
  assert.equal(sick.vesselState, "disease");
  assert.equal(PR.weightOf(PR.PEOPLE.early.lamplighter, "night", "market", 1600), 0, "no lamplighters before 1700");
});

test("animals: V20's blood for each kind, more of them in old towns, rats after dark", () => {
  const pools = {human: 10, cow: 5, dog: 2, cat: 1, bird: 0.5, rat: 0.25};
  assert.deepEqual(PR.VESSEL_POOL, pools);
  const vessels = readFileSync(new URL("../../modules/wodx-actions/scripts/rules.js", import.meta.url), "utf8");
  for ( const [k, n] of Object.entries(pools) ) if ( k !== "human" ) assert.match(vessels, new RegExp(`${k}: \\{ label: "[^"]+", pool: ${n} \\}`), k);
  for ( const t of Object.values(PR.ANIMALS) ) for ( const p of Object.values(t) ) assert.ok(pools[p.vessel] !== undefined, p.who);
  assert.ok(PR.animalCount({year: 1300, hour: 11}) >= PR.animalCount({year: 1995, hour: 11}));
  const a = PR.makeAnimal({year: 1300, hour: 3, area: "slums", rng: () => 0.6});
  assert.equal(a.animal, true);
  assert.ok(PR.ANIMALS.medieval[a.kind]);
  assert.equal(PR.makeAnimal({year: 1975, hour: 12, rng: () => 0.999}).kind !== "horse", true, "no dray horses after 1960");
  assert.equal(PR.animalCount({year: 1995, hour: 12, max: 4, people: 4}), 0, "people and animals share the cap");
});

test("walking: in by one edge, out by another; steps, exits, holding and following", () => {
  const rect = {x: 0, y: 0, width: 1000, height: 500};
  const w = PR.planWalk(rect, {rng: seq(0, 0.5, 0.5, 0.9)});
  assert.deepEqual(w.start, {x: 500, y: 0});
  assert.equal(w.waypoints.at(-1).exit, true);
  assert.notEqual(w.exitSide, 0);
  const s = PR.stepToward({x: 0, y: 0}, {x: 300, y: 400}, 100);
  assert.equal(Math.round(Math.hypot(s.x, s.y)), 100);
  assert.equal(PR.stepToward({x: 0, y: 0}, {x: 30, y: 40}, 100).arrived, true);
  assert.deepEqual(PR.nearestExit(rect, {x: 990, y: 250}), {x: 1000, y: 250, exit: true, wait: 0});
  assert.equal(PR.holdsFor({x: 0, y: 0}, [{x: 100, y: 0}], 160), true);
  assert.equal(PR.holdsFor({x: 0, y: 0}, [{x: 500, y: 0}], 160), false);
  assert.equal(PR.followSpot({x: 100, y: 0}, {x: 0, y: 0}, 100), null);
  assert.deepEqual(PR.followSpot({x: 500, y: 0}, {x: 0, y: 0}, 100), {x: 100, y: 0});
});

test("cleanup: gone when they leave the scene in view or their time is up; kept ones wait to be let go", () => {
  const t = Date.now();
  assert.equal(PR.shouldRemove({expires: t + 1000}, {now: t}), false);
  assert.equal(PR.shouldRemove({expires: t - 1}, {now: t}), true);
  assert.equal(PR.shouldRemove({expires: t + 1000}, {now: t, live: false}), true);
  assert.equal(PR.shouldRemove({expires: t + 1000}, {now: t, startup: true}), true);
  assert.equal(PR.shouldRemove({kept: true, keptAt: t}, {now: t, live: false}), false);
  assert.equal(PR.shouldRemove({kept: true, keptAt: t - PR.KEPT_FOR - 1}, {now: t, startup: true}), true);
  assert.equal(PR.keepIf({}, {bloodLost: true}).why, "fed");
  assert.equal(PR.keepIf({}, {}).kept, undefined);
});

test("wiring: other modules' move listeners skip passers-by, animals are no witnesses, the hunt feeds the right vessel", () => {
  const r = f => readFileSync(new URL(`../../modules/${f}`, import.meta.url), "utf8");
  for ( const f of ["wodx-npc/scripts/rivalry.mjs", "wodx-npc/scripts/routines.mjs", "wodx-interactables/scripts/main.mjs", "wodx-actions/scripts/effects.js", "wodx-senses/scripts/perception.mjs"] ) {
    assert.match(r(f), /passerby/, f);
  }
  const k = r("wodx-actions/scripts/kindred.js");
  assert.match(k, /passerby\?\.animal\) continue/);
  assert.match(k, /exclude\.includes\(t\.actor\.isToken \? t\.document\.id : t\.actor\.id\)/);
  const m = r("wodx-actions/scripts/main.js");
  assert.match(m, /pbAnimal/);
  const n = r("wodx-npc/scripts/main.mjs");
  assert.match(n, /buildPassersby/);
  assert.match(n, /passersby\.registerSettings\(\)/);
  const p = r("wodx-npc/scripts/passersby.mjs");
  assert.match(p, /actorLink: false/, "one hidden actor per kind, unlinked tokens");
  assert.match(p, /updateEmbeddedDocuments\("Token", live/, "one batched update a tick");
});

test("kinds of place: no livestock in a back alley, no birds or strays inside a palace, the right people indoors", () => {
  for ( const [k, pl] of Object.entries(PR.PLACES) ) {
    for ( const c of ["livestock", "poultry", "stray", "cat", "rat", "bird"] ) assert.ok(typeof pl.animals[c] === "number", `${k}.${c}`);
  }
  for ( const t of Object.values(PR.PEOPLE) ) for ( const p of Object.values(t) ) assert.ok(p.cat, p.who);
  for ( let i = 0; i < 300; i++ ) {
    const y = 1197 + Math.floor(Math.random() * 900), h = Math.floor(Math.random() * 24);
    const al = PR.makeAnimal({year: y, hour: h, place: "alley"});
    if ( al ) assert.ok(!["pig", "goat", "cattle", "horse", "geese"].includes(al.kind), `alley ${y}: ${al.kind}`);
    const pa = PR.makeAnimal({year: y, hour: h, place: "interior"});
    if ( pa ) assert.ok(["cat", "rat"].includes(pa.kind), `palace ${y}: ${pa.kind}`);
    const ch = PR.makeAnimal({year: y, hour: h, place: "church"});
    if ( ch ) assert.ok(["cat", "rat"].includes(ch.kind), `church ${y}: ${ch.kind}`);
    const who = PR.makePasserby({year: y, hour: 12, place: "interior"});
    assert.ok(!["beggar", "homeless", "gongfarmer", "lamplighter"].includes(who.kind), `palace ${y}: ${who.kind}`);
  }
  assert.ok(PR.animalCount({year: 1300, hour: 11, place: "yard"}) > PR.animalCount({year: 1300, hour: 11, place: "alley"}));
  assert.equal(PR.animalCount({year: 1300, hour: 23, place: "interior", max: 8}) <= 1, true, "few animals indoors");
  assert.ok(PR.crowdSize({year: 1995, hour: 12, place: "square"}) > PR.crowdSize({year: 1995, hour: 12, place: "alley"}));
});

test("the crowd's place is WoDX NPC's own place tag: every kind draws a crowd profile, a haven draws nobody", () => {
  for ( const k of Object.keys(RR.PLACE_KINDS) ) assert.ok(PR.CROWD_OF_KIND[k], k);
  assert.equal(PR.placeOf("castle"), PR.PLACES.interior);
  assert.equal(PR.placeOf("market"), PR.PLACES.square);
  assert.equal(PR.crowdSize({year: 1995, hour: 12, place: "haven"}), 0);
  assert.equal(PR.animalCount({year: 1300, hour: 23, place: "haven"}), 0);
  assert.equal(PR.crowdSize({year: 1995, hour: 21, place: "chantry"}), 0);
  assert.equal(PR.placeOf("elysium"), PR.PLACES.elysium);
  assert.ok(PR.PLACES.elysium.people.gentry > 1 && PR.PLACES.elysium.people.servant > 1 && !PR.PLACES.elysium.people.poor);
  const r = f => readFileSync(new URL(`../../modules/${f}`, import.meta.url), "utf8");
  for ( const f of ["wodx-atmosphere/scripts/kits-rules.mjs", "wodx-interactables/scripts/adopt-rules.mjs"] ) assert.match(r(f), /"alley", "yard", "docks", "park"/, f);
  assert.match(r("wodx-npc/scripts/passersby.mjs"), /place\.kind/);
});

test("map files carry the whole map's kind of place, and adopting tags the scene unless it already has one", async () => {
  const A = await import("../../modules/wodx-interactables/scripts/adopt-rules.mjs");
  const base = {format: "wodx-map", version: 1, cells: [10, 10], openings: [], features: [], regions: [{id: "a", rect: [0, 0, 2, 2], place: {kind: "alley"}}]};
  const ok = A.parseSidecar(JSON.stringify({...base, place: {kind: "yard"}}));
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.data.place, {kind: "yard"});
  assert.equal(ok.data.regions[0].place.kind, "alley", "the new kinds are known to the importer");
  const bad = A.parseSidecar(JSON.stringify({...base, place: {kind: "moon"}}));
  assert.equal(bad.data.place, null);
  assert.ok(bad.errors.length);
  const fr = A.frameOf({dimensions: {sceneX: 0, sceneY: 0, size: 100, distance: 5, sceneWidth: 1000, sceneHeight: 1000}});
  assert.deepEqual(A.plan(ok.data, {walls: [], tiles: [], lights: [], regions: []}, fr).scenePlace, {kind: "yard"});
  assert.equal(A.plan(ok.data, {walls: [], tiles: [], lights: [], regions: [], placeKind: "castle"}, fr).scenePlace, null);
  const r = f => readFileSync(new URL(`../../tools/mapgen/${f}`, import.meta.url), "utf8");
  for ( const f of ["ddfarm.py", "ddsite.py", "ddtown.py", "organic.py"] ) assert.match(r(f), /"place": \{"kind":/, f);
  assert.match(r("ddtown.py"), /else "alley"/);
});

test("tags for rules that care who the vessel is: station, sex, age band, faith, origin; animals tagged animal", () => {
  const banned = /\b(woman|man)\b/i;
  for ( let i = 0; i < 200; i++ ) {
    const y = 1197 + Math.floor(Math.random() * 900);
    const p = PR.makePasserby({year: y, hour: 12});
    assert.ok(p.tags.includes(p.kind));
    assert.ok(p.tags.some(t => t === "woman" || t === "man"));
    assert.ok(p.tags.some(t => ["youth", "adult", "elder"].includes(t)));
    assert.ok(!p.tags.includes("child"));
    assert.ok(!banned.test(p.name), "the sex is a tag only, never in the name");
    if ( y >= 1946 ) assert.ok(!p.tags.includes("german"), `${y}`);
    const a = PR.makeAnimal({year: y, hour: 12});
    if ( a ) assert.deepEqual(a.tags.slice(0, 2), ["animal", a.kind]);
  }
  assert.ok(PR.tagsFor("friar", PR.PEOPLE.medieval.friar, 1300, () => 0.5).includes("clergy"));
  assert.ok(PR.tagsFor("burgher", PR.PEOPLE.medieval.burgher, 1550, () => 0.6).includes("protestant"));
});
