// Storyteller 0.61.0: the chronicle builder's rules and the Rothenstein recipe (B2780-B2785).
import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = await import(join(root, "modules/wodx-storyteller/scripts/recipe-rules.mjs"));
const {ROTHENSTEIN} = await import(join(root, "modules/wodx-storyteller/data/recipe-rothenstein.mjs"));
const {WORLD_REGIONS} = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
const {PLACE_KINDS} = await import(join(root, "modules/wodx-npc/scripts/routine-rules.mjs"));
const ctx = {regions: Object.keys(WORLD_REGIONS), placeKinds: Object.keys(PLACE_KINDS)};

test("the Rothenstein recipe is in order", () => {
  assert.deepEqual(R.validate(ROTHENSTEIN, ctx), []);
  assert.equal(ROTHENSTEIN.world, "rothenstein-x");
  assert.equal(ROTHENSTEIN.opening.year, 1197);
  assert.ok(ROTHENSTEIN.reach.every(h => h.region === null || h.region !== ROTHENSTEIN.homeland));
});

test("a broken recipe is named in plain words", () => {
  const bad = {...ROTHENSTEIN, world: "rothenstein-live", homeland: "atlantis", opening: {year: 1100}, lines: ["vampire", "lizard"],
    anchors: {places: [{key: "a", match: "(", kind: "castle"}, {key: "a", match: "x", kind: "nowhere"}], people: [{key: "p", name: "X", home: "missing"}]},
    ages: [1500, 1400]};
  const out = R.validate(bad, ctx).join(" ");
  for ( const w of ["locked", "atlantis", "1197", "lizard", "named twice", "not a pattern", "unknown kind", "not an anchor place", "not in order"] ) assert.ok(out.includes(w), w);
  assert.deepEqual(R.validate(null), ["There is no recipe."]);
});

test("the builder never works in Live, and elsewhere only when forced", () => {
  assert.equal(R.canBuildHere("rothenstein-live", ROTHENSTEIN, {force: true}).ok, false);
  assert.equal(R.canBuildHere("rothenstein-x", ROTHENSTEIN).ok, true);
  assert.equal(R.canBuildHere("rothenstein-wodx", ROTHENSTEIN).ok, false);
  assert.equal(R.canBuildHere("rothenstein-wodx", ROTHENSTEIN, {force: true}).ok, true);
  assert.equal(R.canBuildHere("x", {}).ok, false);
});

test("versions compare part by part", () => {
  assert.ok(R.versionAtLeast("0.10.0", "0.9.10"));
  assert.ok(!R.versionAtLeast("0.9.10", "0.10.0"));
  assert.ok(R.versionAtLeast("7.3.2-wodx.9", "7.3.2"));
  assert.ok(R.versionAtLeast("1.0", "1.0.0"));
  assert.ok(!R.versionAtLeast(null, "0.1.0"));
  assert.ok(R.versionAtLeast(null, null));
});

test("steps run in order: one ready at a time, later phases wait", () => {
  const modules = {"wodx-chronicle": "0.51.0"};
  let rows = R.planSteps({modules});
  assert.equal(rows.find(r => r.id === "check").state, "ready");
  assert.equal(rows.find(r => r.id === "settings").state, "blocked");
  assert.equal(rows.find(r => r.id === "ground").state, "later");
  rows = R.planSteps({modules, record: {steps: {check: {at: 1}, settings: {at: 2}}}});
  assert.equal(rows.find(r => r.id === "carry").state, "ready");
  assert.equal(rows.find(r => r.id === "anchors").state, "blocked");
  rows = R.planSteps({modules: {"wodx-chronicle": "0.40.0"}, record: {steps: {check: {at: 1}}}});
  assert.match(rows.find(r => r.id === "settings").reason, /wodx-chronicle 0\.48\.0/);
  assert.ok(R.STEPS.filter(s => s.phase === R.PHASE_NOW).every(s => ["check", "settings", "carry", "anchors"].includes(s.id)));
});

test("an older world's documents are sorted for the carry-over", () => {
  const v = e => R.classify(e).verdict;
  assert.equal(v({type: "Scene", name: "Sessio I · The First Night"}), "carry");
  assert.equal(v({type: "JournalEntry", name: "Overview & Cast"}), "carry");
  assert.equal(v({type: "Actor", name: "Bogdan Ursu"}), "carry");
  assert.equal(v({type: "Actor", name: "WoDX gate: the master"}), "leave");
  assert.equal(v({type: "Item", name: "Gate sword"}), "leave");
  assert.equal(v({type: "Actor", name: "Mira", flags: {"wodx-gate": {tag: 1}}}), "leave");
  assert.equal(v({type: "Actor", name: "Elsbeth", playerOwned: true}), "leave");
  assert.equal(v({type: "Combat", name: ""}), "leave");
  assert.equal(v({type: "ChatMessage", name: ""}), "leave");
  assert.equal(v({type: "Actor", name: "Jan the tanner", flags: {"wodx-npc": {resident: {household: "a"}}}}), "rebuild");
  assert.equal(v({type: "Actor", name: "A passer-by", folder: "WoDX passers-by"}), "rebuild");
  assert.equal(v({type: "JournalEntry", name: "Storyteller screen", flags: {"wodx-storyteller": {template: {kind: "screen"}}}}), "rebuild");
  assert.equal(v({type: "JournalEntry", name: "Legends", flags: {"wodx-chronicle": {kind: "legends"}}}), "rebuild");
  const t = R.tally([{type: "Scene", name: "A"}, {type: "Scene", name: "B"}, {type: "Combat"}]);
  assert.deepEqual(t, {carry: {Scene: 2}, rebuild: {}, leave: {Combat: 1}});
  assert.equal(R.CARRY_ORDER[0], "Folder");
  assert.equal(R.CARRY_ORDER.at(-1), "Scene");
});

test("anchors find the authored places and the cast, the shortest name first", () => {
  const scenes = [{id: "s1", name: "Kranzfels · Inner Ward and Great Hall"}, {id: "s2", name: "Locus · Church of St. Aegidius"},
    {id: "s3", name: "Trespass · Father Ludovic's Presbytery"}, {id: "s4", name: "The Silver Adit"}, {id: "s5", name: "Dolany Village"}];
  const p = Object.fromEntries(R.placeAnchors(ROTHENSTEIN, scenes).map(a => [a.key, a.ids]));
  assert.deepEqual(p.kranzfels, ["s1"]);
  assert.deepEqual(p["st-aegidius"], ["s2", "s3"]);
  assert.deepEqual(p["silver-adit"], ["s4"]);
  assert.deepEqual(p.dolany, ["s5"]);
  assert.deepEqual(p.ashfield, []);
  const actors = [{id: "a1", name: "Konrad the Flesh-Smith"}, {id: "a2", name: "Konrad"}, {id: "a3", name: "Bogdan Ursu", playerOwned: true}];
  const people = Object.fromEntries(R.peopleAnchors(ROTHENSTEIN, actors).map(a => [a.key, a]));
  assert.equal(people.konrad.id, "a2");
  assert.equal(people.bogdan.id, null);
  assert.equal(people.konrad.home, "silver-adit");
});
