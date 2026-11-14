import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import * as N from "../../modules/wodx-storyteller/scripts/night-rules.mjs";
import * as Reg from "../../modules/wodx-library/scripts/wonder-registry.mjs";
import "../../modules/wodx-library/scripts/wonder-lines.mjs";
import {NIGHT_TABLES} from "../../modules/wodx-storyteller/data/night-tables.mjs";

/* Night encounters put on a scene, and story-aid things made real (B3924) */

const kits = {kitFor: Reg.kitFor, rowOf: Reg.rowOf, rows: l => Reg.kitFor(l)?.rows?.() ?? []};

test("night place: who an encounter brings, with counts, and never children", () => {
  assert.deepEqual(N.peopleIn("The watch, two with lanterns and a pike, asks who goes there and why."), [{role: "watch", count: 2}]);
  assert.deepEqual(N.peopleIn("Three soldiers and a merchant argue at the gate.").map(p => `${p.role}${p.count}`).sort(), ["merchant1", "soldier3"]);
  assert.deepEqual(N.peopleIn("A door stands open on a dark house."), [{role: "someone", count: 1}]);
  assert.deepEqual(N.peopleIn("A child cries alone in the street."), []);
  assert.equal(N.tradeFor("watch", ["farmer", "town guard"]), "town guard");
  assert.equal(N.tradeFor("priest", ["farmer"]), "any");
  // every town and wilds encounter line gives at most six people
  for ( const t of NIGHT_TABLES.filter(x => /^night\.encounter\.(town|wilds)/.test(x.id)) ) for ( const r of t.results ) {
    const n = N.peopleIn(r.text).reduce((s, p) => s + p.count, 0);
    assert.ok(n <= 12, r.text);
  }
});

test("night place: relic, talisman and fetish aids become crafted items with Use powers", () => {
  const relic = N.aidItem({kind: "relic", rating: 5, text: "a finger bone of a local saint in a silver reliquary"}, kits);
  assert.equal(relic.name, "Finger bone of a local saint");
  assert.equal(relic.flags["wodx-library"].wonder.relic.rating, 3);
  assert.ok(relic.flags["wodx-library"].wonder.powers.length >= 1);
  assert.equal(relic.flags["wodx-storyteller"].aid.kind, "relic");
  const tal = N.aidItem({kind: "talisman", rating: 2, text: "a ring engraved with the names of the seven planets"}, kits);
  assert.equal(tal.flags["wodx-library"].wonder.uses.value, 2);
  assert.equal(tal.flags["wodx-library"].wonder.level, 2);
  const fet = N.aidItem({kind: "fetish", rating: 3, text: "a drum with a thunder spirit in the skin"}, {...kits, rand: () => 0.4});
  assert.equal(fet.type, "Fetish");
  assert.equal(fet.flags["wodx-library"].wonder.kind, "fetish");
  assert.match(fet.flags["wodx-library"].wonder.spirit, /thunder spirit/);
  assert.equal(N.aidItem({kind: "dream", text: "x"}, kits), null);
  assert.equal(N.aidItem({kind: "relic", rating: 1, text: "x"}, {}), null);
});
