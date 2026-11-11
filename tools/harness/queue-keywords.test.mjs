import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Trait effects step 10 (Actions 3.38.0, Otherworlds 0.13.0): Step, Shape, Summon, Make, Weather and Move on others
   change the world once the Storyteller approves them */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const E = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/effects-rules.js")));
const src = p => readFileSync(join(root, p), "utf8");
const got = {ok: true, strength: 4, duration: 1, targets: 0};

test("each queued keyword now has a kind that does something", () => {
  assert.equal(E.outcome("shape", got, {form: "a wolf"}).kind, "timed");
  assert.match(E.outcome("shape", got, {form: "a wolf"}).text, /a wolf/);
  assert.equal(E.outcome("sideways", got).kind, "cross");
  assert.equal(E.outcome("sideways", got, {shroud: true}).to, "shadowlands");
  const s = E.outcome("summon", got);
  assert.equal(s.kind, "summon"); assert.equal(s.count, 2);
  assert.equal(E.outcome("summon", {...got, strength: 20}).count, 5);
  assert.equal(E.outcome("make", got, {thing: "a silver knife"}).kind, "give");
  const w = E.outcome("weather", got, {weather: "storm"});
  assert.equal(w.kind, "weather"); assert.equal(w.weather, "storm");
  assert.equal(E.outcome("weather", got, {weather: "locusts"}).weather, null, "an unknown weather is asked for");
  for ( const v of Object.values(E.WEATHER_SET) ) assert.ok(v.label && Object.keys(v.day).length);
  for ( const k of ["shape", "sideways", "summon", "make", "weather"] ) assert.equal(E.route(k, {self: true}), "queue", k);
});

test("the Foundry side: Otherworlds crosses with no roll, Atmosphere's night is set, the approval card has Undo", () => {
  const fx = src("modules/wodx-actions/scripts/effects.js");
  assert.match(fx, /case "cross":/);
  assert.match(fx, /OW\.sendAcross\(tok, \{to: o\.to\}\)/);
  assert.match(fx, /case "weather":/);
  assert.match(fx, /AT\.set\(jdn, \{\.\.\.\(prev \?\? \{\}\), \.\.\.E\.WEATHER_SET\[w\]\.day\}\)/);
  assert.match(fx, /r\.weather\.prev \?\? null/);
  assert.match(fx, /if \( r\.across \)/);
  assert.match(fx, /a Move on someone else, approved from the queue, asks for the spot/);
  assert.match(fx, /undo: good \? \[rec\] : \[\]/);
  const ow = src("modules/wodx-otherworlds/scripts/crossing.mjs");
  assert.match(ow, /export async function sendAcross/);
  assert.match(src("modules/wodx-otherworlds/scripts/main.mjs"), /crossShroud, sendAcross,/);
  assert.ok(!/—/.test(ow.slice(ow.indexOf("sendAcross"))));
});
