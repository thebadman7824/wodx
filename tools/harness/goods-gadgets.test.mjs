import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The no-effect audit, seeds, fire-lighters and timepieces (B3911) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const D = await imp("modules/wodx-library/scripts/gadget-rules.mjs");
const C = await imp("modules/wodx-library/data/goods-crops.mjs");
const G = await imp("modules/wodx-library/data/goods.mjs");
const U = await imp("modules/wodx-library/scripts/use-rules.mjs");
const good = n => G.GOODS.find(g => g.name === n);

test("every seed grows into a good, and plant, strike and time do something", () => {
  const names = new Set(G.GOODS.map(g => g.name));
  for ( const g of G.GOODS.filter(x => x.kind === "seeds") ) assert.ok(C.CROPS[g.name], `${g.name} has no crop`);
  for ( const [k, c] of Object.entries(C.CROPS) ) { assert.ok(names.has(k), k); if ( c.crop ) assert.ok(names.has(c.crop), c.crop); }
  for ( const k of ["plant", "strike", "time"] ) assert.notEqual(U.ABILITIES[k].effect, "note", k);
  assert.ok(U.abilitiesOf(good("a pocket watch on a chain")).includes("time"));
  assert.ok(U.abilitiesOf(good("a mantel clock")).includes("time"));
  assert.deepEqual(U.abilitiesOf(good("an hourglass")), ["time"]);
  assert.match(src("modules/wodx-library/scripts/use.mjs"), /case "strike": \{/);
});

test("a planting grows, then is ready", () => {
  const corn = D.cropOf("seed corn");
  assert.equal(D.plantState(null, corn, 0).state, "seed");
  assert.deepEqual(D.plantState({at: 0}, corn, 86400 * 10), {state: "growing", daysLeft: 80});
  assert.equal(D.plantState({at: 0}, corn, 86400 * 90).state, "ready");
});

test("timepieces", () => {
  assert.match(D.timeLine("clock", {hour: 9, minute: 5}), /09:05/);
  assert.match(D.timeLine("sun", {hour: 14, sunUp: true}), /about 14:00/);
  assert.match(D.timeLine("sun", {sunUp: false}), /nothing at night/);
  assert.match(D.timeLine("glass", {turnedAt: 0, now: 1200}), /20 minutes/);
  assert.match(D.timeLine("glass", {turnedAt: 0, now: 7200}), /more than an hour/);
});
