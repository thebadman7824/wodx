import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Tainted vessels on the Hunt (WoDX Actions 3.19.0) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const R = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/rules.js")));

test("vessels: drink, drugs and disease, each with its page", () => {
  assert.deepEqual(Object.keys(R.VESSEL_STATES), ["clean", "drunk", "stimulant", "hallucinogen", "opiate", "disease"]);
  for ( const [k, v] of Object.entries(R.VESSEL_STATES) ) if ( k !== "clean" ) assert.match(v.note, /V20 p\. \d+/);
  assert.equal(R.drinkPenalty(5), 2);
  assert.equal(R.drinkPenalty(1), 0);
  assert.equal(R.drinkPenalty(-3), 0);
});

test("vessels: a blood-borne disease is spotted, resisted, or carried", () => {
  assert.deepEqual(R.diseaseOutcome({successes: 1}), {spotted: true, carrier: false});
  assert.equal(R.diseaseOutcome({successes: 0, botch: true}).carrier, true);
  assert.equal(R.diseaseOutcome({successes: 0}).carrier, null);
  assert.equal(R.diseaseOutcome({successes: 0}, {successes: 2}).carrier, false);
  assert.equal(R.diseaseOutcome({successes: 0}, {successes: 0}).carrier, true);
});

test("vessels: the Hunt and Feed windows ask, and a plague year starts on disease", () => {
  const s = src("modules/wodx-actions/scripts/main.js");
  assert.match(s, /stateFields\(here\?\.outbreak \? "disease" : style\?\.state \?\? "clean"\)/);
  assert.match(s, /state: fd\.vstate, drinks: fd\.drinks/);
  assert.match(s, /Intelligence \+ Medicine \(7\)/);
  assert.match(s, /flags\.\$\{MOD\}\.carrier/);
  assert.equal(JSON.parse(src("modules/wodx-actions/module.json")).version, "3.50.0");
});

test("vessels: fae blood is a drug to Kindred, with hallucinations and waking dreams", () => {
  assert.equal(R.VESSELS.fae.pool, 10);
  assert.equal(R.faeBloodHigh(0), null);
  assert.deepEqual([1, 2, 3, 4, 5, 8].map(p => R.faeBloodHigh(p).dice), [1, 1, 2, 2, 3, 3]);
  assert.equal(R.faeBloodHigh(4).scenes, 4);
  assert.match(R.faeBloodHigh(1).note, /potent drug.*hallucinates.*waking dreams/);
  const s = src("modules/wodx-actions/scripts/main.js");
  assert.match(s, /P\.detectProfile\(vesselActor\) === "fae"/);
  assert.match(s, /R\.faeBloodHigh\(drunk\)/);
});
