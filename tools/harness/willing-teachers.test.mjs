import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* B7131: a teacher has to be willing. WoDX NPC's attitude and trust decide teach, a price or a refusal; another town
   needs a trip; the price goes to the Ledger; the Storyteller can override. */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const L = await import(pathToFileURL(join(root, "modules/wodx-creation/scripts/learn-rules.mjs")));

test("Friendly teaches, neutral asks a price, hostile refuses; trust counts as much as warmth", () => {
  assert.equal(L.willingness({attitude: 2}).will, "teach");
  assert.equal(L.willingness({trust: 3}).will, "teach");
  assert.equal(L.willingness().will, "price", "a stranger asks a price");
  assert.equal(L.willingness({attitude: 1, trust: 1}).will, "price");
  assert.equal(L.willingness({attitude: -2}).will, "refuse");
  assert.equal(L.willingness({attitude: 3, trust: -2}).will, "refuse", "distrust wins over warmth");
  assert.match(L.willingness({attitude: -3, name: "Old Tomas"}).why, /^Old Tomas is hostile to them and will not teach/);
  assert.equal(L.willingness({pc: true, attitude: -3}).will, "teach", "players settle it between them");
});

test("Another town needs a trip first; an unknown town asks none", () => {
  const w = L.willingness({attitude: 2, town: "Brumov", here: "Rothenstein"});
  assert.equal(w.will, "teach"); assert.equal(w.trip, "Brumov"); assert.match(w.why, /lives in Brumov, so a trip there comes first/);
  assert.equal(L.willingness({town: "Brumov", here: "brumov"}).trip, "");
  assert.equal(L.willingness({town: "Brumov", here: ""}).trip, "");
});

test("The Storyteller's word wins", () => {
  assert.equal(L.willingness({attitude: -3, override: "teach"}).will, "teach");
  assert.match(L.willingness({attitude: 3, override: "refuse"}).why, /the Storyteller's word/);
});

test("The price fits the age, and between Kindred it is a boon", () => {
  assert.match(L.priceFor(1300).what, /guild fee/);
  assert.match(L.priceFor(1800).what, /tutor's wage/);
  assert.match(L.priceFor(1990).what, /tuition/);
  assert.match(L.priceFor(2050).what, /contract/);
  assert.equal(L.priceFor(1300).kind, "debt");
  assert.deepEqual([L.priceFor(1700, {kindred: true}).kind, L.priceFor(1700, {kindred: true}).size, L.priceFor(1700, {kindred: true, next: 4}).size], ["boon", "minor", "major"]);
  assert.match(L.priceFor(null).what, /fee or a service/);
});

test("Creation asks WoDX NPC, closes the row for a player, lets the Storyteller override and writes the price to the Ledger", () => {
  const m = src("modules/wodx-creation/scripts/learn.mjs");
  assert.match(m, /n\?\.attitude\?\.of\?\.\(teacher, learner\)\?\.step/);
  assert.match(m, /n\?\.trust\?\.of\?\.\(teacher, learner\)/);
  assert.match(m, /mk\.rules\.marketOfScene\(st, sc\.id\)/);
  // the markets live under WoDX Storyteller's api.upkeep (gateapipaths, PR 2202)
  assert.match(m, /const mk = storyteller\(\)\?\.upkeep\?\.markets;/);
  assert.match(m, /const closed = blood \|\| \(blocks\(w\) && !user\.isGM \? w\.why : ""\);/);
  assert.match(m, /if \( blocks\(w\) && !src\.override \) return \{ok: false/);
  assert.match(m, /await st\.ledger\?\.save\?\.\(\{kind: src\.price\.kind/);
  assert.match(m, /from: \{id: actor\.id, name: actor\.name\}, to: \{id: t\?\.id \?\? src\.id/);
  const led = src("modules/wodx-storyteller/scripts/main.mjs");
  assert.match(led, /ledger: \{open: [^}]*save: Led\.saveEntry/);
  const mk = src("modules/wodx-storyteller/scripts/markets.mjs");
  assert.match(mk, /rules: MK\}\)/);
  const npc = src("modules/wodx-npc/scripts/main.mjs");
  assert.match(npc, /trust: \{of: TRUST\.trustOf/);
  assert.match(src("modules/wodx-creation/scripts/xp.mjs"), /The teacher asks a price: \$\{r\.src\.price\.what\}/);
});
