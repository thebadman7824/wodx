import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Havens with security (Storyteller 0.15.0, Interactables 0.16.1) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const H = await imp("modules/wodx-storyteller/scripts/haven-rules.mjs");
const I = await imp("modules/wodx-interactables/scripts/interact-rules.mjs");

test("havens: the record keeps owners, guests, security and who knows", () => {
  const h = H.normHaven({name: " The crypt ", owners: ["a", "a", "b"], security: 9, known: [{who: "The Sheriff", how: "followed"}, {how: "no name"}]});
  assert.equal(h.name, "The crypt");
  assert.deepEqual(h.owners, ["a", "b"]);
  assert.equal(h.security, 5);
  assert.equal(h.known.length, 1);
  assert.equal(H.normHaven(null), null);
});

test("havens: the home Background by line, and security no more than the Domain", () => {
  assert.deepEqual(H.ratingFrom([{name: "Resources", value: 4}, {name: "Domain", value: 2}]).kind, "Domain");
  assert.equal(H.ratingFrom([{name: "Sanctum", value: 3}, {name: "Chantry", value: 1}]).kind, "Sanctum");
  assert.equal(H.ratingFrom([{name: "Haunt", value: 2}]).ref, "Wraith 20th pdf p. 208");
  assert.equal(H.ratingFrom([{name: "Allies", value: 2}]), null);
  assert.equal(H.capSecurity(4, {kind: "Domain", value: 2}), 2);
  assert.equal(H.capSecurity(4, {kind: "Holdings", value: 1}), 4);
});

test("havens: someone learns the way once, and can be forgotten", () => {
  let h = H.addKnown({}, "Brother Anselm", "saw them at dawn", 10);
  h = H.addKnown(h, "brother anselm", "again", 20);
  assert.equal(h.known.length, 1);
  assert.equal(H.forget(h, "Brother Anselm").known.length, 0);
});

test("havens: locks and traps on the scene are counted", () => {
  const d = H.defences({walls: [{flags: {"wodx-interactables": {lock: "good"}}}, {ds: 2}, {flags: {"wodx-interactables": {lock: "none"}}}],
    tiles: [{flags: {"wodx-interactables": {trap: true}}}, {flags: {"wodx-interactables": {container: true, lock: "simple"}}}]});
  assert.deepEqual(d, {locks: 3, traps: 1});
});

test("havens: breaking in is harder for strangers, not for those who live there", () => {
  const h = {owners: ["a"], guests: ["g"], security: 3};
  assert.equal(I.havenSecurity(h, "x", "pick"), 3);
  assert.equal(I.havenSecurity(h, "a", "pick"), 0);
  assert.equal(I.havenSecurity(h, "g", "smash"), 0);
  assert.equal(I.havenSecurity(h, "x", "open"), 0);
  assert.equal(I.havenSecurity(null, "x", "pick"), 0);
  const s = src("modules/wodx-interactables/scripts/main.mjs");
  assert.match(s, /R\.havenSecurity\(canvas\.scene\?\.flags\?\.\["wodx-storyteller"\]\?\.haven/);
  assert.match(s, /extraDiff: num\(fd\.extraDiff\) \+ haven/);
  const m = src("modules/wodx-storyteller/scripts/main.mjs");
  assert.match(m, /havens: \{open: Havens\.havensDialog/);
  assert.match(src("modules/wodx-storyteller/scripts/havens.mjs"), /attention: "A haven is known"/);
});
