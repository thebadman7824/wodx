import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import * as FL from "../../modules/wodx-npc/scripts/road-flock-rules.mjs";

// Dark Ages depth desk item 3, part 2 (B7649): a Road's walkers in a town as a small Kindred faction.
const place = {uuid: "Scene.abc123", name: "Rothenstein Market"};

test("every Dark Ages Road has its group, head and page", () => {
  for ( const k of ["beast", "heaven", "humanity", "kings", "lilith", "metamorphosis", "sin", "bones", "yasa"] ) {
    assert.ok(FL.FLOCKS[k]?.flock && FL.FLOCKS[k].group && FL.FLOCKS[k].p > 100, k);
  }
});

test("the Luminaries of a place: a secret Kindred faction on orders, led by the highest on the Road", () => {
  const f = FL.flockSpec({road: "kings", roadName: "Road of Kings", place, walkers: [{id: "a", name: "Anselm", rating: 5}, {id: "b", name: "Berthold", rating: 8}, {id: "a", name: "Anselm", rating: 5}]});
  assert.equal(f.name, "The Luminaries of Rothenstein Market");
  assert.equal(f.kind, "kindred"); assert.equal(f.secret, true); assert.equal(f.run, "orders");
  assert.equal(f.leader, "b"); assert.deepEqual(f.members, ["b", "a"]);
  assert.deepEqual(f.places, [place.uuid]);
  assert.equal(f.id, FL.flockId("kings", place.uuid));
  assert.match(f.notes, /the Lord: Berthold/);
});

test("one walker is no group, and a Black Church has no head", () => {
  assert.equal(FL.flockSpec({road: "sin", place, walkers: [{id: "a", name: "A", rating: 3}]}), null);
  const m = FL.flockSpec({road: "metamorphosis", place, walkers: [{id: "a", name: "A", rating: 3}, {id: "b", name: "B", rating: 4}]});
  assert.equal(m.leader, null); assert.match(m.notes, /no head/);
  assert.equal(FL.flockSpec({road: "nonsense", place, walkers: [{id: "a"}, {id: "b"}]}), null);
});
