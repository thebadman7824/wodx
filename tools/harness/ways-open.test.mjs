// Ways, the open world's doorways (B4780-B4783): the pure rules.
import {test} from "node:test";
import assert from "node:assert/strict";
import {join, dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const W = await import(join(root, "modules/wodx-storyteller/scripts/way-rules.mjs"));

test("every kind of way has a label and words", () => {
  for ( const k of W.WAY_ORDER ) assert.ok(W.WAY_KINDS[k].label && W.WAY_KINDS[k].words, k);
  assert.equal(W.wayMinutes({kind: "door"}), 1);
  assert.equal(W.wayMinutes({kind: "road"}), null, "a road's end goes by the trip rules");
  assert.equal(W.wayMinutes({kind: "road", minutes: 40}), 40, "a way's own minutes win");
});

test("a town gate shuts at night and says what can be done", () => {
  assert.equal(W.wayBlocked({shut: "night"}, {night: false}), null);
  const b = W.wayBlocked({shut: "night"}, {night: true});
  assert.match(b.why, /shut for the night/);
  assert.ok(b.can.includes("Wait for dawn"));
  assert.match(W.wayBlocked({shut: "locked"}, {locked: true}).why, /locked/);
  assert.equal(W.wayBlocked({shut: "locked"}, {locked: false}), null, "an opened lock lets them through");
  assert.ok(W.wayBlocked({shut: "closed"}, {}));
  assert.equal(W.wayBlocked({shut: "asks"}, {}), null, "asking first is the approval queue, not a shut door");
  assert.ok(W.wayAsks({shut: "asks"}));
});

test("a way that the year has not built yet, or has lost, is not there", () => {
  assert.match(W.wayBlocked({built: {from: 1866}}, {year: 1200}).why, /nothing there yet/);
  assert.match(W.wayBlocked({built: {to: 1645}}, {year: 1700}).why, /gone/);
  assert.equal(W.wayBlocked({built: {from: 1199}}, {year: 1200}), null);
});

test("the company close by and followers go along; strangers stay", () => {
  const g = 100;
  const walker = {id: "w", actorId: "A", x: 0, y: 0, pc: true};
  const toks = [walker, {id: "n", actorId: "B", x: 200, y: 0, pc: true}, {id: "far", actorId: "C", x: 900, y: 0, pc: true},
    {id: "npc", actorId: "D", x: 100, y: 0, pc: false}, {id: "f", actorId: "E", x: 1500, y: 0, pc: false, follows: "A"}];
  const go = W.companions(walker, toks, g).map(t => t.id);
  assert.deepEqual(go, ["w", "n", "f"]);
  assert.deepEqual(W.companions(null, toks, g), []);
});

test("the network check names dead ends and places that cannot be reached", () => {
  const ok = [{id: "a", name: "Gate", ways: [{to: "b"}]}, {id: "b", name: "Square", ways: [{to: "a"}, {to: "c"}]}, {id: "c", name: "Inn", ways: [{to: "b"}]}];
  assert.deepEqual(W.checkNetwork(ok), []);
  const bad = [...ok, {id: "d", name: "Cellar", ways: [{to: "x"}]}];
  const out = W.checkNetwork(bad).join(" ");
  for ( const w of ["Cellar has a way to a place that is not there", "Cellar has no way out", "Cellar has no way in", "Cellar cannot be reached"] ) assert.ok(out.includes(w), w);
});

test("the line on the way in says where and how long", () => {
  assert.equal(W.wayLine({kind: "gate"}, "Lower Town", 3), "Lower Town, through the gate, 3 minutes.");
  assert.equal(W.wayLine({kind: "door"}, "The Inn", 1), "The Inn, through the door, 1 minute.");
  assert.equal(W.wayLine({kind: "road"}, "Dolany", null), "Dolany, by the road.");
});

// Laying Ways in a built world (B4810-B4813)
const exit = (id, name, dest, extra = {}) => ({id, name, flags: extra.flags ?? {}, behaviors: [{id: `${id}b`, type: "teleportToken", disabled: !!extra.off, system: {destinations: [dest]}}]});
test("old exits between maps become Ways; twins, crossings and dead ends do not", () => {
  const scenes = [
    {id: "m", name: "Lower Town · Market Square", regions: [exit("r1", "Exit: quay", "Scene.q.Region.a1"), exit("r2", "Exit: twin", "Scene.q.Region.a1", {flags: {"wodx-otherworlds": {twinOf: "r1"}}}),
      exit("r3", "Exit: nowhere", "Scene.zz.Region.x"), exit("r4", "Exit: up", "Scene.f.Region.a2"), exit("r5", "Exit: off", "Scene.q.Region.a1", {off: true})]},
    {id: "q", name: "Lower Town · Riverside Quay", regions: [{id: "a1", name: "Arrive", behaviors: []}, exit("r6", "Cross", "Scene.q.Region.a1")]},
    {id: "f", name: "Lower Town · Upper Floors and Cellars", regions: [{id: "a2", name: "Arrive", behaviors: []}]}
  ];
  const {ways, lost} = W.exitsToWays(scenes);
  assert.deepEqual(ways.map(w => [w.regionId, w.to, w.arrive, w.kind]), [["r1", "q", "a1", "street"], ["r4", "f", "a2", "stair"]]);
  assert.deepEqual(lost, ["Lower Town · Market Square: Exit: nowhere"]);
});
test("the kind of an old exit comes from the two names", () => {
  assert.equal(W.exitKind("The Keep Road", "Kranzfels · The Outer Bailey"), "gate");
  assert.equal(W.exitKind("Kranzfels · The Outer Bailey", "Kranzfels · Inner Ward and Great Hall"), "gate");
  assert.equal(W.exitKind("The River Road and Fields", "Toll-post and Ivo's Ferry"), "ferry");
  assert.equal(W.exitKind("The Forest Road", "The Old Grove"), "road");
});
test("doors are planned by scene name, and missing names are reported", () => {
  const names = [{id: "s", name: "Street"}, {id: "h", name: "House"}];
  const p = W.planDoors([{inside: "House", street: "Street", shut: "locked"}, {inside: "Shed", street: "Street", kind: "nonsense"}], names);
  assert.deepEqual(p.doors, [{inside: "h", street: "s", kind: "door", shut: "locked"}]);
  assert.deepEqual(p.missing, ["Shed"]);
});
test("doors on one street stand apart along the south edge", () => {
  const box = {x: 0, y: 0, w: 1000, h: 800, g: 100};
  const a = W.doorSpot(0, box), b = W.doorSpot(1, box), c = W.doorSpot(2, box), d = W.doorSpot(3, box);
  assert.equal(a.y, 700); assert.equal(b.x - a.x, 300);
  assert.ok(c.x + c.w <= 1000, "the last door fits");
  assert.equal(d.y, 500, "a row further in once the edge is full");
});
test("the Rothenstein recipe's doors are each named once and pass the recipe check", async () => {
  const {ROTHENSTEIN} = await import(join(root, "modules/wodx-storyteller/data/recipe-rothenstein.mjs"));
  const R = await import(join(root, "modules/wodx-storyteller/scripts/recipe-rules.mjs"));
  assert.ok(ROTHENSTEIN.doors.length >= 30);
  assert.deepEqual(R.validate(ROTHENSTEIN).filter(m => /door/.test(m)), []);
  assert.deepEqual(R.validate({...ROTHENSTEIN, doors: [{inside: "A", street: "B"}, {inside: "A", street: "C"}, {inside: "X"}]}).filter(m => /door/i.test(m)).length, 2);
});
