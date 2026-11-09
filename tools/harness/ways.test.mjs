import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as WR from "../../modules/wodx-otherworlds/scripts/ways-rules.mjs";

/* WoDX Otherworlds 0.6.0: ways and realms. */
test("each kind of way sits on its layer, and a realm scene end is always the realm's own level", () => {
  assert.deepEqual(WR.WAY_ORDER.map(k => [WR.endLayer(k, "from"), WR.endLayer(k, "to")]),
    [["dreaming", "dreaming"], ["penumbra", "penumbra"], ["penumbra", "penumbra"], ["shadowlands", null], [null, null]]);
  assert.equal(WR.endLayer("anchorhead", "to", {isRealm: true}), "realm");
  assert.equal(WR.endLayer("airt", "to", {isRealm: true}), "realm");
  assert.equal(WR.endLayer("nonsense", "from"), null);
});
test("a way's region and a realm's scene", () => {
  const r = WR.wayRegion({name: "Airt to the Bone Mill", grid: 50, cx: 300, cy: 400, levelId: "L1", flags: {x: {way: "airt"}}});
  assert.deepEqual(r.shapes[0], {type: "rectangle", x: 300, y: 400, width: 100, height: 100, anchorX: 0.5, anchorY: 0.5, rotation: 0});
  assert.deepEqual(r.levels, ["L1"]);
  assert.deepEqual(WR.wayRegion({}).levels, []);
  const s = WR.realmScene("stygia");
  assert.equal(s.name, "Stygia");
  assert.equal(s.navigation, false);
  assert.equal(s.flags.realm, "stygia");
  assert.equal(WR.realmScene("nowhere", "Pangaea").flags.realm, "umbral-realm");
  assert.equal(WR.realmScene("nowhere", "Pangaea").name, "Pangaea");
  assert.deepEqual([...WR.REALM_ORDER].sort(), Object.keys(WR.DEEP_REALMS).sort());
});
test("ways are wired: a Storyteller toolbar button, the api, searchable scene lists", () => {
  const main = readFileSync(new URL("../../modules/wodx-otherworlds/scripts/main.mjs", import.meta.url), "utf8");
  const ui = readFileSync(new URL("../../modules/wodx-otherworlds/scripts/ways.mjs", import.meta.url), "utf8");
  assert.match(main, /tokens\.tools\.wodxWays = /);
  assert.match(main, /ways: \{make: ways\.makeWay/);
  assert.match(ui, /searchBox\("select\[name=from\]"/);
  assert.match(ui, /type: "teleportToken"/);
});
