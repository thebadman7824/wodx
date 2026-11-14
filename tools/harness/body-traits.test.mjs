import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* B3793: merits and flaws that change the body in a fight (WoDX Chronicle's table, WoDX Combat's track) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const T = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/trait-rules.mjs")));
const D = await import(pathToFileURL(join(root, "modules/wodx-chronicle/data/trait-effects.mjs")));
const R = await import(pathToFileURL(join(root, "modules/wodx-combat/scripts/rules.js")));
const feat = (name, kind = "merit") => ({id: name, name, kind, value: 0});
const PEN = {bruised: 0, hurt: -1, injured: -1, wounded: -2, mauled: -2, crippled: -5, incapacitated: -99};
const at = key => ({key, penalty: PEN[key]});

test("the body table reads the character's traits, the right kind only", () => {
  assert.equal(T.bodyOf({kind: "mortal", features: [feat("Huge Size")]}).bruised, 1);
  assert.equal(T.bodyOf({kind: "mage", features: [feat("Insensate to Pain")]}).ease, 99);
  assert.equal(T.bodyOf({kind: "mortal", features: [feat("Insensate to Pain")]}).ease, 0);
  assert.equal(T.bodyOf({kind: "kindred", features: [feat("Vulnerability to Silver", "flaw")]}).silver, true);
  for ( const k of Object.keys(D.BODY) ) assert.ok(D.MERITS_FLAWS.some(e => e.key === k), k);
});

test("wound penalties after the body traits", () => {
  assert.equal(R.bodyPenalty(at("wounded"), PEN, null), -2);
  assert.equal(R.bodyPenalty(at("hurt"), PEN, {shift: 1}), 0);
  assert.equal(R.bodyPenalty(at("crippled"), PEN, {shift: 1}), -2);
  assert.equal(R.bodyPenalty(at("wounded"), PEN, {ease: 1}), -1);
  assert.equal(R.bodyPenalty(at("crippled"), PEN, {ease: 99}), 0);
  assert.equal(R.bodyPenalty(at("incapacitated"), PEN, {ease: 99}), -99);
});

test("Combat reads the body traits for the track, the penalty and silver", () => {
  const src = readFileSync(join(root, "modules/wodx-combat/scripts/main.js"), "utf8");
  assert.match(src, /traits\?\.toughness\?\.\(actor\)/);
  assert.match(src, /totals\.bruised \+= num\(body\.bruised\)/);
  assert.match(src, /R\.bodyPenalty\(ws, t\.penalties, toughness\(actor\)\)/);
  assert.match(src, /toughness\(target\)\?\.silver/);
});

test("only Extreme Kink is left without an effect, on purpose", () => {
  const none = D.MERITS_FLAWS.filter(e => T.describe({entry: e}).includes("no automatic effect yet")).map(e => e.key);
  assert.deepEqual(none, ["extreme-kink"]);
});
